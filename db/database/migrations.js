/**
 * Database Migrations
 * Schema evolution through ALTER TABLE statements
 * Safely adds columns to existing tables without data loss
 * 
 * @module database/migrations
 */

const { db } = require('./config');

/**
 * Run all database migrations
 * Safe to run multiple times - migrations are idempotent
 */
function runMigrations() {
  console.log('🔄 Running database migrations...');

  // Messages table migrations
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

  // Telegram groups table migrations
  try {
    db.exec(`ALTER TABLE telegram_groups ADD COLUMN type TEXT DEFAULT 'job_posting'`);
  } catch (e) {}
  
  try {
    db.exec(`ALTER TABLE telegram_groups ADD COLUMN active INTEGER DEFAULT 1`);
  } catch (e) {}
  
  try {
    db.exec(`ALTER TABLE telegram_groups ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
  } catch (e) {}

  // ML knowledge base migrations
  try {
    db.exec(`ALTER TABLE ml_knowledge_base ADD COLUMN keywords TEXT`);
  } catch (e) {}

  // Candidates table migrations
  try {
    db.exec(`ALTER TABLE candidates ADD COLUMN telegram_username TEXT`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE candidates ADD COLUMN google_id TEXT`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE candidates ADD COLUMN lifetime_xp INTEGER DEFAULT 0`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE candidates ADD COLUMN current_points INTEGER DEFAULT 0`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE candidates ADD COLUMN current_tier TEXT DEFAULT 'bronze'`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE candidates ADD COLUMN profile_flair TEXT`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE candidates ADD COLUMN theme_preference TEXT DEFAULT 'default'`);
  } catch (e) {}

  // Candidate achievements migrations
  try {
    db.exec(`ALTER TABLE candidate_achievements ADD COLUMN claimed INTEGER DEFAULT 0`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE candidate_achievements ADD COLUMN claimed_at DATETIME`);
  } catch (e) {}

  // XP transactions migrations
  try {
    db.exec(`ALTER TABLE xp_transactions ADD COLUMN action_type TEXT`);
  } catch (e) {}

  console.log('  ✅ Database migrations completed');
}

module.exports = { runMigrations };
