-- ===================================================================
-- WorkLink v2 Database Schema
-- Comprehensive database schema for the WorkLink staffing platform
-- 
-- Production: Empty database (data persists in Railway volume)
-- Development: Seeds with comprehensive sample data
-- ===================================================================

-- Core tables: Candidates, Clients, Jobs, Deployments, Payments
CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  date_of_birth DATE,
  nric_last4 TEXT,
  status TEXT DEFAULT 'lead',
  source TEXT DEFAULT 'direct',
  xp INTEGER DEFAULT 0,
  lifetime_xp INTEGER DEFAULT 0,
  current_points INTEGER DEFAULT 0,
  current_tier TEXT DEFAULT 'bronze',
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  streak_last_date DATE,
  streak_protected_until DATETIME,
  profile_flair TEXT,
  selected_border_id TEXT,
  total_jobs_completed INTEGER DEFAULT 0,
  certifications TEXT DEFAULT '[]',
  skills TEXT DEFAULT '[]',
  preferred_locations TEXT DEFAULT '[]',
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  referral_tier INTEGER DEFAULT 1,
  total_referral_earnings REAL DEFAULT 0,
  total_incentives_earned REAL DEFAULT 0,
  total_earnings REAL DEFAULT 0,
  rating REAL DEFAULT 0,
  profile_photo TEXT,
  bank_name TEXT,
  bank_account TEXT,
  address TEXT,
  availability_mode TEXT DEFAULT 'weekdays',
  online_status TEXT DEFAULT 'offline',
  last_seen DATETIME,
  push_token TEXT,
  whatsapp_opted_in INTEGER DEFAULT 0,
  telegram_chat_id TEXT,
  telegram_username TEXT,
  google_id TEXT,
  preferred_contact TEXT DEFAULT 'app',
  theme_preference TEXT DEFAULT 'default',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  uen TEXT,
  industry TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  payment_terms INTEGER DEFAULT 30,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  job_date DATE,
  start_time TEXT,
  end_time TEXT,
  break_minutes INTEGER DEFAULT 0,
  location TEXT,
  location_lat REAL,
  location_lng REAL,
  charge_rate REAL NOT NULL,
  pay_rate REAL NOT NULL,
  total_slots INTEGER DEFAULT 1,
  filled_slots INTEGER DEFAULT 0,
  required_skills TEXT DEFAULT '[]',
  xp_bonus INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open',
  featured INTEGER DEFAULT 0,
  urgent INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS deployments (
  id TEXT PRIMARY KEY,
  job_id TEXT,
  candidate_id TEXT,
  status TEXT DEFAULT 'assigned',
  hours_worked REAL,
  charge_rate REAL,
  pay_rate REAL,
  gross_revenue REAL,
  candidate_pay REAL,
  gross_profit REAL,
  incentive_amount REAL DEFAULT 0,
  rating INTEGER,
  feedback TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  candidate_id TEXT,
  deployment_id TEXT,
  base_amount REAL,
  incentive_amount REAL DEFAULT 0,
  total_amount REAL,
  hours_worked REAL,
  status TEXT DEFAULT 'pending',
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

-- Availability calendar
CREATE TABLE IF NOT EXISTS candidate_availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT DEFAULT 'available',
  start_time TEXT,
  end_time TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(candidate_id, date),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

-- Referral system with tiers
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT,
  referred_id TEXT,
  status TEXT DEFAULT 'pending',
  tier INTEGER DEFAULT 1,
  bonus_amount REAL,
  jobs_completed_by_referred INTEGER DEFAULT 0,
  total_bonus_paid REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referrer_id) REFERENCES candidates(id),
  FOREIGN KEY (referred_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS referral_tiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tier_level INTEGER UNIQUE,
  jobs_required INTEGER,
  bonus_amount REAL,
  description TEXT
);

-- Incentive schemes
CREATE TABLE IF NOT EXISTS incentive_schemes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT,
  trigger_type TEXT,
  trigger_value INTEGER,
  reward_type TEXT,
  reward_value REAL,
  max_reward REAL,
  min_gross_margin_percent REAL DEFAULT 20,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tenders (GeBIZ integration)
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

CREATE TABLE IF NOT EXISTS tender_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  source TEXT DEFAULT 'all',
  email_notify INTEGER DEFAULT 1,
  active INTEGER DEFAULT 1,
  last_checked DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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

-- Gamification system
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  requirement_type TEXT,
  requirement_value INTEGER,
  xp_reward INTEGER DEFAULT 0,
  rarity TEXT DEFAULT 'common'
);

