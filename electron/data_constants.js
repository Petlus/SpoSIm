// electron/data_constants.js

const LEAGUE_PRESTIGE = {
    'PL': 1.0,   // Premier League
    'BL1': 0.95, // Bundesliga
    'PD': 0.98,  // La Liga
    'SA': 0.94,  // Serie A
    'FL1': 0.90, // Ligue 1
    'CL': 1.1    // Champions League
};

const LEAGUE_BASE_ELO = {
    'PL': 1600,
    'BL1': 1550,
    'PD': 1580,
    'SA': 1540,
    'FL1': 1500,
    'CL': 1650,
    'DEFAULT': 1450
};

// Market Values in EUR (Approximate - Feb 2026)
const TOP_TEAMS_MARKET_VALUE = {
    "Real Madrid": 1360000000,
    "Manchester City": 1270000000,
    "Arsenal": 1100000000,
    "Paris Saint-Germain": 1050000000,
    "Bayern München": 940000000,
    "Chelsea": 900000000,
    "Liverpool": 880000000,
    "FC Barcelona": 860000000,
    "Tottenham Hotspur": 800000000,
    "Manchester United": 750000000,
    "Inter": 650000000,
    "Bayer 04 Leverkusen": 600000000,
    "AC Milan": 550000000,
    "Aston Villa": 500000000,
    "Newcastle United": 480000000,
    "Juventus": 470000000,
    "Napoli": 450000000,
    "Borussia Dortmund": 450000000,
    "RB Leipzig": 430000000,
    "Atlético Madrid": 400000000,
    "Benfica": 380000000,
    "Sporting CP": 350000000,
    "Porto": 300000000,
    "Ajax": 250000000
};

module.exports = {
    LEAGUE_PRESTIGE,
    LEAGUE_BASE_ELO,
    TOP_TEAMS_MARKET_VALUE
};
