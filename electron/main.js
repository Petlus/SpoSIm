require('dotenv').config();
const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');

// app:// protocol registered in electron/index.js (bootstrap)
const { autoUpdater } = require('electron-updater');
const db = require('./db');
const { prisma } = db;
const axios = require('axios');
const ollamaManager = require('./ollama_manager');
const aiBridge = require('./ai_bridge');

// Load Simulation Modules
const footballSim = require('./simulation/football');
const f1Sim = require('./simulation/f1');

const dataFetcher = require('./data_fetcher');
const dailySync = require('./data_sync');
const espnService = require('./espn_service');
const { LEAGUES, TEAMS } = require('./constants');
const { CURRENT_SEASON_STR } = require('../config/season');

// Basic dev detection
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

let mainWindow;
let splashWindow;
let splashShownAt = 0;

// ── Splash Window ──
function createSplash() {
    const iconPath = path.join(__dirname, '../public/logo.png');
    splashWindow = new BrowserWindow({
        width: 480,
        height: 520,
        frame: false,
        resizable: false,
        transparent: false,
        icon: iconPath,
        backgroundColor: '#020617',
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'splash-preload.js'),
        },
        show: false,
    });
    splashWindow.loadFile(path.join(__dirname, 'splash.html'));
    splashWindow.once('ready-to-show', () => {
        splashWindow.show();
        splashShownAt = Date.now();
    });
}

// Helper: send progress to splash window
function sendSplash(step, progress, detail) {
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('startup-progress', { step, progress, detail });
    }
}

// ── Main Window ──
function createMainWindow() {
    const iconPath = path.join(__dirname, '../public/logo.png');
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        icon: iconPath,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        title: "BetBrain",
        autoHideMenuBar: true,
        backgroundColor: '#0f172a',
        show: false, // hidden until ready
    });

    const startUrl = isDev
        ? 'http://localhost:3000'
        : 'app://./index.html';

    console.log(`Loading URL: ${startUrl}`);
    mainWindow.loadURL(startUrl);

    // Show main window once loaded, close splash (ensure splash visible for at least 5 seconds)
    mainWindow.once('ready-to-show', async () => {
        const minSplashMs = 5000;
        const elapsed = splashShownAt ? Date.now() - splashShownAt : minSplashMs;
        const remaining = Math.max(0, minSplashMs - elapsed);
        if (remaining > 0) await new Promise(r => setTimeout(r, remaining));
        mainWindow.show();
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
            splashWindow = null;
        }
    });
}

// ── Startup Checks (runs in main process, sends progress to splash) ──
async function runStartupChecks() {
    // 1. Database
    sendSplash('database', 0, 'Connecting to database...');
    try {
        await prisma.$queryRawUnsafe('SELECT 1');
        sendSplash('database', 100, 'Database connected');
    } catch (e) {
        console.error('DB check failed:', e);
        sendSplash('error', 0, 'Database connection failed');
        return;
    }

    // 2. Season Data
    sendSplash('season_data', 0, `Checking ${CURRENT_SEASON_STR} data...`);
    try {
        const count = await prisma.league.count({ where: { currentSeason: CURRENT_SEASON_STR } });
        if (count === 0) {
            sendSplash('season_data', 30, 'Seeding initial data...');
            await seedDatabase();
        }
        sendSplash('season_data', 100, 'Season data ready');
    } catch (e) {
        console.error('Season data check failed:', e);
        sendSplash('season_data', 100, 'Skipped (non-critical)');
    }

    // 3. Ollama installed
    sendSplash('ollama_install', 0, 'Checking Ollama installation...');
    let ollamaInstalled = await ollamaManager.checkInstalled();
    if (!ollamaInstalled) {
        sendSplash('ollama_install', 10, 'Downloading Ollama...');
        const ok = await ollamaManager.downloadAndInstallOllama((p, s) => sendSplash('ollama_install', p, s));
        if (!ok) { sendSplash('error', 0, 'Ollama installation failed'); return; }
        ollamaInstalled = true;
    }
    sendSplash('ollama_install', 100, 'Ollama installed');

    // 4. Ollama service running
    sendSplash('ollama_service', 0, 'Starting Ollama service...');
    const running = await ollamaManager.ensureOllamaRunning();
    if (!running) { sendSplash('error', 0, 'Could not start Ollama'); return; }
    sendSplash('ollama_service', 100, 'Service running');

    // 5. AI Model
    const modelName = 'deepseek-r1:1.5b';
    sendSplash('ai_model', 0, `Checking model ${modelName}...`);
    const models = await ollamaManager.getAvailableModels();
    const exists = models.some(m => m === modelName || m.startsWith(modelName + ':'));
    if (!exists) {
        sendSplash('ai_model', 5, `Downloading ${modelName}...`);
        const pulled = await ollamaManager.pullModelProgressive(modelName, (p, s) => sendSplash('ai_model', Math.max(5, p), s));
        if (!pulled) { sendSplash('error', 0, 'Model download failed'); return; }
    }
    sendSplash('ai_model', 100, 'Model ready');

    // Persist
    try {
        await prisma.appSettings.upsert({
            where: { id: 1 },
            update: { ollamaInstalled: true, modelDownloaded: true, setupComplete: true, lastUpdate: new Date() },
            create: { id: 1, ollamaInstalled: true, modelDownloaded: true, setupComplete: true, lastUpdate: new Date() },
        });
    } catch (e) { console.warn('Could not persist setup status:', e); }

    // Done
    sendSplash('done', 100, 'All systems ready');
}

