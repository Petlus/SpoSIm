const footballSim = {};

/**
 * Calculates a match result between two teams.
 * @param {Object} home Team object (att, def, mid, form, eloRating, power)
 * @param {Object} away Team object
 * @param {Object|null} espnContext Optional ESPN real-world calibration data
 *   { homeRank, awayRank, homePPG, awayPPG, homeForm, awayForm,
 *     homeGoalsPerGame, awayGoalsPerGame, homeConcededPerGame, awayConcededPerGame }
 */
footballSim.simulateMatch = (home, away, espnContext = null) => {
    // 1. Determine Power/Elo
    // If Elo is available (from updated DB), use it. otherwise fallback to 'power'.
    const useElo = home.eloRating && away.eloRating;

    let winProb = 0.5;
    let homeStr = 0;
    let awayStr = 0;

    if (useElo) {
        // Elo Model (Number() for BigInt compatibility with SQLite/Prisma)
        const homeElo = Number(home.eloRating) + 100; // Home Advantage = +100 Elo matches standard logic
        const awayElo = Number(away.eloRating);

        homeStr = homeElo;
        awayStr = awayElo;

        const eloDiff = homeElo - awayElo;
        // Standard Elo Formula: 1 / (1 + 10^(-diff/400))
        winProb = 1 / (1 + Math.pow(10, -eloDiff / 400));
    } else {
        // Legacy Power Model (Number() for BigInt compatibility)
        const homePower = Number(home.power) || 100;
        const awayPower = Number(away.power) || 100;

        // Home Advantage (+10%)
        homeStr = homePower * 1.10;
        awayStr = awayPower;

        // Sigmoid Function
        const powerDiff = homeStr - awayStr;
        winProb = 1 / (1 + Math.exp(-powerDiff / 12));
    }

    // ESPN Real-World Calibration (if available)
    // Adjusts win probability based on actual league performance
    if (espnContext) {
        let espnAdjustment = 0;

        // PPG calibration: if ESPN PPG differs significantly from Elo-implied performance,
        // nudge the win probability towards the real-world performance.
        // Typical PPG range: 0.5 (bad) to 2.8 (dominant)
        if (espnContext.homePPG > 0 && espnContext.awayPPG > 0) {
            const ppgDiff = espnContext.homePPG - espnContext.awayPPG;
            // Clamp PPG influence to max +/- 5% on win probability
            espnAdjustment += Math.max(-0.05, Math.min(0.05, ppgDiff * 0.03));
        }

        // Rank calibration: top-3 teams get small boost, bottom-3 get small penalty
        if (espnContext.homeRank > 0 && espnContext.awayRank > 0) {
            const rankDiff = espnContext.awayRank - espnContext.homeRank; // positive = home ranked higher
            // Clamp rank influence to max +/- 3%
            espnAdjustment += Math.max(-0.03, Math.min(0.03, rankDiff * 0.002));
        }

        // ESPN form bonus: real-world momentum
        if (espnContext.homeForm && espnContext.awayForm) {
            const formScore = (str) => {
                let s = 0;
                for (const ch of str) {
                    if (ch === 'W') s += 1;
                    else if (ch === 'L') s -= 1;
                }
                return s;
            };
            const formDiff = formScore(espnContext.homeForm) - formScore(espnContext.awayForm);
            // Clamp form influence to max +/- 2%
            espnAdjustment += Math.max(-0.02, Math.min(0.02, formDiff * 0.005));
        }

        // Apply ESPN adjustment to win probability (capped at 10% total shift)
        espnAdjustment = Math.max(-0.10, Math.min(0.10, espnAdjustment));
        winProb = Math.max(0.05, Math.min(0.95, winProb + espnAdjustment));

        // Also adjust strength values proportionally for goal simulation
        const strAdjust = 1 + espnAdjustment * 0.5; // Halved effect on goals
        homeStr *= strAdjust;
        awayStr *= (2 - strAdjust); // Inverse adjustment for away

        // Attack/defense calibration from real goals data
        // homeStr vs awayDef: home attack vs away defense. Use homeGoalsPerGame * awayConcededPerGame
        if (espnContext.homeGoalsPerGame > 0 && espnContext.awayConcededPerGame > 0) {
            const homeAttackFactor = (espnContext.homeGoalsPerGame / 1.2) * (espnContext.awayConcededPerGame / 1.2);
            const mult = Math.max(0.7, Math.min(1.4, homeAttackFactor));
            if (Number.isFinite(mult)) homeStr *= mult;
        }
        if (espnContext.awayGoalsPerGame > 0 && espnContext.homeConcededPerGame > 0) {
            const awayAttackFactor = (espnContext.awayGoalsPerGame / 1.2) * (espnContext.homeConcededPerGame / 1.2);
            const mult = Math.max(0.7, Math.min(1.4, awayAttackFactor));
            if (Number.isFinite(mult)) awayStr *= mult;
        }
    }

    // Form factor (from calculateFormFactor: 0.95 to 1.10 typically)
    const homeFormMult = Number.isFinite(Number(home.form)) ? Math.max(0.8, Math.min(1.2, Number(home.form))) : 1;
    const awayFormMult = Number.isFinite(Number(away.form)) ? Math.max(0.8, Math.min(1.2, Number(away.form))) : 1;
    homeStr *= homeFormMult;
    awayStr *= awayFormMult;

    // 4. Determine Winner using probability
    // We still simulate goals for realism, but bias chance creation heavily
    // Using calculate homeStr/awayStr from above explicitly

    // Defense Factors (derived from strength - works for both Elo and Power model)
    const homeDef = homeStr * 0.9;
    const awayDef = awayStr * 0.9;

    let homeGoals = 0;
    let awayGoals = 0;
    let totalCards = 0;
    let totalCorners = 0;
    const events = [];
    const EVENT_TYPES = { GOAL: 'goal', YELLOW: 'card_yellow', RED: 'card_red', INJURY: 'injury', BIG_CHANCE: 'big_chance' };

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
                const qualityBonus = Math.max(0, (Number(home.att) - 70) / 100);
                const conversionRate = 0.20 + qualityBonus;
                const roll = Math.random();

                if (roll < conversionRate) {
                    homeGoals++;
                    events.push({ type: EVENT_TYPES.GOAL, teamId: home.id, minute: time - Math.floor(Math.random() * 9), description: 'Goal' });
                } else {
                    if (roll < conversionRate + 0.15) events.push({ type: EVENT_TYPES.BIG_CHANCE, teamId: home.id, minute: time - Math.floor(Math.random() * 9), description: 'Big Chance Missed' });
                    if (Math.random() < 0.4) totalCorners++; // Corner from attack ~40%
                }
            } else if (Math.random() < 0.25) totalCorners++; // Build-up corner
        } else {
            // Away attacking
            const attackPower = awayStr * (1 + (0.5 - homePossessionChance));
            const defPower = homeDef;

            const dominance = attackPower / (defPower + 1);
            const shotChance = 0.5 * Math.pow(dominance, 1.5);

            if (Math.random() < shotChance) {
                const qualityBonus = Math.max(0, (Number(away.att) - 70) / 100);
                const conversionRate = 0.20 + qualityBonus;
                const roll = Math.random();

                if (roll < conversionRate) {
                    awayGoals++;
                    events.push({ type: EVENT_TYPES.GOAL, teamId: away.id, minute: time - Math.floor(Math.random() * 9), description: 'Goal' });
                } else {
                    if (roll < conversionRate + 0.15) events.push({ type: EVENT_TYPES.BIG_CHANCE, teamId: away.id, minute: time - Math.floor(Math.random() * 9), description: 'Big Chance Missed' });
                    if (Math.random() < 0.4) totalCorners++;
                }
            } else if (Math.random() < 0.25) totalCorners++;
        }

        // 3. Cards (yellow ~3.5%, red ~0.5% per interval)
        if (Math.random() < 0.035) {
            totalCards++;
            const victim = Math.random() > 0.5 ? 'home' : 'away';
            events.push({ type: EVENT_TYPES.YELLOW, teamId: victim === 'home' ? home.id : away.id, minute: time, description: 'Yellow Card' });
        }
        if (Math.random() < 0.005) {
            totalCards += 2;
            const victim = Math.random() > 0.5 ? 'home' : 'away';
            events.push({ type: EVENT_TYPES.RED, teamId: victim === 'home' ? home.id : away.id, minute: time, description: 'Red Card' });
        }
    }

    events.sort((a, b) => a.minute - b.minute);

    return {
        homeId: home.id,
        awayId: away.id,
        score: `${homeGoals}-${awayGoals}`,
        homeGoals,
        awayGoals,
        totalCards,
        totalCorners,
        winner: homeGoals > awayGoals ? home.id : (awayGoals > homeGoals ? away.id : 'draw'),
        events
    };
};

