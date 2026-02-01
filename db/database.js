/**
 * WorkLink v2 Database
 * - Production (Railway): Empty database, persists in volume
 * - Development (Local): Seeds with comprehensive sample data
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Determine environment
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'worklink.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log(`🔌 Database path: ${DB_PATH}`);
console.log(`🌍 Environment: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}`);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Generate DiceBear avatar URL
function generateAvatar(name, style = 'avataaars') {
  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
}

function createSchema() {
  db.exec(`
    -- Core tables
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
      level INTEGER DEFAULT 1,
      streak_days INTEGER DEFAULT 0,
      streak_last_date DATE,
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
      online_status TEXT DEFAULT 'offline',
      last_seen DATETIME,
      push_token TEXT,
      whatsapp_opted_in INTEGER DEFAULT 0,
      telegram_chat_id TEXT,
      preferred_contact TEXT DEFAULT 'app',
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

    -- Enhanced referrals with tiers
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

    -- Referral bonus tiers
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

    -- Tenders
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

    -- Tender alerts/keywords
    CREATE TABLE IF NOT EXISTS tender_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      source TEXT DEFAULT 'all',
      email_notify INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1,
      last_checked DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tender matches (from RSS/scraping)
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

    -- Gamification
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

    -- Financial
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

    -- Messaging
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT,
      sender TEXT,
      content TEXT,
      template_id TEXT,
      channel TEXT DEFAULT 'app',
      read INTEGER DEFAULT 0,
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

    -- Push notification queue
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

    -- Job matching scores
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

    -- =====================================================
    -- AI CHAT AUTO-REPLY SYSTEM
    -- =====================================================

    -- Global AI settings
    CREATE TABLE IF NOT EXISTS ai_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Per-conversation AI settings (overrides global)
    CREATE TABLE IF NOT EXISTS conversation_ai_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL UNIQUE,
      mode TEXT DEFAULT 'inherit', -- inherit | off | auto | suggest
      custom_instructions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- AI response logs for quality monitoring
    CREATE TABLE IF NOT EXISTS ai_response_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      message_id INTEGER,
      incoming_message TEXT,
      ai_response TEXT NOT NULL,
      mode TEXT NOT NULL, -- auto | suggest
      status TEXT DEFAULT 'generated', -- generated | sent | edited | rejected | dismissed
      edited_response TEXT,
      admin_action TEXT, -- sent_as_is | edited | rejected | dismissed
      response_time_ms INTEGER,
      tokens_used INTEGER,
      intent_detected TEXT,
      source TEXT DEFAULT 'llm', -- llm | knowledge_base
      kb_entry_id INTEGER,
      confidence REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- FAQ knowledge base (manually curated)
    CREATE TABLE IF NOT EXISTS ai_faq (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL, -- pay | schedule | availability | general | onboarding | jobs
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      keywords TEXT, -- JSON array of trigger keywords
      priority INTEGER DEFAULT 0,
      use_count INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- =====================================================
    -- CHAT ML LEARNING SYSTEM (Path to SLM)
    -- =====================================================

    -- Knowledge base of learned Q&A pairs
    CREATE TABLE IF NOT EXISTS ml_knowledge_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      question_normalized TEXT, -- Lowercase, stripped punctuation for matching
      question_tokens TEXT, -- JSON array of tokens for TF-IDF
      answer TEXT NOT NULL,
      intent TEXT,
      category TEXT,
      confidence REAL DEFAULT 0.5,
      use_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0, -- Times admin approved as-is
      edit_count INTEGER DEFAULT 0, -- Times admin edited before sending
      reject_count INTEGER DEFAULT 0, -- Times admin rejected
      source TEXT DEFAULT 'llm', -- llm | admin | faq
      last_used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Store all interactions for training data export
    CREATE TABLE IF NOT EXISTS ml_training_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      input_text TEXT NOT NULL,
      output_text TEXT NOT NULL,
      context TEXT, -- JSON: conversation history, candidate info
      intent TEXT,
      category TEXT,
      quality_score REAL DEFAULT 0.5, -- 0-1 based on admin feedback
      was_edited INTEGER DEFAULT 0,
      edited_output TEXT,
      admin_approved INTEGER DEFAULT 0,
      source TEXT DEFAULT 'production', -- production | synthetic | faq
      exported INTEGER DEFAULT 0, -- Whether included in training export
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Track ML system performance daily
    CREATE TABLE IF NOT EXISTS ml_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_queries INTEGER DEFAULT 0,
      kb_hits INTEGER DEFAULT 0, -- Answered from knowledge base
      llm_calls INTEGER DEFAULT 0, -- Had to call Claude
      auto_replies_sent INTEGER DEFAULT 0,
      suggestions_shown INTEGER DEFAULT 0,
      suggestions_accepted INTEGER DEFAULT 0,
      suggestions_edited INTEGER DEFAULT 0,
      suggestions_rejected INTEGER DEFAULT 0,
      avg_confidence REAL,
      avg_response_time_ms INTEGER,
      estimated_cost_saved REAL, -- Estimated $ saved from KB hits
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ML system settings
    CREATE TABLE IF NOT EXISTS ml_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- =====================================================
    -- TELEGRAM GROUP POSTING
    -- =====================================================

    -- Telegram groups for job posting
    CREATE TABLE IF NOT EXISTS telegram_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'job_posting', -- job_posting | announcement | general
      member_count INTEGER,
      active INTEGER DEFAULT 1,
      last_post_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Track job posts to groups
    CREATE TABLE IF NOT EXISTS telegram_job_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      group_id INTEGER NOT NULL,
      variant_id INTEGER, -- Links to ad_variants for A/B testing
      message_id TEXT, -- Telegram message ID
      content TEXT, -- The actual ad content posted
      posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      post_hour INTEGER, -- 0-23 for timing analysis
      post_day INTEGER, -- 0=Sun, 6=Sat
      status TEXT DEFAULT 'sent', -- sent | deleted | failed
      views INTEGER DEFAULT 0,
      responses INTEGER DEFAULT 0, -- Candidate applications from this post
      FOREIGN KEY (job_id) REFERENCES jobs(id),
      FOREIGN KEY (group_id) REFERENCES telegram_groups(id)
    );

    -- Auto-post settings (key-value style)
    CREATE TABLE IF NOT EXISTS telegram_post_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Telegram auto-post settings (used by telegram-posting service)
    CREATE TABLE IF NOT EXISTS telegram_auto_post_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enabled INTEGER DEFAULT 0,
      post_on_job_create INTEGER DEFAULT 1,
      default_groups TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- =====================================================
    -- AD OPTIMIZATION ML (A/B Testing + Learning)
    -- =====================================================

    -- Ad variants generated for A/B testing
    CREATE TABLE IF NOT EXISTS ad_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      variant_key TEXT NOT NULL, -- 'A', 'B', 'C'
      content TEXT NOT NULL,
      variables TEXT, -- JSON: {"tone": "casual", "emoji_count": 3, "length": "short", "cta_style": "urgent"}
      variable_tested TEXT, -- The specific variable being tested in this A/B test
      variable_value TEXT, -- The value of that variable for this variant
      source TEXT DEFAULT 'llm', -- llm | optimized | manual
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      -- Note: No FK to jobs since ad training data should persist after jobs deleted
    );

    -- Track ad performance for each variant
    CREATE TABLE IF NOT EXISTS ad_performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id INTEGER NOT NULL,
      job_id TEXT NOT NULL,
      group_id INTEGER,
      message_id TEXT,
      posted_at DATETIME,
      post_hour INTEGER, -- 0-23
      post_day INTEGER, -- 0=Sun, 6=Sat
      impressions INTEGER DEFAULT 0, -- Estimated views
      clicks INTEGER DEFAULT 0, -- Link clicks if trackable
      responses INTEGER DEFAULT 0, -- Candidate applications/replies
      response_rate REAL, -- responses / impressions
      is_winner INTEGER DEFAULT 0, -- Won the A/B test
      measured_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      -- Note: No FKs since training data should persist even if variants/groups deleted
    );

    -- Learned variable preferences (updated after each A/B test)
    CREATE TABLE IF NOT EXISTS ad_variable_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variable_name TEXT NOT NULL, -- 'tone', 'emoji_count', 'length', 'cta_style', etc.
      variable_value TEXT NOT NULL, -- 'casual', '3', 'short', 'urgent', etc.
      job_category TEXT, -- Optional: different preferences per job type (null = global)
      win_count INTEGER DEFAULT 0,
      lose_count INTEGER DEFAULT 0,
      total_tests INTEGER DEFAULT 0,
      total_responses INTEGER DEFAULT 0,
      avg_response_rate REAL DEFAULT 0,
      confidence REAL DEFAULT 0.5, -- 0-1, higher = more confident
      last_tested_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(variable_name, variable_value, job_category)
    );

    -- Optimal posting times learned from data
    CREATE TABLE IF NOT EXISTS ad_timing_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hour INTEGER NOT NULL, -- 0-23
      day_of_week INTEGER, -- 0=Sun, 6=Sat (NULL = any day)
      job_category TEXT, -- Optional: different times for different job types
      post_count INTEGER DEFAULT 0,
      total_responses INTEGER DEFAULT 0,
      avg_response_rate REAL DEFAULT 0,
      score REAL DEFAULT 0.5, -- 0-1, higher = better time to post
      last_updated DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(hour, day_of_week, job_category)
    );

    -- Training data for Ad-generation SLM
    CREATE TABLE IF NOT EXISTS ad_training_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_details TEXT NOT NULL, -- JSON: job title, pay, location, requirements, slots
      ad_content TEXT NOT NULL, -- The ad text
      variables TEXT, -- JSON: what variables were used
      response_rate REAL, -- Performance score
      is_winner INTEGER DEFAULT 0, -- Won A/B test
      quality_score REAL DEFAULT 0.5, -- Calculated from response_rate + other factors
      job_category TEXT,
      exported INTEGER DEFAULT 0, -- Whether included in training export
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Ad ML settings
    CREATE TABLE IF NOT EXISTS ad_ml_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- =====================================================
    -- END OF AI/ML TABLES
    -- =====================================================

    -- Admin onboarding progress
    CREATE TABLE IF NOT EXISTS admin_onboarding (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT DEFAULT 'admin',
      step_id TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at DATETIME,
      UNIQUE(user_id, step_id)
    );

    -- Admin achievements (gamify the admin experience)
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

    -- Indices for performance
    CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
    CREATE INDEX IF NOT EXISTS idx_candidates_referral_code ON candidates(referral_code);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(job_date);
    CREATE INDEX IF NOT EXISTS idx_deployments_candidate ON deployments(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_deployments_job ON deployments(job_id);
    CREATE INDEX IF NOT EXISTS idx_availability_candidate_date ON candidate_availability(candidate_id, date);
    CREATE INDEX IF NOT EXISTS idx_notifications_candidate ON notifications(candidate_id, read);
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
    CREATE INDEX IF NOT EXISTS idx_tender_alerts_active ON tender_alerts(active);
    CREATE INDEX IF NOT EXISTS idx_job_match_scores ON job_match_scores(candidate_id, score);

    -- Additional indexes for query performance
    CREATE INDEX IF NOT EXISTS idx_payments_candidate ON payments(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);
    CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
    CREATE INDEX IF NOT EXISTS idx_xp_transactions_candidate ON xp_transactions(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_messages_candidate_created ON messages(candidate_id, created_at);

    -- AI/ML indexes for performance
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
  `);

  // Add ai_generated column to messages if not exists
  try {
    db.exec(`ALTER TABLE messages ADD COLUMN ai_generated INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore
  }

  try {
    db.exec(`ALTER TABLE messages ADD COLUMN ai_log_id INTEGER`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add missing columns to telegram_groups if not exists
  try {
    db.exec(`ALTER TABLE telegram_groups ADD COLUMN type TEXT DEFAULT 'job_posting'`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE telegram_groups ADD COLUMN active INTEGER DEFAULT 1`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE telegram_groups ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
  } catch (e) {}

  // Add keywords column to ml_knowledge_base if not exists
  try {
    db.exec(`ALTER TABLE ml_knowledge_base ADD COLUMN keywords TEXT`);
  } catch (e) {}

  // Add telegram_username column to candidates if not exists
  try {
    db.exec(`ALTER TABLE candidates ADD COLUMN telegram_username TEXT`);
  } catch (e) {}

  // Add google_id column to candidates if not exists
  try {
    db.exec(`ALTER TABLE candidates ADD COLUMN google_id TEXT`);
  } catch (e) {}

  console.log('✅ Schema created successfully');
}

// Ensure demo account exists - ALWAYS runs in both environments
function ensureDemoAccount() {
  const demoExists = db.prepare('SELECT COUNT(*) as c FROM candidates WHERE email = ?').get('sarah.tan@email.com').c;
  if (demoExists > 0) {
    console.log('✅ Demo account exists: sarah.tan@email.com');
    return;
  }

  console.log('🎭 Creating demo account: Sarah Tan');

  // Create Sarah Tan demo candidate
  // XP 15500 = Level 14 (Specialist) in new 50-level system
  // Total earnings = sum of payments: 120+128+160+125+128 = 661
  db.prepare(`
    INSERT INTO candidates (
      id, name, email, phone, status, source,
      xp, level, streak_days, total_jobs_completed,
      certifications, skills, preferred_locations,
      referral_code, referral_tier, total_referral_earnings,
      total_incentives_earned, total_earnings, rating,
      profile_photo, online_status, whatsapp_opted_in, created_at, updated_at
    ) VALUES (
      'CND_DEMO_001',
      'Sarah Tan',
      'sarah.tan@email.com',
      '+6591234567',
      'active',
      'direct',
      15500,
      14,
      5,
      42,
      '["Food Safety", "First Aid", "Customer Service"]',
      '["Customer Service", "Cash Handling", "Event Support", "F&B Service"]',
      '["Central", "East", "West"]',
      'SARAH001',
      2,
      180.00,
      250.00,
      661.00,
      4.8,
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah%20Tan',
      'online',
      1,
      datetime('now', '-180 days'),
      datetime('now')
    )
  `).run();

  // Add some payment history for Sarah
  const payments = [
    ['PAY_DEMO_001', 'CND_DEMO_001', null, 120.00, 0, 120.00, 8.0, 'paid', -7],
    ['PAY_DEMO_002', 'CND_DEMO_001', null, 108.00, 20.00, 128.00, 6.0, 'paid', -14],
    ['PAY_DEMO_003', 'CND_DEMO_001', null, 160.00, 0, 160.00, 8.0, 'paid', -21],
    ['PAY_DEMO_004', 'CND_DEMO_001', null, 110.00, 15.00, 125.00, 5.0, 'pending', -3],
    ['PAY_DEMO_005', 'CND_DEMO_001', null, 128.00, 0, 128.00, 8.0, 'approved', -1],
  ];
  payments.forEach(p => {
    db.prepare(`
      INSERT INTO payments (id, candidate_id, deployment_id, base_amount, incentive_amount, total_amount, hours_worked, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ? || ' days'))
    `).run(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8]);
  });

  // Add XP transactions
  db.prepare(`INSERT INTO xp_transactions (candidate_id, amount, reason, created_at) VALUES ('CND_DEMO_001', 100, 'Job Completed', datetime('now', '-7 days'))`).run();
  db.prepare(`INSERT INTO xp_transactions (candidate_id, amount, reason, created_at) VALUES ('CND_DEMO_001', 150, 'Job Completed + Bonus', datetime('now', '-14 days'))`).run();
  db.prepare(`INSERT INTO xp_transactions (candidate_id, amount, reason, created_at) VALUES ('CND_DEMO_001', 50, 'Daily Login Streak', datetime('now', '-1 days'))`).run();
  db.prepare(`INSERT INTO xp_transactions (candidate_id, amount, reason, created_at) VALUES ('CND_DEMO_001', 200, 'Referral Bonus', datetime('now', '-10 days'))`).run();

  console.log('✅ Demo account created: sarah.tan@email.com');
}

// Seed essential data (achievements, quests, tiers) - runs in both environments
function seedEssentialData() {
  console.log('🌱 Seeding essential data...');

  const achievementCount = db.prepare('SELECT COUNT(*) as c FROM achievements').get().c;

  // Referral tiers
  const tierCount = db.prepare('SELECT COUNT(*) as c FROM referral_tiers').get().c;
  if (tierCount === 0) {
    const tiers = [
      [1, 1, 30, 'Bronze - First job completed by referral'],
      [2, 5, 50, 'Silver - 5 jobs completed by referral'],
      [3, 15, 100, 'Gold - 15 jobs completed by referral'],
      [4, 30, 150, 'Platinum - 30 jobs completed by referral'],
    ];
    tiers.forEach(t => {
      db.prepare('INSERT OR IGNORE INTO referral_tiers (tier_level, jobs_required, bonus_amount, description) VALUES (?,?,?,?)').run(...t);
    });
  }

  // Achievements
  if (achievementCount === 0) {
    const achievements = [
      ['ACH001', 'First Steps', 'Complete your first job', '🎯', 'jobs', 'jobs_completed', 1, 100, 'common'],
      ['ACH002', 'Getting Started', 'Complete 5 jobs', '⭐', 'jobs', 'jobs_completed', 5, 250, 'common'],
      ['ACH003', 'Dedicated Worker', 'Complete 25 jobs', '💪', 'jobs', 'jobs_completed', 25, 500, 'rare'],
      ['ACH004', 'Job Master', 'Complete 100 jobs', '🏆', 'milestone', 'jobs_completed', 100, 1500, 'epic'],
      ['ACH005', 'Week Warrior', '7-day streak', '🔥', 'streak', 'streak', 7, 200, 'rare'],
      ['ACH011', 'Fort Knight!', '14-day streak', '⚔️', 'streak', 'streak', 14, 500, 'epic'],
      ['ACH006', 'MONTH-STER!', '30-day streak', '👑', 'streak', 'streak', 30, 1000, 'legendary'],
      ['ACH007', 'First Cert', 'Complete first training', '📚', 'training', 'training', 1, 150, 'common'],
      ['ACH008', 'Recruiter', 'Refer your first friend', '🤝', 'referral', 'referrals', 1, 200, 'common'],
      ['ACH009', 'Super Recruiter', 'Refer 5 friends', '🌟', 'referral', 'referrals', 5, 500, 'rare'],
      ['ACH010', 'Perfect Score', 'Get 5-star rating 10 times', '⭐', 'rating', 'five_star', 10, 300, 'rare'],
    ];
    achievements.forEach(a => {
      db.prepare('INSERT OR IGNORE INTO achievements VALUES (?,?,?,?,?,?,?,?,?)').run(...a);
    });
  }

  // Quests - seed independently
  const questCount = db.prepare('SELECT COUNT(*) as c FROM quests').get().c;
  if (questCount === 0) {
    const quests = [
      // Daily quests
      ['QST001', 'Daily Check-in', 'Open the app today to earn XP', 'daily', '{"type":"streak","count":1}', 10, 0, 1],
      ['QST002', 'Apply for a Job', 'Submit an application for any available job', 'daily', '{"type":"accept_job","count":1}', 25, 0, 1],
      // Weekly quests
      ['QST003', 'Complete a Job', 'Successfully finish any job this week', 'weekly', '{"type":"jobs_completed","count":1}', 150, 0, 1],
      ['QST004', 'Perfect Week', 'Complete 5 jobs in a single week', 'weekly', '{"type":"jobs_completed","count":5}', 500, 25, 1],
      ['QST005', 'Apply to 3 Jobs', 'Apply to 3 different jobs this week', 'weekly', '{"type":"accept_job","count":3}', 100, 0, 1],
      // Special quests
      ['QST006', 'Refer a Friend', 'Invite someone to join WorkLink', 'special', '{"type":"referral","count":1}', 300, 30, 1],
      ['QST007', 'Complete Training', 'Finish any training course', 'special', '{"type":"training_completed","count":1}', 200, 0, 1],
      ['QST008', 'Complete Your Profile', 'Fill in all your profile details', 'special', '{"type":"profile_complete","count":1}', 100, 0, 1],
      // Repeatable quests
      ['QST009', 'Five Star Service', 'Receive a 5-star rating from a client', 'repeatable', '{"type":"rating","value":5}', 50, 5, 1],
    ];
    quests.forEach(q => {
      db.prepare('INSERT OR IGNORE INTO quests VALUES (?,?,?,?,?,?,?,?)').run(...q);
    });
    console.log('  ✅ Seeded quests');
  }

  // Training
  const training = [
    ['TRN001', 'Server Basics', 'F&B service fundamentals', 45, 'Server Basics', 150],
    ['TRN002', 'Food Safety', 'Food handling certification', 60, 'Food Safety', 200],
    ['TRN003', 'Customer Service', 'Customer interaction skills', 30, 'Customer Service', 100],
    ['TRN004', 'Bartending 101', 'Basic bartending skills', 90, 'Bartending', 250],
    ['TRN005', 'Event Management', 'Large event coordination', 60, 'Event Crew', 200],
  ];
  training.forEach(t => {
    db.prepare('INSERT OR IGNORE INTO training VALUES (?,?,?,?,?,?)').run(...t);
  });

  // Incentive schemes
  const schemes = [
    ['INC001', 'Consistency Bonus', '5+ jobs/month bonus', 'consistency', 'monthly_jobs', 5, 'fixed', 20, 50, 20, 1],
    ['INC002', 'Perfect Rating', '5-star rating bonus', 'performance', 'rating', 5, 'fixed', 5, 5, 20, 1],
    ['INC003', 'Referral Bonus', 'Refer a friend', 'referral', 'referral', 1, 'tiered', 30, 150, 20, 1],
    ['INC004', 'Streak Bonus', '7-day work streak', 'streak', 'streak_days', 7, 'fixed', 15, 15, 20, 1],
  ];
  schemes.forEach(s => {
    db.prepare(`INSERT OR IGNORE INTO incentive_schemes VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`).run(...s);
  });

  // Message templates
  const templates = [
    ['TPL001', 'Welcome', 'onboarding', 'Hi {name}! Welcome to WorkLink.', '👋 Hi {name}! Welcome to WorkLink!\n\n🔗 {app_link}', '["name","app_link"]'],
    ['TPL002', 'Job Match', 'job', 'Job available: {job_title} at {location}', '🎯 *Perfect Match!*\n\n{job_title}\n📍 {location}\n💰 ${pay_rate}/hr', '["job_title","location","pay_rate"]'],
    ['TPL003', 'Job Reminder', 'reminder', 'Reminder: Job tomorrow at {location}', '⏰ *Reminder*\n\n📍 {location}\n🕐 {time}', '["location","time"]'],
    ['TPL004', 'Payment', 'payment', 'Payment of ${amount} processed.', '💰 *Payment Received!*\n\n${amount}', '["amount"]'],
    ['TPL005', 'Referral Success', 'referral', '{friend_name} signed up!', '🎉 {friend_name} joined! Earn ${bonus} on first job.', '["friend_name","bonus"]'],
  ];
  templates.forEach(t => {
    db.prepare('INSERT OR IGNORE INTO message_templates (id, name, category, content, whatsapp_content, variables) VALUES (?,?,?,?,?,?)').run(...t);
  });

  // Default tender alerts
  const alerts = [
    ['Supply of Manpower Services', 'gebiz'],
    ['Provision of Temporary Staff', 'gebiz'],
    ['Event Support', 'gebiz'],
    ['Admin Support', 'gebiz'],
  ];
  alerts.forEach(a => {
    db.prepare('INSERT OR IGNORE INTO tender_alerts (keyword, source, email_notify, active) VALUES (?, ?, 1, 1)').run(...a);
  });

  // =====================================================
  // AI/ML DEFAULT SETTINGS
  // =====================================================

  // AI Chat Settings - Use INSERT OR REPLACE to ensure correct defaults on Railway
  const aiSettings = [
    ['ai_enabled', 'true', 'Master switch for AI auto-reply'],
    ['default_mode', 'auto', 'Default AI mode: off | auto | suggest'],
    ['response_delay_ms', '1500', 'Delay before AI responds (ms) for natural feel'],
    ['typing_delay_enabled', 'true', 'Show typing indicator with 3-5s delay before AI responds'],
    ['response_style', 'concise', 'AI response style: concise | normal'],
    ['language_style', 'singlish', 'AI language style: singlish | professional'],
    ['max_context_messages', '10', 'Number of previous messages to include in context'],
    ['include_candidate_profile', 'true', 'Include candidate info in AI context'],
    ['include_job_suggestions', 'true', 'Allow AI to suggest relevant jobs'],
  ];
  aiSettings.forEach(s => {
    // First insert if not exists, then ensure ai_enabled and default_mode are correct
    db.prepare('INSERT OR IGNORE INTO ai_settings (key, value, description) VALUES (?, ?, ?)').run(...s);
  });
  // Ensure AI is enabled with correct defaults (fixes Railway database)
  db.prepare("UPDATE ai_settings SET value = 'true' WHERE key = 'ai_enabled'").run();
  db.prepare("UPDATE ai_settings SET value = 'auto' WHERE key = 'default_mode'").run();

  // ML Settings
  const mlSettings = [
    ['kb_enabled', 'true', 'Use knowledge base before calling LLM'],
    ['min_confidence', '0.75', 'Minimum confidence to use KB answer (0-1)'],
    ['learn_from_llm', 'true', 'Auto-add LLM responses to KB'],
    ['learn_from_edits', 'true', 'Learn from admin corrections'],
    ['learn_from_approvals', 'true', 'Boost confidence when admin approves'],
    ['confidence_boost_approve', '0.1', 'Confidence increase on approval'],
    ['confidence_boost_edit', '0.05', 'Confidence increase when edited (learns edited version)'],
    ['confidence_penalty_reject', '0.15', 'Confidence decrease on rejection'],
  ];
  mlSettings.forEach(s => {
    db.prepare('INSERT OR IGNORE INTO ml_settings (key, value, description) VALUES (?, ?, ?)').run(...s);
  });

  // Telegram Post Settings
  const telegramSettings = [
    ['auto_post_enabled', 'false', 'Auto-post jobs when created'],
    ['ab_testing_enabled', 'true', 'Enable A/B testing for ads'],
    ['variants_per_job', '2', 'Number of ad variants to generate'],
    ['measurement_hours', '48', 'Hours to wait before evaluating A/B test'],
    ['use_optimal_timing', 'true', 'Schedule posts at optimal times'],
  ];
  telegramSettings.forEach(s => {
    db.prepare('INSERT OR IGNORE INTO telegram_post_settings (key, value) VALUES (?, ?)').run(s[0], s[1]);
  });

  // Ad ML Settings
  const adMlSettings = [
    ['use_learned_preferences', 'true', 'Apply learned variable preferences to new ads'],
    ['min_tests_for_confidence', '5', 'Minimum A/B tests before considering variable confident'],
    ['exploration_rate', '0.2', 'Probability of testing low-confidence variables (exploration vs exploitation)'],
    ['auto_optimize', 'true', 'Automatically use best-performing variables'],
  ];
  adMlSettings.forEach(s => {
    db.prepare('INSERT OR IGNORE INTO ad_ml_settings (key, value, description) VALUES (?, ?, ?)').run(s[0], s[1], s[2] || null);
  });

  // Default FAQ entries
  const faqs = [
    ['pay', 'When will I get paid?', 'Payments are processed every Friday for jobs completed the previous week. You should receive the payment in your bank account by Monday. 💰', '["pay","paid","payment","salary","money","when"]', 10],
    ['pay', 'How is my pay calculated?', 'Your pay is calculated based on hours worked × hourly rate. Any bonuses (streak bonus, referral bonus, XP bonus) are added on top. You can see the breakdown in your Wallet section. 📊', '["calculate","how much","rate","hourly","breakdown"]', 9],
    ['schedule', 'How do I update my availability?', 'You can update your availability in the WorkLink app! Go to the Calendar tab, tap on the dates you want to change, and mark them as Available or Unavailable. Easy! 📅', '["availability","available","schedule","calendar","update","free"]', 10],
    ['schedule', 'Can I cancel a job?', "Please let us know at least 24 hours before the job if you need to cancel. Contact us immediately if there's an emergency. Last-minute cancellations may affect your rating, so try to give us as much notice as possible! 🙏", '["cancel","cancellation","cannot make it","emergency","cant go"]', 9],
    ['jobs', 'Are there any jobs available?', 'Yes! Check the Jobs tab in your app to see all available opportunities. You can filter by date, location, and job type. New jobs are posted regularly, so keep checking! 🎯', '["job","jobs","work","opportunity","available","opening"]', 10],
    ['jobs', 'How do I apply for a job?', 'To apply for a job, open the Jobs tab, find a job you like, and tap "Apply". Make sure your availability is updated so you can see jobs that match your schedule! ✅', '["apply","application","how to","sign up","register"]', 9],
    ['onboarding', 'How do I start working?', "Great that you want to start! Make sure your profile is complete (photo, bank details, contact info), then browse available jobs in the Jobs tab. Apply to ones that interest you and we'll confirm your assignment! 🚀", '["start","begin","first job","new","getting started"]', 10],
    ['general', 'What is XP and levels?', 'XP (experience points) rewards you for completing jobs and activities! As you earn XP, you level up and unlock benefits like priority job access and bonus multipliers. Keep working to climb the ranks! ⚡', '["xp","level","points","experience","rank","tier"]', 8],
    ['general', 'How does the referral program work?', 'Refer friends using your unique referral code (find it in your Profile). When they complete their first job, you both earn a bonus! The more friends you refer, the higher your referral tier and rewards. 🤝', '["referral","refer","friend","invite","bonus","code"]', 8],
  ];
  faqs.forEach(f => {
    db.prepare('INSERT OR IGNORE INTO ai_faq (category, question, answer, keywords, priority) VALUES (?, ?, ?, ?, ?)').run(...f);
  });

  // Additional FAQ entries for comprehensive coverage
  const additionalFaqs = [
    ['pay', 'What payment methods do you accept?', "We pay directly to your Singapore bank account via PayNow or bank transfer. Make sure your bank details are updated in your Profile! We don't do cash payments. 🏦", '["paynow","bank","transfer","cash","payment method"]', 8],
    ['pay', 'Why is my payment less than expected?', "Your payment might differ due to: break time deductions, actual hours worked vs scheduled, or CPF contributions if applicable. Check the payment breakdown in your Wallet for details! 📋", '["less","lower","deduction","wrong","incorrect","short"]', 9],
    ['pay', 'Can I get paid early?', "Standard payment is every Friday, but we understand emergencies happen! Contact our support team if you need an advance - we'll try to help where possible. 💪", '["early","advance","urgent","emergency","faster","quick"]', 7],
    ['schedule', 'What if I am late to a job?', "Please inform us immediately if you're running late! Contact your supervisor and our support team. Being late repeatedly may affect your rating and future job assignments. ⏰", '["late","delay","traffic","stuck","running late"]', 9],
    ['schedule', 'Can I swap shifts with another worker?', "Shift swaps need to be approved by us first. Contact support with details of who you want to swap with. Both workers must agree and the swap must be confirmed at least 24 hours before. 🔄", '["swap","switch","exchange","trade","replace"]', 8],
    ['schedule', 'How far in advance are jobs posted?', "Jobs are typically posted 1-2 weeks in advance, but some urgent jobs may be posted with shorter notice. Enable notifications to get alerts for new jobs that match your preferences! 📱", '["advance","ahead","notice","when posted","upcoming"]', 7],
    ['jobs', 'What types of jobs are available?', "We have various roles: F&B service, event crew, warehouse packing, retail assistants, admin support, and more! Check the Jobs tab to see what's available in your area. 🎪", '["type","kind","role","position","what jobs"]', 9],
    ['jobs', 'Do I need experience?', "Many of our jobs are entry-level and provide on-site training! Your profile shows your experience level, and we'll match you with suitable roles. Everyone starts somewhere! 🌟", '["experience","requirement","qualification","skill","new","beginner"]', 9],
    ['jobs', 'What should I wear to work?', "Dress code depends on the job. Most events require all-black attire (black shirt, pants, shoes). Specific requirements are listed in the job details. When in doubt, smart casual is safe! 👔", '["wear","dress","attire","uniform","clothing","outfit"]', 8],
    ['jobs', 'Where are the jobs located?', "Jobs are across Singapore! You can filter by location in the Jobs tab. We have opportunities in CBD, Orchard, Marina Bay, Sentosa, and neighborhood areas. Choose what's convenient for you! 🗺️", '["location","where","area","place","mrt","near"]', 8],
    ['onboarding', 'How do I update my profile?', "Go to the Profile tab in your app. You can update your photo, contact info, bank details, skills, and certifications. A complete profile helps you get matched to better jobs! ✨", '["update","edit","change","profile","information","details"]', 9],
    ['onboarding', 'What documents do I need?', "You'll need: NRIC (for Singaporeans/PRs) or valid work pass, and bank account details. Some roles may require additional certifications which will be specified. 📄", '["document","nric","passport","work pass","requirement"]', 9],
    ['onboarding', 'How long until I can start working?', "Once your profile is complete and verified, you can start applying immediately! Verification usually takes 1-2 business days. While waiting, browse available jobs! ⚡", '["how long","when can","start","begin","wait","verification"]', 8],
    ['general', 'How do I contact support?', "You can reach us through: in-app chat (fastest!), email at support@worklink.sg, or WhatsApp. We're here to help Mon-Fri 9am-6pm, and for urgent job issues on weekends too! 💬", '["contact","support","help","reach","phone","email","whatsapp"]', 10],
    ['general', 'What happens if I get injured at work?', "Your safety is our priority! Report any injury immediately to your supervisor. We have insurance coverage for work-related injuries. Seek medical attention first, then contact us. 🏥", '["injury","hurt","accident","injured","medical","insurance"]', 10],
    ['general', 'Can I bring a friend to work?', "You can refer friends through our referral program! However, they need to complete their own registration and get assigned. You can't bring unregistered people to work sites. 👥", '["friend","bring","together","work together","same job"]', 7],
    ['general', 'How do I improve my rating?', "Great question! Your rating improves by: showing up on time, completing jobs well, being professional, getting good feedback from clients. Consistency is key! 🌟", '["rating","improve","increase","better","score"]', 8],
    ['general', 'What is the streak bonus?', "Work consecutive days to build a streak! The longer your streak, the bigger your bonus multiplier. Missing a scheduled day resets your streak, so plan carefully! 🔥", '["streak","consecutive","bonus","multiplier","daily"]', 8],
    ['transport', 'Is transport provided?', "Transport is usually not provided - you'll need to make your own way. Some remote locations may have arranged transport which will be mentioned in the job details. Check before applying! 🚌", '["transport","travel","get there","bus","mrt","provided"]', 8],
    ['transport', 'Will transport be reimbursed?', "Transport claims depend on the job and client. If reimbursement is available, it will be stated in the job details. Keep your receipts just in case! 🧾", '["reimburse","claim","transport cost","fare","travel expense"]', 7],
  ];
  additionalFaqs.forEach(f => {
    db.prepare('INSERT OR IGNORE INTO ai_faq (category, question, answer, keywords, priority) VALUES (?, ?, ?, ?, ?)').run(...f);
  });

  // ============================================
  // CHAT ML - Knowledge Base (Learned Q&A pairs)
  // ============================================
  const knowledgeBaseEntries = [
    // ============================================
    // GREETINGS & COMMON PHRASES
    // ============================================
    ['hi', 'Hello! How can I help you today? 😊', 'general_greeting', 0.97, 156, 154, 2, 0, 'approved'],
    ['hello', 'Hi there! What can I assist you with today? 👋', 'general_greeting', 0.97, 120, 118, 2, 0, 'approved'],
    ['good morning', 'Good morning! Ready to find some great jobs today? ☀️', 'general_greeting', 0.96, 78, 76, 2, 0, 'approved'],
    ['good afternoon', 'Good afternoon! How can I help you? 😊', 'general_greeting', 0.96, 45, 44, 1, 0, 'approved'],
    ['good evening', 'Good evening! What can I do for you? 🌙', 'general_greeting', 0.96, 38, 37, 1, 0, 'approved'],
    ['thanks', "You're welcome! Let me know if you need anything else. 💪", 'goodbye', 0.98, 89, 88, 1, 0, 'approved'],
    ['thank you', "No problem! Happy to help. Good luck with your jobs! 🙌", 'goodbye', 0.98, 75, 74, 1, 0, 'approved'],
    ['ok thanks', "You're welcome! All the best! 👍", 'goodbye', 0.97, 65, 64, 1, 0, 'approved'],
    ['bye', "Goodbye! Have a great day! 👋", 'goodbye', 0.97, 50, 49, 1, 0, 'approved'],

    // ============================================
    // PAYMENT INQUIRIES
    // ============================================
    ['when payment', 'Payments are processed every Friday! Money reaches your bank by Monday. Check Wallet for payment history. 💰', 'pay_inquiry', 0.92, 45, 42, 2, 1, 'approved'],
    ['when is payday', 'Every Friday! We pay for jobs completed Mon-Sun the following Friday. 📅', 'pay_inquiry', 0.92, 40, 38, 2, 0, 'approved'],
    ['pay when ah', 'Friday every week! Jobs done Mon-Sun get paid the following Friday. Check Wallet for status. 💵', 'pay_inquiry', 0.88, 23, 18, 4, 1, 'approved'],
    ['how much pay', 'Your pay = hours worked × hourly rate, plus any bonuses. Check job listing for exact rate! 📊', 'pay_inquiry', 0.89, 38, 35, 3, 0, 'approved'],
    ['salary not in', 'Payments process on Friday, arrive by Monday. If still missing by Tuesday, contact us with your job details! 🔍', 'pay_inquiry', 0.85, 25, 22, 2, 1, 'approved'],
    ['payment less than expected', 'Check your Wallet breakdown - it shows hours worked, rate, and any deductions. Let me know if something looks wrong! 📋', 'pay_inquiry', 0.82, 18, 15, 2, 1, 'approved'],
    ['cpf deduction', 'CPF is deducted if you are a Singaporean/PR earning above the threshold. Check Wallet for detailed breakdown. 🏛️', 'pay_inquiry', 0.80, 15, 12, 2, 1, 'approved'],
    ['overtime pay', 'Overtime is usually 1.5x rate after 8 hours. Check your job details for exact OT terms! ⏰', 'pay_inquiry', 0.78, 12, 9, 2, 1, 'approved'],
    ['can claim taxi', 'Transport claims depend on the job. Check job details - if allowed, keep your receipts! 🧾', 'pay_inquiry', 0.75, 10, 7, 2, 1, 'approved'],
    ['transport claim', 'Some jobs offer transport reimbursement. Check job details and keep receipts if claims are allowed. 🚕', 'pay_inquiry', 0.75, 8, 6, 1, 1, 'approved'],

    // ============================================
    // JOB SEARCH & APPLICATIONS
    // ============================================
    ['got job or not', 'Yes! Check the Jobs tab for available positions. New jobs posted daily! 📱', 'job_search', 0.95, 67, 65, 2, 0, 'approved'],
    ['any job', 'Plenty of jobs available! Open Jobs tab to browse. Filter by date and location. 🔍', 'job_search', 0.94, 55, 53, 2, 0, 'approved'],
    ['any lobang', 'Got plenty! F&B, events, retail, warehouse and more. Check Jobs tab! 💼', 'job_search', 0.85, 19, 14, 4, 1, 'approved'],
    ['weekend job', 'Weekend jobs are popular! Filter Jobs by Sat/Sun. Turn on notifications for new postings! 📅', 'job_search', 0.90, 35, 32, 2, 1, 'approved'],
    ['job near me', 'Use the location filter in Jobs tab to find work near you! We have jobs across Singapore. 📍', 'job_search', 0.88, 28, 25, 2, 1, 'approved'],
    ['urgent job today', 'Same-day jobs are marked with 🔥! Check Jobs tab now and apply quickly - they fill fast!', 'job_search', 0.86, 22, 19, 2, 1, 'approved'],
    ['how to apply', 'Easy! Go to Jobs → Find a job → Tap "Apply" → Done! Make sure availability is updated first. ✅', 'job_application', 0.91, 52, 48, 3, 1, 'approved'],
    ['application status', 'Check Deployments tab for your application status. Confirmations usually come 24-48hrs before job. 📋', 'job_application', 0.87, 30, 27, 2, 1, 'approved'],
    ['confirm job', 'Jobs show "Confirmed" in Deployments when approved. Still pending? Client is finalizing numbers. 🕐', 'job_application', 0.83, 27, 23, 3, 1, 'approved'],
    ['where is the job', 'Location and address are in job details! Tap your deployment to see full address and map. 🗺️', 'job_search', 0.86, 28, 25, 2, 1, 'approved'],
    ['dress code', 'Most events require all-black attire. Check job details for specific requirements. When unsure, smart casual! 👔', 'job_search', 0.82, 20, 17, 2, 1, 'approved'],
    ['what to wear', 'Dress code is in job details. Usually all-black for events. Some jobs provide uniform! 👕', 'job_search', 0.82, 18, 15, 2, 1, 'approved'],
    ['what to bring', 'Bring NRIC for verification and wear required attire. Some jobs need specific items - check details! 📝', 'job_search', 0.80, 15, 12, 2, 1, 'approved'],

    // ============================================
    // SCHEDULE & AVAILABILITY
    // ============================================
    ['what time start', 'Start times vary! Check your Deployments for exact time. Arrive 15 mins early to sign in. ⏰', 'schedule_question', 0.87, 34, 30, 3, 1, 'approved'],
    ['what time end', 'End times are in your job details. Some jobs may run slightly longer depending on the event. 🕐', 'schedule_question', 0.85, 25, 22, 2, 1, 'approved'],
    ['break time', 'Breaks depend on shift length. 4-6hrs = 30min break. 6hrs+ may have 1 hour. Check job details! ☕', 'schedule_question', 0.78, 15, 12, 2, 1, 'approved'],
    ['cannot make it tomorrow', "No worries! Cancel in app ASAP and let us know the reason. Earlier notice = better! 🙏", 'schedule_question', 0.88, 29, 26, 2, 1, 'approved'],
    ['need cancel job', 'Go to Deployments → Find the job → Tap Cancel. Please do this at least 24hrs before! ⚠️', 'schedule_question', 0.86, 24, 21, 2, 1, 'approved'],
    ['mc how', 'If you need MC, inform us ASAP through chat. Submit your MC when you can. Get well soon! 🤒', 'schedule_question', 0.82, 18, 14, 3, 1, 'approved'],
    ['sick cannot work', "Sorry to hear! Please cancel in app and rest well. Send MC when you can. Take care! 🏥", 'schedule_question', 0.82, 16, 13, 2, 1, 'approved'],
    ['late already', 'Thanks for letting us know! Contact your on-site supervisor too. How late will you be? ⏱️', 'urgent', 0.90, 25, 22, 2, 1, 'approved'],
    ['running late', "Please inform your supervisor directly! Let us know ETA. Traffic happens, just communicate early! 🚗", 'urgent', 0.88, 20, 17, 2, 1, 'approved'],
    ['can swap shift', 'Shift swaps need approval. Contact support with details of who you want to swap with! 🔄', 'schedule_question', 0.75, 12, 9, 2, 1, 'approved'],

    // ============================================
    // PROFILE & ACCOUNT
    // ============================================
    ['bank wrong', 'Go to Profile → Bank Details to update. Make sure name matches NRIC. Changes apply next payment cycle. 🏦', 'general_question', 0.85, 20, 17, 2, 1, 'approved'],
    ['update bank', 'Profile → Bank Details → Edit. Ensure bank account name matches your NRIC name! 💳', 'general_question', 0.85, 18, 15, 2, 1, 'approved'],
    ['change phone number', 'Go to Profile → Edit to update your contact details. Keep them current for job updates! 📱', 'general_question', 0.82, 12, 10, 1, 1, 'approved'],
    ['forgot password', 'Tap "Forgot Password" on login screen. We will send a reset link to your email! 🔐', 'general_question', 0.88, 22, 20, 1, 1, 'approved'],
    ['how to refer friend', 'Share your referral code from Profile → Referrals. Both earn bonus when friend completes first job! 🎁', 'general_question', 0.88, 31, 28, 2, 1, 'approved'],
    ['referral code', 'Find your unique code in Profile → Referrals. Share it and earn when friends join! 💰', 'general_question', 0.87, 25, 22, 2, 1, 'approved'],

    // ============================================
    // XP, LEVELS & GAMIFICATION
    // ============================================
    ['xp for what', 'XP helps you level up! Higher levels = priority job access + bonus multipliers. Keep completing jobs! 🚀', 'general_question', 0.84, 25, 21, 3, 1, 'approved'],
    ['how to get xp', 'Earn XP by completing jobs, maintaining streaks, and finishing quests! Check Quests tab. ⭐', 'general_question', 0.84, 22, 19, 2, 1, 'approved'],
    ['what is streak', 'Work consecutive days to build a streak! Longer streak = bigger bonus multiplier. 🔥', 'general_question', 0.82, 18, 15, 2, 1, 'approved'],
    ['my rating low', "Rating reflects punctuality and performance. Show up on time, do great work - it'll improve! 📈", 'complaint', 0.78, 14, 10, 3, 1, 'approved'],
    ['how to improve rating', 'Be punctual, complete jobs well, be professional. Good feedback from clients boosts your rating! ⭐', 'general_question', 0.80, 16, 13, 2, 1, 'approved'],
    ['what is level', 'Your level shows your experience. Higher levels get priority booking and better job matches! 🎯', 'general_question', 0.80, 14, 11, 2, 1, 'approved'],

    // ============================================
    // SUPPORT & HELP
    // ============================================
    ['need help', "I'm here to help! What do you need - jobs, payments, schedule, or something else? 🤝", 'general_question', 0.92, 50, 47, 3, 0, 'approved'],
    ['got problem', "Sorry to hear! Tell me what happened and I'll do my best to help. 💪", 'general_question', 0.88, 30, 27, 2, 1, 'approved'],
    ['contact support', 'You can reach us here in chat (fastest!), email support@worklink.sg, or WhatsApp! 💬', 'general_question', 0.90, 35, 32, 2, 1, 'approved'],
    ['complaint', "I'm sorry you're facing issues. Please share the details and we'll look into it right away. 🔍", 'complaint', 0.85, 20, 17, 2, 1, 'approved'],
    ['parking got', 'Parking varies by venue. Check job details or ask us about specific locations! 🅿️', 'general_question', 0.72, 12, 9, 2, 1, 'approved'],
  ];

  knowledgeBaseEntries.forEach(entry => {
    db.prepare(`
      INSERT OR IGNORE INTO ml_knowledge_base
      (question, answer, intent, confidence, use_count, success_count, edit_count, reject_count, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...entry);
  });

  // ============================================
  // CHAT ML - Training Data (For future SLM)
  // ============================================
  const trainingData = [
    ['When will I receive my salary?', 'Payments are processed every Friday for the previous week. The money should be in your bank account by Monday!', 'pay_inquiry', 0.95, 1, null, 'production'],
    ['Got any job tomorrow?', 'Check the Jobs tab for tomorrow! Filter by date to see available positions. Apply early as slots fill up fast!', 'job_search', 0.92, 1, null, 'production'],
    ['How to cancel my shift?', "Go to your Deployments, find the job, and tap Cancel. Please do this at least 24 hours before. Let us know the reason!", 'schedule_question', 0.90, 1, null, 'production'],
    ['What time should I arrive?', 'Please arrive 15 minutes before your shift starts for check-in. The exact start time is in your job details.', 'schedule_question', 0.93, 1, null, 'production'],
    ['Is there parking at the venue?', 'Parking varies by location. Check job details or contact us for specific venues. Some places have limited parking!', 'general_question', 0.85, 1, null, 'production'],
    ['Can I apply for multiple jobs same day?', "You can apply to multiple jobs, but make sure there's no time overlap! The system will warn you about conflicts.", 'job_application', 0.88, 1, null, 'production'],
    ['My friend wants to join', 'Great! Share your referral code from Profile. They sign up, complete a job, you both get bonus! 🎉', 'general_question', 0.91, 1, null, 'production'],
    ['What should I bring to work?', 'Bring your NRIC for verification, and wear the required attire. Some jobs need specific items - check the job details!', 'job_search', 0.87, 1, null, 'production'],
    ['How to update bank account?', 'Go to Profile → Bank Details → Edit. Make sure NRIC name matches bank account name. Changes apply from next payment.', 'general_question', 0.94, 1, null, 'production'],
    ['Pay not correct', "Sorry to hear that! Let me check. Can you tell me which job and date? I'll look into the payment details for you.", 'complaint', 0.89, 1, 'Let me help you check your payment. Which job date are you referring to? I can look up the breakdown for you.', 'production'],
    ['Looking for weekend job', 'Weekend jobs are popular! Check Jobs tab and filter for Sat/Sun. Enable notifications to get alerts when new weekend jobs are posted.', 'job_search', 0.90, 1, null, 'production'],
    ['Where to find my schedule', 'Your confirmed jobs are in the Deployments tab! You can also check Calendar view to see your upcoming schedule at a glance.', 'schedule_question', 0.92, 1, null, 'production'],
    ['How does XP work', 'Complete jobs to earn XP! More XP = higher level = better perks like priority booking and bonus multipliers. Keep that streak going! 🔥', 'general_question', 0.88, 1, null, 'production'],
    ['Need urgent job today', 'Urgent jobs are marked with 🔥! Check Jobs tab now - some same-day positions may be available. Apply quickly!', 'job_search', 0.86, 1, null, 'production'],
    ['When confirm my application', 'Confirmations usually come 24-48 hours before the job. Keep notifications on! Status shows in your Deployments.', 'job_application', 0.87, 1, null, 'production'],
    ['Sorry cannot work tmr', "Thanks for the early notice! Please cancel in the app and let me know the reason. Hope everything is okay!", 'schedule_question', 0.91, 1, null, 'production'],
    ['What is my referral code', 'Your unique referral code is in Profile → Referrals. Share it with friends to earn bonuses when they complete jobs!', 'general_question', 0.93, 1, null, 'production'],
    ['Rate for waiter job', 'Waiter jobs typically range $10-14/hr depending on venue and event type. Check specific job listings for exact rates!', 'pay_inquiry', 0.84, 1, null, 'production'],
    ['Got training provided', 'Most jobs include on-site briefing! Some specialized roles have pre-training. Check job requirements for details.', 'job_search', 0.82, 1, null, 'production'],
    ['How many hours minimum', 'Minimum hours vary by job - some are 4hrs, some full day. Filter by duration in Jobs tab to find what suits you!', 'job_search', 0.85, 1, null, 'production'],
  ];

  trainingData.forEach(entry => {
    db.prepare(`
      INSERT OR IGNORE INTO ml_training_data
      (input_text, output_text, intent, quality_score, admin_approved, edited_output, source)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(...entry);
  });

  // ============================================
  // CHAT ML - Metrics (Historical performance)
  // ============================================
  const today = new Date();
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Simulate improving KB hit rate over time
    const baseQueries = 20 + Math.floor(Math.random() * 30);
    const kbHitRate = 0.3 + (30 - i) * 0.015 + Math.random() * 0.1; // Improves over time
    const kbHits = Math.floor(baseQueries * Math.min(kbHitRate, 0.85));
    const llmCalls = baseQueries - kbHits;
    const costSaved = kbHits * 0.005; // $0.005 per LLM call saved

    db.prepare(`
      INSERT OR IGNORE INTO ml_metrics (date, total_queries, kb_hits, llm_calls, avg_confidence, estimated_cost_saved)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(dateStr, baseQueries, kbHits, llmCalls, 0.75 + Math.random() * 0.15, costSaved);
  }

  // ============================================
  // SLM TRAINING DATA - Auto-seed & dedupe for production
  // ============================================
  // SAFETY GUARANTEES:
  // - ADDITIVE ONLY: Uses INSERT OR IGNORE, never overwrites existing data
  // - NO DROP/TRUNCATE: Never deletes tables or clears all data
  // - PRESERVES LEARNED DATA: Entries from user interactions are kept
  // - DEDUP KEEPS BEST: Only removes duplicates, keeps highest quality version
  // ============================================
  try {
    const slmSeeder = require('./seed-slm-data');
    slmSeeder.setDb(db); // Pass db to avoid circular dependency

    // Check what we're working with (for logging)
    const kbCount = db.prepare('SELECT COUNT(*) as c FROM ml_knowledge_base').get().c;
    const learnedCount = db.prepare(`SELECT COUNT(*) as c FROM ml_knowledge_base WHERE source = 'learned'`).get().c;
    console.log(`  📊 SLM data: ${kbCount} KB entries (${learnedCount} learned from users)`);

    // Dedupe on startup to keep data clean (only removes actual duplicates)
    if (kbCount > 50) {
      console.log('  🧹 Deduplicating SLM data (preserving unique entries)...');
      slmSeeder.deduplicateKnowledgeBase();
      slmSeeder.deduplicateTrainingData();
    }

    // Seed knowledge base if missing
    const slmSeedCount = db.prepare(`
      SELECT COUNT(*) as c FROM ml_knowledge_base WHERE source IN ('seed', 'singlish_seed')
    `).get().c;

    if (slmSeedCount < 10) {
      console.log('  🤖 Seeding SLM knowledge base...');
      slmSeeder.importToKnowledgeBase(slmSeeder.seedData);
    }

    // Always ensure 2000+ training entries (additive - won't duplicate)
    const trainingCount = db.prepare('SELECT COUNT(*) as c FROM ml_training_data').get().c;
    const TARGET_ENTRIES = 2000;

    if (trainingCount < TARGET_ENTRIES) {
      console.log(`  🤖 Expanding SLM training data (${trainingCount} → ${TARGET_ENTRIES}+)...`);

      // Import base seed data first
      slmSeeder.importToTrainingData(slmSeeder.seedData);

      // Run multiple generation passes until we reach target
      const passesNeeded = Math.ceil((TARGET_ENTRIES - trainingCount) / 400);
      for (let i = 0; i < Math.max(5, passesNeeded); i++) {
        const generated = slmSeeder.generateFromTemplates(500);
        slmSeeder.importToTrainingData(generated);
      }

      // Final deduplication pass
      console.log('  🧹 Final deduplication...');
      slmSeeder.deduplicateTrainingData();

      const finalCount = db.prepare('SELECT COUNT(*) as c FROM ml_training_data').get().c;
      console.log(`  ✅ SLM data ready: ${finalCount} training entries`);
    } else {
      console.log(`  ✅ SLM training data OK: ${trainingCount} entries`);
    }
  } catch (e) {
    console.log('  ⚠️ SLM seeder not available:', e.message);
  }

  // ============================================
  // AD ML - Skip if already seeded to prevent duplicates
  // ============================================
  const adDataExists = db.prepare('SELECT COUNT(*) as c FROM ad_training_data').get().c > 0;
  if (adDataExists) {
    console.log('✅ Essential data seeded (including AI/ML training data)');
    return;
  }

  // ============================================
  // AD ML - Variable Scores (Learned preferences)
  // ============================================
  const variableScores = [
    // Tone preferences - "friendly" wins
    ['tone', 'friendly', null, 28, 8, 156, 0.045, 0.78],
    ['tone', 'casual', null, 18, 14, 89, 0.032, 0.56],
    ['tone', 'urgent', null, 12, 18, 67, 0.028, 0.40],
    ['tone', 'formal', null, 6, 24, 34, 0.018, 0.20],

    // Emoji count - 3-4 is optimal
    ['emoji_count', '3', null, 24, 6, 134, 0.048, 0.80],
    ['emoji_count', '4', null, 20, 8, 112, 0.042, 0.71],
    ['emoji_count', '2', null, 14, 12, 78, 0.031, 0.54],
    ['emoji_count', '5', null, 10, 16, 56, 0.025, 0.38],
    ['emoji_count', '0', null, 4, 22, 23, 0.012, 0.15],

    // Length - medium performs best
    ['length', 'medium', null, 26, 7, 145, 0.046, 0.79],
    ['length', 'short', null, 16, 14, 82, 0.033, 0.53],
    ['length', 'long', null, 8, 19, 45, 0.022, 0.30],

    // CTA style - direct wins
    ['cta_style', 'direct', null, 22, 9, 128, 0.044, 0.71],
    ['cta_style', 'question', null, 15, 12, 76, 0.034, 0.56],
    ['cta_style', 'soft', null, 9, 17, 48, 0.024, 0.35],

    // Pay emphasis - prominent works
    ['pay_emphasis', 'prominent', null, 20, 10, 118, 0.041, 0.67],
    ['pay_emphasis', 'normal', null, 14, 13, 72, 0.032, 0.52],
    ['pay_emphasis', 'subtle', null, 7, 18, 38, 0.019, 0.28],

    // Format - bullets slightly better
    ['format', 'bullets', null, 18, 11, 95, 0.038, 0.62],
    ['format', 'hybrid', null, 15, 12, 81, 0.034, 0.56],
    ['format', 'paragraph', null, 10, 16, 54, 0.026, 0.38],
  ];

  variableScores.forEach(v => {
    db.prepare(`
      INSERT OR IGNORE INTO ad_variable_scores
      (variable_name, variable_value, job_category, win_count, lose_count, total_responses, avg_response_rate, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...v);
  });

  // ============================================
  // AD ML - Timing Scores (Best posting times)
  // ============================================
  // Singapore prime time is 6-9pm weekdays, 10am-2pm weekends
  const timingScores = [
    // Weekday evenings (best)
    [18, 1, 45, 89, 0.051, 0.92], // Mon 6pm
    [19, 1, 52, 98, 0.055, 0.95], // Mon 7pm
    [20, 1, 38, 68, 0.046, 0.85], // Mon 8pm
    [18, 2, 48, 92, 0.052, 0.93], // Tue 6pm
    [19, 2, 55, 105, 0.058, 0.98], // Tue 7pm - BEST
    [20, 2, 41, 74, 0.048, 0.87], // Tue 8pm
    [18, 3, 44, 85, 0.049, 0.90], // Wed 6pm
    [19, 3, 50, 95, 0.054, 0.94], // Wed 7pm
    [20, 3, 36, 62, 0.044, 0.82], // Wed 8pm
    [18, 4, 46, 88, 0.050, 0.91], // Thu 6pm
    [19, 4, 53, 100, 0.056, 0.96], // Thu 7pm
    [20, 4, 39, 70, 0.047, 0.86], // Thu 8pm
    [18, 5, 42, 78, 0.047, 0.88], // Fri 6pm
    [19, 5, 48, 89, 0.051, 0.92], // Fri 7pm
    [20, 5, 35, 58, 0.042, 0.80], // Fri 8pm

    // Weekend daytime
    [11, 6, 38, 72, 0.048, 0.88], // Sat 11am
    [12, 6, 42, 82, 0.051, 0.91], // Sat 12pm
    [13, 6, 40, 76, 0.049, 0.89], // Sat 1pm
    [11, 0, 35, 65, 0.046, 0.85], // Sun 11am
    [12, 0, 38, 71, 0.048, 0.88], // Sun 12pm
    [13, 0, 36, 67, 0.047, 0.86], // Sun 1pm

    // Morning (moderate)
    [9, 1, 22, 35, 0.028, 0.55], // Mon 9am
    [10, 1, 25, 42, 0.032, 0.62], // Mon 10am
    [9, 2, 24, 38, 0.030, 0.58], // Tue 9am
    [10, 2, 27, 45, 0.034, 0.65], // Tue 10am

    // Late night (poor)
    [22, 1, 12, 15, 0.015, 0.28], // Mon 10pm
    [23, 1, 8, 9, 0.010, 0.18], // Mon 11pm
    [22, 2, 14, 18, 0.017, 0.32], // Tue 10pm

    // Early morning (very poor)
    [7, 1, 5, 4, 0.006, 0.12], // Mon 7am
    [8, 1, 8, 8, 0.009, 0.18], // Mon 8am
  ];

  timingScores.forEach(t => {
    db.prepare(`
      INSERT OR IGNORE INTO ad_timing_scores
      (hour, day_of_week, post_count, total_responses, avg_response_rate, score)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(...t);
  });

  // ============================================
  // AD ML - Training Data (Winning ads)
  // ============================================
  const adTrainingData = [
    [
      '{"title":"F&B Service Crew","location":"Marina Bay Sands","pay_rate":14,"category":"fnb"}',
      "🔥 *F&B SERVICE CREW NEEDED!*\n\n📍 Marina Bay Sands\n💰 *$14/hr* - Great rate!\n📅 This Saturday\n⏰ 6pm - 11pm\n\n✅ No experience needed\n✅ Meal provided\n✅ MRT accessible\n\n👥 5 slots left - Apply now in WorkLink! 🚀",
      '{"tone":"friendly","emoji_count":"4","length":"medium","cta_style":"direct"}',
      0.058, 1, 0.92
    ],
    [
      '{"title":"Event Crew","location":"Sentosa","pay_rate":15,"category":"events"}',
      "🎪 *EVENT CREW - SENTOSA*\n\nJoin our team for an exciting corporate event!\n\n💰 $15/hr\n📅 Next Friday\n⏰ 2pm - 10pm (8hrs)\n📍 Sentosa Gateway\n\n*What you'll do:*\n• Guest registration\n• Crowd management\n• Setup & teardown\n\nApply now! Limited slots! 🏃",
      '{"tone":"friendly","emoji_count":"3","length":"medium","cta_style":"direct"}',
      0.052, 1, 0.88
    ],
    [
      '{"title":"Warehouse Packer","location":"Tuas","pay_rate":12,"category":"warehouse"}',
      "📦 *WAREHOUSE PACKERS WANTED*\n\nSimple packing job at Tuas!\n\n💵 $12/hr\n📅 Mon-Fri available\n⏰ 9am - 6pm\n🚌 Transport from Jurong East MRT\n\nNo experience needed. Training provided!\n\n10 positions open - Apply in WorkLink app 👆",
      '{"tone":"casual","emoji_count":"3","length":"medium","cta_style":"direct"}',
      0.045, 1, 0.85
    ],
    [
      '{"title":"Retail Assistant","location":"Orchard Road","pay_rate":13,"category":"retail"}',
      "🛍️ *RETAIL ASSISTANT*\n\nPopular fashion brand at Orchard!\n\n💰 $13/hr + commission potential\n📅 Weekend shifts available\n📍 ION Orchard\n\n*Looking for:*\n• Friendly personality\n• Basic English\n• Neat appearance\n\nWant to earn while shopping? 😄\nApply now!",
      '{"tone":"friendly","emoji_count":"3","length":"medium","cta_style":"question"}',
      0.048, 1, 0.86
    ],
    [
      '{"title":"Banquet Server","location":"Raffles Hotel","pay_rate":16,"category":"fnb"}',
      "✨ *BANQUET SERVERS - RAFFLES HOTEL*\n\nPrestigious wedding dinner event!\n\n💰 *$16/hr* - Premium rate!\n📅 Saturday 7th Dec\n⏰ 5pm - 12am\n📍 Raffles Hotel Ballroom\n\n*Requirements:*\n• All-black attire\n• F&B experience preferred\n• Professional attitude\n\n🎯 Only 8 slots! Apply fast!",
      '{"tone":"friendly","emoji_count":"4","length":"medium","cta_style":"direct","pay_emphasis":"prominent"}',
      0.062, 1, 0.94
    ],
    [
      '{"title":"Roadshow Promoter","location":"Tampines Mall","pay_rate":11,"category":"promo"}',
      "📢 *ROADSHOW PROMOTER*\n\nTelco promotion at Tampines!\n\n$11/hr + attractive commissions! 💸\n\n📅 This weekend (Sat & Sun)\n⏰ 11am - 9pm\n📍 Tampines Mall Atrium\n\nOutgoing personality needed!\nTraining provided on Day 1.\n\nInterested? Apply now! 📱",
      '{"tone":"casual","emoji_count":"3","length":"medium","cta_style":"question"}',
      0.041, 1, 0.82
    ],
    [
      '{"title":"Admin Assistant","location":"CBD","pay_rate":14,"category":"admin"}',
      "💼 *ADMIN ASSISTANT*\n\nCBD office needs help!\n\n💰 $14/hr\n📅 Mon-Fri, 2 weeks\n⏰ 9am - 6pm\n📍 Raffles Place MRT\n\n*Tasks:*\n• Data entry\n• Filing & organizing\n• Basic admin duties\n\nAC office, friendly team! ❄️\n\nApply through WorkLink 👍",
      '{"tone":"friendly","emoji_count":"3","length":"medium","cta_style":"direct"}',
      0.044, 1, 0.84
    ],
    [
      '{"title":"Kitchen Helper","location":"East Coast","pay_rate":12,"category":"fnb"}',
      "🍳 *KITCHEN HELPER NEEDED*\n\nBusy restaurant at East Coast!\n\n💵 $12/hr\n📅 Daily shifts available\n⏰ Various timings\n📍 East Coast Road\n\n*Duties:*\n• Food prep\n• Dishwashing\n• Kitchen cleaning\n\nNo experience OK! Willing to learn? Apply! 💪",
      '{"tone":"casual","emoji_count":"3","length":"medium","cta_style":"question"}',
      0.039, 1, 0.80
    ],
  ];

  adTrainingData.forEach(ad => {
    db.prepare(`
      INSERT OR IGNORE INTO ad_training_data
      (job_details, ad_content, variables, response_rate, is_winner, quality_score)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(...ad);
  });

  // ============================================
  // TELEGRAM GROUPS - Sample groups for posting
  // ============================================
  const sampleGroups = [
    ['-1001234567890', 'SG Part-Time Jobs', 'job_posting', 1],
    ['-1001234567891', 'F&B Workers SG', 'job_posting', 1],
    ['-1001234567892', 'Warehouse Jobs Singapore', 'job_posting', 1],
  ];

  sampleGroups.forEach(g => {
    db.prepare(`
      INSERT OR IGNORE INTO telegram_groups (chat_id, name, type, active)
      VALUES (?, ?, ?, ?)
    `).run(...g);
  });

  // ============================================
  // AD ML - Sample Ad Variants (For testing)
  // ============================================
  const sampleVariants = [
    ['JOB_SAMPLE_1', 'A', "🔥 *WAITERS NEEDED!*\n\n📍 Clarke Quay\n💰 $13/hr\n📅 This Friday\n\nApply now! 🚀", '{"tone":"friendly","emoji_count":"4"}'],
    ['JOB_SAMPLE_1', 'B', "*Waiter Position Available*\n\nLocation: Clarke Quay\nRate: $13 per hour\nDate: This Friday\n\nInterested candidates please apply.", '{"tone":"formal","emoji_count":"0"}'],
    ['JOB_SAMPLE_2', 'A', "📦 Warehouse packers @ Tuas!\n\n$12/hr, transport provided 🚌\nNo exp needed!\n\nApply in app 👆", '{"tone":"casual","emoji_count":"3","length":"short"}'],
    ['JOB_SAMPLE_2', 'B', "📦 *WAREHOUSE PACKING JOB*\n\nGreat opportunity at Tuas warehouse!\n\n💰 $12 per hour\n🚌 Free transport from Jurong East\n📅 Immediate start available\n\nNo experience required - full training provided. Join our friendly team today!\n\nApply through WorkLink app now! 🎯", '{"tone":"friendly","emoji_count":"4","length":"long"}'],
  ];

  // Only seed ad variants if sample jobs exist (dev only)
  try {
    sampleVariants.forEach(v => {
      db.prepare(`
        INSERT OR IGNORE INTO ad_variants (job_id, variant_key, content, variables)
        VALUES (?, ?, ?, ?)
      `).run(...v);
    });

    // Add some performance data for the variants
    db.prepare(`
      INSERT OR IGNORE INTO ad_performance (variant_id, job_id, group_id, posted_at, post_hour, post_day, responses)
      SELECT id, job_id, 1, datetime('now', '-3 days'), 19, 2,
        CASE variant_key WHEN 'A' THEN 12 ELSE 4 END
      FROM ad_variants
    `).run();
  } catch (e) {
    // Skip if sample jobs don't exist (production)
  }

  console.log('✅ Essential data seeded (including AI/ML training data)');
}

// Seed COMPREHENSIVE sample data - ONLY in development
function seedSampleData() {
  if (IS_PRODUCTION) {
    console.log('⚠️ Production environment - skipping sample data');
    return;
  }

  const candidateCount = db.prepare('SELECT COUNT(*) as c FROM candidates').get().c;
  if (candidateCount > 0) {
    console.log('⚠️ Database already has data, skipping sample seed');
    return;
  }

  console.log('🌱 Seeding COMPREHENSIVE sample data for development...');

  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r.toISOString().split('T')[0]; };
  const today = new Date();

  // Client logos using company initials
  const clientLogos = {
    'Marina Bay Sands': 'https://api.dicebear.com/7.x/initials/svg?seed=MBS&backgroundColor=0d6efd',
    'Changi Airport Group': 'https://api.dicebear.com/7.x/initials/svg?seed=CAG&backgroundColor=198754',
    'Resorts World Sentosa': 'https://api.dicebear.com/7.x/initials/svg?seed=RWS&backgroundColor=dc3545',
    'Grand Hyatt Singapore': 'https://api.dicebear.com/7.x/initials/svg?seed=GH&backgroundColor=6f42c1',
    'Singapore Expo': 'https://api.dicebear.com/7.x/initials/svg?seed=SE&backgroundColor=fd7e14',
    'Mandarin Oriental': 'https://api.dicebear.com/7.x/initials/svg?seed=MO&backgroundColor=20c997',
    'CapitaLand Mall': 'https://api.dicebear.com/7.x/initials/svg?seed=CL&backgroundColor=0dcaf0',
    'Gardens by the Bay': 'https://api.dicebear.com/7.x/initials/svg?seed=GBTB&backgroundColor=198754',
  };

  // 8 Clients
  const clients = [
    ['CLT001', 'Marina Bay Sands', '200604327R', 'Hospitality', 'Jennifer Lim', 'events@mbs.com', '+65 6688 8888', clientLogos['Marina Bay Sands'], 30, 'active', '2024-07-15'],
    ['CLT002', 'Changi Airport Group', '200902638D', 'Aviation', 'David Tan', 'hr@changi.com', '+65 6595 6868', clientLogos['Changi Airport Group'], 30, 'active', '2024-08-01'],
    ['CLT003', 'Resorts World Sentosa', '200601402R', 'Entertainment', 'Michelle Wong', 'events@rws.com', '+65 6577 8888', clientLogos['Resorts World Sentosa'], 30, 'active', '2024-08-20'],
    ['CLT004', 'Grand Hyatt Singapore', '197100403R', 'Hospitality', 'Andrew Lee', 'hr@grandhyatt.sg', '+65 6738 1234', clientLogos['Grand Hyatt Singapore'], 30, 'active', '2024-09-10'],
    ['CLT005', 'Singapore Expo', '199703626Z', 'Events', 'Sarah Chen', 'ops@expo.com', '+65 6403 2160', clientLogos['Singapore Expo'], 30, 'active', '2024-10-01'],
    ['CLT006', 'Mandarin Oriental', '198702333H', 'Hospitality', 'Patricia Goh', 'events@mo.com', '+65 6338 0066', clientLogos['Mandarin Oriental'], 30, 'active', '2024-11-15'],
    ['CLT007', 'CapitaLand Mall', '200208877K', 'Retail', 'Kenny Ong', 'retail@cland.com', '+65 6713 2888', clientLogos['CapitaLand Mall'], 30, 'active', '2024-12-01'],
    ['CLT008', 'Gardens by the Bay', '201110689R', 'Tourism', 'Linda Tay', 'events@gbtb.com', '+65 6420 6848', clientLogos['Gardens by the Bay'], 30, 'active', '2025-01-10'],
  ];
  clients.forEach(c => {
    db.prepare('INSERT INTO clients (id, company_name, uen, industry, contact_name, contact_email, contact_phone, logo_url, payment_terms, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(...c);
  });

  // 20 Candidates with profile photos
  const candidateData = [
    {name:'Sarah Tan',email:'sarah.tan@email.com',phone:'+65 9123 4567',dob:'2005-03-15',joined:'2024-07-20'},
    {name:'Muhammad Rizal',email:'rizal.m@email.com',phone:'+65 9234 5678',dob:'2003-07-22',joined:'2024-07-25'},
    {name:'Amanda Chen',email:'amanda.c@email.com',phone:'+65 9567 8901',dob:'2004-05-12',joined:'2024-08-05'},
    {name:'Ryan Ng',email:'ryan.ng@email.com',phone:'+65 9678 9012',dob:'2005-09-25',joined:'2024-08-15'},
    {name:'Nurul Aisyah',email:'nurul.a@email.com',phone:'+65 9789 0123',dob:'2003-12-03',joined:'2024-08-28'},
    {name:'Kevin Teo',email:'kevin.t@email.com',phone:'+65 9890 1234',dob:'2004-04-18',joined:'2024-09-10'},
    {name:'Jasmine Lim',email:'jasmine.l@email.com',phone:'+65 9901 2345',dob:'2005-08-07',joined:'2024-09-20'},
    {name:'Ahmad Faris',email:'ahmad.f@email.com',phone:'+65 9012 3456',dob:'2004-02-14',joined:'2024-10-01'},
    {name:'Priya Sharma',email:'priya.s@email.com',phone:'+65 9345 6789',dob:'2004-11-08',joined:'2024-10-15'},
    {name:'Daniel Wong',email:'daniel.w@email.com',phone:'+65 9111 2222',dob:'2003-06-20',joined:'2024-10-28'},
    {name:'Siti Aminah',email:'siti.a@email.com',phone:'+65 9222 3333',dob:'2005-01-30',joined:'2024-11-05'},
    {name:'Marcus Lee',email:'marcus.l@email.com',phone:'+65 9333 4444',dob:'2004-08-12',joined:'2024-11-18'},
    {name:'Rachel Koh',email:'rachel.k@email.com',phone:'+65 9444 5555',dob:'2003-04-25',joined:'2024-12-01'},
    {name:'Hafiz Rahman',email:'hafiz.r@email.com',phone:'+65 9555 6666',dob:'2005-10-08',joined:'2024-12-10'},
    {name:'Emily Tan',email:'emily.t@email.com',phone:'+65 9666 7777',dob:'2004-12-15',joined:'2024-12-20'},
    {name:'Wei Jie',email:'weijie@email.com',phone:'+65 9777 8888',dob:'2003-09-03',joined:'2025-01-05'},
    {name:'Aisha Binte',email:'aisha.b@email.com',phone:'+65 9888 9999',dob:'2005-07-18',joined:'2025-01-12'},
    {name:'Jonathan Sim',email:'jonathan.s@email.com',phone:'+65 9999 0000',dob:'2004-03-22',joined:'2025-01-20'},
    {name:'Mei Ling',email:'meiling@email.com',phone:'+65 9000 1111',dob:'2003-11-28',joined:'2025-01-25'},
    {name:'Arjun Patel',email:'arjun.p@email.com',phone:'+65 8111 2222',dob:'2005-05-05',joined:'2025-01-28'},
  ];

  const sources = ['direct', 'referral', 'social', 'walk-in', 'gebiz'];
  const generateReferralCode = (name) => name.split(' ')[0].toUpperCase().slice(0, 4) + Math.random().toString(36).substring(2, 6).toUpperCase();
  
  const candidates = [];
  candidateData.forEach((c, i) => {
    const id = `CND${String(i + 1).padStart(3, '0')}`;
    const monthsActive = Math.max(0, Math.floor((today - new Date(c.joined)) / (1000 * 60 * 60 * 24 * 30)));
    const jobsCompleted = Math.max(0, Math.floor(monthsActive * 7 + Math.random() * 8 - 4));
    const xp = jobsCompleted * 120 + Math.floor(Math.random() * 400);
    const level = Math.min(10, Math.floor(xp / 1200) + 1);
    const earnings = jobsCompleted * 85 + Math.random() * 200;
    const incentives = Math.floor(jobsCompleted / 5) * 20;
    const certs = [];
    if (jobsCompleted >= 1) certs.push('Server Basics');
    if (jobsCompleted >= 10) certs.push('Food Safety');
    if (jobsCompleted >= 20) certs.push('Customer Service');
    const status = i < 15 ? 'active' : (i < 18 ? 'onboarding' : 'screening');
    const rating = jobsCompleted > 0 ? (4.2 + Math.random() * 0.8).toFixed(1) : 0;
    const referralCode = generateReferralCode(c.name);
    const profilePhoto = generateAvatar(c.name, 'avataaars');

    db.prepare(`
      INSERT INTO candidates (id, name, email, phone, date_of_birth, status, source, xp, level, 
        streak_days, total_jobs_completed, certifications, referral_code, total_incentives_earned, 
        total_earnings, rating, profile_photo, whatsapp_opted_in, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(id, c.name, c.email, c.phone, c.dob, status, sources[i % 5], xp, level, 
           Math.floor(Math.random() * 12), jobsCompleted, JSON.stringify(certs), referralCode, 
           incentives, earnings, rating, profilePhoto, c.joined);
    
    candidates.push({ id, joined: c.joined, status });

    // Add availability for next 14 days
    for (let d = 0; d < 14; d++) {
      if (Math.random() > 0.3) {
        const date = addDays(today, d);
        db.prepare('INSERT OR IGNORE INTO candidate_availability (candidate_id, date, status) VALUES (?, ?, ?)').run(id, date, 'available');
      }
    }
  });

  // Job templates
  const jobTemplates = [
    {title:'Banquet Server',charge:22,pay:15,hours:5},
    {title:'Event Usher',charge:18,pay:12,hours:6},
    {title:'Customer Service Rep',charge:16,pay:11,hours:8},
    {title:'Bartender',charge:25,pay:18,hours:5},
    {title:'F&B Service Crew',charge:20,pay:14,hours:6},
    {title:'Registration Crew',charge:15,pay:10,hours:8},
    {title:'Room Service',charge:19,pay:13,hours:7},
    {title:'Retail Assistant',charge:14,pay:10,hours:8},
  ];

  const insertJob = db.prepare(`INSERT INTO jobs (id, client_id, title, description, job_date, start_time, end_time, break_minutes, location, charge_rate, pay_rate, total_slots, filled_slots, xp_bonus, status, featured, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insertDep = db.prepare(`INSERT INTO deployments (id, job_id, candidate_id, status, hours_worked, charge_rate, pay_rate, gross_revenue, candidate_pay, gross_profit, incentive_amount, rating, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insertPay = db.prepare(`INSERT INTO payments (id, candidate_id, deployment_id, base_amount, incentive_amount, total_amount, hours_worked, status, paid_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`);

  let jobN = 1, depN = 1, payN = 1;

  // Monthly job counts showing business growth
  const monthlyJobs = {
    '2024-07': 3, '2024-08': 8, '2024-09': 15, '2024-10': 22,
    '2024-11': 30, '2024-12': 45, '2025-01': 38
  };

  Object.entries(monthlyJobs).forEach(([month, count]) => {
    for (let i = 0; i < count; i++) {
      const t = jobTemplates[Math.floor(Math.random() * jobTemplates.length)];
      const day = Math.floor(Math.random() * 28) + 1;
      const jobDate = `${month}-${String(day).padStart(2, '0')}`;
      const jobId = `JOB${String(jobN++).padStart(4, '0')}`;

      const availClients = clients.filter(c => c[10] <= jobDate);
      if (availClients.length === 0) continue;
      const client = availClients[Math.floor(Math.random() * availClients.length)];

      const slots = Math.floor(Math.random() * 5) + 2;
      const isPast = new Date(jobDate) < today;
      const chargeRate = t.charge + Math.floor(Math.random() * 4) - 2;
      const payRate = t.pay + Math.floor(Math.random() * 2) - 1;

      insertJob.run(jobId, client[0], t.title, `${t.title} at ${client[1]}`, jobDate, '18:00', '23:00', 30, client[1], chargeRate, payRate, slots, isPast ? slots : Math.floor(slots * 0.5), Math.random() > 0.7 ? 50 : 0, isPast ? 'completed' : 'open', Math.random() > 0.8 ? 1 : 0, addDays(jobDate, -3));

      if (isPast) {
        const availCands = candidates.filter(c => c.joined <= jobDate && c.status === 'active');
        const deployCands = availCands.sort(() => Math.random() - 0.5).slice(0, slots);

        deployCands.forEach(cand => {
          const hours = t.hours + (Math.random() - 0.5);
          const revenue = hours * chargeRate;
          const candPay = hours * payRate;
          const profit = revenue - candPay;
          const inc = Math.random() > 0.75 ? 5 : 0;
          const rating = Math.floor(Math.random() * 2) + 4;
          const depId = `DEP${String(depN++).padStart(5, '0')}`;

          insertDep.run(depId, jobId, cand.id, 'completed', hours.toFixed(2), chargeRate, payRate, revenue.toFixed(2), candPay.toFixed(2), profit.toFixed(2), inc, rating, jobDate);
          insertPay.run(`PAY${String(payN++).padStart(5, '0')}`, cand.id, depId, candPay.toFixed(2), inc, (candPay + inc).toFixed(2), hours.toFixed(2), 'paid', addDays(jobDate, 7), jobDate);
        });
      }
    }
  });

  // Upcoming jobs
  for (let i = 1; i <= 15; i++) {
    const t = jobTemplates[Math.floor(Math.random() * jobTemplates.length)];
    const client = clients[Math.floor(Math.random() * clients.length)];
    const jobDate = addDays(today, i + Math.floor(Math.random() * 5));
    insertJob.run(`JOB${String(jobN++).padStart(4, '0')}`, client[0], t.title, `${t.title} at ${client[1]}`, jobDate, '18:00', '23:00', 30, client[1], t.charge, t.pay, 5, 2, 50, 'open', Math.random() > 0.6 ? 1 : 0, addDays(jobDate, -3));
  }

  // Tenders
  const tenders = [
    ['TND001', 'gebiz', 'GBZ-2025-001234', 'Admin Support Staff', 'MOE', 'Manpower', 450000, addDays(today, 15), 'reviewing', 15, 12, 'Buona Vista', 22, 15, 37500, null, 65, 'STRONG BID'],
    ['TND002', 'gebiz', 'GBZ-2025-001198', 'Event Support National Day', 'MCCY', 'Events', 280000, addDays(today, 10), 'bidding', 50, 3, 'Marina Bay', 20, 13, 93333, null, 55, 'HIGH PRIORITY'],
    ['TND003', 'gebiz', 'GBZ-2025-001245', 'SingPass Customer Service', 'GovTech', 'Service', 620000, addDays(today, 20), 'new', 20, 24, 'Multiple', 18, 12, 25833, null, 40, 'EVALUATE'],
  ];
  tenders.forEach(t => {
    db.prepare(`INSERT INTO tenders (id, source, external_id, title, agency, category, estimated_value, closing_date, status, manpower_required, duration_months, location, estimated_charge_rate, estimated_pay_rate, estimated_monthly_revenue, our_bid_amount, win_probability, recommended_action) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(...t);
  });

  // Financial projections
  const projections = [
    ['2024-07', 2024, 2000, 1400, 600, 1850, 1295, 555],
    ['2024-08', 2024, 5000, 3500, 1500, 5200, 3640, 1560],
    ['2024-09', 2024, 9000, 6300, 2700, 9800, 6860, 2940],
    ['2024-10', 2024, 14000, 9800, 4200, 15200, 10640, 4560],
    ['2024-11', 2024, 20000, 14000, 6000, 22500, 15750, 6750],
    ['2024-12', 2024, 30000, 21000, 9000, 35200, 24640, 10560],
    ['2025-01', 2025, 28000, 19600, 8400, 26500, 18550, 7950],
  ];
  projections.forEach(p => {
    db.prepare('INSERT INTO financial_projections (month, year, projected_revenue, projected_costs, projected_profit, actual_revenue, actual_costs, actual_profit) VALUES (?,?,?,?,?,?,?,?)').run(...p);
  });

  // Referrals
  db.prepare('INSERT INTO referrals (id, referrer_id, referred_id, status, tier, bonus_amount, jobs_completed_by_referred, total_bonus_paid, created_at) VALUES (?,?,?,?,?,?,?,?,?)').run('REF001', 'CND001', 'CND003', 'bonus_paid', 1, 30, 5, 30, '2024-08-10');
  db.prepare('INSERT INTO referrals (id, referrer_id, referred_id, status, tier, bonus_amount, jobs_completed_by_referred, total_bonus_paid, created_at) VALUES (?,?,?,?,?,?,?,?,?)').run('REF002', 'CND002', 'CND005', 'bonus_paid', 2, 50, 8, 80, '2024-09-01');

  // Candidate achievements
  candidates.filter(c => c.status === 'active').slice(0, 12).forEach((c, i) => {
    db.prepare(`INSERT OR IGNORE INTO candidate_achievements VALUES (?, 'ACH001', datetime('now'))`).run(c.id);
    if (i < 8) db.prepare(`INSERT OR IGNORE INTO candidate_achievements VALUES (?, 'ACH002', datetime('now'))`).run(c.id);
    if (i < 4) db.prepare(`INSERT OR IGNORE INTO candidate_achievements VALUES (?, 'ACH003', datetime('now'))`).run(c.id);
  });

  console.log(`✅ Comprehensive data seeded: ${candidates.length} candidates, ${clients.length} clients, ${jobN - 1} jobs`);
}

// Reset database (dev only)
function resetToSampleData() {
  if (IS_PRODUCTION) {
    console.log('❌ Cannot reset in production');
    return;
  }

  console.log('🔄 Resetting database...');
  const tables = [
    'push_queue', 'job_match_scores', 'notifications', 'messages', 'tender_matches',
    'xp_transactions', 'candidate_quests', 'candidate_achievements', 'candidate_availability',
    'payments', 'deployments', 'jobs', 'referrals', 'candidates', 'clients',
    'tenders', 'financial_projections', 'tender_alerts', 'referral_tiers',
    'message_templates', 'incentive_schemes', 'training', 'quests', 'achievements',
    'admin_onboarding', 'admin_achievements'
  ];
  tables.forEach(t => { try { db.exec(`DELETE FROM ${t}`); } catch (e) { } });

  seedEssentialData();
  seedSampleData();
  console.log('✅ Database reset complete');
}

// Initialize
createSchema();
seedEssentialData();
ensureDemoAccount();  // Always ensure demo account exists
seedSampleData();

module.exports = { db, resetToSampleData, IS_PRODUCTION, generateAvatar };
