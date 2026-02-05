/**
 * Central season configuration - single source of truth for DB, API, and UI.
 * Update here when starting a new season.
 */
const CURRENT_SEASON_YEAR = 2025;
const CURRENT_SEASON_STR = `${CURRENT_SEASON_YEAR}/${CURRENT_SEASON_YEAR + 1}`;

/** Minimum interval between API fetches (100 req/day limit). 24h = 1 full sync per day. */
const API_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;

module.exports = {
    CURRENT_SEASON_YEAR,
    CURRENT_SEASON_STR,
    API_MIN_INTERVAL_MS,
};
