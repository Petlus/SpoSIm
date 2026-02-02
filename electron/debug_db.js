const db = require('./db');

try {
    const leagues = db.prepare('SELECT * FROM leagues').all();
    const teamsCount = db.prepare('SELECT count(*) as c FROM teams').get();
    const f1Teams = db.prepare('SELECT count(*) as c FROM f1_teams').get();
    const drivers = db.prepare('SELECT count(*) as c FROM f1_drivers').get();

    console.log("Leagues:", JSON.stringify(leagues, null, 2));
    console.log("Teams Count:", teamsCount.c);
    console.log("F1 Teams:", f1Teams.c);
    console.log("Drivers:", drivers.c);
} catch (e) {
    console.error(e);
}
