/**
 * TalentVis Database - Complete Schema with Historical Data
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'talentvis.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
console.log('🔌 Database path:', DB_PATH);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE, phone TEXT,
      date_of_birth DATE, nric_last4 TEXT, status TEXT DEFAULT 'lead',
      source TEXT DEFAULT 'direct', xp INTEGER DEFAULT 0, level INTEGER DEFAULT 1,
      streak_days INTEGER DEFAULT 0, total_jobs_completed INTEGER DEFAULT 0,
      certifications TEXT DEFAULT '[]', skills TEXT DEFAULT '[]',
      referral_code TEXT UNIQUE, referred_by TEXT,
      total_incentives_earned REAL DEFAULT 0, total_earnings REAL DEFAULT 0,
      rating REAL DEFAULT 0, profile_photo TEXT, bank_name TEXT, bank_account TEXT,
      online_status TEXT DEFAULT 'offline', last_seen DATETIME,
      push_token TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY, company_name TEXT NOT NULL, uen TEXT, industry TEXT,
      contact_name TEXT, contact_email TEXT, contact_phone TEXT,
      payment_terms INTEGER DEFAULT 30, status TEXT DEFAULT 'active',
      notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY, client_id TEXT, title TEXT NOT NULL, description TEXT,
      job_date DATE, start_time TEXT, end_time TEXT, break_minutes INTEGER DEFAULT 0,
      location TEXT, charge_rate REAL NOT NULL, pay_rate REAL NOT NULL,
      total_slots INTEGER DEFAULT 1, filled_slots INTEGER DEFAULT 0,
      xp_bonus INTEGER DEFAULT 0, status TEXT DEFAULT 'open', featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );
    CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY, job_id TEXT, candidate_id TEXT,
      status TEXT DEFAULT 'assigned', hours_worked REAL,
      charge_rate REAL, pay_rate REAL, gross_revenue REAL,
      candidate_pay REAL, gross_profit REAL, incentive_amount REAL DEFAULT 0,
      rating INTEGER, feedback TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY, candidate_id TEXT, deployment_id TEXT,
      base_amount REAL, incentive_amount REAL DEFAULT 0, total_amount REAL,
      hours_worked REAL, status TEXT DEFAULT 'pending',
      paid_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );
    CREATE TABLE IF NOT EXISTS incentive_schemes (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, type TEXT,
      trigger_type TEXT, trigger_value INTEGER, reward_type TEXT,
      reward_value REAL, max_reward REAL, min_gross_margin_percent REAL DEFAULT 20,
      active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tenders (
      id TEXT PRIMARY KEY, source TEXT NOT NULL, external_id TEXT, title TEXT NOT NULL,
      agency TEXT, category TEXT, estimated_value REAL, closing_date DATETIME,
      status TEXT DEFAULT 'new', manpower_required INTEGER, duration_months INTEGER,
      location TEXT, estimated_charge_rate REAL, estimated_pay_rate REAL,
      estimated_monthly_revenue REAL, our_bid_amount REAL, win_probability INTEGER,
      recommended_action TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, icon TEXT,
      category TEXT, requirement_type TEXT, requirement_value INTEGER,
      xp_reward INTEGER DEFAULT 0, rarity TEXT DEFAULT 'common'
    );
    CREATE TABLE IF NOT EXISTS candidate_achievements (
      candidate_id TEXT, achievement_id TEXT, unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (candidate_id, achievement_id)
    );
    CREATE TABLE IF NOT EXISTS quests (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, type TEXT,
      requirement TEXT, xp_reward INTEGER DEFAULT 0, active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS training (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
      duration_minutes INTEGER, certification_name TEXT, xp_reward INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS financial_projections (
      id INTEGER PRIMARY KEY AUTOINCREMENT, month TEXT, year INTEGER,
      projected_revenue REAL, projected_costs REAL, projected_profit REAL,
      actual_revenue REAL, actual_costs REAL, actual_profit REAL
    );
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY, referrer_id TEXT, referred_id TEXT,
      status TEXT DEFAULT 'pending', bonus_amount REAL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, candidate_id TEXT, sender TEXT,
      content TEXT, template_id TEXT, read INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS message_templates (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT,
      content TEXT NOT NULL, variables TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT, candidate_id TEXT, type TEXT,
      title TEXT, message TEXT, read INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Schema created successfully');
}

function seedData() {
  const count = db.prepare('SELECT COUNT(*) as c FROM candidates').get().c;
  if (count > 0) { console.log('⚠️ Database already has data, skipping seed'); return; }
  
  console.log('🌱 Seeding comprehensive historical data...');
  
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r.toISOString().split('T')[0]; };
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Incentive Schemes
  db.prepare(`INSERT INTO incentive_schemes VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`).run('INC001','Consistency Bonus','5+ jobs/month bonus','consistency','monthly_jobs',5,'fixed',20,50,20,1);
  db.prepare(`INSERT INTO incentive_schemes VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`).run('INC002','Perfect Rating','5-star rating bonus','performance','rating',5,'fixed',5,5,20,1);
  db.prepare(`INSERT INTO incentive_schemes VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`).run('INC003','Referral Bonus','Refer a friend','referral','referral',1,'fixed',30,30,20,1);

  // Achievements
  const achs = [
    ['ACH001','First Steps','Complete your first job','🎯','jobs','jobs_completed',1,100,'common'],
    ['ACH002','Getting Started','Complete 5 jobs','⭐','jobs','jobs_completed',5,250,'common'],
    ['ACH003','Dedicated Worker','Complete 25 jobs','💪','jobs','jobs_completed',25,500,'rare'],
    ['ACH004','Job Master','Complete 100 jobs','🏆','milestone','jobs_completed',100,1500,'epic'],
    ['ACH005','Week Warrior','7-day streak','🔥','streak','streak',7,200,'rare'],
    ['ACH006','First Cert','Complete first training','📚','training','training',1,150,'common'],
  ];
  achs.forEach(a => db.prepare(`INSERT INTO achievements VALUES (?,?,?,?,?,?,?,?,?)`).run(...a));

  // Quests
  db.prepare(`INSERT INTO quests VALUES (?,?,?,?,?,?,?)`).run('QST001','Daily Check-in','Log in today','daily','{"type":"login"}',10,1);
  db.prepare(`INSERT INTO quests VALUES (?,?,?,?,?,?,?)`).run('QST002','Complete a Job','Finish any job','weekly','{"type":"job"}',150,1);
  db.prepare(`INSERT INTO quests VALUES (?,?,?,?,?,?,?)`).run('QST003','Refer a Friend','Invite someone','special','{"type":"referral"}',300,1);

  // Training
  db.prepare(`INSERT INTO training VALUES (?,?,?,?,?,?)`).run('TRN001','Server Basics','F&B service fundamentals',45,'Server Basics',150);
  db.prepare(`INSERT INTO training VALUES (?,?,?,?,?,?)`).run('TRN002','Food Safety','Food handling cert',60,'Food Safety',200);
  db.prepare(`INSERT INTO training VALUES (?,?,?,?,?,?)`).run('TRN003','Customer Service','Customer interactions',30,'Customer Service',100);
  db.prepare(`INSERT INTO training VALUES (?,?,?,?,?,?)`).run('TRN004','Bartending','Bartending skills',90,'Bartending',250);

  // Clients (progressively onboarded)
  const clients = [
    ['CLT001','Marina Bay Sands','200604327R','Hospitality','Jennifer Lim','events@mbs.com','+65 6688 8888',30,'active','2024-07-15'],
    ['CLT002','Changi Airport Group','200902638D','Aviation','David Tan','hr@changi.com','+65 6595 6868',30,'active','2024-08-01'],
    ['CLT003','Resorts World Sentosa','200601402R','Entertainment','Michelle Wong','events@rws.com','+65 6577 8888',30,'active','2024-08-20'],
    ['CLT004','Grand Hyatt Singapore','197100403R','Hospitality','Andrew Lee','hr@grandhyatt.sg','+65 6738 1234',30,'active','2024-09-10'],
    ['CLT005','Singapore Expo','199703626Z','Events','Sarah Chen','ops@expo.com','+65 6403 2160',30,'active','2024-10-01'],
    ['CLT006','Mandarin Oriental','198702333H','Hospitality','Patricia Goh','events@mo.com','+65 6338 0066',30,'active','2024-11-15'],
    ['CLT007','CapitaLand Mall','200208877K','Retail','Kenny Ong','retail@cland.com','+65 6713 2888',30,'active','2024-12-01'],
    ['CLT008','Gardens by the Bay','201110689R','Tourism','Linda Tay','events@gbtb.com','+65 6420 6848',30,'active','2025-01-10'],
  ];
  clients.forEach(c => db.prepare(`INSERT INTO clients VALUES (?,?,?,?,?,?,?,?,?,NULL,?)`).run(...c));

  // Candidates (growing pool over time)
  const candidateData = [
    {name:'Sarah Tan',email:'sarah.tan@email.com',phone:'+65 9123 4567',dob:'2005-03-15',joined:'2024-07-20'},
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

  const sources = ['direct','referral','social','walk-in','gebiz'];
  const insertCandidate = db.prepare(`INSERT INTO candidates (id,name,email,phone,date_of_birth,status,source,xp,level,streak_days,total_jobs_completed,certifications,referral_code,total_incentives_earned,total_earnings,rating,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  
  const candidates = [];
  candidateData.forEach((c, i) => {
    const id = `CND${String(i+1).padStart(3,'0')}`;
    const monthsActive = Math.max(0, Math.floor((today - new Date(c.joined)) / (1000*60*60*24*30)));
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
    
    insertCandidate.run(id, c.name, c.email, c.phone, c.dob, status, sources[i % 5], xp, level, Math.floor(Math.random()*12), jobsCompleted, JSON.stringify(certs), `${c.name.split(' ')[0].toUpperCase()}2024`, incentives, earnings, rating, c.joined);
    candidates.push({ id, joined: c.joined, status });
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

  const insertJob = db.prepare(`INSERT INTO jobs (id,client_id,title,description,job_date,start_time,end_time,break_minutes,location,charge_rate,pay_rate,total_slots,filled_slots,xp_bonus,status,featured,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insertDep = db.prepare(`INSERT INTO deployments (id,job_id,candidate_id,status,hours_worked,charge_rate,pay_rate,gross_revenue,candidate_pay,gross_profit,incentive_amount,rating,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insertPay = db.prepare(`INSERT INTO payments (id,candidate_id,deployment_id,base_amount,incentive_amount,total_amount,hours_worked,status,paid_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`);

  let jobN = 1, depN = 1, payN = 1;

  // Monthly job counts (business growth from 0)
  const monthlyJobs = {'2024-07':3,'2024-08':8,'2024-09':15,'2024-10':22,'2024-11':30,'2024-12':45,'2025-01':38};

  Object.entries(monthlyJobs).forEach(([month, count]) => {
    for (let i = 0; i < count; i++) {
      const t = jobTemplates[Math.floor(Math.random() * jobTemplates.length)];
      const day = Math.floor(Math.random() * 28) + 1;
      const jobDate = `${month}-${String(day).padStart(2,'0')}`;
      const jobId = `JOB${String(jobN++).padStart(4,'0')}`;
      
      const availClients = clients.filter(c => c[9] <= jobDate);
      if (availClients.length === 0) continue;
      const client = availClients[Math.floor(Math.random() * availClients.length)];
      
      const slots = Math.floor(Math.random() * 5) + 2;
      const isPast = new Date(jobDate) < today;
      const chargeRate = t.charge + Math.floor(Math.random() * 4) - 2;
      const payRate = t.pay + Math.floor(Math.random() * 2) - 1;
      
      insertJob.run(jobId, client[0], t.title, `${t.title} at ${client[1]}`, jobDate, '18:00', '23:00', 30, client[1], chargeRate, payRate, slots, isPast ? slots : Math.floor(slots*0.5), Math.random()>0.7?50:0, isPast?'completed':'open', Math.random()>0.8?1:0, addDays(jobDate,-3));

      if (isPast) {
        const availCands = candidates.filter(c => c.joined <= jobDate && c.status === 'active');
        const deployCands = availCands.sort(() => Math.random()-0.5).slice(0, slots);
        
        deployCands.forEach(cand => {
          const hours = t.hours + (Math.random() - 0.5);
          const revenue = hours * chargeRate;
          const candPay = hours * payRate;
          const profit = revenue - candPay;
          const inc = Math.random() > 0.75 ? 5 : 0;
          const rating = Math.floor(Math.random() * 2) + 4;
          const depId = `DEP${String(depN++).padStart(5,'0')}`;
          
          insertDep.run(depId, jobId, cand.id, 'completed', hours.toFixed(2), chargeRate, payRate, revenue.toFixed(2), candPay.toFixed(2), profit.toFixed(2), inc, rating, jobDate);
          insertPay.run(`PAY${String(payN++).padStart(5,'0')}`, cand.id, depId, candPay.toFixed(2), inc, (candPay+inc).toFixed(2), hours.toFixed(2), 'paid', addDays(jobDate,7), jobDate);
        });
      }
    }
  });

  // Upcoming jobs
  for (let i = 1; i <= 10; i++) {
    const t = jobTemplates[Math.floor(Math.random() * jobTemplates.length)];
    const client = clients[Math.floor(Math.random() * clients.length)];
    const jobDate = addDays(today, i + Math.floor(Math.random() * 5));
    insertJob.run(`JOB${String(jobN++).padStart(4,'0')}`, client[0], t.title, `${t.title} at ${client[1]}`, jobDate, '18:00', '23:00', 30, client[1], t.charge, t.pay, 5, 2, 50, 'open', Math.random()>0.6?1:0, addDays(jobDate,-3));
  }

  // Tenders
  const tenders = [
    ['TND001','gebiz','GBZ-2025-001234','Admin Support Staff','MOE','Manpower',450000,addDays(today,15),'reviewing',15,12,'Buona Vista',22,15,37500,null,65,'STRONG BID'],
    ['TND002','gebiz','GBZ-2025-001198','Event Support National Day','MCCY','Events',280000,addDays(today,10),'bidding',50,3,'Marina Bay',20,13,93333,null,55,'HIGH PRIORITY'],
    ['TND003','gebiz','GBZ-2025-001245','SingPass Customer Service','GovTech','Service',620000,addDays(today,20),'new',20,24,'Multiple',18,12,25833,null,40,'EVALUATE'],
    ['TND004','gebiz','GBZ-2025-001156','Warehouse Logistics','MOH','Logistics',180000,addDays(today,5),'submitted',8,6,'Tuas',17,11,null,165000,70,'SUBMITTED'],
    ['TND005','vendors-gov','VG-2025-0456','Reception Services','SLA','Admin',95000,addDays(today,-5),'won',4,12,'Newton',19,13,null,89000,100,'WON'],
    ['TND006','gebiz','GBZ-2024-009876','F&B Government Event','MFA','F&B',75000,addDays(today,-30),'won',12,1,'Shangri-La',24,16,null,72000,100,'COMPLETED'],
    ['TND007','gebiz','GBZ-2024-008765','IT Support Staff','IMDA','IT',320000,addDays(today,-45),'lost',10,12,'Mapletree',28,20,null,310000,0,'LOST'],
  ];
  tenders.forEach(t => db.prepare(`INSERT INTO tenders (id,source,external_id,title,agency,category,estimated_value,closing_date,status,manpower_required,duration_months,location,estimated_charge_rate,estimated_pay_rate,estimated_monthly_revenue,our_bid_amount,win_probability,recommended_action) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(...t));

  // Financial Projections (showing growth from 0)
  const projections = [
    ['2024-07',2024,2000,1400,600,1850,1295,555],
    ['2024-08',2024,5000,3500,1500,5200,3640,1560],
    ['2024-09',2024,9000,6300,2700,9800,6860,2940],
    ['2024-10',2024,14000,9800,4200,15200,10640,4560],
    ['2024-11',2024,20000,14000,6000,22500,15750,6750],
    ['2024-12',2024,30000,21000,9000,35200,24640,10560],
    ['2025-01',2025,28000,19600,8400,26500,18550,7950],
    ['2025-02',2025,35000,24500,10500,null,null,null],
    ['2025-03',2025,42000,29400,12600,null,null,null],
  ];
  projections.forEach(p => db.prepare(`INSERT INTO financial_projections (month,year,projected_revenue,projected_costs,projected_profit,actual_revenue,actual_costs,actual_profit) VALUES (?,?,?,?,?,?,?,?)`).run(...p));

  // Referrals
  db.prepare(`INSERT INTO referrals VALUES (?,?,?,?,?,?)`).run('REF001','CND001','CND003','bonus_paid',30,'2024-08-10');
  db.prepare(`INSERT INTO referrals VALUES (?,?,?,?,?,?)`).run('REF002','CND002','CND005','bonus_paid',30,'2024-09-01');
  db.prepare(`INSERT INTO referrals VALUES (?,?,?,?,?,?)`).run('REF003','CND001','CND015','registered',30,'2025-01-05');

  // Achievements
  candidates.filter(c => c.status === 'active').slice(0,12).forEach((c,i) => {
    db.prepare(`INSERT INTO candidate_achievements VALUES (?,?,datetime('now'))`).run(c.id,'ACH001');
    if (i < 8) db.prepare(`INSERT INTO candidate_achievements VALUES (?,?,datetime('now'))`).run(c.id,'ACH002');
    if (i < 4) db.prepare(`INSERT INTO candidate_achievements VALUES (?,?,datetime('now'))`).run(c.id,'ACH003');
  });

  console.log(`✅ Data seeded: ${candidates.length} candidates, ${clients.length} clients, ${jobN-1} jobs, ${depN-1} deployments`);
}

function resetToSampleData() {
  console.log('🔄 Resetting database...');
  const tables = ['notifications','messages','referrals','financial_projections','payments','deployments','jobs','tenders','candidate_achievements','candidates','clients','training','quests','achievements','incentive_schemes','settings'];
  tables.forEach(t => { try { db.exec(`DROP TABLE IF EXISTS ${t}`); } catch(e) {} });
  createSchema();
  seedData();
  console.log('✅ Reset complete');
}

createSchema();
seedData();

module.exports = { db, resetToSampleData };
