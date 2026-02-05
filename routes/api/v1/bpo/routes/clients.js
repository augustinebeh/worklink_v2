/**
 * BPO Client Management Routes
 * Handles client-related operations and statistics
 */

const express = require('express');
const router = express.Router();
const { getClientOverview } = require('../helpers/metrics-calculator');

/**
 * GET /clients/overview
 * Get client overview statistics
 */
router.get('/overview', (req, res) => {
  try {
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(__dirname, '../../../../../data/worklink.db');
    const db = new Database(dbPath);

    const overview = getClientOverview(db);
    db.close();

    res.json({
      success: true,
      data: overview,
      metadata: {
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch client overview',
      details: error.message
    });
  }
});

/**
 * GET /clients/active
 * Get list of active clients with their tender assignments
 */
router.get('/active', (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(__dirname, '../../../../../data/worklink.db');
    const db = new Database(dbPath);

    const clients = db.prepare(`
      SELECT
        c.*,
        COUNT(t.id) as assigned_tenders,
        COUNT(CASE WHEN t.status IN ('new', 'reviewing', 'bidding') THEN 1 END) as active_tenders,
        AVG(t.win_probability) as avg_win_probability,
        SUM(t.estimated_value) as total_assigned_value
      FROM clients c
      LEFT JOIN tenders t ON c.id = t.assigned_to
      WHERE c.status = 'active'
      GROUP BY c.id
      ORDER BY assigned_tenders DESC, c.company_name ASC
      LIMIT ?
    `).all(parseInt(limit));

    db.close();

    res.json({
      success: true,
      data: clients,
      metadata: {
        totalCount: clients.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active clients',
      details: error.message
    });
  }
});

/**
 * GET /clients/performance
 * Get client performance metrics
 */
router.get('/performance', (req, res) => {
  try {
    const { timeframe = '30d', limit = 25 } = req.query;
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(__dirname, '../../../../../data/worklink.db');
    const db = new Database(dbPath);

    // Calculate date range
    const now = new Date();
    let startDate;
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case '30d':
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        break;
      case '90d':
        startDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
        break;
      default:
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    }

    const performance = db.prepare(`
      SELECT
        c.id,
        c.company_name,
        c.contact_name,
        COUNT(t.id) as total_tenders,
        COUNT(CASE WHEN t.status = 'won' THEN 1 END) as won_tenders,
        COUNT(CASE WHEN t.status = 'lost' THEN 1 END) as lost_tenders,
        AVG(t.win_probability) as avg_win_probability,
        SUM(CASE WHEN t.status = 'won' THEN t.estimated_value END) as won_value,
        MIN(t.created_at) as first_tender_date,
        MAX(t.updated_at) as last_activity_date
      FROM clients c
      LEFT JOIN tenders t ON c.id = t.assigned_to AND t.created_at >= ?
      WHERE c.status = 'active'
      GROUP BY c.id
      HAVING total_tenders > 0
      ORDER BY won_tenders DESC, avg_win_probability DESC
      LIMIT ?
    `).all(startDate.toISOString(), parseInt(limit));

    // Calculate win rate for each client
    const enhanced = performance.map(client => ({
      ...client,
      win_rate: client.total_tenders > 0
        ? ((client.won_tenders / client.total_tenders) * 100).toFixed(1)
        : '0.0',
      avg_win_probability: client.avg_win_probability ? client.avg_win_probability.toFixed(1) : '0.0',
      won_value: client.won_value || 0
    }));

    db.close();

    res.json({
      success: true,
      data: enhanced,
      metadata: {
        timeframe,
        totalCount: enhanced.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch client performance',
      details: error.message
    });
  }
});

/**
 * GET /clients/:id/tenders
 * Get tenders assigned to a specific client
 */
router.get('/:id/tenders', (req, res) => {
  try {
    const { id } = req.params;
    const { status = 'all', limit = 25 } = req.query;
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(__dirname, '../../../../../data/worklink.db');
    const db = new Database(dbPath);

    let whereClause = 'WHERE t.assigned_to = ?';
    let params = [id];

    if (status !== 'all') {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }

    const tenders = db.prepare(`
      SELECT
        t.*,
        c.company_name as client_company,
        COUNT(oc.id) as related_campaigns,
        COUNT(tm.id) as monitoring_matches
      FROM tenders t
      LEFT JOIN clients c ON t.assigned_to = c.id
      LEFT JOIN outreach_campaigns oc ON oc.job_id = t.id
      LEFT JOIN tender_matches tm ON tm.tender_id = t.id
      ${whereClause}
      GROUP BY t.id
      ORDER BY t.created_at DESC
      LIMIT ?
    `).all(...params, parseInt(limit));

    db.close();

    res.json({
      success: true,
      data: tenders,
      metadata: {
        clientId: id,
        status,
        totalCount: tenders.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch client tenders',
      details: error.message
    });
  }
});

/**
 * Health check for client module
 */
router.get('/health', (req, res) => {
  try {
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(__dirname, '../../../../../data/worklink.db');
    const db = new Database(dbPath);

    const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
    const activeClientCount = db.prepare("SELECT COUNT(*) as count FROM clients WHERE status = 'active'").get().count;

    db.close();

    res.json({
      success: true,
      health: {
        status: 'healthy',
        totalClients: clientCount,
        activeClients: activeClientCount,
        lastChecked: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Client health check failed',
      details: error.message
    });
  }
});

module.exports = router;