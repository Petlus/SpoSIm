// La Liga - All Teams
// Season 2025/26

const realMadrid = require('./real_madrid');
const barcelona = require('./barcelona');
const atletico = require('./atletico');
const villarreal = require('./villarreal');
const sevilla = require('./sevilla');
const realSociedad = require('./real_sociedad');
const realBetis = require('./real_betis');
const espanyol = require('./espanyol');
const athletic = require('./athletic');
const getafe = require('./getafe');
const alaves = require('./alaves');
const elche = require('./elche');
const rayo = require('./rayo');
const celta = require('./celta');
const mallorca = require('./mallorca');
const osasuna = require('./osasuna');
const valencia = require('./valencia');
const girona = require('./girona');
const oviedo = require('./oviedo');
const levante = require('./levante');

const teams = [
    realMadrid, barcelona, atletico, villarreal, sevilla, realSociedad,
    realBetis, espanyol, athletic, getafe, alaves, elche, rayo, celta,
    mallorca, osasuna, valencia, girona, oviedo, levante
];

const teamsByName = {};
teams.forEach(t => { teamsByName[t.name] = t; });

module.exports = {
    leagueId: 'PD',
    leagueName: 'La Liga',
    country: 'Spain',
    teams,
    teamsByName,
    getTeam: (name) => teamsByName[name] || null
};
