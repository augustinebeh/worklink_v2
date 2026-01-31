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
  `);
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

  console.log('✅ Essential data seeded');
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
