const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'worklink.db');
const db = new Database(dbPath);

const testUser = {
  email: 'test@worklink.com',
  name: 'Test User',
  phone: '+1234567890',
  xp: 1500,
  level: 5,
  total_earnings: 500.00,
  streak_days: 5,
  status: 'active'
};

try {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO candidates (
      id, email, name, phone, xp, level, total_earnings,
      streak_days, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const result = stmt.run(
    'test-user-id',
    testUser.email,
    testUser.name,
    testUser.phone,
    testUser.xp,
    testUser.level,
    testUser.total_earnings,
    testUser.streak_days,
    testUser.status
  );

  console.log('✅ Test user created successfully');
  console.log('Email:', testUser.email);
  console.log('Name:', testUser.name);
  console.log('XP:', testUser.xp);
  console.log('Level:', testUser.level);
  console.log('Changes:', result.changes);
} catch (err) {
  console.error('Error creating test user:', err.message);
} finally {
  db.close();
}
