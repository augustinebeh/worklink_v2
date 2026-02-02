const { db } = require('./db/database.js');

console.log('=== INVESTIGATING FAILED TESTS ===\n');

console.log('1. Clients count:');
console.log(db.prepare('SELECT COUNT(*) as count FROM clients').get());

console.log('\n2. Jobs count:');
console.log(db.prepare('SELECT COUNT(*) as count FROM jobs').get());

console.log('\n3. Deployments count:');
console.log(db.prepare('SELECT COUNT(*) as count FROM deployments').get());

console.log('\n4. Sample achievement with requirement_type:');
console.log(db.prepare('SELECT * FROM achievements LIMIT 3').all());

console.log('\n5. Check for orphan payments:');
console.log(db.prepare(`
  SELECT COUNT(*) as orphan_payments FROM payments p
  LEFT JOIN deployments d ON p.deployment_id = d.id
  WHERE d.id IS NULL
`).get());

console.log('\n6. Check for orphan deployments:');
console.log(db.prepare(`
  SELECT COUNT(*) as orphan_deployments FROM deployments d
  LEFT JOIN jobs j ON d.job_id = j.id
  LEFT JOIN candidates c ON d.candidate_id = c.id
  WHERE j.id IS NULL OR c.id IS NULL
`).get());

console.log('\n7. Check specific data in payments without deployments:');
const orphanPayments = db.prepare(`
  SELECT p.id, p.deployment_id FROM payments p
  LEFT JOIN deployments d ON p.deployment_id = d.id
  WHERE d.id IS NULL LIMIT 5
`).all();
console.log(orphanPayments);

console.log('\n8. Table structure for achievements:');
console.log(db.prepare('PRAGMA table_info(achievements)').all());

console.log('\n9. Check what data exists:');
console.log('Candidates:', db.prepare('SELECT COUNT(*) as c FROM candidates').get().c);
console.log('Jobs:', db.prepare('SELECT COUNT(*) as c FROM jobs').get().c);
console.log('Deployments:', db.prepare('SELECT COUNT(*) as c FROM deployments').get().c);
console.log('Payments:', db.prepare('SELECT COUNT(*) as c FROM payments').get().c);

console.log('\n10. Check if demo data was actually seeded:');
const demoCandidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get('sarah.tan@email.com');
console.log('Demo candidate exists:', !!demoCandidate);