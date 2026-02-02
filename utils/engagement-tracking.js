/**
 * Candidate Engagement Tracking System
 * WorkLink v2 - Advanced engagement monitoring and scoring
 *
 * Features:
 * - Real-time engagement tracking
 * - Behavioral pattern analysis
 * - Engagement scoring and categorization
 * - Response time tracking
 * - Activity heatmaps
 * - Predictive engagement modeling
 */

const { db } = require('../db/database');

/**
 * Engagement types and their default scores
 */
const ENGAGEMENT_TYPES = {
  // Communication engagements
  MESSAGE_OPEN: { score: 1, category: 'communication' },
  MESSAGE_REPLY: { score: 5, category: 'communication' },
  MESSAGE_FORWARD: { score: 3, category: 'communication' },
  WHATSAPP_READ: { score: 1, category: 'communication' },
  EMAIL_OPEN: { score: 1, category: 'communication' },
  EMAIL_CLICK: { score: 3, category: 'communication' },

  // Application engagements
  APP_LOGIN: { score: 3, category: 'app_activity' },
  APP_SESSION: { score: 2, category: 'app_activity' },
  PROFILE_VIEW: { score: 1, category: 'app_activity' },
  PROFILE_UPDATE: { score: 4, category: 'app_activity' },
  SETTINGS_CHANGE: { score: 2, category: 'app_activity' },

  // Job-related engagements
  JOB_VIEW: { score: 2, category: 'job_activity' },
  JOB_APPLY: { score: 8, category: 'job_activity' },
  JOB_SAVE: { score: 3, category: 'job_activity' },
  JOB_SHARE: { score: 4, category: 'job_activity' },
  JOB_ACCEPT: { score: 10, category: 'job_activity' },
  JOB_DECLINE: { score: -2, category: 'job_activity' },
  JOB_COMPLETE: { score: 15, category: 'job_activity' },

  // Social engagements
  REFERRAL_MADE: { score: 6, category: 'social' },
  REVIEW_POSTED: { score: 4, category: 'social' },
  ACHIEVEMENT_UNLOCKED: { score: 3, category: 'gamification' },
  QUEST_COMPLETED: { score: 5, category: 'gamification' },

  // Learning engagements
  TRAINING_START: { score: 3, category: 'learning' },
  TRAINING_COMPLETE: { score: 8, category: 'learning' },
  CERTIFICATION_EARNED: { score: 10, category: 'learning' },

  // Negative engagements
  COMPLAINT_FILED: { score: -5, category: 'negative' },
  SPAM_REPORT: { score: -10, category: 'negative' },
  ACCOUNT_SUSPENSION: { score: -20, category: 'negative' },
};

/**
 * Engagement scoring tiers
 */
const ENGAGEMENT_TIERS = {
  INACTIVE: { min: 0, max: 10, label: 'Inactive', color: '#f87171' },
  LOW: { min: 11, max: 30, label: 'Low Engagement', color: '#fbbf24' },
  MODERATE: { min: 31, max: 60, label: 'Moderate Engagement', color: '#60a5fa' },
  HIGH: { min: 61, max: 85, label: 'High Engagement', color: '#34d399' },
  SUPER: { min: 86, max: 100, label: 'Super Engaged', color: '#a78bfa' },
};

/**
 * Track a candidate engagement event
 */
function trackEngagement(candidateId, engagementType, options = {}) {
  const {
    engagementData = {},
    source = 'app',
    campaignId = null,
    jobId = null,
    customScore = null,
    timestamp = null,
  } = options;

  try {
    const engagementConfig = ENGAGEMENT_TYPES[engagementType];
    if (!engagementConfig) {
      console.warn(`Unknown engagement type: ${engagementType}`);
      return null;
    }

    const score = customScore !== null ? customScore : engagementConfig.score;

    const insertEngagementStmt = db.prepare(`
      INSERT INTO candidate_engagement
      (candidate_id, engagement_type, engagement_data, source, campaign_id, job_id, engagement_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertEngagementStmt.run(
      candidateId,
      engagementType,
      JSON.stringify(engagementData),
      source,
      campaignId,
      jobId,
      score,
      timestamp || new Date().toISOString()
    );

    // Update candidate's engagement metrics
    updateCandidateEngagementMetrics(candidateId);

    console.log(`📊 [Engagement] Tracked ${engagementType} for candidate ${candidateId} (score: ${score})`);

    return {
      engagementId: result.lastInsertRowid,
      score,
      type: engagementType,
      category: engagementConfig.category,
    };
  } catch (error) {
    console.error('Error tracking engagement:', error);
    return null;
  }
}

/**
 * Track multiple engagement events in batch
 */
function trackEngagementBatch(engagements) {
  try {
    const insertStmt = db.prepare(`
      INSERT INTO candidate_engagement
      (candidate_id, engagement_type, engagement_data, source, campaign_id, job_id, engagement_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      const results = [];
      for (const engagement of engagements) {
        const {
          candidateId,
          engagementType,
          engagementData = {},
          source = 'app',
          campaignId = null,
          jobId = null,
          customScore = null,
          timestamp = null,
        } = engagement;

        const engagementConfig = ENGAGEMENT_TYPES[engagementType];
        if (!engagementConfig) continue;

        const score = customScore !== null ? customScore : engagementConfig.score;

        const result = insertStmt.run(
          candidateId,
          engagementType,
          JSON.stringify(engagementData),
          source,
          campaignId,
          jobId,
          score,
          timestamp || new Date().toISOString()
        );

        results.push({
          engagementId: result.lastInsertRowid,
          candidateId,
          engagementType,
          score,
        });
      }
      return results;
    });

    const results = transaction();

    // Update engagement metrics for affected candidates
    const uniqueCandidates = [...new Set(engagements.map(e => e.candidateId))];
    uniqueCandidates.forEach(candidateId => updateCandidateEngagementMetrics(candidateId));

    return results;
  } catch (error) {
    console.error('Error tracking engagement batch:', error);
    return [];
  }
}

