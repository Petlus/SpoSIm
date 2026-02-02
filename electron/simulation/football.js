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

module.exports = footballSim;
