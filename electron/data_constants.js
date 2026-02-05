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

// Base ratings for stars - manual overrides for accurate ratings
const PLAYER_RATING_MAP = {
    // === WORLD CLASS (90+) ===
    "Erling Haaland": 91,
    "Kylian Mbappé": 91,
    "Vinicius Junior": 90,
    "Rodri": 90,
    "Harry Kane": 90,
    
    // === ELITE (87-89) ===
    "Jude Bellingham": 89,
    "Jamal Musiala": 89,
    "Kevin De Bruyne": 89,
    "Robert Lewandowski": 88,
    "Mohamed Salah": 88,
    "Florian Wirtz": 88,
    "Phil Foden": 88,
    "Lamine Yamal": 88,
    "Lautaro Martínez": 88,
    "Thibaut Courtois": 88,
    "Lionel Messi": 88,
    "Bukayo Saka": 87,
    "Declan Rice": 87,
    "Federico Valverde": 87,
    "Virgil van Dijk": 87,
    "Marc-André ter Stegen": 87,
    "Alisson Becker": 87,
    
    // === TOP TIER (85-86) ===
    "Rodrygo": 86,
    "Victor Osimhen": 86,
    "Manuel Neuer": 86,
    "Antonio Rüdiger": 86,
    "Luka Modrić": 86,
    "Cristiano Ronaldo": 86,
    "Bruno Fernandes": 86,
    "Bernardo Silva": 86,
    "Pedri": 86,
    "Gavi": 85,
    "Thomas Müller": 85,
    "Joshua Kimmich": 85,
    "Alphonso Davies": 85,
    "Ousmane Dembélé": 85,
    "Rúben Dias": 85,
    "Ederson": 85,
    "Trent Alexander-Arnold": 85,
    "Andrew Robertson": 85,
    
    // === BUNDESLIGA STARS ===
    "Xavi Simons": 84,
    "Leroy Sané": 84,
    "Serge Gnabry": 83,
    "Kingsley Coman": 83,
    "Leon Goretzka": 83,
    "Dayot Upamecano": 83,
    "Jonathan Tah": 83,
    "Granit Xhaka": 83,
    "Jeremie Frimpong": 83,
    "Nico Schlotterbeck": 82,
    "Deniz Undav": 82,
    "Xaver Schlager": 81,
    "Omar Marmoush": 82,
    "Alejandro Grimaldo": 83,
    "Exequiel Palacios": 82,
    
    // === PREMIER LEAGUE STARS ===
    "Martin Ødegaard": 86,
    "Marcus Rashford": 84,
    "Casemiro": 84,
    "Heung-min Son": 85,
    "Cole Palmer": 85,
    "Enzo Fernández": 84,
    "Moises Caicedo": 83,
    "William Saliba": 85,
    "Gabriel Magalhães": 84,
    "Ollie Watkins": 84,
    "Dominik Szoboszlai": 83,
    "Luis Díaz": 84,
    "Darwin Núñez": 83,
    "Alexander Isak": 85,
    "Anthony Gordon": 82,
    "Sandro Tonali": 83,
    "Bruno Guimarães": 84,
    
    // === LA LIGA STARS ===
    "Antoine Griezmann": 85,
    "Álvaro Morata": 83,
    "Dani Carvajal": 85,
    "Aurélien Tchouaméni": 84,
    "Eduardo Camavinga": 84,
    "Fermín López": 82,
    "Raphinha": 84,
    "Pau Cubarsí": 82,
    "Alejandro Balde": 82,
    "Frenkie de Jong": 84,
    "Mikel Merino": 83,
    "Nico Williams": 84,
    
    // === SERIE A STARS ===
    "Khvicha Kvaratskhelia": 85,
    "Rafael Leão": 85,
    "Nicolò Barella": 86,
    "Alessandro Bastoni": 85,
    "Theo Hernández": 85,
    "Paulo Dybala": 84,
    "Dušan Vlahović": 84,
    "Hakan Çalhanoğlu": 84,
    "Federico Chiesa": 83,
    "Marcus Thuram": 84,
    "Ademola Lookman": 83,
    
    // === LIGUE 1 STARS ===
    "Achraf Hakimi": 85,
    "Marquinhos": 85,
    "Ousmane Dembélé": 85,
    "Randal Kolo Muani": 83,
    "Bradley Barcola": 82,
    "Warren Zaïre-Emery": 82,
    "Jonathan David": 84,
    "Wissam Ben Yedder": 82,
};

// Form bonus: +1 to +3 exceptional form, -2 to -1 poor form. Names as from API.
const PLAYER_FORM_BONUS = {
    "Harry Kane": 2,   // Dominating Bundesliga
    "Florian Wirtz": 1,
    "Jamal Musiala": 1,
    "Victor Osimhen": -1,
    "Mohamed Salah": -1,
};

