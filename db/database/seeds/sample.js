/**
 * Sample Data Seeding
 * Seeds development data for testing and demo purposes
 * Only runs in development environment (not production)
 * 
 * @module database/seeds/sample
 */

const { db, IS_PRODUCTION } = require('../config');
const { generateAvatar, addDays, formatDate, randomInt, randomFloat, randomElement, generateId } = require('../utils');

/**
 * Seed sample data for development
 * Safe to run multiple times - checks for existing data
 */
function seedSampleData() {
  if (IS_PRODUCTION) {
    console.log('⏭️  Skipping sample data (production environment)');
    return;
  }

  console.log('🌱 Seeding sample data for development...');

  const candidateCount = db.prepare('SELECT COUNT(*) as c FROM candidates').get().c;
  
  // Skip if we already have sample data
  if (candidateCount > 2) {
    console.log('  ⏭️  Sample data already exists');
    return;
  }

  seedClients();
  seedCandidates();
  seedJobs();
  seedTenders();
  seedFinancialProjections();

  console.log('✅ Sample data seeding complete');
}

// Seed clients
function seedClients() {
  const clients = [
    ['CLI001', 'Marina Bay Sands', '201225632M', 'Hospitality', 'John Lim', 'john@mbs.com', '65123456'],
    ['CLI002', 'Changi Airport Group', '198900779N', 'Aviation', 'Sarah Wong', 'sarah@changi.com', '65234567'],
    ['CLI003', 'Sentosa Development Corp', '199500388Z', 'Tourism', 'David Tan', 'david@sentosa.com', '65345678'],
  ];
  
  clients.forEach(c => {
    db.prepare(`INSERT OR IGNORE INTO clients (id, company_name, uen, industry, contact_name, contact_email, contact_phone) 
                VALUES (?,?,?,?,?,?,?)`).run(...c);
  });
  console.log(`  ✅ Seeded ${clients.length} clients`);
}

// Seed candidates
function seedCandidates() {
  const names = ['Alex Ng', 'Ben Chua', 'Cindy Lee', 'Daniel Koh', 'Emma Lim', 'Frank Tan', 'Grace Wong'];
  
  names.forEach((name, i) => {
    const id = generateId('CND', i + 100, 3);
    const email = `${name.toLowerCase().replace(' ', '.')}@email.com`;
    const xp = randomInt(1000, 20000);
    
    db.prepare(`INSERT OR IGNORE INTO candidates 
      (id, name, email, phone, status, xp, lifetime_xp, level, total_jobs_completed, rating, profile_photo, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now', '-' || ? || ' days'))`)
      .run(id, name, email, `+659${randomInt(1000, 9999)}${randomInt(1000, 9999)}`, 
           'active', xp, xp, Math.floor(xp / 2000) + 1, randomInt(5, 50), randomFloat(4.2, 5.0), 
           generateAvatar(name), randomInt(30, 180));
  });
  console.log(`  ✅ Seeded ${names.length} candidates`);
}

// Seed jobs
function seedJobs() {
  const today = new Date();
  const jobTemplates = [
    { title: 'F&B Server', charge: 25, pay: 15, hours: 8 },
    { title: 'Event Crew', charge: 28, pay: 16, hours: 6 },
    { title: 'Warehouse Packer', charge: 22, pay: 14, hours: 8 },
  ];

  for (let i = 0; i < 10; i++) {
    const template = randomElement(jobTemplates);
    const jobDate = addDays(today, randomInt(-30, 30));
    const jobId = generateId('JOB', i + 1, 4);
    const clientId = randomElement(['CLI001', 'CLI002', 'CLI003']);
    
    db.prepare(`INSERT OR IGNORE INTO jobs 
      (id, client_id, title, description, job_date, start_time, end_time, location, charge_rate, pay_rate, total_slots, filled_slots, status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(jobId, clientId, template.title, `${template.title} position`, jobDate, '09:00', '17:00',
           randomElement(['Marina Bay', 'Orchard', 'Sentosa']), template.charge, template.pay, 5, randomInt(0, 5),
           new Date(jobDate) < today ? 'completed' : 'open');
  }
  console.log('  ✅ Seeded 10 jobs');
}

// Seed tenders
function seedTenders() {
  const today = new Date();
  const tenders = [
    ['TND001', 'gebiz', 'GBZ-2025-001234', 'Admin Support Staff', 'MOE', 'Manpower', 450000, addDays(today, 15), 'reviewing', 15, 12],
    ['TND002', 'gebiz', 'GBZ-2025-001198', 'Event Support National Day', 'MCCY', 'Events', 280000, addDays(today, 10), 'bidding', 50, 3],
    ['TND003', 'gebiz', 'GBZ-2025-001245', 'SingPass Customer Service', 'GovTech', 'Service', 620000, addDays(today, 20), 'new', 20, 24],
  ];
  
  tenders.forEach(t => {
    db.prepare(`INSERT OR IGNORE INTO tenders 
      (id, source, external_id, title, agency, category, estimated_value, closing_date, status, manpower_required, duration_months)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(...t);
  });
  console.log('  ✅ Seeded 3 tenders');
}

// Seed financial projections
function seedFinancialProjections() {
  const projections = [
    ['2024-07', 2024, 2000, 1400, 600, 1850, 1295, 555],
    ['2024-08', 2024, 5000, 3500, 1500, 5200, 3640, 1560],
    ['2024-09', 2024, 9000, 6300, 2700, 9800, 6860, 2940],
    ['2024-10', 2024, 14000, 9800, 4200, 15200, 10640, 4560],
    ['2024-11', 2024, 20000, 14000, 6000, 22500, 15750, 6750],
    ['2024-12', 2024, 30000, 21000, 9000, 35200, 24640, 10560],
    ['2025-01', 2025, 28000, 19600, 8400, 26500, 18550, 7950],
  ];
  
  projections.forEach(p => {
    db.prepare(`INSERT OR IGNORE INTO financial_projections 
      (month, year, projected_revenue, projected_costs, projected_profit, actual_revenue, actual_costs, actual_profit)
      VALUES (?,?,?,?,?,?,?,?)`).run(...p);
  });
  console.log('  ✅ Seeded 7 financial projections');
}

module.exports = { seedSampleData };
