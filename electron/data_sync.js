const { prisma } = require('./db');
const dataFetcher = require('./data_fetcher');
const { BrowserWindow } = require('electron');
const { CURRENT_SEASON_STR } = require('../config/season');

class DailySyncService {
    constructor() {
        this.SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
        // this.SYNC_INTERVAL_MS = 60 * 1000; // Debug: 1 minute
    }

    async syncIfNeeded(mainWindow) {
        console.log("Starting Daily Sync Check...");
        try {
            let settings = await prisma.appSettings.findFirst({ where: { id: 1 } });
            if (!settings) return;

            const lastUpdate = settings.lastUpdate ? new Date(settings.lastUpdate).getTime() : 0;
            const now = Date.now();

            if (now - lastUpdate > this.SYNC_INTERVAL_MS) {
                console.log("Last update > 24h. Triggering Full Sync...");
                this.sendSyncStatus(mainWindow, true);

                await this.performSync();

                await prisma.appSettings.update({
                    where: { id: 1 },
                    data: { lastUpdate: new Date() }
                });

                this.sendSyncStatus(mainWindow, false);
                console.log("Daily Sync Complete.");
            } else {
                console.log("Data is up to date.");
            }

        } catch (error) {
            console.error("Daily Sync Failed:", error);
            this.sendSyncStatus(mainWindow, false); // Ensure UI clears
        }
    }

    sendSyncStatus(win, active) {
        if (win && !win.isDestroyed()) {
            win.webContents.send('sync-status', { active });
        }
    }

    async performSync() {
        const { fetchFootballData, fetchFixtures, fetchRealPlayers } = dataFetcher;

        // 1. Fetch Data
        const footballData = await fetchFootballData(); // Standings + Teams
        const fixturesData = await fetchFixtures(); // Matches

        const allTeamIds = footballData.flatMap(l => l.teams.map(t => t.id));
        const realPlayers = await fetchRealPlayers(allTeamIds);

        // 2. Process Sync Transaction
        await prisma.$transaction(async (tx) => {
            // A. Sync Leauges & Standings
            const CL_ID = 2001;
            const domesticLeagues = footballData.filter(l => l.id !== CL_ID);

            for (const league of domesticLeagues) {
                for (const team of league.teams) {
                    // Update Standings (Wins, Points, Goals)
                    // We DO NOT overwrite Team market value here to preserve manual edits.
                    // Upsert Standing
                    await tx.standing.upsert({
                        where: {
                            leagueId_teamId_season_groupName: {
                                leagueId: league.id,
                                teamId: team.id,
                                season: CURRENT_SEASON_STR,
                                groupName: 'League'
                            }
                        },
                        update: {
                            played: team.stats.played || 0,
                            wins: team.stats.wins || 0,
                            draws: team.stats.draws || 0,
                            losses: team.stats.losses || 0,
                            gf: team.stats.gf || 0,
                            ga: team.stats.ga || 0,
                            points: team.points || 0
                        },
                        create: {
                            leagueId: league.id,
                            teamId: team.id,
                            season: CURRENT_SEASON_STR,
                            groupName: 'League',
                            played: team.stats.played || 0,
                            wins: team.stats.wins || 0,
                            draws: team.stats.draws || 0,
                            losses: team.stats.losses || 0,
                            gf: team.stats.gf || 0,
                            ga: team.stats.ga || 0,
                            points: team.points || 0
                        }
                    });

                    // Update Players (Injuries only)
                    const squad = realPlayers[team.id];
                    if (squad && squad.length > 0) {
                        for (const p of squad) {
                            // Try to find player by name & team
                            // Upsert: Create if new, Update ONLY fitness/injury/form if exists
                            // Preserve: marketValue, rating (if manual), number

                            // Note: Prisma 'upsert' with composite key checks ID usually.
                            // We don't have stable Player IDs from API (we generate autoincrement).
                            // So we must try findFirst.
                            const existing = await tx.player.findFirst({
                                where: { teamId: team.id, name: p.name }
                            });

                            if (existing) {
                                await tx.player.update({
                                    where: { id: existing.id },
                                    data: {
                                        isInjured: p.isInjured || false,
                                        // Optional: Update fitness based on injury?
                                        fitness: (p.isInjured) ? 50 : 100
                                    }
                                });
                            } else {
                                // New Player found in API? Create them.
                                // Use default MV logic or simplified one.
                                await tx.player.create({
                                    data: {
                                        teamId: team.id,
                                        name: p.name,
                                        position: p.position,
                                        age: p.age,
                                        rating: p.rating || 70,
                                        // New player gets default MV calc or generic
                                        marketValue: 10000000,
                                        number: p.number,
                                        photo: p.photo,
                                        isInjured: p.isInjured || false
                                    }
                                });
                            }
                        }
                    }
                }
            }

            // B. Sync Matches (Fixtures)
            for (const fix of fixturesData) {
                await tx.match.upsert({
                    where: { id: fix.id },
                    update: {
                        status: fix.status,
                        homeScore: fix.status === 'FINISHED' ? fix.homeScore : undefined, // football-data might provide score in list?
                        // The fetchFixtures implementation in data_fetcher currently maps only basic info.
                        // I might need to check if 'score' field is available in fetchFixtures.
                        playedAt: new Date(fix.utcDate)
                    },
                    create: {
                        id: fix.id,
                        leagueId: fix.leagueId,
                        homeTeamId: fix.homeTeamId,
                        awayTeamId: fix.awayTeamId,
                        matchday: fix.matchday,
                        status: fix.status,
                        playedAt: new Date(fix.utcDate),
                        homeScore: 0,
                        awayScore: 0
                    }
                });
            }

        }, { timeout: 60000 });
    }
}

module.exports = new DailySyncService();
