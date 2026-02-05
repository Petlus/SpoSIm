require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { LEAGUE_PRESTIGE, LEAGUE_BASE_ELO, TOP_TEAMS_MARKET_VALUE, PLAYER_RATING_MAP, PLAYER_FORM_BONUS } = require('./data_constants');
const { getSquad, kickerToRating } = require('./data/leagues');
const { CURRENT_SEASON_STR, CURRENT_SEASON_YEAR, API_MIN_INTERVAL_MS } = require('../config/season');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY || '';
const FOOTBALL_BASE_URL = "https://api.football-data.org/v4";

// API-Football.com for supplementary player data
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || '';
const API_FOOTBALL_URL = "https://v3.football.api-sports.io";

const F1_BASE_URL = "http://api.jolpi.ca/ergast/f1";

/** Derive rating from market value (deterministic). €1M ~65, €100M ~81, €150M+ ~88 */
function marketValueToRating(marketValue) {
    if (!marketValue || marketValue <= 0) return 65;
    const logVal = Math.log10(Math.max(marketValue, 100000));
    const rating = 65 + Math.round((logVal - 6) * 8);
    return Math.max(50, Math.min(95, rating));
}

/** 
 * Calculate player rating from multiple sources:
 * 1. Manual PLAYER_RATING_MAP (highest priority for known stars)
 * 2. API top-player data (goals/assists boost)
 * 3. Market value formula (fallback)
 * Plus form bonus.
 */
function getPlayerRating(playerName, marketValue, topPlayersData = {}) {
    // 1. Check manual map first (overrides everything)
    if (PLAYER_RATING_MAP[playerName]) {
        const base = PLAYER_RATING_MAP[playerName];
        const formBonus = PLAYER_FORM_BONUS[playerName] ?? 0;
        return Math.max(50, Math.min(95, base + formBonus));
    }

    // 2. Check if player is in top scorers/assists data
    const topData = topPlayersData[playerName];
    if (topData) {
        // Convert API rating (6.0-9.0 scale) to our scale (65-95)
        // API 7.0 = 75, API 8.0 = 85, API 9.0 = 95
        let rating = 65 + (topData.rating - 6.0) * 10;
        
        // Bonus for goals/assists production
        const goalBonus = Math.min(5, Math.floor(topData.goals / 5)); // +1 per 5 goals, max +5
        const assistBonus = Math.min(3, Math.floor(topData.assists / 4)); // +1 per 4 assists, max +3
        rating += goalBonus + assistBonus;
        
        return Math.max(70, Math.min(95, Math.round(rating)));
    }

    // 3. Fallback to market value formula
    const base = marketValueToRating(marketValue);
    const formBonus = PLAYER_FORM_BONUS[playerName] ?? 0;
    return Math.max(50, Math.min(95, base + formBonus));
}

// Mapping football-data.org team IDs to api-football.com team IDs (25/26 season)
const TEAM_ID_MAP = {
    // ===== BUNDESLIGA =====
    5: 157,    // Bayern München
    4: 165,    // Borussia Dortmund
    721: 173,  // RB Leipzig
    3: 168,    // Bayer Leverkusen
    11: 163,   // VfL Wolfsburg
    19: 169,   // Eintracht Frankfurt
    17: 172,   // SC Freiburg
    10: 160,   // VfB Stuttgart
    12: 162,   // Werder Bremen
    18: 167,   // Borussia M'gladbach
    2: 159,    // TSG Hoffenheim
    15: 170,   // 1. FC Union Berlin
    1: 180,    // 1. FC Köln
    16: 164,   // FC Augsburg
    28: 181,   // Heidenheim
    31: 80,    // FC St. Pauli
    32: 81,    // Hamburger SV
    36: 182,   // VfL Bochum
    44: 174,   // FSV Mainz 05
    55: 188,   // Darmstadt 98

    // ===== PREMIER LEAGUE =====
    65: 50,    // Manchester City
    64: 40,    // Liverpool
    57: 42,    // Arsenal
    66: 33,    // Manchester United
    61: 49,    // Chelsea
    73: 47,    // Tottenham
    67: 34,    // Newcastle
    58: 66,    // Aston Villa
    62: 45,    // Everton
    397: 51,   // Brighton & Hove Albion
    563: 48,   // West Ham United
    76: 39,    // Wolverhampton Wanderers
    402: 55,   // Brentford FC
    63: 46,    // Fulham FC
    351: 65,   // Nottingham Forest
    59: 35,    // Bournemouth
    354: 52,   // Crystal Palace
    341: 63,   // Leeds United
    328: 44,   // Burnley FC
    56: 71,    // Sunderland AFC

    // ===== LA LIGA =====
    86: 541,   // Real Madrid
    81: 529,   // Barcelona
    78: 530,   // Atletico Madrid
    77: 531,   // Athletic Club
    95: 532,   // Real Sociedad
    94: 534,   // Villarreal CF
    90: 548,   // Real Betis
    559: 536,  // Sevilla
    558: 715,  // Espanyol Barcelona
    82: 548,   // Getafe CF
    92: 543,   // Real Valladolid
    298: 538,  // Girona
    267: 728,  // Osasuna
    264: 540,  // Celta Vigo
    87: 537,   // Rayo Vallecano
    275: 537,  // Rayo (alias)
    263: 798,  // Mallorca
    277: 542,  // Alaves
    250: 539,  // Cadiz
    285: 545,  // Granada

    // ===== SERIE A =====
    108: 505,  // Inter Milan
    98: 489,   // AC Milan
    109: 496,  // Juventus
    113: 492,  // Napoli
    100: 500,  // Roma
    102: 487,  // Lazio
    99: 499,   // Fiorentina
    115: 502,  // Atalanta
    103: 498,  // Torino
    110: 504,  // Bologna
    471: 511,  // Monza
    470: 503,  // Udinese
    107: 488,  // Sassuolo
    1103: 867, // Lecce
    104: 514,  // Verona
    445: 497,  // Cagliari
    454: 512,  // Frosinone
    448: 515,  // Empoli
    450: 520,  // Salernitana
    477: 867,  // Genoa

    // ===== LIGUE 1 =====
    524: 85,   // PSG
    548: 91,   // Monaco
    522: 79,   // Lille
    518: 81,   // Marseille
    516: 80,   // Lyon
    529: 93,   // Nice
    528: 94,   // Rennes
    527: 96,   // Lens
    523: 99,   // Toulouse
    532: 82,   // Montpellier
    521: 95,   // Strasbourg
    546: 97,   // Brest
    543: 106,  // Nantes
    547: 1063, // Clermont
    525: 84,   // Reims
    533: 116,  // Le Havre
    537: 98,   // Metz
    526: 83,   // Lorient
};

