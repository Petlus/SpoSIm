const { app } = require('electron');
const fetcher = require('./data_fetcher');

app.whenReady().then(async () => {
    console.log("Running Data Update via Electron...");
    try {
        await fetcher.updateAllData();
        console.log("Update Success!");
    } catch (e) {
        console.error("Update Failed:", e);
    }
    app.quit();
});
