// Serie A - All Teams
// Season 2025/26

const inter = require('./inter');
const juventus = require('./juventus');
const milan = require('./milan');
const napoli = require('./napoli');
const atalanta = require('./atalanta');
const roma = require('./roma');
const lazio = require('./lazio');
const fiorentina = require('./fiorentina');
const bologna = require('./bologna');
const torino = require('./torino');
const udinese = require('./udinese');
const genoa = require('./genoa');
const como = require('./como');
const parma = require('./parma');
const verona = require('./verona');
const lecce = require('./lecce');
const cagliari = require('./cagliari');
const sassuolo = require('./sassuolo');
const cremonese = require('./cremonese');
const pisa = require('./pisa');

const teams = [
    inter, juventus, milan, napoli, atalanta, roma, lazio, fiorentina,
    bologna, torino, udinese, genoa, como, parma, verona, lecce,
    cagliari, sassuolo, cremonese, pisa
];

const teamsByName = {};
teams.forEach(t => { teamsByName[t.name] = t; });

module.exports = {
    leagueId: 'SA',
    leagueName: 'Serie A',
    country: 'Italy',
    teams,
    teamsByName,
    getTeam: (name) => teamsByName[name] || null
};
