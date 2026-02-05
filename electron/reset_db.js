const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dataDir = path.join(__dirname, '../data');
const dbFiles = ['sports.db', 'sports.db-shm', 'sports.db-wal'];

// Ensure DATABASE_URL for standalone run (dev: project data folder)
if (!process.env.DATABASE_URL) {
    const dbPath = path.join(dataDir, 'sports.db').replace(/\\/g, '/');
    process.env.DATABASE_URL = `file:${dbPath}`;
}

try {
    console.log("1. Wiping database files...");
    for (const file of dbFiles) {
        const filePath = path.join(dataDir, file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`   Deleted ${file}`);
        }
    }

    console.log("\n2. Creating schema (prisma db push)...");
    execSync('npx prisma db push', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });

    console.log("\n3. Loading data (update-data:force)...");
    execSync('node electron/data_fetcher.js --force', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });

    console.log("\nDatabase reset and reload complete.");
} catch (error) {
    console.error("Error:", error.message);
    if (error.message?.includes('EBUSY') || error.message?.includes('EPERM')) {
        console.log("Tip: Close the Electron app if it's running.");
    }
    process.exit(1);
}