CREATE TABLE IF NOT EXISTS candidate_achievements (
  candidate_id TEXT,
  achievement_id TEXT,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  claimed INTEGER DEFAULT 0,
  claimed_at DATETIME,
  PRIMARY KEY (candidate_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS quests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT,
  requirement TEXT,
  xp_reward INTEGER DEFAULT 0,
  bonus_reward REAL DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS candidate_quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  target INTEGER DEFAULT 1,
  completed INTEGER DEFAULT 0,
  claimed INTEGER DEFAULT 0,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  claimed_at DATETIME,
  UNIQUE(candidate_id, quest_id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id),
  FOREIGN KEY (quest_id) REFERENCES quests(id)
);

CREATE TABLE IF NOT EXISTS xp_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT NOT NULL,
  action_type TEXT,
  amount INTEGER NOT NULL,
  reason TEXT,
  reference_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS training (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  certification_name TEXT,
  xp_reward INTEGER DEFAULT 0
);

-- Rewards shop (points sink)
CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  points_cost INTEGER NOT NULL,
  tier_required TEXT DEFAULT 'bronze',
  stock INTEGER,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reward_purchases (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  reward_id TEXT NOT NULL,
  points_spent INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  fulfilled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id),
  FOREIGN KEY (reward_id) REFERENCES rewards(id)
);

-- Financial projections
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

-- Messaging system
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT,
  sender TEXT,
  content TEXT,
  template_id TEXT,
  channel TEXT DEFAULT 'app',
  read INTEGER DEFAULT 0,
  ai_generated INTEGER DEFAULT 0,
  ai_log_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  content TEXT NOT NULL,
  whatsapp_content TEXT,
  variables TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT,
  type TEXT,
  title TEXT,
  message TEXT,
  data TEXT,
  read INTEGER DEFAULT 0,
  push_sent INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT,
  title TEXT,
  body TEXT,
  data TEXT,
  status TEXT DEFAULT 'pending',
  sent_at DATETIME,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Job matching
CREATE TABLE IF NOT EXISTS job_match_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT,
  candidate_id TEXT,
  score REAL,
  factors TEXT,
  notified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_id, candidate_id),
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

-- Push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT UNIQUE,
  subscription_endpoint TEXT NOT NULL,
  subscription_p256dh TEXT NOT NULL,
  subscription_auth TEXT NOT NULL,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT,
  notification_type TEXT,
  status TEXT,
  response_action TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

