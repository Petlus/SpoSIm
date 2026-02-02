const footballSim = {};

/**
 * Calculates a match result between two teams.
 * @param {Object} home Team object
 * @param {Object} away Team object
 */
footballSim.simulateMatch = (home, away) => {
    // Basic Algo: Strength + Form + HomeAdvantage
    // Home Advantage 10%
    const homeStr = (home.att + home.mid) / 2 * home.form * 1.10;
    const awayStr = (away.att + away.mid) / 2 * away.form;

    // Defense Factors
    const homeDef = home.def * home.form * 1.10;
    const awayDef = away.def * away.form;

    let homeGoals = 0;
    let awayGoals = 0;
    const events = [];
    const EVENT_TYPES = { GOAL: 'goal', YELLOW: 'card_yellow', RED: 'card_red', INJURY: 'injury' };

    // Simulate 9 intervals of 10 minutes
    for (let i = 1; i <= 9; i++) {
        const time = i * 10;

        // 1. Possession Phase
        // Random fluctuation + midfield strength
        const rand = Math.random();
        // Possession bias based on strength difference (boosted)
        // Strength ratio: 1.0 = equal. 1.2 = dominant.
        const strRatio = homeStr / (awayStr + 1); // Avoid div 0
        const possessionBias = (strRatio - 1) * 0.5; // 0 for equal, 0.1 for 1.2 ratio

        let homePossessionChance = 0.5 + possessionBias + (rand * 0.4 - 0.2); // +/- 20% random swing

        const attackingTeam = homePossessionChance > 0.5 ? 'home' : 'away';

        // 2. Chance Creation vs Defense
        // Increase Goal Probability significantly to avoid 0-0 draws
        if (attackingTeam === 'home') {
            // Home attacking
            const attackPower = homeStr * (1 + (homePossessionChance - 0.5)); // Boost by possession
            const defPower = awayDef;

            // Logic: High Attack vs Low Def => High Chance
            // Base chance for shot: 0.6 (60% per 10min) if equal
            // Ratio adjustments
            const dominance = attackPower / (defPower + 1);
            const shotChance = 0.5 * Math.pow(dominance, 1.5);

            if (Math.random() < shotChance) {
                // Shot created -> Check for Goal
                // Conversion rate: 0.25 base (25%)
                // Boosted by attack quality > 80
                const qualityBonus = Math.max(0, (home.att - 70) / 100); // e.g. 90 -> 0.2 bonus
                const conversionRate = 0.20 + qualityBonus;

                if (Math.random() < conversionRate) {
                    homeGoals++;
                    events.push({
                        type: EVENT_TYPES.GOAL,
                        teamId: home.id,
                        minute: time - Math.floor(Math.random() * 9),
                        description: 'Goal'
                    });
                }
            }
        } else {
            // Away attacking
            const attackPower = awayStr * (1 + (0.5 - homePossessionChance));
            const defPower = homeDef;

            const dominance = attackPower / (defPower + 1);
            const shotChance = 0.5 * Math.pow(dominance, 1.5);

            if (Math.random() < shotChance) {
                const qualityBonus = Math.max(0, (away.att - 70) / 100);
                const conversionRate = 0.20 + qualityBonus;

                if (Math.random() < conversionRate) {
                    awayGoals++;
                    events.push({
                        type: EVENT_TYPES.GOAL,
                        teamId: away.id,
                        minute: time - Math.floor(Math.random() * 9),
                        description: 'Goal'
                    });
                }
            }
        }

        // 3. Other Events (Cards/Injuries)
        if (Math.random() < 0.035) {
            const victim = Math.random() > 0.5 ? 'home' : 'away';
            events.push({
                type: EVENT_TYPES.YELLOW,
                teamId: victim === 'home' ? home.id : away.id,
                minute: time,
                description: 'Yellow Card'
            });
        }
    }

    // Sort events by minute
    events.sort((a, b) => a.minute - b.minute);

    return {
        homeId: home.id,
        awayId: away.id,
        score: `${homeGoals}-${awayGoals}`,
        homeGoals,
        awayGoals,
        winner: homeGoals > awayGoals ? home.id : (awayGoals > homeGoals ? away.id : 'draw'),
        events
    };
};

footballSim.simulateMatchOdds = (home, away, iterations = 100) => {
    let homeWins = 0;
    let draws = 0;
    let awayWins = 0;

    for (let i = 0; i < iterations; i++) {
        const res = footballSim.simulateMatch(home, away);
        if (res.homeGoals > res.awayGoals) homeWins++;
        else if (res.awayGoals > res.homeGoals) awayWins++;
        else draws++;
    }

    return {
        homeWinProb: Math.round((homeWins / iterations) * 100),
        drawProb: Math.round((draws / iterations) * 100),
        awayWinProb: Math.round((awayWins / iterations) * 100)
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
