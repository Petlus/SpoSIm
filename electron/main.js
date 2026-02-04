const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { prisma } = require('./db');
const axios = require('axios');
const ollamaManager = require('./ollama_manager');
const aiBridge = require('./ai_bridge');

// Load Simulation Modules
const footballSim = require('./simulation/football');
const f1Sim = require('./simulation/f1');

const dataFetcher = require('./data_fetcher');
const dailySync = require('./data_sync');
const { LEAGUES, TEAMS } = require('./constants');
const { CURRENT_SEASON_STR } = require('../config/season');

// Basic dev detection
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: true, // Keeping existing config
            contextIsolation: false, // Keeping existing config
            preload: path.join(__dirname, 'preload.js'),
        },
        title: "BetBrain",
        autoHideMenuBar: true,
        backgroundColor: '#0f172a',
    });

    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../out/index.html')}`;

    console.log(`Loading URL: ${startUrl}`);
    mainWindow.loadURL(startUrl);
}

app.whenReady().then(async () => {
    console.log('App Ready. Prisma Client initialized.');
    await require('./db').initDb(); // Enable WAL
    createWindow();

    // Initial Data Check & Seeding
    try {
        // Check for 25/26 data specifically
        const seasonLeagueCount = await prisma.league.count({
            where: { currentSeason: CURRENT_SEASON_STR }
        });

        if (seasonLeagueCount === 0) {
            console.log("No 25/26 Season data found. Seeding from Constants...");
            await seedDatabase();
            console.log("Seeding complete. Reloading window...");
            if (mainWindow) mainWindow.reload();
        } else {
            console.log("25/26 Season Data confirmed present.");
        }
    } catch (e) {
        console.error("DB Check/Seed Failed:", e);
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // Ensure AppSettings exists
    try {
        const settings = await prisma.appSettings.findFirst({ where: { id: 1 } });
        if (!settings) {
            console.log("Initializing AppSettings...");
            await prisma.appSettings.create({
                data: { id: 1, ollamaInstalled: false, modelDownloaded: false, setupComplete: false }
            });
        }
    } catch (e) {
        console.error("Failed to init AppSettings:", e);
    }

    // Start Daily Sync (Delayed to not block startup UI)
    setTimeout(() => {
        dailySync.syncIfNeeded(mainWindow);
    }, 5000);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});


// --- HELPER FUNCTIONS ---

async function updateEloRatings(homeId, awayId, homeScore, awayScore) {
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

    await prisma.team.update({ where: { id: homeId }, data: { eloRating: newHome } });
    await prisma.team.update({ where: { id: awayId }, data: { eloRating: newAway } });
}

async function calculateTeamStrength(teamId) {
    // Get all players
    const players = await prisma.player.findMany({
        where: { teamId: teamId },
        orderBy: { rating: 'desc' },
        select: { position: true, rating: true, name: true }
    });

    const team = await prisma.team.findUnique({ where: { id: teamId } });

    // League Prestige Bonus (Top 5 Leagues)
    let prestigeBonus = 0;
    // Hardcoded IDs for Top 5 leagues from data_fetcher
    if ([2002, 2021, 2014, 2019, 2015].includes(team?.leagueId)) {
        prestigeBonus = 5;
    }

    if (!players || players.length < 11) {
        return team ? { att: team.att || 70, mid: team.mid || 70, def: team.def || 70 } : { att: 70, mid: 70, def: 70 };
    }

    // Dynamic Rating
    const forwards = players.filter(p => p.position === 'FWD').slice(0, 3);
    const midfielders = players.filter(p => p.position === 'MID').slice(0, 4);
    const defenders = players.filter(p => p.position === 'DEF' || p.position === 'GK').slice(0, 5);

    const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + (b.rating || 70), 0) / arr.length : 70;

    return {
        att: Math.round(avg(forwards) + prestigeBonus),
        mid: Math.round(avg(midfielders) + prestigeBonus),
        def: Math.round(avg(defenders) + prestigeBonus)
    };
}

