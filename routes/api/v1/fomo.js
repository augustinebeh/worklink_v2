/**
 * FOMO API Routes
 *
 * Provides RESTful endpoints for FOMO triggers, social proof data,
 * urgency notifications, and streak protection functionality.
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { db } = require('../../../db');
const { requireAuth, requireRole } = require('../../../middleware/auth');
const { createLogger } = require('../../../utils/structured-logger');
const {
  notifyFOMOEvent,
  notifyUrgencyAlert,
  notifyScarcityAlert,
  notifyStreakRisk,
  notifyCompetitivePressure
} = require('../../../websocket');

const router = express.Router();
const logger = createLogger('fomo-api');

// Lazy-load FOMO engine
let fomoEngine = null;
function getFOMOEngine() {
  if (!fomoEngine) {
    try {
      fomoEngine = require('../../../services/fomo-engine');
    } catch (e) {
      logger.warn('FOMO engine not available:', e.message);
    }
  }
  return fomoEngine;
}

// Lazy-load streak protection system
let streakProtection = null;
function getStreakProtection() {
  if (!streakProtection) {
    try {
      streakProtection = require('../../../services/streak-protection-system');
    } catch (e) {
      logger.warn('Streak protection system not available:', e.message);
    }
  }
  return streakProtection;
}

// ==================== FOMO TRIGGERS ====================

/**
 * GET /api/v1/fomo/triggers
 * Get FOMO triggers for the current candidate
 */
router.get('/triggers', requireAuth, [
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const candidateId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const fomo = getFOMOEngine();
    if (!fomo) {
      return res.status(503).json({
        success: false,
        error: 'FOMO service temporarily unavailable'
      });
    }

    const triggers = await fomo.getFOMOTriggers(candidateId, limit);

    logger.info('FOMO triggers requested', {
      candidateId,
      triggerCount: triggers.length,
      limit
    });

    res.json({
      success: true,
      data: {
        triggers,
        count: triggers.length,
        limit
      }
    });

  } catch (error) {
    logger.error('Failed to get FOMO triggers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve FOMO triggers'
    });
  }
});

/**
 * POST /api/v1/fomo/triggers/:id/dismiss
 * Dismiss a specific FOMO trigger
 */
router.post('/triggers/:id/dismiss', requireAuth, [
  param('id').isString().notEmpty().withMessage('Trigger ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const candidateId = req.user.id;
    const triggerId = req.params.id;

    // Mark trigger as dismissed in database
    const result = db.prepare(`
      UPDATE fomo_events
      SET trigger_sent = TRUE, expires_at = datetime('now')
      WHERE id = ? AND candidate_id = ?
    `).run(triggerId, candidateId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Trigger not found or already dismissed'
      });
    }

    logger.info('FOMO trigger dismissed', {
      candidateId,
      triggerId
    });

    res.json({
      success: true,
      message: 'Trigger dismissed successfully'
    });

  } catch (error) {
    logger.error('Failed to dismiss FOMO trigger:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to dismiss trigger'
    });
  }
});

// ==================== ACTIVITY TRACKING ====================

/**
 * POST /api/v1/fomo/activity
 * Track candidate activity for FOMO processing
 */
router.post('/activity', requireAuth, [
  body('activityType').isString().notEmpty().withMessage('Activity type is required'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const candidateId = req.user.id;
    const { activityType, metadata = {} } = req.body;

    const fomo = getFOMOEngine();
    if (!fomo) {
      return res.status(503).json({
        success: false,
        error: 'FOMO service temporarily unavailable'
      });
    }

    // Enhance metadata with candidate info
    const candidate = db.prepare(`
      SELECT location_area, level,
             CASE
               WHEN level >= 100 THEN 'mythic'
               WHEN level >= 75 THEN 'diamond'
               WHEN level >= 50 THEN 'platinum'
               WHEN level >= 25 THEN 'gold'
               WHEN level >= 10 THEN 'silver'
               ELSE 'bronze'
             END as tier
      FROM candidates
      WHERE id = ?
    `).get(candidateId);

    if (candidate) {
      metadata.locationArea = candidate.location_area;
      metadata.tier = candidate.tier;
      metadata.level = candidate.level;
    }

    // Record activity
    fomo.recordActivity(candidateId, activityType, metadata);

    // Process immediate FOMO if applicable
    if (['job_application', 'level_up', 'achievement_unlocked'].includes(activityType)) {
      await fomo.processImmediateFOMO(candidateId, activityType, metadata);
    }

    logger.info('Activity tracked for FOMO', {
      candidateId,
      activityType,
      metadata
    });

    res.json({
      success: true,
      message: 'Activity tracked successfully'
    });

  } catch (error) {
    logger.error('Failed to track FOMO activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track activity'
    });
  }
});

