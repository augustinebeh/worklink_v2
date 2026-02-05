/**
 * GeBIZ Intelligence API Routes
 * Historical tender data from Data.gov.sg + Competitor intelligence
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');

// Database connection
const gebizDbPath = path.join(__dirname, '../../../database/gebiz_intelligence.db');
let gebizDb;

// Initialize database connection
try {
  gebizDb = new Database(gebizDbPath);
  gebizDb.pragma('journal_mode = WAL');
  console.log('✅ GeBIZ Intelligence database connected');
} catch (error) {
  console.error('❌ GeBIZ Intelligence database connection failed:', error.message);
  console.error('   Database path:', gebizDbPath);
  console.error('   Run: node scripts/init-gebiz-database.js');
}

/**
 * GET /api/v1/gebiz/dashboard
 * Get dashboard overview statistics
 */
router.get('/dashboard', (req, res) => {
  try {
    if (!gebizDb) {
      return res.status(503).json({
        success: false,
        error: 'GeBIZ database not initialized. Run: node scripts/init-gebiz-database.js'
      });
    }

    // Check if gebiz_historical_tenders table exists (Railway compatibility)
    const tableCheck = gebizDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gebiz_historical_tenders'").get();

    if (!tableCheck) {
      // Return empty stats if table doesn't exist
      const stats = {
        total_tenders: 0,
        total_suppliers: 0,
        total_value: 0,
        recent_tenders: 0,
        active_tenders: 0,
        pending_alerts: 0
      };
      return res.json({
        success: true,
        stats,
        message: 'Historical tenders table not available on this deployment'
      });
    }

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
router.get('/competitors', (req, res) => {
  try {
    if (!gebizDb) {
      return res.status(503).json({
        success: false,
        error: 'GeBIZ database not initialized'
      });
    }

    // Check if gebiz_historical_tenders table exists (Railway compatibility)
    const tableCheck = gebizDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gebiz_historical_tenders'").get();

    if (!tableCheck) {
      // Return empty competitors if table doesn't exist
      return res.json({
        success: true,
        competitors: [],
        message: 'Historical tenders table not available on this deployment'
      });
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
router.get('/competitor/:name', (req, res) => {
  try {
    if (!gebizDb) {
      return res.status(503).json({
        success: false,
        error: 'GeBIZ database not initialized'
      });
    }

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
router.get('/tenders/historical', (req, res) => {
  try {
    if (!gebizDb) {
      return res.status(503).json({
        success: false,
        error: 'GeBIZ database not initialized'
      });
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
router.get('/categories', (req, res) => {
  try {
    if (!gebizDb) {
      return res.status(503).json({
        success: false,
        error: 'GeBIZ database not initialized'
      });
    }

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
router.get('/agencies', (req, res) => {
  try {
    if (!gebizDb) {
      return res.status(503).json({
        success: false,
        error: 'GeBIZ database not initialized'
      });
    }

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
router.post('/sync/historical', async (req, res) => {
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
router.get('/stats', (req, res) => {
  try {
    if (!gebizDb) {
      return res.status(503).json({
        success: false,
        error: 'GeBIZ database not initialized'
      });
    }

    // Check if gebiz_historical_tenders table exists (Railway compatibility)
    const tableCheck = gebizDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gebiz_historical_tenders'").get();

    if (!tableCheck) {
      // Return empty stats if table doesn't exist
      const stats = {
        tenders: 0,
        suppliers: 0,
        agencies: 0,
        total_value: 0,
        date_range: { min: null, max: null }
      };
      return res.json({
        success: true,
        stats,
        message: 'Historical tenders table not available on this deployment'
      });
    }

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

module.exports = router;
