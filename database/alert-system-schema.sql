-- ============================================================================
-- Alert System Database Schema
-- Created: February 5, 2026
-- Purpose: Complete alert management system with rules, history, and preferences
-- Database: gebiz_intelligence.db (extends existing schema)
-- ============================================================================

-- ============================================================================
-- TABLE: Alert Rules
-- Defines when alerts should be triggered
-- ============================================================================
CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- 'value_threshold', 'closing_soon', 'agency_match', 'renewal_prediction'
  conditions TEXT NOT NULL, -- JSON with rule conditions
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  notification_channels TEXT NOT NULL, -- JSON array: ['email', 'sms', 'slack', 'in_app', 'push']
  recipients TEXT NOT NULL, -- JSON with recipient details
  escalation_enabled BOOLEAN DEFAULT 0,
  escalation_after_minutes INTEGER DEFAULT 60,
  escalation_recipients TEXT, -- JSON with escalation recipient details
  digest_enabled BOOLEAN DEFAULT 0,
  digest_frequency TEXT DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
  digest_time TEXT DEFAULT '09:00', -- Time for digest delivery (HH:MM)
  active BOOLEAN DEFAULT 1,
  created_by TEXT DEFAULT 'system',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: Alert History
-- Stores triggered alerts and their delivery status
-- ============================================================================
CREATE TABLE IF NOT EXISTS alert_history (
  id TEXT PRIMARY KEY,
  rule_id TEXT,
  trigger_type TEXT NOT NULL, -- 'tender', 'renewal', 'deadline', 'system'
  tender_id TEXT,
  renewal_id TEXT,
  alert_title TEXT NOT NULL,
  alert_message TEXT NOT NULL,
  alert_priority TEXT DEFAULT 'medium',
  alert_data TEXT, -- JSON with alert-specific data
  delivered_channels TEXT, -- JSON array of channels used
  delivery_status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'partial'
  delivery_errors TEXT, -- JSON with error details if any
  triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  acknowledged BOOLEAN DEFAULT 0,
  acknowledged_at DATETIME,
  acknowledged_by TEXT,
  action_taken TEXT, -- Description of action taken
  action_notes TEXT,
  action_taken_at DATETIME,
  FOREIGN KEY (rule_id) REFERENCES alert_rules(id) ON DELETE SET NULL
);

-- ============================================================================
-- TABLE: User Alert Preferences
-- User-specific alert settings and preferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_alert_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  email_enabled BOOLEAN DEFAULT 1,
  email_address TEXT,
  sms_enabled BOOLEAN DEFAULT 0,
  sms_number TEXT,
  slack_enabled BOOLEAN DEFAULT 1,
  slack_user_id TEXT,
  in_app_enabled BOOLEAN DEFAULT 1,
  push_enabled BOOLEAN DEFAULT 0,
  quiet_hours_enabled BOOLEAN DEFAULT 0,
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end TEXT DEFAULT '08:00',
  min_priority TEXT DEFAULT 'low', -- Minimum priority to receive alerts
  digest_enabled BOOLEAN DEFAULT 1,
  digest_frequency TEXT DEFAULT 'daily',
  digest_time TEXT DEFAULT '09:00',
  digest_days TEXT DEFAULT '["mon","tue","wed","thu","fri"]', -- JSON array
  max_alerts_per_hour INTEGER DEFAULT 10,
  max_sms_per_day INTEGER DEFAULT 5,
  dnd_enabled BOOLEAN DEFAULT 0, -- Do not disturb
  dnd_until DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: Alert Delivery Log
-- Tracks delivery attempts for debugging and reliability
-- ============================================================================
CREATE TABLE IF NOT EXISTS alert_delivery_log (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'email', 'sms', 'slack', 'push'
  recipient TEXT NOT NULL, -- email address, phone, slack ID, etc.
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  provider TEXT, -- 'sendgrid', 'twilio', 'slack', 'firebase'
  provider_id TEXT, -- External provider message ID
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  sent_at DATETIME,
  delivered_at DATETIME,
  opened_at DATETIME, -- For email/push tracking
  clicked_at DATETIME, -- For email/push tracking
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (alert_id) REFERENCES alert_history(id) ON DELETE CASCADE
);

