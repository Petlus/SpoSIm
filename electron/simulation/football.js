const footballSim = {};

/**
 * Calculates a match result between two teams.
 * @param {Object} home Team object
 * @param {Object} away Team object
 */
footballSim.simulateMatch = (home, away) => {
    // Basic Algo: Strength + Form + Random + HomeAdvantage
    const homeStr = (home.att + home.def + home.mid) / 3 * home.form * 1.05; // 5% Home bonus
    const awayStr = (away.att + away.def + away.mid) / 3 * away.form;

    const diff = homeStr - awayStr;
    let homeGoals = 0;
    let awayGoals = 0;

    // Base goals based on strength
    const baseGoals = 2.5;

    // Poisson-ish simulation
    // If Home is stronger (diff > 0), they are likely to score more
    const homeExp = Math.max(0.5, baseGoals + (diff / 10));
    const awayExp = Math.max(0.5, baseGoals - (diff / 10));

    homeGoals = Math.floor(Math.random() * (homeExp * 1.5)); // Random variance
    awayGoals = Math.floor(Math.random() * (awayExp * 1.5));

    // Cap goals reasonable (0-9)
    homeGoals = Math.min(9, homeGoals);
    awayGoals = Math.min(9, awayGoals);

    return {
        homeId: home.id,
        awayId: away.id,
        score: `${homeGoals}-${awayGoals}`,
        homeGoals,
        awayGoals,
        winner: homeGoals > awayGoals ? home.id : (awayGoals > homeGoals ? away.id : 'draw')
    };
};

/**
 * Simulates a knockout tie (2nd leg), calculating aggregate and penalties if needed.
 * @param {Object} leg1Result Result of the first match { homeGoals, awayGoals, ... } (Home was Leg2's Away team)
 * @param {Object} leg2Result Result of the second match (just played) { homeGoals, awayGoals ... }
 * @param {Boolean} hasAwayGoalsRule 
 */
footballSim.simulateKnockoutTie = (leg1Result, leg2Result, hasAwayGoalsRule = false) => {
    // Leg 1: Team A (Home) vs Team B (Away) -> Result: 2-1
    // Leg 2: Team B (Home) vs Team A (Away) -> Result: 1-0
    // Aggregate: Team A (2+0) vs Team B (1+1) -> 2-2

    // Identify teams (Assuming leg2.homeId is leg1.awayId)
    const teamA_id = leg1Result.homeId; // Leg 1 Home
    const teamB_id = leg1Result.awayId; // Leg 1 Away

    const teamA_goals = leg1Result.homeGoals + leg2Result.awayGoals;
    const teamB_goals = leg1Result.awayGoals + leg2Result.homeGoals;

    let winnerId = null;
    let method = 'aggregate'; // 'aggregate', 'away_goals', 'penalties'
    let penaltyScore = null;

    if (teamA_goals > teamB_goals) {
        winnerId = teamA_id;
    } else if (teamB_goals > teamA_goals) {
        winnerId = teamB_id;
    } else {
        // DRAW
        if (hasAwayGoalsRule) {
            // Away goals rule
            const teamA_awayGoals = leg2Result.awayGoals;
            const teamB_awayGoals = leg1Result.awayGoals;

            if (teamA_awayGoals > teamB_awayGoals) {
                winnerId = teamA_id;
                method = 'away_goals';
            } else if (teamB_awayGoals > teamA_awayGoals) {
                winnerId = teamB_id;
                method = 'away_goals';
            }
        }

        // Still draw? -> Penalties
        if (!winnerId) {
            method = 'penalties';
            // Simple 50/50 penalty shootout for now, could use skill later
            const teamA_pens = 3 + Math.floor(Math.random() * 3); // 3-5
            let teamB_pens = 3 + Math.floor(Math.random() * 3);

            // Ensure no draw in penalties
            while (teamA_pens === teamB_pens) {
                teamB_pens = Math.floor(Math.random() * 6);
            }

            penaltyScore = `${teamA_pens}-${teamB_pens}`;
            winnerId = teamA_pens > teamB_pens ? teamA_id : teamB_id;
        }
    }

    return {
        winnerId,
        aggregate: `${teamA_goals}-${teamB_goals}`,
        method,
        penaltyScore
    };
};

module.exports = footballSim;