footballSim.simulateMatchOdds = (home, away, iterations = 100, espnContext = null) => {
    let homeWins = 0;
    let draws = 0;
    let awayWins = 0;
    let totalHomeGoals = 0;
    let totalAwayGoals = 0;
    let totalCards = 0;
    let totalCorners = 0;
    let over35Cards = 0;
    let over95Corners = 0;
    const scoreCounts = {};

    for (let i = 0; i < iterations; i++) {
        const res = footballSim.simulateMatch(home, away, espnContext);
        if (res.homeGoals > res.awayGoals) homeWins++;
        else if (res.awayGoals > res.homeGoals) awayWins++;
        else draws++;

        totalHomeGoals += res.homeGoals;
        totalAwayGoals += res.awayGoals;
        totalCards += res.totalCards ?? 0;
        totalCorners += res.totalCorners ?? 0;
        if ((res.totalCards ?? 0) > 3.5) over35Cards++;
        if ((res.totalCorners ?? 0) > 9.5) over95Corners++;

        const key = `${res.homeGoals}-${res.awayGoals}`;
        scoreCounts[key] = (scoreCounts[key] || 0) + 1;
    }

    let predictedScore = '1-1';
    let maxCount = 0;
    for (const [score, count] of Object.entries(scoreCounts)) {
        if (count > maxCount) { maxCount = count; predictedScore = score; }
    }

    const topScores = Object.entries(scoreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([score, count]) => ({ score, prob: Math.round((count / iterations) * 100) }));

    return {
        homeWinProb: Math.round((homeWins / iterations) * 100),
        drawProb: Math.round((draws / iterations) * 100),
        awayWinProb: Math.round((awayWins / iterations) * 100),
        predictedScore,
        expectedGoals: {
            home: Math.round((totalHomeGoals / iterations) * 10) / 10,
            away: Math.round((totalAwayGoals / iterations) * 10) / 10,
        },
        topScores,
        avgCards: Math.round((totalCards / iterations) * 10) / 10,
        avgCorners: Math.round((totalCorners / iterations) * 10) / 10,
        over35CardsProb: Math.round((over35Cards / iterations) * 100),
        over95CornersProb: Math.round((over95Corners / iterations) * 100),
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
