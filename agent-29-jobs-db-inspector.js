#!/usr/bin/env node
/**
 * AGENT 29: Jobs Database Inspector
 * Checks actual job counts in database
 */

const path = require('path');
const Database = require('better-sqlite3');

console.log('🔍 AGENT 29: Jobs Database Inspector');
console.log('='.repeat(80) + '\n');

const PROJECT_ROOT = process.cwd();
const dbPath = path.join(PROJECT_ROOT, 'data/worklink.db');

try {
  const db = new Database(dbPath, { readonly: true });
  
  console.log('1️⃣ CHECKING DATABASE CONNECTION:\n');
  console.log(`   ✅ Database: ${dbPath}\n`);
  
  console.log('2️⃣ ACTUAL JOB COUNTS BY STATUS:\n');
  
  // Get all jobs with their statuses
  const jobs = db.prepare('SELECT id, title, status FROM jobs').all();
  console.log(`   Total jobs in database: ${jobs.length}\n`);
  
  // Count by status
  const statusCounts = {};
  jobs.forEach(job => {
    const status = job.status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  console.log('   Status breakdown:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`      ${status}: ${count}`);
  });
  
  console.log('\n3️⃣ SAMPLE JOB DATA:\n');
  const sampleJobs = db.prepare('SELECT id, title, status, created_at FROM jobs LIMIT 5').all();
  sampleJobs.forEach(job => {
    console.log(`   ID: ${job.id} | Status: ${job.status} | Title: ${job.title}`);
  });
  
  console.log('\n4️⃣ JOBS TABLE SCHEMA:\n');
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='jobs'").get();
  if (schema) {
    console.log('   ' + schema.sql.split('\n').join('\n   '));
  }
  
  db.close();
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

console.log('\n' + '='.repeat(80));
console.log('DATABASE ANALYSIS COMPLETE');
console.log('='.repeat(80) + '\n');
