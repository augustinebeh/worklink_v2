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
  `);

  console.log('  ✅ Tenders & matching tables created');
}

module.exports = { createTendersTables };
