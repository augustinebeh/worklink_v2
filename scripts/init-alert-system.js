#!/usr/bin/env node

/**
 * Alert System Database Initialization
 * Creates the alert system tables in the gebiz_intelligence.db
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Paths
const DB_PATH = path.join(__dirname, '../database/gebiz_intelligence.db');
const SCHEMA_PATH = path.join(__dirname, '../database/alert-system-schema.sql');

async function initializeAlertSystem() {
  console.log('🔔 Initializing Alert System Database...\n');

  try {
    // Check if database exists
    if (!fs.existsSync(DB_PATH)) {
      console.log('❌ GeBIZ Intelligence database not found at:', DB_PATH);
      console.log('Please run the GeBIZ database setup first.');
      process.exit(1);
    }

    // Check if schema file exists
    if (!fs.existsSync(SCHEMA_PATH)) {
      console.log('❌ Alert system schema not found at:', SCHEMA_PATH);
      process.exit(1);
    }

    // Read schema file
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

    // Open database
    const db = new Database(DB_PATH);

    console.log('📂 Database opened successfully');
    console.log('📄 Schema file loaded');

    // Execute schema
    console.log('🔨 Creating alert system tables...');
    db.exec(schema);

    // Verify tables were created
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name LIKE '%alert%'
      ORDER BY name
    `).all();

    console.log('\n✅ Alert System Tables Created:');
    tables.forEach(table => {
      console.log(`   📋 ${table.name}`);
    });

    // Check views
    const views = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='view' AND name LIKE 'v_%alert%'
      ORDER BY name
    `).all();

    if (views.length > 0) {
      console.log('\n✅ Alert System Views Created:');
      views.forEach(view => {
        console.log(`   👁️  ${view.name}`);
      });
    }

    // Test basic functionality
    console.log('\n🧪 Testing basic functionality...');

    // Test inserting a sample alert rule
    const ruleId = 'test_rule_' + Date.now();
    const insertRule = db.prepare(`
      INSERT INTO alert_rules (
        id, rule_name, rule_type, conditions, priority, notification_channels, recipients
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertRule.run(
      ruleId,
      'Test Alert Rule',
      'value_threshold',
      '{"min_value": 50000}',
      'medium',
      '["in_app"]',
      '{"email": ["test@example.com"]}'
    );

    // Test reading the rule
    const rule = db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(ruleId);
    if (rule) {
      console.log('   ✅ Alert rules table working');
    }

    // Test unread count (should be 0 initially)
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM alert_history WHERE acknowledged = 0').get();
    console.log(`   ✅ Alert history table working (${unreadCount.count} unread alerts)`);

    // Clean up test data
    db.prepare('DELETE FROM alert_rules WHERE id = ?').run(ruleId);

    // Show sample data
    const sampleRules = db.prepare('SELECT rule_name, rule_type, priority FROM alert_rules LIMIT 5').all();
    if (sampleRules.length > 0) {
      console.log('\n📋 Sample Alert Rules:');
      sampleRules.forEach(rule => {
        console.log(`   • ${rule.rule_name} (${rule.rule_type}, ${rule.priority})`);
      });
    }

    db.close();
    console.log('\n🎉 Alert System initialization completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Run alert tests: node test-alert-system.js');
    console.log('3. Visit the admin portal: http://localhost:3000/admin');
    console.log('4. Check the bell icon for alerts');

  } catch (error) {
    console.error('❌ Error initializing alert system:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run initialization
if (require.main === module) {
  initializeAlertSystem();
}

module.exports = { initializeAlertSystem };