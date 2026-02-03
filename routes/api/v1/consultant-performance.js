/**
 * CONSULTANT PERFORMANCE API
 * Main control interface for 100x consultant performance system
 *
 * Provides APIs to manage capacity, pre-qualification, retention, and reliability
 * to solve the core pain points and scale performance.
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../db');

// Import pain-point solution engines
const { CapacityManagementSystem } = require('../../../utils/capacity-management');
const { CandidatePrequalificationEngine } = require('../../../utils/candidate-prequalification');
const { CandidateRetentionEngine } = require('../../../utils/candidate-retention-engine');
const { ReliabilityScoringSystem } = require('../../../utils/reliability-scoring-system');
const CandidateSourcingEngine = require('../../../utils/candidate-sourcing-engine');
const InterviewSchedulingEngine = require('../../../utils/interview-scheduling-engine');
const SLMSchedulingBridge = require('../../../utils/slm-scheduling-bridge');

// Import new consultant analytics engine
const { ConsultantAnalyticsEngine } = require('../../../utils/consultant-analytics-engine');

// Initialize systems
const capacityManager = new CapacityManagementSystem();
const prequalificationEngine = new CandidatePrequalificationEngine();
const retentionEngine = new CandidateRetentionEngine();
const reliabilitySystem = new ReliabilityScoringSystem();
const sourcingEngine = new CandidateSourcingEngine();
const schedulingEngine = new InterviewSchedulingEngine();
const slmBridge = new SLMSchedulingBridge();
const analyticsEngine = new ConsultantAnalyticsEngine();

// ===== CAPACITY MANAGEMENT ENDPOINTS =====

/**
 * GET /api/v1/consultant-performance/capacity/status
 * Get current capacity utilization and alerts
 */
