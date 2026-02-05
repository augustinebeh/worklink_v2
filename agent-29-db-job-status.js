#!/usr/bin/env node
/**
 * AGENT 29: Database Job Status Inspector
 * Directly queries the database to see actual job counts by status
 */

const path = require('path');
const Database = require('better-sqlite3');

console.log('🔍 AGENT 29: Database Job Status Inspector');
console.log('='.repeat(80) + '\n');

const dbPath = path.join(process.cwd(), 'data/worklink.db');

try {
  const db = new Database(dbPath, { readonly: true });
  
  console.log('1️⃣ CHECKING ACTUAL JOB COUNTS BY STATUS:\n');
  
  // Get all jobs with their statuses
  const jobsByStatus = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM jobs
    GROUP BY status
    ORDER BY count DESC
  `).all();
  
  console.log('   Raw status counts from database:');
  jobsByStatus.forEach(row => {
    console.log(`      ${row.status || 'NULL'}: ${row.count}`);
  });
  
  // Get total count
  const total = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
  console.log(`\n   Total jobs in database: ${total.count}\n`);
  
  // Get sample jobs to see status values
  console.log('2️⃣ SAMPLE JOBS (showing status field):\n');
  const samples = db.prepare(`
    SELECT id, title, status, created_at
    FROM jobs
    LIMIT 10
  `).all();
  
  samples.forEach(job => {
    console.log(`   ID: ${job.id}`);
    console.log(`   Title: ${job.title}`);
    console.log(`   Status: "${job.status}"`);
    console.log(`   Created: ${job.created_at}`);
    console.log('');
  });
  
  // Check for status variations
  console.log('3️⃣ CHECKING FOR STATUS VALUE VARIATIONS:\n');
  const distinctStatuses = db.prepare(`
    SELECT DISTINCT status, 
           LENGTH(status) as length,
           TYPEOF(status) as type
    FROM jobs
  `).all();
  
  distinctStatuses.forEach(s => {
    console.log(`   Status: "${s.status}"`);
    console.log(`   Length: ${s.length}`);
    console.log(`   Type: ${s.type}`);
    console.log('');
  });
  
  // Check if there are any NULL statuses
  const nullCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM jobs 
    WHERE status IS NULL
  `).get();
  
  if (nullCount.count > 0) {
    console.log(`   ⚠️  Found ${nullCount.count} jobs with NULL status\n`);
  }
  
  db.close();
  
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');
  
  console.log('✅ Database query completed');
  console.log('📊 This shows the ACTUAL data in the database\n');
  
} catch (error) {
  console.error('❌ Database error:', error.message);
  console.log('\n⚠️  Could not connect to database');
  console.log('   Make sure worklink.db exists in data/ directory\n');
}
