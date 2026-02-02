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
});
