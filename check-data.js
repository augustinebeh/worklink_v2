#!/usr/bin/env node
/**
 * Quick check of database sample data
 */

const { db } = require('./db');

console.log('\n📊 DATABASE SAMPLE DATA SUMMARY\n');
console.log('=' .repeat(50));

const tables = [
  { name: 'Clients', table: 'clients' },
  { name: 'Candidates', table: 'candidates' },
  { name: 'Jobs', table: 'jobs' },
  { name: 'Deployments', table: 'deployments' },
  { name: 'Payments', table: 'payments' },
  { name: 'Messages', table: 'messages' },
  { name: 'Achievements', table: 'achievements' },
  { name: 'Quests', table: 'quests' }
];

tables.forEach(({ name, table }) => {
  try {
    const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
    console.log(`${name.padEnd(20)} ${result.count.toString().padStart(6)}`);
  } catch (e) {
    console.log(`${name.padEnd(20)} ERROR`);
  }
});

console.log('=' .repeat(50));

// Show sample clients
console.log('\n🏢 SAMPLE CLIENTS:\n');
try {
  const clients = db.prepare('SELECT company_name, industry, contact_name FROM clients LIMIT 5').all();
  clients.forEach(c => {
    console.log(`  • ${c.company_name.padEnd(25)} (${c.industry})`);
  });
  if (clients.length === 0) {
    console.log('  (No clients yet)');
  }
} catch (e) {
  console.log('  Error reading clients');
}

// Show sample candidates
console.log('\n👥 SAMPLE CANDIDATES:\n');
try {
  const candidates = db.prepare('SELECT name, status FROM candidates LIMIT 5').all();
  candidates.forEach(c => {
    console.log(`  • ${c.name.padEnd(25)} [${c.status}]`);
  });
  if (candidates.length === 0) {
    console.log('  (No candidates yet)');
  }
} catch (e) {
  console.log('  Error reading candidates');
}

console.log('\n');
