/**
 * Reliability Routes
 * Endpoints for reliability scoring and backup systems
 * 
 * @module consultant-performance/reliability/routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { ReliabilityScoringSystem } = require('../../../../../utils/reliability-scoring-system');

const reliabilitySystem = new ReliabilityScoringSystem();

/**
 * POST /reliability/calculate/:candidateId
 * Calculate reliability score for specific candidate
 */
router.post('/calculate/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const result = await reliabilitySystem.calculateReliabilityScore(candidateId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /reliability/backup-system/:deploymentId
 * Create backup system for deployment
 */
router.post('/backup-system/:deploymentId', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const { primaryCandidates } = req.body;

    if (!primaryCandidates || !Array.isArray(primaryCandidates)) {
      return res.status(400).json({
        success: false,
        error: 'primaryCandidates array is required'
      });
    }

    const backupSystem = await reliabilitySystem.createBackupSystem(deploymentId, primaryCandidates);
    res.json({ success: true, data: backupSystem });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /reliability/analytics
 * Get reliability analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const analytics = await reliabilitySystem.getReliabilityAnalytics();
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /reliability/tier/:tier
 * Get candidates by reliability tier
 */
router.get('/tier/:tier', async (req, res) => {
  try {
    const { tier } = req.params;
    const candidates = db.prepare(`
      SELECT c.*, rs.reliability_score, rs.predicted_show_up_rate
      FROM candidates c
      JOIN reliability_scores rs ON c.id = rs.candidate_id
      WHERE c.status = 'active' AND rs.tier = ?
      ORDER BY rs.reliability_score DESC
    `).all(tier);

    res.json({
      success: true,
      data: {
        tier,
        candidates,
        count: candidates.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
