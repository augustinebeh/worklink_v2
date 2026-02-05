/**
 * Database Helper Utilities
 * Common database operations and utilities
 * 
 * @module db/utils/db-helpers
 */

const path = require('path');
const fs = require('fs');

/**
 * Get database configuration
 * @returns {Object} Database configuration
 */
function getDatabaseConfig() {
  const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
  const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, '..', '..', 'data');
  const DB_PATH = path.join(DATA_DIR, 'worklink.db');

  return {
    IS_PRODUCTION,
    DATA_DIR,
    DB_PATH
  };
}

/**
 * Ensure data directory exists
 * @param {string} dataDir - Data directory path
 */
function ensureDataDirectory(dataDir) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`📁 Created data directory: ${dataDir}`);
  }
}

/**
 * Configure database pragmas for optimal performance
 * @param {Database} db - better-sqlite3 database instance
 */
function configurePragmas(db) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  console.log('✅ Database pragmas configured (WAL mode, foreign keys ON)');
}

/**
 * Execute SQL file
 * @param {Database} db - better-sqlite3 database instance
 * @param {string} sqlFilePath - Path to SQL file
 */
function executeSQLFile(db, sqlFilePath) {
  if (!fs.existsSync(sqlFilePath)) {
    throw new Error(`SQL file not found: ${sqlFilePath}`);
  }

  const sql = fs.readFileSync(sqlFilePath, 'utf8');
  db.exec(sql);
  console.log(`✅ Executed SQL file: ${path.basename(sqlFilePath)}`);
}

/**
 * Check if table exists
 * @param {Database} db - better-sqlite3 database instance
 * @param {string} tableName - Table name to check
 * @returns {boolean} True if table exists
 */
function tableExists(db, tableName) {
  const result = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name=?
  `).get(tableName);
  
  return !!result;
}

/**
 * Get table count
 * @param {Database} db - better-sqlite3 database instance
 * @param {string} tableName - Table name
 * @returns {number} Row count
 */
function getTableCount(db, tableName) {
  const result = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
  return result.count;
}

/**
 * Truncate table (delete all rows)
 * @param {Database} db - better-sqlite3 database instance
 * @param {string} tableName - Table name to truncate
 */
function truncateTable(db, tableName) {
  db.prepare(`DELETE FROM ${tableName}`).run();
  console.log(`🗑️  Truncated table: ${tableName}`);
}

/**
 * Drop all tables (use with caution!)
 * @param {Database} db - better-sqlite3 database instance
 */
function dropAllTables(db) {
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all();

  for (const table of tables) {
    db.prepare(`DROP TABLE IF EXISTS ${table.name}`).run();
    console.log(`🗑️  Dropped table: ${table.name}`);
  }
}

/**
 * Get database statistics
 * @param {Database} db - better-sqlite3 database instance
 * @returns {Object} Database statistics
 */
function getDatabaseStats(db) {
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all();

  const stats = {
    totalTables: tables.length,
    tables: {}
  };

  for (const table of tables) {
    try {
      const count = getTableCount(db, table.name);
      stats.tables[table.name] = count;
    } catch (error) {
      stats.tables[table.name] = 'Error getting count';
    }
  }

  return stats;
}

module.exports = {
  getDatabaseConfig,
  ensureDataDirectory,
  configurePragmas,
  executeSQLFile,
  tableExists,
  getTableCount,
  truncateTable,
  dropAllTables,
  getDatabaseStats,
};
