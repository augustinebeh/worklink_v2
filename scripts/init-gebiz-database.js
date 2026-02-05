#!/usr/bin/env node

/**
 * GeBIZ Intelligence Database Initialization Script
 * Sets up the database schema
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

async function initializeDatabase() {
  console.log('====================================');
  console.log('🔧 GEBIZ DATABASE INITIALIZATION');
  console.log('====================================\n');

  const dbPath = path.join(__dirname, '../database/gebiz_intelligence.db');
  const schemaPath = path.join(__dirname, '../database/gebiz_schema.sql');

  try {
    // Check if schema file exists
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    console.log('Step 1: Creating database...');
    console.log(`  Path: ${dbPath}\n`);

    // Create database connection
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    console.log('✅ Database created\n');

    // Read schema file
    console.log('Step 2: Loading schema...');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('✅ Schema loaded\n');

    // Execute schema
    console.log('Step 3: Creating tables...');
    db.exec(schema);
    console.log('✅ Tables created\n');

    // Verify tables
    console.log('Step 4: Verifying installation...');
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `).all();

    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    console.log('');

    // Show configuration
    const config = db.prepare('SELECT * FROM scraping_config').all();
    console.log(`✅ Configuration entries: ${config.length}`);
    console.log('');

    // Close database
    db.close();

    console.log('====================================');
    console.log('✅ GEBIZ DATABASE READY!');
    console.log('====================================\n');

    console.log('Next steps:');
    console.log('  1. Start server: npm start');
    console.log('  2. Visit: http://localhost:8080/admin/gebiz-intelligence');
    console.log('  3. Click "Sync Data" button to import historical data\n');

  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
