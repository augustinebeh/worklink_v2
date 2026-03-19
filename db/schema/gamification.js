/**
 * Gamification Schema Tables
 * @param {Database} db - SQLite database instance
 */
function createGamificationTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
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

    CREATE TABLE IF NOT EXISTS candidate_training (
      candidate_id TEXT,
      training_id TEXT,
      status TEXT DEFAULT 'enrolled',
      score INTEGER,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      PRIMARY KEY (candidate_id, training_id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (training_id) REFERENCES training(id)
    );

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

    CREATE TABLE IF NOT EXISTS profile_borders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      tier TEXT NOT NULL,
      rarity TEXT DEFAULT 'common',
      gradient TEXT,
      glow TEXT,
      animation TEXT,
      unlock_type TEXT,
      unlock_requirement TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS candidate_borders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      border_id TEXT NOT NULL,
      is_selected INTEGER DEFAULT 0,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(candidate_id, border_id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (border_id) REFERENCES profile_borders(id)
    );
  `);
}

module.exports = { createGamificationTables };
