/**
 * Engagement Tracking Routes - Advanced candidate engagement analytics
 * Track and analyze candidate engagement across multiple touchpoints
 * 
 * @module ai-automation/engagement/routes
 */

const express = require('express');
const router = express.Router();

// Import engagement tracking utilities
const {
  trackEngagement,
  trackEngagementBatch,
  getCandidateEngagementSummary,
  getEngagementLeaderboard,
  getEngagementAnalytics,
  predictCandidateResponsiveness,
  ENGAGEMENT_TYPES,
  refreshEngagementMetrics,
} = require('../../../../../utils/engagement-tracking');

/**
 * POST /track
 * Track a single engagement event
 */
router.post('/track', (req, res) => {
  try {
    const {
      candidateId,
      engagementType,
      engagementData = {},
      source = 'api',
      campaignId = null,
      jobId = null,
      customScore = null,
    } = req.body;

    if (!candidateId || !engagementType) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and engagementType are required'
      });
    }

    if (!ENGAGEMENT_TYPES[engagementType]) {
      return res.status(400).json({
        success: false,
        error: `Invalid engagement type: ${engagementType}`,
        availableTypes: Object.keys(ENGAGEMENT_TYPES)
      });
    }

    const result = trackEngagement(candidateId, engagementType, {
      engagementData,
      source,
      campaignId,
      jobId,
      customScore,
    });

    if (!result) {
      return res.status(500).json({
        success: false,
        error: 'Failed to track engagement'
      });
    }

    res.json({
      success: true,
      message: 'Engagement tracked successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in engagement tracking:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /batch
 * Track multiple engagement events in batch
 */
router.post('/batch', (req, res) => {
  try {
    const { engagements } = req.body;

    if (!Array.isArray(engagements) || engagements.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'engagements array is required and must not be empty'
      });
    }

    // Validate each engagement
    for (const engagement of engagements) {
      if (!engagement.candidateId || !engagement.engagementType) {
        return res.status(400).json({
          success: false,
          error: 'Each engagement must have candidateId and engagementType'
        });
      }

      if (!ENGAGEMENT_TYPES[engagement.engagementType]) {
        return res.status(400).json({
          success: false,
          error: `Invalid engagement type: ${engagement.engagementType}`
        });
      }
    }

    const results = trackEngagementBatch(engagements);

    res.json({
      success: true,
      message: `Tracked ${results.length} engagement events`,
      data: {
        processed: results.length,
        failed: engagements.length - results.length,
        results
      }
    });
  } catch (error) {
    console.error('Error in batch engagement tracking:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /candidate/:candidateId
 * Get engagement summary for a candidate
 */
router.get('/candidate/:candidateId', (req, res) => {
  try {
    const { candidateId } = req.params;
    const { days = '30' } = req.query;

    const summary = getCandidateEngagementSummary(candidateId, parseInt(days));

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found or no engagement data'
      });
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting engagement summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /leaderboard
 * Get engagement leaderboard
 */
router.get('/leaderboard', (req, res) => {
  try {
    const {
      period = '30',
      limit = '20',
      category = null,
      minEngagements = '5'
    } = req.query;

    const leaderboard = getEngagementLeaderboard({
      period: parseInt(period),
      limit: parseInt(limit),
      category,
      minEngagements: parseInt(minEngagements),
    });

    res.json({
      success: true,
      data: {
        leaderboard,
        period: `${period} days`,
        criteria: {
          minimumEngagements: parseInt(minEngagements),
          category: category || 'all'
        }
      }
    });
  } catch (error) {
    console.error('Error getting engagement leaderboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /analytics
 * Get engagement analytics for dashboard
 */
router.get('/analytics', (req, res) => {
  try {
    const { days = '30' } = req.query;

    const analytics = getEngagementAnalytics(parseInt(days));

    if (!analytics) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate analytics'
      });
    }

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting engagement analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /predict/:candidateId
 * Predict candidate responsiveness
 */
router.get('/predict/:candidateId', (req, res) => {
  try {
    const { candidateId } = req.params;

    const prediction = predictCandidateResponsiveness(candidateId);

    if (!prediction) {
      return res.status(404).json({
        success: false,
        error: 'Unable to generate prediction - insufficient data'
      });
    }

    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    console.error('Error predicting responsiveness:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /types
 * Get all available engagement types
 */
router.get('/types', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        engagementTypes: ENGAGEMENT_TYPES,
        categories: Object.entries(ENGAGEMENT_TYPES).reduce((acc, [key, value]) => {
          const category = value.category || 'other';
          if (!acc[category]) acc[category] = [];
          acc[category].push({ type: key, ...value });
          return acc;
        }, {})
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /refresh-metrics
 * Refresh engagement metrics for all candidates
 */
router.post('/refresh-metrics', (req, res) => {
  try {
    const { candidateIds = null, days = 30 } = req.body;

    const result = refreshEngagementMetrics({
      candidateIds,
      days: parseInt(days)
    });

    res.json({
      success: true,
      message: 'Engagement metrics refreshed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error refreshing engagement metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
