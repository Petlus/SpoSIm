const { contextBridge, ipcRenderer } = require('electron');

// Use splash-asset:// protocol (registered in main.js) – reliable for logo + video
function assetUrl(filename) {
    return `splash-asset://localhost/${filename}`;
}

contextBridge.exposeInMainWorld('splashAPI', {
    onProgress: (callback) => {
        ipcRenderer.on('startup-progress', (_event, data) => callback(data));
    },
    assets: {
        logo: assetUrl('logo.png'),
    },
});
