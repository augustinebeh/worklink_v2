/**
 * BPO Health Check Routes
 * System health check for all BPO components
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');

// Helper: check if a table exists (Railway compatibility)
function tableExists(tableName) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
}

/**
 * GET /api/v1/bpo/health
 * System health check for all BPO components
 */
router.get('/', (req, res) => {
  try {
    const health = {
      database: checkDatabaseHealth(),
      tenderCount: tableExists('tenders') ? db.prepare('SELECT COUNT(*) as count FROM tenders').get().count : 0,
      alertCount: tableExists('tender_alerts') ? db.prepare('SELECT COUNT(*) as count FROM tender_alerts').get().count : 0,
      campaignCount: tableExists('outreach_campaigns') ? db.prepare('SELECT COUNT(*) as count FROM outreach_campaigns').get().count : 0,
      overallStatus: 'healthy',
      lastChecked: new Date().toISOString()
    };

    res.json({
      success: true,
      health
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: 'Internal server error'
    });
  }
});

function checkDatabaseHealth() {
  try {
    db.prepare('SELECT 1').get();
    return { status: 'healthy', message: 'Database connection OK' };
  } catch (error) {
    return { status: 'error', message: 'Internal server error' };
  }
}

module.exports = router;
