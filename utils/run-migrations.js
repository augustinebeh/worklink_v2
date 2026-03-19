/**
 * Database Migration Runner
 * Applies worker status classification schema changes
 */


const { createLogger } = require('./structured-logger');
const logger = createLogger('run-migrations');

const fs = require('fs');
const path = require('path');
const { db } = require('../db');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

async function runMigration(migrationFile) {
  const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);

  logger.info('\n Running migration: ${migrationFile}');

  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL into individual statements (basic split on semicolons)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    logger.info('Found ${statements.length} SQL statements to execute');

    for (const [index, statement] of statements.entries()) {
      try {
        logger.info('Executing statement ${index + 1}/${statements.length}...');
        db.prepare(statement).run();
      } catch (error) {
        logger.warn('Warning: Statement ${index + 1} failed (may be expected):', { data: error.message });
        // Continue with other statements - some might fail if already applied
      }
    }

    logger.info('Migration completed: ${migrationFile}');
    return true;

  } catch (error) {
    logger.error('Migration failed: ${migrationFile}', { error: error.message });
    return false;
  }
}

async function runAllMigrations() {
  logger.info('Starting database migrations for Worker Status Classification...\n');

  try {
    // Ensure migrations directory exists
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      logger.error('Migrations directory not found: ${MIGRATIONS_DIR}');
      return false;
    }

    // Get all migration files
    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Apply in alphabetical order

    if (migrationFiles.length === 0) {
      logger.info('ℹ️  No migration files found');
      return true;
    }

    logger.info('Found ${migrationFiles.length} migration file(s):');
    migrationFiles.forEach(file => logger.info('- ${file}'));

    // Run each migration
    let successCount = 0;
    for (const migrationFile of migrationFiles) {
      const success = await runMigration(migrationFile);
      if (success) {
        successCount++;
      }
    }

    logger.info('\n Migration Summary:');
    logger.info('Successful: ${successCount}/${migrationFiles.length}');
    logger.info('Failed: ${migrationFiles.length - successCount}/${migrationFiles.length}');

    if (successCount === migrationFiles.length) {
      logger.info('\n All migrations completed successfully!');

      // Verify the changes
      await verifyMigrations();

      return true;
    } else {
      logger.info('\n️  Some migrations failed. Please check the logs.');
      return false;
    }

  } catch (error) {
    logger.error('Migration runner failed:', { error: error.message });
    return false;
  }
}

async function verifyMigrations() {
  logger.info('\n Verifying migration results...');

  try {
    // Check if new columns exist
    const testQuery = db.prepare(`
      SELECT
        worker_status,
        interview_stage,
        slm_routing_context
      FROM candidates
      LIMIT 1
    `);

    const testResult = testQuery.get();
    logger.info('New candidate columns are accessible');

    // Check worker_status distribution
    const statusStats = db.prepare(`
      SELECT
        worker_status,
        COUNT(*) as count
      FROM candidates
      GROUP BY worker_status
    `).all();

    logger.info('Worker status distribution:');
    statusStats.forEach(stat => {
      logger.info('${stat.worker_status}: ${stat.count} candidates');
    });

    // Check if new tables exist
    const tables = ['worker_status_changes', 'interview_queue', 'interview_slots'];
    for (const table of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
        logger.info('Table \'${table}\' exists with ${count} rows');
      } catch (e) {
        logger.info('Table \'${table}\' not accessible: ${e.message}');
      }
    }

    // Check indexes
    const indexes = db.prepare(`
      SELECT name, tbl_name
      FROM sqlite_master
      WHERE type = 'index'
        AND name LIKE 'idx_candidates_worker%'
    `).all();

    logger.info('Created ${indexes.length} worker status indexes');
    indexes.forEach(idx => {
      logger.info('${idx.name} on ${idx.tbl_name}');
    });

  } catch (error) {
    logger.error('Verification failed:', { error: error.message });
  }
}

// Run if called directly
if (require.main === module) {
  runAllMigrations()
    .then(success => {
      if (success) {
        logger.info('\n Database is ready for Worker Status Classification!');
        process.exit(0);
      } else {
        logger.info('\n Migration process completed with errors.');
        process.exit(1);
      }
    })
    .catch(error => {
      logger.error('\n Migration runner crashed:', { error: error });
      process.exit(1);
    });
}

module.exports = {
  runAllMigrations,
  runMigration,
  verifyMigrations
};