async function getTeamForm(teamId, matchCount = 5) {
    const matches = await prisma.match.findMany({
        where: {
            OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
            status: 'finished'
        },
        orderBy: { playedAt: 'desc' },
        take: matchCount
    });

    const form = matches.map(m => {
        if (m.homeTeamId === teamId) {
            if (m.homeScore > m.awayScore) return 'W';
            if (m.homeScore === m.awayScore) return 'D';
            return 'L';
        } else {
            if (m.awayScore > m.homeScore) return 'W';
            if (m.homeScore === m.awayScore) return 'D';
            return 'L';
        }
    }); // Newest first
    return form;
}

async function calculateFormFactor(teamId) {
    const form = await getTeamForm(teamId, 5);
    let bonus = 0;
    for (const res of form) {
        if (res === 'W') bonus += 2;
        else if (res === 'L') bonus -= 1;
    }
    bonus = Math.max(-5, Math.min(10, bonus));
    return 1 + (bonus / 100);
}

async function seedDatabase() {
    console.log("Starting DB Seed...");

    // 1. Seed Leagues
    for (const [code, info] of Object.entries(LEAGUES)) {
        await prisma.league.upsert({
            where: { id: info.id },
            update: { name: info.name },
            create: {
                id: info.id,
                name: info.name,
                country: 'Europe',
                currentSeason: CURRENT_SEASON_STR,
                type: code === 'CL' ? 'tournament' : 'league'
            }
        });
    }

    // 2. Seed Teams
    for (const team of TEAMS) {
        // Find league ID based on code
        const leagueInfo = LEAGUES[team.leagueCode];
        if (!leagueInfo) continue;

        await prisma.team.upsert({
            where: { id: team.id },
            update: {
                marketValue: team.marketValue,
                eloRating: team.elo,
                logo: team.logo
            },
            create: {
                id: team.id,
                name: team.name,
                leagueId: leagueInfo.id,
                att: Math.floor(team.elo / 20) - 10,
                def: Math.floor(team.elo / 20) - 15,
                mid: Math.floor(team.elo / 20) - 12,
                prestige: Math.floor(team.elo / 25),
                budget: Math.floor(team.marketValue * 0.2),
                marketValue: team.marketValue,
                eloRating: team.elo,
                logo: team.logo,
                isUserControlled: false
            }
        });

        // Initialize Standings
        await prisma.standing.upsert({
            where: {
                leagueId_teamId_season_groupName: {
                    leagueId: leagueInfo.id,
                    teamId: team.id,
                    season: CURRENT_SEASON_STR,
                    groupName: team.leagueCode === 'CL' ? 'League Phase' : 'League'
                }
            },
            update: {},
            create: {
                leagueId: leagueInfo.id,
                teamId: team.id,
                season: CURRENT_SEASON_STR,
                groupName: team.leagueCode === 'CL' ? 'League Phase' : 'League',
                played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0
            }
        });
    }
    console.log("DB Seed Finished.");
}

// --- IPC HANDLERS ---
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('get-data', async (event, category) => {
    try {
        if (category === 'football') {
            const leagues = await prisma.league.findMany({ where: { sport: 'football' } });
            const result = { leagues: [] };

            for (const l of leagues) {
                // Get Standings (which links to Teams)
                const standings = await prisma.standing.findMany({
                    where: { leagueId: l.id, season: CURRENT_SEASON_STR },
                    include: { team: true },
                    orderBy: [
                        { groupName: 'asc' },
                        { points: 'desc' }
                    ]
                });

                const mappedTeams = standings.map(s => ({
                    ...s.team,
                    id: Number(s.team.id), // Ensure Number
                    logo: s.team.logo,
                    group: s.groupName || 'League',
                    points: s.points,
                    form: [],
                    stats: {
                        played: s.played,
                        wins: s.wins,
                        draws: s.draws,
                        losses: s.losses,
                        gf: s.gf,
                        ga: s.ga
                    }
                }));

                result.leagues.push({
                    ...l,
                    id: Number(l.id), // Ensure Number
                    teams: mappedTeams
                });
            }
            return result;

        } else if (category === 'f1') {
            const teams = await prisma.f1Team.findMany();
            const drivers = await prisma.f1Driver.findMany();
            return {
                teams,
                drivers,
                tracks: [{ id: 'bahrain', name: 'Bahrain', type: 'balanced' }]
            };
        }
        return {};
    } catch (e) {
        console.error("IPC get-data Error:", e);
        // Return empty structure on error to allow UI to render (or check error field)
        return { error: e.message, leagues: [] };
    }
});

