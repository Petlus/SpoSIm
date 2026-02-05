// Bundesliga - All Teams
// Season 2025/26

const bayern = require('./bayern');
const dortmund = require('./dortmund');
const leverkusen = require('./leverkusen');
const leipzig = require('./leipzig');
const stuttgart = require('./stuttgart');
const frankfurt = require('./frankfurt');
const wolfsburg = require('./wolfsburg');
const gladbach = require('./gladbach');
const freiburg = require('./freiburg');
const hoffenheim = require('./hoffenheim');
const union = require('./union');
const mainz = require('./mainz');
const augsburg = require('./augsburg');
const bremen = require('./bremen');
const heidenheim = require('./heidenheim');
const stpauli = require('./stpauli');
const koeln = require('./koeln');
const hamburg = require('./hamburg');

const teams = [
    bayern,
    dortmund,
    hoffenheim,
    stuttgart,
    leipzig,
    leverkusen,
    freiburg,
    frankfurt,
    union,
    koeln,
    augsburg,
    gladbach,
    hamburg,
    wolfsburg,
    bremen,
    mainz,
    stpauli,
    heidenheim
];

// Create lookup map by team name (including aliases for DB compatibility)
const teamsByName = {};
const aliases = {
    // DB Name -> Our Data Key
    "Bayern München": bayern,
    "Werder Bremen": bremen,
    "Borussia M'gladbach": gladbach,
    "Bor. Mönchengladbach": gladbach,
    "1. FC Heidenheim": heidenheim
};

teams.forEach(t => {
    teamsByName[t.name] = t;
});

// Add aliases
Object.entries(aliases).forEach(([alias, team]) => {
    teamsByName[alias] = team;
});

module.exports = {
    leagueId: 'BL1',
    leagueName: 'Bundesliga',
    country: 'Germany',
    teams,
    teamsByName,
    getTeam: (name) => teamsByName[name] || null
};
