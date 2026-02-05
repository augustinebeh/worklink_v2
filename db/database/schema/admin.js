/**
 * Admin & Analytics Schema
 * Tables for admin features, settings, and analytics tracking
 * 
 * @module database/schema/admin
 */

const { db } = require('../config');

/**
 * Create admin and analytics tables
 */
function createAdminTables() {
  db.exec(`
    -- =====================================================
    -- ADMIN SYSTEMS
    -- =====================================================

    -- Admin Onboarding Progress
    CREATE TABLE IF NOT EXISTS admin_onboarding (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT DEFAULT 'admin',
      step_id TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at DATETIME,
      UNIQUE(user_id, step_id)
    );

    -- Admin Achievements (Gamify Admin Experience)
    CREATE TABLE IF NOT EXISTS admin_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT DEFAULT 'admin',
      achievement_id TEXT NOT NULL,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, achievement_id)
    );

    -- Global Settings (Key-Value Store)
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- AI Global Settings
    CREATE TABLE IF NOT EXISTS ai_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- =====================================================
    -- GAMIFICATION UTILITIES
    -- =====================================================

    -- Streak Protection Tokens
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

    -- =====================================================
    -- ANALYTICS & TRACKING
    -- =====================================================

    -- User Engagement Sessions
    CREATE TABLE IF NOT EXISTS engagement_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT,
      session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
      session_end DATETIME,
      duration_minutes REAL,
      pages_visited INTEGER DEFAULT 0,
      actions_performed INTEGER DEFAULT 0,
      device_type TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Feature Usage Tracking
    CREATE TABLE IF NOT EXISTS feature_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT,
      feature_name TEXT,
      usage_count INTEGER DEFAULT 1,
      last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Retention Cohorts
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

    -- Churn Prediction Scores
    CREATE TABLE IF NOT EXISTS churn_predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT UNIQUE,
      risk_score REAL,  -- 0-1 probability
      risk_factors TEXT,  -- JSON array
      last_calculated DATETIME DEFAULT CURRENT_TIMESTAMP,
      intervention_suggested TEXT,
      intervention_taken TEXT,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Notification Effectiveness Tracking
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
  `);

  console.log('  ✅ Admin & analytics tables created');
}

module.exports = { createAdminTables };
