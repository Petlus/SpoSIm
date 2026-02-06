const axios = require('axios');

const ESPN_BASE = 'http://site.api.espn.com/apis/site/v2/sports/soccer';
const ESPN_V2 = 'http://site.api.espn.com/apis/v2/sports/soccer';

// ESPN league identifiers
const ESPN_LEAGUES = {
    'eng.1': { name: 'Premier League', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', internalCode: 'PL', internalId: 2021 },
    'ger.1': { name: 'Bundesliga', icon: '🇩🇪', internalCode: 'BL1', internalId: 2002 },
    'esp.1': { name: 'La Liga', icon: '🇪🇸', internalCode: 'PD', internalId: 2014 },
    'ita.1': { name: 'Serie A', icon: '🇮🇹', internalCode: 'SA', internalId: 2019 },
    'fra.1': { name: 'Ligue 1', icon: '🇫🇷', internalCode: 'FL1', internalId: 2015 },
    'uefa.champions': { name: 'Champions League', icon: '🏆', internalCode: 'CL', internalId: 2001 },
    'uefa.europa': { name: 'Europa League', icon: '🏆', internalCode: 'EL', internalId: 2146 },
    'uefa.europa.conf': { name: 'Conference League', icon: '🏆', internalCode: 'UCL', internalId: 2154 },
    // Domestic cups (for Cup tab on league pages)
    'ger.dfb_pokal': { name: 'DFB-Pokal', icon: '🏆', internalCode: 'DFB', internalId: null, type: 'cup', country: 'Germany' },
    'eng.fa': { name: 'FA Cup', icon: '🏆', internalCode: 'FA', internalId: null, type: 'cup', country: 'England' },
    'eng.league_cup': { name: 'League Cup', icon: '🏆', internalCode: 'LC', internalId: null, type: 'cup', country: 'England' },
    'esp.copa_del_rey': { name: 'Copa del Rey', icon: '🏆', internalCode: 'CDR', internalId: null, type: 'cup', country: 'Spain' },
    'ita.coppa_italia': { name: 'Coppa Italia', icon: '🏆', internalCode: 'CI', internalId: null, type: 'cup', country: 'Italy' },
    'fra.coupe_de_france': { name: 'Coupe de France', icon: '🏆', internalCode: 'CDF', internalId: null, type: 'cup', country: 'France' },
};

// ESPN team ID -> our internal team ID mapping
const ESPN_TO_INTERNAL = {
    // === BUNDESLIGA ===
    132: 5,    // Bayern Munich
    124: 4,    // Borussia Dortmund
    11420: 721,// RB Leipzig
    131: 3,    // Bayer Leverkusen
    138: 11,   // VfL Wolfsburg
    125: 19,   // Eintracht Frankfurt
    126: 17,   // SC Freiburg
    134: 10,   // VfB Stuttgart
    137: 12,   // Werder Bremen
    268: 18,   // Borussia M'gladbach
    7911: 2,   // TSG Hoffenheim
    598: 15,   // 1. FC Union Berlin
    122: 1,    // FC Cologne
    3841: 16,  // FC Augsburg
    6418: 28,  // 1. FC Heidenheim
    270: 31,   // FC St. Pauli
    127: 32,   // Hamburg SV
    2950: 44,  // Mainz 05

    // === PREMIER LEAGUE ===
    382: 65,   // Manchester City
    364: 64,   // Liverpool
    359: 57,   // Arsenal
    360: 66,   // Manchester United
    363: 61,   // Chelsea
    367: 73,   // Tottenham
    361: 67,   // Newcastle
    362: 58,   // Aston Villa
    368: 62,   // Everton
    331: 397,  // Brighton
    371: 563,  // West Ham
    380: 76,   // Wolverhampton
    337: 402,  // Brentford
    370: 63,   // Fulham
    393: 351,  // Nottingham Forest
    349: 59,   // Bournemouth
    384: 354,  // Crystal Palace
    357: 341,  // Leeds United
    379: 328,  // Burnley
    366: 56,   // Sunderland

    // === LA LIGA ===
    86: 86,    // Real Madrid (same ID!)
    83: 81,    // Barcelona
    1068: 78,  // Atletico Madrid
    93: 77,    // Athletic Club
    89: 92,    // Real Sociedad
    102: 94,   // Villarreal
    244: 90,   // Real Betis
    243: 559,  // Sevilla
    88: 558,   // Espanyol
    2922: 82,  // Getafe
    9812: 298, // Girona
    97: 267,   // Osasuna
    85: 264,   // Celta Vigo
    101: 87,   // Rayo Vallecano
    84: 89,    // Mallorca (internal: 89 not 263)
    96: 263,   // Alaves (internal: 263)
    94: 95,    // Valencia
    3751: 285, // Elche
    92: 310,   // Real Oviedo
    1538: 280, // Levante

    // === SERIE A ===
    110: 108,  // Inter Milan
    103: 98,   // AC Milan
    111: 109,  // Juventus
    114: 113,  // Napoli
    104: 100,  // Roma
    112: 102,  // Lazio
    109: 99,   // Fiorentina
    105: 115,  // Atalanta
    239: 103,  // Torino
    107: 110,  // Bologna
    118: 470,  // Udinese
    3263: 107, // Genoa
    2572: 586, // Como
    115: 450,  // Parma
    119: 104,  // Hellas Verona
    113: 5890, // Lecce
    2925: 112, // Cagliari
    3997: 488, // Sassuolo
    4050: 452, // Cremonese
    3956: 1107,// Pisa

    // === LIGUE 1 ===
    160: 524,  // PSG
    174: 548,  // Monaco
    166: 521,  // Lille
    176: 516,  // Marseille
    167: 523,  // Lyon
    2502: 522, // Nice
    169: 529,  // Rennes
    175: 546,  // Lens
    179: 511,  // Toulouse
    180: 576,  // Strasbourg
    6997: 512, // Brest
    165: 543,  // Nantes (mapped to closest)
    7868: 528, // Angers
    6851: 5472,// Paris FC
    3236: 374, // Le Havre
    177: 510,  // Metz
    273: 527,  // Lorient
    172: 541,  // Auxerre -> Saint-Etienne slot
};

// Reverse mapping: internal ID -> ESPN ID
const INTERNAL_TO_ESPN = {};
for (const [espnId, internalId] of Object.entries(ESPN_TO_INTERNAL)) {
    INTERNAL_TO_ESPN[internalId] = parseInt(espnId, 10);
}

// Internal league code -> ESPN league code
const INTERNAL_TO_ESPN_LEAGUE = {};
for (const [espnCode, info] of Object.entries(ESPN_LEAGUES)) {
    INTERNAL_TO_ESPN_LEAGUE[info.internalCode] = espnCode;
    INTERNAL_TO_ESPN_LEAGUE[info.internalId] = espnCode;
}

class EspnService {
    constructor() {
        this.cache = new Map();
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes default
    }

    async getCached(key, fetcher, ttl) {
        const cached = this.cache.get(key);
        const effectiveTTL = ttl || this.cacheTTL;
        if (cached && Date.now() - cached.timestamp < effectiveTTL) {
            return cached.data;
        }
        const data = await fetcher();
        this.cache.set(key, { data, timestamp: Date.now() });
        return data;
    }

    // ─── NEWS ────────────────────────────────────────────
    async getNews(league) {
        return this.getCached(`news:${league}`, async () => {
            try {
                const res = await axios.get(`${ESPN_BASE}/${league}/news`, { timeout: 8000 });
                const articles = res.data?.articles || [];
                return articles.map(a => ({
                    id: a.dataSourceIdentifier || String(a.headline).slice(0, 32),
                    headline: a.headline,
                    description: a.description || '',
                    published: a.published,
                    league: league,
                    leagueName: ESPN_LEAGUES[league]?.name || league,
                    leagueIcon: ESPN_LEAGUES[league]?.icon || '⚽',
                    images: (a.images || []).map(img => ({
                        url: img.url,
                        caption: img.caption || '',
                        width: img.width,
                        height: img.height,
                    })),
                    links: a.links?.web?.href || a.links?.api?.news?.href || null,
                    type: a.type || 'HeadlineNews',
                    premium: a.premium || false,
                }));
            } catch (e) {
                console.error(`ESPN News Error (${league}):`, e.message);
                return [];
            }
        });
    }

    async getAllNews() {
        const leagues = Object.entries(ESPN_LEAGUES).filter(([, info]) => info.type !== 'cup').map(([code]) => code);
        const results = await Promise.allSettled(leagues.map(l => this.getNews(l)));
        const allArticles = [];
        for (const r of results) {
            if (r.status === 'fulfilled') allArticles.push(...r.value);
        }
        const seen = new Set();
        const unique = allArticles.filter(a => {
            if (seen.has(a.headline)) return false;
            seen.add(a.headline);
            return true;
        });
        unique.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
        return unique;
    }

    // ─── SCORES / SCOREBOARD ─────────────────────────────
    async getScores(league) {
        const cacheKey = `scores:${league}`;
        return this.getCached(cacheKey, async () => {
            try {
                const res = await axios.get(`${ESPN_BASE}/${league}/scoreboard`, { timeout: 8000 });
                const events = res.data?.events || [];
                return events.map(ev => this._mapEvent(ev, league));
            } catch (e) {
                console.error(`ESPN Scores Error (${league}):`, e.message);
                return [];
            }
        }, 30000); // 30s cache for live data
    }

    async getScoresByDate(league, date) {
        // date format: YYYYMMDD
        return this.getCached(`scores:${league}:${date}`, async () => {
            try {
                const res = await axios.get(`${ESPN_BASE}/${league}/scoreboard?dates=${date}`, { timeout: 8000 });
                const events = res.data?.events || [];
                return events.map(ev => this._mapEvent(ev, league));
            } catch (e) {
                console.error(`ESPN Scores by Date Error (${league}):`, e.message);
                return [];
            }
        });
    }

    async getAllScores() {
        const leagues = Object.entries(ESPN_LEAGUES).filter(([, info]) => info.type !== 'cup').map(([code]) => code);
        const results = await Promise.allSettled(leagues.map(l => this.getScores(l)));
        const all = [];
        for (const r of results) {
            if (r.status === 'fulfilled') all.push(...r.value);
        }
        all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return all;
    }

    _mapEvent(ev, league) {
        const comp = ev.competitions?.[0];
        const status = comp?.status;
        const home = comp?.competitors?.find(c => c.homeAway === 'home');
        const away = comp?.competitors?.find(c => c.homeAway === 'away');
        const state = status?.type?.state || 'pre';
        const round = comp?.week?.text || ev.week?.text || ev.name?.split(' - ')?.[0] || null;
        return {
            id: ev.id,
            name: ev.name,
            round,
            shortName: ev.shortName,
            date: ev.date,
            status: status?.type?.description || 'Unknown',
            statusDetail: status?.type?.detail || '',
            statusState: state,
            clock: status?.displayClock || '',
            period: status?.period || 0,
            isLive: state === 'in',
            isCompleted: status?.type?.completed || false,
            venue: comp?.venue?.fullName || null,
            venueCity: comp?.venue?.address?.city || null,
            attendance: comp?.attendance || null,
            league: league,
            leagueName: ESPN_LEAGUES[league]?.name || league,
            leagueIcon: ESPN_LEAGUES[league]?.icon || '⚽',
            home: {
                espnId: home?.team?.id || null,
                internalId: ESPN_TO_INTERNAL[parseInt(home?.team?.id)] || null,
                name: home?.team?.displayName || 'TBD',
                shortName: home?.team?.abbreviation || '???',
                logo: home?.team?.logo || null,
                score: (typeof home?.score === 'object' && home?.score != null) ? (home.score.displayValue ?? String(home.score.value ?? 0)) : (home?.score || '0'),
                winner: home?.winner || false,
                form: home?.form || '',
                record: home?.records?.[0]?.summary || '',
            },
            away: {
                espnId: away?.team?.id || null,
                internalId: ESPN_TO_INTERNAL[parseInt(away?.team?.id)] || null,
                name: away?.team?.displayName || 'TBD',
                shortName: away?.team?.abbreviation || '???',
                logo: away?.team?.logo || null,
                score: (typeof away?.score === 'object' && away?.score != null) ? (away.score.displayValue ?? String(away.score.value ?? 0)) : (away?.score || '0'),
                winner: away?.winner || false,
                form: away?.form || '',
                record: away?.records?.[0]?.summary || '',
            },
        };
    }

    // ─── STANDINGS ───────────────────────────────────────
    async getStandings(league) {
        return this.getCached(`standings:${league}`, async () => {
            try {
                const res = await axios.get(`${ESPN_V2}/${league}/standings`, { timeout: 8000 });
                const children = res.data?.children || [];
                if (children.length === 0) return [];

                const entries = children[0]?.standings?.entries || [];
                return entries.map(entry => {
                    const stats = {};
                    for (const s of (entry.stats || [])) {
                        stats[s.name] = s.value;
                        stats[s.name + '_display'] = s.displayValue;
                    }
                    return {
                        espnId: entry.team?.id || null,
                        internalId: ESPN_TO_INTERNAL[parseInt(entry.team?.id)] || null,
                        team: entry.team?.displayName || 'Unknown',
                        shortName: entry.team?.abbreviation || '???',
                        logo: entry.team?.logos?.[0]?.href || null,
                        rank: stats.rank || 0,
                        rankChange: stats.rankChange || 0,
                        played: stats.gamesPlayed || 0,
                        wins: stats.wins || 0,
                        draws: stats.ties || 0,
                        losses: stats.losses || 0,
                        goalsFor: stats.pointsFor || 0,
                        goalsAgainst: stats.pointsAgainst || 0,
                        goalDifference: stats.pointDifferential || 0,
                        goalDifference_display: stats.pointDifferential_display || '0',
                        points: stats.points || 0,
                        ppg: (stats.gamesPlayed || 0) > 0 ? (stats.points || 0) / (stats.gamesPlayed || 0) : (stats.ppg || 0),
                        deductions: stats.deductions || 0,
                        overallRecord: stats.overall_display || '',
                        note: entry.note ? {
                            color: entry.note.color,
                            description: entry.note.description,
                            rank: entry.note.rank,
                        } : null,
                        league: league,
                    };
                });
            } catch (e) {
                console.error(`ESPN Standings Error (${league}):`, e.message);
                return [];
            }
        });
    }

    // ─── TEAM SCHEDULE / FIXTURES ────────────────────────
    async getTeamSchedule(league, espnTeamId) {
        return this.getCached(`schedule:${league}:${espnTeamId}`, async () => {
            try {
                const res = await axios.get(`${ESPN_BASE}/${league}/teams/${espnTeamId}/schedule`, { timeout: 8000 });
                const team = res.data?.team || {};
                const events = res.data?.events || [];
                return {
                    team: {
                        espnId: team.id,
                        internalId: ESPN_TO_INTERNAL[parseInt(team.id)] || null,
                        name: team.displayName,
                        logo: team.logo,
                        record: team.recordSummary,
                        standing: team.standingSummary,
                    },
                    events: events.map(ev => this._mapEvent(ev, league)),
                };
            } catch (e) {
                console.error(`ESPN Schedule Error:`, e.message);
                return { team: null, events: [] };
            }
        });
    }

    // ─── MATCH SUMMARY (detailed stats, events, lineups) ─
    async getMatchSummary(league, eventId) {
        return this.getCached(`summary:${eventId}`, async () => {
            try {
                const res = await axios.get(`${ESPN_BASE}/${league}/summary?event=${eventId}`, { timeout: 10000 });
                const d = res.data;

                // Parse boxscore
                const boxscore = (d.boxscore?.teams || []).map(t => ({
                    espnId: t.team?.id,
                    internalId: ESPN_TO_INTERNAL[parseInt(t.team?.id)] || null,
                    name: t.team?.displayName,
                    shortName: t.team?.abbreviation,
                    logo: t.team?.logo,
                    color: t.team?.color,
                    stats: (t.statistics || []).reduce((acc, s) => {
                        acc[s.name] = s.displayValue;
                        return acc;
                    }, {}),
                }));

                // Parse key events (goals, cards, subs)
                const keyEvents = (d.keyEvents || []).map(ev => ({
                    id: ev.id,
                    type: ev.type?.type || ev.type?.text || 'unknown',
                    typeName: ev.type?.text || '',
                    text: ev.text || '',
                    shortText: ev.shortText || '',
                    minute: ev.clock?.displayValue || '',
                    period: ev.period?.number || 0,
                    isGoal: ev.scoringPlay || false,
                    team: ev.team ? {
                        id: ev.team.id,
                        name: ev.team.displayName,
                    } : null,
                    player: ev.participants?.[0]?.athlete?.displayName || null,
                }));

                // Parse rosters / lineups
                const rosters = (d.rosters || []).map(r => ({
                    espnId: r.team?.id,
                    name: r.team?.displayName,
                    logo: r.team?.logo,
                    players: (r.roster || []).map(p => ({
                        id: p.athlete?.id,
                        name: p.athlete?.displayName,
                        position: p.position?.name || p.position?.displayName || '',
                        jersey: p.jersey || '',
                        starter: p.starter || false,
                        subbedIn: p.subbedIn || false,
                        subbedOut: p.subbedOut || false,
                        stats: p.stats || [],
                    })),
                }));

                // Game info
                const gameInfo = d.gameInfo || {};

                // Odds
                const odds = (d.odds || []).map(o => ({
                    provider: o.provider?.name,
                    details: o.details,
                    overUnder: o.overUnder,
                    spread: o.spread,
                    homeMoneyLine: o.homeTeamOdds?.moneyLine,
                    awayMoneyLine: o.awayTeamOdds?.moneyLine,
                }));

                // Head to head
                const h2h = (d.headToHeadGames || []).map(g => ({
                    id: g.id,
                    date: g.date,
                    name: g.name,
                    score: g.score,
                }));

                // Commentary
                const commentary = (d.commentary || []).map(c => ({
                    text: c.text,
                    time: c.time?.displayValue || '',
                    period: c.period || 0,
                }));

                return {
                    boxscore,
                    keyEvents,
                    rosters,
                    odds,
                    h2h,
                    commentary,
                    venue: gameInfo.venue?.fullName || null,
                    attendance: gameInfo.attendance || null,
                };
            } catch (e) {
                console.error(`ESPN Match Summary Error (${eventId}):`, e.message);
                return null;
            }
        }, 60000); // 1 min cache for match details
    }

    // ─── TEAMS ───────────────────────────────────────────
    async getTeams(league) {
        return this.getCached(`teams:${league}`, async () => {
            try {
                const res = await axios.get(`${ESPN_BASE}/${league}/teams`, { timeout: 8000 });
                const teams = res.data?.sports?.[0]?.leagues?.[0]?.teams || [];
                return teams.map(t => ({
                    espnId: t.team?.id,
                    internalId: ESPN_TO_INTERNAL[parseInt(t.team?.id)] || null,
                    name: t.team?.displayName,
                    shortName: t.team?.abbreviation,
                    logo: t.team?.logos?.[0]?.href || null,
                    color: t.team?.color || null,
                    alternateColor: t.team?.alternateColor || null,
                    league: league,
                }));
            } catch (e) {
                console.error(`ESPN Teams Error (${league}):`, e.message);
                return [];
            }
        });
    }

    // ─── TEAM ROSTER (with season stats) ───────────────
    async getTeamRoster(league, espnTeamId) {
        return this.getCached(`roster:${league}:${espnTeamId}`, async () => {
            try {
                const res = await axios.get(`${ESPN_BASE}/${league}/teams/${espnTeamId}/roster`, { timeout: 10000 });
                const athletes = res.data?.athletes || [];

                const mapPosition = (pos) => {
                    const name = (pos?.name || pos?.displayName || '').toLowerCase();
                    if (name.includes('goalkeeper')) return 'GK';
                    if (name.includes('defender')) return 'DEF';
                    if (name.includes('midfielder')) return 'MID';
                    if (name.includes('forward') || name.includes('striker')) return 'FWD';
                    return 'SUB';
                };

                const extractStat = (categories, catName, statName) => {
                    const cat = (categories || []).find(c => c.abbreviation === catName || c.name === catName);
                    if (!cat) return 0;
                    const stat = (cat.stats || []).find(s => s.name === statName);
                    return stat?.value || 0;
                };

                return athletes.map(a => {
                    const cats = a.statistics?.splits?.categories || [];
                    return {
                        espnId: a.id,
                        name: a.displayName || a.fullName,
                        firstName: a.firstName || '',
                        lastName: a.lastName || '',
                        age: a.age || null,
                        jersey: a.jersey || null,
                        position: mapPosition(a.position),
                        positionName: a.position?.displayName || '',
                        citizenship: a.citizenship || '',
                        headshot: a.headshot?.href || null,
                        injured: (a.injuries || []).length > 0,
                        // Season stats
                        appearances: extractStat(cats, 'gen', 'appearances'),
                        subIns: extractStat(cats, 'gen', 'subIns'),
                        goals: extractStat(cats, 'off', 'totalGoals'),
                        assists: extractStat(cats, 'off', 'goalAssists'),
                        shots: extractStat(cats, 'off', 'totalShots'),
                        shotsOnTarget: extractStat(cats, 'off', 'shotsOnTarget'),
                        yellowCards: extractStat(cats, 'gen', 'yellowCards'),
                        redCards: extractStat(cats, 'gen', 'redCards'),
                        foulsCommitted: extractStat(cats, 'gen', 'foulsCommitted'),
                        // GK stats
                        saves: extractStat(cats, 'gk', 'saves'),
                        goalsConceded: extractStat(cats, 'gk', 'goalsConceded'),
                    };
                });
            } catch (e) {
                console.error(`ESPN Roster Error (${league}/${espnTeamId}):`, e.message);
                return [];
            }
        }, 300000); // 5 min cache
    }

    // ─── UTILITY ─────────────────────────────────────────
    getLeagues() {
        return Object.entries(ESPN_LEAGUES).map(([code, info]) => ({
            code,
            ...info,
        }));
    }

    getEspnLeagueCode(internalCodeOrId) {
        return INTERNAL_TO_ESPN_LEAGUE[internalCodeOrId] || null;
    }

    getEspnTeamId(internalId) {
        return INTERNAL_TO_ESPN[internalId] || null;
    }

    getInternalTeamId(espnId) {
        return ESPN_TO_INTERNAL[parseInt(espnId)] || null;
    }

    getCupLeagueByCountry(country) {
        const cup = Object.entries(ESPN_LEAGUES).find(([, info]) => info.type === 'cup' && info.country === country);
        return cup ? cup[0] : null;
    }

    getCupNameByCountry(country) {
        const cup = Object.entries(ESPN_LEAGUES).find(([, info]) => info.type === 'cup' && info.country === country);
        return cup ? ESPN_LEAGUES[cup[0]].name : null;
    }
}

module.exports = new EspnService();
