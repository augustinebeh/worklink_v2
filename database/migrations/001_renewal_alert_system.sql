-- ============================================================================
-- RENEWAL TRACKING & ALERT SYSTEM EXTENSION
-- Created: February 5, 2026
-- Purpose: Add renewal prediction, contract lifecycle tracking, and enterprise alerts
-- Migration Version: 2.0
-- ============================================================================

-- ============================================================================
-- PART 1: EXTEND EXISTING TABLES FOR RENEWAL TRACKING
-- ============================================================================

-- Add renewal tracking fields to gebiz_historical_tenders
ALTER TABLE gebiz_historical_tenders ADD COLUMN contract_start_date DATE;
ALTER TABLE gebiz_historical_tenders ADD COLUMN contract_duration_months INTEGER;
ALTER TABLE gebiz_historical_tenders ADD COLUMN contract_end_date DATE; -- Calculated: start + duration
ALTER TABLE gebiz_historical_tenders ADD COLUMN renewal_probability INTEGER DEFAULT 50; -- 0-100
ALTER TABLE gebiz_historical_tenders ADD COLUMN incumbent_supplier TEXT; -- Same as supplier_name for historical
ALTER TABLE gebiz_historical_tenders ADD COLUMN renewal_window_start DATE; -- 12 months before end
ALTER TABLE gebiz_historical_tenders ADD COLUMN renewal_window_end DATE; -- Contract end date
ALTER TABLE gebiz_historical_tenders ADD COLUMN tracking_status TEXT DEFAULT 'expired'; -- 'active', 'approaching_renewal', 'expired', 'renewed'
ALTER TABLE gebiz_historical_tenders ADD COLUMN has_renewal_clause BOOLEAN DEFAULT 0; -- From PDF analysis
ALTER TABLE gebiz_historical_tenders ADD COLUMN manpower_required INTEGER; -- FTE from PDF
ALTER TABLE gebiz_historical_tenders ADD COLUMN service_type TEXT; -- 'manpower_bpo', 'cleaning', 'security', etc.

-- Add indexes for renewal queries
CREATE INDEX IF NOT EXISTS idx_gebiz_hist_contract_end ON gebiz_historical_tenders(contract_end_date);
CREATE INDEX IF NOT EXISTS idx_gebiz_hist_tracking_status ON gebiz_historical_tenders(tracking_status);
CREATE INDEX IF NOT EXISTS idx_gebiz_hist_renewal_window ON gebiz_historical_tenders(renewal_window_start, renewal_window_end);

-- ============================================================================
-- PART 2: NEW TABLE - CONTRACT RENEWAL PREDICTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS contract_renewals (
  id TEXT PRIMARY KEY, -- UUID
  original_tender_id INTEGER, -- References gebiz_historical_tenders.id
  original_tender_no TEXT, -- For easy lookup
  
  -- Contract Details
  agency TEXT NOT NULL,
  contract_description TEXT,
  contract_value REAL,
  incumbent_supplier TEXT,
  contract_end_date DATE NOT NULL,
  
  -- Prediction Details
  predicted_rfp_date DATE, -- When we expect RFP to be published
  predicted_renewal_date DATE, -- When contract will renew
  confidence_score INTEGER DEFAULT 50, -- 0-100
  renewal_probability INTEGER DEFAULT 50, -- 0-100 (from ML model)
  reasoning TEXT, -- Why we think it will renew (JSON)
  
  -- Engagement Tracking
  engagement_status TEXT DEFAULT 'not_started', 
  -- 'not_started', 'initial_contact', 'relationship_building', 'rfp_published', 'bid_submitted', 'lost', 'won'
  
  engagement_window_start DATE, -- 12 months before expiry
  engagement_window_end DATE, -- 9 months before expiry (optimal)
  
  -- Assignment
  assigned_bd_manager TEXT, -- User ID or name
  assigned_bid_manager TEXT,
  assigned_at DATETIME,
  
  -- Notes & Actions
  notes TEXT, -- Free-form notes
  action_items TEXT, -- JSON array of action items
  next_action_date DATE,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (original_tender_id) REFERENCES gebiz_historical_tenders(id)
);

