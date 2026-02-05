const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '..', 'generated', 'prisma-client'));

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function initDb() {
    try {
        // PRAGMA returns results; use $queryRawUnsafe (not $executeRawUnsafe)
        await prisma.$queryRawUnsafe(`PRAGMA journal_mode = WAL;`);
        console.log("Database WAL mode enabled.");
    } catch (e) {
        console.warn("Failed to enable WAL mode:", e);
    }
}

async function getTeamPower(teamId) {
    // Fetch Top 14 Available Players (highest MV)
    const players = await prisma.player.findMany({
        where: {
            teamId: teamId,
            isInjured: false
        },
        orderBy: {
            marketValue: 'desc'
        },
        take: 14
    });

    if (!players || players.length === 0) return 50; // Fallback

    // Sum Market Value of Squad
    let totalMV = 0n;
    players.forEach(p => {
        if (p.marketValue) totalMV += p.marketValue;
    });

    // Convert to Number for Power Calc
    // Use logarithmic scale
    const mvNum = Number(totalMV); // e.g. 500M -> 500,000,000
    // Real Madrid ~1.2B -> Log10(1.2e9) = 9.08
    // Luton Town ~80M -> Log10(8e7) = 7.9
    // Difference is small in Log10, so use a steeper multiplier OR normalize differently.

    // Adjusted Formula: Base + (Log10(MV) * Multiplier)
    let power = (Math.log10(mvNum || 10000000) * 15);
    // 1B -> 9 * 15 = 135
    // 50M -> 7.7 * 15 = 115.5
    // 10M -> 7 * 15 = 105

    // Add Elo Influence if available (need to fetch team if not passed, but arg is ID now)
    const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { eloRating: true, prestige: true }
    });

    if (team) {
        power += (team.eloRating - 1500) / 25; // 1500->0, 2000->20
    }

    return power;
}

async function updateEloAfterMatch(homeId, awayId, homeScore, awayScore) {
    const K_FACTOR = 32;
    const home = await prisma.team.findUnique({ where: { id: homeId } });
    const away = await prisma.team.findUnique({ where: { id: awayId } });

    if (!home || !away) return;

    const R_home = home.eloRating || 1500;
    const R_away = away.eloRating || 1500;

    const Qa = Math.pow(10, R_home / 400);
    const Qb = Math.pow(10, R_away / 400);
    const Ea = Qa / (Qa + Qb);
    const Eb = Qb / (Qa + Qb);

    let Sa, Sb;
    if (homeScore > awayScore) { Sa = 1; Sb = 0; }
    else if (awayScore > homeScore) { Sa = 0; Sb = 1; }
    else { Sa = 0.5; Sb = 0.5; }

    const newHome = Math.round(R_home + K_FACTOR * (Sa - Ea));
    const newAway = Math.round(R_away + K_FACTOR * (Sb - Eb));

    // Update DB
    await prisma.team.update({ where: { id: homeId }, data: { eloRating: newHome } });
    await prisma.team.update({ where: { id: awayId }, data: { eloRating: newAway } });
}

module.exports = {
    prisma,
    initDb,
    getTeamPower,
    updateEloAfterMatch
};
