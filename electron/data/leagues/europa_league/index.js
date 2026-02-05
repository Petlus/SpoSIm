// Europa League - All Teams
// Season 2025/26 (36 teams - League Phase)

const astonVilla = require('./aston_villa');
const basel = require('./basel');
const bologna = require('./bologna');
const braga = require('./braga');
const brann = require('./brann');
const celtic = require('./celtic');
const celta = require('./celta');
const crvenaZvezda = require('./crvena_zvezda');
const dinamoZagreb = require('./dinamo_zagreb');
const fenerbahce = require('./fenerbahce');
const ferencvaros = require('./ferencvaros');
const feyenoord = require('./feyenoord');
const fcsb = require('./fcsb');
const freiburg = require('./freiburg');
const genk = require('./genk');
const goAheadEagles = require('./go_ahead_eagles');
const lille = require('./lille');
const ludogorets = require('./ludogorets');
const lyon = require('./lyon');
const maccabiTelAviv = require('./maccabi_tel_aviv');
const malmo = require('./malmo');
const midtjylland = require('./midtjylland');
const nice = require('./nice');
const nottinghamForest = require('./nottingham_forest');
const panathinaikos = require('./panathinaikos');
const paok = require('./paok');
const plzen = require('./plzen');
const porto = require('./porto');
const rangers = require('./rangers');
const realBetis = require('./real_betis');
const roma = require('./roma');
const salzburg = require('./salzburg');
const sturmGraz = require('./sturm_graz');
const stuttgart = require('./stuttgart');
const utrecht = require('./utrecht');
const youngBoys = require('./young_boys');

const teams = [
    astonVilla, basel, bologna, braga, brann, celtic, celta,
    crvenaZvezda, dinamoZagreb, fenerbahce, ferencvaros, feyenoord,
    fcsb, freiburg, genk, goAheadEagles, lille, ludogorets, lyon,
    maccabiTelAviv, malmo, midtjylland, nice, nottinghamForest,
    panathinaikos, paok, plzen, porto, rangers, realBetis, roma,
    salzburg, sturmGraz, stuttgart, utrecht, youngBoys
];

const teamsByName = {};
teams.forEach(t => { teamsByName[t.name] = t; });

module.exports = {
    leagueId: 'EL',
    leagueName: 'Europa League',
    country: 'Europe',
    teams,
    teamsByName,
    getTeam: (name) => teamsByName[name] || null
};