/**
 * Update candidate's engagement metrics
 */
function updateCandidateEngagementMetrics(candidateId) {
  try {
    // Calculate engagement metrics for the last 30 days
    const metrics = db.prepare(`
      SELECT
        COUNT(*) as total_engagements,
        SUM(engagement_score) as total_score,
        AVG(engagement_score) as avg_score,
        COUNT(DISTINCT date(created_at)) as active_days,
        MAX(created_at) as last_engagement
      FROM candidate_engagement
      WHERE candidate_id = ?
        AND created_at >= datetime('now', '-30 days')
    `).get(candidateId);

    if (!metrics || metrics.total_engagements === 0) {
      return;
    }

    // Calculate engagement score (0-100)
    const rawScore = Math.max(0, metrics.total_score || 0);
    const normalizedScore = Math.min(100, Math.round(rawScore * 2)); // Rough normalization

    // Determine engagement tier
    const tier = Object.entries(ENGAGEMENT_TIERS).find(([_, config]) =>
      normalizedScore >= config.min && normalizedScore <= config.max
    )?.[0] || 'INACTIVE';

    // Calculate response rate (if applicable)
    const responseData = db.prepare(`
      SELECT COUNT(*) as responses
      FROM candidate_engagement
      WHERE candidate_id = ?
        AND engagement_type IN ('MESSAGE_REPLY', 'JOB_APPLY', 'JOB_ACCEPT')
        AND created_at >= datetime('now', '-30 days')
    `).get(candidateId);

    const responseRate = metrics.total_engagements > 0 ?
      Math.round((responseData.responses / metrics.total_engagements) * 100) : 0;

    // Update candidate record
    const updateCandidateStmt = db.prepare(`
      UPDATE candidates
      SET
        engagement_score = ?,
        engagement_tier = ?,
        response_rate = ?,
        total_engagements = ?,
        last_engagement = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `);

    updateCandidateStmt.run(
      normalizedScore,
      tier.toLowerCase(),
      responseRate,
      metrics.total_engagements,
      metrics.last_engagement,
      candidateId
    );

    console.log(`📊 [Metrics] Updated engagement metrics for candidate ${candidateId}: score=${normalizedScore}, tier=${tier}`);
  } catch (error) {
    console.error('Error updating engagement metrics:', error);
  }
}

/**
 * Get candidate engagement summary
 */
