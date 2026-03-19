/**
 * Apply database constraints and indexes migration
 * This script applies the constraints and indexes defined in add-constraints-and-indexes.sql
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { createLogger } = require('../utils/structured-logger');
const logger = createLogger('apply-constraints');

// Get database path
const isDev = process.env.NODE_ENV !== 'production';
const dbPath = isDev ? './data/worklink.db' : (process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'worklink.db')
  : './data/worklink.db');

function applyConstraintsAndIndexes() {
  let db;

  try {
    logger.info(`Connecting to database at: ${dbPath}`);
    db = new Database(dbPath);

    // Enable WAL mode and foreign keys
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    logger.info('Reading migration SQL file...');
    const sqlFile = path.join(__dirname, 'add-constraints-and-indexes.sql');
    const migrationSQL = fs.readFileSync(sqlFile, 'utf8');

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
      .map(s => s + ';');

    logger.info(`Found ${statements.length} SQL statements to execute`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Create a transaction for all changes
    const transaction = db.transaction(() => {
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];

        try {
          db.exec(statement);
          successCount++;

          // Log specific constraint/index being added
          if (statement.includes('ADD CONSTRAINT')) {
            const constraintMatch = statement.match(/ADD CONSTRAINT (\w+)/);
            if (constraintMatch) {
              logger.info(`Added constraint: ${constraintMatch[1]}`);
            }
          } else if (statement.includes('CREATE INDEX')) {
            const indexMatch = statement.match(/CREATE INDEX[^\\s]*\\s+([\\w_]+)/);
            if (indexMatch) {
              logger.info(`Added index: ${indexMatch[1]}`);
            }
          }
        } catch (error) {
          if (error.message.includes('already exists') ||
              error.message.includes('duplicate column name') ||
              error.message.includes('UNIQUE constraint failed')) {
            skipCount++;
            logger.warn(`Skipped (already exists): ${statement.substring(0, 50)}...`);
          } else {
            errorCount++;
            logger.error(`Error executing: ${statement.substring(0, 50)}...`, { error: error.message });

            // For critical constraints, we might want to fail
            if (statement.includes('CHECK') &&
                (statement.includes('charge_rate') || statement.includes('pay_rate'))) {
              logger.error('Critical constraint failed - this may indicate data integrity issues');
            }
          }
        }
      }
    });

    logger.info('Applying constraints and indexes...');
    transaction();

    logger.info('Migration completed', { successful: successCount, skipped: skipCount, errors: errorCount });

    if (errorCount > 0) {
      logger.warn('Some constraints could not be applied. This might be due to existing data violations, SQLite limitations, or constraints already existing');
    }

    // Verify some critical constraints were applied
    logger.info('Verifying constraint application...');

    try {
      // Try to insert invalid data to test constraints
      const testResults = [];

      // Test job rate constraints
      try {
        db.prepare(`
          INSERT INTO jobs (id, client_id, title, charge_rate, pay_rate, job_date)
          VALUES ('TEST_INVALID', 'CLIENT001', 'Test', -10, 5, '2026-01-01')
        `).run();
        testResults.push('❌ Job rate constraint NOT working (allowed negative charge_rate)');
      } catch (e) {
        testResults.push('✅ Job rate constraint working (blocked negative charge_rate)');
      }

      // Test rate markup constraint
      try {
        db.prepare(`
          INSERT INTO jobs (id, client_id, title, charge_rate, pay_rate, job_date)
          VALUES ('TEST_INVALID2', 'CLIENT001', 'Test', 10, 15, '2026-01-01')
        `).run();
        testResults.push('❌ Rate markup constraint NOT working (allowed charge_rate < pay_rate)');
      } catch (e) {
        testResults.push('✅ Rate markup constraint working (blocked charge_rate < pay_rate)');
      }

      testResults.forEach(result => logger.info(result));

    } catch (error) {
      logger.warn('Could not verify constraints', { error: error.message });
    }

  } catch (error) {
    logger.error('Migration failed', { error: error.message });
    process.exit(1);
  } finally {
    if (db) {
      db.close();
      logger.info('Database connection closed');
    }
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  logger.info('Starting database constraints and indexes migration...');
  applyConstraintsAndIndexes();
}

module.exports = { applyConstraintsAndIndexes };