// ==================== SOCIAL PROOF ====================

/**
 * GET /api/v1/fomo/social-proof/:jobId?
 * Get social proof data for a job or general activity
 */
router.get('/social-proof/:jobId?', requireAuth, async (req, res) => {
  try {
    const candidateId = req.user.id;
    const jobId = req.params.jobId;

    let socialProofData = {};

    if (jobId) {
      // Get job-specific social proof
      const jobActivity = db.prepare(`
        SELECT
          COUNT(DISTINCT candidate_id) as unique_viewers,
          COUNT(d.id) as total_applications,
          COUNT(CASE WHEN d.created_at > datetime('now', '-1 hour') THEN 1 END) as recent_applications
        FROM fomo_social_proof sp
        LEFT JOIN deployments d ON sp.job_id = d.job_id
        WHERE sp.job_id = ? AND sp.time_window_end > datetime('now', '-2 hours')
      `).get(jobId);

      socialProofData.job = {
        viewers: jobActivity.unique_viewers || 0,
        totalApplications: jobActivity.total_applications || 0,
        recentApplications: jobActivity.recent_applications || 0
      };
    }

    // Get general area activity
    const candidate = db.prepare(`
      SELECT location_area FROM candidates WHERE id = ?
    `).get(candidateId);

    if (candidate?.location_area) {
      const areaActivity = db.prepare(`
        SELECT
          COUNT(*) as activity_count,
          SUM(participant_count) as total_participants
        FROM fomo_social_proof
        WHERE location_area = ? AND time_window_end > datetime('now', '-1 hour')
      `).get(candidate.location_area);

      socialProofData.area = {
        activityCount: areaActivity.activity_count || 0,
        totalParticipants: areaActivity.total_participants || 0
      };
    }

    res.json({
      success: true,
      data: socialProofData
    });

  } catch (error) {
    logger.error('Failed to get social proof data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve social proof data'
    });
  }
});

// ==================== STREAK PROTECTION ====================

/**
 * GET /api/v1/fomo/streak-protection
 * Get streak protection data for current candidate
 */
router.get('/streak-protection', requireAuth, async (req, res) => {
  try {
    const candidateId = req.user.id;

    const streakSys = getStreakProtection();
    if (!streakSys) {
      return res.status(503).json({
        success: false,
        error: 'Streak protection service temporarily unavailable'
      });
    }

    const protectionData = await streakSys.getStreakProtectionData(candidateId);

    if (!protectionData) {
      return res.status(404).json({
        success: false,
        error: 'No streak data found for candidate'
      });
    }

    res.json({
      success: true,
      data: protectionData
    });

  } catch (error) {
    logger.error('Failed to get streak protection data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve streak protection data'
    });
  }
});

/**
 * POST /api/v1/fomo/streak-protection/:protectionId/activate
 * Activate streak protection
 */
router.post('/streak-protection/:protectionId/activate', requireAuth, [
  param('protectionId').isString().notEmpty().withMessage('Protection ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const candidateId = req.user.id;
    const protectionId = req.params.protectionId;

    // Validate and activate protection
    const protection = db.prepare(`
      SELECT * FROM streak_protection_tokens
      WHERE id = ? AND candidate_id = ? AND status = 'active' AND expires_at > datetime('now')
    `).get(protectionId, candidateId);

    if (!protection) {
      return res.status(404).json({
        success: false,
        error: 'Protection offer not found or expired'
      });
    }

    // Mark protection as used
    db.prepare(`
      UPDATE streak_protection_tokens
      SET status = 'used', used_at = datetime('now')
      WHERE id = ?
    `).run(protectionId);

    // Apply protection logic (extend streak timer, etc.)
    // This would integrate with the gamification system

    logger.info('Streak protection activated', {
      candidateId,
      protectionId,
      protectionType: protection.token_type,
      streakDays: protection.streak_days
    });

    res.json({
      success: true,
      message: 'Streak protection activated successfully',
      data: {
        protectionType: protection.token_type,
        streakDays: protection.streak_days
      }
    });

  } catch (error) {
    logger.error('Failed to activate streak protection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate streak protection'
    });
  }
});

