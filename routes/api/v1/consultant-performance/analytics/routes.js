/**
 * Analytics Routes
 * Endpoints for consultant performance analytics and reporting
 * 
 * @module consultant-performance/analytics/routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { ConsultantAnalyticsEngine } = require('../../../../../utils/consultant-analytics-engine');
const { calculateTrendAnalysis } = require('../utils/helpers');

const analyticsEngine = new ConsultantAnalyticsEngine();

/**
 * POST /analytics/calculate-daily
 * Calculate daily performance analytics for consultants
 */
router.post('/calculate-daily', async (req, res) => {
  try {
    const { consultantIds, date } = req.body;
    const result = await analyticsEngine.runDailyAnalytics(consultantIds, date);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /analytics/calculate-kpis
 * Calculate KPI scores and rankings for team
 */
router.post('/calculate-kpis', async (req, res) => {
  try {
    const { period = 'weekly', startDate } = req.body;
    const result = await analyticsEngine.runWeeklyKPICalculation();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /analytics/dashboard/:consultantId
 * Get individual consultant dashboard with comprehensive analytics
 */
router.get('/dashboard/:consultantId', async (req, res) => {
  try {
    const { consultantId } = req.params;
    const { period = 'weekly' } = req.query;

    const dashboard = await analyticsEngine.getConsultantDashboard(consultantId, period);

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /analytics/performance-trends
 * Get performance trends over time
 */
router.get('/performance-trends', async (req, res) => {
  try {
    const { days = 30, consultantId } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let query = `
      SELECT
        date,
        AVG(overall_performance_score) as value
      FROM consultant_performance_daily
      WHERE date >= ?
    `;
    
    const params = [since];
    
    if (consultantId) {
      query += ` AND consultant_id = ?`;
      params.push(consultantId);
    }
    
    query += ` GROUP BY date ORDER BY date ASC`;

    const trends = db.prepare(query).all(...params);
    const analysis = calculateTrendAnalysis(trends, 'performance');

    res.json({
      success: true,
      data: {
        trends,
        analysis,
        period: `${days} days`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /analytics/real-time-metrics
 * Get real-time performance metrics for dashboard widgets
 */
router.get('/real-time-metrics', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const todayMetrics = db.prepare(`
      SELECT
        COUNT(DISTINCT consultant_id) as active_consultants,
        AVG(overall_performance_score) as avg_performance,
        AVG(efficiency_score) as avg_efficiency,
        AVG(quality_score) as avg_quality,
        SUM(candidates_scheduled) as total_scheduled,
        SUM(candidates_converted) as total_converted
      FROM consultant_performance_daily
      WHERE date = ?
    `).get(today);

    const alertCounts = db.prepare(`
      SELECT
        severity,
        COUNT(*) as count
      FROM consultant_alerts
      WHERE status = 'active'
      GROUP BY severity
    `).all();

    const pendingRecommendations = db.prepare(`
      SELECT COUNT(*) as count
      FROM coaching_recommendations
      WHERE status IN ('pending', 'in_progress')
    `).get();

    const topPerformers = db.prepare(`
      SELECT consultant_id, overall_performance_score
      FROM consultant_performance_daily
      WHERE date = ?
      ORDER BY overall_performance_score DESC
      LIMIT 5
    `).all(today);

    const performanceDistribution = db.prepare(`
      SELECT
        CASE
          WHEN overall_performance_score >= 90 THEN 'Excellent'
          WHEN overall_performance_score >= 75 THEN 'Good'
          WHEN overall_performance_score >= 60 THEN 'Average'
          WHEN overall_performance_score >= 40 THEN 'Needs Improvement'
          ELSE 'Critical'
        END as performance_tier,
        COUNT(*) as count
      FROM consultant_performance_daily
      WHERE date = ?
      GROUP BY performance_tier
    `).all(today);

    res.json({
      success: true,
      data: {
        summary: {
          ...todayMetrics,
          conversionRate: todayMetrics.total_scheduled > 0 ?
            Math.round((todayMetrics.total_converted / todayMetrics.total_scheduled) * 100) : 0
        },
        alerts: {
          bySeverity: alertCounts,
          total: alertCounts.reduce((sum, alert) => sum + alert.count, 0)
        },
        coaching: {
          pendingRecommendations: pendingRecommendations.count
        },
        topPerformers,
        performanceDistribution,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
