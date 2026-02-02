const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/sports.db');
const db = new Database(dbPath);

console.log("=== DATABASE VERIFICATION ===\n");

// Leagues
const leagues = db.prepare('SELECT id, name, type FROM leagues').all();
console.log(`Leagues (${leagues.length}):`);
leagues.forEach(l => console.log(`  - ${l.id}: ${l.name} (${l.type})`));

// Teams per League
console.log("\nTeams per League:");
for (const l of leagues) {
    const count = db.prepare('SELECT COUNT(*) as c FROM teams WHERE league_id = ?').get(l.id);
    console.log(`  - ${l.name}: ${count.c} teams`);
}

// Total Counts
const teamCount = db.prepare('SELECT COUNT(*) as c FROM teams').get().c;
const playerCount = db.prepare('SELECT COUNT(*) as c FROM players').get().c;
const matchCount = db.prepare('SELECT COUNT(*) as c FROM matches').get().c;
const standingCount = db.prepare('SELECT COUNT(*) as c FROM standings').get().c;

console.log(`\nTotal Teams: ${teamCount}`);
console.log(`Total Players: ${playerCount}`);
console.log(`Total Matches: ${matchCount}`);
console.log(`Total Standings Rows: ${standingCount}`);

// Sample Team with Players
const sampleTeam = db.prepare('SELECT * FROM teams LIMIT 1').get();
if (sampleTeam) {
    console.log(`\nSample Team: ${sampleTeam.name}`);
    const players = db.prepare('SELECT name, position, skill FROM players WHERE team_id = ? LIMIT 5').all(sampleTeam.id);
    console.log("  Players (first 5):");
    players.forEach(p => console.log(`    - ${p.name} (${p.position}) - Skill: ${p.skill}`));
}

db.close();
console.log("\n=== VERIFICATION COMPLETE ===");