// ==================== URGENCY ALERTS ====================

/**
 * GET /api/v1/fomo/urgency
 * Get current urgency alerts for candidate
 */
router.get('/urgency', requireAuth, async (req, res) => {
  try {
    const candidateId = req.user.id;

    // Get candidate's location for relevant alerts
    const candidate = db.prepare(`
      SELECT location_area FROM candidates WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Get urgency events
    const urgencyEvents = db.prepare(`
      SELECT * FROM fomo_events
      WHERE (candidate_id = ? OR candidate_id IS NULL)
        AND event_type IN ('job_urgency', 'time_limited', 'job_slot_scarcity')
        AND expires_at > datetime('now')
        AND (
          candidate_id = ? OR
          json_extract(event_data, '$.locationArea') = ?
        )
      ORDER BY urgency_score DESC
      LIMIT 10
    `).all(candidateId, candidateId, candidate.location_area);

    res.json({
      success: true,
      data: {
        urgencyAlerts: urgencyEvents.map(event => ({
          id: event.id,
          type: event.event_type,
          urgencyScore: event.urgency_score,
          data: JSON.parse(event.event_data || '{}'),
          expiresAt: event.expires_at
        }))
      }
    });

  } catch (error) {
    logger.error('Failed to get urgency alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve urgency alerts'
    });
  }
});

// ==================== ADMIN ENDPOINTS ====================

/**
 * GET /api/v1/fomo/statistics
 * Get FOMO system statistics (Admin only)
 */
router.get('/statistics', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const fomo = getFOMOEngine();
    const streakSys = getStreakProtection();

    const stats = {
      fomo: fomo ? await fomo.getFOMOStatistics() : null,
      streakProtection: streakSys ? await streakSys.getStreakStatistics() : null
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get FOMO statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics'
    });
  }
});

/**
 * POST /api/v1/fomo/test-trigger
 * Send test FOMO trigger to candidate (Admin only)
 */
router.post('/test-trigger', requireAuth, requireRole('admin'), [
  body('candidateId').isString().notEmpty().withMessage('Candidate ID is required'),
  body('triggerType').isString().notEmpty().withMessage('Trigger type is required'),
  body('data').optional().isObject().withMessage('Data must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { candidateId, triggerType, data = {} } = req.body;

    // Verify candidate exists
    const candidate = db.prepare(`
      SELECT id FROM candidates WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Create test FOMO event
    const fomo = getFOMOEngine();
    if (!fomo) {
      return res.status(503).json({
        success: false,
        error: 'FOMO service temporarily unavailable'
      });
    }

    const testEvent = {
      id: `test_${Date.now()}`,
      type: triggerType,
      urgency: data.urgency || 0.7,
      socialProof: data.socialProof || 0.5,
      scarcity: data.scarcity || 0.5,
      message: data.message || `Test FOMO trigger: ${triggerType}`,
      action: data.action || { type: 'browse_jobs' },
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
    };

    // Send notification
    switch (triggerType) {
      case 'urgency':
        notifyUrgencyAlert(candidateId, testEvent);
        break;
      case 'scarcity':
        notifyScarcityAlert(candidateId, testEvent);
        break;
      case 'streak_risk':
        notifyStreakRisk(candidateId, testEvent);
        break;
      case 'competitive_pressure':
        notifyCompetitivePressure(candidateId, testEvent);
        break;
      default:
        notifyFOMOEvent(candidateId, testEvent);
        break;
    }

    logger.info('Test FOMO trigger sent', {
      candidateId,
      triggerType,
      adminId: req.user.id,
      testEvent
    });

    res.json({
      success: true,
      message: 'Test trigger sent successfully',
      data: { testEvent }
    });

  } catch (error) {
    logger.error('Failed to send test FOMO trigger:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test trigger'
    });
  }
});

// ==================== ERROR HANDLING ====================

router.use((error, req, res, next) => {
  logger.error('FOMO API error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

module.exports = router;