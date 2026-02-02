/**
 * Escalation Analytics API Routes
 *
 * Provides endpoints for escalation analytics, reporting, and insights.
 */

const express = require('express');
const router = express.Router();
const analyticsService = require('../../../services/escalation-analytics');
const { createLogger } = require('../../../utils/structured-logger');

const logger = createLogger('escalation-analytics-api');

/**
 * GET /api/v1/escalation-analytics/report
 * Generate comprehensive analytics report
 */
router.get('/report', (req, res) => {
  try {
    const {
      dateFrom,
      dateTo,
      adminId,
      priority,
      includeDetailed = false,
      format = 'json'
    } = req.query;

    const filters = {};

    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom);
    }
    if (dateTo) {
      filters.dateTo = new Date(dateTo);
    }
    if (adminId) {
      filters.adminId = adminId;
    }
    if (priority) {
      filters.priority = priority;
    }
    if (includeDetailed === 'true') {
      filters.includeDetailed = true;
    }

    const report = analyticsService.generateAnalyticsReport(filters);

    if (format === 'csv') {
      // Convert to CSV format for Excel export
      const csvData = convertReportToCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="escalation-report.csv"');
      res.send(csvData);
    } else {
      res.json({ success: true, data: report });
    }

  } catch (error) {
    logger.error('Failed to generate analytics report', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/escalation-analytics/leaderboard
 * Get admin performance leaderboard
 */
router.get('/leaderboard', (req, res) => {
  try {
    const { timeframe = 'week' } = req.query;

    const validTimeframes = ['day', 'week', 'month'];
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        success: false,
        error: `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`
      });
    }

    const leaderboard = analyticsService.generateAdminLeaderboard(timeframe);

    res.json({
      success: true,
      data: {
        timeframe,
        leaderboard,
        metadata: {
          generatedAt: new Date().toISOString(),
          totalAdmins: leaderboard.length
        }
      }
    });

  } catch (error) {
    logger.error('Failed to generate leaderboard', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/escalation-analytics/insights
 * Get real-time escalation insights
 */
router.get('/insights', (req, res) => {
  try {
    const insights = analyticsService.getRealTimeInsights();

    res.json({ success: true, data: insights });

  } catch (error) {
    logger.error('Failed to get real-time insights', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/escalation-analytics/dashboard
 * Get dashboard summary data
 */
router.get('/dashboard', (req, res) => {
  try {
    const { timeframe = 'week' } = req.query;

    // Get current period report
    const days = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30;
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const currentReport = analyticsService.generateAnalyticsReport({
      dateFrom,
      dateTo: new Date()
    });

    // Get previous period for comparison
    const previousDateTo = new Date(dateFrom.getTime() - 24 * 60 * 60 * 1000);
    const previousDateFrom = new Date(previousDateTo.getTime() - days * 24 * 60 * 60 * 1000);

    const previousReport = analyticsService.generateAnalyticsReport({
      dateFrom: previousDateFrom,
      dateTo: previousDateTo
    });

    // Get real-time insights
    const insights = analyticsService.getRealTimeInsights();

    // Get top performers
    const topPerformers = analyticsService.generateAdminLeaderboard(timeframe).slice(0, 5);

    // Calculate trends
    const trends = {
      totalEscalations: calculateTrend(
        currentReport.summary.total_escalations,
        previousReport.summary.total_escalations
      ),
      resolutionRate: calculateTrend(
        currentReport.summary.resolution_rate_percent,
        previousReport.summary.resolution_rate_percent
      ),
      slaCompliance: calculateTrend(
        currentReport.summary.sla_compliance_rate_percent,
        previousReport.summary.sla_compliance_rate_percent
      ),
      avgSatisfaction: calculateTrend(
        currentReport.summary.avg_satisfaction || 0,
        previousReport.summary.avg_satisfaction || 0
      )
    };

    res.json({
      success: true,
      data: {
        timeframe,
        summary: currentReport.summary,
        trends,
        distributions: currentReport.distributions,
        topPerformers,
        realTimeInsights: insights,
        charts: {
          dailyTrend: currentReport.trends.daily,
          hourlyPattern: currentReport.trends.hourly,
          priorityDistribution: currentReport.distributions.byPriority,
          triggerAnalysis: currentReport.distributions.byTriggerType
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get dashboard data', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/escalation-analytics/admin/:adminId
 * Get detailed analytics for specific admin
 */
router.get('/admin/:adminId', (req, res) => {
  try {
    const { adminId } = req.params;
    const {
      dateFrom,
      dateTo,
      includeDetailed = false
    } = req.query;

    const filters = { adminId };

    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom);
    }
    if (dateTo) {
      filters.dateTo = new Date(dateTo);
    }
    if (includeDetailed === 'true') {
      filters.includeDetailed = true;
    }

    const report = analyticsService.generateAnalyticsReport(filters);

    // Get admin rank in leaderboard
    const leaderboard = analyticsService.generateAdminLeaderboard('week');
    const adminRank = leaderboard.find(admin => admin.admin_id === adminId)?.rank || null;

    res.json({
      success: true,
      data: {
        ...report,
        adminRank,
        totalAdmins: leaderboard.length
      }
    });

  } catch (error) {
    logger.error('Failed to get admin analytics', {
      admin_id: req.params.adminId,
      error: error.message
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/escalation-analytics/update-metrics
 * Manually trigger daily metrics update
 */
router.post('/update-metrics', (req, res) => {
  try {
    analyticsService.updateDailyMetrics();

    res.json({
      success: true,
      message: 'Daily metrics updated successfully'
    });

  } catch (error) {
    logger.error('Failed to update daily metrics', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/escalation-analytics/export
 * Export analytics data in various formats
 */
router.get('/export', (req, res) => {
  try {
    const {
      format = 'json',
      type = 'summary', // 'summary', 'detailed', 'leaderboard'
      dateFrom,
      dateTo,
      adminId
    } = req.query;

    const filters = {};
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);
    if (adminId) filters.adminId = adminId;

    let data;
    let filename;

    switch (type) {
      case 'leaderboard':
        data = analyticsService.generateAdminLeaderboard('month');
        filename = 'admin-leaderboard';
        break;
      case 'detailed':
        data = analyticsService.generateAnalyticsReport({ ...filters, includeDetailed: true });
        filename = 'escalation-detailed-report';
        break;
      default:
        data = analyticsService.generateAnalyticsReport(filters);
        filename = 'escalation-summary-report';
    }

    if (format === 'csv') {
      const csvData = convertToCSV(data, type);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csvData);
    } else if (format === 'xlsx') {
      // Would need xlsx library for Excel export
      res.status(501).json({
        success: false,
        error: 'Excel export not implemented. Use CSV format.'
      });
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json(data);
    }

  } catch (error) {
    logger.error('Failed to export analytics data', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Helper function to calculate trend percentage
 */
function calculateTrend(current, previous) {
  if (!previous || previous === 0) {
    return { value: current, change: 0, direction: 'stable' };
  }

  const change = ((current - previous) / previous) * 100;
  return {
    value: current,
    change: Math.round(change * 100) / 100,
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
  };
}

/**
 * Helper function to convert data to CSV
 */
function convertToCSV(data, type) {
  if (type === 'leaderboard') {
    const headers = [
      'Rank', 'Admin ID', 'Escalations Handled', 'Resolution Rate (%)',
      'Avg Resolution Time (min)', 'Avg Satisfaction', 'SLA Compliance (%)',
      'Performance Score'
    ];

    const rows = data.map(admin => [
      admin.rank,
      admin.admin_id,
      admin.escalations_handled,
      admin.resolution_rate.toFixed(1),
      admin.avg_resolution_time?.toFixed(1) || 'N/A',
      admin.avg_satisfaction?.toFixed(2) || 'N/A',
      admin.sla_compliance_rate.toFixed(1),
      admin.performance_score.toFixed(1)
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  // For summary reports, create a basic CSV with key metrics
  const summary = data.summary || data;
  const lines = [
    'Metric,Value',
    `Total Escalations,${summary.total_escalations}`,
    `Resolved Escalations,${summary.resolved_count}`,
    `Resolution Rate (%),${summary.resolution_rate_percent?.toFixed(1) || 'N/A'}`,
    `SLA Compliance (%),${summary.sla_compliance_rate_percent?.toFixed(1) || 'N/A'}`,
    `Avg Response Time (min),${summary.avg_first_response_time_minutes?.toFixed(1) || 'N/A'}`,
    `Avg Resolution Time (min),${summary.avg_resolution_time_minutes?.toFixed(1) || 'N/A'}`,
    `Avg Satisfaction,${summary.avg_satisfaction?.toFixed(2) || 'N/A'}`,
    `SLA Breaches,${summary.sla_breaches}`,
    `Feedback Response Rate (%),${summary.feedback_response_rate?.toFixed(1) || 'N/A'}`
  ];

  return lines.join('\n');
}

module.exports = router;