// ── App Ready ──
app.whenReady().then(async () => {
    // Register app:// protocol for production
    if (!isDev) {
        const outDir = path.join(__dirname, '../out');
        protocol.handle('app', (request) => {
            const url = new URL(request.url);
            let filePath = (url.pathname || '/').replace(/^\//, '') || 'index.html';
            const fullPath = path.join(outDir, filePath);
            let toServe;
            if (fs.existsSync(fullPath + '.html')) {
                toServe = fullPath + '.html';
            } else if (fs.existsSync(fullPath)) {
                const stat = fs.statSync(fullPath);
                toServe = stat.isDirectory() ? path.join(fullPath, 'index.html') : fullPath;
            } else {
                toServe = path.join(outDir, 'index.html');
            }
            return net.fetch(pathToFileURL(toServe).toString());
        });
    }

    // 1. Show splash immediately
    createSplash();

    // 2. Init DB
    await require('./db').initDb();

    // 3. Run all startup checks (progress shown in splash)
    await runStartupChecks();

    // 4. Create main window (splash closes when main is ready)
    createMainWindow();

    // Auto-update (production only)
    if (app.isPackaged) {
        autoUpdater.checkForUpdatesAndNotify().catch(() => {});
        autoUpdater.on('update-available', () => {
            if (mainWindow) mainWindow.webContents.send('update-available');
        });
        autoUpdater.on('update-downloaded', () => {
            if (mainWindow) mainWindow.webContents.send('update-downloaded');
            autoUpdater.quitAndInstall(false, true);
        });
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });

    // Daily sync (delayed)
    setTimeout(() => dailySync.syncIfNeeded(mainWindow), 5000);

    // ESPN: update logos and standings (run in background after 10 sec)
    setTimeout(async () => {
        try {
            console.log('[ESPN] Background sync: updating logos and standings...');
            await dataFetcher.updateTeamLogosFromEspn();
            await dataFetcher.syncStandingsFromEspn();
            console.log('[ESPN] Background sync complete.');
        } catch (e) {
            console.error('[ESPN] Background sync error:', e.message);
        }
    }, 10000);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});


// --- HELPER FUNCTIONS ---

