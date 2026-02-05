/**
 * Historical Tender Sync Service
 * Imports historical GeBIZ tender data from Data.gov.sg into local database
 */

const dataGovClient = require('./datagovsg-client');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class HistoricalTenderSync {
  constructor() {
    this.db = null;
    this.stats = {
      total_fetched: 0,
      total_inserted: 0,
      total_updated: 0,
      total_skipped: 0,
      errors: []
    };
  }

  /**
   * Initialize database connection with Railway compatibility
   */
  initDB() {
    if (!this.db) {
      // Railway-compatible database path detection
      const IS_RAILWAY = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';
      const DB_DIR = IS_RAILWAY
        ? (process.env.RAILWAY_VOLUME_MOUNT_PATH || '/app/data')
        : path.join(__dirname, '../../database');

      // Ensure database directory exists
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
        console.log(`📁 Created database directory: ${DB_DIR}`);
      }

      const dbPath = path.join(DB_DIR, 'gebiz_intelligence.db');
      console.log(`🔌 Historical sync connecting to: ${dbPath}`);

      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');

      // Ensure required tables exist
      this.ensureTables();
    }
  }

  /**
   * Ensure required database tables exist
   */
  ensureTables() {
    try {
      // Check if gebiz_historical_tenders table exists
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='gebiz_historical_tenders'
      `).get();

      if (!tableExists) {
        console.log('📋 Creating gebiz_historical_tenders table...');

        // Create the table with full schema
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS gebiz_historical_tenders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tender_no TEXT UNIQUE NOT NULL,
            description TEXT,
            awarded_amount REAL,
            supplier_name TEXT,
            award_date DATE,
            agency TEXT,
            category TEXT,
            contract_period_start DATE,
            contract_period_end DATE,
            raw_data TEXT,
            imported_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE INDEX IF NOT EXISTS idx_gebiz_hist_supplier ON gebiz_historical_tenders(supplier_name);
          CREATE INDEX IF NOT EXISTS idx_gebiz_hist_award_date ON gebiz_historical_tenders(award_date);
          CREATE INDEX IF NOT EXISTS idx_gebiz_hist_category ON gebiz_historical_tenders(category);
          CREATE INDEX IF NOT EXISTS idx_gebiz_hist_agency ON gebiz_historical_tenders(agency);
          CREATE INDEX IF NOT EXISTS idx_gebiz_hist_amount ON gebiz_historical_tenders(awarded_amount);
        `;

        this.db.exec(createTableSQL);
        console.log('✅ gebiz_historical_tenders table created successfully');
      }
    } catch (error) {
      console.error('❌ Failed to ensure tables exist:', error.message);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  closeDB() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      total_fetched: 0,
      total_inserted: 0,
      total_updated: 0,
      total_skipped: 0,
      errors: [],
      start_time: new Date()
    };
  }

  /**
   * Import a batch of records
   */
  async importBatch(records) {
    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO gebiz_historical_tenders (
        tender_no, description, awarded_amount, supplier_name,
        award_date, agency, category, contract_period_start,
        contract_period_end, raw_data, imported_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const insertMany = this.db.transaction((records) => {
      for (const record of records) {
        try {
          const normalized = dataGovClient.normalizeRecord(record);
          
          insertStmt.run(
            normalized.tender_no,
            normalized.description,
            normalized.awarded_amount,
            normalized.supplier_name,
            normalized.award_date,
            normalized.agency,
            normalized.category,
            normalized.contract_period_start,
            normalized.contract_period_end,
            normalized.raw_data
          );
          
          this.stats.total_inserted++;
        } catch (error) {
          this.stats.total_skipped++;
          this.stats.errors.push(`Record ${record.tender_no}: ${error.message}`);
        }
      }
    });

    insertMany(records);
  }

  /**
   * Daily incremental sync (fetch recent records)
   */
  async dailySync() {
    this.initDB();
    this.resetStats();

    console.log('====================================');
    console.log('🔄 STARTING DAILY INCREMENTAL SYNC');
    console.log('====================================\n');

    try {
      // Get latest award_date from database
      const latest = this.db.prepare(`
        SELECT MAX(award_date) as latest_date 
        FROM gebiz_historical_tenders
      `).get();

      const lastSyncDate = latest?.latest_date || '2020-01-01';
      console.log(`📅 Last sync date: ${lastSyncDate}\n`);

      // Fetch records from last 90 days
      console.log('📡 Fetching recent awards from Data.gov.sg...');
      const records = await dataGovClient.searchByKeywords(
        ['manpower', 'cleaning', 'security', 'hospitality', 'catering', 'event'],
        10000
      );
      
      this.stats.total_fetched = records.length;
      console.log(`✅ Fetched ${records.length} records\n`);

      if (records.length === 0) {
        console.log('ℹ️  No new records to import');
        return this.stats;
      }

      // Import records in batches
      console.log('💾 Importing records into database...');
      const batchSize = 100;
      let processed = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await this.importBatch(batch);
        
        processed += batch.length;
        const percentage = ((processed / records.length) * 100).toFixed(1);
        console.log(`  Progress: ${processed}/${records.length} (${percentage}%)`);
      }

      console.log('\n====================================');
      console.log('✅ SYNC COMPLETE');
      console.log('====================================');
      this.printStats();

      return this.stats;

    } catch (error) {
      console.error('\n❌ Sync failed:', error.message);
      this.stats.errors.push(error.message);
      throw error;
    } finally {
      this.closeDB();
    }
  }

  /**
   * Print sync statistics
   */
  printStats() {
    const duration = this.stats.start_time 
      ? ((new Date() - this.stats.start_time) / 1000).toFixed(1)
      : 0;

    console.log('\n📊 Statistics:');
    console.log(`  - Fetched: ${this.stats.total_fetched}`);
    console.log(`  - Inserted: ${this.stats.total_inserted}`);
    console.log(`  - Updated: ${this.stats.total_updated}`);
    console.log(`  - Skipped: ${this.stats.total_skipped}`);
    console.log(`  - Errors: ${this.stats.errors.length}`);
    console.log(`  - Duration: ${duration}s\n`);

    if (this.stats.errors.length > 0 && this.stats.errors.length <= 10) {
      console.log('⚠️  Errors:');
      this.stats.errors.forEach(err => console.log(`  - ${err}`));
      console.log('');
    }
  }
}

// Export singleton instance
module.exports = new HistoricalTenderSync();