const { CURRENT_SEASON, LEAGUES, TEAMS } = require('./constants');

async function fetchFootballData() {
    console.log(`Using Hardcoded Data for Season ${CURRENT_SEASON}/2026...`);

    // Group teams by league for return format compatibility
    const leagueMap = {};

    // Initialize Leagues from Constants
    for (const [code, info] of Object.entries(LEAGUES)) {
        leagueMap[info.id] = {
            id: info.id,
            name: info.name,
            code: code,
            teams: []
        };
    }

    // Distribute Teams
    for (const team of TEAMS) {
        const leagueInfo = LEAGUES[team.leagueCode];
        if (leagueInfo && leagueMap[leagueInfo.id]) {
            // Apply initial stats if not present (will be 0 for fresh season)
            const teamData = {
                id: team.id,
                name: team.name,
                logo: team.logo,
                att: Math.floor(team.elo / 20) - 10, // Rough conversion
                def: Math.floor(team.elo / 20) - 15,
                mid: Math.floor(team.elo / 20) - 12,
                prestige: leagueInfo.prestige,
                marketValue: team.marketValue,
                elo: team.elo,
                stats: { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 },
                points: 0
            };
            leagueMap[leagueInfo.id].teams.push(teamData);
        }
    }

    // Add Champions League Teams (some might overlap with domestic)
    // For simplicity in this hardcoded version, we might just list them in their domestic leagues
    // and let the sync logic handle CL specific structure if needed.
    // But for the 'fetchedLeagues' return, we want correct grouping.

    // Convert map to array
    return Object.values(leagueMap);
}

// Fetch upcoming fixtures from football-data.org
async function fetchFixtures() {
    console.log("Fetching Fixtures...");
    const headers = { 'X-Auth-Token': FOOTBALL_API_KEY };
    const allFixtures = [];

    const leagueCodes = ['BL1', 'PL', 'PD', 'SA', 'FL1', 'CL', 'EL', 'UCL'];
    const leagueIdMap = { BL1: 2002, PL: 2021, PD: 2014, SA: 2019, FL1: 2015, CL: 2001, EL: 2146, UCL: 2154 };

    for (const code of leagueCodes) {
        await sleep(1500); // Rate limit
        try {
            let res = await axios.get(`${FOOTBALL_BASE_URL}/competitions/${code}/matches?status=SCHEDULED&limit=15&season=${CURRENT_SEASON_YEAR}`, { headers });
            if (!res.data.matches || res.data.matches.length === 0) {
                res = await axios.get(`${FOOTBALL_BASE_URL}/competitions/${code}/matches?status=SCHEDULED&limit=15&season=2024`, { headers });
            }
            if (res.data.matches && res.data.matches.length > 0) {
                const matches = res.data.matches.map(m => ({
                    id: m.id,
                    leagueId: leagueIdMap[code],
                    homeTeamId: m.homeTeam.id,
                    awayTeamId: m.awayTeam.id,
                    homeTeamName: m.homeTeam.name,
                    awayTeamName: m.awayTeam.name,
                    matchday: m.matchday,
                    utcDate: m.utcDate,
                    status: 'scheduled'
                }));
                allFixtures.push(...matches);
                console.log(`-> Fetched ${matches.length} fixtures for ${code}`);
            }
        } catch (err) {
            console.error(`Fixtures error ${code}:`, err.message);
        }
    }

    return allFixtures;
}

