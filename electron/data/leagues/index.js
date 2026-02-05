// All Leagues - Central Export
// Season 2025/26

const bundesliga = require('./bundesliga');
// Future: Add more leagues
// const premierLeague = require('./premier_league');
// const laLiga = require('./la_liga');
// const serieA = require('./serie_a');
// const ligue1 = require('./ligue_1');

const leagues = {
    BL1: bundesliga,
    // PL: premierLeague,
    // PD: laLiga,
    // SA: serieA,
    // FL1: ligue1
};

/**
 * Get squad data for a team by name
 * @param {string} teamName - Team name to lookup
 * @returns {Object|null} Team data or null
 */
function getTeamData(teamName) {
    for (const leagueId in leagues) {
        const team = leagues[leagueId].getTeam(teamName);
        if (team) return team;
    }
    return null;
}

/**
 * Get squad for a team by name
 * @param {string} teamName - Team name
 * @returns {Array} Squad array or empty array
 */
function getSquad(teamName) {
    const team = getTeamData(teamName);
    return team ? team.squad : [];
}

/**
 * Convert Kicker note (1.0-6.0) to rating (95-50)
 */
function kickerToRating(note) {
    if (!note) return 70;
    return Math.round(95 - (note - 1) * 9);
}

module.exports = {
    leagues,
    bundesliga,
    getTeamData,
    getSquad,
    kickerToRating
};
