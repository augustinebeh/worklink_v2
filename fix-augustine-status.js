#!/usr/bin/env node
/**
 * Fix Augustine Beh Account - Change from 'pending' to 'verified'
 */

const { db } = require('./db');

console.log('\n🔧 FIXING AUGUSTINE BEH ACCOUNT...\n');

// Find Augustine Beh
const augustine = db.prepare(`
  SELECT id, name, email, status, source 
  FROM candidates 
  WHERE name LIKE '%Augustine%' 
     OR email LIKE '%augustine%'
`).get();

if (!augustine) {
  console.log('❌ Augustine Beh not found in database.');
  console.log('   This means you haven\'t logged in via Google yet.');
  console.log('   Please log in once via Google, then run this script again.\n');
  process.exit(1);
}

console.log('✅ Found Augustine Beh:');
console.log(`   ID:      ${augustine.id}`);
console.log(`   Name:    ${augustine.name}`);
console.log(`   Email:   ${augustine.email}`);
console.log(`   Status:  ${augustine.status} ${augustine.status === 'pending' ? '⚠️ (NEEDS APPROVAL)' : '✅'}`);
console.log(`   Source:  ${augustine.source}\n`);

if (augustine.status === 'verified') {
  console.log('✅ Account already verified! No changes needed.\n');
  process.exit(0);
}

// Update status to verified
console.log('🔄 Updating status from "pending" to "verified"...\n');

db.prepare(`
  UPDATE candidates 
  SET status = 'verified', 
      updated_at = datetime('now')
  WHERE id = ?
`).run(augustine.id);

const updated = db.prepare('SELECT status FROM candidates WHERE id = ?').get(augustine.id);

console.log(`✅ SUCCESS! Augustine Beh is now ${updated.status}!`);
console.log('   You should now see this account in the admin portal candidates list.\n');
console.log('💡 Next step: Refresh your admin portal page.\n');