CREATE INDEX idx_renewals_end_date ON contract_renewals(contract_end_date);
CREATE INDEX idx_renewals_rfp_date ON contract_renewals(predicted_rfp_date);
CREATE INDEX idx_renewals_engagement ON contract_renewals(engagement_status);
CREATE INDEX idx_renewals_assigned ON contract_renewals(assigned_bd_manager);
CREATE INDEX idx_renewals_agency ON contract_renewals(agency);
CREATE INDEX idx_renewals_confidence ON contract_renewals(confidence_score);

-- ============================================================================
-- PART 3: NEW TABLE - BPO TENDER LIFECYCLE (Unified Pipeline)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bpo_tender_lifecycle (
  id TEXT PRIMARY KEY, -- UUID
  
  -- Source Tracking
  source_type TEXT NOT NULL, -- 'gebiz_active', 'gebiz_historical_renewal', 'manual_entry', 'competitor_intel'
  source_id INTEGER, -- ID from source table
  tender_no TEXT UNIQUE,
  
  -- Basic Info
  title TEXT NOT NULL,
  agency TEXT,
  description TEXT,
  category TEXT,
  
  -- Dates
  published_date DATE,
  closing_date DATE,
  contract_start_date DATE,
  contract_end_date DATE,
  
  -- Financial
  estimated_value REAL,
  our_bid_amount REAL,
  actual_contract_value REAL,
  estimated_cost REAL,
  estimated_margin REAL, -- Percentage
  
  -- Pipeline Stage
  stage TEXT DEFAULT 'new_opportunity', 
  -- 'renewal_watch', 'new_opportunity', 'review', 'bidding', 'internal_approval', 'submitted', 'awarded', 'lost'
  
  stage_updated_at DATETIME,
  
  -- Go/No-Go Decision
  qualification_score INTEGER, -- 0-100 from Go/No-Go checklist
  qualification_details TEXT, -- JSON with checklist answers
  decision TEXT, -- 'go', 'no-go', 'maybe', 'pending'
  decision_made_at DATETIME,
  decision_made_by TEXT,
  decision_reasoning TEXT,
  
  -- Assignment
  assigned_to TEXT, -- User ID or name
  assigned_team TEXT, -- JSON array of team members
  
  -- Status Tracking
  is_urgent BOOLEAN DEFAULT 0,
  is_featured BOOLEAN DEFAULT 0,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  -- Win/Loss
  outcome TEXT, -- 'won', 'lost', 'pending'
  outcome_date DATE,
  winner TEXT, -- Supplier name if we lost
  loss_reason TEXT,
  
  -- Renewal Tracking (if this is a renewal opportunity)
  is_renewal BOOLEAN DEFAULT 0,
  renewal_id TEXT, -- References contract_renewals.id
  incumbent_supplier TEXT,
  
  -- Documents & Links
  external_url TEXT,
  documents TEXT, -- JSON array of document URLs
  
  -- Metadata
  tags TEXT, -- JSON array of tags
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lifecycle_stage ON bpo_tender_lifecycle(stage);
CREATE INDEX idx_lifecycle_closing ON bpo_tender_lifecycle(closing_date);
CREATE INDEX idx_lifecycle_agency ON bpo_tender_lifecycle(agency);
CREATE INDEX idx_lifecycle_assigned ON bpo_tender_lifecycle(assigned_to);
CREATE INDEX idx_lifecycle_outcome ON bpo_tender_lifecycle(outcome);
CREATE INDEX idx_lifecycle_priority ON bpo_tender_lifecycle(priority);
CREATE INDEX idx_lifecycle_renewal ON bpo_tender_lifecycle(is_renewal);
CREATE INDEX idx_lifecycle_tender_no ON bpo_tender_lifecycle(tender_no);

-- ============================================================================
-- PART 4: NEW TABLE - ALERT RULES ENGINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY, -- UUID
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, 
  -- 'keyword_match', 'agency_match', 'value_threshold', 'renewal_prediction', 
  -- 'closing_soon', 'competitor_activity', 'new_tender'
  
  -- Rule Conditions (JSON)
  conditions TEXT NOT NULL, 
  /* Example:
  {
    "keywords": ["manpower", "cleaning"],
    "agencies": ["MOH", "MOE"],
    "min_value": 100000,
    "max_value": 5000000,
    "categories": ["manpower_bpo", "cleaning"],
    "days_until_close": 7
  }
  */
  
  -- Priority & Routing
  priority TEXT DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  notification_channels TEXT NOT NULL, -- JSON: ['email', 'sms', 'slack', 'in_app', 'push']
  
  -- Recipients (JSON)
  recipients TEXT NOT NULL, 
  /* Example:
  {
    "users": ["user_123", "user_456"],
    "emails": ["bd@worklink.sg", "bids@worklink.sg"],
    "roles": ["bid_manager", "bd_manager"],
    "slack_channels": ["#tenders", "#alerts"]
  }
  */
  
  -- Escalation
  escalation_enabled BOOLEAN DEFAULT 0,
  escalation_after_minutes INTEGER DEFAULT 60,
  escalation_recipients TEXT, -- JSON, same format as recipients
  
  -- Digest Mode
  digest_enabled BOOLEAN DEFAULT 0,
  digest_frequency TEXT, -- 'daily', 'weekly', 'immediate'
  digest_time TEXT, -- '09:00' for daily digest
  
  -- Status
  active BOOLEAN DEFAULT 1,
  last_triggered_at DATETIME,
  total_triggers INTEGER DEFAULT 0,
  
  -- Metadata
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alert_rules_type ON alert_rules(rule_type);
CREATE INDEX idx_alert_rules_active ON alert_rules(active);
CREATE INDEX idx_alert_rules_priority ON alert_rules(priority);

-- ============================================================================
-- PART 5: NEW TABLE - ALERT HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_history (
  id TEXT PRIMARY KEY, -- UUID
  rule_id TEXT, -- References alert_rules.id
  
  -- Trigger Source
  trigger_type TEXT NOT NULL, -- 'tender', 'renewal', 'competitor', 'manual'
  tender_id TEXT, -- References bpo_tender_lifecycle.id
  renewal_id TEXT, -- References contract_renewals.id
  
  -- Alert Content
  alert_title TEXT NOT NULL,
  alert_message TEXT,
  alert_priority TEXT,
  alert_data TEXT, -- JSON with full context
  
  -- Delivery
  triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  delivered_channels TEXT, -- JSON: ['email', 'sms', 'slack']
  delivery_status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'partially_sent'
  delivery_errors TEXT, -- JSON array of errors
  
  -- Acknowledgment
  acknowledged BOOLEAN DEFAULT 0,
  acknowledged_at DATETIME,
  acknowledged_by TEXT,
  
  -- Action Taken
  action_taken TEXT, -- 'moved_to_review', 'assigned_to_bid_manager', 'dismissed', etc.
  action_notes TEXT,
  action_taken_at DATETIME,
  
  -- Escalation Tracking
  escalated BOOLEAN DEFAULT 0,
  escalated_at DATETIME,
  escalation_level INTEGER DEFAULT 0,
  
  FOREIGN KEY (rule_id) REFERENCES alert_rules(id)
);

CREATE INDEX idx_alert_history_rule ON alert_history(rule_id);
CREATE INDEX idx_alert_history_tender ON alert_history(tender_id);
CREATE INDEX idx_alert_history_renewal ON alert_history(renewal_id);
CREATE INDEX idx_alert_history_triggered ON alert_history(triggered_at);
CREATE INDEX idx_alert_history_acknowledged ON alert_history(acknowledged);
CREATE INDEX idx_alert_history_priority ON alert_history(alert_priority);

-- ============================================================================
-- PART 6: NEW TABLE - USER ALERT PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_alert_preferences (
  id TEXT PRIMARY KEY, -- UUID
  user_id TEXT UNIQUE NOT NULL,
  
  -- Channel Preferences
  email_enabled BOOLEAN DEFAULT 1,
  email_address TEXT,
  sms_enabled BOOLEAN DEFAULT 0,
  sms_number TEXT,
  slack_enabled BOOLEAN DEFAULT 1,
  slack_user_id TEXT,
  in_app_enabled BOOLEAN DEFAULT 1,
  push_enabled BOOLEAN DEFAULT 1,
  
  -- Quiet Hours
  quiet_hours_enabled BOOLEAN DEFAULT 0,
  quiet_hours_start TEXT, -- '22:00'
  quiet_hours_end TEXT, -- '08:00'
  quiet_hours_timezone TEXT DEFAULT 'Asia/Singapore',
  
  -- Priority Filters
  min_priority TEXT DEFAULT 'low', -- Only receive alerts at or above this priority
  
  -- Digest Preferences
  digest_enabled BOOLEAN DEFAULT 0,
  digest_frequency TEXT DEFAULT 'daily', -- 'daily', 'weekly'
  digest_time TEXT DEFAULT '09:00',
  digest_days TEXT, -- JSON: ['monday', 'wednesday', 'friday']
  
  -- Notification Limits
  max_alerts_per_hour INTEGER DEFAULT 10,
  max_sms_per_day INTEGER DEFAULT 5,
  
  -- Do Not Disturb
  dnd_enabled BOOLEAN DEFAULT 0,
  dnd_until DATETIME,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_prefs_user ON user_alert_preferences(user_id);

-- ============================================================================
-- PART 7: NEW TABLE - RENEWAL ENGAGEMENT ACTIVITIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS renewal_engagement_activities (
  id TEXT PRIMARY KEY, -- UUID
  renewal_id TEXT NOT NULL, -- References contract_renewals.id
  
  -- Activity Details
  activity_type TEXT NOT NULL, -- 'contact', 'meeting', 'proposal', 'follow_up', 'research'
  activity_date DATE NOT NULL,
  activity_description TEXT,
  
  -- Participants
  participants TEXT, -- JSON array of names/emails
  conducted_by TEXT, -- User who logged this
  
  -- Outcomes
  outcome TEXT,
  next_steps TEXT,
  
  -- Documents
  attachments TEXT, -- JSON array of file URLs
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (renewal_id) REFERENCES contract_renewals(id)
);

CREATE INDEX idx_engagement_renewal ON renewal_engagement_activities(renewal_id);
CREATE INDEX idx_engagement_date ON renewal_engagement_activities(activity_date);

-- ============================================================================
-- PART 8: NEW TABLE - AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY, -- UUID
  
  -- Event Details
  event_type TEXT NOT NULL, 
  -- 'tender_viewed', 'alert_acknowledged', 'renewal_created', 'decision_made',
  -- 'stage_changed', 'assignment_changed', 'document_accessed'
  
  event_action TEXT, -- 'create', 'read', 'update', 'delete'
  
  -- User
  user_id TEXT,
  user_email TEXT,
  user_ip TEXT,
  
  -- Resource
  resource_type TEXT, -- 'tender', 'renewal', 'alert', 'document'
  resource_id TEXT,
  
  -- Changes
  old_value TEXT, -- JSON
  new_value TEXT, -- JSON
  
  -- Context
  request_method TEXT, -- 'GET', 'POST', 'PATCH'
  request_path TEXT,
  user_agent TEXT,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_event ON audit_log(event_type);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- ============================================================================
-- PART 9: VIEWS FOR ANALYTICS
-- ============================================================================

-- View: Upcoming Renewals (Next 12 Months)
CREATE VIEW IF NOT EXISTS v_upcoming_renewals AS
SELECT 
  r.id,
  r.agency,
  r.contract_description,
  r.incumbent_supplier,
  r.contract_end_date,
  r.predicted_rfp_date,
  r.renewal_probability,
  r.confidence_score,
  r.engagement_status,
  r.assigned_bd_manager,
  CAST((julianday(r.contract_end_date) - julianday('now')) / 30 AS INTEGER) as months_until_expiry,
  CAST((julianday(r.predicted_rfp_date) - julianday('now')) AS INTEGER) as days_until_rfp
FROM contract_renewals r
WHERE r.contract_end_date >= date('now')
  AND r.contract_end_date <= date('now', '+12 months')
  AND r.engagement_status NOT IN ('lost', 'won')
ORDER BY r.contract_end_date ASC;

-- View: High-Priority Renewal Opportunities
CREATE VIEW IF NOT EXISTS v_high_priority_renewals AS
SELECT 
  r.*,
  CAST((julianday(r.contract_end_date) - julianday('now')) / 30 AS INTEGER) as months_until_expiry
FROM contract_renewals r
WHERE r.renewal_probability >= 70
  AND r.contract_end_date >= date('now')
  AND r.contract_end_date <= date('now', '+12 months')
  AND r.engagement_status NOT IN ('lost', 'won')
ORDER BY r.renewal_probability DESC, r.contract_end_date ASC;

-- View: Tender Pipeline Summary
CREATE VIEW IF NOT EXISTS v_pipeline_summary AS
SELECT 
  stage,
  COUNT(*) as count,
  SUM(estimated_value) as total_value,
  AVG(estimated_value) as avg_value,
  SUM(CASE WHEN is_urgent = 1 THEN 1 ELSE 0 END) as urgent_count
FROM bpo_tender_lifecycle
WHERE stage NOT IN ('awarded', 'lost')
GROUP BY stage;

-- View: Unacknowledged Critical Alerts
CREATE VIEW IF NOT EXISTS v_unacknowledged_critical_alerts AS
SELECT 
  ah.id,
  ah.alert_title,
  ah.alert_message,
  ah.alert_priority,
  ah.triggered_at,
  CAST((julianday('now') - julianday(ah.triggered_at)) * 24 * 60 AS INTEGER) as minutes_since_trigger,
  ar.rule_name,
  ar.escalation_after_minutes
FROM alert_history ah
JOIN alert_rules ar ON ah.rule_id = ar.id
WHERE ah.acknowledged = 0
  AND ah.alert_priority IN ('critical', 'high')
ORDER BY ah.triggered_at ASC;

-- View: Win/Loss Analytics
CREATE VIEW IF NOT EXISTS v_win_loss_analytics AS
SELECT 
  strftime('%Y-%m', outcome_date) as month,
  outcome,
  COUNT(*) as count,
  SUM(actual_contract_value) as total_value,
  AVG(actual_contract_value) as avg_value
FROM bpo_tender_lifecycle
WHERE outcome IN ('won', 'lost')
  AND outcome_date >= date('now', '-12 months')
GROUP BY strftime('%Y-%m', outcome_date), outcome
ORDER BY month DESC;

-- ============================================================================
-- PART 10: TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Auto-update contract_end_date when start date or duration changes
CREATE TRIGGER IF NOT EXISTS calculate_contract_end_date
AFTER UPDATE OF contract_start_date, contract_duration_months ON gebiz_historical_tenders
FOR EACH ROW
WHEN NEW.contract_start_date IS NOT NULL AND NEW.contract_duration_months IS NOT NULL
BEGIN
  UPDATE gebiz_historical_tenders
  SET contract_end_date = date(NEW.contract_start_date, '+' || NEW.contract_duration_months || ' months')
  WHERE id = NEW.id;
END;

-- Auto-calculate renewal windows
CREATE TRIGGER IF NOT EXISTS calculate_renewal_windows
AFTER UPDATE OF contract_end_date ON gebiz_historical_tenders
FOR EACH ROW
WHEN NEW.contract_end_date IS NOT NULL
BEGIN
  UPDATE gebiz_historical_tenders
  SET renewal_window_start = date(NEW.contract_end_date, '-12 months'),
      renewal_window_end = NEW.contract_end_date
  WHERE id = NEW.id;
END;

-- Auto-update tracking status based on dates
CREATE TRIGGER IF NOT EXISTS update_tracking_status
AFTER UPDATE OF contract_end_date ON gebiz_historical_tenders
FOR EACH ROW
WHEN NEW.contract_end_date IS NOT NULL
BEGIN
  UPDATE gebiz_historical_tenders
  SET tracking_status = CASE
    WHEN date(NEW.contract_end_date) < date('now') THEN 'expired'
    WHEN date(NEW.contract_end_date) <= date('now', '+12 months') THEN 'approaching_renewal'
    ELSE 'active'
  END
  WHERE id = NEW.id;
END;

-- Update updated_at timestamp on contract_renewals
CREATE TRIGGER IF NOT EXISTS update_renewals_timestamp
AFTER UPDATE ON contract_renewals
FOR EACH ROW
BEGIN
  UPDATE contract_renewals
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

-- Update updated_at timestamp on bpo_tender_lifecycle
CREATE TRIGGER IF NOT EXISTS update_lifecycle_timestamp
AFTER UPDATE ON bpo_tender_lifecycle
FOR EACH ROW
BEGIN
  UPDATE bpo_tender_lifecycle
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

-- Update stage_updated_at when stage changes
CREATE TRIGGER IF NOT EXISTS update_stage_timestamp
AFTER UPDATE OF stage ON bpo_tender_lifecycle
FOR EACH ROW
WHEN NEW.stage != OLD.stage
BEGIN
  UPDATE bpo_tender_lifecycle
  SET stage_updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

-- Increment total_triggers on alert_rules when alert fires
CREATE TRIGGER IF NOT EXISTS increment_alert_triggers
AFTER INSERT ON alert_history
FOR EACH ROW
BEGIN
  UPDATE alert_rules
  SET total_triggers = total_triggers + 1,
      last_triggered_at = CURRENT_TIMESTAMP
  WHERE id = NEW.rule_id;
END;

-- ============================================================================
-- PART 11: DEFAULT ALERT RULES (Sample)
-- ============================================================================

-- Insert default alert rules
INSERT OR IGNORE INTO alert_rules (
  id, rule_name, rule_type, conditions, priority, 
  notification_channels, recipients, active, created_by
) VALUES 
(
  'rule_001',
  'High-Value Tender Alert',
  'value_threshold',
  '{"min_value": 1000000, "categories": ["manpower_bpo", "cleaning", "security"]}',
  'high',
  '["email", "sms", "slack", "in_app"]',
  '{"roles": ["bid_manager", "director"], "slack_channels": ["#tenders-urgent"]}',
  1,
  'system'
),
(
  'rule_002',
  'Closing Soon Alert (48 hours)',
  'closing_soon',
  '{"days_until_close": 2, "exclude_stages": ["submitted", "awarded", "lost"]}',
  'critical',
  '["email", "sms", "slack", "in_app"]',
  '{"roles": ["bid_manager", "assigned_to"]}',
  1,
  'system'
),
(
  'rule_003',
  'Renewal Prediction Alert (6 months)',
  'renewal_prediction',
  '{"months_until_expiry": 6, "min_probability": 70}',
  'high',
  '["email", "slack", "in_app"]',
  '{"roles": ["bd_manager", "director"]}',
  1,
  'system'
),
(
  'rule_004',
  'Target Agency New Tender',
  'agency_match',
  '{"agencies": ["MOH", "MOE", "MOM", "MSF"], "categories": ["manpower_bpo"]}',
  'medium',
  '["email", "in_app"]',
  '{"roles": ["bid_manager", "bd_manager"]}',
  1,
  'system'
),
(
  'rule_005',
  'Keyword Match: BPO Services',
  'keyword_match',
  '{"keywords": ["manpower", "outsourcing", "BPO", "staff augmentation"], "match_type": "any"}',
  'medium',
  '["in_app"]',
  '{"roles": ["bid_manager"]}',
  1,
  'system'
);

-- ============================================================================
-- INITIALIZATION COMPLETE
-- ============================================================================

-- To apply this migration:
-- sqlite3 gebiz_intelligence.db < renewal_alert_migration.sql

-- Verify tables created:
-- SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

-- ============================================================================