router.get('/capacity/status', async (req, res) => {
  try {
    const capacity = await capacityManager.getCurrentCapacity();
    const canAccept = await capacityManager.canAcceptNewCandidates();
    const sourcing = await capacityManager.getRecommendedSourcingRate();
    const alerts = await capacityManager.checkCapacityAlerts();

    res.json({
      success: true,
      data: {
        capacity,
        canAcceptNew: canAccept.canAccept,
        recommendedSourcingRate: sourcing.rate,
        currentAction: sourcing.action,
        alerts,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/consultant-performance/capacity/emergency-brake
 * Activate emergency brake to stop all sourcing
 */
router.post('/capacity/emergency-brake', async (req, res) => {
  try {
    const result = await capacityManager.emergencyBrake();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/consultant-performance/capacity/resume
 * Resume sourcing after emergency brake
 */
router.post('/capacity/resume', async (req, res) => {
  try {
    const result = await capacityManager.resumeSourcing();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/capacity/analytics
 * Get capacity analytics and trends
 */
router.get('/capacity/analytics', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const analytics = db.prepare(`
      SELECT
        DATE(created_at) as date,
        AVG(daily_utilization) as avg_daily_util,
        AVG(weekly_utilization) as avg_weekly_util,
        AVG(workload_utilization) as avg_workload_util,
        COUNT(CASE WHEN action_taken = 'emergency_brake' THEN 1 END) as emergencies,
        AVG(recommended_rate) as avg_sourcing_rate
      FROM capacity_logs
      WHERE created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all(since);

    res.json({
      success: true,
      data: {
        analytics,
        period: `${days} days`,
        summary: {
          avgDailyUtilization: Math.round(analytics.reduce((sum, a) => sum + a.avg_daily_util, 0) / analytics.length),
          avgSourcingRate: Math.round(analytics.reduce((sum, a) => sum + a.avg_sourcing_rate, 0) / analytics.length),
          totalEmergencies: analytics.reduce((sum, a) => sum + a.emergencies, 0)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== PRE-QUALIFICATION ENDPOINTS =====

/**
 * POST /api/v1/consultant-performance/prequalify
 * Pre-qualify a new candidate
 */
router.post('/prequalify', async (req, res) => {
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
 * GET /api/v1/consultant-performance/prequalify/stats
 * Get pre-qualification statistics
 */
router.get('/prequalify/stats', async (req, res) => {
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
 * GET /api/v1/consultant-performance/prequalify/pending-review
 * Get candidates pending human review
 */
router.get('/prequalify/pending-review', async (req, res) => {
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

// ===== RETENTION ENGINE ENDPOINTS =====

/**
 * POST /api/v1/consultant-performance/retention/run-campaigns
 * Run automated engagement campaigns
 */
router.post('/retention/run-campaigns', async (req, res) => {
  try {
    const results = await retentionEngine.runEngagementCampaigns();
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/consultant-performance/retention/update-scores
 * Update all candidate engagement scores
 */
router.post('/retention/update-scores', async (req, res) => {
  try {
    const results = await retentionEngine.updateAllEngagementScores();
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/retention/analytics
 * Get retention analytics
 */
router.get('/retention/analytics', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const analytics = await retentionEngine.getRetentionAnalytics(days);
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/retention/at-risk
 * Get candidates at risk of churning
 */
router.get('/retention/at-risk', async (req, res) => {
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

// ===== RELIABILITY SYSTEM ENDPOINTS =====

/**
 * POST /api/v1/consultant-performance/reliability/calculate/:candidateId
 * Calculate reliability score for specific candidate
 */
router.post('/reliability/calculate/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const result = await reliabilitySystem.calculateReliabilityScore(candidateId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/consultant-performance/reliability/backup-system/:deploymentId
 * Create backup system for deployment
 */
router.post('/reliability/backup-system/:deploymentId', async (req, res) => {
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
 * GET /api/v1/consultant-performance/reliability/analytics
 * Get reliability analytics
 */
router.get('/reliability/analytics', async (req, res) => {
  try {
    const analytics = await reliabilitySystem.getReliabilityAnalytics();
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/reliability/tier/:tier
 * Get candidates by reliability tier
 */
router.get('/reliability/tier/:tier', async (req, res) => {
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

// ===== OVERALL PERFORMANCE DASHBOARD =====

/**
 * GET /api/v1/consultant-performance/dashboard
 * Get comprehensive performance dashboard
 */
router.get('/dashboard', async (req, res) => {
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

    // Performance multiplier calculation
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
 * GET /api/v1/consultant-performance/metrics
 * Get key performance metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Key metrics calculation
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

    // Calculate consultant equivalency
    const baselineLeadsPerWeek = 5; // Normal consultant performance
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
 * POST /api/v1/consultant-performance/run-all-systems
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

// ===== CANDIDATE SOURCING ENDPOINTS =====

/**
 * POST /api/v1/consultant-performance/sourcing/run-daily
 * Execute daily candidate sourcing routine
 */
router.post('/sourcing/run-daily', async (req, res) => {
  try {
    const result = await sourcingEngine.runDailySourcing();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/sourcing/analytics
 * Get candidate sourcing analytics and performance metrics
 */
router.get('/sourcing/analytics', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const analytics = sourcingEngine.getSourcingAnalytics(parseInt(days));
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/sourcing/discovery-queue
 * Get current candidate discovery queue status
 */
router.get('/sourcing/discovery-queue', async (req, res) => {
  try {
    const queue = sourcingEngine.db.prepare(`
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
 * GET /api/v1/consultant-performance/sourcing/active-postings
 * Get currently active job postings
 */
router.get('/sourcing/active-postings', async (req, res) => {
  try {
    const postings = sourcingEngine.db.prepare(`
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
 * GET /api/v1/consultant-performance/sourcing/outreach-campaigns
 * Get outreach campaign performance
 */
router.get('/sourcing/outreach-campaigns', async (req, res) => {
  try {
    const campaigns = sourcingEngine.db.prepare(`
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
 * POST /api/v1/consultant-performance/sourcing/emergency-stop
 * Emergency stop for all sourcing activities
 */
router.post('/sourcing/emergency-stop', async (req, res) => {
  try {
    const result = await sourcingEngine.emergencyStopSourcing();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/consultant-performance/sourcing/resume
 * Resume sourcing activities after emergency stop
 */
router.post('/sourcing/resume', async (req, res) => {
  try {
    const result = await sourcingEngine.resumeSourcing();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/sourcing/status
 * Get overall sourcing system status
 */
router.get('/sourcing/status', async (req, res) => {
  try {
    // Get current status across all sourcing components
    const activePostings = sourcingEngine.db.prepare(`
      SELECT COUNT(*) as count FROM automated_job_postings
      WHERE status = 'active' AND expires_at > datetime('now')
    `).get().count;

    const pendingCandidates = sourcingEngine.db.prepare(`
      SELECT COUNT(*) as count FROM candidate_discovery_queue
      WHERE processing_status = 'pending'
    `).get().count;

    const todaysSourcing = sourcingEngine.db.prepare(`
      SELECT
        SUM(candidates_found) as candidates_sourced,
        AVG(success_rate) as avg_success
      FROM sourcing_logs
      WHERE DATE(created_at) = DATE('now')
    `).get();

    const activeCampaigns = sourcingEngine.db.prepare(`
      SELECT COUNT(*) as count FROM outreach_campaigns
      WHERE status = 'active'
    `).get().count;

    res.json({
      success: true,
      data: {
        systemStatus: 'active', // Could be 'active', 'paused', 'emergency_stop'
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

// ===== INTERVIEW SCHEDULING ENDPOINTS =====

/**
 * POST /api/v1/consultant-performance/scheduling/run-engine
 * Execute scheduling engine cycle
 */
router.post('/scheduling/run-engine', async (req, res) => {
  try {
    const result = await schedulingEngine.runSchedulingEngine();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/scheduling/status
 * Get current scheduling system status
 */
router.get('/scheduling/status', async (req, res) => {
  try {
    const status = await schedulingEngine.getCurrentSchedulingStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/scheduling/analytics
 * Get interview scheduling analytics
 */
router.get('/scheduling/analytics', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const analytics = await schedulingEngine.getSchedulingAnalytics(parseInt(days));
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/scheduling/calendar
 * Get calendar view of scheduled interviews
 */
router.get('/scheduling/calendar', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const startDate = start_date || new Date().toISOString().split('T')[0];
    const endDate = end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const interviews = schedulingEngine.db.prepare(`
      SELECT
        is.id,
        is.scheduled_date,
        is.scheduled_time,
        is.duration_minutes,
        is.status,
        is.interview_type,
        c.name as candidate_name,
        c.email as candidate_email,
        c.phone as candidate_phone
      FROM interview_slots is
      JOIN candidates c ON is.candidate_id = c.id
      WHERE is.scheduled_date BETWEEN ? AND ?
      ORDER BY is.scheduled_date, is.scheduled_time
    `).all(startDate, endDate);

    const availability = schedulingEngine.db.prepare(`
      SELECT date, start_time, end_time, is_available, slot_type
      FROM consultant_availability
      WHERE date BETWEEN ? AND ?
      ORDER BY date, start_time
    `).all(startDate, endDate);

    res.json({
      success: true,
      data: {
        interviews,
        availability,
        period: { start: startDate, end: endDate }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/scheduling/queue
 * Get interview queue status
 */
router.get('/scheduling/queue', async (req, res) => {
  try {
    const queue = schedulingEngine.db.prepare(`
      SELECT
        iq.id,
        iq.priority_score,
        iq.queue_status,
        iq.urgency_level,
        iq.contact_attempts,
        iq.added_at,
        c.name as candidate_name,
        c.email as candidate_email,
        c.status as candidate_status
      FROM interview_queue iq
      JOIN candidates c ON iq.candidate_id = c.id
      WHERE iq.queue_status IN ('waiting', 'contacted')
      ORDER BY iq.priority_score DESC, iq.added_at ASC
    `).all();

    const queueStats = schedulingEngine.db.prepare(`
      SELECT
        queue_status,
        urgency_level,
        COUNT(*) as count
      FROM interview_queue
      GROUP BY queue_status, urgency_level
    `).all();

    res.json({
      success: true,
      data: {
        queue,
        stats: queueStats,
        totalInQueue: queue.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/consultant-performance/scheduling/add-to-queue
 * Add candidate to interview queue
 */
router.post('/scheduling/add-to-queue', async (req, res) => {
  try {
    const { candidateId, priority = 0.5, urgencyLevel = 'normal' } = req.body;

    // Get candidate details
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);

    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    const queueId = await schedulingEngine.addToInterviewQueue(candidate, priority);

    res.json({
      success: true,
      data: {
        queueId,
        candidateId,
        message: 'Candidate added to interview queue'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/consultant-performance/scheduling/emergency-stop
 * Emergency stop all scheduling activities
 */
router.post('/scheduling/emergency-stop', async (req, res) => {
  try {
    const result = await schedulingEngine.emergencyStopScheduling();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/consultant-performance/scheduling/resume
 * Resume scheduling activities
 */
router.post('/scheduling/resume', async (req, res) => {
  try {
    const result = await schedulingEngine.resumeScheduling();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/consultant-performance/scheduling/availability
 * Update consultant availability
 */
router.put('/scheduling/availability', async (req, res) => {
  try {
    const { date, startTime, endTime, isAvailable = true, slotType = 'interview' } = req.body;

    const stmt = schedulingEngine.db.prepare(`
      INSERT OR REPLACE INTO consultant_availability
      (date, start_time, end_time, is_available, slot_type)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(date, startTime, endTime, isAvailable ? 1 : 0, slotType);

    res.json({
      success: true,
      data: {
        message: 'Availability updated successfully',
        date,
        timeSlot: `${startTime} - ${endTime}`,
        available: isAvailable
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/scheduling/performance
 * Get scheduling performance metrics
 */
router.get('/scheduling/performance', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const performance = schedulingEngine.db.prepare(`
      SELECT
        AVG(total_scheduled) as avg_daily_scheduled,
        AVG(total_completed) as avg_daily_completed,
        AVG(total_no_shows) as avg_daily_no_shows,
        AVG(total_conversions) as avg_daily_conversions,
        AVG(efficiency_score) as avg_efficiency
      FROM interview_performance
      WHERE date >= ?
    `).get(since);

    const trends = schedulingEngine.db.prepare(`
      SELECT
        date,
        total_scheduled,
        total_completed,
        total_no_shows,
        total_conversions,
        efficiency_score
      FROM interview_performance
      WHERE date >= ?
      ORDER BY date DESC
    `).all(since);

    const conversionRate = performance.avg_daily_completed > 0 ?
      performance.avg_daily_conversions / performance.avg_daily_completed : 0;

    const completionRate = performance.avg_daily_scheduled > 0 ?
      performance.avg_daily_completed / performance.avg_daily_scheduled : 0;

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        summary: {
          avgDailyScheduled: Math.round(performance.avg_daily_scheduled || 0),
          avgDailyCompleted: Math.round(performance.avg_daily_completed || 0),
          avgDailyNoShows: Math.round(performance.avg_daily_no_shows || 0),
          avgDailyConversions: Math.round(performance.avg_daily_conversions || 0),
          completionRate: Math.round(completionRate * 100),
          conversionRate: Math.round(conversionRate * 100),
          efficiencyScore: Math.round((performance.avg_efficiency || 0) * 100) / 100
        },
        trends
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== SLM INTEGRATION ENDPOINTS =====

/**
 * POST /api/v1/consultant-performance/slm/chat-integration
 * Handle message from existing chat SLM for pending candidates
 */
router.post('/slm/chat-integration', async (req, res) => {
  try {
    const { candidateId, message, conversationContext = {} } = req.body;

    if (!candidateId || !message) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and message are required'
      });
    }

    // Process through SLM bridge
    const response = await slmBridge.integrateWithChatSLM(candidateId, message, conversationContext);

    if (response) {
      // SLM bridge handled the message (pending candidate)
      res.json({
        success: true,
        data: {
          handled: true,
          response,
          shouldReplace: true // Tell existing SLM to use this response instead
        }
      });
    } else {
      // Let existing SLM handle (non-pending candidate)
      res.json({
        success: true,
        data: {
          handled: false,
          shouldReplace: false // Let existing SLM continue normally
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/consultant-performance/slm/direct-message
 * Direct message handling for SLM bridge (testing/admin use)
 */
router.post('/slm/direct-message', async (req, res) => {
  try {
    const { candidateId, message, conversationContext = {} } = req.body;

    const response = await slmBridge.handlePendingCandidateMessage(
      candidateId,
      message,
      conversationContext
    );

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/slm/conversation/:candidateId
 * Get SLM conversation history for a candidate
 */
router.get('/slm/conversation/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;

    const conversations = schedulingEngine.db.prepare(`
      SELECT
        sc.*,
        c.name as candidate_name,
        c.status as candidate_status,
        is.scheduled_date,
        is.scheduled_time,
        is.status as interview_status
      FROM slm_conversations sc
      JOIN candidates c ON sc.candidate_id = c.id
      LEFT JOIN interview_slots is ON sc.scheduled_interview_id = is.id
      WHERE sc.candidate_id = ?
      ORDER BY sc.created_at DESC
    `).all(candidateId);

    const conversionLog = schedulingEngine.db.prepare(`
      SELECT * FROM lead_conversion_log
      WHERE candidate_id = ?
      ORDER BY created_at DESC
    `).all(candidateId);

    res.json({
      success: true,
      data: {
        conversations,
        conversionLog,
        totalConversations: conversations.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/slm/analytics
 * Get SLM performance analytics
 */
router.get('/slm/analytics', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const stats = schedulingEngine.db.prepare(`
      SELECT
        COUNT(*) as total_conversations,
        COUNT(CASE WHEN conversion_intent_score > 0.7 THEN 1 END) as high_intent,
        COUNT(CASE WHEN scheduled_interview_id IS NOT NULL THEN 1 END) as led_to_interview,
        AVG(conversion_intent_score) as avg_intent_score,
        AVG(message_count) as avg_message_count
      FROM slm_conversations
      WHERE created_at >= ?
    `).get(since);

    const conversionStats = schedulingEngine.db.prepare(`
      SELECT
        conversion_stage,
        COUNT(*) as count
      FROM lead_conversion_log
      WHERE created_at >= ?
      GROUP BY conversion_stage
    `).all(since);

    const interviewConversions = schedulingEngine.db.prepare(`
      SELECT COUNT(*) as count
      FROM lead_conversion_log
      WHERE conversion_method LIKE '%slm%'
        AND conversion_stage = 'active'
        AND created_at >= ?
    `).get(since);

    const conversionRate = stats.total_conversations > 0 ?
      interviewConversions.count / stats.total_conversations : 0;

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        summary: {
          totalConversations: stats.total_conversations,
          highIntentConversations: stats.high_intent,
          ledToInterview: stats.led_to_interview,
          avgIntentScore: Math.round((stats.avg_intent_score || 0) * 100),
          avgMessageCount: Math.round(stats.avg_message_count || 0),
          conversionRate: Math.round(conversionRate * 100),
          interviewBookings: interviewConversions.count
        },
        conversionBreakdown: conversionStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/consultant-performance/slm/test-flow
 * Test SLM conversation flow (development/testing)
 */
router.post('/slm/test-flow', async (req, res) => {
  try {
    const { candidateId, scenario = 'welcome' } = req.body;

    const testScenarios = {
      welcome: 'Hi, I just signed up and want to get verified',
      schedule: 'I want to schedule an interview',
      availability: 'I am available weekday mornings',
      confirm: 'Yes, book the first slot',
      reschedule: 'Can I reschedule my interview?',
      questions: 'What happens in the verification interview?'
    };

    const message = testScenarios[scenario] || req.body.message;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Scenario or message required'
      });
    }

    const response = await slmBridge.handlePendingCandidateMessage(
      candidateId,
      message,
      { testMode: true }
    );

    res.json({
      success: true,
      data: {
        scenario,
        message,
        response,
        testMode: true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// CONSULTANT ANALYTICS ENDPOINTS
// =====================================================

/**
 * POST /api/v1/consultant-performance/analytics/calculate-daily
 * Calculate daily performance analytics for consultants
 */
router.post('/analytics/calculate-daily', async (req, res) => {
  try {
    const { consultantIds, date } = req.body;
    const result = await analyticsEngine.runDailyAnalytics(consultantIds, date);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/consultant-performance/analytics/calculate-kpis
 * Calculate KPI scores and rankings for team
 */
router.post('/analytics/calculate-kpis', async (req, res) => {
  try {
    const { period = 'weekly', startDate } = req.body;
    const result = await analyticsEngine.runWeeklyKPICalculation();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/analytics/dashboard/:consultantId
 * Get individual consultant dashboard with comprehensive analytics
 */
router.get('/analytics/dashboard/:consultantId', async (req, res) => {
  try {
    const { consultantId } = req.params;
    const { period = 'weekly' } = req.query;

    const dashboard = await analyticsEngine.getConsultantDashboard(consultantId, period);

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/analytics/leaderboard
 * Get team leaderboard and rankings
 */
router.get('/analytics/leaderboard', async (req, res) => {
  try {
    const { period = 'weekly', metric = 'overall' } = req.query;

    const leaderboard = await analyticsEngine.getTeamLeaderboard(period, metric);

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/analytics/alerts
 * Get performance alerts for all consultants or specific consultant
 */
router.get('/analytics/alerts', async (req, res) => {
  try {
    const { consultantId, severity, status = 'active', limit = 50 } = req.query;

    let query = `
      SELECT ca.*, c.name as consultant_name
      FROM consultant_alerts ca
      LEFT JOIN candidates c ON ca.consultant_id = c.id
      WHERE ca.status = ?
    `;
    const params = [status];

    if (consultantId) {
      query += ' AND ca.consultant_id = ?';
      params.push(consultantId);
    }

    if (severity) {
      query += ' AND ca.severity = ?';
      params.push(severity);
    }

    query += ' ORDER BY ca.priority_score DESC, ca.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const alerts = db.prepare(query).all(...params);

    // Get alert summary
    const summary = db.prepare(`
      SELECT
        severity,
        COUNT(*) as count
      FROM consultant_alerts
      WHERE status = ?
      GROUP BY severity
    `).all(status);

    res.json({
      success: true,
      data: {
        alerts,
        summary,
        totalActive: alerts.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/consultant-performance/analytics/alerts/:alertId/acknowledge
 * Acknowledge or resolve an alert
 */
router.put('/analytics/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { status = 'acknowledged', notes } = req.body;

    const stmt = db.prepare(`
      UPDATE consultant_alerts
      SET status = ?, acknowledged_at = ?, resolution_notes = ?
      WHERE id = ?
    `);

    const result = stmt.run(status, new Date().toISOString(), notes || null, alertId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    res.json({
      success: true,
      data: { alertId, status, acknowledgedAt: new Date().toISOString() }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/analytics/coaching-recommendations
 * Get coaching recommendations for consultants
 */
router.get('/analytics/coaching-recommendations', async (req, res) => {
  try {
    const { consultantId, status = 'pending', category, limit = 50 } = req.query;

    let query = `
      SELECT cr.*, c.name as consultant_name
      FROM coaching_recommendations cr
      LEFT JOIN candidates c ON cr.consultant_id = c.id
      WHERE cr.status = ?
    `;
    const params = [status];

    if (consultantId) {
      query += ' AND cr.consultant_id = ?';
      params.push(consultantId);
    }

    if (category) {
      query += ' AND cr.category = ?';
      params.push(category);
    }

    query += ' ORDER BY cr.priority DESC, cr.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const recommendations = db.prepare(query).all(...params);

    // Parse JSON fields
    const parsedRecommendations = recommendations.map(rec => ({
      ...rec,
      action_steps: JSON.parse(rec.action_steps || '[]'),
      resources_needed: JSON.parse(rec.resources_needed || '[]')
    }));

    res.json({
      success: true,
      data: parsedRecommendations
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/consultant-performance/analytics/coaching-recommendations/:recId/update
 * Update coaching recommendation status and progress
 */
router.put('/analytics/coaching-recommendations/:recId/update', async (req, res) => {
  try {
    const { recId } = req.params;
    const { status, progress_measurements, consultant_feedback, coach_notes } = req.body;

    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (progress_measurements) {
      updates.push('progress_measurements = ?');
      params.push(JSON.stringify(progress_measurements));
    }

    if (consultant_feedback) {
      updates.push('consultant_feedback = ?');
      params.push(consultant_feedback);
    }

    if (coach_notes) {
      updates.push('coach_notes = ?');
      params.push(coach_notes);
    }

    if (status === 'completed') {
      updates.push('completed_at = ?');
      params.push(new Date().toISOString());
    } else if (status === 'in_progress' && !updates.includes('started_at = ?')) {
      updates.push('started_at = ?');
      params.push(new Date().toISOString());
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No updates provided' });
    }

    params.push(recId);

    const stmt = db.prepare(`
      UPDATE coaching_recommendations
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Recommendation not found' });
    }

    res.json({
      success: true,
      data: { recId, updatedAt: new Date().toISOString() }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/analytics/team-analytics
 * Get comprehensive team analytics and insights
 */
router.get('/analytics/team-analytics', async (req, res) => {
  try {
    const { period = 'weekly', date } = req.query;

    const teamAnalytics = await analyticsEngine.calculateTeamAnalytics(period, date);

    res.json({
      success: true,
      data: teamAnalytics
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/analytics/performance-trends
 * Get performance trends for individual consultant or team
 */
router.get('/analytics/performance-trends', async (req, res) => {
  try {
    const { consultantId, days = 30, metric = 'overall_performance_score' } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let query = `
      SELECT
        date,
        consultant_id,
        ${metric} as value,
        efficiency_score,
        quality_score,
        growth_score,
        overall_performance_score
      FROM consultant_performance_daily
      WHERE date >= ?
    `;
    const params = [since];

    if (consultantId) {
      query += ' AND consultant_id = ?';
      params.push(consultantId);
    }

    query += ' ORDER BY date ASC';

    const trends = db.prepare(query).all(...params);

    // Calculate trend analysis
    const trendAnalysis = calculateTrendAnalysis(trends, metric);

    res.json({
      success: true,
      data: {
        trends,
        analysis: trendAnalysis,
        period: `${days} days`,
        metric
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/analytics/kpi-comparison
 * Compare KPIs across consultants or time periods
 */
router.get('/analytics/kpi-comparison', async (req, res) => {
  try {
    const { period = 'weekly', consultantIds, metrics } = req.query;

    let query = `
      SELECT
        consultant_id,
        calculation_period,
        period_start,
        period_end,
        weighted_efficiency_score,
        weighted_quality_score,
        weighted_growth_score,
        overall_kpi_score,
        overall_rank,
        percentile_rank
      FROM consultant_kpi_scores
      WHERE calculation_period = ?
    `;
    const params = [period];

    if (consultantIds) {
      const ids = consultantIds.split(',');
      query += ` AND consultant_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids);
    }

    query += ' ORDER BY period_start DESC, overall_rank ASC';

    const comparisons = db.prepare(query).all(...params);

    // Group by consultant for easier comparison
    const byConsultant = {};
    comparisons.forEach(comp => {
      if (!byConsultant[comp.consultant_id]) {
        byConsultant[comp.consultant_id] = [];
      }
      byConsultant[comp.consultant_id].push(comp);
    });

    res.json({
      success: true,
      data: {
        comparisons,
        byConsultant,
        period
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/analytics/achievements
 * Get consultant achievements and recognition
 */
router.get('/analytics/achievements', async (req, res) => {
  try {
    const { consultantId, type, limit = 50 } = req.query;

    let query = `
      SELECT ca.*, c.name as consultant_name
      FROM consultant_achievements ca
      LEFT JOIN candidates c ON ca.consultant_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (consultantId) {
      query += ' AND ca.consultant_id = ?';
      params.push(consultantId);
    }

    if (type) {
      query += ' AND ca.achievement_type = ?';
      params.push(type);
    }

    query += ' ORDER BY ca.earned_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const achievements = db.prepare(query).all(...params);

    // Parse JSON fields
    const parsedAchievements = achievements.map(ach => ({
      ...ach,
      criteria_met: JSON.parse(ach.criteria_met || '{}')
    }));

    res.json({
      success: true,
      data: parsedAchievements
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/consultant-performance/analytics/goals
 * Create performance goals for consultants
 */
router.post('/analytics/goals', async (req, res) => {
  try {
    const {
      consultantId,
      goalType,
      title,
      description,
      targetKPI,
      targetValue,
      targetDate,
      coachingPlanId
    } = req.body;

    // Get current value for the KPI
    const currentPerformance = db.prepare(`
      SELECT AVG(${targetKPI}) as current_value
      FROM consultant_performance_daily
      WHERE consultant_id = ?
        AND date >= DATE('now', '-7 days')
    `).get(consultantId);

    const stmt = db.prepare(`
      INSERT INTO consultant_goals
      (consultant_id, goal_type, title, description, target_kpi,
       current_value, target_value, target_date, coaching_plan_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      consultantId, goalType, title, description, targetKPI,
      currentPerformance?.current_value || 0, targetValue, targetDate,
      coachingPlanId || null
    );

    res.json({
      success: true,
      data: {
        goalId: result.lastInsertRowid,
        consultantId,
        currentValue: currentPerformance?.current_value || 0,
        targetValue,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/analytics/goals/:consultantId
 * Get consultant goals and progress
 */
router.get('/analytics/goals/:consultantId', async (req, res) => {
  try {
    const { consultantId } = req.params;
    const { status } = req.query;

    let query = `
      SELECT cg.*, cr.title as coaching_plan_title
      FROM consultant_goals cg
      LEFT JOIN coaching_recommendations cr ON cg.coaching_plan_id = cr.id
      WHERE cg.consultant_id = ?
    `;
    const params = [consultantId];

    if (status) {
      query += ' AND cg.status = ?';
      params.push(status);
    }

    query += ' ORDER BY cg.created_at DESC';

    const goals = db.prepare(query).all(...params);

    // Calculate progress for active goals
    for (const goal of goals) {
      if (goal.status === 'active' && goal.target_kpi) {
        const currentPerformance = db.prepare(`
          SELECT AVG(${goal.target_kpi}) as current_value
          FROM consultant_performance_daily
          WHERE consultant_id = ?
            AND date >= DATE('now', '-7 days')
        `).get(consultantId);

        if (currentPerformance && currentPerformance.current_value !== null) {
          const progress = Math.min(100, Math.max(0,
            ((currentPerformance.current_value - goal.current_value) /
             (goal.target_value - goal.current_value)) * 100
          ));

          goal.current_progress_value = currentPerformance.current_value;
          goal.progress_percentage = Math.round(progress);
        }
      }

      // Parse milestones
      goal.milestones = JSON.parse(goal.milestones || '[]');
    }

    res.json({
      success: true,
      data: goals
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/consultant-performance/analytics/real-time-metrics
 * Get real-time performance metrics for dashboard widgets
 */
router.get('/analytics/real-time-metrics', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Today's performance summary
    const todayMetrics = db.prepare(`
      SELECT
        COUNT(DISTINCT consultant_id) as active_consultants,
        AVG(overall_performance_score) as avg_performance,
        AVG(efficiency_score) as avg_efficiency,
        AVG(quality_score) as avg_quality,
        SUM(candidates_scheduled) as total_scheduled,
        SUM(candidates_converted) as total_converted
      FROM consultant_performance_daily
      WHERE date = ?
    `).get(today);

    // Active alerts count
    const alertCounts = db.prepare(`
      SELECT
        severity,
        COUNT(*) as count
      FROM consultant_alerts
      WHERE status = 'active'
      GROUP BY severity
    `).all();

    // Pending coaching recommendations
    const pendingRecommendations = db.prepare(`
      SELECT COUNT(*) as count
      FROM coaching_recommendations
      WHERE status IN ('pending', 'in_progress')
    `).get();

    // Top performers today
    const topPerformers = db.prepare(`
      SELECT consultant_id, overall_performance_score
      FROM consultant_performance_daily
      WHERE date = ?
      ORDER BY overall_performance_score DESC
      LIMIT 5
    `).all(today);

    // Performance distribution
    const performanceDistribution = db.prepare(`
      SELECT
        CASE
          WHEN overall_performance_score >= 90 THEN 'Excellent'
          WHEN overall_performance_score >= 75 THEN 'Good'
          WHEN overall_performance_score >= 60 THEN 'Average'
          WHEN overall_performance_score >= 40 THEN 'Needs Improvement'
          ELSE 'Critical'
        END as performance_tier,
        COUNT(*) as count
      FROM consultant_performance_daily
      WHERE date = ?
      GROUP BY performance_tier
    `).all(today);

    res.json({
      success: true,
      data: {
        summary: {
          ...todayMetrics,
          conversionRate: todayMetrics.total_scheduled > 0 ?
            Math.round((todayMetrics.total_converted / todayMetrics.total_scheduled) * 100) : 0
        },
        alerts: {
          bySevertiy: alertCounts,
          total: alertCounts.reduce((sum, alert) => sum + alert.count, 0)
        },
        coaching: {
          pendingRecommendations: pendingRecommendations.count
        },
        topPerformers,
        performanceDistribution,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to calculate trend analysis
function calculateTrendAnalysis(trends, metric) {
  if (trends.length < 2) {
    return { trend: 'insufficient_data', change: 0, analysis: 'Need more data points' };
  }

  const values = trends.map(t => t.value || 0);
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const change = lastValue - firstValue;
  const percentChange = firstValue > 0 ? (change / firstValue) * 100 : 0;

  let trend = 'stable';
  if (Math.abs(percentChange) > 5) {
    trend = percentChange > 0 ? 'improving' : 'declining';
  }

  // Calculate average and volatility
  const average = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
  const volatility = Math.sqrt(variance);

  return {
    trend,
    change,
    percentChange: Math.round(percentChange * 100) / 100,
    average: Math.round(average * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    analysis: generateTrendAnalysis(trend, percentChange, volatility)
  };
}

function generateTrendAnalysis(trend, percentChange, volatility) {
  if (trend === 'improving') {
    return `Performance improving by ${Math.abs(percentChange)}%. ${volatility > 10 ? 'Some volatility observed.' : 'Steady improvement.'}`;
  } else if (trend === 'declining') {
    return `Performance declining by ${Math.abs(percentChange)}%. ${volatility > 10 ? 'High volatility - needs attention.' : 'Consistent decline - intervention needed.'}`;
  } else {
    return `Performance stable with ${volatility > 10 ? 'high' : 'low'} volatility.`;
  }
}

// Helper function to calculate performance multiplier
function calculatePerformanceMultiplier(prequalStats, retentionAnalytics, reliabilityAnalytics) {
  // Base calculation: volume efficiency × quality retention × reliability improvement
  const volumeMultiplier = prequalStats.efficiency?.volume_reduction ?
    100 / (100 - prequalStats.efficiency.volume_reduction) : 1;

  const retentionMultiplier = retentionAnalytics.candidateMetrics?.averageEngagementScore ?
    retentionAnalytics.candidateMetrics.averageEngagementScore / 50 : 1;

  const reliabilityMultiplier = reliabilityAnalytics.overallMetrics?.averageReliabilityScore ?
    reliabilityAnalytics.overallMetrics.averageReliabilityScore / 70 : 1;

  const totalMultiplier = volumeMultiplier * retentionMultiplier * reliabilityMultiplier;

  return {
    total: Math.round(totalMultiplier),
    breakdown: {
      volume: Math.round(volumeMultiplier),
      retention: Math.round(retentionMultiplier * 100) / 100,
      reliability: Math.round(reliabilityMultiplier * 100) / 100
    },
    consultantEquivalent: Math.min(100, Math.round(totalMultiplier))
  };
}

module.exports = router;