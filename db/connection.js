/**
 * Database Connection Configuration
 * Handles SQLite connection setup and configuration
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Determine environment
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'worklink.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log(`🔌 Database path: ${DB_PATH}`);
console.log(`🌍 Environment: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}`);

/**
 * Initialize and configure SQLite database connection
 * @returns {Database} Configured SQLite database instance
 */
function createConnection() {
  const db = new Database(DB_PATH);

  // Configure SQLite for optimal performance
  db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
  db.pragma('foreign_keys = ON');  // Enable foreign key constraints

  return db;
}

/**
 * Generate DiceBear avatar URL
 * @param {string} name - Name to use as seed
 * @param {string} style - Avatar style (default: 'avataaars')
 * @returns {string} Avatar URL
 */
function generateAvatar(name, style = 'avataaars') {
  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
}

module.exports = {
  createConnection,
  generateAvatar,
  IS_PRODUCTION,
  DATA_DIR,
  DB_PATH
};