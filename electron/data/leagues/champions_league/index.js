// Champions League - All Teams
// Season 2025/26 (36 teams - League Phase)

const arsenal = require('./arsenal');
const atalanta = require('./atalanta');
const athletic = require('./athletic');
const atletico = require('./atletico');
const barcelona = require('./barcelona');
const bayern = require('./bayern');
const benfica = require('./benfica');
const bodoeGlimt = require('./bodoe_glimt');
const clubBrugge = require('./club_brugge');
const chelsea = require('./chelsea');
const dortmund = require('./dortmund');
const frankfurt = require('./frankfurt');
const galatasaray = require('./galatasaray');
const inter = require('./inter');
const juventus = require('./juventus');
const kairat = require('./kairat');
const kopenhagen = require('./kopenhagen');
const leverkusen = require('./leverkusen');
const liverpool = require('./liverpool');
const manchesterCity = require('./manchester_city');
const marseille = require('./marseille');
const monaco = require('./monaco');
const napoli = require('./napoli');
const newcastle = require('./newcastle');
const olympiacos = require('./olympiacos');
const pafos = require('./pafos');
const psg = require('./psg');
const psv = require('./psv');
const qarabag = require('./qarabag');
const realMadrid = require('./real_madrid');
const slaviaPrague = require('./slavia_prague');
const sporting = require('./sporting');
const tottenham = require('./tottenham');
const unionStGilloise = require('./union_st_gilloise');
const villarreal = require('./villarreal');

const teams = [
    arsenal, atalanta, athletic, atletico, barcelona, bayern, benfica,
    bodoeGlimt, clubBrugge, chelsea, dortmund, frankfurt, galatasaray,
    inter, juventus, kairat, kopenhagen, leverkusen, liverpool,
    manchesterCity, marseille, monaco, napoli, newcastle, olympiacos,
    pafos, psg, psv, qarabag, realMadrid, slaviaPrague, sporting,
    tottenham, unionStGilloise, villarreal
];

const teamsByName = {};
teams.forEach(t => { teamsByName[t.name] = t; });

module.exports = {
    leagueId: 'CL',
    leagueName: 'Champions League',
    country: 'Europe',
    teams,
    teamsByName,
    getTeam: (name) => teamsByName[name] || null
};
