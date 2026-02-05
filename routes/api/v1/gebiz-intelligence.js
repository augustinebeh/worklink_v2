/**
 * GeBIZ Intelligence API Routes
 * Historical tender data from Data.gov.sg + Competitor intelligence
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

/**
 * Robust GeBIZ Table Creation for Railway Deployment
 * Ensures all required tables exist before any database operations
 */
class GeBIZTableManager {
  constructor(db) {
    this.db = db;
    this.initialized = false;
    this.initializationAttempted = false;
  }

  /**
   * Check if a table exists
   */
  tableExists(tableName) {
    try {
      const result = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name=?
      `).get(tableName);
      return !!result;
    } catch (error) {
      console.error(`❌ Error checking table ${tableName}:`, error.message);
      return false;
    }
  }

  /**
   * Create the gebiz_historical_tenders table with all indexes
   */
  createHistoricalTendersTable() {
    const sql = `
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

    try {
      this.db.exec(sql);
      console.log('✅ gebiz_historical_tenders table created/verified');
      return true;
    } catch (error) {
      console.error('❌ Failed to create gebiz_historical_tenders table:', error.message);
      return false;
    }
  }

  /**
   * Create the gebiz_active_tenders table with all indexes
   */
  createActiveTendersTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS gebiz_active_tenders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tender_no TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        agency TEXT,
        closing_date DATE,
        published_date DATE,
        category TEXT,
        estimated_value REAL,
        url TEXT,
        details TEXT,
        has_details BOOLEAN DEFAULT 0,
        status TEXT DEFAULT 'open',
        scraped_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_gebiz_active_tender_no ON gebiz_active_tenders(tender_no);
      CREATE INDEX IF NOT EXISTS idx_gebiz_active_closing ON gebiz_active_tenders(closing_date);
      CREATE INDEX IF NOT EXISTS idx_gebiz_active_agency ON gebiz_active_tenders(agency);
      CREATE INDEX IF NOT EXISTS idx_gebiz_active_status ON gebiz_active_tenders(status);
    `;

    try {
      this.db.exec(sql);
      console.log('✅ gebiz_active_tenders table created/verified');
      return true;
    } catch (error) {
      console.error('❌ Failed to create gebiz_active_tenders table:', error.message);
      return false;
    }
  }

  /**
   * Create essential configuration table
   */
  createConfigTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS scraping_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_key TEXT UNIQUE NOT NULL,
        config_value TEXT NOT NULL,
        description TEXT,
        updated_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      INSERT OR IGNORE INTO scraping_config (config_key, config_value, description) VALUES
        ('gebiz_keywords', '["manpower", "cleaning", "security", "hospitality", "catering", "event staff"]', 'Keywords to filter relevant GeBIZ tenders'),
        ('gebiz_historical_sync_enabled', 'true', 'Enable daily historical data sync'),
        ('gebiz_active_scrape_enabled', 'true', 'Enable active tender scraping'),
        ('alert_high_value_threshold', '100000', 'Tender value threshold for high-priority alerts (SGD)'),
        ('rate_limit_requests_per_minute', '10', 'Max requests per minute for scraping');
    `;

    try {
      this.db.exec(sql);
      console.log('✅ scraping_config table created/verified');
      return true;
    } catch (error) {
      console.error('❌ Failed to create scraping_config table:', error.message);
      return false;
    }
  }

