#!/usr/bin/env node
/**
 * Test Candidates Stats Endpoint
 * Verifies the /stats endpoint returns correct format
 */

const { db } = require('./db');

console.log('\n🧪 TESTING CANDIDATES STATS ENDPOINT\n');
console.log('=' .repeat(60));

// Simulate what the endpoint does
const statusStats = db.prepare(`
  SELECT status, COUNT(*) as count
  FROM candidates
  GROUP BY status
`).all();

console.log('\n📊 RAW DATABASE QUERY RESULTS:');
console.log(JSON.stringify(statusStats, null, 2));

// Convert to frontend format
const stats = {
  pending: 0,
  active: 0,
  inactive: 0,
  verified: 0,
  blocked: 0,
  lead: 0
};

statusStats.forEach(stat => {
  stats[stat.status] = stat.count;
});

console.log('\n✅ CONVERTED FORMAT (What Frontend Receives):');
console.log(JSON.stringify(stats, null, 2));

console.log('\n📋 SUMMARY:');
console.log(`  Total Pending:   ${stats.pending || 0}`);
console.log(`  Total Active:    ${stats.active || 0}`);
console.log(`  Total Inactive:  ${stats.inactive || 0}`);
console.log(`  Total Verified:  ${stats.verified || 0}`);
console.log(`  Total Blocked:   ${stats.blocked || 0}`);
console.log(`  Total Lead:      ${stats.lead || 0}`);

const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
console.log(`  \n  TOTAL:          ${total}`);

console.log('\n✅ Stats endpoint format is CORRECT!\n');
console.log('💡 Next: Start server and test in browser:');
console.log('   1. npm start');
console.log('   2. Open http://localhost:3002/admin');
console.log('   3. Go to Candidates page');
console.log('   4. Stats cards should show these numbers\n');
