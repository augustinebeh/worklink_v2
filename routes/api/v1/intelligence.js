/**
 * Intelligence API Routes
 * Consolidated GeBIZ historical intelligence + Contract renewals
 * Historical tender data from Data.gov.sg + Competitor intelligence + Contract renewal tracking
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../../../db');
const { createLogger } = require('../../../utils/structured-logger');
const logger = createLogger('intelligence');

// Helper to check if a table exists in the database
function tableExists(tableName) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
}

// ========================================
// DASHBOARD ENDPOINTS
// ========================================

/**
 * GET /api/v1/intelligence/dashboard
 * Get dashboard overview statistics from historical tenders
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
 * GET /api/v1/intelligence/stats
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

// ========================================
// COMPETITORS ENDPOINTS
// ========================================

/**
 * GET /api/v1/intelligence/competitors
 * Get top competitors list with period and category filters
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
 * GET /api/v1/intelligence/competitors/:name
 * Get specific competitor details
 */
router.get('/competitors/:name', (req, res) => {
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

// ========================================
// HISTORICAL TENDERS ENDPOINTS
// ========================================

/**
 * GET /api/v1/intelligence/tenders
 * Search historical tenders with comprehensive filters and pagination
 */
router.get('/tenders', (req, res) => {
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

// ========================================
// REFERENCE DATA ENDPOINTS
// ========================================

/**
 * GET /api/v1/intelligence/categories
 * Get list of all tender categories
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
 * GET /api/v1/intelligence/agencies
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

// ========================================
// RENEWALS ENDPOINTS (Main Database)
// ========================================

/**
 * GET /api/v1/intelligence/renewals
 * List contract renewals with comprehensive filters
 */
router.get('/renewals', (req, res) => {
  try {
    if (!tableExists('contract_renewals')) {
      return res.json({ success: true, renewals: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } });
    }

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
    const total = db.prepare(countQuery).get(...params).count;

    // Get paginated results
    query += ` ORDER BY months_until_expiry ASC, renewal_probability DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const renewals = db.prepare(query).all(...params);

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
    logger.error('Renewals list error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/intelligence/renewals/:id
 * Get single renewal detail
 */
router.get('/renewals/:id', (req, res) => {
  try {
    if (!tableExists('contract_renewals')) {
      return res.status(404).json({ success: false, error: 'Renewal not found' });
    }

    const { id } = req.params;

    const renewal = db.prepare(`
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
    logger.error('Renewal detail error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/intelligence/renewals/:id/watch
 * Push a renewal to the pipeline (creates bpo_tender_lifecycle entry)
 */
router.post('/renewals/:id/watch', (req, res) => {
  try {
    if (!tableExists('contract_renewals') || !tableExists('bpo_tender_lifecycle')) {
      return res.status(503).json({ success: false, error: 'Required tables not available on this deployment' });
    }

    const { id } = req.params;

    // Get the renewal from contract_renewals
    const renewal = db.prepare(`
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

    db.prepare(`
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
    db.prepare(`
      UPDATE contract_renewals
      SET engagement_status = 'watching',
          updated_at = ?
      WHERE id = ?
    `).run(now, id);

    // Get the created tender
    const newTender = db.prepare(`
      SELECT * FROM bpo_tender_lifecycle WHERE id = ?
    `).get(tenderId);

    res.json({
      success: true,
      message: 'Renewal added to pipeline watch',
      tender: newTender,
      renewal_id: id
    });

  } catch (error) {
    logger.error('Renewal watch error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ========================================
// DATA SYNC ENDPOINTS
// ========================================

/**
 * POST /api/v1/intelligence/sync
 * Trigger Data.gov.sg historical sync
 */
router.post('/sync', async (req, res) => {
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
 * GET /api/v1/intelligence/health
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
      'scraping_config',
      'contract_renewals',
      'bpo_tender_lifecycle'
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

// ========================================
// MARKET INTELLIGENCE ENDPOINTS
// ========================================

/**
 * GET /api/v1/intelligence/market-report
 * Aggregate market intelligence data
 */
router.get('/market-report', (req, res) => {
  try {
    if (!tableExists('gebiz_historical_tenders')) {
      return res.json({ success: true, market_report: { period_months: 12, top_agencies: [], top_categories: [], monthly_trends: [] } });
    }

    const { period = 12 } = req.query;

    // Top agencies by spend
    const top_agencies = db.prepare(`
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
    const top_categories = db.prepare(`
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
    const monthly_trends = db.prepare(`
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
    logger.error('Market report error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
