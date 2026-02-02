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

    // Check if Data exists, if not, fetch it
    try {
        const leagueCount = db.prepare('SELECT count(*) as c FROM leagues').get().c;
        if (leagueCount === 0) {
            console.log("Database empty. Starting initial data fetch...");
            dataFetcher.updateAllData().then(() => {
                console.log("Initial fetch complete. Reloading window...");
                if (mainWindow) mainWindow.reload();
            }).catch(err => console.error("Initial fetch failed:", err));
        }
    } catch (e) {
        console.error("DB Check Failed:", e);
    }

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

// --- HELPER FUNCTIONS ---

/**
 * Get the last 5 match results for a team to calculate form.
 * Returns array of 'W', 'D', 'L' (newest first).
 */
function getTeamForm(teamId, limit = 5) {
    const matches = db.prepare(`
        SELECT home_team_id, away_team_id, home_score, away_score 
        FROM matches 
        WHERE (home_team_id = ? OR away_team_id = ?) AND status = 'finished'
        ORDER BY played_at DESC
        LIMIT ?
    `).all(teamId, teamId, limit);

    return matches.map(m => {
        const isHome = m.home_team_id === teamId;
        const teamScore = isHome ? m.home_score : m.away_score;
        const oppScore = isHome ? m.away_score : m.home_score;
        if (teamScore > oppScore) return 'W';
        if (teamScore < oppScore) return 'L';
        return 'D';
    });
}

/**
 * Calculate form factor based on last 5 matches.
 * W = +2%, D = 0%, L = -1%. Max boost: +10%, Max penalty: -5%.
 * GERMAN: Der Form-Faktor berechnet sich aus den letzten 5 Spielen.
 * Siege geben +2%, Remis 0%, niederlagen -1%. Max +10% / -5%.
 */
function calculateFormFactor(teamId) {
    const form = getTeamForm(teamId, 5);
    let bonus = 0;
    for (const result of form) {
        if (result === 'W') bonus += 2;
        else if (result === 'L') bonus -= 1;
    }
    // Clamp between -5 and +10
    bonus = Math.max(-5, Math.min(10, bonus));
    return 1 + (bonus / 100); // e.g., 1.10 for +10%
}

