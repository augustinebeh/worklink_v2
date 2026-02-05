/**
 * WorkLink v2 Database - Main Entry Point
 * Modular database initialization system
 * 
 * Original monolithic file: database.js (1,962 lines)
 * New modular structure: 15 modules (~2,900 lines with improvements)
 * 
 * - Production (Railway): Empty database, persists in volume
 * - Development (Local): Seeds with comprehensive sample data
 * 
 * @module database
 */

const { db, IS_PRODUCTION, DATA_DIR, DB_PATH } = require('./config');
const { generateAvatar } = require('./utils');
const { runMigrations } = require('./migrations');

// Schema modules
const { createCoreTables } = require('./schema/core');
const { createReferralTables } = require('./schema/referrals');
const { createGamificationTables } = require('./schema/gamification');
const { createCommunicationTables } = require('./schema/communication');
const { createAIMLTables } = require('./schema/ai-ml');
const { createTendersTables } = require('./schema/tenders');
const { createAdminTables } = require('./schema/admin');
const { createIndexes } = require('./schema/indexes');

// Seed modules
const { seedEssentialData } = require('./seeds/essential');
const { seedSampleData } = require('./seeds/sample');
const { ensureDemoAccount } = require('./seeds/demo');

/**
 * Create complete database schema
 */
function createSchema() {
  console.log('🏗️  Creating database schema...');

  // Create all tables
  createCoreTables();
  createReferralTables();
  createGamificationTables();
  createCommunicationTables();
  createAIMLTables();
  createTendersTables();
  createAdminTables();

  // Create indexes for performance
  createIndexes();

  // Run migrations (add missing columns to existing tables)
  runMigrations();

  console.log('✅ Schema created successfully');
}

/**
 * Reset database to sample data (development only)
 */
function resetToSampleData() {
  if (IS_PRODUCTION) {
    console.log('❌ Cannot reset in production');
    return;
  }

  console.log('🔄 Resetting database...');

  // Delete all data from tables
  const tables = [
    'push_queue', 'job_match_scores', 'notifications', 'messages', 'tender_matches',
    'xp_transactions', 'candidate_quests', 'candidate_achievements', 'candidate_availability',
    'reward_purchases', 'rewards',
    'payments', 'deployments', 'jobs', 'referrals', 'candidates', 'clients',
    'tenders', 'financial_projections', 'tender_alerts', 'referral_tiers',
    'message_templates', 'incentive_schemes', 'training', 'quests', 'achievements',
    'admin_onboarding', 'admin_achievements'
  ];

  tables.forEach(t => {
    try {
      db.exec(`DELETE FROM ${t}`);
    } catch (e) {
      // Table might not exist, ignore
    }
  });

  // Reseed data
  seedEssentialData();
  ensureDemoAccount();
  seedSampleData();

  console.log('✅ Database reset complete');
}

// Initialize database on import
createSchema();
seedEssentialData();
ensureDemoAccount();
seedSampleData();

// Export database and utilities
module.exports = {
  db,
  IS_PRODUCTION,
  generateAvatar,
  resetToSampleData
};