ipcMain.handle('get-fixtures', async (event, { leagueId, matchday }) => {
    const bounds = await prisma.match.aggregate({
        where: { leagueId: leagueId },
        _min: { matchday: true },
        _max: { matchday: true }
    });

    let targetMatchday = matchday;
    if (!targetMatchday) {
        const next = await prisma.match.findFirst({
            where: {
                leagueId: leagueId,
                status: 'scheduled',
                playedAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
            },
            orderBy: { playedAt: 'asc' },
            select: { matchday: true }
        });

        if (next) {
            targetMatchday = next.matchday;
        } else {
            const last = await prisma.match.findFirst({
                where: { leagueId: leagueId, status: 'finished' },
                orderBy: { playedAt: 'desc' },
                select: { matchday: true }
            });
            targetMatchday = last?.matchday || bounds._min?.matchday || 1;
        }
    }

    const matches = await prisma.match.findMany({
        where: { leagueId: leagueId, matchday: targetMatchday },
        include: { homeTeam: true, awayTeam: true },
        orderBy: { playedAt: 'asc' }
    });

    return {
        currentMatchday: targetMatchday,
        minMatchday: bounds._min?.matchday || 1,
        maxMatchday: bounds._max?.matchday || 34,
        matches: matches.map(m => ({
            id: m.id,
            leagueId: m.leagueId,
            matchday: m.matchday,
            date: m.playedAt,
            status: m.status,
            home: { id: m.homeTeamId, name: m.homeTeam.name, logo: m.homeTeam.logo },
            away: { id: m.awayTeamId, name: m.awayTeam.name, logo: m.awayTeam.logo },
            homeScore: m.homeScore,
            awayScore: m.awayScore
        }))
    };
});

ipcMain.handle('get-standings', async (event, { leagueId, season = CURRENT_SEASON_STR }) => {
    const standings = await prisma.standing.findMany({
        where: { leagueId: leagueId, season: season },
        include: { team: true },
        orderBy: [
            { points: 'desc' },
            { gf: 'desc' }
        ]
    });
    return await Promise.all(standings.map(async s => ({
        ...s,
        name: s.team.name,
        logo: s.team.logo,
        form: await getTeamForm(s.teamId, 5),
        stats: {
            played: s.played,
            wins: s.wins,
            draws: s.draws,
            losses: s.losses,
            gf: s.gf,
            ga: s.ga
        }
    })));
});

