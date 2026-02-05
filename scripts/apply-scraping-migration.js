#!/usr/bin/env node
/**
 * Apply scraping sessions migration
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../database/gebiz_intelligence.db');
const MIGRATION_PATH = path.join(__dirname, '../database/migrations/002_scraping_sessions.sql');

try {
  console.log('🔄 Applying scraping sessions migration...');

  const db = new Database(DB_PATH);
  const migration = fs.readFileSync(MIGRATION_PATH, 'utf-8');

  db.exec(migration);

  // Test table creation
  const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='scraping_sessions'").get();

  if (tableInfo) {
    console.log('✅ Scraping sessions table created successfully');

    // Add some test data
    db.prepare(`
      INSERT INTO scraping_sessions (
        id, source, status, user_id, keywords, max_results, records_scraped, records_inserted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'test-session-001',
      'datagovsg',
      'completed',
      'system',
      JSON.stringify(['manpower', 'services']),
      1000,
      250,
      125
    );

    console.log('✅ Test data inserted');
  } else {
    console.log('❌ Table creation failed');
  }

  db.close();
  console.log('✅ Migration completed successfully');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}