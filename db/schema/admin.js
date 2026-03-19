/**
 * Admin Schema Tables
 * @param {Database} db - SQLite database instance
 */
function createAdminTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_onboarding (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT DEFAULT 'admin',
      step_id TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at DATETIME,
      UNIQUE(user_id, step_id)
    );

    CREATE TABLE IF NOT EXISTS admin_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT DEFAULT 'admin',
      achievement_id TEXT NOT NULL,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, achievement_id)
    );
  `);
}

module.exports = { createAdminTables };
