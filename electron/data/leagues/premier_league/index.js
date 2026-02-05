// Premier League - All Teams
// Season 2025/26

const manchesterCity = require('./manchester_city');
const arsenal = require('./arsenal');
const liverpool = require('./liverpool');
const chelsea = require('./chelsea');
const manchesterUnited = require('./manchester_united');
const tottenham = require('./tottenham');
const newcastle = require('./newcastle');
const astonVilla = require('./aston_villa');
const leeds = require('./leeds');
const burnley = require('./burnley');
const sunderland = require('./sunderland');
const everton = require('./everton');
const crystalPalace = require('./crystal_palace');
const brighton = require('./brighton');
const westHam = require('./west_ham');
const wolves = require('./wolves');
const brentford = require('./brentford');
const fulham = require('./fulham');
const nottinghamForest = require('./nottingham_forest');
const bournemouth = require('./bournemouth');

const teams = [
    manchesterCity, arsenal, liverpool, chelsea, manchesterUnited,
    tottenham, newcastle, astonVilla, leeds, burnley, sunderland,
    everton, crystalPalace, brighton, westHam, wolves, brentford,
    fulham, nottinghamForest, bournemouth
];

const teamsByName = {};
const aliases = {
    "Manchester United": manchesterUnited,
    "Manchester City": manchesterCity
};
teams.forEach(t => { teamsByName[t.name] = t; });
Object.entries(aliases).forEach(([alias, team]) => { teamsByName[alias] = team; });

module.exports = {
    leagueId: 'PL',
    leagueName: 'Premier League',
    country: 'England',
    teams,
    teamsByName,
    getTeam: (name) => teamsByName[name] || null
};