// Fetch current standings from football-data.org
async function fetchStandings() {
    console.log("Fetching Standings from API...");
    const headers = { 'X-Auth-Token': FOOTBALL_API_KEY };
    const standingsMap = {}; // teamId -> { played, wins, draws, losses, gf, ga, points }

    const leagueCodes = ['BL1', 'PL', 'PD', 'SA', 'FL1'];

    for (const code of leagueCodes) {
        await sleep(1500); // Rate limit
        try {
            let res = await axios.get(`${FOOTBALL_BASE_URL}/competitions/${code}/standings?season=${CURRENT_SEASON_YEAR}`, { headers });
            
            // Fallback to 2024 if no data
            if (!res.data.standings || res.data.standings.length === 0) {
                res = await axios.get(`${FOOTBALL_BASE_URL}/competitions/${code}/standings?season=2024`, { headers });
            }

            if (res.data.standings && res.data.standings.length > 0) {
                // Find the TOTAL standings (not HOME/AWAY)
                const totalStandings = res.data.standings.find(s => s.type === 'TOTAL');
                if (totalStandings && totalStandings.table) {
                    for (const row of totalStandings.table) {
                        standingsMap[row.team.id] = {
                            played: row.playedGames || 0,
                            wins: row.won || 0,
                            draws: row.draw || 0,
                            losses: row.lost || 0,
                            gf: row.goalsFor || 0,
                            ga: row.goalsAgainst || 0,
                            points: row.points || 0,
                            position: row.position || 0
                        };
                    }
                    console.log(`-> Fetched standings for ${code}: ${totalStandings.table.length} teams`);
                }
            }
        } catch (err) {
            console.error(`Standings error ${code}:`, err.message);
        }
    }

    return standingsMap;
}

