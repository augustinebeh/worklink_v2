#!/usr/bin/env node
/**
 * Database Re-seeding Script
 * Forces sample data to be seeded even if candidates exist
 *
 * Usage:
 *   node reseed-database.js              # Interactive prompt
 *   node reseed-database.js --force      # Skip prompt, reseed immediately
 *   node reseed-database.js --clear      # Clear all data and reseed
 */

const Database = require('better-sqlite3');
const path = require('path');
const readline = require('readline');

const DB_PATH = path.join(__dirname, 'data', 'worklink.db');
const args = process.argv.slice(2);
const force = args.includes('--force');
const clear = args.includes('--clear');

console.log('🔧 WorkLink Database Re-seeding Tool');
console.log('=====================================\n');

const db = new Database(DB_PATH);

// Check current state
const counts = {
  candidates: db.prepare('SELECT COUNT(*) as c FROM candidates').get().c,
  jobs: db.prepare('SELECT COUNT(*) as c FROM jobs').get().c,
  clients: db.prepare('SELECT COUNT(*) as c FROM clients').get().c,
  deployments: db.prepare('SELECT COUNT(*) as c FROM deployments').get().c,
  payments: db.prepare('SELECT COUNT(*) as c FROM payments').get().c,
};

console.log('📊 Current Database State:');
console.log(`  Candidates:  ${counts.candidates}`);
console.log(`  Jobs:        ${counts.jobs}`);
console.log(`  Clients:     ${counts.clients}`);
console.log(`  Deployments: ${counts.deployments}`);
console.log(`  Payments:    ${counts.payments}`);
console.log('');

