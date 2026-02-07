/**
 * Intelligence API Routes
 * Consolidated GeBIZ historical intelligence + Contract renewals
 * Historical tender data from Data.gov.sg + Competitor intelligence + Contract renewal tracking
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db: mainDb } = require('../../../db');

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
const IS_RAILWAY = !!process.env.RAILWAY_ENVIRONMENT; // Only true on actual Railway
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

// ========================================
// DASHBOARD ENDPOINTS
// ========================================

/**
 * GET /api/v1/intelligence/dashboard
 * Get dashboard overview statistics from historical tenders
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
 * GET /api/v1/intelligence/stats
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

// ========================================
// COMPETITORS ENDPOINTS
// ========================================

/**
 * GET /api/v1/intelligence/competitors
 * Get top competitors list with period and category filters
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
 * GET /api/v1/intelligence/competitors/:name
 * Get specific competitor details
 */
router.get('/competitors/:name', ensureGeBIZTablesMiddleware, (req, res) => {
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

// ========================================
// HISTORICAL TENDERS ENDPOINTS
// ========================================

/**
 * GET /api/v1/intelligence/tenders
 * Search historical tenders with comprehensive filters and pagination
 */
router.get('/tenders', ensureGeBIZTablesMiddleware, (req, res) => {
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

// ========================================
// REFERENCE DATA ENDPOINTS
// ========================================

/**
 * GET /api/v1/intelligence/categories
 * Get list of all tender categories
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
 * GET /api/v1/intelligence/agencies
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

// ========================================
// RENEWALS ENDPOINTS (Main Database)
// ========================================

/**
 * GET /api/v1/intelligence/renewals
 * List contract renewals with comprehensive filters
 */
router.get('/renewals', (req, res) => {
  try {
    const {
      status,
      months_ahead,
      min_probability,
      agency,
      assigned_to,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `SELECT * FROM contract_renewals WHERE 1=1`;
    const params = [];

    // Apply filters
    if (status) {
      query += ` AND engagement_status = ?`;
      params.push(status);
    }

    if (months_ahead) {
      query += ` AND months_until_expiry <= ?`;
      params.push(parseInt(months_ahead));
    }

    if (min_probability) {
      query += ` AND renewal_probability >= ?`;
      params.push(parseFloat(min_probability));
    }

    if (agency) {
      query += ` AND agency_name LIKE ?`;
      params.push(`%${agency}%`);
    }

    if (assigned_to) {
      query += ` AND assigned_to = ?`;
      params.push(assigned_to);
    }

    if (search) {
      query += ` AND (contract_title LIKE ? OR tender_reference LIKE ? OR agency_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const total = mainDb.prepare(countQuery).get(...params).count;

    // Get paginated results
    query += ` ORDER BY months_until_expiry ASC, renewal_probability DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const renewals = mainDb.prepare(query).all(...params);

    res.json({
      success: true,
      renewals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Renewals list error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/intelligence/renewals/:id
 * Get single renewal detail
 */
router.get('/renewals/:id', (req, res) => {
  try {
    const { id } = req.params;

    const renewal = mainDb.prepare(`
      SELECT * FROM contract_renewals WHERE id = ?
    `).get(id);

    if (!renewal) {
      return res.status(404).json({
        success: false,
        error: 'Renewal not found'
      });
    }

    res.json({ success: true, renewal });

  } catch (error) {
    console.error('Renewal detail error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/intelligence/renewals/:id/watch
 * Push a renewal to the pipeline (creates bpo_tender_lifecycle entry)
 */
router.post('/renewals/:id/watch', (req, res) => {
  try {
    const { id } = req.params;

    // Get the renewal from contract_renewals
    const renewal = mainDb.prepare(`
      SELECT * FROM contract_renewals WHERE id = ?
    `).get(id);

    if (!renewal) {
      return res.status(404).json({
        success: false,
        error: 'Renewal not found'
      });
    }

    // Check if already being watched
    if (renewal.engagement_status === 'watching') {
      return res.status(400).json({
        success: false,
        error: 'Renewal is already being watched'
      });
    }

    // Create a new bpo_tender_lifecycle entry
    const tenderId = uuidv4();
    const now = new Date().toISOString();

    mainDb.prepare(`
      INSERT INTO bpo_tender_lifecycle (
        id,
        tender_no,
        title,
        agency,
        closing_date,
        estimated_value,
        stage,
        is_renewal,
        renewal_source_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tenderId,
      renewal.tender_reference || `RENEWAL-${renewal.id}`,
      renewal.contract_title,
      renewal.agency_name,
      renewal.estimated_renewal_date || null,
      renewal.contract_value || null,
      'renewal_watch',
      1,
      renewal.id,
      now,
      now
    );

    // Update the renewal's engagement_status to 'watching'
    mainDb.prepare(`
      UPDATE contract_renewals
      SET engagement_status = 'watching',
          updated_at = ?
      WHERE id = ?
    `).run(now, id);

    // Get the created tender
    const newTender = mainDb.prepare(`
      SELECT * FROM bpo_tender_lifecycle WHERE id = ?
    `).get(tenderId);

    res.json({
      success: true,
      message: 'Renewal added to pipeline watch',
      tender: newTender,
      renewal_id: id
    });

  } catch (error) {
    console.error('Renewal watch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// DATA SYNC ENDPOINTS
// ========================================

/**
 * POST /api/v1/intelligence/sync
 * Trigger Data.gov.sg historical sync
 */
router.post('/sync', ensureGeBIZTablesMiddleware, async (req, res) => {
  try {
    // Check if sync service is available
    const syncServicePath = path.join(__dirname, '../../../services/gebiz-scraping/historical-sync.js');

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
 * GET /api/v1/intelligence/health
 * Health check endpoint - verifies database and table status
 */
router.get('/health', (req, res) => {
  try {
    const health = {
      database_connected: !!gebizDb,
      main_database_connected: !!mainDb,
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

    // Check main database tables
    try {
      const mainTables = mainDb.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name IN ('contract_renewals', 'bpo_tender_lifecycle')
      `).all();
      health.main_db_tables = mainTables.map(t => t.name);
    } catch (error) {
      health.main_db_error = error.message;
    }

    const statusCode = health.database_connected && health.main_database_connected && health.all_tables_ready ? 200 : 503;
    res.status(statusCode).json({ success: health.all_tables_ready && health.main_database_connected, health });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      health: { error: error.message },
      message: 'Health check failed'
    });
  }
});

// ========================================
// MARKET INTELLIGENCE ENDPOINTS
// ========================================

/**
 * GET /api/v1/intelligence/market-report
 * Aggregate market intelligence data
 */
router.get('/market-report', ensureGeBIZTablesMiddleware, (req, res) => {
  try {
    const { period = 12 } = req.query;

    // Top agencies by spend
    const top_agencies = gebizDb.prepare(`
      SELECT
        agency,
        COUNT(*) as tender_count,
        SUM(awarded_amount) as total_spend,
        AVG(awarded_amount) as avg_spend
      FROM gebiz_historical_tenders
      WHERE award_date >= date('now', '-' || ? || ' months')
        AND agency IS NOT NULL
      GROUP BY agency
      ORDER BY total_spend DESC
      LIMIT 10
    `).all(period);

    // Top categories
    const top_categories = gebizDb.prepare(`
      SELECT
        category,
        COUNT(*) as tender_count,
        SUM(awarded_amount) as total_value,
        AVG(awarded_amount) as avg_value
      FROM gebiz_historical_tenders
      WHERE award_date >= date('now', '-' || ? || ' months')
        AND category IS NOT NULL
      GROUP BY category
      ORDER BY total_value DESC
      LIMIT 10
    `).all(period);

    // Monthly trends
    const monthly_trends = gebizDb.prepare(`
      SELECT
        strftime('%Y-%m', award_date) as month,
        COUNT(*) as tender_count,
        SUM(awarded_amount) as total_value,
        AVG(awarded_amount) as avg_value
      FROM gebiz_historical_tenders
      WHERE award_date >= date('now', '-' || ? || ' months')
      GROUP BY month
      ORDER BY month DESC
    `).all(period);

    res.json({
      success: true,
      market_report: {
        period_months: parseInt(period),
        top_agencies,
        top_categories,
        monthly_trends
      }
    });

  } catch (error) {
    console.error('Market report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
