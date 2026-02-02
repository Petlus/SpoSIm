const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'sports.db');
const db = new Database(dbPath);

// Enable WAL for concurrency
db.pragma('journal_mode = WAL');

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
        skill INTEGER,
        fitness INTEGER DEFAULT 100,
        is_injured BOOLEAN DEFAULT 0,
        form REAL DEFAULT 6.0,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
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
        matchday INTEGER,
        stage_id INTEGER, -- Link to tournament_stages
        status TEXT DEFAULT 'scheduled', 
        weather TEXT,
        attendance INTEGER,
        played_at DATETIME,
        FOREIGN KEY(league_id) REFERENCES leagues(id)
    );

    CREATE TABLE IF NOT EXISTS standings (
        league_id INTEGER,
        team_id INTEGER,
        season TEXT,
        group_name TEXT, -- 'Group A', 'Group B' etc.
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
        race_id TEXT, -- e.g. '2026_bahrain'
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
        name TEXT, -- 'Group Stage', 'Round of 16'
        type TEXT, -- 'group', 'knockout'
        is_two_legged BOOLEAN DEFAULT 0,
        has_away_goals_rule BOOLEAN DEFAULT 0,
        FOREIGN KEY(tournament_id) REFERENCES leagues(id)
    );

    CREATE TABLE IF NOT EXISTS tournament_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stage_id INTEGER,
        name TEXT, -- 'Group A'
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
`;

db.exec(schema);

module.exports = db;