// Fetch top scorers and assists from api-football.com (for rating boost)
async function fetchTopPlayers() {
    console.log("Fetching Top Scorers & Assists...");
    const headers = { 'x-rapidapi-key': API_FOOTBALL_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' };
    const topPlayersMap = {}; // playerName -> { goals, assists, rating }

    // League IDs for api-football.com
    const leagues = [
        { id: 78, name: 'Bundesliga' },
        { id: 39, name: 'Premier League' },
        { id: 140, name: 'La Liga' },
        { id: 135, name: 'Serie A' },
        { id: 61, name: 'Ligue 1' }
    ];

    for (const league of leagues) {
        await sleep(500);
        try {
            // Top Scorers
            const scorersRes = await axios.get(
                `${API_FOOTBALL_URL}/players/topscorers?league=${league.id}&season=${CURRENT_SEASON_YEAR}`,
                { headers }
            );
            if (scorersRes.data?.response) {
                for (const p of scorersRes.data.response.slice(0, 15)) {
                    const name = p.player?.name;
                    if (name) {
                        topPlayersMap[name] = {
                            goals: p.statistics?.[0]?.goals?.total || 0,
                            assists: p.statistics?.[0]?.goals?.assists || 0,
                            rating: parseFloat(p.statistics?.[0]?.games?.rating) || 7.0,
                            appearances: p.statistics?.[0]?.games?.appearences || 0
                        };
                    }
                }
                console.log(`-> Top scorers ${league.name}: ${scorersRes.data.response.length} players`);
            }

            await sleep(500);

            // Top Assists
            const assistsRes = await axios.get(
                `${API_FOOTBALL_URL}/players/topassists?league=${league.id}&season=${CURRENT_SEASON_YEAR}`,
                { headers }
            );
            if (assistsRes.data?.response) {
                for (const p of assistsRes.data.response.slice(0, 15)) {
                    const name = p.player?.name;
                    if (name && !topPlayersMap[name]) {
                        topPlayersMap[name] = {
                            goals: p.statistics?.[0]?.goals?.total || 0,
                            assists: p.statistics?.[0]?.goals?.assists || 0,
                            rating: parseFloat(p.statistics?.[0]?.games?.rating) || 7.0,
                            appearances: p.statistics?.[0]?.games?.appearences || 0
                        };
                    }
                }
                console.log(`-> Top assists ${league.name}: ${assistsRes.data.response.length} players`);
            }
        } catch (err) {
            console.error(`Top players error ${league.name}:`, err.message);
        }
    }

    return topPlayersMap;
}

// Fetch real player names from api-football.com
async function fetchRealPlayers(teamIds) {
    console.log("Fetching Real Players (api-football.com)...");
    const headers = { 'x-rapidapi-key': API_FOOTBALL_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' };
    const allPlayers = {};

    for (const teamId of teamIds) {
        // Check if we have a mapping for this team
        const apiTeamId = TEAM_ID_MAP[teamId];
        if (!apiTeamId) continue;

        await sleep(300); // Rate limit per team
        try {
            const res = await axios.get(`${API_FOOTBALL_URL}/players/squads?team=${apiTeamId}`, { headers });

            if (res.data?.response?.[0]?.players) {
                const raw = res.data.response[0].players.map(p => ({
                    name: p.name,
                    age: p.age,
                    number: p.number ?? 99,
                    position: mapPosition(p.position),
                    photo: p.photo,
                    isInjured: p.injured || false
                }));
                // Limit to first-team: sort by number (1-44 typical), take max 28
                const players = raw
                    .sort((a, b) => a.number - b.number)
                    .slice(0, 28);
                allPlayers[teamId] = players;
                console.log(`-> Fetched ${players.length} real players for team ${teamId}`);
            }
        } catch (err) {
            console.error(`Players error for team ${teamId}:`, err.message);
        }
    }

    return allPlayers;
}

// Map api-football positions to our format
function mapPosition(pos) {
    if (!pos) return 'SUB';
    const p = pos.toLowerCase();
    if (p.includes('goalkeeper')) return 'GK';
    if (p.includes('defender')) return 'DEF';
    if (p.includes('midfielder')) return 'MID';
    if (p.includes('attacker') || p.includes('forward')) return 'FWD';
    return 'SUB';
}

async function fetchF1Data() {
    console.log("Fetching F1 Data...");
    try {
        let season = 2026;
        let response = await axios.get(`${F1_BASE_URL}/${season}/constructors.json`);

        let teamsData = response.data?.MRData?.ConstructorTable?.Constructors;
        if (!teamsData || teamsData.length === 0) {
            console.log("2026 data empty, falling back to 2025...");
            season = 2025;
            response = await axios.get(`${F1_BASE_URL}/${season}/constructors.json`);
            teamsData = response.data?.MRData?.ConstructorTable?.Constructors;
        }

        if (!teamsData) return null;

        let driversResponse = await axios.get(`${F1_BASE_URL}/${season}/driverStandings.json`);
        let standings = driversResponse.data?.MRData?.StandingsTable?.StandingsLists[0]?.DriverStandings;

        if (!standings && season > 2024) {
            console.log("Drivers empty for current season, using 2024...");
            driversResponse = await axios.get(`${F1_BASE_URL}/2024/driverStandings.json`);
            standings = driversResponse.data?.MRData?.StandingsTable?.StandingsLists[0]?.DriverStandings;
        }

        let drivers = [];
        if (standings) {
            drivers = standings.map(s => ({
                id: s.Driver.driverId,
                name: `${s.Driver.givenName} ${s.Driver.familyName}`,
                teamId: s.Constructors[0]?.constructorId,
                skill: 90 - (parseInt(s.position) / 2),
                points: parseInt(s.points)
            }));
        }

        const teams = teamsData.map(t => ({
            id: t.constructorId,
            name: t.name,
            perf: 90,
            reliability: 0.95
        }));

        teams.forEach(t => {
            if (['red_bull', 'ferrari', 'mclaren', 'mercedes'].includes(t.id)) t.perf = 95;
            else if (['aston_martin', 'alpine'].includes(t.id)) t.perf = 88;
            else t.perf = 82;
        });

        return {
            season: season.toString(),
            teams,
            drivers
        };

    } catch (e) {
        console.error("F1 Fetch Error:", e.message);
        return null;
    }
}

const { prisma } = require('./db');

// ... (fetch functions remain same)

async function updateAllData(options = { prioritySync: false, force: false }) {
    console.log("Starting DB Update (Prisma)... Options:", options);

    // API protection: skip if data is fresh (respects 100 req/day limit)
    const settings = await prisma.appSettings.findFirst({ where: { id: 1 } });
    const lastUpdate = settings?.lastUpdate ? new Date(settings.lastUpdate).getTime() : 0;
    const now = Date.now();
    if (!options.force && lastUpdate > 0 && (now - lastUpdate) < API_MIN_INTERVAL_MS) {
        console.log("Data is fresh (< 24h). Skipping API calls. Use --force to refresh.");
        return { success: true, skipped: true, message: "Data is fresh. Use --force to refresh." };
    }

    const footballData = await fetchFootballData();
    const fixturesData = await fetchFixtures();
    const standingsData = await fetchStandings();
    const topPlayersData = await fetchTopPlayers(); // NEW: Fetch top scorers/assists
    let f1Data = null;

    if (!options.prioritySync) {
        f1Data = await fetchF1Data();
    }

    // Apply real standings to footballData teams
    for (const league of footballData) {
        for (const team of league.teams) {
            if (standingsData[team.id]) {
                const s = standingsData[team.id];
                team.stats = {
                    played: s.played,
                    wins: s.wins,
                    draws: s.draws,
                    losses: s.losses,
                    gf: s.gf,
                    ga: s.ga
                };
                team.points = s.points;
            }
        }
    }

    // Fetch Real Players: ONLY for teams that have 0 players (saves 60-130 API calls!)
    let allTeamIds = footballData.flatMap(l => l.teams.map(t => t.id));
    const teamsNeedingPlayers = [];
    for (const tid of allTeamIds) {
        const count = await prisma.player.count({ where: { teamId: tid } });
        if (count === 0) teamsNeedingPlayers.push(tid);
    }
    const teamIdsToFetch = options.prioritySync
        ? teamsNeedingPlayers.slice(0, 25)
        : teamsNeedingPlayers;

    let realPlayers = {};
    if (teamIdsToFetch.length > 0) {
        console.log(`Fetching players for ${teamIdsToFetch.length} teams (${allTeamIds.length - teamIdsToFetch.length} already have data)...`);
        realPlayers = await fetchRealPlayers(teamIdsToFetch);
    } else {
        console.log("All teams have players. Skipping player fetch (saves API calls).");
    }

    const TOURNAMENT_IDS = [2001, 2146, 2154]; // CL, EL, ECL
    const domesticLeagues = footballData.filter(l => !TOURNAMENT_IDS.includes(l.id));
    const championsLeague = footballData.find(l => l.id === 2001);
    const europaLeague = footballData.find(l => l.id === 2146);
    const conferenceLeague = footballData.find(l => l.id === 2154);

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Process DOMESTIC LEAGUES
            for (const league of domesticLeagues) {
                console.log(`Saving Domestic League: ${league.name}`);
                await tx.league.upsert({
                    where: { id: league.id },
                    update: { name: league.name },
                    create: { id: league.id, name: league.name, country: 'Europe', currentSeason: CURRENT_SEASON_STR }
                });

                for (const team of league.teams) {
                    // Calc Ratings / MV with Data Enrichment
                    let baseMV = 50000000;
                    let eloStart = LEAGUE_BASE_ELO['DEFAULT'];
                    let baseRating = 68;

                    const prestigeMult = LEAGUE_PRESTIGE[league.code] || 0.8; // Need to ensure league.code is available

                    // Try to match hardcoded MV
                    if (TOP_TEAMS_MARKET_VALUE[team.name]) {
                        baseMV = TOP_TEAMS_MARKET_VALUE[team.name];
                        eloStart = 1800; // High base for top teams
                        baseRating = 82;
                    } else {
                        // Dynamic Fallback
                        // E.g. PL teams get higher base
                        if (['Premier League'].includes(league.name)) {
                            baseMV = 150000000;
                            eloStart = LEAGUE_BASE_ELO['PL'];
                            baseRating = 75;
                        } else if (['Bundesliga', 'La Liga'].includes(league.name)) {
                            baseMV = 100000000;
                            eloStart = 1550;
                            baseRating = 74;
                        }
                    }

                    // Adjust by League Prestige
                    baseRating = Math.floor(baseRating * prestigeMult);

                    // Create/Update Team
                    await tx.team.upsert({
                        where: { id: team.id },
                        update: {
                            name: team.name,
                            leagueId: league.id,
                            att: team.att,
                            def: team.def,
                            mid: team.mid,
                            logo: team.logo,
                            marketValue: baseMV
                        },
                        create: {
                            id: team.id,
                            name: team.name,
                            leagueId: league.id,
                            att: team.att,
                            def: team.def,
                            mid: team.mid,
                            prestige: Math.floor(baseRating),
                            budget: Math.floor(baseMV * 0.2),
                            marketValue: baseMV,
                            eloRating: eloStart,
                            logo: team.logo,
                            isUserControlled: false
                        }
                    });

                    // Players
                    const existingPlayerCount = await tx.player.count({ where: { teamId: team.id } });
                    let squad = realPlayers[team.id];

                    // Distribution Config
                    const PLAYER_VALUE_MAP = {
                        "Erling Haaland": 180000000,
                        "Kylian Mbappé": 180000000,
                        "Jude Bellingham": 180000000,
                        "Vinicius Junior": 150000000,
                        "Harry Kane": 100000000,
                        "Phil Foden": 130000000,
                        "Bukayo Saka": 120000000,
                        "Rodri": 110000000,
                        "Florian Wirtz": 110000000,
                        "Jamal Musiala": 110000000,
                        "Lautaro Martínez": 110000000,
                        "Victor Osimhen": 100000000,
                        "Declan Rice": 110000000,
                        "Federico Valverde": 100000000,
                        "Rodrygo": 100000000,
                        "Lamine Yamal": 150000000
                    };

                    if (squad && squad.length > 0 && existingPlayerCount === 0) {
                        // Dynamically calc average value per position group based on Team MV
                        // Assumption: Squad size ~25. 11 starters take 70% of value.
                        // Simplified: Distribute Team MV roughly among 25 players.
                        // Better: Use position weights.

                        const totalMV = baseMV; // Total pot
                        const fwCount = squad.filter(p => p.position === 'FWD' || p.position === 'ATT').length || 3;
                        const midCount = squad.filter(p => p.position === 'MID').length || 8;
                        const defCount = squad.filter(p => p.position === 'DEF').length || 8;
                        const gkCount = squad.filter(p => p.position === 'GK').length || 3;

                        // Pot allocation (approximate)
                        const fwPot = totalMV * 0.35;
                        const midPot = totalMV * 0.35;
                        const defPot = totalMV * 0.25;
                        const gkPot = totalMV * 0.05;

                        for (const p of squad) {
                            let pValue = 0;

                            // 1. Check Manual Map
                            if (PLAYER_VALUE_MAP[p.name]) {
                                pValue = PLAYER_VALUE_MAP[p.name];
                            } else {
                                // 2. Calculate based on position tier
                                let baseVal = 0;
                                if (p.position === 'FWD' || p.position === 'ATT') baseVal = fwPot / fwCount;
                                else if (p.position === 'MID') baseVal = midPot / midCount;
                                else if (p.position === 'DEF') baseVal = defPot / defCount;
                                else if (p.position === 'GK') baseVal = gkPot / gkCount;
                                else baseVal = totalMV / 25; // Fallback

                                // Randomize +/- 20%
                                const variance = 0.8 + (Math.random() * 0.4);
                                pValue = Math.floor(baseVal * variance);
                            }

                            const rating = getPlayerRating(p.name, pValue, topPlayersData);
                            await tx.player.create({
                                data: {
                                    teamId: team.id,
                                    name: p.name,
                                    position: p.position,
                                    age: p.age,
                                    rating: rating,
                                    marketValue: pValue,
                                    number: p.number,
                                    photo: p.photo
                                }
                            });
                        }
                    } else if (existingPlayerCount < 11) {
                        // Check if we have squad data for this team (from leagues folder)
                        const kickerSquad = getSquad(team.name);
                        
                        if (kickerSquad && kickerSquad.length > 0) {
                            // Use squad data from leagues folder (real names and ratings)
                            console.log(`[Squad] Using data for ${team.name} (${kickerSquad.length} players)`);
                            for (let i = 0; i < kickerSquad.length; i++) {
                                const kp = kickerSquad[i];
                                const rating = kp.kickerNote ? kickerToRating(kp.kickerNote) : 70;
                                const mockVal = Math.floor(baseMV / kickerSquad.length);
                                
                                await tx.player.create({
                                    data: {
                                        teamId: team.id,
                                        name: kp.name,
                                        position: kp.position,
                                        age: 18 + Math.floor(Math.random() * 15),
                                        rating: Math.max(50, Math.min(95, rating)),
                                        marketValue: mockVal,
                                        goals: kp.goals || 0,
                                        number: i + 1,
                                        fitness: 100
                                    }
                                });
                            }
                        } else {
                            // Fallback: Generate Mock Players with generic names
                            console.log(`[Mock] No Kicker data for ${team.name}, using generic players`);
                            const positions = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD', 'SUB', 'SUB', 'SUB', 'SUB'];
                            for (let i = 0; i < 20; i++) {
                                const pos = positions[i % positions.length];
                                let mockVal = Math.floor(baseMV / 20);
                                const rating = marketValueToRating(mockVal);

                                await tx.player.create({
                                    data: {
                                        teamId: team.id,
                                        name: `${pos} Player ${i + 1}`,
                                        position: pos,
                                        age: 18 + Math.floor(Math.random() * 15),
                                        rating: rating,
                                        marketValue: mockVal,
                                        number: i + 1,
                                        fitness: 100
                                    }
                                });
                            }
                        }
                    }

                    // Standings (Domestic)
                    await tx.standing.upsert({
                        where: {
                            leagueId_teamId_season_groupName: {
                                leagueId: league.id,
                                teamId: team.id,
                                season: CURRENT_SEASON_STR,
                                groupName: 'League'
                            }
                        },
                        update: {
                            played: team.stats.played || 0,
                            wins: team.stats.wins || 0,
                            draws: team.stats.draws || 0,
                            losses: team.stats.losses || 0,
                            gf: team.stats.gf || 0,
                            ga: team.stats.ga || 0,
                            points: team.points || 0
                        },
                        create: {
                            leagueId: league.id,
                            teamId: team.id,
                            season: CURRENT_SEASON_STR,
                            groupName: 'League',
                            played: team.stats.played || 0,
                            wins: team.stats.wins || 0,
                            draws: team.stats.draws || 0,
                            losses: team.stats.losses || 0,
                            gf: team.stats.gf || 0,
                            ga: team.stats.ga || 0,
                            points: team.points || 0
                        }
                    });
                }
            }

            // 2. Process UEFA TOURNAMENTS (CL, EL, ECL)
            const tournaments = [
                { data: championsLeague, id: 2001, name: 'Champions League' },
                { data: europaLeague, id: 2146, name: 'Europa League' },
                { data: conferenceLeague, id: 2154, name: 'Conference League' }
            ];
            for (const t of tournaments) {
                if (!t.data) continue;
                console.log(`Saving ${t.name}...`);
                await tx.league.upsert({
                    where: { id: t.id },
                    update: { name: t.name },
                    create: { id: t.id, name: t.name, type: 'tournament', country: 'Europe', currentSeason: CURRENT_SEASON_STR }
                });

                for (const team of t.data.teams) {
                    await tx.team.upsert({
                        where: { id: team.id },
                        update: {
                            att: team.att, def: team.def, mid: team.mid,
                            marketValue: team.marketValue,
                            eloRating: team.elo,
                            logo: team.logo
                        },
                        create: {
                            id: team.id,
                            name: team.name,
                            leagueId: t.id,
                            att: team.att, def: team.def, mid: team.mid,
                            prestige: 75,
                            budget: Math.floor(team.marketValue * 0.2),
                            marketValue: team.marketValue,
                            eloRating: team.elo,
                            logo: team.logo,
                            isUserControlled: false
                        }
                    });

                    await tx.standing.upsert({
                        where: {
                            leagueId_teamId_season_groupName: {
                                leagueId: t.id,
                                teamId: team.id,
                                season: CURRENT_SEASON_STR,
                                groupName: 'League Phase'
                            }
                        },
                        update: {
                            played: team.stats?.played || 0,
                            wins: team.stats?.wins || 0,
                            draws: team.stats?.draws || 0,
                            losses: team.stats?.losses || 0,
                            gf: team.stats?.gf || 0,
                            ga: team.stats?.ga || 0,
                            points: team.points || 0
                        },
                        create: {
                            leagueId: t.id,
                            teamId: team.id,
                            season: CURRENT_SEASON_STR,
                            groupName: 'League Phase',
                            played: team.stats?.played || 0,
                            wins: team.stats?.wins || 0,
                            draws: team.stats?.draws || 0,
                            losses: team.stats?.losses || 0,
                            gf: team.stats?.gf || 0,
                            ga: team.stats?.ga || 0,
                            points: team.points || 0
                        }
                    });
                }
            }

            // F1
            // F1
            if (f1Data) {
                console.log("Saving F1 Data...");
                await tx.f1Team.upsert({
                    where: { id: "unknown" },
                    update: {},
                    create: { id: "unknown", name: "Unattached", perf: 80, reliability: 0.9 }
                });

                for (const team of f1Data.teams) {
                    await tx.f1Team.upsert({
                        where: { id: team.id },
                        update: { perf: team.perf, reliability: team.reliability },
                        create: { id: team.id, name: team.name, perf: team.perf, reliability: team.reliability }
                    });
                }

                for (const driver of f1Data.drivers) {
                    let tid = driver.teamId;
                    const teamExists = f1Data.teams.some(t => t.id === tid);
                    if (!teamExists && tid !== "unknown") {
                        // Creating simplified team if missing
                        await tx.f1Team.upsert({
                            where: { id: tid },
                            update: {},
                            create: { id: tid, name: "Team " + tid, perf: 85, reliability: 0.9 }
                        });
                    }

                    await tx.f1Driver.upsert({
                        where: { id: driver.id },
                        update: { teamId: tid, skill: driver.skill, points: driver.points },
                        create: { id: driver.id, name: driver.name, teamId: tid, skill: driver.skill, points: driver.points }
                    });
                }
            }

            // Save Fixtures (only those where both teams exist in our DB)
            const validTeamIds = new Set(footballData.flatMap(l => l.teams.map(t => t.id)));
            const fixturesToSave = fixturesData.filter(f => validTeamIds.has(f.homeTeamId) && validTeamIds.has(f.awayTeamId));
            if (fixturesData.length > fixturesToSave.length) {
                console.log(`Skipping ${fixturesData.length - fixturesToSave.length} fixtures (teams not in DB)`);
            }
            console.log(`Saving ${fixturesToSave.length} fixtures...`);
            for (const fix of fixturesToSave) {
                await tx.match.upsert({
                    where: { id: fix.id },
                    update: {
                        status: fix.status,
                        playedAt: new Date(fix.utcDate)
                    },
                    create: {
                        id: fix.id,
                        leagueId: fix.leagueId,
                        homeTeamId: fix.homeTeamId,
                        awayTeamId: fix.awayTeamId,
                        matchday: fix.matchday,
                        status: fix.status,
                        playedAt: new Date(fix.utcDate),
                        homeScore: 0,
                        awayScore: 0
                    }
                });
            }
        }, {
            timeout: 50000 // Increase timeout for large transaction
        });

        // Update lastUpdate so 24h API protection kicks in
        await prisma.appSettings.upsert({
            where: { id: 1 },
            update: { lastUpdate: new Date() },
            create: { id: 1, lastUpdate: new Date() }
        });

        console.log("DB Update Complete.");
        return { success: true };

    } catch (err) {
        console.error("Update Transaction Error:", err);
        return { success: false, error: err.message };
    }
}

