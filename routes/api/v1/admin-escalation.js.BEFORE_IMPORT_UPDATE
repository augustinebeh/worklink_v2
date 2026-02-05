/**
 * Admin Escalation and Handoff API Routes
 *
 * Provides REST API endpoints for managing escalations, queue, and analytics.
 */

const express = require('express');
const router = express.Router();
const escalationSystem = require('../../../services/admin-escalation-system');
const { createLogger } = require('../../../utils/structured-logger');

const logger = createLogger('admin-escalation-api');

/**
 * GET /api/v1/admin-escalation/queue
 * Get escalation queue with filtering and pagination
 */
router.get('/queue', (req, res) => {
  try {
    const {
      status,
      priority,
      assignedAdmin,
      unassignedOnly,
      slaBreachedOnly,
      limit = 50,
      page = 1
    } = req.query;

    const filters = {
      status,
      priority,
      assignedAdmin,
      unassignedOnly: unassignedOnly === 'true',
      slaBreachedOnly: slaBreachedOnly === 'true',
      limit: Math.min(parseInt(limit) || 50, 100)
    };

    const escalations = escalationSystem.getEscalationQueue(filters);

    // Simple pagination
    const offset = (parseInt(page) - 1) * filters.limit;
    const paginatedEscalations = escalations.slice(offset, offset + filters.limit);

    res.json({
      success: true,
      data: {
        escalations: paginatedEscalations,
        pagination: {
          page: parseInt(page),
          limit: filters.limit,
          total: escalations.length,
          hasMore: offset + filters.limit < escalations.length
        },
        summary: {
          total: escalations.length,
          slaBreached: escalations.filter(e => e.sla_breached).length,
          unassigned: escalations.filter(e => !e.assigned_admin).length,
          byPriority: escalations.reduce((acc, e) => {
            acc[e.priority] = (acc[e.priority] || 0) + 1;
            return acc;
          }, {})
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get escalation queue', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/admin-escalation/queue/:escalationId
 * Get specific escalation with full context
 */
router.get('/queue/:escalationId', (req, res) => {
  try {
    const { escalationId } = req.params;

    const escalations = escalationSystem.getEscalationQueue({
      limit: 1
    });

    const escalation = escalations.find(e => e.id === parseInt(escalationId));

    if (!escalation) {
      return res.status(404).json({
        success: false,
        error: 'Escalation not found'
      });
    }

    res.json({ success: true, data: escalation });

  } catch (error) {
    logger.error('Failed to get escalation details', {
      escalation_id: req.params.escalationId,
      error: error.message
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/admin-escalation/create
 * Create new escalation (manual or automated)
 */
router.post('/create', (req, res) => {
  try {
    const {
      candidateId,
      triggerType = 'manual_request',
      reason,
      priority = 'NORMAL',
      contextData = {}
    } = req.body;

    if (!candidateId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and reason are required'
      });
    }

    const escalation = escalationSystem.createEscalation(
      candidateId,
      triggerType,
      reason,
      priority,
      contextData
    );

    res.json({
      success: true,
      data: escalation,
      message: 'Escalation created successfully'
    });

  } catch (error) {
    logger.error('Failed to create escalation', {
      candidate_id: req.body.candidateId,
      error: error.message
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/admin-escalation/manual
 * Manual escalation request from candidate
 */
router.post('/manual', (req, res) => {
  try {
    const { candidateId, reason, additionalContext } = req.body;

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        error: 'candidateId is required'
      });
    }

    const escalation = escalationSystem.requestManualEscalation(
      candidateId,
      reason || 'User requested human support',
      additionalContext || {}
    );

    res.json({
      success: true,
      data: escalation,
      message: 'Your request has been escalated to human support. We will respond shortly.'
    });

  } catch (error) {
    logger.error('Failed to process manual escalation', {
      candidate_id: req.body.candidateId,
      error: error.message
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/admin-escalation/assign/:escalationId
 * Assign escalation to admin
 */
router.put('/assign/:escalationId', (req, res) => {
  try {
    const { escalationId } = req.params;
    const { adminId } = req.body; // null for auto-assignment

    const updatedEscalation = escalationSystem.assignEscalation(
      parseInt(escalationId),
      adminId
    );

    res.json({
      success: true,
      data: updatedEscalation,
      message: adminId ? `Assigned to ${adminId}` : 'Auto-assigned to available admin'
    });

  } catch (error) {
    logger.error('Failed to assign escalation', {
      escalation_id: req.params.escalationId,
      admin_id: req.body.adminId,
      error: error.message
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/admin-escalation/status/:escalationId
 * Update escalation status
 */
router.put('/status/:escalationId', (req, res) => {
  try {
    const { escalationId } = req.params;
    const { status, notes, adminId } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required'
      });
    }

    const updatedEscalation = escalationSystem.updateEscalationStatus(
      parseInt(escalationId),
      status,
      adminId,
      notes
    );

    res.json({
      success: true,
      data: updatedEscalation,
      message: `Escalation status updated to ${status}`
    });

  } catch (error) {
    logger.error('Failed to update escalation status', {
      escalation_id: req.params.escalationId,
      status: req.body.status,
      error: error.message
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/admin-escalation/feedback/:escalationId
 * Submit user satisfaction feedback
 */
router.post('/feedback/:escalationId', (req, res) => {
  try {
    const { escalationId } = req.params;
    const { score, feedback } = req.body;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        error: 'Valid satisfaction score (1-5) is required'
      });
    }

    escalationSystem.recordSatisfactionFeedback(
      parseInt(escalationId),
      parseInt(score),
      feedback
    );

    res.json({
      success: true,
      message: 'Thank you for your feedback!'
    });

  } catch (error) {
    logger.error('Failed to record satisfaction feedback', {
      escalation_id: req.params.escalationId,
      error: error.message
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/admin-escalation/analyze
 * Analyze message for escalation triggers (used by AI system)
 */
router.post('/analyze', (req, res) => {
  try {
    const { candidateId, message, context = {} } = req.body;

    if (!candidateId || !message) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and message are required'
      });
    }

    const analysis = escalationSystem.analyzeEscalationTriggers(
      candidateId,
      message,
      context
    );

    res.json({ success: true, data: analysis });

  } catch (error) {
    logger.error('Failed to analyze escalation triggers', {
      candidate_id: req.body.candidateId,
      error: error.message
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/admin-escalation/analytics
 * Get escalation analytics and metrics
 */
router.get('/analytics', (req, res) => {
  try {
    const {
      dateFrom,
      dateTo,
      adminId,
      priority,
      includeDaily = false
    } = req.query;

    const filters = {};

    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom);
    }
    if (dateTo) {
      filters.dateTo = new Date(dateTo);
    }
    if (adminId) {
      filters.adminId = adminId;
    }
    if (priority) {
      filters.priority = priority;
    }

    const analytics = escalationSystem.getEscalationAnalytics(filters);

    // Filter out daily trend if not requested to reduce response size
    if (includeDaily !== 'true') {
      delete analytics.dailyTrend;
    }

    res.json({ success: true, data: analytics });

  } catch (error) {
    logger.error('Failed to get escalation analytics', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/admin-escalation/summary
 * Get quick summary of current escalation state
 */
router.get('/summary', (req, res) => {
  try {
    const allEscalations = escalationSystem.getEscalationQueue();

    const summary = {
      total: allEscalations.length,
      pending: allEscalations.filter(e => e.status === 'pending').length,
      assigned: allEscalations.filter(e => e.status === 'assigned').length,
      inProgress: allEscalations.filter(e => e.status === 'in_progress').length,
      slaBreached: allEscalations.filter(e => e.sla_breached).length,
      unassigned: allEscalations.filter(e => !e.assigned_admin).length,
      byPriority: {
        critical: allEscalations.filter(e => e.priority === 'CRITICAL').length,
        urgent: allEscalations.filter(e => e.priority === 'URGENT').length,
        high: allEscalations.filter(e => e.priority === 'HIGH').length,
        normal: allEscalations.filter(e => e.priority === 'NORMAL').length,
        low: allEscalations.filter(e => e.priority === 'LOW').length
      },
      recentEscalations: allEscalations
        .filter(e => e.status === 'pending')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
    };

    res.json({ success: true, data: summary });

  } catch (error) {
    logger.error('Failed to get escalation summary', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/admin-escalation/my-queue/:adminId
 * Get escalations assigned to specific admin
 */
router.get('/my-queue/:adminId', (req, res) => {
  try {
    const { adminId } = req.params;
    const { status, limit = 20 } = req.query;

    const filters = {
      assignedAdmin: adminId,
      limit: Math.min(parseInt(limit) || 20, 50)
    };

    if (status) {
      filters.status = status;
    }

    const escalations = escalationSystem.getEscalationQueue(filters);

    res.json({
      success: true,
      data: {
        escalations,
        summary: {
          total: escalations.length,
          active: escalations.filter(e => ['assigned', 'in_progress'].includes(e.status)).length,
          slaBreached: escalations.filter(e => e.sla_breached).length
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get admin queue', {
      admin_id: req.params.adminId,
      error: error.message
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/admin-escalation/admin-status/:adminId
 * Update admin availability status
 */
router.put('/admin-status/:adminId', (req, res) => {
  try {
    const { adminId } = req.params;
    const { availabilityStatus, maxCapacity } = req.body;

    if (!availabilityStatus) {
      return res.status(400).json({
        success: false,
        error: 'availabilityStatus is required'
      });
    }

    const validStatuses = ['available', 'busy', 'away', 'offline'];
    if (!validStatuses.includes(availabilityStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Update admin workload table
    const { db } = require('../../../db/database');

    const updates = ['availability_status = ?', 'last_activity = datetime("now")'];
    const params = [availabilityStatus];

    if (maxCapacity !== undefined) {
      updates.push('max_capacity = ?');
      params.push(parseInt(maxCapacity));
    }

    params.push(adminId);

    db.prepare(`
      INSERT OR REPLACE INTO admin_workload (
        admin_id, availability_status, last_activity, max_capacity
      ) VALUES (
        ?, ?, datetime('now'), COALESCE(?, 5)
      )
    `).run(adminId, availabilityStatus, maxCapacity || 5);

    res.json({
      success: true,
      message: `Status updated to ${availabilityStatus}`
    });

  } catch (error) {
    logger.error('Failed to update admin status', {
      admin_id: req.params.adminId,
      error: error.message
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/admin-escalation/bulk-assign
 * Bulk assign multiple escalations
 */
router.post('/bulk-assign', (req, res) => {
  try {
    const { escalationIds, adminId } = req.body;

    if (!Array.isArray(escalationIds) || escalationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'escalationIds array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const escalationId of escalationIds) {
      try {
        const result = escalationSystem.assignEscalation(escalationId, adminId);
        results.push(result);
      } catch (error) {
        errors.push({ escalationId, error: error.message });
      }
    }

    res.json({
      success: true,
      data: {
        assigned: results,
        errors,
        summary: {
          total: escalationIds.length,
          successful: results.length,
          failed: errors.length
        }
      }
    });

  } catch (error) {
    logger.error('Failed to bulk assign escalations', {
      escalation_ids: req.body.escalationIds,
      admin_id: req.body.adminId,
      error: error.message
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/admin-escalation/health
 * Health check and system status
 */
router.get('/health', (req, res) => {
  try {
    const { db } = require('../../../db/database');

    // Check database connectivity
    const dbCheck = db.prepare('SELECT 1 as status').get();

    // Get basic stats
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_escalations,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN sla_deadline < datetime('now') AND status NOT IN ('resolved', 'closed') THEN 1 END) as sla_breaches
      FROM escalation_queue
      WHERE created_at > datetime('now', '-24 hours')
    `).get();

    res.json({
      success: true,
      data: {
        status: 'healthy',
        database: dbCheck ? 'connected' : 'disconnected',
        escalationSystem: 'operational',
        last24Hours: stats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'System health check failed',
      details: error.message
    });
  }
});

module.exports = router;