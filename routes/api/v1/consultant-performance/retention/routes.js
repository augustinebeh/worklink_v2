/**
 * Retention Routes
 * Endpoints for candidate retention and engagement management
 * 
 * @module consultant-performance/retention/routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { CandidateRetentionEngine } = require('../../../../../utils/candidate-retention-engine');

const retentionEngine = new CandidateRetentionEngine();

/**
 * POST /retention/run-campaigns
 * Run automated engagement campaigns
 */
router.post('/run-campaigns', async (req, res) => {
  try {
    const results = await retentionEngine.runEngagementCampaigns();
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /retention/update-scores
 * Update all candidate engagement scores
 */
router.post('/update-scores', async (req, res) => {
  try {
    const results = await retentionEngine.updateAllEngagementScores();
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /retention/analytics
 * Get retention analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const analytics = await retentionEngine.getRetentionAnalytics(days);
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /retention/at-risk
 * Get candidates at risk of churning
 */
router.get('/at-risk', async (req, res) => {
  try {
    const atRiskCandidates = db.prepare(`
      SELECT c.*, es.final_score, es.tier, es.days_since_last_activity
      FROM candidates c
      JOIN candidate_engagement_scores es ON c.id = es.candidate_id
      WHERE c.status = 'active'
        AND (es.tier IN ('poor', 'critical') OR es.days_since_last_activity > 30)
      ORDER BY es.final_score ASC, es.days_since_last_activity DESC
    `).all();

    res.json({
      success: true,
      data: {
        atRiskCandidates,
        count: atRiskCandidates.length,
        urgentAction: atRiskCandidates.filter(c => c.tier === 'critical').length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