// Kicker.de Team Slugs for Bundesliga
const KICKER_TEAM_SLUGS = {
    // Bundesliga
    'FC Bayern München': 'fc-bayern-muenchen',
    'Borussia Dortmund': 'borussia-dortmund',
    'Bayer 04 Leverkusen': 'bayer-04-leverkusen',
    'RB Leipzig': 'rb-leipzig',
    'VfB Stuttgart': 'vfb-stuttgart',
    'Eintracht Frankfurt': 'eintracht-frankfurt',
    'VfL Wolfsburg': 'vfl-wolfsburg',
    'Borussia Mönchengladbach': 'bor-moenchengladbach',
    'SC Freiburg': 'sc-freiburg',
    'TSG Hoffenheim': 'tsg-hoffenheim',
    '1. FC Union Berlin': '1-fc-union-berlin',
    'FC Augsburg': 'fc-augsburg',
    'SV Werder Bremen': 'werder-bremen',
    '1. FSV Mainz 05': '1-fsv-mainz-05',
    'VfL Bochum 1848': 'vfl-bochum',
    '1. FC Heidenheim 1846': '1-fc-heidenheim',
    'FC St. Pauli': 'fc-st-pauli',
    'Holstein Kiel': 'holstein-kiel'
};

/**
 * Convert Kicker Schulnote (1.0-6.0) to our rating scale (95-50)
 * 1.0 = 95 (world class), 3.0 = 75 (good), 5.0 = 55 (poor), 6.0 = 50
 */
