// Conference League - All Teams
// Season 2025/26 (36 teams - League Phase)

const aekAthens = require('./aek_athens');
const antwerp = require('./antwerp');
const brighton = require('./brighton');
const brondby = require('./brondby');
const famalicao = require('./famalicao');
const fcsb = require('./fcsb');
const fiorentina = require('./fiorentina');
const gent = require('./gent');
const goAheadEagles = require('./go_ahead_eagles');
const hjkHelsinki = require('./hjk_helsinki');
const maccabiTelAviv = require('./maccabi_tel_aviv');
const metz = require('./metz');
const molde = require('./molde');
const realSociedad = require('./real_sociedad');
const rennes = require('./rennes');
const shakhtar = require('./shakhtar');
const strasbourg = require('./strasbourg');
const torino = require('./torino');
const unionBerlin = require('./union_berlin');
const utrecht = require('./utrecht');
const vitoriaSc = require('./vitoria_sc');
const westHam = require('./west_ham');
const wolfsburg = require('./wolfsburg');

const teams = [
    aekAthens, antwerp, brighton, brondby, famalicao, fcsb, fiorentina,
    gent, goAheadEagles, hjkHelsinki, maccabiTelAviv, metz, molde,
    realSociedad, rennes, shakhtar, strasbourg, torino, unionBerlin,
    utrecht, vitoriaSc, westHam, wolfsburg
];

const teamsByName = {};
teams.forEach(t => { teamsByName[t.name] = t; });

module.exports = {
    leagueId: 'ECL',
    leagueName: 'Conference League',
    country: 'Europe',
    teams,
    teamsByName,
    getTeam: (name) => teamsByName[name] || null
};
