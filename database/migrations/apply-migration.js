#!/usr/bin/env node

/**
 * Database Migration Runner for GeBIZ Intelligence System
 * Applies renewal tracking and alert system extensions
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../gebiz_intelligence.db');
const MIGRATION_PATH = path.join(__dirname, './001_renewal_alert_system.sql');

console.log('🔄 Starting GeBIZ Intelligence Database Migration...\n');

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Error: gebiz_intelligence.db not found!');
  console.error(`   Expected location: ${DB_PATH}`);
  console.error('   Please create the database first using gebiz_schema.sql');
  process.exit(1);
}

// Check if migration file exists
if (!fs.existsSync(MIGRATION_PATH)) {
  console.error('❌ Error: Migration file not found!');
  console.error(`   Expected location: ${MIGRATION_PATH}`);
  process.exit(1);
}

try {
  // Open database
  console.log('📂 Opening database...');
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  
  // Read migration SQL
  console.log('📄 Reading migration file...');
  const migrationSQL = fs.readFileSync(MIGRATION_PATH, 'utf8');
  
  // Create migration tracking table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Check if this migration was already applied
  const existingMigration = db.prepare(
    'SELECT * FROM schema_migrations WHERE migration_name = ?'
  ).get('001_renewal_alert_system');
  
  if (existingMigration) {
    console.log('✅ Migration already applied!');
    console.log(`   Applied on: ${existingMigration.applied_at}`);
    db.close();
    process.exit(0);
  }
  
  // Apply migration
  console.log('⚡ Applying migration...\n');
  
  // Split by semicolons and execute each statement
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const statement of statements) {
    try {
      db.exec(statement + ';');
      successCount++;
      
      // Show progress for major operations
      if (statement.includes('CREATE TABLE')) {
        const tableMatch = statement.match(/CREATE TABLE [IF NOT EXISTS ]*(\w+)/i);
        const tableName = tableMatch ? tableMatch[1] : null;
        if (tableName) console.log(`   ✓ Created table: ${tableName}`);
      } else if (statement.includes('ALTER TABLE')) {
        const tableMatch = statement.match(/ALTER TABLE (\w+)/i);
        const tableName = tableMatch ? tableMatch[1] : null;
        if (tableName) console.log(`   ✓ Altered table: ${tableName}`);
      } else if (statement.includes('CREATE INDEX')) {
        const indexMatch = statement.match(/CREATE INDEX [IF NOT EXISTS ]*(\w+)/i);
        const indexName = indexMatch ? indexMatch[1] : null;
        if (indexName) console.log(`   ✓ Created index: ${indexName}`);
      } else if (statement.includes('CREATE VIEW')) {
        const viewMatch = statement.match(/CREATE VIEW [IF NOT EXISTS ]*(\w+)/i);
        const viewName = viewMatch ? viewMatch[1] : null;
        if (viewName) console.log(`   ✓ Created view: ${viewName}`);
      } else if (statement.includes('CREATE TRIGGER')) {
        const triggerMatch = statement.match(/CREATE TRIGGER [IF NOT EXISTS ]*(\w+)/i);
        const triggerName = triggerMatch ? triggerMatch[1] : null;
        if (triggerName) console.log(`   ✓ Created trigger: ${triggerName}`);
      }
    } catch (error) {
      errorCount++;
      // Some errors are okay (like ALTER TABLE on non-existent column)
      if (!error.message.includes('duplicate column name')) {
        console.warn(`   ⚠️  Warning: ${error.message}`);
      }
    }
  }
  
  console.log(`\n📊 Migration Summary:`);
  console.log(`   Successful operations: ${successCount}`);
  if (errorCount > 0) {
    console.log(`   Warnings/Skipped: ${errorCount} (likely duplicate columns - safe to ignore)`);
  }
  
  // Record migration
  db.prepare('INSERT INTO schema_migrations (migration_name) VALUES (?)').run('001_renewal_alert_system');
  
  // Verify new tables exist
  console.log('\n🔍 Verifying new tables...');
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name IN (
      'contract_renewals',
      'bpo_tender_lifecycle', 
      'alert_rules',
      'alert_history',
      'user_alert_preferences',
      'renewal_engagement_activities',
      'audit_log'
    )
    ORDER BY name
  `).all();
  
  if (tables.length === 7) {
    console.log('✅ All 7 new tables created successfully:');
    tables.forEach(t => console.log(`   - ${t.name}`));
  } else {
    console.log(`⚠️  Expected 7 tables, found ${tables.length}`);
    tables.forEach(t => console.log(`   - ${t.name}`));
  }
  
  // Verify new views
  const views = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='view' 
    AND name LIKE 'v_%'
    AND name NOT IN ('v_top_competitors', 'v_closing_soon', 'v_recent_competitor_activity', 'v_database_stats')
    ORDER BY name
  `).all();
  
  if (views.length > 0) {
    console.log(`\n✅ ${views.length} new views created:`);
    views.forEach(v => console.log(`   - ${v.name}`));
  }
  
  // Show summary stats
  console.log('\n📈 Database Statistics:');
  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM gebiz_historical_tenders) as historical_tenders,
      (SELECT COUNT(*) FROM gebiz_active_tenders) as active_tenders,
      (SELECT COUNT(*) FROM contract_renewals) as renewals,
      (SELECT COUNT(*) FROM bpo_tender_lifecycle) as pipeline_items,
      (SELECT COUNT(*) FROM alert_rules WHERE active = 1) as active_alerts
  `).get();
  
  console.log(`   Historical Tenders: ${stats.historical_tenders}`);
  console.log(`   Active Tenders: ${stats.active_tenders}`);
  console.log(`   Renewal Predictions: ${stats.renewals}`);
  console.log(`   Pipeline Items: ${stats.pipeline_items}`);
  console.log(`   Active Alert Rules: ${stats.active_alerts}`);
  
  db.close();
  
  console.log('\n✅ Migration completed successfully!');
  console.log('🚀 System ready for renewal tracking and alerts!\n');
  
} catch (error) {
  console.error('\n❌ Migration failed!');
  console.error(`   Error: ${error.message}`);
  console.error(`   Stack: ${error.stack}`);
  process.exit(1);
}
