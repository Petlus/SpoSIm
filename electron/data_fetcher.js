const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const FOOTBALL_API_KEY = "083b1ae74d7d441d809ec0e0617efcb5";
const FOOTBALL_BASE_URL = "https://api.football-data.org/v4";
const F1_BASE_URL = "http://api.jolpi.ca/ergast/f1";

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
    const f1Data = await fetchF1Data();

    // Prepare Statements
    const insertLeague = db.prepare('INSERT OR REPLACE INTO leagues (id, name, type, current_season, sport) VALUES (?, ?, ?, ?, ?)');

    // Team Info only
    const insertTeam = db.prepare('INSERT OR REPLACE INTO teams (id, name, league_id, att, def, mid, prestige, logo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

    // Standings (Season Data)
    const insertStanding = db.prepare('INSERT OR REPLACE INTO standings (league_id, team_id, season, group_name, played, wins, draws, losses, gf, ga, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

    // Players
    const insertPlayer = db.prepare('INSERT INTO players (team_id, name, position, age, skill, fitness, is_injured) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const countPlayers = db.prepare('SELECT count(*) as c FROM players WHERE team_id = ?');

    const insertF1Team = db.prepare('INSERT OR REPLACE INTO f1_teams (id, name, perf, reliability) VALUES (?, ?, ?, ?)');
    const insertDriver = db.prepare('INSERT OR REPLACE INTO f1_drivers (id, name, team_id, skill, points) VALUES (?, ?, ?, ?, ?)');

    const updateTx = db.transaction(() => {
        // Football
        for (const league of footballData) {
            console.log(`Saving League: ${league.name}`);
            insertLeague.run(league.id, league.name, 'league', '2024/2025', 'football');

            for (const team of league.teams) {
                // Upsert Team Info
                insertTeam.run(
                    team.id,
                    team.name,
                    league.id,
                    team.att,
                    team.def,
                    team.mid,
                    team.mid, // Prestige proxied by rating
                    team.logo
                );

                // Upsert Standings (Season 2024/2025)
                insertStanding.run(
                    league.id,
                    team.id,
                    '2024/2025',
                    team.group, // Group Name (e.g. 'GROUP A')
                    team.stats.played || 0,
                    team.stats.wins || 0,
                    team.stats.draws || 0,
                    team.stats.losses || 0,
                    team.stats.gf || 0,
                    team.stats.ga || 0,
                    team.points || 0
                );

                // Generate Mock Players if None Exist
                const pCount = countPlayers.get(team.id).c;
                if (pCount < 11) {
                    const positions = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD', 'SUB', 'SUB', 'SUB', 'SUB'];
                    for (let i = 0; i < 25; i++) { // Generate 25 players
                        const pos = positions[i % positions.length];
                        const skill = Math.floor(team.mid + (Math.random() * 10 - 5));
                        const name = `${pos} Player ${i + 1}`; // Simple mock name
                        insertPlayer.run(team.id, name, pos, 18 + Math.floor(Math.random() * 15), skill, 100, 0);
                    }
                }
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
    });

    updateTx();
    console.log("DB Update Complete.");
    return { success: true };
}

module.exports = { updateAllData };

if (require.main === module) {
    updateAllData();
}
