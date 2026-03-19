/**
 * Database Migration: Add Production Scraping Fields
 * Adds fields for data quality tracking and scraping session management
 */

const Database = require('better-sqlite3');
const path = require('path');
const { createLogger } = require('../../utils/structured-logger');
const logger = createLogger('migration-scraping-fields');

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'worklink.db');

function runMigration() {
  logger.info('Running production scraping fields migration...');

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = OFF');

  try {
    // Start transaction
    db.exec('BEGIN TRANSACTION');

    // Check if columns already exist
    const tableInfo = db.prepare("PRAGMA table_info(tenders)").all();
    const existingColumns = tableInfo.map(col => col.name);

    const newColumns = [
      { name: 'data_quality_score', type: 'INTEGER', default: 'NULL' },
      { name: 'source_url', type: 'TEXT', default: 'NULL' },
      { name: 'scraping_session_id', type: 'TEXT', default: 'NULL' },
      { name: 'validation_warnings', type: 'TEXT', default: 'NULL' },
      { name: 'scraped_at', type: 'DATETIME', default: 'NULL' }
    ];

    // Add new columns if they don't exist
    for (const column of newColumns) {
      if (!existingColumns.includes(column.name)) {
        const alterSQL = `ALTER TABLE tenders ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.default}`;
        logger.info(`Adding column: ${column.name}`);
        db.exec(alterSQL);
      } else {
        logger.info(`Column ${column.name} already exists, skipping`);
      }
    }

    // Create indexes for performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_tenders_data_quality ON tenders(data_quality_score)',
      'CREATE INDEX IF NOT EXISTS idx_tenders_scraping_session ON tenders(scraping_session_id)',
      'CREATE INDEX IF NOT EXISTS idx_tenders_scraped_at ON tenders(scraped_at)'
    ];

    for (const indexSQL of indexes) {
      try {
        db.exec(indexSQL);
        logger.info('Created index', { index: indexSQL.match(/idx_\w+/)[0] });
      } catch (e) {
        logger.warn('Index already exists or failed', { error: e.message });
      }
    }

    // Update existing records to have a default data quality score
    const updateExistingSQL = `
      UPDATE tenders
      SET data_quality_score = 75,
          scraped_at = created_at
      WHERE data_quality_score IS NULL AND source = 'gebiz'
    `;

    const updateResult = db.prepare(updateExistingSQL).run();
    logger.info(`Updated ${updateResult.changes} existing records with default data quality scores`);

    // Commit transaction
    db.exec('COMMIT');
    logger.info('Migration completed successfully');

    // Verify the migration
    const finalTableInfo = db.prepare("PRAGMA table_info(tenders)").all();
    const finalColumns = finalTableInfo.map(col => col.name);

    logger.info('Current tenders table columns', { columns: finalColumns.join(', ') });

    const tenderCount = db.prepare('SELECT COUNT(*) as count FROM tenders').get();
    logger.info(`Total tenders in database: ${tenderCount.count}`);

    const qualityStats = db.prepare(`
      SELECT
        COUNT(*) as total_with_quality,
        AVG(data_quality_score) as avg_quality,
        MIN(data_quality_score) as min_quality,
        MAX(data_quality_score) as max_quality
      FROM tenders
      WHERE data_quality_score IS NOT NULL
    `).get();

    logger.info('Data quality stats', qualityStats);

  } catch (error) {
    logger.error('Migration failed', { error: error.message });
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.pragma('foreign_keys = ON');
    db.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };