-- Pain-Point Solutions Database Schema
-- Creates all tables needed for the 100x consultant performance system

-- Capacity Management Tables
CREATE TABLE IF NOT EXISTS capacity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  daily_count INTEGER NOT NULL,
  daily_utilization REAL NOT NULL,
  weekly_count INTEGER NOT NULL,
  weekly_utilization REAL NOT NULL,
  workload_count INTEGER NOT NULL,
  workload_utilization REAL NOT NULL,
  recommended_rate INTEGER NOT NULL,
  action_taken TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergency_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  reason TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  timestamp DATETIME NOT NULL,
  resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pre-qualification System Tables
CREATE TABLE IF NOT EXISTS prequalification_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  total_score INTEGER NOT NULL,
  decision_status TEXT NOT NULL,
  experience_score INTEGER NOT NULL,
  availability_score INTEGER NOT NULL,
  location_score INTEGER NOT NULL,
  reliability_score INTEGER NOT NULL,
  skills_score INTEGER NOT NULL,
  salary_score INTEGER NOT NULL,
  reasoning TEXT NOT NULL,
  requires_review INTEGER NOT NULL,
  timestamp DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Candidate Retention Tables
CREATE TABLE IF NOT EXISTS candidate_engagement (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT NOT NULL,
  engagement_type TEXT NOT NULL,
  metadata TEXT, -- JSON data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_candidate_date ON candidate_engagement(candidate_id, created_at);
CREATE INDEX IF NOT EXISTS idx_engagement_type_date ON candidate_engagement(engagement_type, created_at);

CREATE TABLE IF NOT EXISTS candidate_engagement_scores (
  candidate_id TEXT PRIMARY KEY,
  raw_score INTEGER NOT NULL,
  time_decay REAL NOT NULL,
  final_score INTEGER NOT NULL,
  tier TEXT NOT NULL,
  days_since_last_activity INTEGER NOT NULL,
  last_calculated DATETIME NOT NULL,

  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS retention_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT NOT NULL,
  message_type TEXT NOT NULL,
  content TEXT NOT NULL,
  sent_at DATETIME NOT NULL,
  channel TEXT NOT NULL,
  delivered INTEGER DEFAULT 0,
  opened INTEGER DEFAULT 0,
  responded INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE INDEX IF NOT EXISTS idx_retention_messages_candidate ON retention_messages(candidate_id, sent_at);

-- Reliability Scoring Tables
CREATE TABLE IF NOT EXISTS reliability_scores (
  candidate_id TEXT PRIMARY KEY,
  reliability_score INTEGER NOT NULL,
  tier TEXT NOT NULL,
  predicted_show_up_rate INTEGER NOT NULL,
  past_performance_score INTEGER NOT NULL,
  response_time_score INTEGER NOT NULL,
  confirmation_pattern_score INTEGER NOT NULL,
  circumstances_score INTEGER NOT NULL,
  engagement_score INTEGER NOT NULL,
  time_patterns_score INTEGER NOT NULL,
  calculated_at DATETIME NOT NULL,

  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS message_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  response_time_hours REAL NOT NULL,
  response_quality TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS deployment_confirmations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deployment_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  confirmation_request_sent DATETIME NOT NULL,
  confirmed INTEGER DEFAULT 0,
  confirmation_received DATETIME,
  response_time_hours REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (deployment_id) REFERENCES deployments(id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS candidate_circumstances (
  candidate_id TEXT PRIMARY KEY,
  transportation_method TEXT,
  has_backup_childcare INTEGER DEFAULT 0,
  financial_stability TEXT,
  housing_stability TEXT,
  health_issues INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS candidate_availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, etc.
  available INTEGER DEFAULT 1,
  confirmed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS profile_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT NOT NULL,
  field_updated TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

-- Backup System Tables
CREATE TABLE IF NOT EXISTS deployment_backup_systems (
  id TEXT PRIMARY KEY,
  deployment_id TEXT NOT NULL,
  primary_candidates TEXT NOT NULL, -- JSON array
  backup_candidates TEXT NOT NULL,  -- JSON array
  avg_reliability INTEGER NOT NULL,
  lowest_reliability INTEGER NOT NULL,
  backup_multiplier REAL NOT NULL,
  backups_needed INTEGER NOT NULL,
  activated INTEGER DEFAULT 0,
  activation_reason TEXT,
  activated_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (deployment_id) REFERENCES deployments(id)
);

-- Enhanced Candidates table columns (if not exists)
-- These should be added to the existing candidates table

-- Add new columns to candidates table
ALTER TABLE candidates ADD COLUMN experience_years INTEGER DEFAULT 0;
ALTER TABLE candidates ADD COLUMN hospitality_experience INTEGER DEFAULT 0;
ALTER TABLE candidates ADD COLUMN event_experience INTEGER DEFAULT 0;
ALTER TABLE candidates ADD COLUMN customer_service_experience INTEGER DEFAULT 0;
ALTER TABLE candidates ADD COLUMN weekend_availability INTEGER DEFAULT 0;
ALTER TABLE candidates ADD COLUMN evening_availability INTEGER DEFAULT 0;
ALTER TABLE candidates ADD COLUMN short_notice_availability INTEGER DEFAULT 0;
ALTER TABLE candidates ADD COLUMN employment_type TEXT DEFAULT 'flexible';
ALTER TABLE candidates ADD COLUMN notice_period_days INTEGER DEFAULT 14;
ALTER TABLE candidates ADD COLUMN mrt_accessible INTEGER DEFAULT 0;
ALTER TABLE candidates ADD COLUMN own_transport INTEGER DEFAULT 0;
ALTER TABLE candidates ADD COLUMN expected_hourly_rate REAL;
ALTER TABLE candidates ADD COLUMN employment_verified INTEGER DEFAULT 0;
ALTER TABLE candidates ADD COLUMN linkedin_profile TEXT;
ALTER TABLE candidates ADD COLUMN communication_quality TEXT;
ALTER TABLE candidates ADD COLUMN preferred_communication TEXT DEFAULT 'whatsapp';

-- Enhanced Deployments table columns
ALTER TABLE deployments ADD COLUMN importance TEXT DEFAULT 'standard'; -- 'standard', 'important', 'critical'
ALTER TABLE deployments ADD COLUMN backup_system_id TEXT;
ALTER TABLE deployments ADD COLUMN confirmation_status TEXT DEFAULT 'pending';
ALTER TABLE deployments ADD COLUMN client_rating REAL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_capacity_logs_date ON capacity_logs(date);
CREATE INDEX IF NOT EXISTS idx_prequalification_logs_timestamp ON prequalification_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_prequalification_logs_decision ON prequalification_logs(decision_status);
CREATE INDEX IF NOT EXISTS idx_reliability_scores_tier ON reliability_scores(tier);
CREATE INDEX IF NOT EXISTS idx_reliability_scores_calculated ON reliability_scores(calculated_at);
CREATE INDEX IF NOT EXISTS idx_message_responses_candidate ON message_responses(candidate_id);
CREATE INDEX IF NOT EXISTS idx_deployment_confirmations_deployment ON deployment_confirmations(deployment_id);
CREATE INDEX IF NOT EXISTS idx_backup_systems_deployment ON deployment_backup_systems(deployment_id);

-- Views for quick analytics
CREATE VIEW IF NOT EXISTS candidate_performance_summary AS
SELECT
  c.id,
  c.name,
  c.email,
  c.phone,
  rs.reliability_score,
  rs.tier as reliability_tier,
  es.final_score as engagement_score,
  es.tier as engagement_tier,
  COUNT(d.id) as total_deployments,
  AVG(d.client_rating) as avg_rating,
  SUM(CASE WHEN d.status = 'completed' THEN 1 ELSE 0 END) as completed_deployments,
  SUM(CASE WHEN d.status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
  CASE
    WHEN COUNT(d.id) > 0 THEN
      ROUND((SUM(CASE WHEN d.status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(d.id)), 1)
    ELSE 0
  END as actual_show_up_rate
FROM candidates c
LEFT JOIN reliability_scores rs ON c.id = rs.candidate_id
LEFT JOIN candidate_engagement_scores es ON c.id = es.candidate_id
LEFT JOIN deployments d ON c.id = d.candidate_id
WHERE c.status = 'active'
GROUP BY c.id, c.name, c.email, c.phone, rs.reliability_score, rs.tier, es.final_score, es.tier;

CREATE VIEW IF NOT EXISTS daily_capacity_summary AS
SELECT
  DATE(created_at) as date,
  MAX(daily_count) as peak_daily_candidates,
  MAX(weekly_count) as peak_weekly_candidates,
  MAX(workload_count) as peak_workload,
  AVG(daily_utilization) as avg_daily_utilization,
  AVG(weekly_utilization) as avg_weekly_utilization,
  AVG(workload_utilization) as avg_workload_utilization,
  COUNT(CASE WHEN action_taken = 'emergency_brake' THEN 1 END) as emergency_brakes,
  COUNT(CASE WHEN action_taken = 'throttle_heavy' THEN 1 END) as heavy_throttles
FROM capacity_logs
GROUP BY DATE(created_at)
ORDER BY date DESC;