function getCandidateEngagementSummary(candidateId, days = 30) {
  try {
    // Basic metrics
    const metrics = db.prepare(`
      SELECT
        COUNT(*) as total_engagements,
        SUM(engagement_score) as total_score,
        COUNT(DISTINCT date(created_at)) as active_days,
        MIN(created_at) as first_engagement,
        MAX(created_at) as last_engagement
      FROM candidate_engagement
      WHERE candidate_id = ?
        AND created_at >= datetime('now', '-' || ? || ' days')
    `).get(candidateId, days);

    // Engagement by category
    const categoryBreakdown = db.prepare(`
      SELECT
        CASE
          WHEN engagement_type IN ('MESSAGE_OPEN', 'MESSAGE_REPLY', 'WHATSAPP_READ', 'EMAIL_OPEN') THEN 'communication'
          WHEN engagement_type IN ('APP_LOGIN', 'PROFILE_VIEW', 'PROFILE_UPDATE') THEN 'app_activity'
          WHEN engagement_type IN ('JOB_VIEW', 'JOB_APPLY', 'JOB_ACCEPT', 'JOB_COMPLETE') THEN 'job_activity'
          WHEN engagement_type IN ('TRAINING_START', 'TRAINING_COMPLETE', 'CERTIFICATION_EARNED') THEN 'learning'
          ELSE 'other'
        END as category,
        COUNT(*) as count,
        SUM(engagement_score) as score
      FROM candidate_engagement
      WHERE candidate_id = ?
        AND created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY category
    `).all(candidateId, days);

    // Recent activity timeline
    const recentActivity = db.prepare(`
      SELECT
        engagement_type,
        engagement_score,
        source,
        created_at,
        engagement_data
      FROM candidate_engagement
      WHERE candidate_id = ?
        AND created_at >= datetime('now', '-' || ? || ' days')
      ORDER BY created_at DESC
      LIMIT 20
    `).all(candidateId, days);

    // Calculate engagement score
    const rawScore = Math.max(0, metrics.total_score || 0);
    const engagementScore = Math.min(100, Math.round(rawScore * 2));

    // Determine tier
    const tier = Object.entries(ENGAGEMENT_TIERS).find(([_, config]) =>
      engagementScore >= config.min && engagementScore <= config.max
    )?.[1] || ENGAGEMENT_TIERS.INACTIVE;

    // Calculate trends (compare with previous period)
    const previousMetrics = db.prepare(`
      SELECT
        COUNT(*) as total_engagements,
        SUM(engagement_score) as total_score
      FROM candidate_engagement
      WHERE candidate_id = ?
        AND created_at >= datetime('now', '-' || ? || ' days')
        AND created_at < datetime('now', '-' || ? || ' days')
    `).get(candidateId, days * 2, days);

    const trend = {
      engagements: metrics.total_engagements - (previousMetrics.total_engagements || 0),
      score: (metrics.total_score || 0) - (previousMetrics.total_score || 0),
    };

    return {
      candidateId,
      period: `${days} days`,
      metrics: {
        totalEngagements: metrics.total_engagements || 0,
        totalScore: metrics.total_score || 0,
        activeDays: metrics.active_days || 0,
        engagementScore,
        tier: tier.label,
        tierColor: tier.color,
        firstEngagement: metrics.first_engagement,
        lastEngagement: metrics.last_engagement,
      },
      trends: {
        engagementChange: trend.engagements,
        scoreChange: trend.score,
        isImproving: trend.score > 0,
      },
      breakdown: categoryBreakdown,
      recentActivity: recentActivity.map(activity => ({
        ...activity,
        engagement_data: JSON.parse(activity.engagement_data || '{}'),
      })),
    };
  } catch (error) {
    console.error('Error getting engagement summary:', error);
    return null;
  }
}

/**
 * Get engagement leaderboard
 */
