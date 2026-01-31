/**
 * Database migrations - Run on startup
 * Adds new columns/tables without breaking existing data
 */

const { db } = require('./database');

function runMigrations() {
  console.log('🔄 Running migrations...');

  // Helper to safely add columns
  const addColumn = (table, column, type, defaultVal = null) => {
    try {
      const def = defaultVal !== null ? ` DEFAULT ${defaultVal}` : '';
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}${def}`);
      console.log(`  ✅ Added ${column} to ${table}`);
    } catch (e) {
      // Column likely already exists
    }
  };

  // Candidate table migrations
  addColumn('candidates', 'streak_last_date', 'DATE');
  addColumn('candidates', 'preferred_locations', "TEXT", "'[]'");
  addColumn('candidates', 'referral_tier', 'INTEGER', '1');
  addColumn('candidates', 'total_referral_earnings', 'REAL', '0');
  addColumn('candidates', 'whatsapp_opted_in', 'INTEGER', '0');
  addColumn('candidates', 'telegram_chat_id', 'TEXT');
  addColumn('candidates', 'preferred_contact', 'TEXT', "'app'");

  // Jobs table migrations
  addColumn('jobs', 'location_lat', 'REAL');
  addColumn('jobs', 'location_lng', 'REAL');
  addColumn('jobs', 'required_skills', "TEXT", "'[]'");
  addColumn('jobs', 'urgent', 'INTEGER', '0');

  // Notifications table migrations
  addColumn('notifications', 'data', 'TEXT');
  addColumn('notifications', 'push_sent', 'INTEGER', '0');

  // Tenders table migrations
  addColumn('tenders', 'notes', 'TEXT');
  addColumn('tenders', 'updated_at', 'DATETIME');

  // Referrals table migrations
  addColumn('referrals', 'tier', 'INTEGER', '1');
  addColumn('referrals', 'jobs_completed_by_referred', 'INTEGER', '0');
  addColumn('referrals', 'total_bonus_paid', 'REAL', '0');

  // Quests table migrations
  addColumn('quests', 'bonus_reward', 'REAL', '0');

  // Message templates migrations
  addColumn('message_templates', 'whatsapp_content', 'TEXT');

  // Create new tables if they don't exist
  const createTables = `
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

    CREATE TABLE IF NOT EXISTS referral_tiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tier_level INTEGER UNIQUE,
      jobs_required INTEGER,
      bonus_amount REAL,
      description TEXT
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

    CREATE TABLE IF NOT EXISTS xp_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT,
      reference_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
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
  `;

  try {
    db.exec(createTables);
    console.log('  ✅ Created new tables');
  } catch (e) {
    // Tables likely already exist
  }

  // Create indices
  const indices = [
    'CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status)',
    'CREATE INDEX IF NOT EXISTS idx_candidates_referral_code ON candidates(referral_code)',
    'CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)',
    'CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(job_date)',
    'CREATE INDEX IF NOT EXISTS idx_deployments_candidate ON deployments(candidate_id)',
    'CREATE INDEX IF NOT EXISTS idx_deployments_job ON deployments(job_id)',
    'CREATE INDEX IF NOT EXISTS idx_availability_candidate_date ON candidate_availability(candidate_id, date)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_candidate ON notifications(candidate_id, read)',
    'CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id)',
    'CREATE INDEX IF NOT EXISTS idx_tender_alerts_active ON tender_alerts(active)',
    'CREATE INDEX IF NOT EXISTS idx_job_match_scores ON job_match_scores(candidate_id, score)',
  ];

  for (const idx of indices) {
    try { db.exec(idx); } catch (e) { }
  }
  console.log('  ✅ Created indices');

  // Seed referral tiers if empty
  const tierCount = db.prepare('SELECT COUNT(*) as c FROM referral_tiers').get().c;
  if (tierCount === 0) {
    const tiers = [
      [1, 1, 30, 'Bronze - First job completed by referral'],
      [2, 5, 50, 'Silver - 5 jobs completed by referral'],
      [3, 15, 100, 'Gold - 15 jobs completed by referral'],
      [4, 30, 150, 'Platinum - 30 jobs completed by referral'],
    ];
    tiers.forEach(t => {
      db.prepare('INSERT INTO referral_tiers (tier_level, jobs_required, bonus_amount, description) VALUES (?,?,?,?)').run(...t);
    });
    console.log('  ✅ Seeded referral tiers');
  }

  // Seed default tender alerts if empty
  const alertCount = db.prepare('SELECT COUNT(*) as c FROM tender_alerts').get().c;
  if (alertCount === 0) {
    const alerts = [
      ['Supply of Manpower Services', 'gebiz'],
      ['Provision of Temporary Staff', 'gebiz'],
      ['Event Support', 'gebiz'],
      ['Admin Support', 'gebiz'],
    ];
    alerts.forEach(a => {
      db.prepare('INSERT INTO tender_alerts (keyword, source, email_notify, active) VALUES (?, ?, 1, 1)').run(...a);
    });
    console.log('  ✅ Seeded default tender alerts');
  }

  // Generate referral codes for candidates without one
  const candidatesWithoutCode = db.prepare(`
    SELECT id, name FROM candidates WHERE referral_code IS NULL OR referral_code = ''
  `).all();

  if (candidatesWithoutCode.length > 0) {
    const updateStmt = db.prepare('UPDATE candidates SET referral_code = ? WHERE id = ?');
    for (const c of candidatesWithoutCode) {
      const code = c.name.split(' ')[0].toUpperCase().slice(0, 4) + 
        Math.random().toString(36).substring(2, 6).toUpperCase();
      updateStmt.run(code, c.id);
    }
    console.log(`  ✅ Generated referral codes for ${candidatesWithoutCode.length} candidates`);
  }

  console.log('✅ Migrations complete');
}

runMigrations();

module.exports = { runMigrations };
