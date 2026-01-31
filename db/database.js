/**
 * WorkLink v2 Database
 * - Production (Railway): Empty database, persists in volume
 * - Development (Local): Seeds with sample data
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
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
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

    -- Job matching scores (for smart recommendations)
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
  `);
  console.log('✅ Schema created successfully');
}


// Seed essential data (achievements, quests, tiers) - runs in both environments
function seedEssentialData() {
  // Check if already seeded
  const achievementCount = db.prepare('SELECT COUNT(*) as c FROM achievements').get().c;
  if (achievementCount > 0) return;

  console.log('🌱 Seeding essential data (achievements, quests, referral tiers)...');

  // Referral tiers
  const tiers = [
    [1, 1, 30, 'Bronze - First job completed by referral'],
    [2, 5, 50, 'Silver - 5 jobs completed by referral'],
    [3, 15, 100, 'Gold - 15 jobs completed by referral'],
    [4, 30, 150, 'Platinum - 30 jobs completed by referral'],
  ];
  tiers.forEach(t => {
    db.prepare('INSERT OR IGNORE INTO referral_tiers (tier_level, jobs_required, bonus_amount, description) VALUES (?,?,?,?)').run(...t);
  });

  // Achievements
  const achievements = [
    ['ACH001', 'First Steps', 'Complete your first job', '🎯', 'jobs', 'jobs_completed', 1, 100, 'common'],
    ['ACH002', 'Getting Started', 'Complete 5 jobs', '⭐', 'jobs', 'jobs_completed', 5, 250, 'common'],
    ['ACH003', 'Dedicated Worker', 'Complete 25 jobs', '💪', 'jobs', 'jobs_completed', 25, 500, 'rare'],
    ['ACH004', 'Job Master', 'Complete 100 jobs', '🏆', 'milestone', 'jobs_completed', 100, 1500, 'epic'],
    ['ACH005', 'Week Warrior', '7-day streak', '🔥', 'streak', 'streak', 7, 200, 'rare'],
    ['ACH006', 'Month Champion', '30-day streak', '👑', 'streak', 'streak', 30, 1000, 'epic'],
    ['ACH007', 'First Cert', 'Complete first training', '📚', 'training', 'training', 1, 150, 'common'],
    ['ACH008', 'Recruiter', 'Refer your first friend', '🤝', 'referral', 'referrals', 1, 200, 'common'],
    ['ACH009', 'Super Recruiter', 'Refer 5 friends', '🌟', 'referral', 'referrals', 5, 500, 'rare'],
    ['ACH010', 'Perfect Score', 'Get 5-star rating 10 times', '⭐', 'rating', 'five_star', 10, 300, 'rare'],
  ];
  achievements.forEach(a => {
    db.prepare('INSERT OR IGNORE INTO achievements VALUES (?,?,?,?,?,?,?,?,?)').run(...a);
  });

  // Quests
  const quests = [
    ['QST001', 'Daily Check-in', 'Log in today', 'daily', '{"type":"login","count":1}', 10, 0, 1],
    ['QST002', 'Complete a Job', 'Finish any job this week', 'weekly', '{"type":"job","count":1}', 150, 0, 1],
    ['QST003', 'Refer a Friend', 'Invite someone to join', 'special', '{"type":"referral","count":1}', 300, 30, 1],
    ['QST004', 'Perfect Week', 'Work 5 jobs in a week', 'weekly', '{"type":"job","count":5}', 500, 25, 1],
    ['QST005', 'Early Bird', 'Apply to 3 jobs before they fill', 'weekly', '{"type":"apply","count":3}', 100, 0, 1],
    ['QST006', 'Five Star Service', 'Get a 5-star rating', 'repeatable', '{"type":"rating","value":5}', 50, 5, 1],
  ];
  quests.forEach(q => {
    db.prepare('INSERT OR IGNORE INTO quests VALUES (?,?,?,?,?,?,?,?)').run(...q);
  });

  // Training modules
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

  // Message templates with WhatsApp versions
  const templates = [
    ['TPL001', 'Welcome', 'onboarding', 'Hi {name}! Welcome to WorkLink. Start browsing jobs now!', '👋 Hi {name}! Welcome to WorkLink!\n\nStart earning today:\n🔗 {app_link}', '["name","app_link"]'],
    ['TPL002', 'Job Match', 'job', 'Great news! A job matching your profile is available: {job_title} at {location}', '🎯 *Perfect Match!*\n\n{job_title}\n📍 {location}\n💰 ${pay_rate}/hr\n\nApply now: {job_link}', '["job_title","location","pay_rate","job_link"]'],
    ['TPL003', 'Job Reminder', 'reminder', 'Reminder: You have a job tomorrow at {location}. Arrive 15 mins early!', '⏰ *Reminder*\n\nYou have a job tomorrow!\n📍 {location}\n🕐 {time}\n\nDon\'t be late! 💪', '["location","time"]'],
    ['TPL004', 'Payment', 'payment', 'Your payment of ${amount} has been processed.', '💰 *Payment Received!*\n\n${amount} is on the way to your bank.\n\nKeep up the great work! 🌟', '["amount"]'],
    ['TPL005', 'Referral Success', 'referral', 'Your friend {friend_name} just signed up! Complete their first job to earn your bonus.', '🎉 *Referral Success!*\n\n{friend_name} just joined!\n\nYou\'ll earn ${bonus} when they complete their first job.\n\nShare more: {referral_link}', '["friend_name","bonus","referral_link"]'],
    ['TPL006', 'Streak Alert', 'gamification', 'You\'re on a {streak}-day streak! Keep it going!', '🔥 *{streak}-Day Streak!*\n\nYou\'re on fire! Don\'t break the chain.\n\nFind your next job: {app_link}', '["streak","app_link"]'],
  ];
  templates.forEach(t => {
    db.prepare('INSERT OR IGNORE INTO message_templates (id, name, category, content, whatsapp_content, variables) VALUES (?,?,?,?,?,?)').run(...t);
  });

  // Default tender alert keywords
  const alerts = [
    ['Supply of Manpower Services', 'gebiz', 1, 1],
    ['Provision of Temporary Staff', 'gebiz', 1, 1],
    ['Event Support', 'gebiz', 1, 1],
    ['Admin Support', 'gebiz', 1, 1],
  ];
  alerts.forEach(a => {
    db.prepare('INSERT OR IGNORE INTO tender_alerts (keyword, source, email_notify, active) VALUES (?,?,?,?)').run(...a);
  });

  console.log('✅ Essential data seeded');
}


// Seed sample data - ONLY in development
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

  console.log('🌱 Seeding sample data for development...');

  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r.toISOString().split('T')[0]; };
  const today = new Date();

  // Sample clients
  const clients = [
    ['CLT001', 'Marina Bay Sands', '200604327R', 'Hospitality', 'Jennifer Lim', 'events@mbs.com', '+65 6688 8888', 30, 'active'],
    ['CLT002', 'Changi Airport Group', '200902638D', 'Aviation', 'David Tan', 'hr@changi.com', '+65 6595 6868', 30, 'active'],
    ['CLT003', 'Resorts World Sentosa', '200601402R', 'Entertainment', 'Michelle Wong', 'events@rws.com', '+65 6577 8888', 30, 'active'],
    ['CLT004', 'Grand Hyatt Singapore', '197100403R', 'Hospitality', 'Andrew Lee', 'hr@grandhyatt.sg', '+65 6738 1234', 30, 'active'],
    ['CLT005', 'Singapore Expo', '199703626Z', 'Events', 'Sarah Chen', 'ops@expo.com', '+65 6403 2160', 30, 'active'],
  ];
  clients.forEach(c => {
    db.prepare('INSERT INTO clients (id, company_name, uen, industry, contact_name, contact_email, contact_phone, payment_terms, status) VALUES (?,?,?,?,?,?,?,?,?)').run(...c);
  });

  // Sample candidates with referral codes
  const candidateData = [
    { name: 'Sarah Tan', email: 'sarah.tan@email.com', phone: '+65 9123 4567', dob: '2005-03-15' },
    { name: 'Muhammad Rizal', email: 'rizal.m@email.com', phone: '+65 9234 5678', dob: '2003-07-22' },
    { name: 'Amanda Chen', email: 'amanda.c@email.com', phone: '+65 9567 8901', dob: '2004-05-12' },
    { name: 'Ryan Ng', email: 'ryan.ng@email.com', phone: '+65 9678 9012', dob: '2005-09-25' },
    { name: 'Nurul Aisyah', email: 'nurul.a@email.com', phone: '+65 9789 0123', dob: '2003-12-03' },
  ];

  const generateReferralCode = (name) => {
    const prefix = name.split(' ')[0].toUpperCase().slice(0, 4);
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${suffix}`;
  };

  candidateData.forEach((c, i) => {
    const id = `CND${String(i + 1).padStart(3, '0')}`;
    const referralCode = generateReferralCode(c.name);
    const xp = Math.floor(Math.random() * 2000);
    const level = Math.min(10, Math.floor(xp / 500) + 1);
    const jobsCompleted = Math.floor(Math.random() * 30);

    db.prepare(`
      INSERT INTO candidates (id, name, email, phone, date_of_birth, status, source, xp, level, 
        streak_days, total_jobs_completed, referral_code, rating, whatsapp_opted_in)
      VALUES (?, ?, ?, ?, ?, 'active', 'direct', ?, ?, ?, ?, ?, ?, 1)
    `).run(id, c.name, c.email, c.phone, c.dob, xp, level, Math.floor(Math.random() * 7), jobsCompleted, referralCode, (4 + Math.random()).toFixed(1));

    // Add some availability
    for (let d = 0; d < 14; d++) {
      if (Math.random() > 0.3) {
        const date = addDays(today, d);
        db.prepare('INSERT OR IGNORE INTO candidate_availability (candidate_id, date, status) VALUES (?, ?, ?)').run(id, date, 'available');
      }
    }
  });

  // Sample jobs
  const jobTemplates = [
    { title: 'Banquet Server', charge: 22, pay: 15 },
    { title: 'Event Usher', charge: 18, pay: 12 },
    { title: 'F&B Service Crew', charge: 20, pay: 14 },
    { title: 'Registration Crew', charge: 15, pay: 10 },
  ];

  for (let i = 0; i < 15; i++) {
    const t = jobTemplates[i % jobTemplates.length];
    const client = clients[i % clients.length];
    const jobDate = addDays(today, Math.floor(Math.random() * 14) - 3);
    const isPast = new Date(jobDate) < today;
    const jobId = `JOB${String(i + 1).padStart(4, '0')}`;

    db.prepare(`
      INSERT INTO jobs (id, client_id, title, description, job_date, start_time, end_time, 
        location, charge_rate, pay_rate, total_slots, filled_slots, status, featured)
      VALUES (?, ?, ?, ?, ?, '18:00', '23:00', ?, ?, ?, 5, ?, ?, ?)
    `).run(jobId, client[0], t.title, `${t.title} at ${client[1]}`, jobDate, client[1], t.charge, t.pay, isPast ? 5 : 2, isPast ? 'completed' : 'open', Math.random() > 0.7 ? 1 : 0);
  }

  // Sample referral
  db.prepare(`
    INSERT INTO referrals (id, referrer_id, referred_id, status, tier, bonus_amount, jobs_completed_by_referred, total_bonus_paid)
    VALUES ('REF001', 'CND001', 'CND003', 'bonus_paid', 1, 30, 1, 30)
  `).run();

  console.log('✅ Sample data seeded for development');
}

// Reset database (for development only)
function resetToSampleData() {
  if (IS_PRODUCTION) {
    console.log('❌ Cannot reset database in production');
    return;
  }

  console.log('🔄 Resetting database...');
  const tables = [
    'push_queue', 'job_match_scores', 'notifications', 'messages', 'tender_matches',
    'xp_transactions', 'candidate_quests', 'candidate_achievements', 'candidate_availability',
    'payments', 'deployments', 'jobs', 'referrals', 'candidates', 'clients',
    'tenders', 'financial_projections'
  ];
  tables.forEach(t => { try { db.exec(`DELETE FROM ${t}`); } catch (e) { } });

  seedEssentialData();
  seedSampleData();
  console.log('✅ Database reset complete');
}

// Initialize
createSchema();
seedEssentialData();
seedSampleData();

module.exports = { db, resetToSampleData, IS_PRODUCTION };
