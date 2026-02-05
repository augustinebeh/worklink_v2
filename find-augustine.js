#!/usr/bin/env node
/**
 * Find Augustine Beh in database
 */

const { db } = require('./db');

console.log('\n🔍 SEARCHING FOR AUGUSTINE BEH...\n');

// Search by name
const byName = db.prepare("SELECT * FROM candidates WHERE name LIKE '%Augustine%' OR name LIKE '%Beh%'").all();
console.log('By Name:', byName.length, 'results');
byName.forEach(c => {
  console.log(`  • ${c.id} - ${c.name} - ${c.email} - Status: ${c.status} - Source: ${c.source}`);
  if (c.google_id) console.log(`    Google ID: ${c.google_id}`);
});

// Search by email
console.log('\nBy Email (augustine):');
const byEmail = db.prepare("SELECT * FROM candidates WHERE email LIKE '%augustine%'").all();
byEmail.forEach(c => {
  console.log(`  • ${c.id} - ${c.name} - ${c.email} - Status: ${c.status} - Source: ${c.source}`);
  if (c.google_id) console.log(`    Google ID: ${c.google_id}`);
});

// Search by google_id
console.log('\nBy Google ID (any):');
const byGoogle = db.prepare("SELECT * FROM candidates WHERE google_id IS NOT NULL").all();
console.log('Total with Google ID:', byGoogle.length);
byGoogle.forEach(c => {
  console.log(`  • ${c.id} - ${c.name} - ${c.email} - Status: ${c.status}`);
  console.log(`    Google ID: ${c.google_id}`);
});

// Check all candidates
console.log('\n📊 TOTAL CANDIDATES:', db.prepare('SELECT COUNT(*) as c FROM candidates').get().c);

// Check by status
console.log('\nBy Status:');
const statuses = db.prepare("SELECT status, COUNT(*) as count FROM candidates GROUP BY status").all();
statuses.forEach(s => {
  console.log(`  ${s.status}: ${s.count}`);
});

console.log('\n');
