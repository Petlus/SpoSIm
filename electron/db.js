const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'sports.db');

let db = null;
let SQL = null;

// Define Enhanced Schema
const schema = `
    -- BASIS & WETTBEWERBE
    CREATE TABLE IF NOT EXISTS leagues (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'league', -- 'league', 'tournament'
        country TEXT,
        current_season TEXT,
        sport TEXT DEFAULT 'football'
    );

    CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        short_name TEXT,
        league_id INTEGER,
        att INTEGER,
        def INTEGER,
        mid INTEGER,
        prestige INTEGER DEFAULT 50,
        budget INTEGER DEFAULT 10000000,
        logo TEXT,
        is_user_controlled BOOLEAN DEFAULT 0,
        FOREIGN KEY(league_id) REFERENCES leagues(id)
    );

    CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER,
        name TEXT NOT NULL,
        position TEXT, -- GK, DEF, MID, FWD
        age INTEGER,
        rating INTEGER DEFAULT 70,
        number INTEGER,
        photo TEXT,
        fitness INTEGER DEFAULT 100,
        is_injured BOOLEAN DEFAULT 0,
        form REAL DEFAULT 6.0,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        yellow_cards INTEGER DEFAULT 0,
        red_cards INTEGER DEFAULT 0,
        suspended_until INTEGER, -- Matchday ID
        FOREIGN KEY(team_id) REFERENCES teams(id)
    );

    -- SPIELBETRIEB & ERGEBNISSE
    CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        league_id INTEGER,
        home_team_id INTEGER,
        away_team_id INTEGER,
        home_score INTEGER,
        away_score INTEGER,
        penalty_home_score INTEGER,
        penalty_away_score INTEGER,
        matchday INTEGER,
        stage_id INTEGER, 
        status TEXT DEFAULT 'scheduled', 
        weather TEXT,
        attendance INTEGER,
        played_at DATETIME,
        FOREIGN KEY(league_id) REFERENCES leagues(id)
    );

    CREATE TABLE IF NOT EXISTS match_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER,
        team_id INTEGER,
        player_id INTEGER,
        type TEXT, -- 'goal', 'card_yellow', 'card_red', 'injury', 'sub'
        minute INTEGER,
        description TEXT,
        FOREIGN KEY(match_id) REFERENCES matches(id)
    );

    CREATE TABLE IF NOT EXISTS standings (
        league_id INTEGER,
        team_id INTEGER,
        season TEXT,
        group_name TEXT, 
        played INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        draws INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        gf INTEGER DEFAULT 0,
        ga INTEGER DEFAULT 0,
        points INTEGER DEFAULT 0,
        PRIMARY KEY (league_id, team_id, season, group_name),
        FOREIGN KEY(team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS season_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        league_id INTEGER,
        season TEXT,
        champion_team_id INTEGER,
        top_scorer_player_id INTEGER
    );

    -- F1 SPEZIFISCH
    CREATE TABLE IF NOT EXISTS f1_teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        perf INTEGER,
        reliability REAL,
        budget INTEGER
    );

    CREATE TABLE IF NOT EXISTS f1_drivers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        team_id TEXT,
        skill INTEGER,
        points INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        podiums INTEGER DEFAULT 0,
        FOREIGN KEY(team_id) REFERENCES f1_teams(id)
    );

    CREATE TABLE IF NOT EXISTS f1_circuits (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        country TEXT,
        type TEXT, -- 'high_speed', 'street', 'balanced'
        difficulty INTEGER
    );

    CREATE TABLE IF NOT EXISTS f1_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        race_id TEXT, 
        driver_id TEXT,
        position INTEGER,
        points INTEGER,
        fastest_lap BOOLEAN,
        FOREIGN KEY(driver_id) REFERENCES f1_drivers(id)
    );

    -- TURNIERE
    CREATE TABLE IF NOT EXISTS tournament_stages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER,
        name TEXT, 
        type TEXT, 
        is_two_legged BOOLEAN DEFAULT 0,
        has_away_goals_rule BOOLEAN DEFAULT 0,
        FOREIGN KEY(tournament_id) REFERENCES leagues(id)
    );

    CREATE TABLE IF NOT EXISTS tournament_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stage_id INTEGER,
        name TEXT, 
        FOREIGN KEY(stage_id) REFERENCES tournament_stages(id)
    );

    CREATE TABLE IF NOT EXISTS national_teams (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        ranking INTEGER,
        att INTEGER, 
        def INTEGER,
        mid INTEGER
    );

    -- MANAGER & FINANZ
    CREATE TABLE IF NOT EXISTS user_manager (
        id INTEGER PRIMARY KEY,
        name TEXT,
        team_id INTEGER,
        reputation INTEGER DEFAULT 0,
        career_start_date DATETIME,
        FOREIGN KEY(team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS finances (
        team_id INTEGER PRIMARY KEY,
        balance INTEGER DEFAULT 50000000,
        weekly_wages INTEGER DEFAULT 0,
        transfer_budget INTEGER DEFAULT 20000000,
        FOREIGN KEY(team_id) REFERENCES teams(id)
    );
`;

// Initialize database (async)
async function initDb() {
    if (db) return db;

    SQL = await initSqlJs();

    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
        console.log('Loaded existing database from', dbPath);
    } else {
        db = new SQL.Database();
        console.log('Created new database');
    }

    // Run schema
    db.run(schema);
    saveDb();

    return db;
}

// Save database to disk
function saveDb() {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
}

let inTransaction = false;

// Wrapper to mimic better-sqlite3 API
function prepare(sql) {
    return {
        run: (...params) => {
            db.run(sql, params);
            if (!inTransaction) {
                saveDb();
            }
            let lastInsertRowid = 0;
            try {
                const res = db.exec("SELECT last_insert_rowid()");
                if (res.length > 0 && res[0].values.length > 0) {
                    lastInsertRowid = res[0].values[0][0];
                }
            } catch (e) { }
            return { changes: db.getRowsModified(), lastInsertRowid };
        },
        get: (...params) => {
            const stmt = db.prepare(sql);
            stmt.bind(params);
            if (stmt.step()) {
                const row = stmt.getAsObject();
                stmt.free();
                return row;
            }
            stmt.free();
            return undefined;
        },
        all: (...params) => {
            const results = [];
            const stmt = db.prepare(sql);
            stmt.bind(params);
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            stmt.free();
            return results;
        }
    };
}

// Transaction wrapper
function transaction(fn) {
    return (...args) => {
        if (inTransaction) {
            // Nested transactions are not fully supported in this simple wrapper, 
            // but we can just execute the function since we are already in a transaction.
            // We won't commit/rollback here, relying on the outer transaction.
            return fn(...args);
        }

        inTransaction = true;
        try {
            db.run('BEGIN TRANSACTION');
            const result = fn(...args);
            db.run('COMMIT');
            inTransaction = false;
            saveDb();
            return result;
        } catch (e) {
            try {
                db.run('ROLLBACK');
            } catch (rollbackErr) {
                // Ignore rollback error if transaction was already aborted
                console.warn('Rollback failed (transaction might be already closed):', rollbackErr.message);
            }
            inTransaction = false;
            throw e;
        }
    };
}

// Execute raw SQL
function exec(sql) {
    db.run(sql);
    saveDb();
}

// Export wrapper object that mimics better-sqlite3
module.exports = {
    initDb,
    saveDb,
    prepare: (sql) => prepare(sql),
    transaction: (fn) => transaction(fn),
    exec: (sql) => exec(sql),
    getDb: () => db
};
