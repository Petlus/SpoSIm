const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./db'); // SQLite

// Basic dev detection
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        title: "SportSim 2026",
        autoHideMenuBar: true,
        backgroundColor: '#0f172a',
    });

    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../out/index.html')}`;

    console.log(`Loading URL: ${startUrl}`);
    mainWindow.loadURL(startUrl);
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Load Simulation Modules
const footballSim = require('./simulation/football');
const f1Sim = require('./simulation/f1');
const dataFetcher = require('./data_fetcher');

// --- IPC HANDLERS ---
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('get-data', (event, category) => {
    if (category === 'football') {
        const leagues = db.prepare('SELECT * FROM leagues').all();
        const result = { leagues: [] };

        for (const l of leagues) {
            // Join teams with their current season standings
            const teams = db.prepare(`
                SELECT t.*, s.played, s.wins, s.draws, s.losses, s.gf, s.ga, s.points 
                FROM teams t
                LEFT JOIN standings s ON t.id = s.team_id AND s.season = '2024/2025'
                WHERE t.league_id = ?
                ORDER BY s.points DESC
            `).all(l.id);

            // Map to frontend structure
            const mappedTeams = teams.map(t => ({
                ...t,
                logo: t.logo,
                points: t.points || 0, // ensure not null
                stats: {
                    played: t.played || 0,
                    wins: t.wins || 0,
                    draws: t.draws || 0,
                    losses: t.losses || 0,
                    gf: t.gf || 0,
                    ga: t.ga || 0
                }
            }));

            result.leagues.push({
                ...l,
                teams: mappedTeams
            });
        }
        return result;
    } else if (category === 'f1') {
        const teams = db.prepare('SELECT * FROM f1_teams').all();
        const drivers = db.prepare('SELECT * FROM f1_drivers').all();
        return {
            teams,
            drivers,
            tracks: [{ id: 'bahrain', name: 'Bahrain', type: 'balanced' }]
        };
    }
    return {};
});

ipcMain.handle('update-data', async () => {
    try {
        await dataFetcher.updateAllData();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('simulate-matchday', async (event, leagueId) => {
    // 1. Get Teams for League
    const teams = db.prepare('SELECT * FROM teams WHERE league_id = ?').all(leagueId);
    if (!teams || teams.length < 2) throw new Error("Not enough teams in league");

    // 2. Pair
    const matchups = [];
    const pool = [...teams];

    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    while (pool.length >= 2) {
        matchups.push({ home: pool.pop(), away: pool.pop() });
    }

    // 3. Simulate and Update DB
    const results = [];

    const runMatchday = db.transaction(() => {
        const updateTeam = db.prepare(`
            UPDATE teams 
            SET played = played + 1,
                wins = wins + @wins,
                draws = draws + @draws,
                losses = losses + @losses,
                gf = gf + @gf,
                ga = ga + @ga,
                points = points + @points
            WHERE id = @id
        `);

        for (const m of matchups) {
            const res = footballSim.simulateMatch(m.home, m.away);
            results.push(res);

            // Update Home
            updateTeam.run({
                wins: res.homeGoals > res.awayGoals ? 1 : 0,
                draws: res.homeGoals === res.awayGoals ? 1 : 0,
                losses: res.homeGoals < res.awayGoals ? 1 : 0,
                gf: res.homeGoals,
                ga: res.awayGoals,
                points: res.homeGoals > res.awayGoals ? 3 : (res.homeGoals === res.awayGoals ? 1 : 0),
                id: m.home.id
            });

            // Update Away
            updateTeam.run({
                wins: res.awayGoals > res.homeGoals ? 1 : 0,
                draws: res.awayGoals === res.homeGoals ? 1 : 0,
                losses: res.awayGoals < res.homeGoals ? 1 : 0,
                gf: res.awayGoals,
                ga: res.homeGoals,
                points: res.awayGoals > res.homeGoals ? 3 : (res.awayGoals === res.homeGoals ? 1 : 0),
                id: m.away.id
            });
        }
    });

    runMatchday();
    return { success: true, results };
});

ipcMain.handle('simulate-match', (event, { homeId, awayId, leagueId }) => {
    // Basic single match simulation (no db update)
    const home = db.prepare('SELECT * FROM teams WHERE id = ?').get(homeId);
    const away = db.prepare('SELECT * FROM teams WHERE id = ?').get(awayId);

    if (!home || !away) throw new Error("Teams not found");

    const result = footballSim.simulateMatch(home, away);
    return result;
});

ipcMain.handle('simulate-f1-race', (event, trackId) => {
    const drivers = db.prepare('SELECT * FROM f1_drivers').all();
    const track = { name: "Bahrain", type: 'balanced' };

    const driversWithCars = drivers.map(d => {
        const team = db.prepare('SELECT * FROM f1_teams WHERE id = ?').get(d.team_id);
        return {
            ...d,
            teamPerf: team ? team.perf : 90,
            reliability: team ? team.reliability : 0.95
        };
    });

    const result = f1Sim.simulateRace(track, driversWithCars);
    return result;
});
