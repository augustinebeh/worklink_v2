/**
 * BPO Unified Data Routes
 * Returns complete BPO dashboard data in a single call
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { getBPOOverviewStats, getPerformanceMetrics } = require('../helpers/metrics-calculator');
const { getTendersWithStats, getActiveAlerts, getRecentMatches, getActiveCampaigns, getTopOpportunities, getRecentAIActivity } = require('../helpers/resource-optimizer');

// Helper: check if a table exists (Railway compatibility)
function tableExists(tableName) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
}

/**
 * GET /api/v1/bpo/unified-data
 * Returns complete BPO dashboard data in a single call
 * Eliminates need for multiple API calls across admin pages
 */
router.get('/', (req, res) => {
  try {
    const { timeframe = '30d', limit = 50 } = req.query;

    // Calculate date range for timeframe filtering
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

    const unifiedData = {
      stats: {
        totalTenders: tableExists('tenders') ? db.prepare('SELECT COUNT(*) as count FROM tenders').get().count : 0,
        totalClients: tableExists('clients') ? db.prepare('SELECT COUNT(*) as count FROM clients').get().count : 0,
        totalAlerts: tableExists('tender_alerts') ? db.prepare('SELECT COUNT(*) as count FROM tender_alerts').get().count : 0,
        totalCampaigns: tableExists('outreach_campaigns') ? db.prepare('SELECT COUNT(*) as count FROM outreach_campaigns').get().count : 0
      },
      recentTenders: tableExists('tenders') ? db.prepare('SELECT * FROM tenders ORDER BY created_at DESC LIMIT ?').all(limit) : [],
      systemHealth: {
        status: 'operational',
        timestamp: new Date().toISOString()
      }
    };

    res.json({
      success: true,
      data: unifiedData,
      metadata: {
        generatedAt: new Date().toISOString(),
        timeframe,
        limit
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unified BPO data',
      details: 'Internal server error'
    });
  }
});

module.exports = router;
