/**
 * Referral & Incentive Schema
 * Tables for referral tracking, tiers, and incentive schemes
 * 
 * @module database/schema/referrals
 */

const { db } = require('../config');

/**
 * Create referral and incentive tables
 */
function createReferralTables() {
  db.exec(`
    -- =====================================================
    -- REFERRAL & INCENTIVE SYSTEM
    -- =====================================================

    -- Referrals (Worker-to-Worker Referrals)
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT,
      referred_id TEXT,
      status TEXT DEFAULT 'pending',
      tier INTEGER DEFAULT 1,
      bonus_amount REAL,
      jobs_completed_by_referred INTEGER DEFAULT 0,
      total_bonus_paid REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES candidates(id),
      FOREIGN KEY (referred_id) REFERENCES candidates(id)
    );

    -- Referral Bonus Tiers
    CREATE TABLE IF NOT EXISTS referral_tiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tier_level INTEGER UNIQUE,
      jobs_required INTEGER,
      bonus_amount REAL,
      description TEXT
    );

    -- Incentive Schemes (Performance Bonuses)
    CREATE TABLE IF NOT EXISTS incentive_schemes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT,
      trigger_type TEXT,
      trigger_value INTEGER,
      bonus_amount REAL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('  ✅ Referral & incentive tables created');
}

module.exports = { createReferralTables };
