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

  // Candidate quests table migrations (for claim tracking)
  addColumn('candidate_quests', 'claimed', 'INTEGER', '0');
  addColumn('candidate_quests', 'claimed_at', 'DATETIME');

  // Message templates migrations
  addColumn('message_templates', 'whatsapp_content', 'TEXT');

  // Messages table migrations (for multi-channel support)
  addColumn('messages', 'channel', 'TEXT', "'app'");
  addColumn('messages', 'external_id', 'TEXT');
  addColumn('messages', 'external_status', 'TEXT');
  addColumn('messages', 'ai_generated', 'INTEGER', '0');
  addColumn('messages', 'ai_source', 'TEXT');

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

    CREATE TABLE IF NOT EXISTS telegram_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      code TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS telegram_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL UNIQUE,
      name TEXT,
      description TEXT,
      member_count INTEGER,
      is_active INTEGER DEFAULT 1,
      auto_post_jobs INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

  // Seed quests if empty
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
      try {
        db.prepare('INSERT OR IGNORE INTO quests (id, title, description, type, requirement, xp_reward, bonus_reward, active) VALUES (?,?,?,?,?,?,?,?)').run(...q);
      } catch (e) { }
    });
    console.log('  ✅ Seeded quests');
  }

  // Performance indexes
  const createIndex = (name, table, columns) => {
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS ${name} ON ${table}(${columns})`);
    } catch (e) {
      // Index may already exist or table doesn't exist yet
    }
  };

  // Candidate indexes for filtering
  createIndex('idx_candidates_status', 'candidates', 'status');
  createIndex('idx_candidates_email', 'candidates', 'email');
  createIndex('idx_candidates_online_status', 'candidates', 'online_status');
  createIndex('idx_candidates_level', 'candidates', 'level');

  // Jobs indexes for filtering and sorting
  createIndex('idx_jobs_status', 'jobs', 'status');
  createIndex('idx_jobs_client_status', 'jobs', 'client_id, status');
  createIndex('idx_jobs_date', 'jobs', 'job_date');

  // Chats indexes for message queries
  createIndex('idx_chats_candidate', 'chats', 'candidate_id');
  createIndex('idx_chats_candidate_read', 'chats', 'candidate_id, sender, read');
  createIndex('idx_chats_created', 'chats', 'created_at');

  // Deployments indexes
  createIndex('idx_deployments_candidate', 'deployments', 'candidate_id');
  createIndex('idx_deployments_job', 'deployments', 'job_id');
  createIndex('idx_deployments_status', 'deployments', 'status');
  createIndex('idx_deployments_candidate_status', 'deployments', 'candidate_id, status');

  // Payments indexes
  createIndex('idx_payments_candidate', 'payments', 'candidate_id');
  createIndex('idx_payments_status', 'payments', 'status');
  createIndex('idx_payments_created', 'payments', 'created_at');

  // Notifications indexes
  createIndex('idx_notifications_candidate', 'notifications', 'candidate_id');
  createIndex('idx_notifications_read', 'notifications', 'candidate_id, read');

  console.log('  ✅ Performance indexes created');

  // =====================================================
  // CLEANUP DUPLICATES IN FAQ AND KNOWLEDGE BASE
  // =====================================================
  console.log('  🧹 Cleaning up FAQ and Knowledge Base duplicates...');

  // Remove duplicate FAQs - keep the one with highest priority or lowest ID
  try {
    const faqDupes = db.prepare(`
      SELECT question, COUNT(*) as cnt, MIN(id) as keep_id
      FROM ai_faq
      GROUP BY question
      HAVING cnt > 1
    `).all();

    if (faqDupes.length > 0) {
      const deleteFaq = db.prepare('DELETE FROM ai_faq WHERE question = ? AND id != ?');
      faqDupes.forEach(d => {
        deleteFaq.run(d.question, d.keep_id);
      });
      console.log(`    ✅ Removed ${faqDupes.length} duplicate FAQ entries`);
    }
  } catch (e) {
    console.log('    ⚠️ FAQ cleanup skipped:', e.message);
  }

  // Remove duplicate KB entries - keep the one with highest confidence or lowest ID
  try {
    const kbDupes = db.prepare(`
      SELECT question, COUNT(*) as cnt,
             (SELECT id FROM ml_knowledge_base kb2
              WHERE kb2.question = ml_knowledge_base.question
              ORDER BY confidence DESC, id ASC LIMIT 1) as keep_id
      FROM ml_knowledge_base
      GROUP BY question
      HAVING cnt > 1
    `).all();

    if (kbDupes.length > 0) {
      const deleteKb = db.prepare('DELETE FROM ml_knowledge_base WHERE question = ? AND id != ?');
      kbDupes.forEach(d => {
        deleteKb.run(d.question, d.keep_id);
      });
      console.log(`    ✅ Removed ${kbDupes.length} duplicate Knowledge Base entries`);
    }
  } catch (e) {
    console.log('    ⚠️ KB cleanup skipped:', e.message);
  }

  // Create unique indexes to prevent future duplicates
  try {
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_faq_question ON ai_faq(question)');
    console.log('    ✅ Created unique index on ai_faq.question');
  } catch (e) {
    // Index may already exist
  }

  try {
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_kb_question ON ml_knowledge_base(question)');
    console.log('    ✅ Created unique index on ml_knowledge_base.question');
  } catch (e) {
    // Index may already exist
  }

  console.log('✅ Migrations complete');
}

runMigrations();

module.exports = { runMigrations };
