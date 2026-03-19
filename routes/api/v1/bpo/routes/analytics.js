/**
 * BPO Analytics Routes
 * Unified analytics combining tender success + campaign performance + engagement
 */

const express = require('express');
const router = express.Router();
const {
  getTenderAnalytics,
  getCampaignAnalytics,
  getEngagementAnalytics,
  getROIAnalysis,
  getConversionFunnels,
  getTopPerformers,
  getPredictiveInsights
} = require('../helpers/metrics-calculator');

/**
 * GET /api/v1/bpo/analytics/comprehensive
 * Unified analytics combining tender success + campaign performance + engagement
 */
router.get('/comprehensive', (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'week' } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - (90 * 24 * 60 * 60 * 1000));

    const analytics = {
      tenderMetrics: getTenderAnalytics(start, end, groupBy),
      campaignMetrics: getCampaignAnalytics(start, end, groupBy),
      engagementMetrics: getEngagementAnalytics(start, end, groupBy),
      roiAnalysis: getROIAnalysis(start, end),
      conversionFunnels: getConversionFunnels(start, end),
      topPerformers: getTopPerformers(start, end),
      predictiveInsights: getPredictiveInsights(start, end)
    };

    res.json({
      success: true,
      data: analytics,
      metadata: {
        dateRange: { start, end },
        groupBy,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate analytics',
      details: 'Internal server error'
    });
  }
});

module.exports = router;
