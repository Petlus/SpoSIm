const axios = require('axios');
const API_KEY = "083b1ae74d7d441d809ec0e0617efcb5";

async function checkFootballDataOrg() {
    try {
        const headers = { 'X-Auth-Token': API_KEY };
        const BASE_URL = "https://api.football-data.org/v4";

        console.log("Checking API Key against football-data.org...");

        // Competitions: BL1 (Bundesliga), PL (Premier League)
        console.log("Fetching Bundesliga (BL1) Standings for 2025/2026...");
        // football-data.org uses 'current' season by default usually
        const res = await axios.get(`${BASE_URL}/competitions/BL1/standings`, { headers });

        console.log("Season:", res.data.season.startDate, "to", res.data.season.endDate);
        console.log("Current Matchday:", res.data.season.currentMatchday);

        const table = res.data.standings.find(s => s.type === 'TOTAL')?.table;
        if (table && table.length > 0) {
            console.log(`Found ${table.length} teams.`);
            console.log("Top Team:", table[0].team.name, "Points:", table[0].points);
        } else {
            console.log("No table found.");
        }

    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) console.error("Response:", JSON.stringify(e.response.data, null, 2));
    }
}

checkFootballDataOrg();
