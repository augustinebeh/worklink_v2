/**
 * Scraping & GeBIZ Schema Tables
 * @param {Database} db - SQLite database instance
 */
function createScrapingTables(db) {
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
      in_pipeline BOOLEAN DEFAULT 0,
      dismissed BOOLEAN DEFAULT 0,
      source TEXT DEFAULT 'gebiz',
      scraped_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scraping_portals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portal_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      url TEXT,
      description TEXT,
      type TEXT DEFAULT 'government',
      enabled INTEGER DEFAULT 0,
      scraper_available INTEGER DEFAULT 0,
      icon TEXT,
      schedule TEXT,
      last_scraped_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scanner_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scraping_jobs_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_type TEXT NOT NULL,
      status TEXT NOT NULL,
      records_processed INTEGER DEFAULT 0,
      records_new INTEGER DEFAULT 0,
      records_updated INTEGER DEFAULT 0,
      errors TEXT,
      duration_seconds INTEGER,
      started_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scraping_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      source_table TEXT,
      source_id INTEGER,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      url TEXT,
      metadata TEXT,
      notified_at DATETIME,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contract_renewals (
      id TEXT PRIMARY KEY,
      original_tender_no TEXT,
      agency TEXT NOT NULL,
      title TEXT,
      description TEXT,
      service_category TEXT,
      contract_start_date DATE,
      contract_end_date DATE,
      estimated_value REAL,
      renewal_probability REAL DEFAULT 0.5,
      current_supplier TEXT,
      incumbent_advantage TEXT,
      engagement_status TEXT DEFAULT 'monitoring',
      assigned_bd_manager TEXT,
      expected_rfp_date DATE,
      pre_positioning_notes TEXT,
      source TEXT DEFAULT 'historical_analysis',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bpo_tender_lifecycle (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id INTEGER,
      tender_no TEXT UNIQUE,
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
      actual_contract_value REAL,
      estimated_cost REAL,
      estimated_margin REAL,
      stage TEXT DEFAULT 'new_opportunity',
      stage_updated_at DATETIME,
      qualification_score INTEGER,
      qualification_details TEXT,
      decision TEXT,
      decision_made_at DATETIME,
      decision_made_by TEXT,
      decision_reasoning TEXT,
      assigned_to TEXT,
      assigned_team TEXT,
      is_urgent BOOLEAN DEFAULT 0,
      is_featured BOOLEAN DEFAULT 0,
      priority TEXT DEFAULT 'medium',
      win_probability REAL,
      outcome TEXT,
      outcome_date DATE,
      winner TEXT,
      loss_reason TEXT,
      is_renewal BOOLEAN DEFAULT 0,
      renewal_id TEXT,
      incumbent_supplier TEXT,
      external_url TEXT,
      documents TEXT,
      tags TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

module.exports = { createScrapingTables };