function kickerNoteToRating(note) {
    if (!note || note === '-' || note === '\\-') return null;
    const n = parseFloat(note.replace(',', '.'));
    if (isNaN(n)) return null;
    // 1.0 -> 95, 6.0 -> 50 (linear interpolation)
    return Math.round(95 - (n - 1) * 9);
}

/**
 * Fetch squad data from kicker.de for a team
 * @param {string} teamName - Team name to look up
 * @param {string} season - Season string like "2025-26"
 */
async function fetchKickerSquad(teamName, season = '2025-26') {
    const slug = KICKER_TEAM_SLUGS[teamName];
    if (!slug) {
        console.log(`[Kicker] No slug for team: ${teamName}`);
        return [];
    }

    const url = `https://www.kicker.de/${slug}/kader/bundesliga/${season}`;
    console.log(`[Kicker] Fetching: ${url}`);

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8'
            },
            timeout: 10000
        });

        const html = response.data;
        const players = [];

        // Parse player rows from HTML tables
        // Looking for pattern: name, nation, age, games, goals, note
        const tableRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>(\d+)<\/td>[\s\S]*?<a[^>]*>[\s\S]*?\*\*([^*]+)\*\*\s*([^<]+)<\/a>[\s\S]*?<td[^>]*>(\d+)[^<]*<\/td>[\s\S]*?<td[^>]*>([^<]*)<\/td>[\s\S]*?<td[^>]*>([^<]*)<\/td>[\s\S]*?<td[^>]*>([^<]*)<\/td>/gi;

        // Simpler regex to find player entries
        const playerRegex = /\*\*([A-Za-zäöüÄÖÜß\-\s]+)\*\*\s+([A-Za-zäöüÄÖÜß\-\s]+)/g;
        const noteRegex = /(\d[,\.]\d{2})/g;

        // Alternative: Parse the markdown-style content
        const lines = html.split('\n');
        let currentSection = '';
        
        for (const line of lines) {
            // Detect position sections
            if (line.includes('## Tor')) currentSection = 'GK';
            else if (line.includes('## Abwehr')) currentSection = 'DEF';
            else if (line.includes('## Mittelfeld')) currentSection = 'MID';
            else if (line.includes('## Sturm')) currentSection = 'FW';
            else if (line.includes('## Außerdem') || line.includes('## Trainer')) currentSection = '';

            // Look for player pattern: | Nr. | **Name** Vorname |
            const playerMatch = line.match(/\|\s*(\d+)\s*\|\s*\[?\*\*([^*]+)\*\*\s*([^\]|]+)/);
            if (playerMatch && currentSection) {
                const [, number, lastName, firstName] = playerMatch;
                const fullName = `${firstName.trim()} ${lastName.trim()}`;
                
                // Find note in same line (pattern: | 3,27 | or similar)
                const noteMatch = line.match(/\|\s*(\d[,\.]\d{2})\s*\|?\s*$/);
                const note = noteMatch ? noteMatch[1] : null;
                const rating = kickerNoteToRating(note);

                // Find goals
                const goalsMatch = line.match(/\|\s*(\d+)\s*\|\s*(\d+)\s*\|/);
                const goals = goalsMatch ? parseInt(goalsMatch[2]) : 0;

                players.push({
                    name: fullName,
                    position: currentSection,
                    number: parseInt(number),
                    kickerNote: note,
                    rating: rating || 70, // Default if no note
                    goals: goals
                });
            }
        }

        console.log(`[Kicker] Found ${players.length} players for ${teamName}`);
        return players;

    } catch (error) {
        console.error(`[Kicker] Error fetching ${teamName}:`, error.message);
        return [];
    }
}

