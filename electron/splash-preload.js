const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

// Resolve asset paths – works in both dev and production
function resolveAsset(filename) {
    const candidates = [
        path.join(__dirname, '..', 'public', filename),  // dev
        path.join(__dirname, '..', 'out', filename),      // production (next export)
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p.replace(/\\/g, '/');
    }
    return candidates[0].replace(/\\/g, '/'); // fallback
}

contextBridge.exposeInMainWorld('splashAPI', {
    onProgress: (callback) => {
        ipcRenderer.on('startup-progress', (_event, data) => callback(data));
    },
    assets: {
        logo: resolveAsset('logo.png'),
        video: resolveAsset('startup.mp4'),
    },
});
