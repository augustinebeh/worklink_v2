/**
 * Outreach & Engagement Schema Tables
 * @param {Database} db - SQLite database instance
 */
function createOutreachTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS outreach_campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      job_id TEXT,
      target_criteria TEXT,
      channels TEXT,
      priority INTEGER DEFAULT 2,
      status TEXT DEFAULT 'draft',
      scheduled_at DATETIME,
      template_data TEXT,
      candidates_targeted INTEGER DEFAULT 0,
      messages_sent INTEGER DEFAULT 0,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    );

    CREATE TABLE IF NOT EXISTS outreach_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      error TEXT,
      campaign_type TEXT,
      external_message_id TEXT,
      delivered_at DATETIME,
      read_at DATETIME,
      replied_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES outreach_campaigns(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS candidate_engagement (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      engagement_type TEXT NOT NULL,
      engagement_data TEXT,
      source TEXT,
      campaign_id TEXT,
      job_id TEXT,
      engagement_score INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (campaign_id) REFERENCES outreach_campaigns(id),
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    );

    CREATE TABLE IF NOT EXISTS follow_up_sequences (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      trigger_type TEXT NOT NULL,
      trigger_conditions TEXT,
      sequence_data TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS follow_up_instances (
      id TEXT PRIMARY KEY,
      sequence_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      trigger_event TEXT,
      trigger_data TEXT,
      current_step INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      next_action_at DATETIME,
      completed_steps TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (sequence_id) REFERENCES follow_up_sequences(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS candidate_communication_preferences (
      candidate_id TEXT PRIMARY KEY,
      whatsapp_enabled INTEGER DEFAULT 1,
      email_enabled INTEGER DEFAULT 1,
      sms_enabled INTEGER DEFAULT 1,
      push_enabled INTEGER DEFAULT 1,
      job_alerts_enabled INTEGER DEFAULT 1,
      marketing_enabled INTEGER DEFAULT 1,
      frequency_preference TEXT DEFAULT 'normal',
      best_contact_time TEXT DEFAULT 'anytime',
      timezone TEXT DEFAULT 'Asia/Singapore',
      do_not_contact_until DATETIME,
      unsubscribed_channels TEXT DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS campaign_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      metric_value REAL NOT NULL,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES outreach_campaigns(id)
    );
  `);
}

module.exports = { createOutreachTables };