/**
 * Fetch all Bundesliga squads from kicker.de
 */
async function fetchAllKickerSquads() {
    const allSquads = {};
    const teams = Object.keys(KICKER_TEAM_SLUGS);
    
    console.log(`[Kicker] Fetching ${teams.length} Bundesliga squads...`);
    
    for (const teamName of teams) {
        const players = await fetchKickerSquad(teamName);
        if (players.length > 0) {
            allSquads[teamName] = players;
        }
        // Rate limit - wait 1 second between requests
        await sleep(1000);
    }

    console.log(`[Kicker] Completed. Got squads for ${Object.keys(allSquads).length} teams.`);
    return allSquads;
}

// ── ESPN Data Enhancement ────────────────────────────
// Updates team logos and enriches data using ESPN's free API

const espnService = require('./espn_service');

async function updateTeamLogosFromEspn() {
    console.log("[ESPN] Updating team logos from ESPN...");
    const leagues = espnService.getLeagues().filter(l => l.internalCode !== 'CL' && l.internalCode !== 'EL');
    let updated = 0;

    for (const league of leagues) {
        try {
            const teams = await espnService.getTeams(league.code);
            for (const team of teams) {
                if (team.internalId && team.logo) {
                    await prisma.team.updateMany({
                        where: { id: team.internalId },
                        data: { logo: team.logo }
                    });
                    updated++;
                }
            }
        } catch (e) {
            console.error(`[ESPN] Logo update error for ${league.code}:`, e.message);
        }
    }
    console.log(`[ESPN] Updated ${updated} team logos.`);
    return updated;
}

