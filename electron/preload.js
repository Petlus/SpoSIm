const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getData: (category) => ipcRenderer.invoke('get-data', category),
    updateData: () => ipcRenderer.invoke('update-data'),
    getFixtures: (leagueId, matchday) => ipcRenderer.invoke('get-fixtures', { leagueId, matchday }),
    simulateMatchday: (leagueId) => ipcRenderer.invoke('simulate-matchday', leagueId),
    simulateTournamentRound: (leagueId) => ipcRenderer.invoke('simulate-tournament-round', { leagueId }),
    getTournamentBracket: (leagueId) => ipcRenderer.invoke('get-tournament-bracket', { leagueId }),
    simulateMatch: (data) => ipcRenderer.invoke('simulate-match', data),
    simulateSingleMatch: (matchId) => ipcRenderer.invoke('simulate-single-match', { matchId }),
    simulateF1Race: (trackId) => ipcRenderer.invoke('simulate-f1-race', trackId),
    getMatchOdds: (homeId, awayId) => ipcRenderer.invoke('get-match-odds', { homeId, awayId }),
    getAdvancedAnalysis: (homeId, awayId) => ipcRenderer.invoke('get-advanced-analysis', { homeId, awayId }),
    getTeamDetails: (teamId) => ipcRenderer.invoke('get-team-details', teamId),
    checkOllamaStatus: () => ipcRenderer.invoke('check-ollama-status'),
    startOllama: () => ipcRenderer.invoke('start-ollama'),
    getAiPrediction: (homeId, awayId, odds) => ipcRenderer.invoke('get-ai-prediction', { homeId, awayId, odds }),
    getSetupStatus: () => ipcRenderer.invoke('get-setup-status'),
    getStandings: (leagueId, season) => ipcRenderer.invoke('get-standings', { leagueId, season }),

    // ESPN API
    espnGetNews: (league) => ipcRenderer.invoke('espn-get-news', league || null),
    espnGetScores: (league) => ipcRenderer.invoke('espn-get-scores', league || null),
    espnGetScoresByDate: (league, date) => ipcRenderer.invoke('espn-get-scores-by-date', { league, date }),
    espnGetStandings: (league) => ipcRenderer.invoke('espn-get-standings', league),
    espnGetTeamSchedule: (league, teamId) => ipcRenderer.invoke('espn-get-team-schedule', { league, teamId }),
    espnGetMatchSummary: (league, eventId) => ipcRenderer.invoke('espn-get-match-summary', { league, eventId }),
    espnGetTeams: (league) => ipcRenderer.invoke('espn-get-teams', league),
    espnGetLeagues: () => ipcRenderer.invoke('espn-get-leagues'),
    espnGetLeagueCode: (internalCodeOrId) => ipcRenderer.invoke('espn-get-league-code', internalCodeOrId),
    espnGetTeamId: (internalId) => ipcRenderer.invoke('espn-get-team-id', internalId),
    espnSyncLogos: () => ipcRenderer.invoke('espn-sync-logos'),
    espnSyncStandings: () => ipcRenderer.invoke('espn-sync-standings'),

    on: (channel, fn) => {
        const subscription = (_event, ...args) => fn(_event, ...args);
        ipcRenderer.on(channel, subscription);
        return () => ipcRenderer.removeListener(channel, subscription);
    },
});
