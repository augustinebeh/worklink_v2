/**
 * Worker Status Management API Routes
 *
 * Endpoints for managing worker status classification, interview scheduling,
 * and status transitions.
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../db');
const WorkerStatusClassifier = require('../../../utils/worker-status-classifier');
const SmartSLMRouter = require('../../../utils/smart-slm-router');

// Initialize services
const statusClassifier = new WorkerStatusClassifier();
const smartRouter = new SmartSLMRouter();

// =====================================================
// WORKER STATUS CLASSIFICATION
// =====================================================

/**
 * GET /api/v1/worker-status/classify/:candidateId
 * Classify a single worker's status
 */
router.get('/classify/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;

    const classification = await statusClassifier.classifyWorkerStatus(candidateId);

    res.json({
      success: true,
      data: classification,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/worker-status/batch-classify
 * Batch classify multiple workers
 */
router.post('/batch-classify', async (req, res) => {
  try {
    const { candidateIds } = req.body;

    const results = await statusClassifier.batchClassifyWorkers(candidateIds || []);

    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/worker-status/statistics
 * Get worker status distribution statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await statusClassifier.getStatusStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// STATUS MANAGEMENT
// =====================================================

/**
 * PUT /api/v1/worker-status/:candidateId/status
 * Change worker status (with audit logging)
 */
router.put('/:candidateId/status', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { newStatus, reason, adminId } = req.body;

    if (!newStatus) {
      return res.status(400).json({
        success: false,
        error: 'newStatus is required'
      });
    }

    const result = await statusClassifier.changeWorkerStatus(
      candidateId,
      newStatus,
      adminId || 'api_user',
      reason || 'Status updated via API'
    );

    res.json({
      success: true,
      data: result,
      message: 'Worker status updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/worker-status/:candidateId/history
 * Get status change history for a worker
 */
router.get('/:candidateId/history', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const history = await statusClassifier.getStatusChangeHistory(candidateId, limit);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/worker-status/:candidateId/override
 * Manual status override (admin only)
 */
router.post('/:candidateId/override', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { newStatus, adminId, reason } = req.body;

    if (!newStatus || !adminId) {
      return res.status(400).json({
        success: false,
        error: 'newStatus and adminId are required'
      });
    }

    const result = await statusClassifier.manualStatusOverride(
      candidateId,
      newStatus,
      adminId,
      reason || 'Manual override via API'
    );

    res.json({
      success: true,
      data: result,
      message: 'Status override completed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// SLM ROUTING
// =====================================================

/**
 * GET /api/v1/worker-status/:candidateId/slm-routing
 * Get SLM routing information for a worker
 */
router.get('/:candidateId/slm-routing', async (req, res) => {
  try {
    const { candidateId } = req.params;

    const routingInfo = await statusClassifier.getSLMRoutingInfo(candidateId);

    res.json({
      success: true,
      data: routingInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/worker-status/:candidateId/test-slm-routing
 * Test SLM routing for a worker with a sample message
 */
router.post('/:candidateId/test-slm-routing', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { message, conversationContext } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required'
      });
    }

    const response = await smartRouter.routeSLMResponse(
      candidateId,
      message,
      conversationContext || {}
    );

    res.json({
      success: true,
      data: response,
      message: 'SLM routing test completed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// INTERVIEW MANAGEMENT
// =====================================================

/**
 * GET /api/v1/worker-status/interviews/queue
 * Get interview queue status
 */
router.get('/interviews/queue', (req, res) => {
  try {
    const queueStats = db.prepare(`
      SELECT
        queue_status,
        urgency_level,
        COUNT(*) as count,
        AVG(priority_score) as avg_priority
      FROM interview_queue
      GROUP BY queue_status, urgency_level
    `).all();

    const totalInQueue = db.prepare(`
      SELECT COUNT(*) as count FROM interview_queue WHERE queue_status = 'waiting'
    `).get().count;

    const upcomingInterviews = db.prepare(`
      SELECT COUNT(*) as count FROM interview_slots
      WHERE status = 'scheduled' AND scheduled_date >= date('now')
    `).get().count;

    res.json({
      success: true,
      data: {
        queueStats,
        totalInQueue,
        upcomingInterviews
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/worker-status/interviews/scheduled
 * Get scheduled interviews
 */
router.get('/interviews/scheduled', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const interviews = db.prepare(`
      SELECT
        s.*,
        c.name as candidate_name,
        c.email as candidate_email,
        c.worker_status
      FROM interview_slots s
      JOIN candidates c ON s.candidate_id = c.id
      WHERE s.status IN ('scheduled', 'confirmed')
        AND s.scheduled_date >= date('now')
      ORDER BY s.scheduled_date, s.scheduled_time
      LIMIT ?
    `).all(limit);

    res.json({
      success: true,
      data: interviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/v1/worker-status/interviews/:interviewId/complete
 * Complete an interview and update worker status
 */
router.put('/interviews/:interviewId/complete', async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { result, score, feedback, adminId } = req.body;

    if (!result || !['passed', 'failed'].includes(result)) {
      return res.status(400).json({
        success: false,
        error: 'result must be "passed" or "failed"'
      });
    }

    // Update interview record
    db.prepare(`
      UPDATE interview_slots
      SET status = 'completed',
          result = ?,
          score = ?,
          feedback = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(result, score || null, feedback || null, interviewId);

    // Get interview details
    const interview = db.prepare(`
      SELECT candidate_id FROM interview_slots WHERE id = ?
    `).get(interviewId);

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    // Update candidate interview stage
    db.prepare(`
      UPDATE candidates
      SET interview_stage = ?,
          interview_completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(result, interview.candidate_id);

    // If passed, automatically transition to active status
    if (result === 'passed') {
      await statusClassifier.changeWorkerStatus(
        interview.candidate_id,
        'active',
        adminId || 'system',
        'Interview passed - automatic transition to active'
      );
    }

    res.json({
      success: true,
      message: 'Interview completed and worker status updated',
      data: {
        interviewId,
        candidateId: interview.candidate_id,
        result,
        statusUpdated: result === 'passed'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// SYSTEM HEALTH
// =====================================================

/**
 * GET /api/v1/worker-status/health
 * System health check
 */
router.get('/health', async (req, res) => {
  try {
    const health = await smartRouter.performHealthCheck();

    res.status(health.status === 'healthy' ? 200 : 503).json({
      success: health.status === 'healthy',
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      status: 'unhealthy'
    });
  }
});

module.exports = router;