-- ============================================================================
-- TABLE: Contract Renewals (for renewal alerts)
-- Tracks contract renewal predictions and probabilities
-- ============================================================================
CREATE TABLE IF NOT EXISTS contract_renewals (
  id TEXT PRIMARY KEY,
  agency TEXT NOT NULL,
  contract_title TEXT NOT NULL,
  contract_start_date DATE,
  contract_end_date DATE,
  contract_value REAL,
  current_supplier TEXT, -- Current contract holder
  renewal_probability REAL DEFAULT 50, -- Percentage (0-100)
  renewal_confidence TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  key_factors TEXT, -- JSON array of renewal factors
  competitive_threats TEXT, -- JSON array of potential competitors
  engagement_score REAL DEFAULT 0, -- Our engagement level (0-100)
  last_contact_date DATE,
  next_action_required TEXT,
  notes TEXT,
  status TEXT DEFAULT 'monitoring', -- 'monitoring', 'engaging', 'proposing', 'won', 'lost'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: BPO Tender Lifecycle (for tender lifecycle alerts)
-- Tracks 7-stage tender pipeline management
-- ============================================================================
CREATE TABLE IF NOT EXISTS bpo_tender_lifecycle (
  id TEXT PRIMARY KEY,
  tender_no TEXT,
  title TEXT NOT NULL,
  agency TEXT NOT NULL,
  estimated_value REAL,
  closing_date DATE,
  published_date DATE,
  category TEXT,

  -- 7 Stage Pipeline
  stage TEXT DEFAULT 'discovery', -- 'discovery', 'analysis', 'bid_prep', 'submission', 'evaluation', 'award', 'post_award'
  stage_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Stage 1: Discovery & Intelligence
  discovery_completed BOOLEAN DEFAULT 0,
  discovery_notes TEXT,
  competitive_landscape TEXT, -- JSON

  -- Stage 2: Analysis & Go/No-Go
  analysis_completed BOOLEAN DEFAULT 0,
  go_no_go_decision TEXT, -- 'go', 'no_go', 'pending'
  analysis_notes TEXT,
  estimated_win_probability REAL,

  -- Stage 3: Bid Preparation
  bid_prep_started BOOLEAN DEFAULT 0,
  bid_prep_completed BOOLEAN DEFAULT 0,
  team_assigned TEXT, -- JSON array of team members
  proposal_outline TEXT,

  -- Stage 4: Submission
  submitted BOOLEAN DEFAULT 0,
  submission_date DATETIME,
  submission_method TEXT,

  -- Stage 5: Evaluation Period
  clarifications_received BOOLEAN DEFAULT 0,
  clarifications_responded BOOLEAN DEFAULT 0,
  presentation_scheduled BOOLEAN DEFAULT 0,
  presentation_completed BOOLEAN DEFAULT 0,

  -- Stage 6: Award Decision
  award_decision TEXT, -- 'won', 'lost', 'pending'
  award_date DATE,
  award_value REAL,
  award_notes TEXT,

  -- Stage 7: Post-Award
  contract_signed BOOLEAN DEFAULT 0,
  handover_completed BOOLEAN DEFAULT 0,
  lessons_learned TEXT,

  -- Tracking
  assigned_to TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'active', -- 'active', 'won', 'lost', 'withdrawn'

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Alert Rules
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON alert_rules(active);
CREATE INDEX IF NOT EXISTS idx_alert_rules_type ON alert_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_alert_rules_priority ON alert_rules(priority);

-- Alert History
CREATE INDEX IF NOT EXISTS idx_alert_history_rule_id ON alert_history(rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_trigger_type ON alert_history(trigger_type);
CREATE INDEX IF NOT EXISTS idx_alert_history_priority ON alert_history(alert_priority);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered ON alert_history(triggered_at);
CREATE INDEX IF NOT EXISTS idx_alert_history_acknowledged ON alert_history(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alert_history_unread ON alert_history(acknowledged) WHERE acknowledged = 0;

-- User Preferences
CREATE INDEX IF NOT EXISTS idx_user_prefs_user_id ON user_alert_preferences(user_id);

-- Delivery Log
CREATE INDEX IF NOT EXISTS idx_delivery_log_alert_id ON alert_delivery_log(alert_id);
CREATE INDEX IF NOT EXISTS idx_delivery_log_status ON alert_delivery_log(status);
CREATE INDEX IF NOT EXISTS idx_delivery_log_channel ON alert_delivery_log(channel);

-- Contract Renewals
CREATE INDEX IF NOT EXISTS idx_renewals_agency ON contract_renewals(agency);
CREATE INDEX IF NOT EXISTS idx_renewals_end_date ON contract_renewals(contract_end_date);
CREATE INDEX IF NOT EXISTS idx_renewals_probability ON contract_renewals(renewal_probability);
CREATE INDEX IF NOT EXISTS idx_renewals_status ON contract_renewals(status);

-- BPO Tender Lifecycle
CREATE INDEX IF NOT EXISTS idx_bpo_lifecycle_stage ON bpo_tender_lifecycle(stage);
CREATE INDEX IF NOT EXISTS idx_bpo_lifecycle_status ON bpo_tender_lifecycle(status);
CREATE INDEX IF NOT EXISTS idx_bpo_lifecycle_agency ON bpo_tender_lifecycle(agency);
CREATE INDEX IF NOT EXISTS idx_bpo_lifecycle_closing ON bpo_tender_lifecycle(closing_date);
CREATE INDEX IF NOT EXISTS idx_bpo_lifecycle_assigned ON bpo_tender_lifecycle(assigned_to);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps
CREATE TRIGGER IF NOT EXISTS update_alert_rules_timestamp
AFTER UPDATE ON alert_rules
FOR EACH ROW
BEGIN
  UPDATE alert_rules
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_user_prefs_timestamp
AFTER UPDATE ON user_alert_preferences
FOR EACH ROW
BEGIN
  UPDATE user_alert_preferences
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_renewals_timestamp
AFTER UPDATE ON contract_renewals
FOR EACH ROW
BEGIN
  UPDATE contract_renewals
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_bpo_lifecycle_timestamp
AFTER UPDATE ON bpo_tender_lifecycle
FOR EACH ROW
BEGIN
  UPDATE bpo_tender_lifecycle
  SET updated_at = CURRENT_TIMESTAMP,
      stage_updated_at = CASE
        WHEN NEW.stage != OLD.stage THEN CURRENT_TIMESTAMP
        ELSE OLD.stage_updated_at
      END
  WHERE id = NEW.id;
END;

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Sample Alert Rules
INSERT OR IGNORE INTO alert_rules (
  id, rule_name, rule_type, conditions, priority, notification_channels, recipients, active
) VALUES
  ('rule_high_value_tenders', 'High Value Tender Alert', 'value_threshold',
   '{"min_value": 1000000, "agencies": ["Ministry of Health", "Ministry of Education"]}',
   'critical', '["email", "in_app", "slack"]',
   '{"email": ["admin@worklink.sg"], "slack": ["#alerts"]}', 1),

  ('rule_closing_soon', 'Tender Closing Soon', 'closing_soon',
   '{"days_until_close": 3, "min_value": 100000}',
   'high', '["email", "in_app"]',
   '{"email": ["admin@worklink.sg"]}', 1),

  ('rule_renewal_opportunities', 'Contract Renewal Opportunities', 'renewal_prediction',
   '{"months_until_expiry": 6, "min_probability": 70}',
   'medium', '["email", "in_app"]',
   '{"email": ["admin@worklink.sg"]}', 1);

-- Sample User Preferences
INSERT OR IGNORE INTO user_alert_preferences (
  id, user_id, email_address
) VALUES
  ('pref_admin', 'admin', 'admin@worklink.sg'),
  ('pref_manager', 'manager', 'manager@worklink.sg');

-- ============================================================================
-- VIEWS for Quick Queries
-- ============================================================================

-- View: Unread Alerts Summary
DROP VIEW IF EXISTS v_unread_alerts_summary;
CREATE VIEW v_unread_alerts_summary AS
SELECT
  alert_priority as priority,
  COUNT(*) as count,
  MAX(triggered_at) as latest_alert
FROM alert_history
WHERE acknowledged = 0
GROUP BY alert_priority
ORDER BY
  CASE alert_priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END;

-- View: Recent Renewal Opportunities
DROP VIEW IF EXISTS v_recent_renewal_opportunities;
CREATE VIEW v_recent_renewal_opportunities AS
SELECT
  r.*,
  CAST((julianday(contract_end_date) - julianday('now')) / 30.44 AS INTEGER) as months_until_expiry
FROM contract_renewals r
WHERE renewal_probability >= 50
  AND contract_end_date > date('now')
  AND contract_end_date <= date('now', '+12 months')
ORDER BY contract_end_date ASC, renewal_probability DESC;

-- View: Active Tender Pipeline Summary
DROP VIEW IF EXISTS v_tender_pipeline_summary;
CREATE VIEW v_tender_pipeline_summary AS
SELECT
  stage,
  COUNT(*) as count,
  SUM(estimated_value) as total_value,
  AVG(estimated_win_probability) as avg_win_prob
FROM bpo_tender_lifecycle
WHERE status = 'active'
GROUP BY stage
ORDER BY
  CASE stage
    WHEN 'discovery' THEN 1
    WHEN 'analysis' THEN 2
    WHEN 'bid_prep' THEN 3
    WHEN 'submission' THEN 4
    WHEN 'evaluation' THEN 5
    WHEN 'award' THEN 6
    WHEN 'post_award' THEN 7
  END;

-- ============================================================================
-- INITIALIZATION COMPLETE
-- Alert System Schema Ready for Use
-- ============================================================================