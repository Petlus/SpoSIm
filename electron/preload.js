const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getData: (category) => ipcRenderer.invoke('get-data', category),
    simulateMatch: (data) => ipcRenderer.invoke('simulate-match', data),
    simulateF1Race: (trackId) => ipcRenderer.invoke('simulate-f1-race', trackId),
    updateData: () => ipcRenderer.invoke('update-data'),
    simulateMatchday: (leagueId) => ipcRenderer.invoke('simulate-matchday', leagueId),
});
