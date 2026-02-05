-- ============================================================================
-- GeBIZ Intelligence System - Database Schema
-- Created: February 5, 2026
-- Purpose: Store historical tenders, active tenders, private jobs, and alerts
-- ============================================================================

-- ============================================================================
-- TABLE 1: GeBIZ Historical Tenders (from Data.gov.sg API)
-- ============================================================================
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
  raw_data TEXT, -- JSON blob of complete API response
  imported_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gebiz_hist_supplier ON gebiz_historical_tenders(supplier_name);
CREATE INDEX idx_gebiz_hist_award_date ON gebiz_historical_tenders(award_date);
CREATE INDEX idx_gebiz_hist_category ON gebiz_historical_tenders(category);
CREATE INDEX idx_gebiz_hist_agency ON gebiz_historical_tenders(agency);
CREATE INDEX idx_gebiz_hist_amount ON gebiz_historical_tenders(awarded_amount);

-- ============================================================================
-- TABLE 2: GeBIZ Active Tenders (real-time scraping)
-- ============================================================================
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
  details TEXT, -- JSON blob with full tender details
  has_details BOOLEAN DEFAULT 0,
  status TEXT DEFAULT 'open', -- 'open', 'closing_soon', 'closed'
  scraped_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gebiz_active_tender_no ON gebiz_active_tenders(tender_no);
CREATE INDEX idx_gebiz_active_closing ON gebiz_active_tenders(closing_date);
CREATE INDEX idx_gebiz_active_agency ON gebiz_active_tenders(agency);
CREATE INDEX idx_gebiz_active_status ON gebiz_active_tenders(status);

-- ============================================================================
-- TABLE 3: Private Sector Jobs (JobStreet, FastJobs, LinkedIn, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS private_sector_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL, -- 'jobstreet', 'fastjobs', 'linkedin', 'competitor_website'
  external_id TEXT,
  title TEXT NOT NULL,
  company TEXT,
  location TEXT,
  salary TEXT,
  salary_min REAL,
  salary_max REAL,
  description TEXT,
  requirements TEXT,
  url TEXT,
  posted_date DATE,
  expires_date DATE,
  job_type TEXT, -- 'full-time', 'part-time', 'contract', 'temporary'
  category TEXT, -- 'hospitality', 'f&b', 'events', 'security', 'cleaning'
  headcount INTEGER, -- For bulk hiring detection
  scraped_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source, external_id)
);

CREATE INDEX idx_private_jobs_source ON private_sector_jobs(source);
CREATE INDEX idx_private_jobs_company ON private_sector_jobs(company);
CREATE INDEX idx_private_jobs_category ON private_sector_jobs(category);
CREATE INDEX idx_private_jobs_posted ON private_sector_jobs(posted_date);

-- ============================================================================
-- TABLE 4: Competitor Intelligence
-- ============================================================================
CREATE TABLE IF NOT EXISTS competitor_intelligence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competitor_name TEXT NOT NULL,
  source TEXT, -- 'gebiz_historical', 'gebiz_active', 'website', 'job_board'
  data_type TEXT, -- 'tender_win', 'tender_bid', 'job_posting', 'pricing'
  data_value TEXT, -- JSON blob with specific data
  tender_id INTEGER, -- Foreign key to gebiz_historical_tenders or gebiz_active_tenders
  job_id INTEGER, -- Foreign key to private_sector_jobs
  collected_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_competitor_name ON competitor_intelligence(competitor_name);
CREATE INDEX idx_competitor_source ON competitor_intelligence(source);
CREATE INDEX idx_competitor_type ON competitor_intelligence(data_type);