ipcMain.handle('update-data', async () => {
    try {
        await dataFetcher.updateAllData();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('get-team-details', async (event, teamId) => {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return { error: "Team not found" };

    const players = await prisma.player.findMany({
        where: { teamId: teamId },
        orderBy: { rating: 'desc' }
    });
    const standings = await prisma.standing.findFirst({
        where: { teamId: teamId, season: CURRENT_SEASON_STR }
    });

    const strength = await calculateTeamStrength(teamId);

    return {
        ...team,
        stats: standings,
        players: players,
        form: await getTeamForm(teamId, 5),
        strength: strength,
        att: strength.att,
        mid: strength.mid,
        def: strength.def
    };
});

ipcMain.handle('get-match-odds', async (event, { homeId, awayId }) => {
    const home = await prisma.team.findUnique({ where: { id: homeId } });
    const away = await prisma.team.findUnique({ where: { id: awayId } });

    if (!home || !away) return { error: "Teams not found" };

    const homeStr = await calculateTeamStrength(homeId);
    const awayStr = await calculateTeamStrength(awayId);

    home.att = homeStr.att; home.mid = homeStr.mid; home.def = homeStr.def;
    away.att = awayStr.att; away.mid = awayStr.mid; away.def = awayStr.def;

    home.form = await calculateFormFactor(homeId);
    away.form = await calculateFormFactor(awayId);

    return footballSim.simulateMatchOdds(home, away, 1000);
});

ipcMain.handle('get-advanced-analysis', async (event, { homeId, awayId }) => {
    const home = await prisma.team.findUnique({ where: { id: homeId } });
    const away = await prisma.team.findUnique({ where: { id: awayId } });

    if (!home || !away) return { error: "Teams not found" };

    const homeForm = await getTeamForm(homeId, 5);
    const awayForm = await getTeamForm(awayId, 5);

    home.form = await calculateFormFactor(homeId);
    away.form = await calculateFormFactor(awayId);

    const homeStr = await calculateTeamStrength(homeId);
    const awayStr = await calculateTeamStrength(awayId);

    home.att = homeStr.att; home.mid = homeStr.mid; home.def = homeStr.def;
    away.att = awayStr.att; away.mid = awayStr.mid; away.def = awayStr.def;

    const odds = footballSim.simulateMatchOdds(home, away, 1000);

    const h2h = await prisma.match.findMany({
        where: {
            OR: [
                { homeTeamId: homeId, awayTeamId: awayId },
                { homeTeamId: awayId, awayTeamId: homeId }
            ]
        },
        orderBy: { playedAt: 'desc' },
        take: 5,
        select: { homeScore: true, awayScore: true } // Simplified fetch
    });

    const homeScorers = await prisma.player.findMany({
        where: { teamId: homeId },
        orderBy: { goals: 'desc' },
        take: 3,
        select: { name: true, goals: true }
    });
    const awayScorers = await prisma.player.findMany({
        where: { teamId: awayId },
        orderBy: { goals: 'desc' },
        take: 3,
        select: { name: true, goals: true }
    });

    const homeInjuries = await prisma.player.findMany({
        where: { teamId: homeId, isInjured: true },
        select: { name: true, position: true }
    });
    const awayInjuries = await prisma.player.findMany({
        where: { teamId: awayId, isInjured: true },
        select: { name: true, position: true }
    });

    return {
        odds,
        home: {
            id: home.id,
            name: home.name,
            form: homeForm,
            formFactor: home.form,
            scorers: homeScorers,
            injuries: homeInjuries
        },
        away: {
            id: away.id,
            name: away.name,
            form: awayForm,
            formFactor: away.form,
            scorers: awayScorers,
            injuries: awayInjuries
        },
        h2h
    };
});

ipcMain.handle('simulate-matchday', async (event, leagueId) => {
    const teams = await prisma.team.findMany({
        where: { leagueId: leagueId },
        include: {
            standings: {
                where: { season: CURRENT_SEASON_STR },
                select: { points: true }
            }
        }
    });

    if (!teams || teams.length < 2) throw new Error("Not enough teams in league");

    const teamsWithForm = await Promise.all(teams.map(async t => {
        const str = await calculateTeamStrength(t.id);
        return {
            ...t,
            att: str.att, mid: str.mid, def: str.def,
            form: await calculateFormFactor(t.id)
        };
    }));

    const matchups = [];
    const pool = [...teamsWithForm];

    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    while (pool.length >= 2) {
        matchups.push({ home: pool.pop(), away: pool.pop() });
    }

    const lastMatch = await prisma.match.aggregate({
        where: { leagueId: leagueId },
        _max: { matchday: true }
    });
    const currentMatchday = (lastMatch._max?.matchday || 0) + 1;

    const results = [];

    await prisma.$transaction(async (tx) => {
        for (const m of matchups) {
            m.home.power = await db.getTeamPower(m.home.id);
            m.away.power = await db.getTeamPower(m.away.id);
            const res = footballSim.simulateMatch(m.home, m.away);

            const createdMatch = await tx.match.create({
                data: {
                    leagueId: leagueId,
                    homeTeamId: m.home.id,
                    awayTeamId: m.away.id,
                    homeScore: res.homeGoals,
                    awayScore: res.awayGoals,
                    matchday: currentMatchday,
                    playedAt: new Date(),
                    status: 'finished'
                }
            });
            const matchId = createdMatch.id;

            if (res.events && res.events.length > 0) {
                await tx.matchEvent.createMany({
                    data: res.events.map(ev => ({
                        matchId: matchId,
                        teamId: ev.teamId,
                        type: ev.type,
                        minute: ev.minute,
                        description: ev.description
                    }))
                });
            }

            const homePts = res.homeGoals > res.awayGoals ? 3 : (res.homeGoals === res.awayGoals ? 1 : 0);
            const homeWins = res.homeGoals > res.awayGoals ? 1 : 0;
            const homeDraws = res.homeGoals === res.awayGoals ? 1 : 0;
            const homeLosses = res.homeGoals < res.awayGoals ? 1 : 0;

            // Upsert or Update Standings for Home
            await tx.standing.upsert({
                where: {
                    leagueId_teamId_season_groupName: {
                        leagueId: leagueId,
                        teamId: m.home.id,
                        season: CURRENT_SEASON_STR,
                        groupName: 'League' // Assuming simplified group logic for matchday sim
                    }
                },
                update: {
                    played: { increment: 1 },
                    wins: { increment: homeWins },
                    draws: { increment: homeDraws },
                    losses: { increment: homeLosses },
                    gf: { increment: res.homeGoals },
                    ga: { increment: res.awayGoals },
                    points: { increment: homePts }
                },
                create: {
                    leagueId: leagueId,
                    teamId: m.home.id,
                    season: CURRENT_SEASON_STR,
                    groupName: 'League',
                    played: 1,
                    wins: homeWins,
                    draws: homeDraws,
                    losses: homeLosses,
                    gf: res.homeGoals,
                    ga: res.awayGoals,
                    points: homePts
                }
            });

            const awayPts = res.awayGoals > res.homeGoals ? 3 : (res.awayGoals === res.homeGoals ? 1 : 0);
            const awayWins = res.awayGoals > res.homeGoals ? 1 : 0;
            const awayDraws = res.awayGoals === res.homeGoals ? 1 : 0;
            const awayLosses = res.awayGoals < res.homeGoals ? 1 : 0;

            // Upsert or Update Standings for Away
            await tx.standing.upsert({
                where: {
                    leagueId_teamId_season_groupName: {
                        leagueId: leagueId,
                        teamId: m.away.id,
                        season: CURRENT_SEASON_STR,
                        groupName: 'League'
                    }
                },
                update: {
                    played: { increment: 1 },
                    wins: { increment: awayWins },
                    draws: { increment: awayDraws },
                    losses: { increment: awayLosses },
                    gf: { increment: res.awayGoals },
                    ga: { increment: res.homeGoals },
                    points: { increment: awayPts }
                },
                create: {
                    leagueId: leagueId,
                    teamId: m.away.id,
                    season: CURRENT_SEASON_STR,
                    groupName: 'League',
                    played: 1,
                    wins: awayWins,
                    draws: awayDraws,
                    losses: awayLosses,
                    gf: res.awayGoals,
                    ga: res.homeGoals,
                    points: awayPts
                }
            });

            await updateEloRatings(m.home.id, m.away.id, res.homeGoals, res.awayGoals);
            results.push({ ...res, matchday: currentMatchday });
        }
    }, { timeout: 20000 });

    return results;
});

ipcMain.handle('simulate-match', async (event, { homeId, awayId }) => {
    const home = await prisma.team.findUnique({ where: { id: homeId } });
    const away = await prisma.team.findUnique({ where: { id: awayId } });

    if (!home || !away) throw new Error("Teams not found");

    home.form = await calculateFormFactor(homeId);
    away.form = await calculateFormFactor(awayId);

    const homeStr = await calculateTeamStrength(homeId);
    const awayStr = await calculateTeamStrength(awayId);
    home.att = homeStr.att; home.mid = homeStr.mid; home.def = homeStr.def;
    away.att = awayStr.att; away.mid = awayStr.mid; away.def = awayStr.def;

    return footballSim.simulateMatch(home, away);
});

ipcMain.handle('check-ollama-status', async () => {
    console.log("Checking Ollama status...");
    try {
        const installed = await ollamaManager.checkInstalled();
        const running = await ollamaManager.checkRunning();
        return { installed, running, downloadUrl: ollamaManager.getDownloadUrl() };
    } catch (e) {
        console.error("Status Check Error:", e);
        return { installed: false, running: false, error: e.message };
    }
});

ipcMain.handle('start-ollama', async () => {
    return await ollamaManager.startService();
});

ipcMain.handle('get-setup-status', async () => {
    let settings = await prisma.appSettings.findFirst({ where: { id: 1 } });
    if (!settings) {
        settings = await prisma.appSettings.create({
            data: { id: 1, ollamaInstalled: false, modelDownloaded: false, setupComplete: false }
        });
    }
    return settings;
});

ipcMain.handle('ai-setup-start', async (event) => {
    try {
        const win = BrowserWindow.getAllWindows()[0];
        const sendProgress = (step, progress, detail) => {
            if (win) win.webContents.send('ai-setup-progress', { step, progress, detail });
        };

        let settings = await prisma.appSettings.findFirst({ where: { id: 1 } });
        if (!settings) {
            settings = await prisma.appSettings.create({ data: { id: 1 } });
        }

        // 1. Check/Install Ollama
        if (!settings.ollamaInstalled) {
            sendProgress('install_ollama', 0, 'Checking Ollama installation...');
            const installed = await ollamaManager.checkInstalled();

            if (!installed) {
                sendProgress('install_ollama', 10, 'Downloading Ollama Installer...');
                const success = await ollamaManager.downloadAndInstallOllama();
                if (!success) throw new Error("Ollama installation failed.");
            }
            await prisma.appSettings.update({ where: { id: 1 }, data: { ollamaInstalled: true } });
        }
        sendProgress('install_ollama', 100, 'Ollama Installed');

        // 2. Start Service
        sendProgress('start_service', 0, 'Starting Ollama Service...');
        const running = await ollamaManager.ensureOllamaRunning();
        if (!running) throw new Error("Could not start Ollama service.");
        sendProgress('start_service', 100, 'Service Running');

        // 3. Check/Pull Model
        const modelName = 'deepseek-r1:1.5b';
        if (!settings.modelDownloaded) {
            sendProgress('pull_model', 0, `Checking model ${modelName}...`);

            const models = await ollamaManager.getAvailableModels();
            const modelExists = models.some(m => m === modelName || m.startsWith(modelName + ':')); // Use stricter check from ollama_manager

            if (!modelExists) {
                sendProgress('pull_model', 5, `Downloading ${modelName}...`);
                await ollamaManager.pullModelProgressive(modelName, (progress, status) => {
                    sendProgress('pull_model', progress, status);
                });
            }
            await prisma.appSettings.update({ where: { id: 1 }, data: { modelDownloaded: true } });
        }

        await prisma.appSettings.update({ where: { id: 1 }, data: { setupComplete: true } });
        sendProgress('done', 100, 'AI Setup Complete');
        return { success: true };

    } catch (e) {
        console.error("AI Setup Failed:", e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('get-ai-prediction', async (event, { homeId, awayId, odds }) => {
    try {
        const home = await prisma.team.findUnique({ where: { id: homeId } });
        const away = await prisma.team.findUnique({ where: { id: awayId } });

        if (!home || !away) return { error: "Teams not found" };

        const homeStrength = await calculateTeamStrength(homeId);
        const awayStrength = await calculateTeamStrength(awayId);

        const homeDetails = { ...homeStrength, form: await getTeamForm(homeId, 5) };
        const awayDetails = { ...awayStrength, form: await getTeamForm(awayId, 5) };

        const h2h = await prisma.match.findMany({
            where: {
                OR: [
                    { homeTeamId: homeId, awayTeamId: awayId },
                    { homeTeamId: awayId, awayTeamId: homeId }
                ]
            },
            orderBy: { playedAt: 'desc' },
            take: 5,
            select: { homeScore: true, awayScore: true }
        });

        const homeInjuries = await prisma.player.findMany({
            where: { teamId: homeId, isInjured: true },
            select: { name: true }
        }).then(p => p.map(i => i.name));
        const awayInjuries = await prisma.player.findMany({
            where: { teamId: awayId, isInjured: true },
            select: { name: true }
        }).then(p => p.map(i => i.name));

        let injuryText = "Keine";
        if (homeInjuries.length > 0 || awayInjuries.length > 0) {
            injuryText = `${home.name}: ${homeInjuries.join(', ') || 'Keine'}; ${away.name}: ${awayInjuries.join(', ') || 'Keine'}`;
        }

        const context = {
            home, away, odds, homeDetails, awayDetails, h2h, injuries: injuryText
        };

        return await aiBridge.generateExpertAnalysis(context);

    } catch (e) {
        console.error("AI Prediction Error:", e);
        return { error: e.message };
    }
});

ipcMain.handle('simulate-f1-race', async (event, trackId) => {
    const drivers = await prisma.f1Driver.findMany();
    const track = { name: "Bahrain", type: 'balanced' };

    const driversWithCars = await Promise.all(drivers.map(async d => {
        const team = await prisma.f1Team.findUnique({ where: { id: d.teamId } });
        return {
            ...d,
            teamPerf: team ? team.perf : 90,
            reliability: team ? team.reliability : 0.95
        };
    }));

    return f1Sim.simulateRace(track, driversWithCars);
});
