#!/usr/bin/env node

/**
 * Railway GeBIZ Database Initialization Script
 * Ensures GeBIZ tables exist on Railway deployment startup
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * Initialize GeBIZ database for Railway environment
 */
async function initializeRailwayGeBIZ() {
  console.log('🚂 ===============================');
  console.log('🚂 RAILWAY GEBIZ INITIALIZATION');
  console.log('🚂 ===============================\n');

  try {
    // Determine Railway-compatible paths
    const IS_RAILWAY = !!process.env.RAILWAY_ENVIRONMENT; // Only true on actual Railway
    const DB_DIR = IS_RAILWAY
      ? (process.env.RAILWAY_VOLUME_MOUNT_PATH || '/app/data')
      : path.join(__dirname, '../database');

    console.log(`Environment: ${IS_RAILWAY ? 'Railway' : 'Local'}`);
    console.log(`Database directory: ${DB_DIR}`);

    // Ensure database directory exists
    if (!fs.existsSync(DB_DIR)) {
      console.log('📁 Creating database directory...');
      fs.mkdirSync(DB_DIR, { recursive: true });
      console.log('✅ Database directory created');
    }

    const gebizDbPath = path.join(DB_DIR, 'gebiz_intelligence.db');
    console.log(`Database path: ${gebizDbPath}\n`);

    // Create database connection
    console.log('🔌 Connecting to database...');
    const db = new Database(gebizDbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    console.log('✅ Database connected\n');

    // Create essential tables
    console.log('📋 Creating GeBIZ tables...');

    // Historical tenders table
    console.log('  → Creating gebiz_historical_tenders...');
    db.exec(`
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
    `);

    // Active tenders table
    console.log('  → Creating gebiz_active_tenders...');
    db.exec(`
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
    `);

    // Configuration table
    console.log('  → Creating scraping_config...');
    db.exec(`
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
        ('railway_init_timestamp', '${new Date().toISOString()}', 'When Railway initialization completed');
    `);

    console.log('✅ All tables created successfully\n');

    // Verify installation
    console.log('🔍 Verifying installation...');
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table'
      ORDER BY name
    `).all();

    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });

    // Check configuration
    const configCount = db.prepare('SELECT COUNT(*) as count FROM scraping_config').get().count;
    console.log(`✅ Configuration entries: ${configCount}\n`);

    // Close database
    db.close();

    console.log('🚂 ===============================');
    console.log('🚂 ✅ RAILWAY INIT SUCCESSFUL!');
    console.log('🚂 ===============================\n');

    console.log('Next steps:');
    console.log('  1. GeBIZ endpoints are now available');
    console.log('  2. Health check: GET /api/v1/gebiz/health');
    console.log('  3. Debug info: GET /api/v1/gebiz/debug-info');
    console.log('  4. Manual init: POST /api/v1/gebiz/init-tables\n');

    return true;

  } catch (error) {
    console.error('\n❌ Railway GeBIZ initialization failed:', error.message);
    console.error('   Stack:', error.stack);

    // Don't exit process on Railway - let the app continue
    if (process.env.RAILWAY_ENVIRONMENT) {
      console.log('⚠️  Continuing startup despite GeBIZ init failure (Railway mode)');
      return false;
    } else {
      process.exit(1);
    }
  }
}

/**
 * Test database connection and tables
 */
function testGeBIZDatabase() {
  try {
    const IS_RAILWAY = !!process.env.RAILWAY_ENVIRONMENT; // Only true on actual Railway
    const DB_DIR = IS_RAILWAY
      ? (process.env.RAILWAY_VOLUME_MOUNT_PATH || '/app/data')
      : path.join(__dirname, '../database');

    const gebizDbPath = path.join(DB_DIR, 'gebiz_intelligence.db');

    if (!fs.existsSync(gebizDbPath)) {
      console.log('❌ GeBIZ database file does not exist');
      return false;
    }

    const db = new Database(gebizDbPath);

    // Test critical tables
    const criticalTables = ['gebiz_historical_tenders', 'gebiz_active_tenders', 'scraping_config'];
    const tableResults = criticalTables.map(tableName => {
      try {
        const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
        return { table: tableName, exists: !!result };
      } catch (error) {
        return { table: tableName, exists: false, error: error.message };
      }
    });

    db.close();

    console.log('🔍 GeBIZ Database Test Results:');
    tableResults.forEach(result => {
      const status = result.exists ? '✅' : '❌';
      console.log(`  ${status} ${result.table} ${result.error ? `(${result.error})` : ''}`);
    });

    return tableResults.every(result => result.exists);

  } catch (error) {
    console.error('❌ GeBIZ database test failed:', error.message);
    return false;
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'test':
      testGeBIZDatabase();
      break;
    case 'init':
    default:
      initializeRailwayGeBIZ();
      break;
  }
}

module.exports = {
  initializeRailwayGeBIZ,
  testGeBIZDatabase
};