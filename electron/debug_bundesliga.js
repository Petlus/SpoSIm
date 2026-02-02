const db = require('./db');

try {
    const bundesliga = db.prepare('SELECT * FROM leagues WHERE id = 78').get();
    if (!bundesliga) {
        console.log("Bundesliga not found in leagues table!");
    } else {
        console.log("League:", bundesliga);
        const teams = db.prepare('SELECT name, points, played FROM teams WHERE league_id = 78 ORDER BY points DESC').all();
        console.log("Bundesliga Teams:", teams.length);
        console.log(JSON.stringify(teams, null, 2));
    }
} catch (e) {
    console.error(e);
}
