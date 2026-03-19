/**
 * Referral Schema Tables
 * @param {Database} db - SQLite database instance
 */
function createReferralTables(db) {
  db.exec(`
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
  `);
}

module.exports = { createReferralTables };
