/**
 * Capacity Management Routes
 * Endpoints for managing consultant capacity and sourcing control
 * 
 * @module consultant-performance/capacity/routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { CapacityManagementSystem } = require('../../../../../utils/capacity-management');
const { authenticateAdmin } = require('../../../../../middleware/auth');

const capacityManager = new CapacityManagementSystem();

/**
 * GET /capacity/status
 * Get current capacity utilization and alerts
 */
router.get('/status', authenticateAdmin, async (req, res) => {
  try {
    const capacity = await capacityManager.getCurrentCapacity();
    const canAccept = await capacityManager.canAcceptNewCandidates();
    const sourcing = await capacityManager.getRecommendedSourcingRate();
    const alerts = await capacityManager.checkCapacityAlerts();

    res.json({
      success: true,
      data: {
        capacity,
        canAcceptNew: canAccept.canAccept,
        recommendedSourcingRate: sourcing.rate,
        currentAction: sourcing.action,
        alerts,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /capacity/emergency-brake
 * Activate emergency brake to stop all sourcing
 */
router.post('/emergency-brake', authenticateAdmin, async (req, res) => {
  try {
    const result = await capacityManager.emergencyBrake();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /capacity/resume
 * Resume sourcing after emergency brake
 */
router.post('/resume', authenticateAdmin, async (req, res) => {
  try {
    const result = await capacityManager.resumeSourcing();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /capacity/analytics
 * Get capacity analytics and trends
 */
router.get('/analytics', authenticateAdmin, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const analytics = db.prepare(`
      SELECT
        DATE(created_at) as date,
        AVG(daily_utilization) as avg_daily_util,
        AVG(weekly_utilization) as avg_weekly_util,
        AVG(workload_utilization) as avg_workload_util,
        COUNT(CASE WHEN action_taken = 'emergency_brake' THEN 1 END) as emergencies,
        AVG(recommended_rate) as avg_sourcing_rate
      FROM capacity_logs
      WHERE created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all(since);

    res.json({
      success: true,
      data: {
        analytics,
        period: `${days} days`,
        summary: {
          avgDailyUtilization: Math.round(analytics.reduce((sum, a) => sum + a.avg_daily_util, 0) / analytics.length),
          avgSourcingRate: Math.round(analytics.reduce((sum, a) => sum + a.avg_sourcing_rate, 0) / analytics.length),
          totalEmergencies: analytics.reduce((sum, a) => sum + a.emergencies, 0)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
