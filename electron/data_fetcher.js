const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const FOOTBALL_API_KEY = "083b1ae74d7d441d809ec0e0617efcb5";
const FOOTBALL_BASE_URL = "https://api.football-data.org/v4";

// API-Football.com for supplementary player data
const API_FOOTBALL_KEY = "22700030a1c824d8eb278bb5951f2a87";
const API_FOOTBALL_URL = "https://v3.football.api-sports.io";

const F1_BASE_URL = "http://api.jolpi.ca/ergast/f1";

// Mapping football-data.org team IDs to api-football.com team IDs
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
    55: 188,   // Darmstadt 98
    28: 181,   // Heidenheim
    36: 182,   // VfL Bochum
    44: 174,   // FSV Mainz 05

    // ===== PREMIER LEAGUE =====
    65: 50,    // Manchester City
    64: 40,    // Liverpool
    57: 42,    // Arsenal
    66: 33,    // Manchester United
    61: 49,    // Chelsea
    73: 47,    // Tottenham
    67: 34,    // Newcastle
    62: 66,    // Aston Villa
    1044: 51,  // Brighton
    76: 48,    // West Ham
    354: 52,   // Crystal Palace
    563: 55,   // Brentford
    351: 65,   // Nottingham Forest
    341: 46,   // Fulham
    328: 35,   // Bournemouth
    338: 39,   // Wolves
    340: 45,   // Everton
    389: 1359, // Luton Town
    402: 44,   // Burnley
    356: 62,   // Sheffield United

    // ===== LA LIGA =====
    86: 541,   // Real Madrid
    81: 529,   // Barcelona
    78: 530,   // Atletico Madrid
    82: 531,   // Athletic Bilbao
    95: 532,   // Real Sociedad
    94: 533,   // Real Betis
    559: 536,  // Sevilla
    558: 534,  // Villarreal
    90: 548,   // Getafe
    92: 543,   // Real Valladolid
    298: 538,  // Girona
    267: 728,  // Osasuna
    264: 540,  // Celta Vigo
    275: 537,  // Rayo Vallecano
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

async function fetchFootballData() {
    console.log("Fetching Football Data (football-data.org)...");
    try {
        const headers = { 'X-Auth-Token': FOOTBALL_API_KEY };
        const fetchedLeagues = [];

        // IDs from football-data.org
        const leaguesToCheck = [
            { code: 'BL1', id: 2002, name: 'Bundesliga' },
            { code: 'PL', id: 2021, name: 'Premier League' },
            { code: 'PD', id: 2014, name: 'La Liga' },
            { code: 'SA', id: 2019, name: 'Serie A' },
            { code: 'FL1', id: 2015, name: 'Ligue 1' },
            { code: 'CL', id: 2001, name: 'Champions League' }
        ];

        for (const l of leaguesToCheck) {
            console.log(`Getting ${l.name} (${l.code})...`);
            // Rate Limit Delay
            await new Promise(r => setTimeout(r, 1500));

            try {
                const res = await axios.get(`${FOOTBALL_BASE_URL}/competitions/${l.code}/standings`, { headers });

                // Get ALL 'TOTAL' tables (League has 1, Cup/CL has 8+)
                const tables = res.data.standings.filter(s => s.type === 'TOTAL');

                let allTeams = [];

                for (const tableObj of tables) {
                    if (tableObj.table) {
                        const groupName = tableObj.group ? tableObj.group.replace('_', ' ') : null; // "GROUP_A" -> "GROUP A"

                        const groupTeams = tableObj.table.map(row => {
                            // simplistic ratings
                            const gd = row.goalDifference || (row.goalsFor - row.goalsAgainst);
                            const isGroup = tableObj.group !== undefined;
                            const ratingPointsScale = isGroup ? 2.0 : 0.4;

                            const perfRating = 70 + (row.points * ratingPointsScale) + (gd * 0.5);

                            const formStr = row.form || "";
                            const wins = (formStr.match(/W/g) || []).length;
                            const draws = (formStr.match(/D/g) || []).length;
                            const totalFormGames = formStr.replace(/,/g, '').length || 1;
                            const formVal = totalFormGames > 0 ? (wins * 3 + draws) / totalFormGames : 0.5;

                            return {
                                id: row.team.id,
                                name: row.team.name,
                                att: Math.floor(Math.min(99, Math.max(60, perfRating + 5))),
                                def: Math.floor(Math.min(99, Math.max(60, perfRating - (row.goalsAgainst / (row.playedGames || 1) * 5)))),
                                mid: Math.floor(Math.min(99, Math.max(60, perfRating))),
                                form: parseFloat(formVal.toFixed(2)),
                                points: row.points,
                                logo: row.team.crest,
                                group: groupName,
                                stats: {
                                    played: row.playedGames,
                                    wins: row.won,
                                    draws: row.draw,
                                    losses: row.lost,
                                    gf: row.goalsFor,
                                    ga: row.goalsAgainst
                                }
                            };
                        });
                        allTeams = allTeams.concat(groupTeams);
                    }
                }

                if (allTeams.length > 0) {
                    fetchedLeagues.push({
                        id: l.id,
                        name: l.name,
                        teams: allTeams
                    });
                    console.log(`-> Fetched ${allTeams.length} teams for ${l.name}`);
                }

            } catch (err) {
                console.error(`Error fetching ${l.name}: ${err.message}`);
                if (err.response) console.error(JSON.stringify(err.response.data));
            }
        }

        return fetchedLeagues;

    } catch (error) {
        console.error("Football Fetch Generic Error:", error.message);
        return [];
    }
}

