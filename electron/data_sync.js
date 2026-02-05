const { prisma } = require('./db');
const dataFetcher = require('./data_fetcher');
const { BrowserWindow } = require('electron');
const { API_MIN_INTERVAL_MS } = require('../config/season');

class DailySyncService {
    constructor() {
        this.SYNC_INTERVAL_MS = API_MIN_INTERVAL_MS; // 24 hours (same as API protection)
    }

    async syncIfNeeded(mainWindow) {
        console.log("Starting Daily Sync Check...");
        try {
            const settings = await prisma.appSettings.findFirst({ where: { id: 1 } });
            if (!settings) return;

            const lastUpdate = settings.lastUpdate ? new Date(settings.lastUpdate).getTime() : 0;
            const now = Date.now();

            if (now - lastUpdate > this.SYNC_INTERVAL_MS) {
                console.log("Last update > 24h. Triggering Sync (API-protected)...");
                this.sendSyncStatus(mainWindow, true);

                // Use updateAllData: same API protection (skips if fresh), only fetches players for empty teams, skips fixtures if DB has data
                const result = await dataFetcher.updateAllData({ force: false });
                if (result?.skipped) {
                    console.log("Sync skipped:", result.message);
                }

                this.sendSyncStatus(mainWindow, false);
                console.log("Daily Sync Complete.");
            } else {
                console.log("Data is up to date (< 24h).");
            }

        } catch (error) {
            console.error("Daily Sync Failed:", error);
            this.sendSyncStatus(mainWindow, false);
        }
    }

    sendSyncStatus(win, active) {
        if (win && !win.isDestroyed()) {
            win.webContents.send('sync-status', { active });
        }
    }
}

module.exports = new DailySyncService();
