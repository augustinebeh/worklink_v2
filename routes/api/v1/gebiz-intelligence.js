/**
 * GeBIZ Intelligence API Routes
 * Historical tender data from Data.gov.sg + Competitor intelligence
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db } = require('../../../db');
const { createLogger } = require('../../../utils/structured-logger');
const logger = createLogger('gebiz-intelligence');

// Helper to check if a table exists in the database
function tableExists(tableName) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
}

/**
 * GET /api/v1/gebiz/dashboard
 * Get dashboard overview statistics
 */
router.get('/dashboard', (req, res) => {
  try {
    if (!tableExists('gebiz_historical_tenders')) {
      return res.json({ success: true, stats: { total_tenders: 0, total_suppliers: 0, total_value: 0, recent_tenders: 0, active_tenders: 0, pending_alerts: 0 } });
    }

    const stats = {
      // Total historical tenders
      total_tenders: db.prepare(`
        SELECT COUNT(*) as count FROM gebiz_historical_tenders
      `).get().count,

      // Unique suppliers tracked
      total_suppliers: db.prepare(`
        SELECT COUNT(DISTINCT supplier_name) as count
        FROM gebiz_historical_tenders
      `).get().count,

      // Total contract value
      total_value: db.prepare(`
        SELECT COALESCE(SUM(awarded_amount), 0) as sum
        FROM gebiz_historical_tenders
      `).get().sum,

      // Recent tenders (last 30 days)
      recent_tenders: db.prepare(`
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
    logger.error('Dashboard error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/gebiz/competitors
 * Get top competitors list
 */
router.get('/competitors', (req, res) => {
  try {
    if (!tableExists('gebiz_historical_tenders')) {
      return res.json({ success: true, competitors: [] });
    }

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

    const competitors = db.prepare(query).all(...params);

    res.json({ success: true, competitors });

  } catch (error) {
    logger.error('Competitors error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/gebiz/competitor/:name
 * Get specific competitor details
 */
router.get('/competitor/:name', (req, res) => {
  try {
    if (!tableExists('gebiz_historical_tenders')) {
      return res.json({ success: true, competitor: { name: req.params.name, recent_wins: [], categories: [] } });
    }

    const { name } = req.params;

    // Get recent wins
    const recent_wins = db.prepare(`
      SELECT * FROM gebiz_historical_tenders
      WHERE supplier_name = ?
      ORDER BY award_date DESC
      LIMIT 20
    `).all(name);

    // Get category breakdown
    const categories = db.prepare(`
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
    logger.error('Competitor details error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/gebiz/tenders/historical
 * Search historical tenders
 */
router.get('/tenders/historical', (req, res) => {
  try {
    if (!tableExists('gebiz_historical_tenders')) {
      return res.json({ success: true, tenders: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } });
    }

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
    const total = db.prepare(countQuery).get(...params).count;

    // Get paginated results
    query += ` ORDER BY award_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const tenders = db.prepare(query).all(...params);

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
    logger.error('Historical tenders error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/gebiz/categories
 * Get list of all categories
 */
router.get('/categories', (req, res) => {
  try {
    if (!tableExists('gebiz_historical_tenders')) {
      return res.json({ success: true, categories: [] });
    }

    const categories = db.prepare(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM gebiz_historical_tenders
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `).all();

    res.json({ success: true, categories });

  } catch (error) {
    logger.error('Categories error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/gebiz/agencies
 * Get list of all agencies
 */
router.get('/agencies', (req, res) => {
  try {
    if (!tableExists('gebiz_historical_tenders')) {
      return res.json({ success: true, agencies: [] });
    }

    const agencies = db.prepare(`
      SELECT DISTINCT agency, COUNT(*) as tender_count
      FROM gebiz_historical_tenders
      WHERE agency IS NOT NULL
      GROUP BY agency
      ORDER BY tender_count DESC
    `).all();

    res.json({ success: true, agencies });

  } catch (error) {
    logger.error('Agencies error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/gebiz/sync/status
 * Get current sync status (for polling)
 */
router.get('/sync/status', (req, res) => {
  try {
    const syncServicePath = path.join(__dirname, '../../../services/gebiz-scraping/historical-sync.js');
    if (!fs.existsSync(syncServicePath)) {
      return res.json({ success: true, data: { is_running: false, stage: 'idle', progress: 0 } });
    }
    const historicalSync = require(syncServicePath);
    res.json({ success: true, data: historicalSync.getStatus() });
  } catch (error) {
    res.json({ success: true, data: { is_running: false, stage: 'idle', progress: 0 } });
  }
});

/**
 * POST /api/v1/gebiz/sync/historical
 * Trigger historical data sync
 */
router.post('/sync/historical', async (req, res) => {
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
    historicalSync.dailySync().catch(err => logger.error('Historical sync failed', { error: err.message }));

    res.json({
      success: true,
      message: 'Historical sync started in background'
    });

  } catch (error) {
    logger.error('Sync trigger error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/gebiz/stats
 * Get database statistics
 */
router.get('/stats', (req, res) => {
  try {
    if (!tableExists('gebiz_historical_tenders')) {
      return res.json({ success: true, stats: { tenders: 0, suppliers: 0, agencies: 0, total_value: 0, date_range: { min: null, max: null } } });
    }

    const stats = {
      tenders: db.prepare('SELECT COUNT(*) as count FROM gebiz_historical_tenders').get().count,
      suppliers: db.prepare('SELECT COUNT(DISTINCT supplier_name) as count FROM gebiz_historical_tenders').get().count,
      agencies: db.prepare('SELECT COUNT(DISTINCT agency) as count FROM gebiz_historical_tenders').get().count,
      total_value: db.prepare('SELECT COALESCE(SUM(awarded_amount), 0) as sum FROM gebiz_historical_tenders').get().sum,
      date_range: db.prepare('SELECT MIN(award_date) as min, MAX(award_date) as max FROM gebiz_historical_tenders').get()
    };

    res.json({ success: true, stats });

  } catch (error) {
    logger.error('Stats error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/gebiz/health
 * Health check endpoint - verifies database and table status
 */
router.get('/health', (req, res) => {
  try {
    const IS_RAILWAY = !!process.env.RAILWAY_ENVIRONMENT;

    const health = {
      database_connected: !!db,
      environment: IS_RAILWAY ? 'Railway' : 'Local',
      table_status: {}
    };

    // Check each critical table
    const criticalTables = [
      'gebiz_historical_tenders',
      'gebiz_active_tenders',
      'scraping_config'
    ];

    criticalTables.forEach(tableName => {
      health.table_status[tableName] = tableExists(tableName);
    });

    health.all_tables_ready = Object.values(health.table_status).every(status => status === true);

    const statusCode = health.database_connected && health.all_tables_ready ? 200 : 503;
    res.status(statusCode).json({ success: health.all_tables_ready, health });

  } catch (error) {
    logger.error('Health check error', { error: error.message });
    res.status(503).json({
      success: false,
      health: { error: 'Internal server error' },
      message: 'Health check failed'
    });
  }
});

/**
 * POST /api/v1/gebiz/init-tables
 * Force table initialization - useful for Railway deployment debugging
 */
router.post('/init-tables', (req, res) => {
  try {
    // Get table status
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table'
      ORDER BY name
    `).all();

    res.json({
      success: true,
      message: 'Tables checked successfully',
      tables: tables.map(t => t.name),
      count: tables.length
    });

  } catch (error) {
    logger.error('Table initialization error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Table check failed'
    });
  }
});

/**
 * GET /api/v1/gebiz/debug-info
 * Debug information for troubleshooting Railway deployment
 */
router.get('/debug-info', (req, res) => {
  try {
    const IS_RAILWAY = !!process.env.RAILWAY_ENVIRONMENT;

    const debug = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
        RAILWAY_VOLUME_MOUNT_PATH: process.env.RAILWAY_VOLUME_MOUNT_PATH,
        IS_RAILWAY
      },
      database: {
        connected: !!db
      }
    };

    res.json({ success: true, debug });

  } catch (error) {
    logger.error('Debug info error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get debug info'
    });
  }
});

module.exports = router;
