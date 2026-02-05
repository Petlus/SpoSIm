const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const dbFiles = ['sports.db', 'sports.db-shm', 'sports.db-wal'];

try {
    for (const file of dbFiles) {
        const filePath = path.join(dataDir, file);
        if (fs.existsSync(filePath)) {
            console.log(`Deleting ${file}...`);
            fs.unlinkSync(filePath);
            console.log(`  ${file} deleted.`);
        }
    }
    console.log("Database reset complete.");
} catch (error) {
    console.error("Error resetting database:", error.message);
    console.log("Tip: Close the Electron app if it's running.");
}
