-- FOMO (Fear of Missing Out) System Database Migration
-- Creates tables for FOMO events, social proof, urgency triggers, and streak protection

-- ==================== FOMO EVENTS ====================

-- Main FOMO events tracking table
CREATE TABLE IF NOT EXISTS fomo_events (
  id TEXT PRIMARY KEY,
  candidate_id TEXT,
  event_type TEXT NOT NULL,
  event_data TEXT, -- JSON data for event details
  urgency_score REAL DEFAULT 0.0,
  social_proof_factor REAL DEFAULT 0.0,
  scarcity_level REAL DEFAULT 0.0,
  trigger_sent BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fomo_events_candidate ON fomo_events(candidate_id);
CREATE INDEX IF NOT EXISTS idx_fomo_events_type ON fomo_events(event_type);
CREATE INDEX IF NOT EXISTS idx_fomo_events_expires ON fomo_events(expires_at);
CREATE INDEX IF NOT EXISTS idx_fomo_events_urgency ON fomo_events(urgency_score);
CREATE INDEX IF NOT EXISTS idx_fomo_events_unsent ON fomo_events(trigger_sent, expires_at);

-- ==================== SOCIAL PROOF ====================

-- Social proof activity aggregation table
CREATE TABLE IF NOT EXISTS fomo_social_proof (
  id TEXT PRIMARY KEY,
  activity_type TEXT NOT NULL,
  job_id TEXT,
  location_area TEXT,
  tier_level TEXT,
  participant_count INTEGER DEFAULT 1,
  anonymized_data TEXT, -- JSON data with aggregated info
  time_window_start DATETIME,
  time_window_end DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Indexes for social proof queries
CREATE INDEX IF NOT EXISTS idx_fomo_social_time ON fomo_social_proof(time_window_start, time_window_end);
CREATE INDEX IF NOT EXISTS idx_fomo_social_area ON fomo_social_proof(location_area);
CREATE INDEX IF NOT EXISTS idx_fomo_social_job ON fomo_social_proof(job_id);
CREATE INDEX IF NOT EXISTS idx_fomo_social_type ON fomo_social_proof(activity_type);
CREATE INDEX IF NOT EXISTS idx_fomo_social_tier ON fomo_social_proof(tier_level);

-- ==================== URGENCY CONFIGURATION ====================

-- Urgency triggers configuration table
CREATE TABLE IF NOT EXISTS fomo_urgency_config (
  id TEXT PRIMARY KEY,
  trigger_name TEXT NOT NULL UNIQUE,
  trigger_type TEXT NOT NULL,
  threshold_value REAL,
  urgency_multiplier REAL DEFAULT 1.0,
  message_template TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default urgency triggers
INSERT OR IGNORE INTO fomo_urgency_config
  (id, trigger_name, trigger_type, threshold_value, urgency_multiplier, message_template, active)
VALUES
  ('job_slot_scarcity_high', 'High Job Slot Scarcity', 'job_slots', 0.8, 2.0,
   'Only {remaining_slots} spots left for {job_title}! Apply now before it fills up.', TRUE),

  ('peer_application_surge', 'Peer Application Surge', 'peer_activity', 5.0, 1.5,
   '{peer_count} people in your area applied to jobs in the last hour. Don''t miss out!', TRUE),

  ('time_window_closing', 'Application Window Closing', 'time_deadline', 2.0, 1.8,
   'Hurry! Applications for {job_title} close in {time_remaining}.', TRUE),

  ('tier_competition', 'Same-Tier Competition', 'tier_activity', 3.0, 1.4,
   '{count} other {tier_name} workers are viewing this job. Apply first!', TRUE),

  ('high_pay_opportunity', 'High Pay Rate Opportunity', 'pay_premium', 1.3, 1.6,
   'Premium rate! {job_title} pays {premium_percent}% above average in your area.', TRUE),

  ('skill_demand_spike', 'High Skill Demand', 'skill_demand', 2.5, 1.3,
   'Your skills are in high demand! {open_jobs} jobs need your expertise.', TRUE);

-- Index for active triggers
CREATE INDEX IF NOT EXISTS idx_fomo_urgency_active ON fomo_urgency_config(active, trigger_type);

-- ==================== STREAK PROTECTION ====================

-- Streak protection tokens/offers
CREATE TABLE IF NOT EXISTS streak_protection_tokens (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  token_type TEXT NOT NULL, -- 'freeze_24h', 'grace_period', 'auto_checkin'
  streak_days INTEGER,
  risk_score REAL,
  offered_at DATETIME,
  expires_at DATETIME,
  used_at DATETIME,
  status TEXT DEFAULT 'active', -- 'active', 'used', 'expired'
  fomo_trigger_data TEXT, -- JSON data for FOMO messaging
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- Indexes for streak protection
CREATE INDEX IF NOT EXISTS idx_streak_protection_candidate ON streak_protection_tokens(candidate_id);
CREATE INDEX IF NOT EXISTS idx_streak_protection_status ON streak_protection_tokens(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_streak_protection_offered ON streak_protection_tokens(offered_at);

-- ==================== STREAK RISK ANALYSIS ====================

-- Streak risk analysis tracking
CREATE TABLE IF NOT EXISTS streak_risk_analysis (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  current_streak INTEGER,
  risk_score REAL,
  risk_factors TEXT, -- JSON with detailed risk breakdown
  predicted_break_hours REAL,
  protection_recommended BOOLEAN DEFAULT FALSE,
  fomo_interventions TEXT, -- JSON with intervention strategies
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- Indexes for risk analysis
CREATE INDEX IF NOT EXISTS idx_streak_risk_candidate ON streak_risk_analysis(candidate_id);
CREATE INDEX IF NOT EXISTS idx_streak_risk_date ON streak_risk_analysis(analysis_date);
CREATE INDEX IF NOT EXISTS idx_streak_risk_score ON streak_risk_analysis(risk_score);

-- ==================== STREAK MILESTONES ====================

-- Milestone achievements tracking
CREATE TABLE IF NOT EXISTS streak_milestones (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  milestone_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  milestone_value INTEGER NOT NULL, -- 7, 30, 100, etc.
  achieved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  celebrated BOOLEAN DEFAULT FALSE,
  social_proof_sent BOOLEAN DEFAULT FALSE,
  competitive_alert_sent BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- Indexes for milestones
CREATE INDEX IF NOT EXISTS idx_streak_milestones_candidate ON streak_milestones(candidate_id);
CREATE INDEX IF NOT EXISTS idx_streak_milestones_type ON streak_milestones(milestone_type, milestone_value);
CREATE INDEX IF NOT EXISTS idx_streak_milestones_achieved ON streak_milestones(achieved_at);
CREATE INDEX IF NOT EXISTS idx_streak_milestones_alerts ON streak_milestones(competitive_alert_sent, achieved_at);

-- ==================== STREAK RECOVERY ====================

-- Streak recovery tracking for candidates who lost their streaks
CREATE TABLE IF NOT EXISTS streak_recovery (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  lost_streak INTEGER NOT NULL, -- How many days they lost
  recovery_started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  current_recovery_days INTEGER DEFAULT 0,
  motivation_type TEXT, -- 'rebuild', 'challenge', 'social'
  fomo_messages_sent INTEGER DEFAULT 0,
  recovery_completed BOOLEAN DEFAULT FALSE,
  completed_at DATETIME,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- Indexes for recovery tracking
CREATE INDEX IF NOT EXISTS idx_streak_recovery_candidate ON streak_recovery(candidate_id);
CREATE INDEX IF NOT EXISTS idx_streak_recovery_active ON streak_recovery(recovery_completed, recovery_started_at);

-- ==================== FOMO EFFECTIVENESS TRACKING ====================

-- Track FOMO trigger effectiveness for optimization
CREATE TABLE IF NOT EXISTS fomo_effectiveness (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  trigger_id TEXT,
  trigger_type TEXT NOT NULL,
  urgency_level REAL,
  displayed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  dismissed_at DATETIME,
  action_taken BOOLEAN DEFAULT FALSE,
  action_type TEXT, -- 'job_application', 'job_view', 'checkin', etc.
  action_taken_at DATETIME,
  conversion_time_seconds INTEGER, -- Time from display to action
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- Indexes for effectiveness analysis
CREATE INDEX IF NOT EXISTS idx_fomo_effectiveness_candidate ON fomo_effectiveness(candidate_id);
CREATE INDEX IF NOT EXISTS idx_fomo_effectiveness_type ON fomo_effectiveness(trigger_type);
CREATE INDEX IF NOT EXISTS idx_fomo_effectiveness_conversion ON fomo_effectiveness(action_taken, conversion_time_seconds);
CREATE INDEX IF NOT EXISTS idx_fomo_effectiveness_date ON fomo_effectiveness(displayed_at);

-- ==================== PEER ACTIVITY TRACKING ====================

-- Track anonymized peer activity for social proof
CREATE TABLE IF NOT EXISTS peer_activity_summary (
  id TEXT PRIMARY KEY,
  location_area TEXT,
  tier_level TEXT,
  activity_type TEXT NOT NULL,
  activity_count INTEGER DEFAULT 1,
  time_bucket DATETIME, -- Aggregated by hour/day
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for peer activity
CREATE INDEX IF NOT EXISTS idx_peer_activity_location ON peer_activity_summary(location_area, time_bucket);
CREATE INDEX IF NOT EXISTS idx_peer_activity_tier ON peer_activity_summary(tier_level, time_bucket);
CREATE INDEX IF NOT EXISTS idx_peer_activity_type ON peer_activity_summary(activity_type, time_bucket);

-- ==================== VIEWS FOR ANALYTICS ====================

-- View for FOMO trigger performance
CREATE VIEW IF NOT EXISTS v_fomo_trigger_performance AS
SELECT
  fe.trigger_type,
  COUNT(*) as total_triggers,
  COUNT(CASE WHEN fe.action_taken THEN 1 END) as conversions,
  ROUND(COUNT(CASE WHEN fe.action_taken THEN 1 END) * 100.0 / COUNT(*), 2) as conversion_rate,
  AVG(fe.urgency_level) as avg_urgency,
  AVG(fe.conversion_time_seconds) as avg_conversion_time
FROM fomo_effectiveness fe
WHERE fe.displayed_at > datetime('now', '-30 days')
GROUP BY fe.trigger_type;

-- View for candidate FOMO engagement
CREATE VIEW IF NOT EXISTS v_candidate_fomo_engagement AS
SELECT
  c.id,
  c.name,
  c.location_area,
  c.level,
  COUNT(fe.id) as total_fomo_triggers,
  COUNT(CASE WHEN fe.action_taken THEN 1 END) as actions_taken,
  ROUND(COUNT(CASE WHEN fe.action_taken THEN 1 END) * 100.0 / COUNT(fe.id), 2) as engagement_rate,
  MAX(fe.displayed_at) as last_fomo_trigger
FROM candidates c
LEFT JOIN fomo_effectiveness fe ON c.id = fe.candidate_id
WHERE fe.displayed_at > datetime('now', '-30 days') OR fe.displayed_at IS NULL
GROUP BY c.id;

-- View for streak protection effectiveness
CREATE VIEW IF NOT EXISTS v_streak_protection_effectiveness AS
SELECT
  spt.token_type,
  COUNT(*) as total_offered,
  COUNT(CASE WHEN spt.status = 'used' THEN 1 END) as total_used,
  ROUND(COUNT(CASE WHEN spt.status = 'used' THEN 1 END) * 100.0 / COUNT(*), 2) as usage_rate,
  AVG(spt.streak_days) as avg_streak_days_protected
FROM streak_protection_tokens spt
WHERE spt.offered_at > datetime('now', '-30 days')
GROUP BY spt.token_type;

-- ==================== TRIGGERS FOR AUTOMATIC CLEANUP ====================

-- Trigger to clean up expired FOMO events (if supported)
CREATE TRIGGER IF NOT EXISTS cleanup_expired_fomo_events
AFTER INSERT ON fomo_events
BEGIN
  DELETE FROM fomo_events
  WHERE expires_at < datetime('now', '-24 hours');
END;

-- Trigger to clean up old social proof data (if supported)
CREATE TRIGGER IF NOT EXISTS cleanup_old_social_proof
AFTER INSERT ON fomo_social_proof
BEGIN
  DELETE FROM fomo_social_proof
  WHERE time_window_end < datetime('now', '-48 hours');
END;