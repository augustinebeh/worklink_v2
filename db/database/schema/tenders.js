/**
 * Tenders & Matching Schema
 * Tables for tender management, job matching, and financial projections
 * 
 * @module database/schema/tenders
 */

const { db } = require('../config');

/**
 * Create tender and matching tables
 */
function createTendersTables() {
  db.exec(`
    -- =====================================================
    -- TENDER MANAGEMENT
    -- =====================================================

    -- Tenders (Government/Enterprise Opportunities)
    CREATE TABLE IF NOT EXISTS tenders (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      external_id TEXT,
      title TEXT NOT NULL,
      agency TEXT,
      category TEXT,
      estimated_value REAL,
      closing_date DATETIME,
      status TEXT DEFAULT 'new',
      manpower_required INTEGER,
      duration_months INTEGER,
      location TEXT,
      estimated_charge_rate REAL,
      estimated_pay_rate REAL,
      estimated_monthly_revenue REAL,
      our_bid_amount REAL,
      win_probability INTEGER,
      recommended_action TEXT,
      notes TEXT,
      assigned_to TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tender Alerts (Keyword Monitoring)
    CREATE TABLE IF NOT EXISTS tender_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      source TEXT DEFAULT 'all',
      email_notify INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1,
      last_checked DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tender Matches (From RSS/Scraping)
    CREATE TABLE IF NOT EXISTS tender_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id INTEGER,
      tender_id TEXT,
      external_url TEXT,
      title TEXT,
      matched_keyword TEXT,
      notified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (alert_id) REFERENCES tender_alerts(id)
    );

    -- =====================================================
    -- JOB MATCHING SYSTEM
    -- =====================================================

    -- Job Match Scores (AI-Powered Matching)
    CREATE TABLE IF NOT EXISTS job_match_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT,
      candidate_id TEXT,
      score REAL,
      factors TEXT,  -- JSON: scoring breakdown
      notified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(job_id, candidate_id),
      FOREIGN KEY (job_id) REFERENCES jobs(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- =====================================================
    -- FINANCIAL TRACKING
    -- =====================================================

    -- Financial Projections (Monthly Targets)
    CREATE TABLE IF NOT EXISTS financial_projections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT,
      year INTEGER,
      projected_revenue REAL,
      projected_costs REAL,
      projected_profit REAL,
      actual_revenue REAL,
      actual_costs REAL,
      actual_profit REAL
    );

    -- =====================================================
    -- GEBIZ INTELLIGENCE SYSTEM
    -- =====================================================

    -- GeBIZ Historical Tenders (from Data.gov.sg API)
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

    -- GeBIZ Active Tenders (real-time scraping)
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

    -- Audit Log (for tender lifecycle tracking)
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

    -- Create indexes for GeBIZ tables
    CREATE INDEX IF NOT EXISTS idx_gebiz_hist_supplier ON gebiz_historical_tenders(supplier_name);
    CREATE INDEX IF NOT EXISTS idx_gebiz_hist_award_date ON gebiz_historical_tenders(award_date);
    CREATE INDEX IF NOT EXISTS idx_gebiz_hist_category ON gebiz_historical_tenders(category);
    CREATE INDEX IF NOT EXISTS idx_gebiz_hist_agency ON gebiz_historical_tenders(agency);
    CREATE INDEX IF NOT EXISTS idx_gebiz_active_tender_no ON gebiz_active_tenders(tender_no);
    CREATE INDEX IF NOT EXISTS idx_gebiz_active_closing ON gebiz_active_tenders(closing_date);
    CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
  `);

  console.log('  ✅ Tenders & matching tables created');
}

module.exports = { createTendersTables };
