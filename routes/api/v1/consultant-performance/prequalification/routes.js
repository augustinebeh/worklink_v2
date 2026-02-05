/**
 * Pre-Qualification Routes
 * Endpoints for automated candidate pre-qualification
 * 
 * @module consultant-performance/prequalification/routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { CandidatePrequalificationEngine } = require('../../../../../utils/candidate-prequalification');

const prequalificationEngine = new CandidatePrequalificationEngine();

/**
 * POST /prequalify
 * Pre-qualify a new candidate
 */
router.post('/', async (req, res) => {
  try {
    const candidateData = req.body;
    const result = await prequalificationEngine.preQualifyCandidate(candidateData);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /prequalify/stats
 * Get pre-qualification statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const stats = await prequalificationEngine.getPrequalificationStats(days);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /prequalify/pending-review
 * Get candidates pending human review
 */
router.get('/pending-review', async (req, res) => {
  try {
    const pendingReview = db.prepare(`
      SELECT pl.*, c.name, c.email, c.phone
      FROM prequalification_logs pl
      LEFT JOIN candidates c ON pl.candidate_id = c.id
      WHERE pl.decision_status = 'HUMAN_REVIEW'
        AND pl.timestamp >= datetime('now', '-7 days')
      ORDER BY pl.total_score DESC, pl.timestamp DESC
    `).all();

    res.json({
      success: true,
      data: {
        pendingReview,
        count: pendingReview.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
