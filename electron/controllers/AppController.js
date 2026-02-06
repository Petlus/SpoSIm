const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const db = require('../db');
const { prisma } = db;
const ollamaManager = require('../ollama_manager');
const dailySync = require('../data_sync');
const dataFetcher = require('../data_fetcher');
const { CURRENT_SEASON_STR } = require('../../config/season');
const simController = require('./SimController');

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

class AppController {
    constructor() {
        this.mainWindow = null;
        this.splashWindow = null;
        this.splashShownAt = 0;
    }

    init() {
        // App Ready
        app.whenReady().then(async () => {
            this.registerProtocolHandlers();
            this.registerIpcHandlers();

            // 1. Show splash
            this.createSplash();
            await new Promise((resolve) => {
                if (this.splashWindow?.webContents) {
                    this.splashWindow.webContents.once('did-finish-load', resolve);
                } else {
                    resolve();
                }
            });

            // 2. Init DB
            await db.initDb();

            // 3. Run startup checks
            await this.runStartupChecks();

            // 4. Create main window
            this.createMainWindow();

            // Auto-update
            this.setupAutoUpdater();

            // Background tasks
            this.startBackgroundTasks();
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) this.createMainWindow();
        });
    }

    createSplash() {
        const iconPath = path.join(__dirname, '../../public/logo.png');
        this.splashWindow = new BrowserWindow({
            width: 480,
            height: 520,
            frame: false,
            resizable: false,
            transparent: false,
            icon: iconPath,
            backgroundColor: '#020617',
            webPreferences: {
                contextIsolation: true,
                preload: path.join(__dirname, '../splash-preload.js'),
                webSecurity: false,
            },
            show: false,
        });
        this.splashWindow.loadFile(path.join(__dirname, '../splash.html'));
        this.splashWindow.once('ready-to-show', () => {
            this.splashWindow.show();
            this.splashShownAt = Date.now();
        });
    }

    sendSplash(step, progress, detail) {
        if (this.splashWindow && !this.splashWindow.isDestroyed()) {
            this.splashWindow.webContents.send('startup-progress', { step, progress, detail });
        }
    }

    createMainWindow() {
        const iconPath = path.join(__dirname, '../../public/logo.png');
        this.mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            icon: iconPath,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, '../preload.js'),
            },
            title: "BetBrain",
            autoHideMenuBar: true,
            backgroundColor: '#0f172a',
            show: false,
        });

        const startUrl = isDev ? 'http://localhost:3000' : 'app://./index.html';
        this.mainWindow.loadURL(startUrl);

        this.mainWindow.once('ready-to-show', async () => {
            const minSplashMs = 5000;
            const elapsed = this.splashShownAt ? Date.now() - this.splashShownAt : minSplashMs;
            const remaining = Math.max(0, minSplashMs - elapsed);
            if (remaining > 0) await new Promise(r => setTimeout(r, remaining));
            this.mainWindow.show();
            if (this.splashWindow && !this.splashWindow.isDestroyed()) {
                this.splashWindow.close();
                this.splashWindow = null;
            }
        });
    }

    registerProtocolHandlers() {
        const assetDirs = [
            path.join(__dirname, '../../public'),
            path.join(__dirname, '../../out'),
        ];
        protocol.handle('splash-asset', (request) => {
            const url = new URL(request.url);
            const filename = decodeURIComponent(url.pathname.replace(/^\//, ''));
            if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
                return new Response('Invalid', { status: 400 });
            }
            for (const dir of assetDirs) {
                const fullPath = path.join(dir, filename);
                if (fs.existsSync(fullPath)) {
                    return net.fetch(pathToFileURL(fullPath).toString());
                }
            }
            return new Response('Not found', { status: 404 });
        });

        if (!isDev) {
            const outDir = path.join(__dirname, '../../out');
            protocol.handle('app', (request) => {
                const url = new URL(request.url);
                let filePath = (url.pathname || '/').replace(/^\//, '') || 'index.html';
                const fullPath = path.join(outDir, filePath);
                let toServe;
                if (fs.existsSync(fullPath + '.html')) {
                    toServe = fullPath + '.html';
                } else if (fs.existsSync(fullPath)) {
                    const stat = fs.statSync(fullPath);
                    toServe = stat.isDirectory() ? path.join(fullPath, 'index.html') : fullPath;
                } else {
                    toServe = path.join(outDir, 'index.html');
                }
                return net.fetch(pathToFileURL(toServe).toString());
            });
        }
    }

    registerIpcHandlers() {
        ipcMain.handle('get-app-version', () => app.getVersion());

        ipcMain.handle('check-for-updates', async () => {
            if (!app.isPackaged) return { available: false, message: 'Updates only in packaged app' };
            try {
                const result = await autoUpdater.checkForUpdates();
                const update = result?.updateInfo;
                if (update) {
                    return { available: true, version: update.version, message: `Update ${update.version} available` };
                }
                return { available: false, message: 'No update available' };
            } catch (e) {
                return { available: false, error: e?.message || String(e), message: 'Check failed' };
            }
        });
    }

    async runStartupChecks() {
        // 1. Database
        this.sendSplash('database', 0, 'Connecting to database...');
        try {
            await prisma.$queryRawUnsafe('SELECT 1');
            this.sendSplash('database', 100, 'Database connected');
        } catch (e) {
            console.error('DB check failed:', e);
            this.sendSplash('error', 0, 'Database connection failed');
            return;
        }

        // 2. Season Data
        this.sendSplash('season_data', 0, `Checking ${CURRENT_SEASON_STR} data...`);
        try {
            const count = await prisma.league.count({ where: { currentSeason: CURRENT_SEASON_STR } });
            if (count === 0) {
                this.sendSplash('season_data', 30, 'Seeding initial data...');
                await simController.seedDatabase();
            }
            this.sendSplash('season_data', 100, 'Season data ready');
        } catch (e) {
            console.error('Season data check failed:', e);
            this.sendSplash('season_data', 100, 'Skipped (non-critical)');
        }

        // 3. Ollama installed
        this.sendSplash('ollama_install', 0, 'Checking Ollama installation...');
        let ollamaInstalled = await ollamaManager.checkInstalled();
        if (!ollamaInstalled) {
            this.sendSplash('ollama_install', 10, 'Downloading Ollama...');
            const ok = await ollamaManager.downloadAndInstallOllama((p, s) => this.sendSplash('ollama_install', p, s));
            if (!ok) { this.sendSplash('error', 0, 'Ollama installation failed'); return; }
            ollamaInstalled = true;
        }
        this.sendSplash('ollama_install', 100, 'Ollama installed');

        // 4. Ollama service running
        this.sendSplash('ollama_service', 0, 'Starting Ollama service...');
        const running = await ollamaManager.ensureOllamaRunning();
        if (!running) { this.sendSplash('error', 0, 'Could not start Ollama'); return; }
        this.sendSplash('ollama_service', 100, 'Service running');

        // 5. AI Model
        const modelName = 'deepseek-r1:1.5b';
        this.sendSplash('ai_model', 0, `Checking model ${modelName}...`);
        const models = await ollamaManager.getAvailableModels();
        const exists = models.some(m => m === modelName || m.startsWith(modelName + ':'));
        if (!exists) {
            this.sendSplash('ai_model', 5, `Downloading ${modelName}...`);
            const pulled = await ollamaManager.pullModelProgressive(modelName, (p, s) => this.sendSplash('ai_model', Math.max(5, p), s));
            if (!pulled) { this.sendSplash('error', 0, 'Model download failed'); return; }
        }
        this.sendSplash('ai_model', 100, 'Model ready');

        // Persist
        try {
            await prisma.appSettings.upsert({
                where: { id: 1 },
                update: { ollamaInstalled: true, modelDownloaded: true, setupComplete: true, lastUpdate: new Date() },
                create: { id: 1, ollamaInstalled: true, modelDownloaded: true, setupComplete: true, lastUpdate: new Date() },
            });
        } catch (e) { console.warn('Could not persist setup status:', e); }

        // Done
        this.sendSplash('done', 100, 'All systems ready');
    }

    setupAutoUpdater() {
        if (app.isPackaged) {
            autoUpdater.autoDownload = true;
            autoUpdater.checkForUpdatesAndNotify().catch((err) => {
                console.error('[AutoUpdate] Check failed:', err?.message || err);
            });
            autoUpdater.on('update-available', () => this.sendUpdateToRenderer('update-available'));
            autoUpdater.on('download-progress', (progress) => {
                this.sendUpdateToRenderer('update-download-progress', {
                    percent: Math.round(progress.percent || 0),
                    bytesPerSecond: progress.bytesPerSecond,
                    transferred: progress.transferred,
                    total: progress.total,
                });
            });
            autoUpdater.on('update-downloaded', () => {
                this.sendUpdateToRenderer('update-downloaded');
                setTimeout(() => autoUpdater.quitAndInstall(false, true), 2000);
            });
            autoUpdater.on('error', (err) => {
                console.error('[AutoUpdate] Error:', err?.message || err);
                this.sendUpdateToRenderer('update-error', { message: err?.message || String(err) });
            });
        }
    }

    sendUpdateToRenderer(channel, data) {
        if (this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow.webContents) {
            this.mainWindow.webContents.send(channel, data);
        }
    }

    startBackgroundTasks() {
        setTimeout(() => dailySync.syncIfNeeded(this.mainWindow), 5000);
        setTimeout(async () => {
            try {
                console.log('[ESPN] Background sync: updating logos and standings...');
                await dataFetcher.updateTeamLogosFromEspn();
                await dataFetcher.syncStandingsFromEspn();
                console.log('[ESPN] Background sync: standings complete. Starting player ratings sync...');
                await dataFetcher.syncPlayerRatingsFromEspn();
                console.log('[ESPN] Background sync complete (incl. player ratings).');
            } catch (e) {
                console.error('[ESPN] Background sync error:', e.message);
            }
        }, 10000);
    }
}

module.exports = new AppController();
