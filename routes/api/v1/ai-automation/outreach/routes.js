/**
 * Outreach Routes - Campaign management and engagement tracking
 * Automated outreach campaigns, messaging, and candidate engagement
 * 
 * @module ai-automation/outreach/routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');

// Import outreach system utilities
const {
  createOutreachCampaign,
  executeCampaign,
  getCampaignStats,
  CAMPAIGN_TYPES,
  CHANNELS,
  PRIORITIES,
} = require('../../../../../utils/outreach-automation');

/**
 * POST /campaigns
 * Create a new outreach campaign
 */
router.post('/campaigns', async (req, res) => {
  try {
    const {
      name,
      type = CAMPAIGN_TYPES.JOB_INVITATION,
      jobId = null,
      targetCriteria = {},
      channels = [CHANNELS.WHATSAPP],
      priority = PRIORITIES.MEDIUM,
      scheduledAt = null,
      template = null,
      autoStart = false,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name is required'
      });
    }

    const result = await createOutreachCampaign({
      name,
      type,
      jobId,
      targetCriteria,
      channels,
      priority,
      scheduledAt,
      template,
      autoStart,
    });

    res.json({
      success: true,
      message: `Campaign ${autoStart ? 'created and started' : 'created'}`,
      data: result
    });
  } catch (error) {
    console.error('Error creating outreach campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /campaigns/:campaignId/execute
 * Execute a campaign
 */
router.post('/campaigns/:campaignId/execute', async (req, res) => {
  try {
    const result = await executeCampaign(req.params.campaignId);
    res.json({
      success: true,
      message: 'Campaign executed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error executing campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /campaigns/:campaignId/stats
 * Get campaign statistics
 */
router.get('/campaigns/:campaignId/stats', (req, res) => {
  try {
    const stats = getCampaignStats(req.params.campaignId);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting campaign stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /campaigns
 * List all campaigns
 */
router.get('/campaigns', (req, res) => {
  try {
    const { status, type, limit = '20' } = req.query;

    let whereConditions = [];
    let params = [];

    if (status) {
      whereConditions.push('status = ?');
      params.push(status);
    }

    if (type) {
      whereConditions.push('type = ?');
      params.push(type);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const campaigns = db.prepare(`
      SELECT id, name, type, status, candidates_targeted, messages_sent,
             created_at, completed_at, job_id
      FROM outreach_campaigns
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ?
    `).all(...params, parseInt(limit));

    // Add job titles for job-specific campaigns
    campaigns.forEach(campaign => {
      if (campaign.job_id) {
        const job = db.prepare('SELECT title FROM jobs WHERE id = ?').get(campaign.job_id);
        campaign.jobTitle = job?.title || 'Unknown Job';
      }
    });

    res.json({
      success: true,
      data: {
        campaigns,
        total: campaigns.length
      }
    });
  } catch (error) {
    console.error('Error listing campaigns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /quick-job-invite/:jobId
 * Quick job-based outreach (simplified endpoint)
 */
router.post('/quick-job-invite/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { maxCandidates = 20, minScore = 50, channels = ['whatsapp'] } = req.body;

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    const campaignName = `Quick Invite: ${job.title}`;

    const result = await createOutreachCampaign({
      name: campaignName,
      type: CAMPAIGN_TYPES.JOB_INVITATION,
      jobId,
      targetCriteria: {
        maxCandidates: parseInt(maxCandidates),
        minMatchScore: parseInt(minScore),
        lastSeenDays: 30,
      },
      channels,
      priority: PRIORITIES.HIGH,
      autoStart: true,
    });

    res.json({
      success: true,
      message: 'Quick job invitation campaign started',
      data: result
    });
  } catch (error) {
    console.error('Error creating quick job invite:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /engagement
 * Track candidate engagement
 */
router.post('/engagement', (req, res) => {
  try {
    const {
      candidateId,
      engagementType,
      engagementData = {},
      source = 'unknown',
      campaignId = null,
      jobId = null,
      engagementScore = 1,
    } = req.body;

    if (!candidateId || !engagementType) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and engagementType are required'
      });
    }

    const insertEngagementStmt = db.prepare(`
      INSERT INTO candidate_engagement
      (candidate_id, engagement_type, engagement_data, source, campaign_id, job_id, engagement_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const result = insertEngagementStmt.run(
      candidateId,
      engagementType,
      JSON.stringify(engagementData),
      source,
      campaignId,
      jobId,
      engagementScore
    );

    res.json({
      success: true,
      message: 'Engagement tracked successfully',
      data: { engagementId: result.lastInsertRowid }
    });
  } catch (error) {
    console.error('Error tracking engagement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /engagement/:candidateId
 * Get candidate engagement history
 */
router.get('/engagement/:candidateId', (req, res) => {
  try {
    const { candidateId } = req.params;
    const { limit = '50', days = '30' } = req.query;

    const engagements = db.prepare(`
      SELECT ce.*, oc.name as campaign_name, j.title as job_title
      FROM candidate_engagement ce
      LEFT JOIN outreach_campaigns oc ON ce.campaign_id = oc.id
      LEFT JOIN jobs j ON ce.job_id = j.id
      WHERE ce.candidate_id = ?
      AND ce.created_at >= datetime('now', '-' || ? || ' days')
      ORDER BY ce.created_at DESC
      LIMIT ?
    `).all(candidateId, parseInt(days), parseInt(limit));

    // Calculate engagement score
    const totalScore = engagements.reduce((sum, eng) => sum + (eng.engagement_score || 1), 0);
    const engagementScore = Math.min(100, Math.round(totalScore / Math.max(1, parseInt(days)) * 10));

    res.json({
      success: true,
      data: {
        candidateId,
        engagementScore,
        totalEngagements: engagements.length,
        engagements: engagements.map(e => ({
          ...e,
          engagement_data: JSON.parse(e.engagement_data || '{}')
        }))
      }
    });
  } catch (error) {
    console.error('Error getting engagement history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /stats
 * Get outreach system statistics
 */
router.get('/stats', (req, res) => {
  try {
    const { days = '30' } = req.query;

    // Campaign stats
    const campaignStats = db.prepare(`
      SELECT
        COUNT(*) as totalCampaigns,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as activeCampaigns,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedCampaigns,
        SUM(candidates_targeted) as totalTargeted,
        SUM(messages_sent) as totalMessagesSent
      FROM outreach_campaigns
      WHERE created_at >= datetime('now', '-' || ? || ' days')
    `).get(parseInt(days));

    // Message stats by channel
    const channelStats = db.prepare(`
      SELECT
        channel,
        COUNT(*) as messagesSent,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as delivered,
        COUNT(CASE WHEN replied_at IS NOT NULL THEN 1 END) as responses
      FROM outreach_messages
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY channel
    `).all(parseInt(days));

    // Top performing campaigns
    const topCampaigns = db.prepare(`
      SELECT oc.id, oc.name, oc.type, oc.messages_sent,
        COUNT(CASE WHEN om.replied_at IS NOT NULL THEN 1 END) as responses,
        ROUND(COUNT(CASE WHEN om.replied_at IS NOT NULL THEN 1 END) * 100.0 / oc.messages_sent, 1) as responseRate
      FROM outreach_campaigns oc
      LEFT JOIN outreach_messages om ON oc.id = om.campaign_id
      WHERE oc.created_at >= datetime('now', '-' || ? || ' days')
        AND oc.messages_sent > 0
      GROUP BY oc.id
      ORDER BY responseRate DESC
      LIMIT 5
    `).all(parseInt(days));

    // Recent engagement trends
    const engagementTrends = db.prepare(`
      SELECT
        date(created_at) as date,
        COUNT(*) as engagements,
        COUNT(DISTINCT candidate_id) as uniqueCandidates
      FROM candidate_engagement
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY date(created_at)
      ORDER BY date DESC
      LIMIT 7
    `).all(parseInt(days));

    res.json({
      success: true,
      data: {
        campaignStats,
        channelStats,
        topCampaigns,
        engagementTrends,
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('Error getting outreach stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