-- ============================================================================
-- TABLE 5: Competitor Profiles (aggregated stats)
-- ============================================================================
CREATE TABLE IF NOT EXISTS competitor_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competitor_name TEXT UNIQUE NOT NULL,
  total_tenders_won INTEGER DEFAULT 0,
  total_value_won REAL DEFAULT 0,
  avg_contract_value REAL,
  total_active_bids INTEGER DEFAULT 0,
  specializations TEXT, -- JSON array of categories they focus on
  agencies_worked_with TEXT, -- JSON array of agencies
  first_win_date DATE,
  latest_win_date DATE,
  win_rate REAL, -- Percentage (if we track their bids)
  market_share_percentage REAL,
  last_analyzed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_competitor_profile_name ON competitor_profiles(competitor_name);

-- ============================================================================
-- TABLE 6: Scraping Alerts
-- ============================================================================
CREATE TABLE IF NOT EXISTS scraping_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_type TEXT NOT NULL, -- 'new_tender', 'closing_soon', 'competitor_win', 'price_anomaly'
  title TEXT NOT NULL,
  description TEXT,
  source_table TEXT, -- 'gebiz_active_tenders', 'private_sector_jobs', etc.
  source_id INTEGER, -- ID in the source table
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'actioned', 'dismissed'
  url TEXT, -- Direct link to tender/job
  metadata TEXT, -- JSON blob with additional context
  notified_at DATETIME,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_type ON scraping_alerts(alert_type);
CREATE INDEX idx_alerts_status ON scraping_alerts(status);
CREATE INDEX idx_alerts_priority ON scraping_alerts(priority);
CREATE INDEX idx_alerts_created ON scraping_alerts(created_at);

-- ============================================================================
-- TABLE 7: Scraping Jobs Log
-- ============================================================================
CREATE TABLE IF NOT EXISTS scraping_jobs_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_type TEXT NOT NULL, -- 'gebiz_historical', 'gebiz_active', 'jobstreet', etc.
  status TEXT NOT NULL, -- 'running', 'completed', 'failed', 'timeout'
  records_processed INTEGER DEFAULT 0,
  records_new INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  errors TEXT, -- JSON array of error messages
  duration_seconds INTEGER,
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jobs_log_type ON scraping_jobs_log(job_type);
CREATE INDEX idx_jobs_log_status ON scraping_jobs_log(status);
CREATE INDEX idx_jobs_log_started ON scraping_jobs_log(started_at);

-- ============================================================================
-- TABLE 8: Data Quality Issues
-- ============================================================================
CREATE TABLE IF NOT EXISTS data_quality_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_table TEXT NOT NULL,
  source_id INTEGER,
  issue_type TEXT NOT NULL, -- 'duplicate', 'missing_field', 'invalid_format', 'outlier'
  issue_description TEXT,
  severity TEXT DEFAULT 'low', -- 'low', 'medium', 'high'
  resolved BOOLEAN DEFAULT 0,
  resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quality_table ON data_quality_issues(source_table);
CREATE INDEX idx_quality_resolved ON data_quality_issues(resolved);

-- ============================================================================
-- TABLE 9: Scraping Configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS scraping_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL, -- JSON blob
  description TEXT,
  updated_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configurations
INSERT OR IGNORE INTO scraping_config (config_key, config_value, description) VALUES
  ('gebiz_keywords', '[\"manpower\", \"cleaning\", \"security\", \"hospitality\", \"catering\", \"event staff\"]', 'Keywords to filter relevant GeBIZ tenders'),
  ('gebiz_historical_sync_enabled', 'true', 'Enable daily historical data sync'),
  ('gebiz_active_scrape_enabled', 'true', 'Enable active tender scraping'),
  ('private_jobs_scrape_enabled', 'true', 'Enable private sector job scraping'),
  ('alert_email_recipients', '[\"admin@worklink.sg\"]', 'Email addresses for alert notifications'),
  ('alert_high_value_threshold', '100000', 'Tender value threshold for high-priority alerts (SGD)'),
  ('rate_limit_requests_per_minute', '10', 'Max requests per minute for scraping');

