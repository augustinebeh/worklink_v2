#!/usr/bin/env node
/**
 * Verify Template Schema is Correct
 * Run this AFTER server has started once to check schema
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'worklink.db');

console.log('\n🔍 VERIFYING TEMPLATE SCHEMA...\n');

try {
  const db = new Database(DB_PATH, { readonly: true });
  
  // Get response_templates table schema
  const tableInfo = db.prepare("PRAGMA table_info(response_templates)").all();
  
  console.log('📋 response_templates columns:\n');
  tableInfo.forEach(col => {
    const marker = col.name === 'category_id' ? '✅' : '  ';
    console.log(`${marker} ${col.name.padEnd(20)} ${col.type.padEnd(15)} ${col.notnull ? 'NOT NULL' : ''}`);
  });
  
  // Check for required columns
  const hasCateg oryId = tableInfo.some(col => col.name === 'category_id');
  const hasTriggerPatterns = tableInfo.some(col => col.name === 'trigger_patterns');
  const hasTemplateContent = tableInfo.some(col => col.name === 'template_content');
  
  console.log('\n🔎 Required Columns Check:\n');
  console.log(`  ${hasCategoryId ? '✅' : '❌'} category_id (foreign key)`);
  console.log(`  ${hasTriggerPatterns ? '✅' : '❌'} trigger_patterns`);
  console.log(`  ${hasTemplateContent ? '✅' : '❌'} template_content`);
  
  // Check if template_variables table exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='template_variables'").all();
  const hasVariablesTable = tables.length > 0;
  
  console.log(`  ${hasVariablesTable ? '✅' : '❌'} template_variables table exists\n`);
  
  if (hasCategoryId && hasTriggerPatterns && hasTemplateContent && hasVariablesTable) {
    console.log('✅ SCHEMA IS CORRECT! Server should start without template errors.\n');
    process.exit(0);
  } else {
    console.log('❌ SCHEMA IS WRONG! Template tables still have old schema.\n');
    console.log('💡 Try:');
    console.log('   1. Delete database: rm data/worklink.db*');
    console.log('   2. Restart server: npm start\n');
    process.exit(1);
  }
  
} catch (error) {
  if (error.message.includes('no such table')) {
    console.log('⚠️  Database exists but template tables not created yet.');
    console.log('   This is normal if server hasn\'t started yet.\n');
    process.exit(0);
  } else if (error.code === 'SQLITE_CANTOPEN') {
    console.log('⚠️  Database doesn\'t exist yet.');
    console.log('   Start the server to create it: npm start\n');
    process.exit(0);
  } else {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}