async function updateEloRatings(homeId, awayId, homeScore, awayScore, tx = null) {
    const client = tx || prisma;
    const K_FACTOR = 32;
    const home = await client.team.findUnique({ where: { id: homeId } });
    const away = await client.team.findUnique({ where: { id: awayId } });

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

    await client.team.update({ where: { id: homeId }, data: { eloRating: newHome } });
    await client.team.update({ where: { id: awayId }, data: { eloRating: newAway } });
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

/**
 * Fetch ESPN real-world data for a team: standings, form, recent results.
 * Returns null if ESPN data is unavailable (graceful fallback).
 */
async function getEspnEnrichedTeamData(internalId) {
    try {
        const team = await prisma.team.findUnique({ where: { id: internalId } });
        if (!team) return null;

        const leagueCode = espnService.getEspnLeagueCode(team.leagueId);
        const espnTeamId = espnService.getEspnTeamId(internalId);
        if (!leagueCode || !espnTeamId) return null;

        // Load standings + schedule in parallel
        const [standings, schedule] = await Promise.allSettled([
            espnService.getStandings(leagueCode),
            espnService.getTeamSchedule(leagueCode, String(espnTeamId)),
        ]);

        let standingEntry = null;
        if (standings.status === 'fulfilled' && standings.value.length > 0) {
            standingEntry = standings.value.find(e => e.internalId === internalId) || null;
        }

        let recentResults = [];
        let espnFormString = '';
        if (schedule.status === 'fulfilled' && schedule.value.events) {
            // Get completed matches (most recent first, already sorted by date desc from API)
            const completed = schedule.value.events
                .filter(e => e.isCompleted)
                .slice(0, 5);
            recentResults = completed.map(e => {
                const isHome = e.home.internalId === internalId || e.home.espnId === String(espnTeamId);
                const teamScore = parseInt(isHome ? e.home.score : e.away.score) || 0;
                const oppScore = parseInt(isHome ? e.away.score : e.home.score) || 0;
                const result = teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'D';
                return {
                    opponent: isHome ? e.away.name : e.home.name,
                    score: `${e.home.score}-${e.away.score}`,
                    result,
                    date: e.date,
                    isHome
                };
            });
            espnFormString = recentResults.map(r => r.result).join('');
        }

        return {
            standing: standingEntry ? {
                rank: standingEntry.rank,
                points: standingEntry.points,
                played: standingEntry.played,
                wins: standingEntry.wins,
                draws: standingEntry.draws,
                losses: standingEntry.losses,
                goalsFor: standingEntry.goalsFor,
                goalsAgainst: standingEntry.goalsAgainst,
                goalDifference: standingEntry.goalDifference,
                ppg: standingEntry.ppg || 0,
                overallRecord: standingEntry.overallRecord || '',
            } : null,
            form: espnFormString,         // e.g. "WWLDW"
            recentResults,                // last 5 matches with details
            leagueCode,
            espnTeamId,
        };
    } catch (e) {
        console.error(`[ESPN] getEspnEnrichedTeamData error for ${internalId}:`, e.message);
        return null;
    }
}

/**
 * Build espnContext object for simulation engine from two ESPN enriched data objects.
 * Returns null if no ESPN data available.
 */
function buildEspnSimContext(homeEspn, awayEspn) {
    if (!homeEspn && !awayEspn) return null;
    return {
        homeRank: homeEspn?.standing?.rank || 0,
        awayRank: awayEspn?.standing?.rank || 0,
        homePPG: homeEspn?.standing?.ppg || 0,
        awayPPG: awayEspn?.standing?.ppg || 0,
        homeForm: homeEspn?.form || '',
        awayForm: awayEspn?.form || '',
    };
}

async function calculateFormFactor(teamId, espnData = null) {
    // Sim-based form (from internal DB matches)
    const form = await getTeamForm(teamId, 5);
    let simBonus = 0;
    for (const res of form) {
        if (res === 'W') simBonus += 2;
        else if (res === 'L') simBonus -= 1;
    }
    simBonus = Math.max(-5, Math.min(10, simBonus));

    // ESPN real-world form (if available)
    let espnBonus = 0;
    if (espnData && espnData.form && espnData.form.length > 0) {
        for (const ch of espnData.form) {
            if (ch === 'W') espnBonus += 2;
            else if (ch === 'L') espnBonus -= 1;
        }
        espnBonus = Math.max(-5, Math.min(10, espnBonus));
        // Blend 50/50: sim form + ESPN real form
        const blended = (simBonus + espnBonus) / 2;
        return 1 + (blended / 100);
    }

    // Fallback: sim-only
    return 1 + (simBonus / 100);
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
                type: ['CL', 'EL', 'ECL'].includes(code) ? 'tournament' : 'league'
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
                    groupName: ['CL', 'EL', 'ECL'].includes(team.leagueCode) ? 'League Phase' : 'League'
                }
            },
            update: {},
            create: {
                leagueId: leagueInfo.id,
                teamId: team.id,
                season: CURRENT_SEASON_STR,
                groupName: ['CL', 'EL', 'ECL'].includes(team.leagueCode) ? 'League Phase' : 'League',
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

                const mappedTeams = standings
                    .filter(s => s.team != null)
                    .map(s => ({
                        ...s.team,
                        id: Number(s.team.id),
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
                    id: Number(l.id),
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
    const lid = typeof leagueId === 'string' ? parseInt(leagueId, 10) : leagueId;
    if (isNaN(lid)) {
        return { currentMatchday: 1, minMatchday: 1, maxMatchday: 34, matches: [] };
    }

    const bounds = await prisma.match.aggregate({
        where: { leagueId: lid },
        _min: { matchday: true },
        _max: { matchday: true }
    });

    let targetMatchday = matchday;
    if (!targetMatchday) {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // 1. Next future match (playedAt >= now) -> current matchday
        const nextFuture = await prisma.match.findFirst({
            where: {
                leagueId: lid,
                status: 'scheduled',
                playedAt: { gte: now }
            },
            orderBy: { playedAt: 'asc' },
            select: { matchday: true }
        });
        if (nextFuture) {
            targetMatchday = nextFuture.matchday;
        } else {
            // 2. Match in last 7 days (running matchday)
            const recent = await prisma.match.findFirst({
                where: {
                    leagueId: lid,
                    playedAt: { gte: sevenDaysAgo }
                },
                orderBy: { playedAt: 'desc' },
                select: { matchday: true }
            });
            if (recent) {
                targetMatchday = recent.matchday;
            } else {
                // 3. Fallback: last finished or min
                const last = await prisma.match.findFirst({
                    where: { leagueId: lid, status: 'finished' },
                    orderBy: { playedAt: 'desc' },
                    select: { matchday: true }
                });
                targetMatchday = last?.matchday ?? bounds._min?.matchday ?? 1;
            }
        }
    }

    const matches = await prisma.match.findMany({
        where: { leagueId: lid, matchday: targetMatchday },
        include: { homeTeam: true, awayTeam: true },
        orderBy: { playedAt: 'asc' }
    });

    return {
        currentMatchday: targetMatchday ?? 1,
        minMatchday: bounds._min?.matchday ?? 1,
        maxMatchday: bounds._max?.matchday ?? 34,
        matches: matches.map(m => ({
            id: m.id,
            leagueId: m.leagueId,
            matchday: m.matchday,
            date: m.playedAt,
            status: m.status,
            home: {
                id: m.homeTeamId ?? 0,
                name: m.homeTeam?.name ?? 'TBD',
                logo: m.homeTeam?.logo ?? null,
                short_name: m.homeTeam?.shortName ?? m.homeTeam?.name ?? 'TBD'
            },
            away: {
                id: m.awayTeamId ?? 0,
                name: m.awayTeam?.name ?? 'TBD',
                logo: m.awayTeam?.logo ?? null,
                short_name: m.awayTeam?.shortName ?? m.awayTeam?.name ?? 'TBD'
            },
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

    // Load ESPN data for calibration
    const [homeEspn, awayEspn] = await Promise.all([
        getEspnEnrichedTeamData(homeId),
        getEspnEnrichedTeamData(awayId),
    ]);
    const espnContext = buildEspnSimContext(homeEspn, awayEspn);

    home.form = await calculateFormFactor(homeId, homeEspn);
    away.form = await calculateFormFactor(awayId, awayEspn);

    return footballSim.simulateMatchOdds(home, away, 1000, espnContext);
});

ipcMain.handle('get-advanced-analysis', async (event, { homeId, awayId }) => {
    const home = await prisma.team.findUnique({ where: { id: homeId } });
    const away = await prisma.team.findUnique({ where: { id: awayId } });

    if (!home || !away) return { error: "Teams not found" };

    const homeForm = await getTeamForm(homeId, 5);
    const awayForm = await getTeamForm(awayId, 5);

    // Load ESPN data for calibration
    const [homeEspn, awayEspn] = await Promise.all([
        getEspnEnrichedTeamData(homeId),
        getEspnEnrichedTeamData(awayId),
    ]);
    const espnContext = buildEspnSimContext(homeEspn, awayEspn);

    home.form = await calculateFormFactor(homeId, homeEspn);
    away.form = await calculateFormFactor(awayId, awayEspn);

    const homeStr = await calculateTeamStrength(homeId);
    const awayStr = await calculateTeamStrength(awayId);

    home.att = homeStr.att; home.mid = homeStr.mid; home.def = homeStr.def;
    away.att = awayStr.att; away.mid = awayStr.mid; away.def = awayStr.def;

    const odds = footballSim.simulateMatchOdds(home, away, 1000, espnContext);

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

const TOURNAMENT_LEAGUE_IDS = [2001, 2146, 2154]; // CL, EL, ECL

ipcMain.handle('simulate-matchday', async (event, leagueId) => {
    const lid = typeof leagueId === 'string' ? parseInt(leagueId, 10) : leagueId;
    const groupName = TOURNAMENT_LEAGUE_IDS.includes(lid) ? 'League Phase' : 'League';

    // Champions League: use actual fixtures from DB instead of random pairings
    if (TOURNAMENT_LEAGUE_IDS.includes(lid)) {
        const scheduledMatches = await prisma.match.findMany({
            where: { leagueId: lid, status: 'scheduled' },
            include: { homeTeam: true, awayTeam: true },
            orderBy: [{ matchday: 'asc' }, { playedAt: 'asc' }]
        });

        if (!scheduledMatches || scheduledMatches.length === 0) {
            throw new Error('No scheduled fixtures for Champions League. Run npm run update-data to fetch fixtures.');
        }

        // Group by matchday, simulate the earliest matchday first
        const byMatchday = {};
        for (const m of scheduledMatches) {
            const md = m.matchday ?? 1;
            if (!byMatchday[md]) byMatchday[md] = [];
            byMatchday[md].push(m);
        }
        const targetMatchday = Math.min(...Object.keys(byMatchday).map(Number));
        const matchesToSim = byMatchday[targetMatchday];

        const results = [];
        await prisma.$transaction(async (tx) => {
            for (const m of matchesToSim) {
                if (!m.homeTeamId || !m.awayTeamId) continue;
                const home = await prisma.team.findUnique({ where: { id: m.homeTeamId } });
                const away = await prisma.team.findUnique({ where: { id: m.awayTeamId } });
                if (!home || !away) continue;

                const homeStr = await calculateTeamStrength(home.id);
                const awayStr = await calculateTeamStrength(away.id);
                home.att = homeStr.att; home.mid = homeStr.mid; home.def = homeStr.def;
                away.att = awayStr.att; away.mid = awayStr.mid; away.def = awayStr.def;

                // ESPN calibration (loaded per match, cached internally by espnService)
                const [homeEspn, awayEspn] = await Promise.all([
                    getEspnEnrichedTeamData(home.id),
                    getEspnEnrichedTeamData(away.id),
                ]);
                const espnContext = buildEspnSimContext(homeEspn, awayEspn);

                home.form = await calculateFormFactor(home.id, homeEspn);
                away.form = await calculateFormFactor(away.id, awayEspn);
                home.power = await db.getTeamPower(home.id);
                away.power = await db.getTeamPower(away.id);

                const res = footballSim.simulateMatch(home, away, espnContext);

                await tx.match.update({
                    where: { id: m.id },
                    data: {
                        homeScore: res.homeGoals,
                        awayScore: res.awayGoals,
                        status: 'finished',
                        playedAt: new Date()
                    }
                });

                if (res.events && res.events.length > 0) {
                    await tx.matchEvent.createMany({
                        data: res.events.map(ev => ({
                            matchId: m.id,
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
                const awayPts = res.awayGoals > res.homeGoals ? 3 : (res.awayGoals === res.homeGoals ? 1 : 0);
                const awayWins = res.awayGoals > res.homeGoals ? 1 : 0;
                const awayDraws = res.awayGoals === res.homeGoals ? 1 : 0;
                const awayLosses = res.awayGoals < res.homeGoals ? 1 : 0;

                await tx.standing.upsert({
                    where: {
                        leagueId_teamId_season_groupName: {
                            leagueId: lid,
                            teamId: home.id,
                            season: CURRENT_SEASON_STR,
                            groupName
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
                        leagueId: lid,
                        teamId: home.id,
                        season: CURRENT_SEASON_STR,
                        groupName,
                        played: 1,
                        wins: homeWins,
                        draws: homeDraws,
                        losses: homeLosses,
                        gf: res.homeGoals,
                        ga: res.awayGoals,
                        points: homePts
                    }
                });
                await tx.standing.upsert({
                    where: {
                        leagueId_teamId_season_groupName: {
                            leagueId: lid,
                            teamId: away.id,
                            season: CURRENT_SEASON_STR,
                            groupName
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
                        leagueId: lid,
                        teamId: away.id,
                        season: CURRENT_SEASON_STR,
                        groupName,
                        played: 1,
                        wins: awayWins,
                        draws: awayDraws,
                        losses: awayLosses,
                        gf: res.awayGoals,
                        ga: res.homeGoals,
                        points: awayPts
                    }
                });

                await updateEloRatings(home.id, away.id, res.homeGoals, res.awayGoals, tx);
                results.push({ ...res, matchday: targetMatchday });
            }
        }, { timeout: 20000 });

        return results;
    }

    // Domestic leagues: random pairings (existing logic)
    const teams = await prisma.team.findMany({
        where: { leagueId: lid },
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
        const _espn = await getEspnEnrichedTeamData(t.id);
        return {
            ...t,
            att: str.att, mid: str.mid, def: str.def,
            form: await calculateFormFactor(t.id, _espn),
            _espn,
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
        where: { leagueId: lid },
        _max: { matchday: true }
    });
    const currentMatchday = (lastMatch._max?.matchday || 0) + 1;

    const results = [];

    await prisma.$transaction(async (tx) => {
        for (const m of matchups) {
            m.home.power = await db.getTeamPower(m.home.id);
            m.away.power = await db.getTeamPower(m.away.id);
            const espnCtx = buildEspnSimContext(m.home._espn, m.away._espn);
            const res = footballSim.simulateMatch(m.home, m.away, espnCtx);

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

            await updateEloRatings(m.home.id, m.away.id, res.homeGoals, res.awayGoals, tx);
            results.push({ ...res, matchday: currentMatchday });
        }
    }, { timeout: 20000 });

    return results;
});

// Knockout round matchdays: 100=Playoffs, 101=R16, 102=QF, 103=SF, 104=Final
const KO_MATCHDAY = { PLAYOFF: 100, R16: 101, QF: 102, SF: 103, FINAL: 104 };

ipcMain.handle('simulate-tournament-round', async (event, { leagueId }) => {
    const lid = typeof leagueId === 'string' ? parseInt(leagueId, 10) : leagueId;
    if (!TOURNAMENT_LEAGUE_IDS.includes(lid)) throw new Error('Tournament simulation only supported for CL/EL/ECL');

    const standings = await prisma.standing.findMany({
        where: { leagueId: lid, season: CURRENT_SEASON_STR },
        include: { team: true },
        orderBy: [{ points: 'desc' }, { gf: 'desc' }]
    });
    const sortedTeams = standings.map(s => ({ ...s.team, points: s.points, stats: { played: s.played, wins: s.wins, draws: s.draws, losses: s.losses, gf: s.gf, ga: s.ga } }));

    const existingKo = await prisma.match.findMany({
        where: { leagueId: lid, matchday: { in: [KO_MATCHDAY.PLAYOFF, KO_MATCHDAY.R16, KO_MATCHDAY.QF, KO_MATCHDAY.SF, KO_MATCHDAY.FINAL] } },
        include: { homeTeam: true, awayTeam: true }
    });

    const hasPlayoffs = existingKo.some(m => m.matchday === KO_MATCHDAY.PLAYOFF);
    const hasR16 = existingKo.some(m => m.matchday === KO_MATCHDAY.R16);
    const hasQF = existingKo.some(m => m.matchday === KO_MATCHDAY.QF);
    const hasSF = existingKo.some(m => m.matchday === KO_MATCHDAY.SF);
    const hasFinal = existingKo.some(m => m.matchday === KO_MATCHDAY.FINAL);

    const playoffTeams = sortedTeams.slice(8, 24);
    const top8 = sortedTeams.slice(0, 8);

    const enrichTeam = async (t) => {
        const str = await calculateTeamStrength(t.id);
        t.att = str.att; t.mid = str.mid; t.def = str.def;
        t._espn = await getEspnEnrichedTeamData(t.id);
        t.form = await calculateFormFactor(t.id, t._espn);
        t.power = await db.getTeamPower(t.id);
        return t;
    };

    if (!hasPlayoffs) {
        if (playoffTeams.length < 16) {
            throw new Error(`Need at least 24 teams for playoffs (have ${sortedTeams.length}). Complete League Phase first.`);
        }
        // Simulate Playoffs (8 two-legged ties: 9vs24, 10vs23, ...)
        const results = [];
        await prisma.$transaction(async (tx) => {
            for (let i = 0; i < 8; i++) {
                const home = await enrichTeam({ ...playoffTeams[i] });
                const away = await enrichTeam({ ...playoffTeams[15 - i] });
                const espnCtx = buildEspnSimContext(home._espn, away._espn);
                const leg1 = footballSim.simulateMatch(home, away, espnCtx);
                const leg2 = footballSim.simulateMatch(away, home, espnCtx);
                const tie = footballSim.simulateKnockoutTie(
                    { homeGoals: leg1.homeGoals, awayGoals: leg1.awayGoals, homeId: home.id, awayId: away.id },
                    { homeGoals: leg2.homeGoals, awayGoals: leg2.awayGoals, homeId: away.id, awayId: home.id },
                    false
                );
                const winnerId = tie.winnerId;
                const loserId = home.id === winnerId ? away.id : home.id;
                const winnerAgg = home.id === winnerId ? leg1.homeGoals + leg2.awayGoals : leg1.awayGoals + leg2.homeGoals;
                const loserAgg = home.id === winnerId ? leg1.awayGoals + leg2.homeGoals : leg1.homeGoals + leg2.awayGoals;
                await tx.match.create({
                    data: {
                        leagueId: lid,
                        homeTeamId: winnerId,
                        awayTeamId: loserId,
                        homeScore: winnerAgg,
                        awayScore: loserAgg,
                        matchday: KO_MATCHDAY.PLAYOFF,
                        status: 'finished',
                        playedAt: new Date()
                    }
                });
                results.push({ round: 'Playoff', winnerId: tie.winnerId });
            }
        }, { timeout: 15000 });
        return { round: 'Playoff', count: 8, results };
    }

    if (hasPlayoffs && !hasR16) {
        // Get playoff winners from DB
        const playoffMatches = await prisma.match.findMany({
            where: { leagueId: lid, matchday: KO_MATCHDAY.PLAYOFF },
            include: { homeTeam: true, awayTeam: true }
        });
        const playoffWinners = playoffMatches.map(m => {
            const winnerId = m.homeTeamId; // We store winner as home in playoff matches
            return sortedTeams.find(t => t.id === winnerId) || (m.homeTeam);
        }).filter(Boolean);

        if (playoffWinners.length !== 8) throw new Error('Playoff winners incomplete');

        const r16Pairs = [];
        for (let i = 0; i < 8; i++) {
            r16Pairs.push({ home: top8[i], away: playoffWinners[7 - i] });
        }

        await prisma.$transaction(async (tx) => {
            for (const p of r16Pairs) {
                const home = await enrichTeam({ ...p.home });
                const away = await enrichTeam({ ...p.away });
                const espnCtx = buildEspnSimContext(home._espn, away._espn);
                const res = footballSim.simulateMatch(home, away, espnCtx);
                await tx.match.create({
                    data: {
                        leagueId: lid,
                        homeTeamId: home.id,
                        awayTeamId: away.id,
                        homeScore: res.homeGoals,
                        awayScore: res.awayGoals,
                        matchday: KO_MATCHDAY.R16,
                        status: 'finished',
                        playedAt: new Date()
                    }
                });
            }
        }, { timeout: 15000 });
        return { round: 'R16', count: 8 };
    }

    if (hasR16 && !hasQF) {
        const r16Matches = await prisma.match.findMany({
            where: { leagueId: lid, matchday: KO_MATCHDAY.R16 },
            include: { homeTeam: true, awayTeam: true }
        });
        const qfPairs = [
            [r16Matches[0], r16Matches[1]],
            [r16Matches[2], r16Matches[3]],
            [r16Matches[4], r16Matches[5]],
            [r16Matches[6], r16Matches[7]]
        ].map(([a, b]) => {
            const winA = (a.homeScore ?? 0) > (a.awayScore ?? 0) ? a.homeTeam : a.awayTeam;
            const winB = (b.homeScore ?? 0) > (b.awayScore ?? 0) ? b.homeTeam : b.awayTeam;
            return { home: winA, away: winB };
        });

        await prisma.$transaction(async (tx) => {
            for (const p of qfPairs) {
                const home = await enrichTeam({ ...p.home });
                const away = await enrichTeam({ ...p.away });
                const espnCtx = buildEspnSimContext(home._espn, away._espn);
                const res = footballSim.simulateMatch(home, away, espnCtx);
                await tx.match.create({
                    data: {
                        leagueId: lid,
                        homeTeamId: home.id,
                        awayTeamId: away.id,
                        homeScore: res.homeGoals,
                        awayScore: res.awayGoals,
                        matchday: KO_MATCHDAY.QF,
                        status: 'finished',
                        playedAt: new Date()
                    }
                });
            }
        }, { timeout: 15000 });
        return { round: 'QF', count: 4 };
    }

    if (hasQF && !hasSF) {
        const qfMatches = await prisma.match.findMany({
            where: { leagueId: lid, matchday: KO_MATCHDAY.QF },
            include: { homeTeam: true, awayTeam: true }
        });
        const sfPairs = [
            [qfMatches[0], qfMatches[1]],
            [qfMatches[2], qfMatches[3]]
        ].map(([a, b]) => {
            const winA = (a.homeScore ?? 0) > (a.awayScore ?? 0) ? a.homeTeam : a.awayTeam;
            const winB = (b.homeScore ?? 0) > (b.awayScore ?? 0) ? b.homeTeam : b.awayTeam;
            return { home: winA, away: winB };
        });

        await prisma.$transaction(async (tx) => {
            for (const p of sfPairs) {
                const home = await enrichTeam({ ...p.home });
                const away = await enrichTeam({ ...p.away });
                const espnCtx = buildEspnSimContext(home._espn, away._espn);
                const res = footballSim.simulateMatch(home, away, espnCtx);
                await tx.match.create({
                    data: {
                        leagueId: lid,
                        homeTeamId: home.id,
                        awayTeamId: away.id,
                        homeScore: res.homeGoals,
                        awayScore: res.awayGoals,
                        matchday: KO_MATCHDAY.SF,
                        status: 'finished',
                        playedAt: new Date()
                    }
                });
            }
        }, { timeout: 15000 });
        return { round: 'SF', count: 2 };
    }

    if (hasSF && !hasFinal) {
        const sfMatches = await prisma.match.findMany({
            where: { leagueId: lid, matchday: KO_MATCHDAY.SF },
            include: { homeTeam: true, awayTeam: true }
        });
        const win0 = (sfMatches[0].homeScore ?? 0) > (sfMatches[0].awayScore ?? 0) ? sfMatches[0].homeTeam : sfMatches[0].awayTeam;
        const win1 = (sfMatches[1].homeScore ?? 0) > (sfMatches[1].awayScore ?? 0) ? sfMatches[1].homeTeam : sfMatches[1].awayTeam;

        const home = await enrichTeam({ ...win0 });
        const away = await enrichTeam({ ...win1 });
        const espnCtx = buildEspnSimContext(home._espn, away._espn);
        const res = footballSim.simulateMatch(home, away, espnCtx);

        await prisma.match.create({
            data: {
                leagueId: lid,
                homeTeamId: home.id,
                awayTeamId: away.id,
                homeScore: res.homeGoals,
                awayScore: res.awayGoals,
                matchday: KO_MATCHDAY.FINAL,
                status: 'finished',
                playedAt: new Date()
            }
        });
        return { round: 'Final', count: 1 };
    }

    return { round: null, message: 'Tournament complete or no next round' };
});

ipcMain.handle('get-tournament-bracket', async (event, { leagueId }) => {
    const lid = typeof leagueId === 'string' ? parseInt(leagueId, 10) : leagueId;
    if (!TOURNAMENT_LEAGUE_IDS.includes(lid)) return null;

    const matches = await prisma.match.findMany({
        where: {
            leagueId: lid,
            matchday: { in: [KO_MATCHDAY.PLAYOFF, KO_MATCHDAY.R16, KO_MATCHDAY.QF, KO_MATCHDAY.SF, KO_MATCHDAY.FINAL] }
        },
        include: { homeTeam: true, awayTeam: true },
        orderBy: [{ matchday: 'asc' }, { id: 'asc' }]
    });

    const toMatch = (m) => ({
        id: m.id,
        home: m.homeTeam ? { ...m.homeTeam, short_name: m.homeTeam.shortName || m.homeTeam.name } : null,
        away: m.awayTeam ? { ...m.awayTeam, short_name: m.awayTeam.shortName || m.awayTeam.name } : null,
        homeScore: m.homeScore,
        awayScore: m.awayScore
    });

    const playoffs = matches.filter(m => m.matchday === KO_MATCHDAY.PLAYOFF).map(toMatch);
    const r16 = matches.filter(m => m.matchday === KO_MATCHDAY.R16).map(toMatch);
    const qf = matches.filter(m => m.matchday === KO_MATCHDAY.QF).map(toMatch);
    const sf = matches.filter(m => m.matchday === KO_MATCHDAY.SF).map(toMatch);
    const finalMatch = matches.find(m => m.matchday === KO_MATCHDAY.FINAL);

    return {
        playoffs,
        r16,
        qf,
        sf,
        final: finalMatch ? toMatch(finalMatch) : null
    };
});

ipcMain.handle('simulate-match', async (event, { homeId, awayId }) => {
    const home = await prisma.team.findUnique({ where: { id: homeId } });
    const away = await prisma.team.findUnique({ where: { id: awayId } });

    if (!home || !away) throw new Error("Teams not found");

    // ESPN calibration
    const [homeEspn, awayEspn] = await Promise.all([
        getEspnEnrichedTeamData(homeId),
        getEspnEnrichedTeamData(awayId),
    ]);
    const espnContext = buildEspnSimContext(homeEspn, awayEspn);

    home.form = await calculateFormFactor(homeId, homeEspn);
    away.form = await calculateFormFactor(awayId, awayEspn);

    const homeStr = await calculateTeamStrength(homeId);
    const awayStr = await calculateTeamStrength(awayId);
    home.att = homeStr.att; home.mid = homeStr.mid; home.def = homeStr.def;
    away.att = awayStr.att; away.mid = awayStr.mid; away.def = awayStr.def;

    return footballSim.simulateMatch(home, away, espnContext);
});

ipcMain.handle('simulate-single-match', async (event, { matchId }) => {
    const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: { homeTeam: true, awayTeam: true, league: true }
    });
    if (!match || !match.homeTeamId || !match.awayTeamId || match.status === 'finished') {
        throw new Error('Match not found or already finished');
    }

    const home = await prisma.team.findUnique({ where: { id: match.homeTeamId } });
    const away = await prisma.team.findUnique({ where: { id: match.awayTeamId } });
    if (!home || !away) throw new Error('Teams not found');

    const homeStr = await calculateTeamStrength(home.id);
    const awayStr = await calculateTeamStrength(away.id);
    home.att = homeStr.att; home.mid = homeStr.mid; home.def = homeStr.def;
    away.att = awayStr.att; away.mid = awayStr.mid; away.def = awayStr.def;

    // ESPN calibration
    const [homeEspn, awayEspn] = await Promise.all([
        getEspnEnrichedTeamData(home.id),
        getEspnEnrichedTeamData(away.id),
    ]);
    const espnContext = buildEspnSimContext(homeEspn, awayEspn);

    home.form = await calculateFormFactor(home.id, homeEspn);
    away.form = await calculateFormFactor(away.id, awayEspn);
    home.power = await db.getTeamPower(home.id);
    away.power = await db.getTeamPower(away.id);

    const res = footballSim.simulateMatch(home, away, espnContext);
    const leagueId = match.leagueId;
    const groupName = TOURNAMENT_LEAGUE_IDS.includes(leagueId) ? 'League Phase' : 'League';

    await prisma.$transaction(async (tx) => {
        await tx.match.update({
            where: { id: matchId },
            data: {
                homeScore: res.homeGoals,
                awayScore: res.awayGoals,
                status: 'finished',
                playedAt: new Date()
            }
        });

        if (res.events?.length > 0) {
            await tx.matchEvent.createMany({
                data: res.events.map(ev => ({
                    matchId,
                    teamId: ev.teamId,
                    type: ev.type,
                    minute: ev.minute,
                    description: ev.description
                }))
            });
        }

        const homePts = res.homeGoals > res.awayGoals ? 3 : (res.homeGoals === res.awayGoals ? 1 : 0);
        const awayPts = res.awayGoals > res.homeGoals ? 3 : (res.awayGoals === res.homeGoals ? 1 : 0);
        const homeWins = res.homeGoals > res.awayGoals ? 1 : 0, homeDraws = res.homeGoals === res.awayGoals ? 1 : 0, homeLosses = res.homeGoals < res.awayGoals ? 1 : 0;
        const awayWins = res.awayGoals > res.homeGoals ? 1 : 0, awayDraws = res.awayGoals === res.homeGoals ? 1 : 0, awayLosses = res.awayGoals < res.homeGoals ? 1 : 0;

        await tx.standing.upsert({
            where: { leagueId_teamId_season_groupName: { leagueId, teamId: home.id, season: CURRENT_SEASON_STR, groupName } },
            update: { played: { increment: 1 }, wins: { increment: homeWins }, draws: { increment: homeDraws }, losses: { increment: homeLosses }, gf: { increment: res.homeGoals }, ga: { increment: res.awayGoals }, points: { increment: homePts } },
            create: { leagueId, teamId: home.id, season: CURRENT_SEASON_STR, groupName, played: 1, wins: homeWins, draws: homeDraws, losses: homeLosses, gf: res.homeGoals, ga: res.awayGoals, points: homePts }
        });
        await tx.standing.upsert({
            where: { leagueId_teamId_season_groupName: { leagueId, teamId: away.id, season: CURRENT_SEASON_STR, groupName } },
            update: { played: { increment: 1 }, wins: { increment: awayWins }, draws: { increment: awayDraws }, losses: { increment: awayLosses }, gf: { increment: res.awayGoals }, ga: { increment: res.homeGoals }, points: { increment: awayPts } },
            create: { leagueId, teamId: away.id, season: CURRENT_SEASON_STR, groupName, played: 1, wins: awayWins, draws: awayDraws, losses: awayLosses, gf: res.awayGoals, ga: res.homeGoals, points: awayPts }
        });

        await updateEloRatings(home.id, away.id, res.homeGoals, res.awayGoals, tx);
    }, { timeout: 15000 });

    return { homeGoals: res.homeGoals, awayGoals: res.awayGoals };
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

ipcMain.handle('get-ai-prediction', async (event, { homeId, awayId, odds }) => {
    try {
        const home = await prisma.team.findUnique({ where: { id: homeId } });
        const away = await prisma.team.findUnique({ where: { id: awayId } });

        if (!home || !away) return { error: "Teams not found" };

        const homeStrength = await calculateTeamStrength(homeId);
        const awayStrength = await calculateTeamStrength(awayId);

        const homeDetails = { ...homeStrength, form: await getTeamForm(homeId, 5) };
        const awayDetails = { ...awayStrength, form: await getTeamForm(awayId, 5) };

        // Fetch standings for both teams
        const homeStanding = await prisma.standing.findFirst({
            where: { teamId: homeId, season: CURRENT_SEASON_STR }
        });
        const awayStanding = await prisma.standing.findFirst({
            where: { teamId: awayId, season: CURRENT_SEASON_STR }
        });

        const standings = {
            home: homeStanding ? {
                position: homeStanding.position,
                points: homeStanding.points,
                played: homeStanding.played
            } : { position: '?', points: 0, played: 0 },
            away: awayStanding ? {
                position: awayStanding.position,
                points: awayStanding.points,
                played: awayStanding.played
            } : { position: '?', points: 0, played: 0 }
        };

        // Fetch top players for both teams
        const homePlayers = await prisma.player.findMany({
            where: { teamId: homeId },
            orderBy: { rating: 'desc' },
            take: 5,
            select: { name: true, rating: true, position: true }
        });
        const awayPlayers = await prisma.player.findMany({
            where: { teamId: awayId },
            orderBy: { rating: 'desc' },
            take: 5,
            select: { name: true, rating: true, position: true }
        });

        const topPlayers = {
            home: homePlayers,
            away: awayPlayers
        };

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

        // ── Load ESPN Real-World Data for AI Context ──
        const [homeEspn, awayEspn] = await Promise.all([
            getEspnEnrichedTeamData(homeId),
            getEspnEnrichedTeamData(awayId),
        ]);

        // Try to find current ESPN scores for this matchup (for live odds / H2H)
        let espnMatchOdds = [];
        let espnH2h = [];
        try {
            if (homeEspn?.leagueCode) {
                const scores = await espnService.getScores(homeEspn.leagueCode);
                // Find the event matching this matchup
                const espnMatch = scores.find(s => {
                    const homeMatch = s.homeTeam?.internalId === homeId || s.awayTeam?.internalId === homeId;
                    const awayMatch = s.homeTeam?.internalId === awayId || s.awayTeam?.internalId === awayId;
                    return homeMatch && awayMatch;
                });
                if (espnMatch?.id) {
                    const summary = await espnService.getMatchSummary(homeEspn.leagueCode, espnMatch.id);
                    if (summary) {
                        espnMatchOdds = summary.odds || [];
                        espnH2h = summary.h2h || [];
                    }
                }
            }
        } catch (e) {
            console.log('[ESPN] Could not load match odds/h2h for AI:', e.message);
        }

        const espnAiContext = {
            homeStanding: homeEspn?.standing || null,
            awayStanding: awayEspn?.standing || null,
            homeForm: homeEspn?.form || '',
            awayForm: awayEspn?.form || '',
            homeRecentResults: homeEspn?.recentResults || [],
            awayRecentResults: awayEspn?.recentResults || [],
            h2h: espnH2h,
            odds: espnMatchOdds,
        };

        const context = {
            home, away, odds, homeDetails, awayDetails, h2h, injuries: injuryText,
            standings, topPlayers, espn: espnAiContext,
        };

        const webContents = event.sender;
        const onProgress = (progress, step) => {
            try { webContents.send('ai-analyst-progress', { progress, step }); } catch (_) {}
        };

        return await aiBridge.generateExpertAnalysis(context, onProgress);

    } catch (e) {
        console.error("AI Prediction Error:", e);
        const msg = e?.message || String(e);
        return { error: msg };
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

// ── ESPN API Handlers ──
ipcMain.handle('espn-get-news', async (event, league) => {
    try {
        if (league) return await espnService.getNews(league);
        return await espnService.getAllNews();
    } catch (e) {
        console.error('ESPN News Error:', e);
        return [];
    }
});

ipcMain.handle('espn-get-scores', async (event, league) => {
    try {
        if (league) return await espnService.getScores(league);
        return await espnService.getAllScores();
    } catch (e) {
        console.error('ESPN Scores Error:', e);
        return [];
    }
});

ipcMain.handle('espn-get-scores-by-date', async (event, { league, date }) => {
    try {
        return await espnService.getScoresByDate(league, date);
    } catch (e) {
        console.error('ESPN Scores by Date Error:', e);
        return [];
    }
});

ipcMain.handle('espn-get-standings', async (event, league) => {
    try {
        return await espnService.getStandings(league);
    } catch (e) {
        console.error('ESPN Standings Error:', e);
        return [];
    }
});

ipcMain.handle('espn-get-team-schedule', async (event, { league, teamId }) => {
    try {
        return await espnService.getTeamSchedule(league, teamId);
    } catch (e) {
        console.error('ESPN Team Schedule Error:', e);
        return { team: null, events: [] };
    }
});

ipcMain.handle('espn-get-match-summary', async (event, { league, eventId }) => {
    try {
        return await espnService.getMatchSummary(league, eventId);
    } catch (e) {
        console.error('ESPN Match Summary Error:', e);
        return null;
    }
});

ipcMain.handle('espn-get-teams', async (event, league) => {
    try {
        return await espnService.getTeams(league);
    } catch (e) {
        console.error('ESPN Teams Error:', e);
        return [];
    }
});

ipcMain.handle('espn-get-leagues', () => {
    return espnService.getLeagues();
});

ipcMain.handle('espn-get-league-code', (event, internalCodeOrId) => {
    return espnService.getEspnLeagueCode(internalCodeOrId);
});

ipcMain.handle('espn-get-team-id', (event, internalId) => {
    return espnService.getEspnTeamId(internalId);
});

ipcMain.handle('espn-sync-logos', async () => {
    try {
        const count = await dataFetcher.updateTeamLogosFromEspn();
        return { success: true, count };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('espn-sync-standings', async () => {
    try {
        const count = await dataFetcher.syncStandingsFromEspn();
        return { success: true, count };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
