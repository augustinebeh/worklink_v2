/**
 * WorkLink v2 Database
 * Refactored modular database system
 * - Production (Railway): Empty database, persists in volume
 * - Development (Local): Seeds with comprehensive sample data
 */

const { createConnection, IS_PRODUCTION } = require('./connection');
const { createSchema, runMigrations } = require('./schema');
const { seedEssentialData, ensureDemoAccount } = require('./seeders/essential');
const { seedSampleData, resetToSampleData } = require('./seeders/sample');

// Initialize database connection
const db = createConnection();

/**
 * Initialize the database with schema, migrations, and data
 */
function initializeDatabase() {
  // Minimal logging for concise output

  // Create schema
  createSchema(db);

  // Run migrations for backward compatibility
  runMigrations(db);

  // Seed essential data (production-safe)
  seedEssentialData(db);

  // Ensure demo account exists
  ensureDemoAccount(db);

  // Seed sample data in development only
  if (!IS_PRODUCTION) {
    seedSampleData(db);
  }

  // Database initialized silently for concise output
}

// Initialize on module load
initializeDatabase();

// Export database connection and utilities
module.exports = {
  db,
  createSchema,
  runMigrations,
  seedEssentialData,
  ensureDemoAccount,
  seedSampleData,
  resetToSampleData,
  IS_PRODUCTION
};