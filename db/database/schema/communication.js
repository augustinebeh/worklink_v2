/**
 * Communication Schema
 * Tables for messaging, notifications, push notifications, and Telegram integration
 * 
 * @module database/schema/communication
 */

const { db } = require('../config');

/**
 * Create communication and messaging tables
 */
function createCommunicationTables() {
  db.exec(`
    -- =====================================================
    -- MESSAGING & NOTIFICATIONS
    -- =====================================================

    -- Messages (In-App Chat)
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT,
      sender TEXT,
      content TEXT,
      template_id TEXT,
      channel TEXT DEFAULT 'app',
      read INTEGER DEFAULT 0,
      ai_generated INTEGER DEFAULT 0,
      ai_log_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Message Templates (Predefined Messages)
    CREATE TABLE IF NOT EXISTS message_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      content TEXT NOT NULL,
      whatsapp_content TEXT,
      variables TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Notifications (System Alerts)
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT,
      type TEXT,
      title TEXT,
      message TEXT,
      data TEXT,
      read INTEGER DEFAULT 0,
      push_sent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Push Notification Queue
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

    -- Push Subscriptions (Web Push API)
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT UNIQUE,
      subscription_endpoint TEXT NOT NULL,
      subscription_p256dh TEXT NOT NULL,
      subscription_auth TEXT NOT NULL,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Notification Log (Retention Tracking)
    CREATE TABLE IF NOT EXISTS notification_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT,
      notification_type TEXT,
      status TEXT,
      response_action TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- =====================================================
    -- TELEGRAM INTEGRATION
    -- =====================================================

    -- Telegram Groups (Job Posting Channels)
    CREATE TABLE IF NOT EXISTS telegram_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'job_posting',  -- 'job_posting' | 'announcement' | 'general'
      member_count INTEGER,
      active INTEGER DEFAULT 1,
      last_post_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Telegram Job Posts (Posted Jobs Tracking)
    CREATE TABLE IF NOT EXISTS telegram_job_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      group_id INTEGER NOT NULL,
      variant_id INTEGER,  -- Links to ad_variants for A/B testing
      message_id TEXT,  -- Telegram message ID
      content TEXT,  -- The actual ad content posted
      posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      post_hour INTEGER,  -- 0-23 for timing analysis
      post_day INTEGER,  -- 0=Sun, 6=Sat
      status TEXT DEFAULT 'sent',  -- 'sent' | 'deleted' | 'failed'
      views INTEGER DEFAULT 0,
      responses INTEGER DEFAULT 0,  -- Candidate applications from this post
      FOREIGN KEY (job_id) REFERENCES jobs(id),
      FOREIGN KEY (group_id) REFERENCES telegram_groups(id)
    );

    -- Telegram Post Settings (Key-Value Configuration)
    CREATE TABLE IF NOT EXISTS telegram_post_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Telegram Auto-Post Settings
    CREATE TABLE IF NOT EXISTS telegram_auto_post_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enabled INTEGER DEFAULT 0,
      post_on_job_create INTEGER DEFAULT 1,
      default_groups TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('  ✅ Communication & Telegram tables created');
}

module.exports = { createCommunicationTables };
