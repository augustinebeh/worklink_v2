/**
 * Ensure GeBIZ Tables Utility
 * Can be called from server startup or manually
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * Ensure GeBIZ database and tables exist
 * @param {boolean} silent - Suppress console output
 * @returns {Promise<boolean>} - True if successful
 */
async function ensureGeBIZTables(silent = false) {
  const log = silent ? () => {} : console.log;
  const error = silent ? () => {} : console.error;

  try {
    // Determine environment and paths
    const IS_RAILWAY = !!process.env.RAILWAY_ENVIRONMENT; // Only true on actual Railway
    const DB_DIR = IS_RAILWAY
      ? (process.env.RAILWAY_VOLUME_MOUNT_PATH || '/app/data')
      : path.join(__dirname, '../database');

    log(`🔧 Ensuring GeBIZ tables exist...`);
    log(`   Environment: ${IS_RAILWAY ? 'Railway' : 'Local'}`);
    log(`   Database directory: ${DB_DIR}`);

    // Create database directory if it doesn't exist
    if (!fs.existsSync(DB_DIR)) {
      log(`📁 Creating database directory: ${DB_DIR}`);
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    const gebizDbPath = path.join(DB_DIR, 'gebiz_intelligence.db');
    log(`   Database path: ${gebizDbPath}`);

    // Connect to database
    const db = new Database(gebizDbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Define table creation SQL
    const tables = {
      gebiz_historical_tenders: `
        CREATE TABLE IF NOT EXISTS gebiz_historical_tenders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tender_no TEXT UNIQUE NOT NULL,
          description TEXT,
          awarded_amount REAL,
          supplier_name TEXT,
          award_date DATE,
          agency TEXT,
          category TEXT,
          contract_period_start DATE,
          contract_period_end DATE,
          raw_data TEXT,
          imported_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_gebiz_hist_supplier ON gebiz_historical_tenders(supplier_name);
        CREATE INDEX IF NOT EXISTS idx_gebiz_hist_award_date ON gebiz_historical_tenders(award_date);
        CREATE INDEX IF NOT EXISTS idx_gebiz_hist_category ON gebiz_historical_tenders(category);
        CREATE INDEX IF NOT EXISTS idx_gebiz_hist_agency ON gebiz_historical_tenders(agency);
        CREATE INDEX IF NOT EXISTS idx_gebiz_hist_amount ON gebiz_historical_tenders(awarded_amount);
      `,

      gebiz_active_tenders: `
        CREATE TABLE IF NOT EXISTS gebiz_active_tenders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tender_no TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          agency TEXT,
          closing_date DATE,
          published_date DATE,
          category TEXT,
          estimated_value REAL,
          url TEXT,
          details TEXT,
          has_details BOOLEAN DEFAULT 0,
          status TEXT DEFAULT 'open',
          scraped_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_gebiz_active_tender_no ON gebiz_active_tenders(tender_no);
        CREATE INDEX IF NOT EXISTS idx_gebiz_active_closing ON gebiz_active_tenders(closing_date);
        CREATE INDEX IF NOT EXISTS idx_gebiz_active_agency ON gebiz_active_tenders(agency);
        CREATE INDEX IF NOT EXISTS idx_gebiz_active_status ON gebiz_active_tenders(status);
      `,

      scraping_config: `
        CREATE TABLE IF NOT EXISTS scraping_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          config_key TEXT UNIQUE NOT NULL,
          config_value TEXT NOT NULL,
          description TEXT,
          updated_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        INSERT OR IGNORE INTO scraping_config (config_key, config_value, description) VALUES
          ('gebiz_keywords', '["manpower", "cleaning", "security", "hospitality", "catering", "event staff"]', 'Keywords to filter relevant GeBIZ tenders'),
          ('gebiz_historical_sync_enabled', 'true', 'Enable daily historical data sync'),
          ('gebiz_active_scrape_enabled', 'true', 'Enable active tender scraping'),
          ('alert_high_value_threshold', '100000', 'Tender value threshold for high-priority alerts (SGD)'),
          ('rate_limit_requests_per_minute', '10', 'Max requests per minute for scraping'),
          ('auto_init_timestamp', '${new Date().toISOString()}', 'When auto-initialization completed');
      `
    };

    // Create each table
    let tablesCreated = 0;
    for (const [tableName, sql] of Object.entries(tables)) {
      try {
        // Check if table exists first
        const tableExists = db.prepare(`
          SELECT name FROM sqlite_master WHERE type='table' AND name=?
        `).get(tableName);

        if (!tableExists) {
          log(`   📋 Creating table: ${tableName}`);
          db.exec(sql);
          tablesCreated++;
        } else {
          log(`   ✅ Table exists: ${tableName}`);
        }
      } catch (tableError) {
        error(`   ❌ Failed to create ${tableName}:`, tableError.message);
        throw tableError;
      }
    }

    // Verify all tables exist
    const allTables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name IN ('gebiz_historical_tenders', 'gebiz_active_tenders', 'scraping_config')
      ORDER BY name
    `).all();

    db.close();

    if (allTables.length >= 3) {
      log(`✅ GeBIZ tables ready (${tablesCreated} created, ${allTables.length} total)`);
      return true;
    } else {
      error(`❌ Missing GeBIZ tables. Expected 3, found ${allTables.length}`);
      return false;
    }

  } catch (err) {
    error(`❌ Failed to ensure GeBIZ tables:`, err.message);
    return false;
  }
}

/**
 * Check if GeBIZ tables exist without creating them
 * @returns {boolean} - True if all required tables exist
 */
function checkGeBIZTables() {
  try {
    const IS_RAILWAY = !!process.env.RAILWAY_ENVIRONMENT; // Only true on actual Railway
    const DB_DIR = IS_RAILWAY
      ? (process.env.RAILWAY_VOLUME_MOUNT_PATH || '/app/data')
      : path.join(__dirname, '../database');

    const gebizDbPath = path.join(DB_DIR, 'gebiz_intelligence.db');

    if (!fs.existsSync(gebizDbPath)) {
      return false;
    }

    const db = new Database(gebizDbPath);

    const requiredTables = ['gebiz_historical_tenders', 'gebiz_active_tenders', 'scraping_config'];
    const existingTables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name IN (${requiredTables.map(() => '?').join(',')})
    `).all(...requiredTables);

    db.close();

    return existingTables.length === requiredTables.length;

  } catch (error) {
    return false;
  }
}

module.exports = {
  ensureGeBIZTables,
  checkGeBIZTables
};