  /**
   * Initialize all required tables
   */
  async initializeTables() {
    if (this.initialized) return true;
    if (this.initializationAttempted) return this.initialized;

    this.initializationAttempted = true;
    console.log('🔧 Initializing GeBIZ tables for Railway deployment...');

    try {
      // Create all essential tables
      const results = [
        this.createHistoricalTendersTable(),
        this.createActiveTendersTable(),
        this.createConfigTable()
      ];

      this.initialized = results.every(result => result === true);

      if (this.initialized) {
        console.log('✅ All GeBIZ tables initialized successfully');
      } else {
        console.error('❌ Some GeBIZ tables failed to initialize');
      }

      return this.initialized;
    } catch (error) {
      console.error('❌ GeBIZ table initialization failed:', error.message);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Ensure a specific table exists
   */
  async ensureTable(tableName) {
    if (!this.initialized) {
      await this.initializeTables();
    }

    return this.tableExists(tableName);
  }
}

// Database connection with Railway-compatible path handling
const IS_RAILWAY = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';
const DB_DIR = IS_RAILWAY
  ? (process.env.RAILWAY_VOLUME_MOUNT_PATH || '/app/data')
  : path.join(__dirname, '../../../database');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log(`📁 Created database directory: ${DB_DIR}`);
}

const gebizDbPath = path.join(DB_DIR, 'gebiz_intelligence.db');
let gebizDb;
let tableManager;

// Initialize database connection
try {
  console.log(`🔌 Connecting to GeBIZ database: ${gebizDbPath}`);
  gebizDb = new Database(gebizDbPath);
  gebizDb.pragma('journal_mode = WAL');
  gebizDb.pragma('foreign_keys = ON');

  // Initialize table manager
  tableManager = new GeBIZTableManager(gebizDb);

  console.log('✅ GeBIZ Intelligence database connected');

  // Initialize tables immediately for Railway
  if (IS_RAILWAY) {
    tableManager.initializeTables().catch(error => {
      console.error('❌ Failed to initialize tables on startup:', error.message);
    });
  }

} catch (error) {
  console.error('❌ GeBIZ Intelligence database connection failed:', error.message);
  console.error('   Database path:', gebizDbPath);

  // For Railway, attempt to create database directory and retry
  if (IS_RAILWAY) {
    try {
      console.log('🔄 Attempting Railway database recovery...');
      if (!fs.existsSync(path.dirname(gebizDbPath))) {
        fs.mkdirSync(path.dirname(gebizDbPath), { recursive: true });
      }
      gebizDb = new Database(gebizDbPath);
      gebizDb.pragma('journal_mode = WAL');
      tableManager = new GeBIZTableManager(gebizDb);
      console.log('✅ Railway database recovery successful');
    } catch (retryError) {
      console.error('❌ Railway database recovery failed:', retryError.message);
    }
  }
}

/**
 * Middleware to ensure GeBIZ tables exist before any operation
 */
async function ensureGeBIZTablesMiddleware(req, res, next) {
  if (!gebizDb || !tableManager) {
    return res.status(503).json({
      success: false,
      error: 'GeBIZ database not initialized',
      message: 'Database connection failed. Please contact support.'
    });
  }

  try {
    const tablesReady = await tableManager.initializeTables();
    if (!tablesReady) {
      return res.status(503).json({
        success: false,
        error: 'Failed to initialize GeBIZ tables',
        message: 'Database setup failed. Please contact support.'
      });
    }
    next();
  } catch (error) {
    console.error('❌ Table initialization middleware error:', error.message);
    return res.status(503).json({
      success: false,
      error: 'Database initialization error',
      message: error.message
    });
  }
}

/**
 * GET /api/v1/gebiz/dashboard
 * Get dashboard overview statistics
 */
router.get('/dashboard', ensureGeBIZTablesMiddleware, (req, res) => {
  try {

    const stats = {
      // Total historical tenders
      total_tenders: gebizDb.prepare(`
        SELECT COUNT(*) as count FROM gebiz_historical_tenders
      `).get().count,

      // Unique suppliers tracked
      total_suppliers: gebizDb.prepare(`
        SELECT COUNT(DISTINCT supplier_name) as count
        FROM gebiz_historical_tenders
      `).get().count,

      // Total contract value
      total_value: gebizDb.prepare(`
        SELECT COALESCE(SUM(awarded_amount), 0) as sum
        FROM gebiz_historical_tenders
      `).get().sum,

      // Recent tenders (last 30 days)
      recent_tenders: gebizDb.prepare(`
        SELECT COUNT(*) as count
        FROM gebiz_historical_tenders
        WHERE award_date >= date('now', '-30 days')
      `).get().count,

      // Active tenders (if available)
      active_tenders: 0,

      // Pending alerts
      pending_alerts: 0
    };

    res.json({ success: true, stats });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/gebiz/competitors
 * Get top competitors list
 */
router.get('/competitors', ensureGeBIZTablesMiddleware, (req, res) => {
  try {

    const { limit = 20, category, period = 6 } = req.query;

    let query = `
      SELECT 
        supplier_name,
        COUNT(*) as tender_count,
        SUM(awarded_amount) as total_value,
        AVG(awarded_amount) as avg_value,
        MIN(award_date) as first_win,
        MAX(award_date) as latest_win,
        GROUP_CONCAT(DISTINCT category) as categories
      FROM gebiz_historical_tenders
      WHERE award_date >= date('now', '-' || ? || ' months')
        AND supplier_name IS NOT NULL
    `;

    const params = [period];
    if (category && category !== 'all') {
      query += ` AND category = ?`;
      params.push(category);
    }

    query += `
      GROUP BY supplier_name
      ORDER BY total_value DESC
      LIMIT ?
    `;
    params.push(parseInt(limit));

    const competitors = gebizDb.prepare(query).all(...params);

    res.json({ success: true, competitors });

  } catch (error) {
    console.error('Competitors error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/gebiz/competitor/:name
 * Get specific competitor details
 */
router.get('/competitor/:name', ensureGeBIZTablesMiddleware, (req, res) => {
  try {

    const { name } = req.params;

    // Get recent wins
    const recent_wins = gebizDb.prepare(`
      SELECT * FROM gebiz_historical_tenders
      WHERE supplier_name = ?
      ORDER BY award_date DESC
      LIMIT 20
    `).all(name);

    // Get category breakdown
    const categories = gebizDb.prepare(`
      SELECT 
        category,
        COUNT(*) as count,
        SUM(awarded_amount) as total_value
      FROM gebiz_historical_tenders
      WHERE supplier_name = ?
      GROUP BY category
      ORDER BY total_value DESC
    `).all(name);

    res.json({
      success: true,
      competitor: {
        name,
        recent_wins,
        categories
      }
    });

  } catch (error) {
    console.error('Competitor details error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/gebiz/tenders/historical
 * Search historical tenders
 */
router.get('/tenders/historical', ensureGeBIZTablesMiddleware, (req, res) => {
  try {

    const {
      page = 1,
      limit = 50,
      search,
      category,
      agency,
      supplier,
      min_value,
      max_value,
      start_date,
      end_date
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `SELECT * FROM gebiz_historical_tenders WHERE 1=1`;
    const params = [];

    // Apply filters
    if (search) {
      query += ` AND (description LIKE ? OR tender_no LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (agency) {
      query += ` AND agency = ?`;
      params.push(agency);
    }

    if (supplier) {
      query += ` AND supplier_name = ?`;
      params.push(supplier);
    }

    if (min_value) {
      query += ` AND awarded_amount >= ?`;
      params.push(parseFloat(min_value));
    }

    if (max_value) {
      query += ` AND awarded_amount <= ?`;
      params.push(parseFloat(max_value));
    }

    if (start_date) {
      query += ` AND award_date >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND award_date <= ?`;
      params.push(end_date);
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const total = gebizDb.prepare(countQuery).get(...params).count;

    // Get paginated results
    query += ` ORDER BY award_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const tenders = gebizDb.prepare(query).all(...params);

    res.json({
      success: true,
      tenders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Historical tenders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/gebiz/categories
 * Get list of all categories
 */
router.get('/categories', ensureGeBIZTablesMiddleware, (req, res) => {
  try {

    const categories = gebizDb.prepare(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM gebiz_historical_tenders
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `).all();

    res.json({ success: true, categories });

  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/gebiz/agencies
 * Get list of all agencies
 */
router.get('/agencies', ensureGeBIZTablesMiddleware, (req, res) => {
  try {

    const agencies = gebizDb.prepare(`
      SELECT DISTINCT agency, COUNT(*) as tender_count
      FROM gebiz_historical_tenders
      WHERE agency IS NOT NULL
      GROUP BY agency
      ORDER BY tender_count DESC
    `).all();

    res.json({ success: true, agencies });

  } catch (error) {
    console.error('Agencies error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/gebiz/sync/historical
 * Trigger historical data sync
 */
router.post('/sync/historical', ensureGeBIZTablesMiddleware, async (req, res) => {
  try {
    // Check if sync service is available
    const syncServicePath = path.join(__dirname, '../../../services/gebiz-scraping/historical-sync.js');
    const fs = require('fs');
    
    if (!fs.existsSync(syncServicePath)) {
      return res.status(503).json({
        success: false,
        error: 'Sync service not installed. Copy services from gebiz-intelligence folder.'
      });
    }

    const historicalSync = require(syncServicePath);
    
    // Run sync in background
    historicalSync.dailySync().catch(console.error);

    res.json({ 
      success: true, 
      message: 'Historical sync started in background'
    });

  } catch (error) {
    console.error('Sync trigger error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/gebiz/stats
 * Get database statistics
 */
router.get('/stats', ensureGeBIZTablesMiddleware, (req, res) => {
  try {

    const stats = {
      tenders: gebizDb.prepare('SELECT COUNT(*) as count FROM gebiz_historical_tenders').get().count,
      suppliers: gebizDb.prepare('SELECT COUNT(DISTINCT supplier_name) as count FROM gebiz_historical_tenders').get().count,
      agencies: gebizDb.prepare('SELECT COUNT(DISTINCT agency) as count FROM gebiz_historical_tenders').get().count,
      total_value: gebizDb.prepare('SELECT COALESCE(SUM(awarded_amount), 0) as sum FROM gebiz_historical_tenders').get().sum,
      date_range: gebizDb.prepare('SELECT MIN(award_date) as min, MAX(award_date) as max FROM gebiz_historical_tenders').get()
    };

    res.json({ success: true, stats });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/gebiz/health
 * Health check endpoint - verifies database and table status
 */
router.get('/health', (req, res) => {
  try {
    const health = {
      database_connected: !!gebizDb,
      database_path: gebizDbPath,
      environment: IS_RAILWAY ? 'Railway' : 'Local',
      table_status: {}
    };

    if (gebizDb && tableManager) {
      // Check each critical table
      const criticalTables = [
        'gebiz_historical_tenders',
        'gebiz_active_tenders',
        'scraping_config'
      ];

      criticalTables.forEach(tableName => {
        health.table_status[tableName] = tableManager.tableExists(tableName);
      });

      health.all_tables_ready = Object.values(health.table_status).every(status => status === true);
      health.manager_initialized = tableManager.initialized;
    }

    const statusCode = health.database_connected && health.all_tables_ready ? 200 : 503;
    res.status(statusCode).json({ success: health.all_tables_ready, health });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      health: { error: error.message },
      message: 'Health check failed'
    });
  }
});

/**
 * POST /api/v1/gebiz/init-tables
 * Force table initialization - useful for Railway deployment debugging
 */
router.post('/init-tables', async (req, res) => {
  try {
    if (!gebizDb || !tableManager) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        message: 'GeBIZ database connection is not established'
      });
    }

    console.log('🔧 Manual table initialization requested...');
    const result = await tableManager.initializeTables();

    if (result) {
      // Get table status
      const tables = gebizDb.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table'
        ORDER BY name
      `).all();

      res.json({
        success: true,
        message: 'Tables initialized successfully',
        tables: tables.map(t => t.name),
        count: tables.length
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Table initialization failed',
        message: 'Check server logs for details'
      });
    }

  } catch (error) {
    console.error('Table initialization error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Table initialization failed'
    });
  }
});

/**
 * GET /api/v1/gebiz/debug-info
 * Debug information for troubleshooting Railway deployment
 */
router.get('/debug-info', (req, res) => {
  try {
    const debug = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
        RAILWAY_VOLUME_MOUNT_PATH: process.env.RAILWAY_VOLUME_MOUNT_PATH,
        IS_RAILWAY: IS_RAILWAY
      },
      paths: {
        DB_DIR: DB_DIR,
        gebizDbPath: gebizDbPath,
        db_dir_exists: fs.existsSync(DB_DIR),
        db_file_exists: fs.existsSync(gebizDbPath)
      },
      database: {
        connected: !!gebizDb,
        manager_available: !!tableManager,
        manager_initialized: tableManager?.initialized || false
      }
    };

    // Add database file stats if it exists
    if (fs.existsSync(gebizDbPath)) {
      const stats = fs.statSync(gebizDbPath);
      debug.paths.db_file_size = stats.size;
      debug.paths.db_file_modified = stats.mtime;
    }

    res.json({ success: true, debug });

  } catch (error) {
    console.error('Debug info error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to get debug info'
    });
  }
});

module.exports = router;