-- ============================================================================
-- TABLE 10: Opt-Out List (PDPA Compliance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS scraping_opt_out (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  company_name TEXT,
  reason TEXT,
  opted_out_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_opt_out_email ON scraping_opt_out(email);

-- ============================================================================
-- VIEWS for Quick Analytics
-- ============================================================================

-- View: Top Competitors (Last 6 Months)
CREATE VIEW IF NOT EXISTS v_top_competitors AS
SELECT 
  supplier_name,
  COUNT(*) as tender_count,
  SUM(awarded_amount) as total_value,
  AVG(awarded_amount) as avg_value,
  MIN(award_date) as first_win,
  MAX(award_date) as latest_win,
  GROUP_CONCAT(DISTINCT category) as categories
FROM gebiz_historical_tenders
WHERE award_date >= date('now', '-6 months')
GROUP BY supplier_name
ORDER BY total_value DESC;

-- View: Active Tenders Closing Soon
CREATE VIEW IF NOT EXISTS v_closing_soon AS
SELECT 
  id,
  tender_no,
  title,
  agency,
  closing_date,
  CAST((julianday(closing_date) - julianday('now')) AS INTEGER) as days_until_close,
  url,
  estimated_value
FROM gebiz_active_tenders
WHERE closing_date >= date('now')
  AND closing_date <= date('now', '+7 days')
  AND status = 'open'
ORDER BY closing_date ASC;

-- View: Recent Competitor Activity
CREATE VIEW IF NOT EXISTS v_recent_competitor_activity AS
SELECT 
  supplier_name,
  tender_no,
  description,
  awarded_amount,
  award_date,
  agency,
  category
FROM gebiz_historical_tenders
WHERE imported_at >= datetime('now', '-7 days')
ORDER BY award_date DESC;

-- ============================================================================
-- TRIGGERS for Automatic Updates
-- ============================================================================

-- Update updated_at timestamp on gebiz_historical_tenders
CREATE TRIGGER IF NOT EXISTS update_gebiz_hist_timestamp 
AFTER UPDATE ON gebiz_historical_tenders
FOR EACH ROW
BEGIN
  UPDATE gebiz_historical_tenders 
  SET updated_at = CURRENT_TIMESTAMP 
  WHERE id = NEW.id;
END;

-- Update updated_at timestamp on gebiz_active_tenders
CREATE TRIGGER IF NOT EXISTS update_gebiz_active_timestamp 
AFTER UPDATE ON gebiz_active_tenders
FOR EACH ROW
BEGIN
  UPDATE gebiz_active_tenders 
  SET updated_at = CURRENT_TIMESTAMP 
  WHERE id = NEW.id;
END;

-- Auto-update tender status based on closing date
CREATE TRIGGER IF NOT EXISTS update_tender_status 
AFTER INSERT ON gebiz_active_tenders
FOR EACH ROW
WHEN NEW.closing_date IS NOT NULL
BEGIN
  UPDATE gebiz_active_tenders
  SET status = CASE
    WHEN julianday(NEW.closing_date) - julianday('now') <= 3 THEN 'closing_soon'
    WHEN julianday(NEW.closing_date) - julianday('now') < 0 THEN 'closed'
    ELSE 'open'
  END
  WHERE id = NEW.id;
END;

-- ============================================================================
-- DATABASE STATS VIEW
-- ============================================================================
CREATE VIEW IF NOT EXISTS v_database_stats AS
SELECT 
  'Historical Tenders' as table_name,
  COUNT(*) as record_count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM gebiz_historical_tenders
UNION ALL
SELECT 
  'Active Tenders' as table_name,
  COUNT(*) as record_count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM gebiz_active_tenders
UNION ALL
SELECT 
  'Private Jobs' as table_name,
  COUNT(*) as record_count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM private_sector_jobs
UNION ALL
SELECT 
  'Pending Alerts' as table_name,
  COUNT(*) as record_count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM scraping_alerts
WHERE status = 'pending';

-- ============================================================================
-- INITIALIZATION COMPLETE
-- ============================================================================
-- Run this script with: sqlite3 gebiz_intelligence.db < schema.sql
-- ============================================================================