-- Streak protection
CREATE TABLE IF NOT EXISTS streak_protection (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT,
  freeze_tokens INTEGER DEFAULT 0,
  recovery_tokens INTEGER DEFAULT 0,
  last_protection_used DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

-- Analytics and engagement tracking
CREATE TABLE IF NOT EXISTS engagement_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT,
  session_start DATETIME,
  session_end DATETIME,
  pages_visited INTEGER DEFAULT 0,
  actions_performed INTEGER DEFAULT 0,
  device_type TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS feature_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT,
  feature_name TEXT,
  usage_count INTEGER DEFAULT 1,
  last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS retention_cohorts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cohort_month TEXT,
  candidate_id TEXT,
  registration_date DATE,
  first_job_date DATE,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS churn_predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT UNIQUE,
  risk_score REAL,
  risk_factors TEXT,
  last_calculated DATETIME DEFAULT CURRENT_TIMESTAMP,
  intervention_suggested TEXT,
  intervention_taken TEXT,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS notification_effectiveness (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_type TEXT,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  responded_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  date_tracked DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- AI/ML SYSTEM TABLES
-- ===================================================================

-- AI chat auto-reply system
CREATE TABLE IF NOT EXISTS ai_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_ai_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT NOT NULL UNIQUE,
  mode TEXT DEFAULT 'inherit',
  custom_instructions TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS ai_response_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT NOT NULL,
  message_id INTEGER,
  incoming_message TEXT,
  ai_response TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT DEFAULT 'generated',
  edited_response TEXT,
  admin_action TEXT,
  response_time_ms INTEGER,
  tokens_used INTEGER,
  intent_detected TEXT,
  source TEXT DEFAULT 'llm',
  kb_entry_id INTEGER,
  confidence REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS ai_faq (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT,
  priority INTEGER DEFAULT 0,
  use_count INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ML knowledge base
CREATE TABLE IF NOT EXISTS ml_knowledge_base (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  question_normalized TEXT,
  question_tokens TEXT,
  answer TEXT NOT NULL,
  intent TEXT,
  category TEXT,
  confidence REAL DEFAULT 0.5,
  use_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  edit_count INTEGER DEFAULT 0,
  reject_count INTEGER DEFAULT 0,
  source TEXT DEFAULT 'llm',
  keywords TEXT,
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ml_training_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  input_text TEXT NOT NULL,
  output_text TEXT NOT NULL,
  context TEXT,
  intent TEXT,
  category TEXT,
  quality_score REAL DEFAULT 0.5,
  was_edited INTEGER DEFAULT 0,
  edited_output TEXT,
  admin_approved INTEGER DEFAULT 0,
  source TEXT DEFAULT 'production',
  exported INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ml_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  total_queries INTEGER DEFAULT 0,
  kb_hits INTEGER DEFAULT 0,
  llm_calls INTEGER DEFAULT 0,
  auto_replies_sent INTEGER DEFAULT 0,
  suggestions_shown INTEGER DEFAULT 0,
  suggestions_accepted INTEGER DEFAULT 0,
  suggestions_edited INTEGER DEFAULT 0,
  suggestions_rejected INTEGER DEFAULT 0,
  avg_confidence REAL,
  avg_response_time_ms INTEGER,
  estimated_cost_saved REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ml_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Telegram integration
CREATE TABLE IF NOT EXISTS telegram_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'job_posting',
  member_count INTEGER,
  active INTEGER DEFAULT 1,
  last_post_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telegram_job_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  group_id INTEGER NOT NULL,
  variant_id INTEGER,
  message_id TEXT,
  content TEXT,
  posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  post_hour INTEGER,
  post_day INTEGER,
  status TEXT DEFAULT 'sent',
  views INTEGER DEFAULT 0,
  responses INTEGER DEFAULT 0,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (group_id) REFERENCES telegram_groups(id)
);

CREATE TABLE IF NOT EXISTS telegram_post_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telegram_auto_post_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enabled INTEGER DEFAULT 0,
  post_on_job_create INTEGER DEFAULT 1,
  default_groups TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ad optimization ML
CREATE TABLE IF NOT EXISTS ad_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  variant_key TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT,
  variable_tested TEXT,
  variable_value TEXT,
  source TEXT DEFAULT 'llm',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ad_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id INTEGER NOT NULL,
  job_id TEXT NOT NULL,
  group_id INTEGER,
  message_id TEXT,
  posted_at DATETIME,
  post_hour INTEGER,
  post_day INTEGER,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  responses INTEGER DEFAULT 0,
  response_rate REAL,
  is_winner INTEGER DEFAULT 0,
  measured_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ad_variable_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variable_name TEXT NOT NULL,
  variable_value TEXT NOT NULL,
  job_category TEXT,
  win_count INTEGER DEFAULT 0,
  lose_count INTEGER DEFAULT 0,
  total_tests INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  avg_response_rate REAL DEFAULT 0,
  confidence REAL DEFAULT 0.5,
  last_tested_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(variable_name, variable_value, job_category)
);

CREATE TABLE IF NOT EXISTS ad_timing_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hour INTEGER NOT NULL,
  day_of_week INTEGER,
  job_category TEXT,
  post_count INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  avg_response_rate REAL DEFAULT 0,
  score REAL DEFAULT 0.5,
  last_updated DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(hour, day_of_week, job_category)
);

CREATE TABLE IF NOT EXISTS ad_training_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_details TEXT NOT NULL,
  ad_content TEXT NOT NULL,
  variables TEXT,
  response_rate REAL,
  is_winner INTEGER DEFAULT 0,
  quality_score REAL DEFAULT 0.5,
  job_category TEXT,
  exported INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ad_ml_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin features
CREATE TABLE IF NOT EXISTS admin_onboarding (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT DEFAULT 'admin',
  step_id TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  completed_at DATETIME,
  UNIQUE(user_id, step_id)
);

CREATE TABLE IF NOT EXISTS admin_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT DEFAULT 'admin',
  achievement_id TEXT NOT NULL,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_referral_code ON candidates(referral_code);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(job_date);
CREATE INDEX IF NOT EXISTS idx_deployments_candidate ON deployments(candidate_id);
CREATE INDEX IF NOT EXISTS idx_deployments_job ON deployments(job_id);
CREATE INDEX IF NOT EXISTS idx_availability_candidate_date ON candidate_availability(candidate_id, date);
CREATE INDEX IF NOT EXISTS idx_notifications_candidate ON notifications(candidate_id, read);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_tender_alerts_active ON tender_alerts(active);
CREATE INDEX IF NOT EXISTS idx_job_match_scores ON job_match_scores(candidate_id, score);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payments_candidate ON payments(candidate_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);

-- Gamification indexes
CREATE INDEX IF NOT EXISTS idx_xp_transactions_candidate ON xp_transactions(candidate_id);

-- Messaging indexes
CREATE INDEX IF NOT EXISTS idx_messages_candidate_created ON messages(candidate_id, created_at);

-- AI/ML indexes
CREATE INDEX IF NOT EXISTS idx_ai_response_logs_candidate ON ai_response_logs(candidate_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_response_logs_status ON ai_response_logs(status);
CREATE INDEX IF NOT EXISTS idx_ml_knowledge_base_confidence ON ml_knowledge_base(confidence);
CREATE INDEX IF NOT EXISTS idx_ml_knowledge_base_category ON ml_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_ml_training_data_quality ON ml_training_data(quality_score);
CREATE INDEX IF NOT EXISTS idx_ml_metrics_date ON ml_metrics(date);
CREATE INDEX IF NOT EXISTS idx_telegram_job_posts_job ON telegram_job_posts(job_id);
CREATE INDEX IF NOT EXISTS idx_telegram_job_posts_group ON telegram_job_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_ad_variants_job ON ad_variants(job_id);
CREATE INDEX IF NOT EXISTS idx_ad_performance_variant ON ad_performance(variant_id);
CREATE INDEX IF NOT EXISTS idx_ad_performance_job ON ad_performance(job_id);
CREATE INDEX IF NOT EXISTS idx_ad_variable_scores_variable ON ad_variable_scores(variable_name, variable_value);
CREATE INDEX IF NOT EXISTS idx_ad_timing_scores_hour ON ad_timing_scores(hour, day_of_week);
