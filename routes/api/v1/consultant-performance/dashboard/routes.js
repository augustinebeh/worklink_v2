/**
 * Dashboard Routes
 * Main performance dashboard and system overview endpoints
 * 
 * @module consultant-performance/dashboard/routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { CapacityManagementSystem } = require('../../../../../utils/capacity-management');
const { CandidatePrequalificationEngine } = require('../../../../../utils/candidate-prequalification');
const { CandidateRetentionEngine } = require('../../../../../utils/candidate-retention-engine');
const { ReliabilityScoringSystem } = require('../../../../../utils/reliability-scoring-system');
const { calculatePerformanceMultiplier } = require('../utils/helpers');

const capacityManager = new CapacityManagementSystem();
const prequalificationEngine = new CandidatePrequalificationEngine();
const retentionEngine = new CandidateRetentionEngine();
const reliabilitySystem = new ReliabilityScoringSystem();

/**
 * GET /dashboard
 * Get comprehensive performance dashboard
 */
router.get('/', async (req, res) => {
  try {
    const [
      capacityStatus,
      prequalStats,
      retentionAnalytics,
      reliabilityAnalytics
    ] = await Promise.all([
      capacityManager.getCurrentCapacity(),
      prequalificationEngine.getPrequalificationStats(7),
      retentionEngine.getRetentionAnalytics(7),
      reliabilitySystem.getReliabilityAnalytics()
    ]);

    const currentPerformance = calculatePerformanceMultiplier(
      prequalStats,
      retentionAnalytics,
      reliabilityAnalytics
    );

    res.json({
      success: true,
      data: {
        performanceMultiplier: currentPerformance,
        capacity: capacityStatus,
        prequalification: prequalStats,
        retention: retentionAnalytics,
        reliability: reliabilityAnalytics,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /dashboard/metrics
 * Get key performance metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const metrics = {
      candidateVolume: db.prepare(`
        SELECT COUNT(*) as count FROM candidates WHERE created_at >= ?
      `).get(since).count,

      qualificationEfficiency: db.prepare(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN decision_status = 'AUTO_ACCEPT' THEN 1 END) as auto_accepted,
          COUNT(CASE WHEN decision_status = 'HUMAN_REVIEW' THEN 1 END) as needs_review
        FROM prequalification_logs WHERE timestamp >= ?
      `).get(since),

      retentionRate: db.prepare(`
        SELECT AVG(final_score) as avg_engagement
        FROM candidate_engagement_scores
        WHERE last_calculated >= ?
      `).get(since).avg_engagement || 0,

      reliabilityImprovement: db.prepare(`
        SELECT AVG(reliability_score) as avg_reliability
        FROM reliability_scores
        WHERE calculated_at >= ?
      `).get(since).avg_reliability || 0
    };

    const baselineLeadsPerWeek = 5;
    const currentLeadsPerWeek = Math.round(metrics.candidateVolume / (days / 7));
    const consultantEquivalent = Math.round(currentLeadsPerWeek / baselineLeadsPerWeek);

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        candidateVolume: metrics.candidateVolume,
        leadsPerWeek: currentLeadsPerWeek,
        consultantEquivalent,
        qualificationEfficiency: Math.round((metrics.qualificationEfficiency.auto_accepted / metrics.qualificationEfficiency.total) * 100),
        avgRetentionScore: Math.round(metrics.retentionRate),
        avgReliabilityScore: Math.round(metrics.reliabilityImprovement),
        performanceMetrics: {
          volumeMultiplier: consultantEquivalent,
          efficiencyGain: Math.round(metrics.qualificationEfficiency.auto_accepted / Math.max(1, metrics.qualificationEfficiency.needs_review)),
          qualityImprovement: Math.round((metrics.reliabilityImprovement / 100) * metrics.retentionRate)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /dashboard/run-all-systems
 * Run all automated systems (capacity check, campaigns, scoring)
 */
router.post('/run-all-systems', async (req, res) => {
  try {
    const results = await Promise.all([
      capacityManager.logCapacityMetrics(),
      retentionEngine.runEngagementCampaigns(),
      retentionEngine.updateAllEngagementScores()
    ]);

    res.json({
      success: true,
      data: {
        capacityLogged: results[0],
        campaignsRun: results[1],
        scoresUpdated: results[2],
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