async function syncStandingsFromEspn() {
    console.log("[ESPN] Syncing real standings from ESPN...");
    const leagues = espnService.getLeagues().filter(l => !['uefa.champions', 'uefa.europa'].includes(l.code));
    let synced = 0;

    for (const league of leagues) {
        try {
            const standings = await espnService.getStandings(league.code);
            for (const entry of standings) {
                if (!entry.internalId) continue;
                await prisma.standing.upsert({
                    where: {
                        leagueId_teamId_season_groupName: {
                            leagueId: league.internalId,
                            teamId: entry.internalId,
                            season: CURRENT_SEASON_STR,
                            groupName: 'League'
                        }
                    },
                    update: {
                        played: entry.played,
                        wins: entry.wins,
                        draws: entry.draws,
                        losses: entry.losses,
                        gf: entry.goalsFor,
                        ga: entry.goalsAgainst,
                        points: entry.points,
                    },
                    create: {
                        leagueId: league.internalId,
                        teamId: entry.internalId,
                        season: CURRENT_SEASON_STR,
                        groupName: 'League',
                        played: entry.played,
                        wins: entry.wins,
                        draws: entry.draws,
                        losses: entry.losses,
                        gf: entry.goalsFor,
                        ga: entry.goalsAgainst,
                        points: entry.points,
                    }
                });
                synced++;
            }
            console.log(`[ESPN] Synced ${standings.length} standings for ${league.name}`);
        } catch (e) {
            console.error(`[ESPN] Standings sync error for ${league.code}:`, e.message);
        }
    }
    console.log(`[ESPN] Total standings synced: ${synced}`);
    return synced;
}

module.exports = {
    updateAllData,
    fetchFootballData,
    fetchFixtures,
    fetchRealPlayers,
    getPlayerRating,
    marketValueToRating,
    fetchKickerSquad,
    fetchAllKickerSquads,
    kickerNoteToRating,
    updateTeamLogosFromEspn,
    syncStandingsFromEspn
};

if (require.main === module) {
    const force = process.argv.includes('--force');
    db.initDb().then(() => {
        updateAllData({ force }).then((result) => {
            if (result?.skipped) console.log(result.message);
            process.exit(0);
        }).catch(err => {
            console.error('Update failed:', err);
            process.exit(1);
        });
    });
}
