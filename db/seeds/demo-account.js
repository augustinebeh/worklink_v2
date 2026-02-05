/**
 * Demo Account Seeder
 * Creates a demo candidate account for testing and demonstration
 * 
 * @module db/seeds/demo-account
 */

const { generateAvatar } = require('../utils/avatar-generator');

/**
 * Ensure demo account exists
 * Creates Sarah Tan demo account if not exists
 * 
 * @param {Database} db - better-sqlite3 database instance
 */
function ensureDemoAccount(db) {
  const demoExists = db.prepare('SELECT COUNT(*) as c FROM candidates WHERE email = ?')
    .get('sarah.tan@email.com').c;
  
  if (demoExists > 0) {
    console.log('✅ Demo account exists: sarah.tan@email.com');
    return;
  }

  console.log('🎭 Creating demo account: Sarah Tan');

  // Create Sarah Tan demo candidate
  // Career Ladder System: XP 16000 = Level 10 (Silver Member)
  // Formula: 500 × Level^1.5 → Level 10 = 15,811 XP
  // Total earnings = sum of payments: 120+128+160+125+128 = 661
  db.prepare(`
    INSERT INTO candidates (
      id, name, email, phone, status, source,
      xp, lifetime_xp, current_points, current_tier,
      level, streak_days, total_jobs_completed,
      certifications, skills, preferred_locations,
      referral_code, referral_tier, total_referral_earnings,
      total_incentives_earned, total_earnings, rating,
      profile_photo, online_status, whatsapp_opted_in, created_at, updated_at
    ) VALUES (
      'CND_DEMO_001',
      'Sarah Tan',
      'sarah.tan@email.com',
      '+6591234567',
      'active',
      'direct',
      16000,
      16000,
      500,
      'silver',
      10,
      5,
      42,
      '["Food Safety", "First Aid", "Customer Service"]',
      '["Customer Service", "Cash Handling", "Event Support", "F&B Service"]',
      '["Central", "East", "West"]',
      'SARAH001',
      2,
      180.00,
      250.00,
      661.00,
      4.8,
      ?,
      'online',
      1,
      datetime('now', '-180 days'),
      datetime('now')
    )
  `).run(generateAvatar('Sarah Tan'));

  // Add payment history for Sarah
  const payments = [
    ['PAY_DEMO_001', 'CND_DEMO_001', null, 120.00, 0, 120.00, 8.0, 'paid', -7],
    ['PAY_DEMO_002', 'CND_DEMO_001', null, 108.00, 20.00, 128.00, 6.0, 'paid', -14],
    ['PAY_DEMO_003', 'CND_DEMO_001', null, 160.00, 0, 160.00, 8.0, 'paid', -21],
    ['PAY_DEMO_004', 'CND_DEMO_001', null, 110.00, 15.00, 125.00, 5.0, 'pending', -3],
    ['PAY_DEMO_005', 'CND_DEMO_001', null, 128.00, 0, 128.00, 8.0, 'approved', -1],
  ];

  const paymentStmt = db.prepare(`
    INSERT INTO payments (
      id, candidate_id, deployment_id, base_amount, incentive_amount,
      total_amount, hours_worked, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ? || ' days'))
  `);

  payments.forEach(p => paymentStmt.run(...p));

  // Add XP transactions
  const xpTransactions = [
    ['shift', 850, 'Shift completion: 8hrs + on-time', -7],
    ['shift', 1050, 'Shift completion: 6hrs + urgent + 5-star', -14],
    ['quest_claim', 10, 'Daily Check-in quest', -1],
    ['referral', 1000, 'Referral bonus: friend completed first job', -10],
  ];

  const xpStmt = db.prepare(`
    INSERT INTO xp_transactions (candidate_id, action_type, amount, reason, created_at)
    VALUES ('CND_DEMO_001', ?, ?, ?, datetime('now', ? || ' days'))
  `);

  xpTransactions.forEach(xp => xpStmt.run(...xp));

  console.log('✅ Demo account created: sarah.tan@email.com');
}

module.exports = {
  ensureDemoAccount,
};
