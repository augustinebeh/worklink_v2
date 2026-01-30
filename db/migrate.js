/**
 * Database migrations - Run on startup
 */

const { db } = require('./database');

function runMigrations() {
  console.log('🔄 Running migrations...');

  // Add data column to notifications if it doesn't exist
  try {
    db.exec(`ALTER TABLE notifications ADD COLUMN data TEXT`);
    console.log('  ✅ Added data column to notifications');
  } catch (e) {
    // Column likely already exists
  }

  // Add streak_last_date to candidates if it doesn't exist
  try {
    db.exec(`ALTER TABLE candidates ADD COLUMN streak_last_date DATE`);
    console.log('  ✅ Added streak_last_date to candidates');
  } catch (e) {
    // Column likely already exists
  }

  // Create xp_transactions table if not exists
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS xp_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        reason TEXT,
        reference_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id)
      )
    `);
    console.log('  ✅ Created xp_transactions table');
  } catch (e) {
    console.log('  ℹ️ xp_transactions table already exists');
  }

  // Create candidate_quests table if not exists
  try {
    db.exec(`
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
      )
    `);
    console.log('  ✅ Created candidate_quests table');
  } catch (e) {
    console.log('  ℹ️ candidate_quests table already exists');
  }

  // Add indices for better performance
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_candidate ON notifications(candidate_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(candidate_id, read)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_candidate ON messages(candidate_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_deployments_candidate ON deployments(candidate_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_deployments_job ON deployments(job_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_candidate ON payments(candidate_id)`);
    console.log('  ✅ Created performance indices');
  } catch (e) {
    // Indices likely already exist
  }

  // Seed message templates if empty
  const templateCount = db.prepare('SELECT COUNT(*) as count FROM message_templates').get().count;
  if (templateCount === 0) {
    const templates = [
      ['TPL001', 'Welcome Message', 'onboarding', 'Hi {name}! Welcome to TalentVis. We\'re excited to have you on board. Let us know if you have any questions!', '["name"]'],
      ['TPL002', 'Job Assignment', 'job', 'Great news, {name}! You\'ve been assigned to a new job. Check your app for details.', '["name"]'],
      ['TPL003', 'Payment Processed', 'payment', 'Hi {name}, your payment of ${amount} has been processed and will arrive in your bank account within 1-2 business days.', '["name", "amount"]'],
      ['TPL004', 'Job Reminder', 'reminder', 'Reminder: You have a job tomorrow at {location}. Don\'t forget to arrive 15 minutes early!', '["location"]'],
      ['TPL005', 'Feedback Request', 'feedback', 'Hi {name}! How was your recent job? We\'d love to hear your feedback.', '["name"]'],
      ['TPL006', 'New Job Available', 'job', 'New opportunity alert! There\'s a job available that matches your profile. Check it out in the app!', '[]'],
      ['TPL007', 'Achievement Unlocked', 'gamification', 'Congratulations {name}! 🎉 You\'ve unlocked a new achievement. Keep up the great work!', '["name"]'],
    ];

    const insertTemplate = db.prepare(`
      INSERT INTO message_templates (id, name, category, content, variables)
      VALUES (?, ?, ?, ?, ?)
    `);

    templates.forEach(t => insertTemplate.run(...t));
    console.log('  ✅ Seeded message templates');
  }

  console.log('✅ Migrations complete');
}

runMigrations();

module.exports = { runMigrations };
