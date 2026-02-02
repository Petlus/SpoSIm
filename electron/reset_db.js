const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/sports.db');

try {
    if (fs.existsSync(dbPath)) {
        console.log(`Deleting ${dbPath}...`);
        fs.unlinkSync(dbPath);
        console.log("Database deleted successfully.");
    } else {
        console.log("Database file not found, nothing to delete.");
    }
} catch (error) {
    console.error("Error deleting database:", error.message);
    // If locked, we might need manual intervention or killing processes, 
    // but usually in dev electron stops when we kill the terminal command.
}
