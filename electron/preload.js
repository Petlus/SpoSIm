const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getData: (category) => ipcRenderer.invoke('get-data', category),
    updateData: () => ipcRenderer.invoke('update-data'),
    getFixtures: (leagueId, matchday) => ipcRenderer.invoke('get-fixtures', { leagueId, matchday }),
    simulateMatchday: (leagueId) => ipcRenderer.invoke('simulate-matchday', leagueId),
    simulateMatch: (data) => ipcRenderer.invoke('simulate-match', data),
    simulateF1Race: (trackId) => ipcRenderer.invoke('simulate-f1-race', trackId),
    getMatchOdds: (homeId, awayId) => ipcRenderer.invoke('get-match-odds', { homeId, awayId }),
    getAdvancedAnalysis: (homeId, awayId) => ipcRenderer.invoke('get-advanced-analysis', { homeId, awayId }),
    getTeamDetails: (teamId) => ipcRenderer.invoke('get-team-details', teamId),
    checkOllamaStatus: () => ipcRenderer.invoke('check-ollama-status'),
    startOllama: () => ipcRenderer.invoke('start-ollama'),
    getAiPrediction: (homeId, awayId, odds) => ipcRenderer.invoke('get-ai-prediction', { homeId, awayId, odds }),
    // AI Setup
    getSetupStatus: () => ipcRenderer.invoke('get-setup-status'),
    startAiSetup: () => ipcRenderer.invoke('ai-setup-start'),
    on: (channel, fn) => {
        const subscription = (_event, ...args) => fn(_event, ...args);
        ipcRenderer.on(channel, subscription);
        return () => ipcRenderer.removeListener(channel, subscription);
    },
});
