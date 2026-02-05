// Ligue 1 - All Teams
// Season 2025/26

const psg = require('./psg');
const marseille = require('./marseille');
const lyon = require('./lyon');
const lille = require('./lille');
const monaco = require('./monaco');
const nice = require('./nice');
const rennes = require('./rennes');
const lens = require('./lens');
const strasbourg = require('./strasbourg');
const toulouse = require('./toulouse');
const lorient = require('./lorient');
const brest = require('./brest');
const reims = require('./reims');
const angers = require('./angers');
const parisFc = require('./paris_fc');
const leHavre = require('./le_havre');
const saintEtienne = require('./saint_etienne');
const metz = require('./metz');

const teams = [
    psg, marseille, lyon, lille, monaco, nice, rennes, lens,
    strasbourg, toulouse, lorient, brest, reims, angers,
    parisFc, leHavre, saintEtienne, metz
];

const teamsByName = {};
teams.forEach(t => { teamsByName[t.name] = t; });

module.exports = {
    leagueId: 'FL1',
    leagueName: 'Ligue 1',
    country: 'France',
    teams,
    teamsByName,
    getTeam: (name) => teamsByName[name] || null
};
