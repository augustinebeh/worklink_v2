#!/usr/bin/env node

/**
 * Database Setup Script for Interview Scheduler V2
 * Creates necessary tables for state management and interview bookings
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('🗄️  Setting up Interview Scheduler V2 database tables...\n');

try {
  // Connect to database
  const dbPath = path.join(__dirname, 'db', 'database.db');
  console.log(`📁 Database path: ${dbPath}`);
  
  if (!fs.existsSync(dbPath)) {
    console.error('❌ Database file not found!');
    process.exit(1);
  }

  const db = new Database(dbPath);
  console.log('✅ Connected to database\n');

  // Create interview_conversation_state table
  console.log('Creating table: interview_conversation_state...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS interview_conversation_state (
      candidate_id TEXT PRIMARY KEY,
      current_stage TEXT NOT NULL,
      time_preference TEXT,
      shown_slots TEXT,
      selected_slot_index INTEGER,
      selected_date TEXT,
      selected_time TEXT,
      conversation_context TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    );
  `);
  console.log('✅ Table created: interview_conversation_state');

  // Create index for expires_at
  console.log('Creating index: idx_interview_state_expires...');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_interview_state_expires 
    ON interview_conversation_state(expires_at);
  `);
  console.log('✅ Index created: idx_interview_state_expires');

  // Create interview_slots table
  console.log('\nCreating table: interview_slots...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS interview_slots (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 15,
      status TEXT DEFAULT 'confirmed',
      zoom_link TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );
  `);
  console.log('✅ Table created: interview_slots');

  // Create indexes for interview_slots
  console.log('Creating index: idx_interview_slots_candidate...');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_interview_slots_candidate 
    ON interview_slots(candidate_id);
  `);
  console.log('✅ Index created: idx_interview_slots_candidate');

  console.log('Creating index: idx_interview_slots_date...');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_interview_slots_date 
    ON interview_slots(scheduled_date);
  `);
  console.log('✅ Index created: idx_interview_slots_date');

  console.log('Creating index: idx_interview_slots_status...');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_interview_slots_status 
    ON interview_slots(status);
  `);
  console.log('✅ Index created: idx_interview_slots_status');

  // Verify tables
  console.log('\n📊 Verifying tables...');
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name LIKE 'interview%'
    ORDER BY name
  `).all();
  
  console.log('Found tables:');
  tables.forEach(table => {
    console.log(`  - ${table.name}`);
  });

  db.close();
  console.log('\n🎉 Database setup complete!');
  console.log('\n✅ Interview Scheduler V2 is ready to use!');

} catch (error) {
  console.error('\n❌ Database setup failed:', error.message);
  console.error(error);
  process.exit(1);
}