// Market Values in EUR (Approximate - Feb 2026)
const TOP_TEAMS_MARKET_VALUE = {
    // === TOP CLUBS ===
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
    
    // === BUNDESLIGA ===
    "Bayer 04 Leverkusen": 600000000,
    "Borussia Dortmund": 450000000,
    "RB Leipzig": 430000000,
    "VfB Stuttgart": 380000000,
    "Eintracht Frankfurt": 320000000,
    "VfL Wolfsburg": 280000000,
    "SC Freiburg": 240000000,
    "Borussia Mönchengladbach": 220000000,
    "TSG Hoffenheim": 200000000,
    "1. FC Union Berlin": 180000000,
    "Werder Bremen": 160000000,
    "FC Augsburg": 130000000,
    "1. FSV Mainz 05": 120000000,
    "VfL Bochum 1848": 80000000,
    "1. FC Heidenheim 1846": 70000000,
    "FC St. Pauli": 65000000,
    "Holstein Kiel": 45000000,
    "1. FC Köln": 140000000,
    "Hamburger SV": 90000000,
    
    // === PREMIER LEAGUE ===
    "Inter": 650000000,
    "AC Milan": 550000000,
    "Aston Villa": 500000000,
    "Newcastle United": 480000000,
    "Brighton & Hove Albion": 450000000,
    "West Ham United": 420000000,
    "Crystal Palace": 350000000,
    "Fulham FC": 320000000,
    "Wolverhampton Wanderers": 300000000,
    "Brentford FC": 280000000,
    "AFC Bournemouth": 260000000,
    "Nottingham Forest": 250000000,
    "Everton FC": 240000000,
    "Leicester City": 230000000,
    "Ipswich Town": 120000000,
    "Southampton FC": 180000000,
    
    // === LA LIGA ===
    "Atlético Madrid": 400000000,
    "Villarreal CF": 350000000,
    "Sevilla FC": 320000000,
    "Real Sociedad": 300000000,
    "Real Betis": 280000000,
    "Athletic Club": 350000000,
    "Girona FC": 250000000,
    "Valencia CF": 200000000,
    "RC Celta de Vigo": 150000000,
    "CA Osasuna": 120000000,
    "Getafe CF": 100000000,
    "Rayo Vallecano": 90000000,
    "RCD Espanyol": 80000000,
    "UD Las Palmas": 70000000,
    "RCD Mallorca": 110000000,
    "Deportivo Alavés": 65000000,
    "Real Valladolid": 55000000,
    "CD Leganés": 50000000,
    
    // === SERIE A ===
    "Juventus": 470000000,
    "Napoli": 450000000,
    "AS Roma": 380000000,
    "SS Lazio": 300000000,
    "Atalanta BC": 400000000,
    "ACF Fiorentina": 280000000,
    "Bologna FC 1909": 250000000,
    "Torino FC": 180000000,
    "Udinese Calcio": 150000000,
    "Genoa CFC": 120000000,
    "Cagliari Calcio": 100000000,
    "Hellas Verona": 90000000,
    "Empoli FC": 80000000,
    "AC Monza": 110000000,
    "US Lecce": 85000000,
    "Parma Calcio 1913": 95000000,
    "Como 1907": 70000000,
    "Venezia FC": 60000000,
    
    // === LIGUE 1 ===
    "AS Monaco": 420000000,
    "Olympique de Marseille": 350000000,
    "Olympique Lyonnais": 320000000,
    "LOSC Lille": 300000000,
    "OGC Nice": 250000000,
    "RC Lens": 230000000,
    "Stade Rennais FC": 220000000,
    "RC Strasbourg Alsace": 150000000,
    "FC Nantes": 130000000,
    "Montpellier HSC": 110000000,
    "Toulouse FC": 140000000,
    "Stade de Reims": 100000000,
    "Le Havre AC": 80000000,
    "Angers SCO": 70000000,
    "AS Saint-Étienne": 90000000,
    "AJ Auxerre": 65000000,
    "Stade Brestois 29": 150000000,
    
    // === PORTUGUESE / DUTCH ===
    "Benfica": 380000000,
    "Sporting CP": 350000000,
    "Porto": 300000000,
    "Ajax": 250000000
};

/**
 * Kicker.de Squad Data (manually extracted)
 * Format: teamName -> [{ name, position, kickerNote, goals }]
 * Kicker Note: 1.0 = best, 6.0 = worst (German school grades)
 * Rating conversion: 95 - (note - 1) * 9
 */
