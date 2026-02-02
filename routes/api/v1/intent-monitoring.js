/**
 * Intent Classifier Monitoring API
 *
 * Real-time monitoring dashboard endpoints for the intent classification system.
 */

const express = require('express');
const router = express.Router();
const monitor = require('../../../services/intent-classifier/monitoring');

/**
 * Get real-time dashboard metrics
 * GET /api/v1/intent-monitoring/dashboard
 */
router.get('/dashboard', (req, res) => {
  try {
    const metrics = monitor.getDashboardMetrics();

    res.json({
      success: true,
      data: {
        ...metrics,
        timestamp: new Date().toISOString(),
        refreshInterval: '30s' // Recommended refresh interval
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get performance report
 * GET /api/v1/intent-monitoring/report?days=7
 */
router.get('/report', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        error: 'Days must be between 1 and 365'
      });
    }

    const report = monitor.generateReport(days);

    if (!report) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate report'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get real-time health status
 * GET /api/v1/intent-monitoring/health
 */
router.get('/health', (req, res) => {
  try {
    const health = monitor.getHealthStatus();
    const dashboardMetrics = monitor.getDashboardMetrics();

    const response = {
      success: true,
      data: {
        ...health,
        metrics: {
          totalClassifications: dashboardMetrics.overview.totalClassifications,
          avgResponseTime: dashboardMetrics.overview.avgResponseTime,
          errorRate: dashboardMetrics.overview.errorRate
        },
        timestamp: new Date().toISOString()
      }
    };

    // Set HTTP status based on health
    if (health.status === 'critical') {
      res.status(503).json(response);
    } else if (health.status === 'warning') {
      res.status(200).json(response);
    } else {
      res.status(200).json(response);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      health: {
        status: 'unknown',
        message: 'Health check failed'
      }
    });
  }
});

/**
 * Get hourly statistics
 * GET /api/v1/intent-monitoring/hourly-stats
 */
router.get('/hourly-stats', (req, res) => {
  try {
    const dashboardMetrics = monitor.getDashboardMetrics();

    res.json({
      success: true,
      data: {
        hourlyStats: dashboardMetrics.hourlyStats,
        summary: {
          last24Hours: dashboardMetrics.hourlyStats.reduce((sum, hour) => sum + hour.classifications, 0),
          avgClassificationsPerHour: Math.round(
            dashboardMetrics.hourlyStats.reduce((sum, hour) => sum + hour.classifications, 0) /
            Math.max(1, dashboardMetrics.hourlyStats.length)
          ),
          peakHour: dashboardMetrics.hourlyStats.reduce((peak, hour) =>
            hour.classifications > peak.classifications ? hour : peak,
            { classifications: 0, hour: 0 }
          )
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get intent distribution analysis
 * GET /api/v1/intent-monitoring/intent-distribution
 */
router.get('/intent-distribution', (req, res) => {
  try {
    const dashboardMetrics = monitor.getDashboardMetrics();

    const totalClassifications = dashboardMetrics.intentDistribution.reduce(
      (sum, intent) => sum + intent.count, 0
    );

    const analysis = {
      distribution: dashboardMetrics.intentDistribution,
      insights: {
        totalIntents: dashboardMetrics.intentDistribution.length,
        totalClassifications,
        mostCommon: dashboardMetrics.intentDistribution[0],
        highestConfidence: dashboardMetrics.intentDistribution.reduce(
          (highest, intent) => intent.avgConfidence > highest.avgConfidence ? intent : highest,
          { avgConfidence: 0 }
        ),
        fastestResponse: dashboardMetrics.intentDistribution.reduce(
          (fastest, intent) => intent.avgResponseTime < fastest.avgResponseTime ? intent : fastest,
          { avgResponseTime: Infinity }
        ),
        highestEscalation: dashboardMetrics.intentDistribution.reduce(
          (highest, intent) => parseFloat(intent.escalationRate) > parseFloat(highest.escalationRate || 0) ? intent : highest,
          { escalationRate: 0 }
        )
      }
    };

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get performance trends
 * GET /api/v1/intent-monitoring/performance-trends
 */
router.get('/performance-trends', (req, res) => {
  try {
    const dashboardMetrics = monitor.getDashboardMetrics();

    const trends = {
      responseTime: {
        current: dashboardMetrics.performanceMetrics.avgResponseTime,
        target: 100,
        targetMet: dashboardMetrics.performanceMetrics.targetMet,
        percentiles: {
          p90: dashboardMetrics.performanceMetrics.p90,
          p95: dashboardMetrics.performanceMetrics.p95,
          p99: dashboardMetrics.performanceMetrics.p99
        }
      },
      errorRate: {
        current: parseFloat(dashboardMetrics.overview.errorRate),
        target: 5.0, // 5% threshold
        targetMet: parseFloat(dashboardMetrics.overview.errorRate) <= 5.0
      },
      slowRate: {
        current: parseFloat(dashboardMetrics.overview.slowRate),
        target: 10.0, // 10% threshold
        targetMet: parseFloat(dashboardMetrics.overview.slowRate) <= 10.0
      },
      hourlyTrend: dashboardMetrics.hourlyStats.map(hour => ({
        hour: hour.hour,
        avgResponseTime: hour.avgResponseTime,
        classifications: hour.classifications,
        errorCount: hour.errorCount
      }))
    };

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get alerts summary
 * GET /api/v1/intent-monitoring/alerts
 */
router.get('/alerts', (req, res) => {
  try {
    const dashboardMetrics = monitor.getDashboardMetrics();

    const alertsSummary = {
      activeAlerts: dashboardMetrics.alerts,
      alertCounts: {
        critical: dashboardMetrics.alerts.filter(a => a.level === 'critical').length,
        warning: dashboardMetrics.alerts.filter(a => a.level === 'warning').length,
        info: dashboardMetrics.alerts.filter(a => a.level === 'info').length
      },
      healthStatus: dashboardMetrics.health,
      recommendations: generateRecommendations(dashboardMetrics)
    };

    res.json({
      success: true,
      data: alertsSummary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate system optimization recommendations
 */
function generateRecommendations(metrics) {
  const recommendations = [];

  // Performance recommendations
  if (metrics.performanceMetrics.avgResponseTime > 80) {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      title: 'Optimize Response Time',
      description: 'Average response time is approaching the 100ms limit',
      actions: [
        'Review pattern matching efficiency',
        'Consider caching frequently used patterns',
        'Optimize context analysis algorithms'
      ]
    });
  }

  // Error rate recommendations
  if (parseFloat(metrics.overview.errorRate) > 2) {
    recommendations.push({
      type: 'reliability',
      priority: 'medium',
      title: 'Reduce Error Rate',
      description: 'Classification error rate is elevated',
      actions: [
        'Review error logs for common patterns',
        'Add fallback handling for edge cases',
        'Improve input validation'
      ]
    });
  }

  // Intent distribution recommendations
  const topIntent = metrics.intentDistribution[0];
  if (topIntent && parseFloat(topIntent.percentage) > 60) {
    recommendations.push({
      type: 'accuracy',
      priority: 'low',
      title: 'Review Intent Distribution',
      description: `${topIntent.intent} represents ${topIntent.percentage}% of classifications`,
      actions: [
        'Verify classification accuracy for dominant intent',
        'Consider splitting broad intent categories',
        'Review pattern specificity'
      ]
    });
  }

  // Escalation rate recommendations
  const totalEscalations = metrics.intentDistribution.reduce(
    (sum, intent) => sum + (intent.count * parseFloat(intent.escalationRate) / 100), 0
  );
  const totalClassifications = metrics.intentDistribution.reduce(
    (sum, intent) => sum + intent.count, 0
  );
  const overallEscalationRate = (totalEscalations / totalClassifications) * 100;

  if (overallEscalationRate > 20) {
    recommendations.push({
      type: 'automation',
      priority: 'medium',
      title: 'Reduce Escalation Rate',
      description: `${overallEscalationRate.toFixed(1)}% of messages require human attention`,
      actions: [
        'Add more automated response templates',
        'Improve confidence thresholds',
        'Expand fact-based response coverage'
      ]
    });
  }

  return recommendations;
}

/**
 * Reset monitoring metrics (for testing)
 * POST /api/v1/intent-monitoring/reset-metrics
 */
router.post('/reset-metrics', (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Metric reset not allowed in production'
      });
    }

    monitor.metrics = {
      totalClassifications: 0,
      avgResponseTime: 0,
      currentHourClassifications: 0,
      errorCount: 0,
      slowClassifications: 0
    };

    res.json({
      success: true,
      data: {
        message: 'Monitoring metrics reset successfully',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;