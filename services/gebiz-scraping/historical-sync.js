/**
 * Historical Tender Sync Service
 * Imports historical GeBIZ tender data from Data.gov.sg into local database
 */

const dataGovClient = require('./datagovsg-client');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Import WebSocket broadcasting for real-time progress updates
let broadcastToAdmins;
try {
  const { broadcast } = require('../../websocket');
  broadcastToAdmins = broadcast.broadcastToAdmins;
} catch (error) {
  // Fallback if websocket module not available
  broadcastToAdmins = () => {};
}

class HistoricalTenderSync {
  constructor() {
    this.db = null;
    this.stats = {
      total_fetched: 0,
      total_inserted: 0,
      total_updated: 0,
      total_skipped: 0,
      errors: [],
      progress_percentage: 0,
      current_stage: 'idle',
      is_running: false
    };
  }

  /**
   * Initialize database connection with Railway compatibility
   */
  initDB() {
    if (!this.db) {
      // Railway-compatible database path detection
      const IS_RAILWAY = !!process.env.RAILWAY_ENVIRONMENT; // Only true on actual Railway
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
      start_time: new Date(),
      progress_percentage: 0,
      current_stage: 'initializing',
      is_running: true
    };
  }

  /**
   * Emit sync progress update to admin clients via WebSocket
   */
  emitProgress(stage, message, percentage = null) {
    this.stats.current_stage = stage;
    this.stats.last_message = message;
    if (percentage !== null) {
      this.stats.progress_percentage = Math.min(100, Math.max(0, percentage));
    }

    // Broadcast to admin clients
    try {
      broadcastToAdmins({
        type: 'gebiz_sync_progress',
        data: {
          stage: stage,
          message: message,
          progress: this.stats.progress_percentage,
          stats: {
            total_fetched: this.stats.total_fetched,
            total_inserted: this.stats.total_inserted,
            total_skipped: this.stats.total_skipped,
            errors: this.stats.errors.length
          },
          is_running: this.stats.is_running,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`📡 [WebSocket] Progress update: ${stage} - ${message} (${this.stats.progress_percentage}%)`);
    } catch (error) {
      console.warn('Failed to emit progress update:', error.message);
    }
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

    // Emit start notification
    this.emitProgress('starting', 'Initializing GeBIZ data sync...', 0);

    try {
      // Emit database check progress
      this.emitProgress('checking', 'Checking database for last sync date...', 5);

      // Get latest award_date from database
      const latest = this.db.prepare(`
        SELECT MAX(award_date) as latest_date
        FROM gebiz_historical_tenders
      `).get();

      const lastSyncDate = latest?.latest_date || '2020-01-01';
      console.log(`📅 Last sync date: ${lastSyncDate}\n`);

      // Emit fetching progress
      this.emitProgress('fetching', 'Fetching tender data from Data.gov.sg...', 10);

      // Fetch records from last 90 days
      console.log('📡 Fetching recent awards from Data.gov.sg...');
      // Try broader search terms for better results
      const records = await dataGovClient.searchByKeywords(
        ['service', 'maintenance', 'supply', 'consultancy', 'cleaning', 'security'],
        10000
      );

      this.stats.total_fetched = records.length;
      console.log(`✅ Fetched ${records.length} records\n`);

      // Emit records fetched progress
      this.emitProgress('processing', `Processing ${records.length} tender records...`, 25);

      if (records.length === 0) {
        console.log('ℹ️  No new records to import');
        this.emitProgress('complete', 'No new records found. Sync completed.', 100);
        this.stats.is_running = false;
        return this.stats;
      }

      // Import records in batches
      console.log('💾 Importing records into database...');
      this.emitProgress('importing', 'Importing records into database...', 30);

      const batchSize = 100;
      let processed = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await this.importBatch(batch);

        processed += batch.length;
        const percentage = ((processed / records.length) * 100).toFixed(1);
        console.log(`  Progress: ${processed}/${records.length} (${percentage}%)`);

        // Emit progress updates during processing (30% to 90%)
        const importProgress = 30 + (processed / records.length) * 60; // 30% to 90%
        this.emitProgress(
          'importing',
          `Processed ${processed}/${records.length} records (${percentage}%)`,
          Math.round(importProgress)
        );

        // Small delay to prevent overwhelming the WebSocket
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      console.log('\n====================================');
      console.log('✅ SYNC COMPLETE');
      console.log('====================================');
      this.printStats();

      // Emit completion
      this.stats.is_running = false;
      this.emitProgress('complete', `Sync completed successfully! Imported ${this.stats.total_inserted} records.`, 100);

      return this.stats;

    } catch (error) {
      console.error('\n❌ Sync failed:', error.message);
      this.stats.errors.push(error.message);
      this.stats.is_running = false;

      // Emit error notification
      this.emitProgress('error', `Sync failed: ${error.message}`, this.stats.progress_percentage);

      throw error;
    } finally {
      this.closeDB();
    }
  }

  /**
   * Get current sync status (for polling endpoint)
   */
  getStatus() {
    const elapsed = this.stats.start_time
      ? Math.floor((Date.now() - new Date(this.stats.start_time).getTime()) / 1000)
      : 0;

    return {
      is_running: this.stats.is_running || false,
      stage: this.stats.current_stage || 'idle',
      progress: this.stats.progress_percentage || 0,
      message: this.stats.last_message || '',
      stats: {
        total_fetched: this.stats.total_fetched || 0,
        total_inserted: this.stats.total_inserted || 0,
        total_skipped: this.stats.total_skipped || 0,
        errors: (this.stats.errors || []).length
      },
      elapsed_seconds: elapsed,
      started_at: this.stats.start_time ? this.stats.start_time.toISOString() : null,
      error_messages: (this.stats.errors || []).slice(-5) // last 5 errors
    };
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
