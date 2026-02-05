/**
 * Dynamic Table Creator Utility
 * Implements "if !table then create table" pattern for Railway compatibility
 *
 * @module database/utils/table-creator
 */

const { db } = require('../config');

/**
 * Check if table exists and create it if it doesn't
 * @param {string} tableName - Name of the table to check/create
 * @param {string} createTableSQL - SQL statement to create the table
 * @returns {boolean} - True if table exists or was created successfully
 */
function ensureTableExists(tableName, createTableSQL) {
  try {
    // Check if table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name=?
    `).get(tableName);

    if (!tableExists) {
      console.log(`📋 Creating missing table: ${tableName}`);
      db.exec(createTableSQL);
      console.log(`✅ Table created: ${tableName}`);
      return true;
    }

    return true;
  } catch (error) {
    console.error(`❌ Failed to ensure table ${tableName}:`, error.message);
    return false;
  }
}

/**
 * Ensure GeBIZ tables exist
 */
function ensureGebizTables() {
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
    `,

    audit_log: `
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        event_action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        user_id TEXT,
        old_value TEXT,
        new_value TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
    `,

    bpo_tender_lifecycle: `
      CREATE TABLE IF NOT EXISTS bpo_tender_lifecycle (
        id TEXT PRIMARY KEY,
        source_type TEXT DEFAULT 'manual_entry',
        source_id TEXT,
        tender_no TEXT,
        title TEXT NOT NULL,
        agency TEXT,
        description TEXT,
        category TEXT,
        published_date DATE,
        closing_date DATE,
        contract_start_date DATE,
        contract_end_date DATE,
        estimated_value REAL,
        our_bid_amount REAL,
        estimated_cost REAL,
        estimated_margin REAL,
        stage TEXT DEFAULT 'new_opportunity',
        priority TEXT DEFAULT 'medium',
        is_urgent BOOLEAN DEFAULT 0,
        is_featured BOOLEAN DEFAULT 0,
        is_renewal BOOLEAN DEFAULT 0,
        renewal_id TEXT,
        incumbent_supplier TEXT,
        assigned_to TEXT,
        assigned_team TEXT,
        qualification_score INTEGER,
        qualification_details TEXT,
        decision TEXT,
        decision_reasoning TEXT,
        outcome TEXT,
        outcome_date DATE,
        win_amount REAL,
        loss_reason TEXT,
        notes TEXT,
        tags TEXT,
        documents TEXT,
        external_url TEXT,
        stage_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_bpo_tender_stage ON bpo_tender_lifecycle(stage);
      CREATE INDEX IF NOT EXISTS idx_bpo_tender_priority ON bpo_tender_lifecycle(priority);
      CREATE INDEX IF NOT EXISTS idx_bpo_tender_agency ON bpo_tender_lifecycle(agency);
    `
  };

  let allTablesCreated = true;

  for (const [tableName, sql] of Object.entries(tables)) {
    if (!ensureTableExists(tableName, sql)) {
      allTablesCreated = false;
    }
  }

  return allTablesCreated;
}

/**
 * Ensure specific table exists with fallback creation
 * @param {string} tableName - Table to ensure exists
 * @returns {boolean} - True if table exists or was created
 */
function ensureTableExistsWithFallback(tableName) {
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name=?
  `).get(tableName);

  if (!tableExists) {
    console.log(`⚠️  Table ${tableName} missing - attempting to create...`);
    return ensureGebizTables();
  }

  return true;
}

module.exports = {
  ensureTableExists,
  ensureGebizTables,
  ensureTableExistsWithFallback
};