/**
 * Gamification Schema
 * Tables for XP, quests, achievements, training, and rewards
 * 
 * @module database/schema/gamification
 */

const { db } = require('../config');

/**
 * Create gamification tables
 */
function createGamificationTables() {
  db.exec(`
    -- =====================================================
    -- GAMIFICATION SYSTEM (Career Ladder Strategy)
    -- =====================================================

    -- Achievements (Unlockable Milestones)
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      category TEXT,  -- 'special' | 'reliable' | 'skilled' | 'social'
      requirement_type TEXT,
      requirement_value INTEGER,
      xp_reward INTEGER DEFAULT 0,
      rarity TEXT DEFAULT 'common'  -- 'common' | 'rare' | 'epic' | 'legendary'
    );

    -- Candidate Achievements (Unlocked Progress)
    CREATE TABLE IF NOT EXISTS candidate_achievements (
      candidate_id TEXT,
      achievement_id TEXT,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      claimed INTEGER DEFAULT 0,
      claimed_at DATETIME,
      PRIMARY KEY (candidate_id, achievement_id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (achievement_id) REFERENCES achievements(id)
    );

    -- Quests (Daily/Weekly/Special Tasks)
    CREATE TABLE IF NOT EXISTS quests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT,  -- 'daily' | 'weekly' | 'special'
      requirement TEXT,  -- JSON: {"type": "...", "count": N}
      xp_reward INTEGER DEFAULT 0,
      bonus_reward REAL DEFAULT 0,
      active INTEGER DEFAULT 1
    );

    -- Candidate Quests (Quest Progress)
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

    -- XP Transactions (Experience Points Log)
    CREATE TABLE IF NOT EXISTS xp_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      action_type TEXT,  -- 'shift' | 'referral' | 'penalty' | 'quest_claim' | 'achievement_claim'
      amount INTEGER NOT NULL,
      reason TEXT,
      reference_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Training Modules (Skill Development)
    CREATE TABLE IF NOT EXISTS training (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER,
      certification_name TEXT,
      xp_reward INTEGER DEFAULT 0
    );

    -- Rewards Shop (The Sink - Points Redemption)
    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      category TEXT,  -- 'feature' | 'operational' | 'physical'
      points_cost INTEGER NOT NULL,
      tier_required TEXT DEFAULT 'bronze',  -- 'bronze' | 'silver' | 'gold' | 'platinum'
      stock INTEGER,  -- NULL = unlimited
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Reward Purchases (Redemption History)
    CREATE TABLE IF NOT EXISTS reward_purchases (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      reward_id TEXT NOT NULL,
      points_spent INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',  -- 'pending' | 'fulfilled' | 'cancelled'
      fulfilled_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (reward_id) REFERENCES rewards(id)
    );
  `);

  console.log('  ✅ Gamification tables created');
}

module.exports = { createGamificationTables };
