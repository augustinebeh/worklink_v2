#!/usr/bin/env node
/**
 * Agent 29: Database Jobs Inspector
 * Examines actual job data in the database
 */

const path = require('path');
const Database = require('better-sqlite3');

console.log('🔍 Agent 29: Database Jobs Inspector');
console.log('='.repeat(80) + '\n');

const PROJECT_ROOT = process.cwd();
const dbPath = path.join(PROJECT_ROOT, 'data/worklink.db');

try {
  const db = new Database(dbPath, { readonly: true });
  
  console.log('1️⃣ CHECKING JOBS TABLE STRUCTURE:\n');
  
  const columns = db.prepare("PRAGMA table_info(jobs)").all();
  const statusColumn = columns.find(col => col.name === 'status');
  
  if (statusColumn) {
    console.log(`   ✅ Status column exists (type: ${statusColumn.type})`);
  } else {
    console.log('   ❌ No status column found!');
  }
  
  console.log('\n2️⃣ COUNTING JOBS BY STATUS:\n');
  
  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM jobs
    GROUP BY status
    ORDER BY count DESC
  `).all();
  
  if (statusCounts.length > 0) {
    console.log('   Status Distribution:');
    statusCounts.forEach(row => {
      console.log(`      ${row.status}: ${row.count} jobs`);
    });
  } else {
    console.log('   ⚠️  No jobs found in database');
  }
  
  console.log('\n3️⃣ TOTAL JOBS COUNT:\n');
  
  const total = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
  console.log(`   Total jobs: ${total.count}`);
  
  console.log('\n4️⃣ SAMPLE JOB RECORDS:\n');
  
  const samples = db.prepare('SELECT id, title, status FROM jobs LIMIT 5').all();
  if (samples.length > 0) {
    samples.forEach(job => {
      console.log(`   ${job.id}: ${job.title} [${job.status}]`);
    });
  } else {
    console.log('   No jobs to sample');
  }
  
  console.log('\n5️⃣ CHECKING FOR STATUS VARIATIONS:\n');
  
  const uniqueStatuses = db.prepare('SELECT DISTINCT status FROM jobs').all();
  console.log(`   Found ${uniqueStatuses.length} unique status values:`);
  uniqueStatuses.forEach(row => {
    console.log(`      - "${row.status}"`);
  });
  
  console.log('\n6️⃣ CHECKING FOR NULL/EMPTY STATUSES:\n');
  
  const nullCount = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status IS NULL OR status = ''").get();
  console.log(`   Jobs with NULL/empty status: ${nullCount.count}`);
  
  db.close();
  
} catch (error) {
  console.error('❌ Database error:', error.message);
  console.error('   Path:', dbPath);
}

console.log('\n' + '='.repeat(80));
console.log('DATABASE FINDINGS');
console.log('='.repeat(80) + '\n');
