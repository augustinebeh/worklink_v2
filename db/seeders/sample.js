/**
 * Sample Data Seeder
 * Development-only data for testing and demo purposes
 * This includes sample clients, candidates, jobs, and deployments
 */

const { generateAvatar, IS_PRODUCTION } = require('../connection');

/**
 * Seed comprehensive sample data - ONLY in development
 * @param {Database} db - SQLite database instance
 */
function seedSampleData(db) {
  if (IS_PRODUCTION) {
    console.log('⚠️ Production environment - skipping sample data');
    return;
  }

  const candidateCount = db.prepare('SELECT COUNT(*) as c FROM candidates').get().c;
  if (candidateCount > 1) { // Skip if more than just demo account
    console.log('⚠️ Database already has data, skipping sample seed');
    return;
  }

  console.log('🌱 Seeding COMPREHENSIVE sample data for development...');

  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r.toISOString().split('T')[0]; };
  const today = new Date();

  // Client logos using company initials
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

  // 8 Clients
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
  clients.forEach(c => {
    db.prepare('INSERT INTO clients (id, company_name, uen, industry, contact_name, contact_email, contact_phone, logo_url, payment_terms, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(...c);
  });

  // 20 Candidates with profile photos
  const candidateData = [
    {name:'Muhammad Rizal',email:'rizal.m@email.com',phone:'+65 9234 5678',dob:'2003-07-22',joined:'2024-07-25'},
    {name:'Amanda Chen',email:'amanda.c@email.com',phone:'+65 9567 8901',dob:'2004-05-12',joined:'2024-08-05'},
    {name:'Ryan Ng',email:'ryan.ng@email.com',phone:'+65 9678 9012',dob:'2005-09-25',joined:'2024-08-15'},
    {name:'Nurul Aisyah',email:'nurul.a@email.com',phone:'+65 9789 0123',dob:'2003-12-03',joined:'2024-08-28'},
    {name:'Kevin Teo',email:'kevin.t@email.com',phone:'+65 9890 1234',dob:'2004-04-18',joined:'2024-09-10'},
    {name:'Jasmine Lim',email:'jasmine.l@email.com',phone:'+65 9901 2345',dob:'2005-08-07',joined:'2024-09-20'},
    {name:'Ahmad Faris',email:'ahmad.f@email.com',phone:'+65 9012 3456',dob:'2004-02-14',joined:'2024-10-01'},
    {name:'Priya Sharma',email:'priya.s@email.com',phone:'+65 9345 6789',dob:'2004-11-08',joined:'2024-10-15'},
    {name:'Daniel Wong',email:'daniel.w@email.com',phone:'+65 9111 2222',dob:'2003-06-20',joined:'2024-10-28'},
    {name:'Siti Aminah',email:'siti.a@email.com',phone:'+65 9222 3333',dob:'2005-01-30',joined:'2024-11-05'},
    {name:'Marcus Lee',email:'marcus.l@email.com',phone:'+65 9333 4444',dob:'2004-08-12',joined:'2024-11-18'},
    {name:'Rachel Koh',email:'rachel.k@email.com',phone:'+65 9444 5555',dob:'2003-04-25',joined:'2024-12-01'},
    {name:'Hafiz Rahman',email:'hafiz.r@email.com',phone:'+65 9555 6666',dob:'2005-10-08',joined:'2024-12-10'},
    {name:'Emily Tan',email:'emily.t@email.com',phone:'+65 9666 7777',dob:'2004-12-15',joined:'2024-12-20'},
    {name:'Wei Jie',email:'weijie@email.com',phone:'+65 9777 8888',dob:'2003-09-03',joined:'2025-01-05'},
    {name:'Aisha Binte',email:'aisha.b@email.com',phone:'+65 9888 9999',dob:'2005-07-18',joined:'2025-01-12'},
    {name:'Jonathan Sim',email:'jonathan.s@email.com',phone:'+65 9999 0000',dob:'2004-03-22',joined:'2025-01-20'},
    {name:'Mei Ling',email:'meiling@email.com',phone:'+65 9000 1111',dob:'2003-11-28',joined:'2025-01-25'},
    {name:'Arjun Patel',email:'arjun.p@email.com',phone:'+65 8111 2222',dob:'2005-05-05',joined:'2025-01-28'},
  ];

  const sources = ['direct', 'referral', 'social', 'walk-in', 'gebiz'];
  const generateReferralCode = (name) => name.split(' ')[0].toUpperCase().slice(0, 4) + Math.random().toString(36).substring(2, 6).toUpperCase();

  const candidates = [];
  candidateData.forEach((c, i) => {
    const id = `CND${String(i + 2).padStart(3, '0')}`; // Start from CND002 since CND001 is demo account
    const monthsActive = Math.max(0, Math.floor((today - new Date(c.joined)) / (1000 * 60 * 60 * 24 * 30)));
    const jobsCompleted = Math.max(0, Math.floor(monthsActive * 7 + Math.random() * 8 - 4));
    const xp = jobsCompleted * 120 + Math.floor(Math.random() * 400);
    const level = Math.min(10, Math.floor(xp / 1200) + 1);
    const earnings = jobsCompleted * 85 + Math.random() * 200;
    const incentives = Math.floor(jobsCompleted / 5) * 20;
    const certs = [];
    if (jobsCompleted >= 1) certs.push('Server Basics');
    if (jobsCompleted >= 10) certs.push('Food Safety');
    if (jobsCompleted >= 20) certs.push('Customer Service');
    const status = i < 15 ? 'active' : (i < 18 ? 'onboarding' : 'screening');
    const rating = jobsCompleted > 0 ? (4.2 + Math.random() * 0.8).toFixed(1) : 0;
    const referralCode = generateReferralCode(c.name);
    const profilePhoto = generateAvatar(c.name, 'avataaars');

    db.prepare(`
      INSERT INTO candidates (id, name, email, phone, date_of_birth, status, source, xp, level,
        streak_days, total_jobs_completed, certifications, referral_code, total_incentives_earned,
        total_earnings, rating, profile_photo, whatsapp_opted_in, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(id, c.name, c.email, c.phone, c.dob, status, sources[i % 5], xp, level,
           Math.floor(Math.random() * 12), jobsCompleted, JSON.stringify(certs), referralCode,
           incentives, earnings, rating, profilePhoto, c.joined);

    candidates.push({ id, joined: c.joined, status });

    // Add availability for next 14 days
    for (let d = 0; d < 14; d++) {
      if (Math.random() > 0.3) {
        const date = addDays(today, d);
        db.prepare('INSERT OR IGNORE INTO candidate_availability (candidate_id, date, status) VALUES (?, ?, ?)').run(id, date, 'available');
      }
    }
  });

  // Job templates
  const jobTemplates = [
    {title:'Banquet Server',charge:22,pay:15,hours:5},
    {title:'Event Usher',charge:18,pay:12,hours:6},
    {title:'Customer Service Rep',charge:16,pay:11,hours:8},
    {title:'Bartender',charge:25,pay:18,hours:5},
    {title:'F&B Service Crew',charge:20,pay:14,hours:6},
    {title:'Registration Crew',charge:15,pay:10,hours:8},
    {title:'Room Service',charge:19,pay:13,hours:7},
    {title:'Retail Assistant',charge:14,pay:10,hours:8},
  ];

  const insertJob = db.prepare(`INSERT INTO jobs (id, client_id, title, description, job_date, start_time, end_time, break_minutes, location, charge_rate, pay_rate, total_slots, filled_slots, xp_bonus, status, featured, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insertDep = db.prepare(`INSERT INTO deployments (id, job_id, candidate_id, status, hours_worked, charge_rate, pay_rate, gross_revenue, candidate_pay, gross_profit, incentive_amount, rating, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insertPay = db.prepare(`INSERT INTO payments (id, candidate_id, deployment_id, base_amount, incentive_amount, total_amount, hours_worked, status, paid_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`);

  let jobN = 1, depN = 1, payN = 1;

  // Monthly job counts showing business growth
  const monthlyJobs = {
    '2024-07': 3, '2024-08': 8, '2024-09': 15, '2024-10': 22,
    '2024-11': 30, '2024-12': 45, '2025-01': 38
  };

  Object.entries(monthlyJobs).forEach(([month, count]) => {
    for (let i = 0; i < count; i++) {
      const t = jobTemplates[Math.floor(Math.random() * jobTemplates.length)];
      const day = Math.floor(Math.random() * 28) + 1;
      const jobDate = `${month}-${String(day).padStart(2, '0')}`;
      const jobId = `JOB${String(jobN++).padStart(4, '0')}`;

      const availClients = clients.filter(c => c[10] <= jobDate);
      if (availClients.length === 0) continue;
      const client = availClients[Math.floor(Math.random() * availClients.length)];

      const slots = Math.floor(Math.random() * 5) + 2;
      const isPast = new Date(jobDate) < today;
      const chargeRate = t.charge + Math.floor(Math.random() * 4) - 2;
      const payRate = t.pay + Math.floor(Math.random() * 2) - 1;

      insertJob.run(jobId, client[0], t.title, `${t.title} at ${client[1]}`, jobDate, '18:00', '23:00', 30, client[1], chargeRate, payRate, slots, isPast ? slots : Math.floor(slots * 0.5), Math.random() > 0.7 ? 50 : 0, isPast ? 'completed' : 'open', Math.random() > 0.8 ? 1 : 0, addDays(jobDate, -3));

      if (isPast) {
        const availCands = candidates.filter(c => c.joined <= jobDate && c.status === 'active');
        const deployCands = availCands.sort(() => Math.random() - 0.5).slice(0, slots);

        deployCands.forEach(cand => {
          const hours = t.hours + (Math.random() - 0.5);
          const revenue = hours * chargeRate;
          const candPay = hours * payRate;
          const profit = revenue - candPay;
          const inc = Math.random() > 0.75 ? 5 : 0;
          const rating = Math.floor(Math.random() * 2) + 4;
          const depId = `DEP${String(depN++).padStart(5, '0')}`;

          insertDep.run(depId, jobId, cand.id, 'completed', hours.toFixed(2), chargeRate, payRate, revenue.toFixed(2), candPay.toFixed(2), profit.toFixed(2), inc, rating, jobDate);
          insertPay.run(`PAY${String(payN++).padStart(5, '0')}`, cand.id, depId, candPay.toFixed(2), inc, (candPay + inc).toFixed(2), hours.toFixed(2), 'paid', addDays(jobDate, 7), jobDate);
        });
      }
    }
  });

  // Upcoming jobs
  for (let i = 1; i <= 15; i++) {
    const t = jobTemplates[Math.floor(Math.random() * jobTemplates.length)];
    const client = clients[Math.floor(Math.random() * clients.length)];
    const jobDate = addDays(today, i + Math.floor(Math.random() * 5));
    insertJob.run(`JOB${String(jobN++).padStart(4, '0')}`, client[0], t.title, `${t.title} at ${client[1]}`, jobDate, '18:00', '23:00', 30, client[1], t.charge, t.pay, 5, 2, 50, 'open', Math.random() > 0.6 ? 1 : 0, addDays(jobDate, -3));
  }

  // Tenders
  const tenders = [
    ['TND001', 'gebiz', 'GBZ-2025-001234', 'Admin Support Staff', 'MOE', 'Manpower', 450000, addDays(today, 15), 'reviewing', 15, 12, 'Buona Vista', 22, 15, 37500, null, 65, 'STRONG BID'],
    ['TND002', 'gebiz', 'GBZ-2025-001198', 'Event Support National Day', 'MCCY', 'Events', 280000, addDays(today, 10), 'bidding', 50, 3, 'Marina Bay', 20, 13, 93333, null, 55, 'HIGH PRIORITY'],
    ['TND003', 'gebiz', 'GBZ-2025-001245', 'SingPass Customer Service', 'GovTech', 'Service', 620000, addDays(today, 20), 'new', 20, 24, 'Multiple', 18, 12, 25833, null, 40, 'EVALUATE'],
  ];
  tenders.forEach(t => {
    db.prepare(`INSERT INTO tenders (id, source, external_id, title, agency, category, estimated_value, closing_date, status, manpower_required, duration_months, location, estimated_charge_rate, estimated_pay_rate, estimated_monthly_revenue, our_bid_amount, win_probability, recommended_action) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(...t);
  });

  // Financial projections
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
    db.prepare('INSERT INTO financial_projections (month, year, projected_revenue, projected_costs, projected_profit, actual_revenue, actual_costs, actual_profit) VALUES (?,?,?,?,?,?,?,?)').run(...p);
  });

  // Referrals
  if (candidates.length > 5) {
    db.prepare('INSERT INTO referrals (id, referrer_id, referred_id, status, tier, bonus_amount, jobs_completed_by_referred, total_bonus_paid, created_at) VALUES (?,?,?,?,?,?,?,?,?)').run('REF001', candidates[0].id, candidates[2].id, 'bonus_paid', 1, 30, 5, 30, '2024-08-10');
    db.prepare('INSERT INTO referrals (id, referrer_id, referred_id, status, tier, bonus_amount, jobs_completed_by_referred, total_bonus_paid, created_at) VALUES (?,?,?,?,?,?,?,?,?)').run('REF002', candidates[1].id, candidates[4].id, 'bonus_paid', 2, 50, 8, 80, '2024-09-01');
  }

  // Candidate achievements
  candidates.filter(c => c.status === 'active').slice(0, 12).forEach((c, i) => {
    db.prepare(`INSERT OR IGNORE INTO candidate_achievements VALUES (?, 'ACH_IRONCLAD_1', datetime('now', '-30 days'), 0, NULL)`).run(c.id);
    if (i < 8) db.prepare(`INSERT OR IGNORE INTO candidate_achievements VALUES (?, 'ACH_EARLY_BIRD', datetime('now', '-15 days'), 0, NULL)`).run(c.id);
    if (i < 4) db.prepare(`INSERT OR IGNORE INTO candidate_achievements VALUES (?, 'ACH_FIVE_STAR', datetime('now', '-5 days'), 0, NULL)`).run(c.id);
  });

  // Sample Telegram groups
  const sampleGroups = [
    ['-1001234567890', 'SG Part-Time Jobs', 'Test group for job posting', 'job_posting', 1250, 1],
    ['-1001234567891', 'F&B Workers SG', 'F&B focused job group', 'job_posting', 890, 1],
    ['-1001234567892', 'Warehouse Jobs Singapore', 'Warehouse and logistics jobs', 'job_posting', 675, 1],
  ];

  sampleGroups.forEach(g => {
    db.prepare(`
      INSERT OR IGNORE INTO telegram_groups (chat_id, name, description, type, member_count, active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(...g);
  });

  console.log(`✅ Comprehensive data seeded: ${candidates.length} candidates, ${clients.length} clients, ${jobN - 1} jobs`);
}

/**
 * Reset database (dev only)
 * @param {Database} db - SQLite database instance
 */
function resetToSampleData(db) {
  if (IS_PRODUCTION) {
    console.log('❌ Cannot reset in production');
    return;
  }

  console.log('🔄 Resetting database...');
  const tables = [
    'push_queue', 'job_match_scores', 'notifications', 'messages', 'tender_matches',
    'xp_transactions', 'candidate_quests', 'candidate_achievements', 'candidate_availability',
    'reward_purchases', 'rewards',
    'payments', 'deployments', 'jobs', 'referrals', 'candidates', 'clients',
    'tenders', 'financial_projections', 'tender_alerts', 'referral_tiers',
    'message_templates', 'incentive_schemes', 'training', 'quests', 'achievements',
    'admin_onboarding', 'admin_achievements'
  ];

  tables.forEach(table => {
    try {
      db.prepare(`DELETE FROM ${table}`).run();
    } catch (e) {
      console.warn(`Warning deleting ${table}:`, e.message);
    }
  });

  // Re-seed fresh data
  const { seedEssentialData, ensureDemoAccount } = require('./essential');
  seedEssentialData(db);
  ensureDemoAccount(db);
  seedSampleData(db);

  console.log('✅ Database reset complete');
}

module.exports = {
  seedSampleData,
  resetToSampleData
};