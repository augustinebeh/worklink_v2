/**
 * Database Configuration
 * Handles environment detection and database connection setup
 * 
 * @module database/config
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Determine environment
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'worklink.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log(`🔌 Database path: ${DB_PATH}`);
console.log(`🌍 Environment: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}`);

// Initialize database connection
const db = new Database(DB_PATH);

// Configure database
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = {
  db,
  IS_PRODUCTION,
  DATA_DIR,
  DB_PATH
};
