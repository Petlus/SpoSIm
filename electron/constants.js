// electron/constants.js

const CURRENT_SEASON = 2025; // Saison 2025/2026

const LEAGUES = {
    'BL1': { id: 2002, name: 'Bundesliga', prestige: 0.95 },   // 18 Teams
    'PL': { id: 2021, name: 'Premier League', prestige: 1.0 }, // 20 Teams
    'PD': { id: 2014, name: 'La Liga', prestige: 0.98 },       // 20 Teams
    'SA': { id: 2019, name: 'Serie A', prestige: 0.94 },       // 20 Teams
    'FL1': { id: 2015, name: 'Ligue 1', prestige: 0.90 },      // 18 Teams
    'CL': { id: 2001, name: 'Champions League', prestige: 1.1 }
};

const TEAMS = [
    // === BUNDESLIGA 25/26 (inkl. Rückkehrer HSV & Köln) ===
    { id: 5, name: "Bayern München", leagueCode: 'BL1', marketValue: 980000000, elo: 1910, logo: "https://crests.football-data.org/5.png" },
    { id: 3, name: "Bayer 04 Leverkusen", leagueCode: 'BL1', marketValue: 650000000, elo: 1820, logo: "https://crests.football-data.org/3.png" },
    { id: 4, name: "Borussia Dortmund", leagueCode: 'BL1', marketValue: 480000000, elo: 1750, logo: "https://crests.football-data.org/4.png" },
    { id: 721, name: "RB Leipzig", leagueCode: 'BL1', marketValue: 450000000, elo: 1740, logo: "https://crests.football-data.org/721.png" },
    { id: 10, name: "VfB Stuttgart", leagueCode: 'BL1', marketValue: 310000000, elo: 1680, logo: "https://crests.football-data.org/10.png" },
    { id: 19, name: "Eintracht Frankfurt", leagueCode: 'BL1', marketValue: 270000000, elo: 1640, logo: "https://crests.football-data.org/19.png" },
    { id: 17, name: "SC Freiburg", leagueCode: 'BL1', marketValue: 190000000, elo: 1590, logo: "https://crests.football-data.org/17.png" },
    { id: 18, name: "Borussia M'gladbach", leagueCode: 'BL1', marketValue: 170000000, elo: 1570, logo: "https://crests.football-data.org/18.png" },
    { id: 12, name: "Werder Bremen", leagueCode: 'BL1', marketValue: 110000000, elo: 1540, logo: "https://crests.football-data.org/12.png" },
    { id: 11, name: "VfL Wolfsburg", leagueCode: 'BL1', marketValue: 210000000, elo: 1580, logo: "https://crests.football-data.org/11.png" },
    { id: 16, name: "FC Augsburg", leagueCode: 'BL1', marketValue: 100000000, elo: 1520, logo: "https://crests.football-data.org/16.png" },
    { id: 15, name: "1. FC Union Berlin", leagueCode: 'BL1', marketValue: 130000000, elo: 1550, logo: "https://crests.football-data.org/15.png" },
    { id: 2, name: "TSG Hoffenheim", leagueCode: 'BL1', marketValue: 150000000, elo: 1560, logo: "https://crests.football-data.org/2.png" },
    { id: 44, name: "1. FSV Mainz 05", leagueCode: 'BL1', marketValue: 115000000, elo: 1530, logo: "https://crests.football-data.org/44.png" },
    { id: 1, name: "1. FC Köln", leagueCode: 'BL1', marketValue: 120000000, elo: 1510, logo: "https://crests.football-data.org/1.png" }, // Aufsteiger
    { id: 32, name: "Hamburger SV", leagueCode: 'BL1', marketValue: 95000000, elo: 1500, logo: "https://crests.football-data.org/32.png" }, // Aufsteiger
    { id: 28, name: "1. FC Heidenheim", leagueCode: 'BL1', marketValue: 65000000, elo: 1480, logo: "https://crests.football-data.org/28.png" },
    { id: 31, name: "FC St. Pauli", leagueCode: 'BL1', marketValue: 45000000, elo: 1440, logo: "https://crests.football-data.org/31.png" },

    // === PREMIER LEAGUE 25/26 (inkl. Leeds, Burnley & Sunderland) ===
    { id: 65, name: "Manchester City", leagueCode: 'PL', marketValue: 1300000000, elo: 1980, logo: "https://crests.football-data.org/65.png" },
    { id: 57, name: "Arsenal FC", leagueCode: 'PL', marketValue: 1150000000, elo: 1950, logo: "https://crests.football-data.org/57.png" },
    { id: 64, name: "Liverpool FC", leagueCode: 'PL', marketValue: 950000000, elo: 1940, logo: "https://crests.football-data.org/64.png" },
    { id: 61, name: "Chelsea FC", leagueCode: 'PL', marketValue: 980000000, elo: 1820, logo: "https://crests.football-data.org/61.png" },
    { id: 73, name: "Tottenham Hotspur", leagueCode: 'PL', marketValue: 820000000, elo: 1810, logo: "https://crests.football-data.org/73.png" },
    { id: 66, name: "Manchester United", leagueCode: 'PL', marketValue: 780000000, elo: 1790, logo: "https://crests.football-data.org/66.png" },
    { id: 67, name: "Newcastle United", leagueCode: 'PL', marketValue: 680000000, elo: 1780, logo: "https://crests.football-data.org/67.png" },
    { id: 58, name: "Aston Villa", leagueCode: 'PL', marketValue: 620000000, elo: 1770, logo: "https://crests.football-data.org/58.png" },
    { id: 341, name: "Leeds United", leagueCode: 'PL', marketValue: 250000000, elo: 1620, logo: "https://crests.football-data.org/341.png" }, // Aufsteiger
    { id: 328, name: "Burnley FC", leagueCode: 'PL', marketValue: 200000000, elo: 1590, logo: "https://crests.football-data.org/328.png" }, // Aufsteiger
    { id: 56, name: "Sunderland AFC", leagueCode: 'PL', marketValue: 140000000, elo: 1560, logo: "https://crests.football-data.org/56.png" }, // Aufsteiger
    { id: 62, name: "Everton FC", leagueCode: 'PL', marketValue: 270000000, elo: 1610, logo: "https://crests.football-data.org/62.png" },
    { id: 354, name: "Crystal Palace", leagueCode: 'PL', marketValue: 340000000, elo: 1640, logo: "https://crests.football-data.org/354.png" },
    { id: 397, name: "Brighton & Hove Albion", leagueCode: 'PL', marketValue: 500000000, elo: 1720, logo: "https://crests.football-data.org/397.png" },
    { id: 563, name: "West Ham United", leagueCode: 'PL', marketValue: 460000000, elo: 1690, logo: "https://crests.football-data.org/563.png" },
    { id: 76, name: "Wolverhampton Wanderers", leagueCode: 'PL', marketValue: 360000000, elo: 1660, logo: "https://crests.football-data.org/76.png" },
    { id: 402, name: "Brentford FC", leagueCode: 'PL', marketValue: 320000000, elo: 1650, logo: "https://crests.football-data.org/402.png" },
    { id: 63, name: "Fulham FC", leagueCode: 'PL', marketValue: 330000000, elo: 1640, logo: "https://crests.football-data.org/63.png" },
    { id: 351, name: "Nottingham Forest", leagueCode: 'PL', marketValue: 290000000, elo: 1620, logo: "https://crests.football-data.org/351.png" },
    { id: 59, name: "Bournemouth", leagueCode: 'PL', marketValue: 310000000, elo: 1630, logo: "https://crests.football-data.org/59.png" },

    // === LA LIGA 25/26 (inkl. Oviedo & Levante) ===
    { id: 86, name: "Real Madrid", leagueCode: 'PD', marketValue: 1400000000, elo: 1980, logo: "https://crests.football-data.org/86.png" },
    { id: 81, name: "FC Barcelona", leagueCode: 'PD', marketValue: 880000000, elo: 1910, logo: "https://crests.football-data.org/81.png" },
    { id: 78, name: "Atlético de Madrid", leagueCode: 'PD', marketValue: 420000000, elo: 1790, logo: "https://crests.football-data.org/78.png" },
    { id: 94, name: "Villarreal CF", leagueCode: 'PD', marketValue: 230000000, elo: 1690, logo: "https://crests.football-data.org/94.png" },
    { id: 90, name: "Real Betis", leagueCode: 'PD', marketValue: 230000000, elo: 1680, logo: "https://crests.football-data.org/90.png" },
    { id: 558, name: "Espanyol Barcelona", leagueCode: 'PD', marketValue: 110000000, elo: 1600, logo: "https://crests.football-data.org/558.png" },
    { id: 77, name: "Athletic Club", leagueCode: 'PD', marketValue: 320000000, elo: 1720, logo: "https://crests.football-data.org/77.png" },
    { id: 82, name: "Getafe CF", leagueCode: 'PD', marketValue: 100000000, elo: 1590, logo: "https://crests.football-data.org/82.png" },
    { id: 559, name: "Sevilla FC", leagueCode: 'PD', marketValue: 210000000, elo: 1670, logo: "https://crests.football-data.org/559.png" },
    { id: 263, name: "Deportivo Alavés", leagueCode: 'PD', marketValue: 75000000, elo: 1550, logo: "https://crests.football-data.org/263.png" },
    { id: 285, name: "Elche CF", leagueCode: 'PD', marketValue: 60000000, elo: 1530, logo: "https://crests.football-data.org/285.png" },
    { id: 87, name: "Rayo Vallecano", leagueCode: 'PD', marketValue: 90000000, elo: 1580, logo: "https://crests.football-data.org/87.png" },
    { id: 264, name: "Celta de Vigo", leagueCode: 'PD', marketValue: 130000000, elo: 1620, logo: "https://crests.football-data.org/264.png" },
    { id: 92, name: "Real Sociedad", leagueCode: 'PD', marketValue: 390000000, elo: 1730, logo: "https://crests.football-data.org/92.png" },
    { id: 89, name: "RCD Mallorca", leagueCode: 'PD', marketValue: 95000000, elo: 1580, logo: "https://crests.football-data.org/89.png" },
    { id: 267, name: "CA Osasuna", leagueCode: 'PD', marketValue: 135000000, elo: 1610, logo: "https://crests.football-data.org/267.png" },
    { id: 95, name: "Valencia CF", leagueCode: 'PD', marketValue: 190000000, elo: 1650, logo: "https://crests.football-data.org/95.png" },
    { id: 298, name: "Girona FC", leagueCode: 'PD', marketValue: 260000000, elo: 1700, logo: "https://crests.football-data.org/298.png" },
    { id: 310, name: "Real Oviedo", leagueCode: 'PD', marketValue: 40000000, elo: 1510, logo: "https://crests.football-data.org/310.png" }, // Aufsteiger
    { id: 280, name: "UD Levante", leagueCode: 'PD', marketValue: 55000000, elo: 1520, logo: "https://crests.football-data.org/280.png" }, // Aufsteiger

    // === SERIE A 25/26 (inkl. Cremonese & Pisa) ===
    { id: 108, name: "Inter Milan", leagueCode: 'SA', marketValue: 680000000, elo: 1860, logo: "https://crests.football-data.org/108.png" },
    { id: 113, name: "SSC Napoli", leagueCode: 'SA', marketValue: 460000000, elo: 1770, logo: "https://crests.football-data.org/113.png" },
    { id: 115, name: "Atalanta BC", leagueCode: 'SA', marketValue: 390000000, elo: 1750, logo: "https://crests.football-data.org/115.png" },
    { id: 109, name: "Juventus FC", leagueCode: 'SA', marketValue: 480000000, elo: 1790, logo: "https://crests.football-data.org/109.png" },
    { id: 98, name: "AC Milan", leagueCode: 'SA', marketValue: 560000000, elo: 1810, logo: "https://crests.football-data.org/98.png" },
    { id: 100, name: "AS Roma", leagueCode: 'SA', marketValue: 360000000, elo: 1710, logo: "https://crests.football-data.org/100.png" },
    { id: 102, name: "SS Lazio", leagueCode: 'SA', marketValue: 310000000, elo: 1700, logo: "https://crests.football-data.org/102.png" },
    { id: 99, name: "ACF Fiorentina", leagueCode: 'SA', marketValue: 260000000, elo: 1690, logo: "https://crests.football-data.org/99.png" },
    { id: 110, name: "Bologna FC", leagueCode: 'SA', marketValue: 210000000, elo: 1660, logo: "https://crests.football-data.org/110.png" },
    { id: 103, name: "Torino FC", leagueCode: 'SA', marketValue: 185000000, elo: 1650, logo: "https://crests.football-data.org/103.png" },
    { id: 470, name: "Udinese Calcio", leagueCode: 'SA', marketValue: 115000000, elo: 1590, logo: "https://crests.football-data.org/470.png" },
    { id: 107, name: "Genoa CFC", leagueCode: 'SA', marketValue: 135000000, elo: 1610, logo: "https://crests.football-data.org/107.png" },
    { id: 586, name: "Como 1907", leagueCode: 'SA', marketValue: 110000000, elo: 1570, logo: "https://crests.football-data.org/586.png" },
    { id: 450, name: "Parma Calcio", leagueCode: 'SA', marketValue: 90000000, elo: 1560, logo: "https://crests.football-data.org/450.png" },
    { id: 104, name: "Hellas Verona", leagueCode: 'SA', marketValue: 75000000, elo: 1540, logo: "https://crests.football-data.org/104.png" },
    { id: 5890, name: "Lecce", leagueCode: 'SA', marketValue: 85000000, elo: 1550, logo: "https://crests.football-data.org/5890.png" },
    { id: 112, name: "Cagliari Calcio", leagueCode: 'SA', marketValue: 90000000, elo: 1550, logo: "https://crests.football-data.org/112.png" },
    { id: 488, name: "Sassuolo Calcio", leagueCode: 'SA', marketValue: 140000000, elo: 1610, logo: "https://crests.football-data.org/488.png" }, // Rückkehrer
    { id: 452, name: "US Cremonese", leagueCode: 'SA', marketValue: 65000000, elo: 1520, logo: "https://crests.football-data.org/452.png" }, // Aufsteiger
    { id: 1107, name: "Pisa SC", leagueCode: 'SA', marketValue: 50000000, elo: 1510, logo: "https://crests.football-data.org/1107.png" }, // Aufsteiger

    // === LIGUE 1 25/26 (inkl. Lorient & Paris FC) ===
    { id: 524, name: "Paris Saint-Germain", leagueCode: 'FL1', marketValue: 1100000000, elo: 1900, logo: "https://crests.football-data.org/524.png" },
    { id: 516, name: "Olympique de Marseille", leagueCode: 'FL1', marketValue: 280000000, elo: 1680, logo: "https://crests.football-data.org/516.png" },
    { id: 546, name: "RC Lens", leagueCode: 'FL1', marketValue: 230000000, elo: 1650, logo: "https://crests.football-data.org/546.png" },
    { id: 523, name: "Olympique Lyonnais", leagueCode: 'FL1', marketValue: 250000000, elo: 1670, logo: "https://crests.football-data.org/523.png" },
    { id: 521, name: "Lille OSC", leagueCode: 'FL1', marketValue: 290000000, elo: 1690, logo: "https://crests.football-data.org/521.png" },
    { id: 529, name: "Stade Rennais FC", leagueCode: 'FL1', marketValue: 260000000, elo: 1660, logo: "https://crests.football-data.org/529.png" },
    { id: 576, name: "RC Strasbourg", leagueCode: 'FL1', marketValue: 120000000, elo: 1570, logo: "https://crests.football-data.org/576.png" },
    { id: 511, name: "Toulouse FC", leagueCode: 'FL1', marketValue: 125000000, elo: 1560, logo: "https://crests.football-data.org/511.png" },
    { id: 527, name: "FC Lorient", leagueCode: 'FL1', marketValue: 80000000, elo: 1530, logo: "https://crests.football-data.org/527.png" }, // Aufsteiger
    { id: 548, name: "AS Monaco", leagueCode: 'FL1', marketValue: 390000000, elo: 1720, logo: "https://crests.football-data.org/548.png" },
    { id: 528, name: "Angers SCO", leagueCode: 'FL1', marketValue: 40000000, elo: 1470, logo: "https://crests.football-data.org/528.png" },
    { id: 512, name: "Stade Brestois 29", leagueCode: 'FL1', marketValue: 110000000, elo: 1590, logo: "https://crests.football-data.org/512.png" },
    { id: 522, name: "OGC Nice", leagueCode: 'FL1', marketValue: 290000000, elo: 1690, logo: "https://crests.football-data.org/522.png" },
    { id: 5472, name: "Paris FC", leagueCode: 'FL1', marketValue: 45000000, elo: 1510, logo: "https://crests.football-data.org/5472.png" }, // Aufsteiger
    { id: 374, name: "Le Havre AC", leagueCode: 'FL1', marketValue: 65000000, elo: 1520, logo: "https://crests.football-data.org/374.png" },
    { id: 525, name: "Stade de Reims", leagueCode: 'FL1', marketValue: 135000000, elo: 1600, logo: "https://crests.football-data.org/525.png" },
    { id: 541, name: "AS Saint-Étienne", leagueCode: 'FL1', marketValue: 55000000, elo: 1510, logo: "https://crests.football-data.org/541.png" },
    { id: 510, name: "FC Metz", leagueCode: 'FL1', marketValue: 60000000, elo: 1520, logo: "https://crests.football-data.org/510.png" }, // Relegations-Sieger

    // === CHAMPIONS LEAGUE 25/26 (New Format - 36 Teams) ===
    { id: 65, name: "Manchester City", leagueCode: 'CL', marketValue: 1300000000, elo: 1980, logo: "https://crests.football-data.org/65.png" },
    { id: 86, name: "Real Madrid", leagueCode: 'CL', marketValue: 1400000000, elo: 1980, logo: "https://crests.football-data.org/86.png" },
    { id: 57, name: "Arsenal FC", leagueCode: 'CL', marketValue: 1150000000, elo: 1950, logo: "https://crests.football-data.org/57.png" },
    { id: 64, name: "Liverpool FC", leagueCode: 'CL', marketValue: 950000000, elo: 1940, logo: "https://crests.football-data.org/64.png" },
    { id: 81, name: "FC Barcelona", leagueCode: 'CL', marketValue: 880000000, elo: 1910, logo: "https://crests.football-data.org/81.png" },
    { id: 5, name: "Bayern München", leagueCode: 'CL', marketValue: 980000000, elo: 1910, logo: "https://crests.football-data.org/5.png" },
    { id: 524, name: "Paris Saint-Germain", leagueCode: 'CL', marketValue: 1100000000, elo: 1900, logo: "https://crests.football-data.org/524.png" },
    { id: 108, name: "Inter Milan", leagueCode: 'CL', marketValue: 680000000, elo: 1860, logo: "https://crests.football-data.org/108.png" },
    { id: 3, name: "Bayer 04 Leverkusen", leagueCode: 'CL', marketValue: 650000000, elo: 1820, logo: "https://crests.football-data.org/3.png" },
    { id: 61, name: "Chelsea FC", leagueCode: 'CL', marketValue: 980000000, elo: 1820, logo: "https://crests.football-data.org/61.png" },
    { id: 73, name: "Tottenham Hotspur", leagueCode: 'CL', marketValue: 820000000, elo: 1810, logo: "https://crests.football-data.org/73.png" },
    { id: 109, name: "Juventus FC", leagueCode: 'CL', marketValue: 480000000, elo: 1790, logo: "https://crests.football-data.org/109.png" },
    { id: 78, name: "Atlético de Madrid", leagueCode: 'CL', marketValue: 420000000, elo: 1790, logo: "https://crests.football-data.org/78.png" },
    { id: 1903, name: "Sporting CP", leagueCode: 'CL', marketValue: 450000000, elo: 1790, logo: "https://crests.football-data.org/1903.png" },
    { id: 67, name: "Newcastle United", leagueCode: 'CL', marketValue: 680000000, elo: 1780, logo: "https://crests.football-data.org/67.png" },
    { id: 113, name: "SSC Napoli", leagueCode: 'CL', marketValue: 460000000, elo: 1770, logo: "https://crests.football-data.org/113.png" },
    { id: 1904, name: "Benfica", leagueCode: 'CL', marketValue: 410000000, elo: 1760, logo: "https://crests.football-data.org/1904.png" },
    { id: 4, name: "Borussia Dortmund", leagueCode: 'CL', marketValue: 480000000, elo: 1750, logo: "https://crests.football-data.org/4.png" },
    { id: 115, name: "Atalanta BC", leagueCode: 'CL', marketValue: 390000000, elo: 1750, logo: "https://crests.football-data.org/115.png" },
    { id: 674, name: "PSV Eindhoven", leagueCode: 'CL', marketValue: 320000000, elo: 1730, logo: "https://crests.football-data.org/674.png" },
    { id: 77, name: "Athletic Club", leagueCode: 'CL', marketValue: 320000000, elo: 1720, logo: "https://crests.football-data.org/77.png" },
    { id: 548, name: "AS Monaco", leagueCode: 'CL', marketValue: 390000000, elo: 1720, logo: "https://crests.football-data.org/548.png" },
    { id: 610, name: "Galatasaray", leagueCode: 'CL', marketValue: 280000000, elo: 1720, logo: "https://crests.football-data.org/610.png" },
    { id: 94, name: "Villarreal CF", leagueCode: 'CL', marketValue: 230000000, elo: 1690, logo: "https://crests.football-data.org/94.png" },
    { id: 516, name: "Olympique de Marseille", leagueCode: 'CL', marketValue: 280000000, elo: 1680, logo: "https://crests.football-data.org/516.png" },
    { id: 678, name: "Ajax", leagueCode: 'CL', marketValue: 240000000, elo: 1680, logo: "https://crests.football-data.org/678.png" },
    { id: 654, name: "Club Brugge", leagueCode: 'CL', marketValue: 190000000, elo: 1680, logo: "https://crests.football-data.org/654.png" },
    { id: 10211, name: "Olympiacos", leagueCode: 'CL', marketValue: 110000000, elo: 1650, logo: "https://crests.football-data.org/olympiacos.png" },
    { id: 19, name: "Eintracht Frankfurt", leagueCode: 'CL', marketValue: 270000000, elo: 1640, logo: "https://crests.football-data.org/19.png" },
    { id: 1873, name: "Slavia Prague", leagueCode: 'CL', marketValue: 105000000, elo: 1640, logo: "https://crests.football-data.org/1873.png" },
    { id: 675, name: "FC København", leagueCode: 'CL', marketValue: 90000000, elo: 1630, logo: "https://crests.football-data.org/675.png" },
    { id: 1021, name: "Bodø/Glimt", leagueCode: 'CL', marketValue: 45000000, elo: 1610, logo: "https://crests.football-data.org/1021.png" },
    { id: 682, name: "Union St.Gilloise", leagueCode: 'CL', marketValue: 85000000, elo: 1600, logo: "https://crests.football-data.org/682.png" },
    { id: 1030, name: "Qarabag FK", leagueCode: 'CL', marketValue: 25000000, elo: 1580, logo: "https://crests.football-data.org/1030.png" },
    { id: 10242, name: "Pafos FC", leagueCode: 'CL', marketValue: 20000000, elo: 1510, logo: "https://crests.football-data.org/pafos.png" },
    { id: 10360, name: "Kairat Almaty", leagueCode: 'CL', marketValue: 15000000, elo: 1480, logo: "https://crests.football-data.org/kairat.png" }
];

module.exports = {
    CURRENT_SEASON,
    LEAGUES,
    TEAMS
};