const axios = require('axios');
const API_KEY = "22700030a1c824d8eb278bb5951f2a87";
const BASE_URL = "https://v3.football.api-sports.io";

async function checkStandings() {
    try {
        const headers = { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' };

        console.log("Checking Bundesliga (78) Standings 2025...");
        const res = await axios.get(`${BASE_URL}/standings`, {
            params: { league: 78, season: 2025 },
            headers
        });

        if (res.data.errors.length > 0 || Object.keys(res.data.errors).length > 0) {
            console.log("API Errors:", JSON.stringify(res.data.errors, null, 2));
        } else {
            console.log("Results count:", res.data.results);
            if (res.data.response.length > 0) {
                console.log("First Team:", JSON.stringify(res.data.response[0].league.standings[0][0], null, 2));
            } else {
                console.log("Response is empty array []");
            }
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkStandings();