// Fetch upcoming fixtures from football-data.org
async function fetchFixtures() {
    console.log("Fetching Fixtures...");
    const headers = { 'X-Auth-Token': FOOTBALL_API_KEY };
    const allFixtures = [];

    const leagueCodes = ['BL1', 'PL', 'PD', 'SA', 'FL1', 'CL'];
    const leagueIdMap = { BL1: 2002, PL: 2021, PD: 2014, SA: 2019, FL1: 2015, CL: 2001 };

    for (const code of leagueCodes) {
        await new Promise(r => setTimeout(r, 1200)); // Rate limit
        try {
            // Get next 10 scheduled matches
            const res = await axios.get(`${FOOTBALL_BASE_URL}/competitions/${code}/matches?status=SCHEDULED&limit=15`, { headers });

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

// Fetch real player names from api-football.com
async function fetchRealPlayers(teamIds) {
    console.log("Fetching Real Players (api-football.com)...");
    const headers = { 'x-rapidapi-key': API_FOOTBALL_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' };
    const allPlayers = {};

    for (const teamId of teamIds) {
        // Check if we have a mapping for this team
        const apiTeamId = TEAM_ID_MAP[teamId];
        if (!apiTeamId) continue;

        await new Promise(r => setTimeout(r, 500)); // Rate limit
        try {
            const res = await axios.get(`${API_FOOTBALL_URL}/players/squads?team=${apiTeamId}`, { headers });

            if (res.data?.response?.[0]?.players) {
                const players = res.data.response[0].players.map(p => ({
                    name: p.name,
                    age: p.age,
                    number: p.number,
                    position: mapPosition(p.position), // GK, DEF, MID, FWD
                    rating: Math.floor(Math.random() * (94 - 68) + 68), // Mock Rating 68-94
                    photo: p.photo
                }));
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

async function updateAllData() {
    console.log("Starting DB Update...");
    const footballData = await fetchFootballData();
    const fixturesData = await fetchFixtures();
    const f1Data = await fetchF1Data();

    // Fetch Real Players
    const allTeamIds = footballData.flatMap(l => l.teams.map(t => t.id));
    const realPlayers = await fetchRealPlayers(allTeamIds);

    // Prepare Statements
    const insertLeague = db.prepare('INSERT OR REPLACE INTO leagues (id, name, type, current_season, sport) VALUES (?, ?, ?, ?, ?)');

    // Team Info - only update if team doesn't exist OR if this is NOT the CL
    const insertTeam = db.prepare('INSERT OR REPLACE INTO teams (id, name, league_id, att, def, mid, prestige, logo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const checkTeamExists = db.prepare('SELECT id, league_id FROM teams WHERE id = ?');

    // Standings (Season Data)
    const insertStanding = db.prepare('INSERT OR REPLACE INTO standings (league_id, team_id, season, group_name, played, wins, draws, losses, gf, ga, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

    // Players
    // Players
    const insertPlayer = db.prepare('INSERT INTO players (team_id, name, position, age, rating, number, photo, fitness, is_injured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const countPlayers = db.prepare('SELECT count(*) as c FROM players WHERE team_id = ?');

    const insertF1Team = db.prepare('INSERT OR REPLACE INTO f1_teams (id, name, perf, reliability) VALUES (?, ?, ?, ?)')
    const insertDriver = db.prepare('INSERT OR REPLACE INTO f1_drivers (id, name, team_id, skill, points) VALUES (?, ?, ?, ?, ?)');

    // Fixtures
    const insertMatch = db.prepare('INSERT OR REPLACE INTO matches (id, league_id, home_team_id, away_team_id, matchday, status, played_at) VALUES (?, ?, ?, ?, ?, ?, ?)');

    // Separate domestic leagues from CL
    const CL_ID = 2001;
    const domesticLeagues = footballData.filter(l => l.id !== CL_ID);
    const championsLeague = footballData.find(l => l.id === CL_ID);


    const updateTx = db.transaction(() => {
        // 1. Process DOMESTIC LEAGUES FIRST
        for (const league of domesticLeagues) {
            console.log(`Saving Domestic League: ${league.name}`);
            insertLeague.run(league.id, league.name, 'league', '2024/2025', 'football');

            for (const team of league.teams) {
                // --- Market Value Heuristic ---
                let baseMV = 50000000;
                let eloStart = 1500;
                const superClubs = ['Manchester City', 'Real Madrid', 'Bayern München', 'Paris Saint-Germain', 'Arsenal', 'Liverpool'];
                const topClubs = ['Borussia Dortmund', 'Bayer 04 Leverkusen', 'Inter', 'Juventus', 'AC Milan', 'FC Barcelona', 'Atlético Madrid'];

                if (superClubs.some(c => team.name.includes(c))) { baseMV = 900000000; eloStart = 1850; }
                else if (topClubs.some(c => team.name.includes(c))) { baseMV = 500000000; eloStart = 1700; }
                else if (league.name === 'Premier League') { baseMV = 200000000; eloStart = 1600; } // PL Money

                // Insert/Update Team with new fields
                // Note: We use db.prepare directly here to ensure fields are set
                db.prepare(`
                    INSERT INTO teams (id, name, league_id, att, def, mid, prestige, logo, market_value, elo_rating)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET 
                        market_value = COALESCE(market_value, excluded.market_value),
                        elo_rating = COALESCE(elo_rating, excluded.elo_rating)
                `).run(team.id, team.name, league.id, team.att, team.def, team.mid, 70, team.logo, baseMV, eloStart);

                // Standings for domestic league
                insertStanding.run(
                    league.id,
                    team.id,
                    '2024/2025',
                    team.group,
                    team.stats.played || 0,
                    team.stats.wins || 0,
                    team.stats.draws || 0,
                    team.stats.losses || 0,
                    team.stats.gf || 0,
                    team.stats.ga || 0,
                    team.points || 0
                );

                // Insert Players (Real or Mock)
                const squad = realPlayers[team.id];
                // Check if we already have players (if not forcing update)
                const glCount = countPlayers.get(team.id).c;

                if (squad && squad.length > 0 && glCount === 0) {
                    console.log(`Saving ${squad.length} real players for ${team.name}`);

                    // --- Market Value & Rating Heuristic ---
                    let baseMV = 50000000;
                    let eloStart = 1500;
                    let baseRating = 72; // Default Average

                    const superClubs = ['Manchester City', 'Real Madrid', 'Bayern München', 'Paris Saint-Germain', 'Arsenal', 'Liverpool'];
                    const topClubs = ['Borussia Dortmund', 'Bayer 04 Leverkusen', 'Inter', 'Juventus', 'AC Milan', 'FC Barcelona', 'Atlético Madrid', 'Tottenham Hotspur', 'Manchester United', 'Chelsea'];

                    if (superClubs.some(c => team.name.includes(c) || team.shortName === c)) {
                        baseMV = 900000000 + Math.random() * 200000000;
                        eloStart = 1900;
                        baseRating = 87; // Stars
                    } else if (topClubs.some(c => team.name.includes(c) || team.shortName === c)) {
                        baseMV = 500000000 + Math.random() * 200000000;
                        eloStart = 1750;
                        baseRating = 82; // Top Class
                    } else if (['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1'].includes(league.name)) {
                        baseMV = 150000000 + Math.random() * 100000000;
                        eloStart = 1600;
                        baseRating = 76; // Solid Pro
                    } else {
                        // Lower tier / other
                        baseRating = 69;
                    }

                    // Update Team (Added Market Value & Elo)
                    db.prepare(`
                        UPDATE teams SET 
                            market_value = ?, 
                            elo_rating = ?
                        WHERE id = ?
                    `).run(baseMV, eloStart, team.id);

                    for (const p of squad) {
                        // Calibrate Rating: Base + Variance (-4 to +5)
                        // Positional bias: FWDs slightly higher? No, keep simple.
                        const calibratedRating = Math.floor(baseRating + (Math.random() * 9 - 4));

                        insertPlayer.run(
                            team.id,
                            p.name,
                            p.position,
                            p.age,
                            calibratedRating, // Use new calibrated rating
                            p.number,
                            p.photo,
                            100, // fitness
                            0    // is_injured
                        );
                    }
                } else if (glCount < 11) {
                    const positions = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD', 'SUB', 'SUB', 'SUB', 'SUB'];
                    for (let i = 0; i < 25; i++) {
                        const pos = positions[i % positions.length];
                        const rating = Math.floor(team.mid + (Math.random() * 10 - 5));
                        const name = `${pos} Player ${i + 1}`;
                        insertPlayer.run(team.id, name, pos, 18 + Math.floor(Math.random() * 15), rating, null, null, 100, 0);
                    }
                }
            }
        }

        // 2. Process CHAMPIONS LEAGUE - STANDINGS ONLY (don't change team's league_id)
        if (championsLeague) {
            console.log(`Saving Champions League Standings (${championsLeague.teams.length} teams)...`);
            insertLeague.run(CL_ID, 'Champions League', 'tournament', '2024/2025', 'football');

            for (const team of championsLeague.teams) {
                // Check if team already exists from domestic league
                const existingTeam = checkTeamExists.get(team.id);

                if (!existingTeam) {
                    // Team not in any domestic league we track (e.g., other countries)
                    // Insert with CL as their "home" league
                    insertTeam.run(
                        team.id,
                        team.name,
                        CL_ID, // Only for teams we don't have domestic data for
                        team.att,
                        team.def,
                        team.mid,
                        team.mid,
                        team.logo
                    );

                    // Generate players for these teams too
                    const pCount = countPlayers.get(team.id).c;
                    if (pCount < 11) {
                        const positions = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD', 'SUB', 'SUB', 'SUB', 'SUB'];
                        for (let i = 0; i < 25; i++) {
                            const pos = positions[i % positions.length];
                            const skill = Math.floor(team.mid + (Math.random() * 10 - 5));
                            insertPlayer.run(team.id, `${pos} Player ${i + 1}`, pos, 18 + Math.floor(Math.random() * 15), skill, 100, 0);
                        }
                    }
                }

                // Always insert CL standings (separate from domestic)
                insertStanding.run(
                    CL_ID, // CL league ID for standings
                    team.id,
                    '2024/2025',
                    team.group, // GROUP A, GROUP B, etc.
                    team.stats.played || 0,
                    team.stats.wins || 0,
                    team.stats.draws || 0,
                    team.stats.losses || 0,
                    team.stats.gf || 0,
                    team.stats.ga || 0,
                    team.points || 0
                );
            }
        }

        // F1
        if (f1Data) {
            console.log("Saving F1 Data...");
            insertF1Team.run("unknown", "Unattached", 80, 0.9);

            for (const team of f1Data.teams) {
                insertF1Team.run(
                    team.id,
                    team.name,
                    team.perf,
                    team.reliability
                );
            }

            for (const driver of f1Data.drivers) {
                let tid = driver.teamId;
                const teamExists = f1Data.teams.some(t => t.id === tid);
                if (!teamExists && tid !== "unknown") {
                    insertF1Team.run(tid, "Team " + tid, 85, 0.9);
                }

                insertDriver.run(
                    driver.id,
                    driver.name,
                    tid,
                    driver.skill,
                    driver.points
                );
            }
        }

        // Save Fixtures
        console.log(`Saving ${fixturesData.length} fixtures...`);
        for (const fix of fixturesData) {
            insertMatch.run(
                fix.id,
                fix.leagueId,
                fix.homeTeamId,
                fix.awayTeamId,
                fix.matchday,
                fix.status,
                fix.utcDate
            );
        }
    });

    updateTx();
    console.log("DB Update Complete.");
    return { success: true };
}

module.exports = { updateAllData };

if (require.main === module) {
    // Initialize database first when running standalone
    db.initDb().then(() => {
        updateAllData().then(() => {
            process.exit(0);
        }).catch(err => {
            console.error('Update failed:', err);
            process.exit(1);
        });
    });
}