// --- IPC HANDLERS ---
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('get-data', (event, category) => {
    if (category === 'football') {
        const leagues = db.prepare('SELECT * FROM leagues WHERE sport = ?').all('football');
        const result = { leagues: [] };

        for (const l of leagues) {
            let teams;

            if (l.type === 'tournament') {
                // For CL and other tournaments: get teams via standings (not league_id)
                teams = db.prepare(`
                    SELECT t.*, s.played, s.wins, s.draws, s.losses, s.gf, s.ga, s.points, s.group_name 
                    FROM standings s
                    JOIN teams t ON t.id = s.team_id
                    WHERE s.league_id = ? AND s.season = '2024/2025'
                    ORDER BY s.group_name ASC, s.points DESC
                `).all(l.id);
            } else {
                // For domestic leagues: get teams via league_id
                teams = db.prepare(`
                    SELECT t.*, s.played, s.wins, s.draws, s.losses, s.gf, s.ga, s.points, s.group_name 
                    FROM teams t
                    LEFT JOIN standings s ON t.id = s.team_id AND s.league_id = ? AND s.season = '2024/2025'
                    WHERE t.league_id = ?
                    ORDER BY s.group_name ASC, s.points DESC
                `).all(l.id, l.id);
            }

            const mappedTeams = teams.map(t => ({
                ...t,
                logo: t.logo,
                group: t.group_name || 'League',
                points: t.points || 0,
                form: getTeamForm(t.id, 5),
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

ipcMain.handle('get-match-odds', (event, { homeId, awayId }) => {
    const home = db.prepare('SELECT * FROM teams WHERE id = ?').get(homeId);
    const away = db.prepare('SELECT * FROM teams WHERE id = ?').get(awayId);

    if (!home || !away) return { error: "Teams not found" };

    // Apply form factor
    home.form = calculateFormFactor(homeId);
    away.form = calculateFormFactor(awayId);

    return footballSim.simulateMatchOdds(home, away, 1000); // 1000 iterations
});

ipcMain.handle('get-advanced-analysis', (event, { homeId, awayId }) => {
    const home = db.prepare('SELECT * FROM teams WHERE id = ?').get(homeId);
    const away = db.prepare('SELECT * FROM teams WHERE id = ?').get(awayId);

    if (!home || !away) return { error: "Teams not found" };

    // Form data
    const homeForm = getTeamForm(homeId, 5);
    const awayForm = getTeamForm(awayId, 5);

    // Form factors
    home.form = calculateFormFactor(homeId);
    away.form = calculateFormFactor(awayId);

    // Monte-Carlo Odds (1000 iterations)
    const odds = footballSim.simulateMatchOdds(home, away, 1000);

    // Head-to-Head (last 5 meetings)
    const h2h = db.prepare(`
        SELECT * FROM matches 
        WHERE (home_team_id = ? AND away_team_id = ?) OR (home_team_id = ? AND away_team_id = ?)
        ORDER BY played_at DESC
        LIMIT 5
    `).all(homeId, awayId, awayId, homeId);

    // Top Scorers
    const homeScorers = db.prepare(`SELECT name, goals FROM players WHERE team_id = ? ORDER BY goals DESC LIMIT 3`).all(homeId);
    const awayScorers = db.prepare(`SELECT name, goals FROM players WHERE team_id = ? ORDER BY goals DESC LIMIT 3`).all(awayId);

    // Injuries
    const homeInjuries = db.prepare(`SELECT name, position FROM players WHERE team_id = ? AND is_injured = 1`).all(homeId);
    const awayInjuries = db.prepare(`SELECT name, position FROM players WHERE team_id = ? AND is_injured = 1`).all(awayId);

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
    // Get Teams with Form Factor
    const teams = db.prepare(`
        SELECT t.*, s.points
        FROM teams t
        LEFT JOIN standings s ON t.id = s.team_id AND s.season = '2024/2025'
        WHERE t.league_id = ?
    `).all(leagueId);

    if (!teams || teams.length < 2) throw new Error("Not enough teams in league");

    // Apply form factor to each team
    const teamsWithForm = teams.map(t => ({ ...t, form: calculateFormFactor(t.id) }));

    // Create matchups (random pairing)
    const matchups = [];
    const pool = [...teamsWithForm];

    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    while (pool.length >= 2) {
        matchups.push({ home: pool.pop(), away: pool.pop() });
    }

    // Get current matchday
    const lastMatch = db.prepare(`SELECT MAX(matchday) as m FROM matches WHERE league_id = ?`).get(leagueId);
    const currentMatchday = (lastMatch?.m || 0) + 1;

    // Simulate and Update DB
    const results = [];

    const runMatchday = db.transaction(() => {
        const insertMatch = db.prepare(`
            INSERT INTO matches (league_id, home_team_id, away_team_id, home_score, away_score, matchday, played_at, status)
            VALUES (@leagueId, @homeId, @awayId, @homeScore, @awayScore, @matchday, datetime('now'), 'finished')
        `);

        const updateStanding = db.prepare(`
            UPDATE standings 
            SET played = played + 1,
                wins = wins + @wins,
                draws = draws + @draws,
                losses = losses + @losses,
                gf = gf + @gf,
                ga = ga + @ga,
                points = points + @points
            WHERE team_id = @teamId AND season = '2024/2025'
        `);

        const insertEvent = db.prepare(`
            INSERT INTO match_events (match_id, team_id, player_id, type, minute, description)
            VALUES (@matchId, @teamId, @playerId, @type, @minute, @description)
        `);

        for (const m of matchups) {
            const res = footballSim.simulateMatch(m.home, m.away);

            // Insert match
            const matchInfo = insertMatch.run({
                leagueId,
                homeId: m.home.id,
                awayId: m.away.id,
                homeScore: res.homeGoals,
                awayScore: res.awayGoals,
                matchday: currentMatchday
            });
            const matchId = matchInfo.lastInsertRowid;

            // Insert Events
            if (res.events) {
                for (const ev of res.events) {
                    insertEvent.run({
                        matchId,
                        teamId: ev.teamId,
                        playerId: null,
                        type: ev.type,
                        minute: ev.minute,
                        description: ev.description
                    });
                }
            }

            // Update standings
            updateStanding.run({
                wins: res.homeGoals > res.awayGoals ? 1 : 0,
                draws: res.homeGoals === res.awayGoals ? 1 : 0,
                losses: res.homeGoals < res.awayGoals ? 1 : 0,
                gf: res.homeGoals, ga: res.awayGoals,
                points: res.homeGoals > res.awayGoals ? 3 : (res.homeGoals === res.awayGoals ? 1 : 0),
                teamId: m.home.id
            });
            updateStanding.run({
                wins: res.awayGoals > res.homeGoals ? 1 : 0,
                draws: res.awayGoals === res.homeGoals ? 1 : 0,
                losses: res.awayGoals < res.homeGoals ? 1 : 0,
                gf: res.awayGoals, ga: res.homeGoals,
                points: res.awayGoals > res.homeGoals ? 3 : (res.awayGoals === res.homeGoals ? 1 : 0),
                teamId: m.away.id
            });

            results.push({ ...res, matchday: currentMatchday });
        }

        return results;
    });

    return runMatchday();
});

ipcMain.handle('simulate-match', (event, { homeId, awayId }) => {
    const home = db.prepare('SELECT * FROM teams WHERE id = ?').get(homeId);
    const away = db.prepare('SELECT * FROM teams WHERE id = ?').get(awayId);

    if (!home || !away) throw new Error("Teams not found");

    home.form = calculateFormFactor(homeId);
    away.form = calculateFormFactor(awayId);

    return footballSim.simulateMatch(home, away);
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

    return f1Sim.simulateRace(track, driversWithCars);
});
