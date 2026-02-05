/**
 * Sourcing Routes
 * Endpoints for candidate sourcing automation and analytics
 * 
 * @module consultant-performance/sourcing/routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const CandidateSourcingEngine = require('../../../../../utils/candidate-sourcing-engine');

const sourcingEngine = new CandidateSourcingEngine();

/**
 * POST /sourcing/run-daily
 * Execute daily candidate sourcing routine
 */
router.post('/run-daily', async (req, res) => {
  try {
    const result = await sourcingEngine.runDailySourcing();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /sourcing/analytics
 * Get candidate sourcing analytics and performance metrics
 */
router.get('/analytics', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const analytics = sourcingEngine.getSourcingAnalytics(parseInt(days));
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /sourcing/discovery-queue
 * Get current candidate discovery queue status
 */
router.get('/discovery-queue', async (req, res) => {
  try {
    const queue = db.prepare(`
      SELECT
        source_platform,
        COUNT(*) as count,
        AVG(pre_qualification_score) as avg_score,
        MIN(created_at) as oldest_entry
      FROM candidate_discovery_queue
      WHERE processing_status = 'pending'
      GROUP BY source_platform
    `).all();

    const totalPending = queue.reduce((sum, platform) => sum + platform.count, 0);

    res.json({
      success: true,
      data: {
        totalPending,
        platformBreakdown: queue,
        averageScore: queue.reduce((sum, platform) => sum + platform.avg_score * platform.count, 0) / totalPending || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /sourcing/active-postings
 * Get currently active job postings
 */
router.get('/active-postings', async (req, res) => {
  try {
    const postings = db.prepare(`
      SELECT
        platform,
        job_title,
        status,
        views,
        applications,
        created_at,
        expires_at
      FROM automated_job_postings
      WHERE status = 'active' AND expires_at > datetime('now')
      ORDER BY created_at DESC
    `).all();

    const stats = {
      totalActive: postings.length,
      totalViews: postings.reduce((sum, p) => sum + p.views, 0),
      totalApplications: postings.reduce((sum, p) => sum + p.applications, 0),
      averageApplicationRate: postings.length > 0 ?
        postings.reduce((sum, p) => sum + (p.applications / Math.max(1, p.views)), 0) / postings.length : 0
    };

    res.json({
      success: true,
      data: {
        stats,
        postings
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /sourcing/outreach-campaigns
 * Get outreach campaign performance
 */
router.get('/outreach-campaigns', async (req, res) => {
  try {
    const campaigns = db.prepare(`
      SELECT
        platform,
        COUNT(*) as campaign_count,
        SUM(sent_count) as total_sent,
        SUM(response_count) as total_responses,
        AVG(success_rate) as avg_success_rate
      FROM outreach_campaigns
      WHERE created_at > datetime('now', '-7 days')
      GROUP BY platform
      ORDER BY total_sent DESC
    `).all();

    const totalStats = campaigns.reduce((stats, campaign) => ({
      totalSent: stats.totalSent + campaign.total_sent,
      totalResponses: stats.totalResponses + campaign.total_responses,
      campaignCount: stats.campaignCount + campaign.campaign_count
    }), { totalSent: 0, totalResponses: 0, campaignCount: 0 });

    const overallResponseRate = totalStats.totalSent > 0 ?
      totalStats.totalResponses / totalStats.totalSent : 0;

    res.json({
      success: true,
      data: {
        overallStats: {
          ...totalStats,
          overallResponseRate: Math.round(overallResponseRate * 100) / 100
        },
        platformBreakdown: campaigns
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /sourcing/emergency-stop
 * Emergency stop for all sourcing activities
 */
router.post('/emergency-stop', async (req, res) => {
  try {
    const result = await sourcingEngine.emergencyStopSourcing();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /sourcing/resume
 * Resume sourcing activities after emergency stop
 */
router.post('/resume', async (req, res) => {
  try {
    const result = await sourcingEngine.resumeSourcing();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /sourcing/status
 * Get overall sourcing system status
 */
router.get('/status', async (req, res) => {
  try {
    const activePostings = db.prepare(`
      SELECT COUNT(*) as count FROM automated_job_postings
      WHERE status = 'active' AND expires_at > datetime('now')
    `).get().count;

    const pendingCandidates = db.prepare(`
      SELECT COUNT(*) as count FROM candidate_discovery_queue
      WHERE processing_status = 'pending'
    `).get().count;

    const todaysSourcing = db.prepare(`
      SELECT
        SUM(candidates_found) as candidates_sourced,
        AVG(success_rate) as avg_success
      FROM sourcing_logs
      WHERE DATE(created_at) = DATE('now')
    `).get();

    const activeCampaigns = db.prepare(`
      SELECT COUNT(*) as count FROM outreach_campaigns
      WHERE status = 'active'
    `).get().count;

    res.json({
      success: true,
      data: {
        systemStatus: 'active',
        activeJobPostings: activePostings,
        pendingCandidates: pendingCandidates,
        todaysCandidatesSourced: todaysSourcing.candidates_sourced || 0,
        todaysSuccessRate: Math.round((todaysSourcing.avg_success || 0) * 100),
        activeCampaigns: activeCampaigns,
        lastUpdate: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
