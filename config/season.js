/**
 * Central season configuration - single source of truth for DB, API, and UI.
 * Update here when starting a new season.
 */
const CURRENT_SEASON_YEAR = 2025;
const CURRENT_SEASON_STR = `${CURRENT_SEASON_YEAR}/${CURRENT_SEASON_YEAR + 1}`;

module.exports = {
    CURRENT_SEASON_YEAR,
    CURRENT_SEASON_STR,
};
