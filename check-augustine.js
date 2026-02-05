#!/usr/bin/env node
/**
 * Check Augustine Beh's actual status
 */

const { db } = require('./db');

console.log('\n🔍 CHECKING AUGUSTINE BEH ACCOUNT...\n');

// Find all Augustine/Beh records
const candidates = db.prepare(`
  SELECT id, name, email, status, source, google_id, created_at 
  FROM candidates 
  WHERE name LIKE '%Augustine%' 
     OR name LIKE '%Beh%' 
     OR email LIKE '%augustine%'
`).all();

if (candidates.length === 0) {
  console.log('❌ No Augustine Beh found in database!');
  console.log('\nThis means the Google login hasn\'t created the account yet.');
  console.log('Try logging in via Google again.\n');
} else {
  console.log(`✅ Found ${candidates.length} matching record(s):\n`);
  
  candidates.forEach((c, i) => {
    console.log(`Record ${i + 1}:`);
    console.log(`  ID:          ${c.id}`);
    console.log(`  Name:        ${c.name}`);
    console.log(`  Email:       ${c.email}`);
    console.log(`  Status:      ${c.status} ${c.status === 'pending' ? '⚠️ (PENDING - NOT APPROVED!)' : ''}`);
    console.log(`  Source:      ${c.source}`);
    console.log(`  Google ID:   ${c.google_id ? 'Yes ✅' : 'No'}`);
    console.log(`  Created:     ${c.created_at}`);
    console.log('');
  });
}

// Check what the admin portal might be filtering
console.log('📊 CANDIDATE STATUS BREAKDOWN:\n');
const statuses = db.prepare(`
  SELECT status, COUNT(*) as count 
  FROM candidates 
  GROUP BY status
`).all();

statuses.forEach(s => {
  console.log(`  ${s.status.padEnd(15)} ${s.count.toString().padStart(4)} candidate(s)`);
});

console.log('\n💡 TIP: If status is "pending", you need to approve it in the admin portal!');
console.log('   Or we can manually change it to "verified" right now.\n');
