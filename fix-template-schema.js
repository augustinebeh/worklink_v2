#!/usr/bin/env node
/**
 * Fix Template Tables Schema
 * Drops and recreates template tables with correct schema
 */

const Database = require('better-sqlite3');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'worklink.db');

console.log('\n🔧 FIXING TEMPLATE TABLES SCHEMA...\n');

const db = new Database(DB_PATH);

try {
  // Drop existing template tables
  console.log('🗑️  Dropping old template tables...');
  
  db.exec(`DROP TABLE IF EXISTS template_variables`);
  db.exec(`DROP TABLE IF EXISTS template_usage_log`);
  db.exec(`DROP TABLE IF EXISTS template_escalations`);
  db.exec(`DROP TABLE IF EXISTS response_templates`);
  db.exec(`DROP TABLE IF EXISTS template_categories`);
  
  console.log('✅ Old tables dropped');
  
  // Recreate with correct schema
  console.log('\n📋 Creating template tables with correct schema...\n');
  
  // Template categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS template_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      priority INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ template_categories');
  
  // Response templates table (FIXED)
  db.exec(`
    CREATE TABLE IF NOT EXISTS response_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL UNIQUE,
      trigger_patterns TEXT DEFAULT '[]',
      template_content TEXT NOT NULL,
      requires_real_data INTEGER DEFAULT 0,
      confidence_score REAL DEFAULT 0.8,
      language TEXT DEFAULT 'en',
      active INTEGER DEFAULT 1,
      usage_count INTEGER DEFAULT 0,
      last_used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES template_categories(id)
    )
  `);
  console.log('✅ response_templates');
  
  // Template variables table (NEW)
  db.exec(`
    CREATE TABLE IF NOT EXISTS template_variables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      variable_name TEXT NOT NULL,
      data_source TEXT NOT NULL,
      field_path TEXT NOT NULL,
      fallback_value TEXT DEFAULT '',
      format_type TEXT DEFAULT 'text',
      FOREIGN KEY (template_id) REFERENCES response_templates(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ template_variables');
  
  // Template usage log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS template_usage_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER,
      candidate_id TEXT,
      context TEXT,
      success INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ template_usage_log');
  
  // Template escalations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS template_escalations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      reason TEXT,
      context TEXT,
      priority TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'pending',
      assigned_to TEXT,
      resolved_at DATETIME,
      resolution_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ template_escalations');
  
  // Create indexes for performance
  console.log('\n📊 Creating indexes...\n');
  
  db.exec(`CREATE INDEX IF NOT EXISTS idx_response_templates_category ON response_templates(category_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_template_usage_template ON template_usage_log(template_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_template_usage_candidate ON template_usage_log(candidate_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_template_escalations_candidate ON template_escalations(candidate_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_template_escalations_status ON template_escalations(status)`);
  
  console.log('✅ All indexes created');
  
  console.log('\n✅ TEMPLATE TABLES FIXED!\n');
  console.log('📝 Schema changes:');
  console.log('  • category TEXT → category_id INTEGER (foreign key)');
  console.log('  • triggers → trigger_patterns');
  console.log('  • content → template_content');
  console.log('  • Added template_variables table');
  console.log('  • Added confidence_score, language, active columns\n');
  console.log('💡 Next: Restart server and templates will seed automatically\n');
  
} catch (error) {
  console.error('❌ Error fixing template tables:', error.message);
  process.exit(1);
} finally {
  db.close();
}
