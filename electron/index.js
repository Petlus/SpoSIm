/**
 * Bootstrap: Set DATABASE_URL before main.js loads.
 * - Dev: use project data folder
 * - Production (installed): use app.getPath('userData')/data/sports.db
 */
const { app, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

// Must run before app.ready
protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
    { scheme: 'splash-asset', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

app.whenReady().then(() => {
    const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
    let dbPath;

    if (isDev) {
        dbPath = path.join(__dirname, '..', 'data', 'sports.db');
    } else {
        const userDataDir = app.getPath('userData');
        const dataDir = path.join(userDataDir, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        dbPath = path.join(dataDir, 'sports.db');
        // Copy initial DB from app resources if first run (empty DB)
        const bundledDb = path.join(__dirname, '..', 'data', 'sports.db');
        if (!fs.existsSync(dbPath) && fs.existsSync(bundledDb)) {
            fs.copyFileSync(bundledDb, dbPath);
        }
    }

    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    process.env.DATABASE_URL = `file:${dbPath.replace(/\\/g, '/')}`;
    require('./main.js');
});