function getEngagementLeaderboard(options = {}) {
  const {
    period = 30,
    limit = 20,
    category = null,
    minEngagements = 5,
  } = options;

  try {
    let whereClause = `
      WHERE ce.created_at >= datetime('now', '-' || ? || ' days')
      HAVING COUNT(ce.id) >= ?
    `;

    let params = [period, minEngagements];

    if (category) {
      // Add category filter (this would require a more complex query)
      console.log(`Filtering by category: ${category}`);
    }

    const leaderboard = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.level,
        c.rating,
        COUNT(ce.id) as total_engagements,
        SUM(ce.engagement_score) as total_score,
        ROUND(AVG(ce.engagement_score), 1) as avg_score,
        COUNT(DISTINCT date(ce.created_at)) as active_days,
        MAX(ce.created_at) as last_engagement,
        c.engagement_tier
      FROM candidates c
      JOIN candidate_engagement ce ON c.id = ce.candidate_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY total_score DESC
      LIMIT ?
    `).all(...params, limit);

    return leaderboard.map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
      engagementScore: Math.min(100, Math.round(candidate.total_score * 2)),
    }));
  } catch (error) {
    console.error('Error getting engagement leaderboard:', error);
    return [];
  }
}

/**
 * Get engagement analytics for dashboard
 */
function getEngagementAnalytics(days = 30) {
  try {
    // Overall engagement metrics
    const overallMetrics = db.prepare(`
      SELECT
        COUNT(DISTINCT candidate_id) as active_candidates,
        COUNT(*) as total_engagements,
        SUM(engagement_score) as total_score,
        AVG(engagement_score) as avg_score,
        COUNT(DISTINCT date(created_at)) as active_days
      FROM candidate_engagement
      WHERE created_at >= datetime('now', '-' || ? || ' days')
    `).get(days);

    // Daily engagement trends
    const dailyTrends = db.prepare(`
      SELECT
        date(created_at) as date,
        COUNT(*) as engagements,
        COUNT(DISTINCT candidate_id) as unique_candidates,
        SUM(engagement_score) as daily_score
      FROM candidate_engagement
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all(days);

    // Engagement by type
    const typeBreakdown = db.prepare(`
      SELECT
        engagement_type,
        COUNT(*) as count,
        SUM(engagement_score) as total_score,
        COUNT(DISTINCT candidate_id) as unique_candidates
      FROM candidate_engagement
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY engagement_type
      ORDER BY count DESC
      LIMIT 10
    `).all(days);

    // Engagement tier distribution
    const tierDistribution = db.prepare(`
      SELECT
        COALESCE(engagement_tier, 'unknown') as tier,
        COUNT(*) as count
      FROM candidates
      WHERE status = 'active'
      GROUP BY engagement_tier
    `).all();

    // Top engaged candidates
    const topCandidates = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.level,
        COUNT(ce.id) as engagements,
        SUM(ce.engagement_score) as score
      FROM candidates c
      JOIN candidate_engagement ce ON c.id = ce.candidate_id
      WHERE ce.created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY c.id
      ORDER BY score DESC
      LIMIT 10
    `).all(days);

    return {
      period: `${days} days`,
      overview: overallMetrics,
      trends: dailyTrends,
      typeBreakdown,
      tierDistribution,
      topCandidates,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting engagement analytics:', error);
    return null;
  }
}

/**
 * Predict candidate responsiveness
 */
function predictCandidateResponsiveness(candidateId) {
  try {
    // Get historical engagement patterns
    const patterns = db.prepare(`
      SELECT
        COUNT(*) as total_engagements,
        COUNT(CASE WHEN engagement_type = 'MESSAGE_REPLY' THEN 1 END) as replies,
        COUNT(CASE WHEN engagement_type = 'JOB_APPLY' THEN 1 END) as applications,
        COUNT(CASE WHEN engagement_type = 'JOB_ACCEPT' THEN 1 END) as acceptances,
        AVG(engagement_score) as avg_score,
        MAX(created_at) as last_activity,
        COUNT(DISTINCT date(created_at)) as active_days
      FROM candidate_engagement
      WHERE candidate_id = ?
        AND created_at >= datetime('now', '-60 days')
    `).get(candidateId);

    if (!patterns || patterns.total_engagements === 0) {
      return {
        responsiveness: 'unknown',
        confidence: 0,
        recommendation: 'No engagement history available',
      };
    }

    // Calculate responsiveness score
    let score = 0;

    // Reply rate (40% weight)
    const replyRate = patterns.replies / Math.max(1, patterns.total_engagements);
    score += replyRate * 40;

    // Application rate (30% weight)
    const applicationRate = patterns.applications / Math.max(1, patterns.total_engagements);
    score += applicationRate * 30;

    // Recent activity (20% weight)
    const daysSinceActivity = patterns.last_activity ?
      Math.floor((Date.now() - new Date(patterns.last_activity)) / (1000 * 60 * 60 * 24)) : 999;
    const recentnessScore = Math.max(0, 20 - daysSinceActivity);
    score += recentnessScore;

    // Consistency (10% weight)
    const consistencyScore = Math.min(10, patterns.active_days / 7);
    score += consistencyScore;

    // Determine responsiveness level
    let responsiveness, confidence, recommendation;

    if (score >= 70) {
      responsiveness = 'high';
      confidence = 0.9;
      recommendation = 'Excellent candidate for immediate outreach';
    } else if (score >= 50) {
      responsiveness = 'moderate';
      confidence = 0.7;
      recommendation = 'Good candidate, likely to respond within 24 hours';
    } else if (score >= 30) {
      responsiveness = 'low';
      confidence = 0.6;
      recommendation = 'May take longer to respond, consider multiple touchpoints';
    } else {
      responsiveness = 'very_low';
      confidence = 0.8;
      recommendation = 'Limited responsiveness, focus on high-priority opportunities';
    }

    return {
      candidateId,
      responsiveness,
      score: Math.round(score),
      confidence,
      recommendation,
      patterns: {
        replyRate: Math.round(replyRate * 100),
        applicationRate: Math.round(applicationRate * 100),
        daysSinceActivity,
        activeDays: patterns.active_days,
      },
    };
  } catch (error) {
    console.error('Error predicting responsiveness:', error);
    return {
      responsiveness: 'unknown',
      confidence: 0,
      recommendation: 'Error analyzing candidate data',
    };
  }
}

module.exports = {
  trackEngagement,
  trackEngagementBatch,
  updateCandidateEngagementMetrics,
  getCandidateEngagementSummary,
  getEngagementLeaderboard,
  getEngagementAnalytics,
  predictCandidateResponsiveness,
  ENGAGEMENT_TYPES,
  ENGAGEMENT_TIERS,
};