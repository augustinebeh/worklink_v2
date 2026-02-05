/**
 * Core Database Schema
 * Foundational tables for candidates, clients, jobs, deployments, and payments
 * 
 * @module database/schema/core
 */

const { db } = require('../config');

/**
 * Create core business tables
 */
function createCoreTables() {
  db.exec(`
    -- =====================================================
    -- CORE BUSINESS TABLES
    -- =====================================================

    -- Candidates (Workers)
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      date_of_birth DATE,
      nric_last4 TEXT,
      status TEXT DEFAULT 'lead',
      source TEXT DEFAULT 'direct',
      xp INTEGER DEFAULT 0,
      lifetime_xp INTEGER DEFAULT 0,
      current_points INTEGER DEFAULT 0,
      current_tier TEXT DEFAULT 'bronze',
      level INTEGER DEFAULT 1,
      streak_days INTEGER DEFAULT 0,
      streak_last_date DATE,
      streak_protected_until DATETIME,
      profile_flair TEXT,
      selected_border_id TEXT,
      total_jobs_completed INTEGER DEFAULT 0,
      certifications TEXT DEFAULT '[]',
      skills TEXT DEFAULT '[]',
      preferred_locations TEXT DEFAULT '[]',
      referral_code TEXT UNIQUE,
      referred_by TEXT,
      referral_tier INTEGER DEFAULT 1,
      total_referral_earnings REAL DEFAULT 0,
      total_incentives_earned REAL DEFAULT 0,
      total_earnings REAL DEFAULT 0,
      rating REAL DEFAULT 0,
      profile_photo TEXT,
      bank_name TEXT,
      bank_account TEXT,
      address TEXT,
      availability_mode TEXT DEFAULT 'weekdays',
      online_status TEXT DEFAULT 'offline',
      last_seen DATETIME,
      push_token TEXT,
      whatsapp_opted_in INTEGER DEFAULT 0,
      telegram_chat_id TEXT,
      telegram_username TEXT,
      google_id TEXT,
      preferred_contact TEXT DEFAULT 'app',
      theme_preference TEXT DEFAULT 'default',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Clients (Employers)
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      uen TEXT,
      industry TEXT,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      logo_url TEXT,
      payment_terms INTEGER DEFAULT 30,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Jobs (Gigs/Shifts)
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      job_date DATE,
      start_time TEXT,
      end_time TEXT,
      break_minutes INTEGER DEFAULT 0,
      location TEXT,
      location_lat REAL,
      location_lng REAL,
      charge_rate REAL NOT NULL,
      pay_rate REAL NOT NULL,
      total_slots INTEGER DEFAULT 1,
      filled_slots INTEGER DEFAULT 0,
      required_skills TEXT DEFAULT '[]',
      xp_bonus INTEGER DEFAULT 0,
      status TEXT DEFAULT 'open',
      featured INTEGER DEFAULT 0,
      urgent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    -- Deployments (Job Assignments)
    CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      candidate_id TEXT,
      status TEXT DEFAULT 'assigned',
      hours_worked REAL,
      charge_rate REAL,
      pay_rate REAL,
      gross_revenue REAL,
      candidate_pay REAL,
      gross_profit REAL,
      incentive_amount REAL DEFAULT 0,
      rating INTEGER,
      feedback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Payments (Worker Payouts)
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      candidate_id TEXT,
      deployment_id TEXT,
      base_amount REAL,
      incentive_amount REAL DEFAULT 0,
      total_amount REAL,
      hours_worked REAL,
      status TEXT DEFAULT 'pending',
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Candidate Availability Calendar
    CREATE TABLE IF NOT EXISTS candidate_availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      date DATE NOT NULL,
      status TEXT DEFAULT 'available',
      start_time TEXT,
      end_time TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(candidate_id, date),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );
  `);

  console.log('  ✅ Core tables created');
}

module.exports = { createCoreTables };