const KICKER_SQUADS = {
    "Borussia Dortmund": [
        // Goalkeepers
        { name: "Gregor Kobel", position: "GK", kickerNote: 2.90, goals: 0 },
        { name: "Alexander Meyer", position: "GK", kickerNote: null, goals: 0 },
        // Defenders
        { name: "Waldemar Anton", position: "DEF", kickerNote: 2.97, goals: 2 },
        { name: "Ramy Bensebaini", position: "DEF", kickerNote: 2.85, goals: 1 },
        { name: "Emre Can", position: "DEF", kickerNote: 3.07, goals: 3 },
        { name: "Nico Schlotterbeck", position: "DEF", kickerNote: 2.88, goals: 3 },
        { name: "Niklas Süle", position: "DEF", kickerNote: 3.70, goals: 0 },
        { name: "Julian Ryerson", position: "DEF", kickerNote: 3.36, goals: 0 },
        { name: "Daniel Svensson", position: "DEF", kickerNote: 3.62, goals: 1 },
        { name: "Yan Couto", position: "DEF", kickerNote: 3.25, goals: 1 },
        // Midfielders
        { name: "Jobe Bellingham", position: "MID", kickerNote: 3.60, goals: 0 },
        { name: "Julian Brandt", position: "MID", kickerNote: 3.27, goals: 5 },
        { name: "Carney Chukwuemeka", position: "MID", kickerNote: 3.67, goals: 2 },
        { name: "Felix Nmecha", position: "MID", kickerNote: 3.03, goals: 2 },
        { name: "Marcel Sabitzer", position: "MID", kickerNote: 3.15, goals: 1 },
        // Forwards
        { name: "Karim Adeyemi", position: "FW", kickerNote: 3.29, goals: 5 },
        { name: "Maximilian Beier", position: "FW", kickerNote: 3.42, goals: 6 },
        { name: "Serhou Guirassy", position: "FW", kickerNote: 3.59, goals: 8 },
        { name: "Fabio Silva", position: "FW", kickerNote: 3.30, goals: 0 }
    ],
    "FC Bayern München": [
        // Goalkeepers
        { name: "Manuel Neuer", position: "GK", kickerNote: 2.50, goals: 0 },
        { name: "Sven Ulreich", position: "GK", kickerNote: null, goals: 0 },
        // Defenders
        { name: "Dayot Upamecano", position: "DEF", kickerNote: 3.20, goals: 1 },
        { name: "Min-jae Kim", position: "DEF", kickerNote: 2.80, goals: 0 },
        { name: "Alphonso Davies", position: "DEF", kickerNote: 3.10, goals: 1 },
        { name: "Joshua Kimmich", position: "DEF", kickerNote: 2.60, goals: 2 },
        { name: "Konrad Laimer", position: "DEF", kickerNote: 3.30, goals: 0 },
        { name: "Raphaël Guerreiro", position: "DEF", kickerNote: 3.40, goals: 1 },
        // Midfielders
        { name: "Jamal Musiala", position: "MID", kickerNote: 2.20, goals: 12 },
        { name: "Thomas Müller", position: "MID", kickerNote: 3.00, goals: 5 },
        { name: "Leon Goretzka", position: "MID", kickerNote: 3.20, goals: 2 },
        { name: "Aleksandar Pavlović", position: "MID", kickerNote: 2.90, goals: 0 },
        { name: "João Palhinha", position: "MID", kickerNote: 3.10, goals: 1 },
        // Forwards
        { name: "Harry Kane", position: "FW", kickerNote: 2.10, goals: 20 },
        { name: "Leroy Sané", position: "FW", kickerNote: 3.00, goals: 6 },
        { name: "Kingsley Coman", position: "FW", kickerNote: 3.30, goals: 4 },
        { name: "Serge Gnabry", position: "FW", kickerNote: 3.20, goals: 3 },
        { name: "Michael Olise", position: "FW", kickerNote: 2.50, goals: 8 }
    ],
    "Bayer 04 Leverkusen": [
        { name: "Lukáš Hrádecký", position: "GK", kickerNote: 2.70, goals: 0 },
        { name: "Jonathan Tah", position: "DEF", kickerNote: 2.60, goals: 1 },
        { name: "Piero Hincapié", position: "DEF", kickerNote: 2.80, goals: 0 },
        { name: "Jeremie Frimpong", position: "DEF", kickerNote: 2.50, goals: 4 },
        { name: "Alejandro Grimaldo", position: "DEF", kickerNote: 2.40, goals: 5 },
        { name: "Granit Xhaka", position: "MID", kickerNote: 2.30, goals: 3 },
        { name: "Florian Wirtz", position: "MID", kickerNote: 2.00, goals: 10 },
        { name: "Robert Andrich", position: "MID", kickerNote: 2.70, goals: 2 },
        { name: "Exequiel Palacios", position: "MID", kickerNote: 2.90, goals: 1 },
        { name: "Victor Boniface", position: "FW", kickerNote: 2.80, goals: 7 },
        { name: "Patrik Schick", position: "FW", kickerNote: 3.20, goals: 5 }
    ],
    "RB Leipzig": [
        { name: "Péter Gulácsi", position: "GK", kickerNote: 2.90, goals: 0 },
        { name: "Willi Orbán", position: "DEF", kickerNote: 3.00, goals: 2 },
        { name: "Castello Lukeba", position: "DEF", kickerNote: 2.80, goals: 0 },
        { name: "David Raum", position: "DEF", kickerNote: 3.10, goals: 1 },
        { name: "Benjamin Henrichs", position: "DEF", kickerNote: 3.20, goals: 0 },
        { name: "Xavi Simons", position: "MID", kickerNote: 2.60, goals: 6 },
        { name: "Kevin Kampl", position: "MID", kickerNote: 3.00, goals: 0 },
        { name: "Christoph Baumgartner", position: "MID", kickerNote: 2.90, goals: 4 },
        { name: "Lois Openda", position: "FW", kickerNote: 2.70, goals: 12 },
        { name: "Benjamin Sesko", position: "FW", kickerNote: 2.80, goals: 8 }
    ],
    "VfB Stuttgart": [
        { name: "Alexander Nübel", position: "GK", kickerNote: 2.60, goals: 0 },
        { name: "Jeff Chabot", position: "DEF", kickerNote: 3.00, goals: 1 },
        { name: "Anthony Rouault", position: "DEF", kickerNote: 3.10, goals: 0 },
        { name: "Maximilian Mittelstädt", position: "DEF", kickerNote: 2.90, goals: 2 },
        { name: "Chris Führich", position: "MID", kickerNote: 2.80, goals: 4 },
        { name: "Angelo Stiller", position: "MID", kickerNote: 2.70, goals: 2 },
        { name: "Enzo Millot", position: "MID", kickerNote: 2.80, goals: 5 },
        { name: "Deniz Undav", position: "FW", kickerNote: 2.50, goals: 10 },
        { name: "Jamie Leweling", position: "FW", kickerNote: 3.00, goals: 3 },
        { name: "Ermedin Demirović", position: "FW", kickerNote: 3.10, goals: 6 }
    ],
    "Eintracht Frankfurt": [
        { name: "Kevin Trapp", position: "GK", kickerNote: 2.80, goals: 0 },
        { name: "Robin Koch", position: "DEF", kickerNote: 3.00, goals: 1 },
        { name: "Tuta", position: "DEF", kickerNote: 3.10, goals: 0 },
        { name: "Nathaniel Brown", position: "DEF", kickerNote: 3.20, goals: 0 },
        { name: "Oscar Højlund", position: "MID", kickerNote: 3.00, goals: 2 },
        { name: "Mario Götze", position: "MID", kickerNote: 3.10, goals: 3 },
        { name: "Ansgar Knauff", position: "MID", kickerNote: 2.90, goals: 4 },
        { name: "Hugo Ekitiké", position: "FW", kickerNote: 2.60, goals: 9 },
        { name: "Omar Marmoush", position: "FW", kickerNote: 2.30, goals: 13 }
    ],
    "VfL Wolfsburg": [
        { name: "Kamil Grabara", position: "GK", kickerNote: 3.00, goals: 0 },
        { name: "Sebastiaan Bornauw", position: "DEF", kickerNote: 3.20, goals: 1 },
        { name: "Kilian Fischer", position: "DEF", kickerNote: 3.30, goals: 0 },
        { name: "Ridle Baku", position: "DEF", kickerNote: 3.10, goals: 2 },
        { name: "Maximilian Arnold", position: "MID", kickerNote: 3.20, goals: 1 },
        { name: "Lovro Majer", position: "MID", kickerNote: 3.00, goals: 3 },
        { name: "Patrick Wimmer", position: "MID", kickerNote: 3.10, goals: 2 },
        { name: "Mohamed Amoura", position: "FW", kickerNote: 3.00, goals: 6 },
        { name: "Jonas Wind", position: "FW", kickerNote: 3.20, goals: 4 }
    ]
    // More teams can be added as needed
};

/**
 * Convert Kicker note to our rating scale
 * 1.0 = 95 (world class), 6.0 = 50 (very poor)
 */
function kickerToRating(note) {
    if (!note) return 70; // Default
    return Math.round(95 - (note - 1) * 9);
}

module.exports = {
    LEAGUE_PRESTIGE,
    LEAGUE_BASE_ELO,
    TOP_TEAMS_MARKET_VALUE,
    PLAYER_RATING_MAP,
    PLAYER_FORM_BONUS,
    KICKER_SQUADS,
    kickerToRating
};
