const f1Sim = {};

/**
 * Simulates a full race.
 * @param {Object} track Track object
 * @param {Array} drivers List of driver objects joined with team data
 */
f1Sim.simulateRace = (track, drivers) => {
    // 1. Quali (fastest lap based on pure speed)
    // 2. Race (consistency, reliability, overtaking)

    const results = drivers.map(driver => {
        // Base performance
        const carPerf = driver.teamPerf || 90;
        const driverSkill = driver.skill || 80;
        const totalPerf = (carPerf * 0.7) + (driverSkill * 0.3); // Car domination

        // Variance
        const variance = (Math.random() * 10) - 5; // +/- 5
        const raceScore = totalPerf + variance;

        // DNF Chance (Reliability)
        const dnf = Math.random() > (driver.reliability || 0.9); // using reliability from team

        return {
            driverId: driver.id,
            name: driver.name,
            team: driver.teamId,
            score: raceScore,
            dnf: dnf,
            time: '1:30.000' // Placeholder
        };
    });

    // Sort by score (Higher is better/faster)
    // Filter DNFs for verification, put them last
    results.sort((a, b) => b.score - a.score);

    // Assign positions
    results.forEach((res, index) => {
        if (res.dnf) res.position = 'DNF';
        else res.position = index + 1;
    });

    return {
        track: track.name,
        results
    };
};

module.exports = f1Sim;