if (counts.jobs === 0 || counts.clients === 0) {
  console.log('⚠️  ISSUE DETECTED: Jobs and/or Clients tables are empty!');
  console.log('   This prevents the admin portal from functioning properly.\n');
}

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function main() {
  if (!force) {
    console.log('⚠️  This script will seed jobs, clients, and deployments data.');

    if (clear) {
      console.log('🗑️  --clear flag detected: ALL DATA WILL BE DELETED FIRST!\n');
      const confirm = await prompt('Are you sure? Type "yes" to continue: ');
      if (confirm !== 'yes') {
        console.log('❌ Cancelled by user');
        db.close();
        process.exit(0);
      }
    } else if (counts.jobs > 0 || counts.clients > 0) {
      console.log('⚠️  Database already has some data. Continuing will ADD MORE data.\n');
      const confirm = await prompt('Continue? (yes/no): ');
      if (confirm !== 'yes') {
        console.log('❌ Cancelled by user');
        db.close();
        process.exit(0);
      }
    }
  }

  console.log('\n🚀 Starting re-seed process...\n');

  // Clear data if requested
  if (clear) {
    console.log('🗑️  Clearing existing data...');
    db.prepare('DELETE FROM payments').run();
    db.prepare('DELETE FROM deployments').run();
    db.prepare('DELETE FROM jobs').run();
    db.prepare('DELETE FROM clients').run();
    db.prepare('DELETE FROM xp_transactions').run();

    // Keep candidates, achievements, rewards, quests
    console.log('   ✅ Cleared: jobs, clients, deployments, payments, xp_transactions');
    console.log('   ℹ️  Kept: candidates, achievements, rewards, quests\n');
  }

  // Import and run sample seeder
  const { generateAvatar } = require('./db/connection');

  console.log('🌱 Seeding sample data...\n');

  // Seed Clients
  console.log('📋 Seeding Clients...');
  const clientLogos = {
    'Marina Bay Sands': 'https://api.dicebear.com/7.x/initials/svg?seed=MBS&backgroundColor=0d6efd',
    'Changi Airport Group': 'https://api.dicebear.com/7.x/initials/svg?seed=CAG&backgroundColor=198754',
    'Resorts World Sentosa': 'https://api.dicebear.com/7.x/initials/svg?seed=RWS&backgroundColor=dc3545',
    'Grand Hyatt Singapore': 'https://api.dicebear.com/7.x/initials/svg?seed=GH&backgroundColor=6f42c1',
    'Singapore Expo': 'https://api.dicebear.com/7.x/initials/svg?seed=SE&backgroundColor=fd7e14',
    'Mandarin Oriental': 'https://api.dicebear.com/7.x/initials/svg?seed=MO&backgroundColor=20c997',
    'CapitaLand Mall': 'https://api.dicebear.com/7.x/initials/svg?seed=CL&backgroundColor=0dcaf0',
    'Gardens by the Bay': 'https://api.dicebear.com/7.x/initials/svg?seed=GBTB&backgroundColor=198754',
  };

  const clients = [
    ['CLT001', 'Marina Bay Sands', '200604327R', 'Hospitality', 'Jennifer Lim', 'events@mbs.com', '+65 6688 8888', clientLogos['Marina Bay Sands'], 30, 'active', '2024-07-15'],
    ['CLT002', 'Changi Airport Group', '200902638D', 'Aviation', 'David Tan', 'hr@changi.com', '+65 6595 6868', clientLogos['Changi Airport Group'], 30, 'active', '2024-08-01'],
    ['CLT003', 'Resorts World Sentosa', '200601402R', 'Entertainment', 'Michelle Wong', 'events@rws.com', '+65 6577 8888', clientLogos['Resorts World Sentosa'], 30, 'active', '2024-08-20'],
    ['CLT004', 'Grand Hyatt Singapore', '197100403R', 'Hospitality', 'Andrew Lee', 'hr@grandhyatt.sg', '+65 6738 1234', clientLogos['Grand Hyatt Singapore'], 30, 'active', '2024-09-10'],
    ['CLT005', 'Singapore Expo', '199703626Z', 'Events', 'Sarah Chen', 'ops@expo.com', '+65 6403 2160', clientLogos['Singapore Expo'], 30, 'active', '2024-10-01'],
    ['CLT006', 'Mandarin Oriental', '198702333H', 'Hospitality', 'Patricia Goh', 'events@mo.com', '+65 6338 0066', clientLogos['Mandarin Oriental'], 30, 'active', '2024-11-15'],
    ['CLT007', 'CapitaLand Mall', '200208877K', 'Retail', 'Kenny Ong', 'retail@cland.com', '+65 6713 2888', clientLogos['CapitaLand Mall'], 30, 'active', '2024-12-01'],
    ['CLT008', 'Gardens by the Bay', '201110689R', 'Tourism', 'Linda Tay', 'events@gbtb.com', '+65 6420 6848', clientLogos['Gardens by the Bay'], 30, 'active', '2025-01-10'],
  ];

  const insertClient = db.prepare(`
    INSERT OR REPLACE INTO clients (id, company_name, uen, industry, contact_name, contact_email, contact_phone, logo_url, payment_terms, status, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `);

  clients.forEach(c => insertClient.run(...c));
  console.log(`   ✅ Seeded ${clients.length} clients\n`);

  // Seed Jobs
  console.log('💼 Seeding Jobs...');
  const jobTitles = ['Bartender', 'Customer Service Rep', 'F&B Service Crew', 'Event Usher', 'Retail Assistant', 'Registration Crew', 'Banquet Server', 'Room Service'];
  const locations = ['Marina Bay Sands', 'Changi Airport Group', 'Resorts World Sentosa', 'Grand Hyatt Singapore', 'Singapore Expo', 'Mandarin Oriental', 'CapitaLand Mall', 'Gardens by the Bay'];

  const insertJob = db.prepare(`
    INSERT OR REPLACE INTO jobs (id, client_id, title, description, job_date, start_time, end_time, break_minutes, location, charge_rate, pay_rate, total_slots, filled_slots, required_skills, xp_bonus, status, featured, urgent, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  let jobCount = 0;
  const startDate = new Date('2024-07-25');
  const today = new Date();

  // Past jobs (completed)
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + Math.floor(Math.random() * 3) + 1)) {
    if (jobCount >= 150) break;

    const jobId = `JOB${String(jobCount + 1).padStart(4, '0')}`;
    const clientId = `CLT${String(Math.floor(Math.random() * 8) + 1).padStart(3, '0')}`;
    const title = jobTitles[Math.floor(Math.random() * jobTitles.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const chargeRate = 12 + Math.floor(Math.random() * 18);
    const payRate = Math.floor(chargeRate * 0.65);
    const slots = Math.floor(Math.random() * 3) + 2;

    insertJob.run(
      jobId,
      clientId,
      title,
      `${title} at ${location}`,
      d.toISOString().split('T')[0],
      '18:00',
      '23:00',
      30,
      location,
      chargeRate,
      payRate,
      slots,
      slots, // Filled (past jobs are complete)
      '[]',
      50,
      'completed',
      0,
      0,
      d.toISOString()
    );

    jobCount++;
  }

  // Future jobs (open)
  for (let i = 0; i < 15; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + i + 3);

    const jobId = `JOB${String(jobCount + 1).padStart(4, '0')}`;
    const clientId = `CLT${String(Math.floor(Math.random() * 8) + 1).padStart(3, '0')}`;
    const title = jobTitles[Math.floor(Math.random() * jobTitles.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const chargeRate = 12 + Math.floor(Math.random() * 18);
    const payRate = Math.floor(chargeRate * 0.65);
    const slots = Math.floor(Math.random() * 3) + 2;
    const filled = Math.floor(Math.random() * (slots + 1));

    insertJob.run(
      jobId,
      clientId,
      title,
      `${title} at ${location}`,
      futureDate.toISOString().split('T')[0],
      '18:00',
      '23:00',
      30,
      location,
      chargeRate,
      payRate,
      slots,
      filled,
      '[]',
      50,
      'open',
      i % 3 === 0 ? 1 : 0, // Some featured
      i % 5 === 0 ? 1 : 0, // Some urgent
      new Date().toISOString()
    );

    jobCount++;
  }

  console.log(`   ✅ Seeded ${jobCount} jobs (${jobCount - 15} completed, 15 open)\n`);

  // Get active candidates for deployments
  const activeCandidates = db.prepare(`
    SELECT id FROM candidates WHERE status = 'active' LIMIT 15
  `).all();

  if (activeCandidates.length === 0) {
    console.log('⚠️  No active candidates found, skipping deployments\n');
  } else {
    // Seed Deployments for completed jobs
    console.log('👷 Seeding Deployments...');
    const completedJobs = db.prepare(`
      SELECT id, charge_rate, pay_rate FROM jobs WHERE status = 'completed'
    `).all();

    const insertDeployment = db.prepare(`
      INSERT OR REPLACE INTO deployments (id, job_id, candidate_id, status, hours_worked, charge_rate, pay_rate, gross_revenue, candidate_pay, gross_profit, incentive_amount, rating, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);

    const insertPayment = db.prepare(`
      INSERT OR REPLACE INTO payments (id, candidate_id, deployment_id, base_amount, incentive_amount, total_amount, hours_worked, status, paid_at, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `);

    let deploymentCount = 0;
    let paymentCount = 0;

    completedJobs.forEach((job, idx) => {
      // Random number of deployments per job (2-5 workers)
      const workersNeeded = Math.floor(Math.random() * 4) + 2;

      for (let w = 0; w < Math.min(workersNeeded, activeCandidates.length); w++) {
        const candidate = activeCandidates[Math.floor(Math.random() * activeCandidates.length)];
        const hours = 4 + Math.random() * 5; // 4-9 hours
        const revenue = job.charge_rate * hours;
        const pay = job.pay_rate * hours;
        const profit = revenue - pay;
        const incentive = Math.random() < 0.2 ? 5 : 0; // 20% chance of incentive
        const rating = Math.floor(Math.random() * 2) + 4; // 4-5 stars

        const depId = `DEP${String(deploymentCount + 1).padStart(5, '0')}`;
        const payId = `PAY${String(paymentCount + 1).padStart(5, '0')}`;

        const createdAt = new Date(startDate.getTime() + idx * 24 * 60 * 60 * 1000);

        insertDeployment.run(
          depId,
          job.id,
          candidate.id,
          'completed',
          hours.toFixed(2),
          job.charge_rate,
          job.pay_rate,
          revenue.toFixed(2),
          pay.toFixed(2),
          profit.toFixed(2),
          incentive,
          rating,
          createdAt.toISOString()
        );

        // Create payment
        const paymentStatus = Math.random() < 0.95 ? 'paid' : 'pending';
        const paidAt = paymentStatus === 'paid' ? new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString() : null;

        insertPayment.run(
          payId,
          candidate.id,
          depId,
          pay.toFixed(2),
          incentive,
          (pay + incentive).toFixed(2),
          hours.toFixed(2),
          paymentStatus,
          paidAt,
          createdAt.toISOString()
        );

        deploymentCount++;
        paymentCount++;
      }
    });

    console.log(`   ✅ Seeded ${deploymentCount} deployments`);
    console.log(`   ✅ Seeded ${paymentCount} payments\n`);
  }

  // Final counts
  const newCounts = {
    candidates: db.prepare('SELECT COUNT(*) as c FROM candidates').get().c,
    jobs: db.prepare('SELECT COUNT(*) as c FROM jobs').get().c,
    clients: db.prepare('SELECT COUNT(*) as c FROM clients').get().c,
    deployments: db.prepare('SELECT COUNT(*) as c FROM deployments').get().c,
    payments: db.prepare('SELECT COUNT(*) as c FROM payments').get().c,
  };

  console.log('✅ Re-seeding complete!\n');
  console.log('📊 Updated Database State:');
  console.log(`  Candidates:  ${newCounts.candidates} ${newCounts.candidates !== counts.candidates ? `(+${newCounts.candidates - counts.candidates})` : ''}`);
  console.log(`  Jobs:        ${newCounts.jobs} ${newCounts.jobs !== counts.jobs ? `(+${newCounts.jobs - counts.jobs})` : ''}`);
  console.log(`  Clients:     ${newCounts.clients} ${newCounts.clients !== counts.clients ? `(+${newCounts.clients - counts.clients})` : ''}`);
  console.log(`  Deployments: ${newCounts.deployments} ${newCounts.deployments !== counts.deployments ? `(+${newCounts.deployments - counts.deployments})` : ''}`);
  console.log(`  Payments:    ${newCounts.payments} ${newCounts.payments !== counts.payments ? `(+${newCounts.payments - counts.payments})` : ''}`);
  console.log('');
  console.log('🎉 Database is now ready for admin portal testing!');

  db.close();
}

main().catch(err => {
  console.error('❌ Error:', err);
  db.close();
  process.exit(1);
});
