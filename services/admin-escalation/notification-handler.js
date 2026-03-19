/**
 * Admin Escalation - Notification & Analytics Handler
 *
 * Extracted notification delivery, admin metrics,
 * analytics, and SLA monitoring from the escalation system.
 */

const { db } = require('../../db');
const { createLogger } = require('../../utils/structured-logger');
const logger = createLogger('escalation-notifications');

// Lazy load dependencies to avoid circular imports
let websocketService = null;
let messagingService = null;

function getWebsocketService() {
  if (!websocketService) {
    websocketService = require('../../websocket');
  }
  return websocketService;
}

function getMessagingService() {
  if (!messagingService) {
    messagingService = require('../messaging');
  }
  return messagingService;
}

const NOTIFICATION_CHANNELS = {
  WEBSOCKET: 'websocket',
  TELEGRAM: 'telegram',
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push'
};

/**
 * Send notifications to admins about new escalation
 */
async function notifyAdminsOfEscalation(escalation) {
  try {
    const context = JSON.parse(escalation.context_data || '{}');
    const candidate = context.candidate || {};

    const message = `New ${escalation.priority} Priority Escalation\n\n` +
      `${candidate.name || 'Unknown'} (${candidate.email || escalation.candidate_id})\n` +
      `${escalation.trigger_reason}\n` +
      `SLA: ${new Date(escalation.sla_deadline).toLocaleString()}`;

    const ws = getWebsocketService();
    ws.broadcastToAdmins({
      type: 'escalation_created',
      escalation: {
        ...escalation,
        context_data: context
      },
      priority: escalation.priority,
      message
    });

    const notificationId = db.prepare(`
      INSERT INTO escalation_notifications (escalation_id, channel, recipient, message)
      VALUES (?, ?, ?, ?)
    `).run(escalation.id, NOTIFICATION_CHANNELS.WEBSOCKET, 'all_admins', message).lastInsertRowid;

    if (['CRITICAL', 'URGENT'].includes(escalation.priority)) {
      try {
        const messaging = getMessagingService();
        // messaging.notifyAdminChannel(message);
      } catch (error) {
        logger.error('Failed to send Telegram notification', { error: error.message });
      }
    }

    logger.info('Admin notifications sent', {
      escalation_id: escalation.id,
      priority: escalation.priority,
      channels: ['websocket']
    });

  } catch (error) {
    logger.error('Failed to notify admins of escalation', {
      escalation_id: escalation.id,
      error: error.message
    });
  }
}

/**
 * Notify admin of escalation assignment
 */
function notifyAdminOfAssignment(adminId, escalation) {
  const message = `Escalation Assigned to You\n\n` +
    `${escalation.candidate_name}\n` +
    `${escalation.trigger_reason}\n` +
    `SLA: ${new Date(escalation.sla_deadline).toLocaleString()}`;

  const ws = getWebsocketService();
  ws.broadcastToAdmins({
    type: 'escalation_assigned_to_me',
    escalationId: escalation.id,
    message,
    adminId
  });
}

/**
 * Notify candidate of escalation resolution
 */
function notifyCandidateOfResolution(candidateId, escalationId) {
  try {
    const ws = getWebsocketService();

    ws.broadcastToCandidate(candidateId, {
      type: 'escalation_resolved',
      escalationId,
      message: 'Your support request has been resolved. We hope we were able to help!',
      feedbackRequest: true
    });

    ws.createNotification(
      candidateId,
      'support',
      'Support Request Resolved',
      'Your support request has been resolved. Please rate your experience.',
      { escalationId }
    );

  } catch (error) {
    logger.error('Failed to notify candidate of resolution', {
      candidate_id: candidateId,
      escalation_id: escalationId,
      error: error.message
    });
  }
}

/**
 * Update admin performance metrics
 */
function updateAdminMetrics(adminId) {
  try {
    const metrics = db.prepare(`
      SELECT
        COUNT(*) as total_handled,
        AVG(ROUND((julianday(resolved_at) - julianday(assigned_at)) * 24 * 60, 2)) as avg_resolution_minutes,
        AVG(CAST(user_satisfaction_score as REAL)) as avg_satisfaction,
        AVG(ROUND((julianday(first_response_at) - julianday(assigned_at)) * 24 * 60, 2)) as avg_response_minutes
      FROM escalation_queue
      WHERE assigned_admin = ?
        AND status IN ('resolved', 'closed')
        AND resolved_at IS NOT NULL
        AND assigned_at IS NOT NULL
    `).get(adminId);

    if (metrics && metrics.total_handled > 0) {
      db.prepare(`
        UPDATE admin_workload
        SET
          total_escalations_handled = ?,
          avg_resolution_time = COALESCE(?, avg_resolution_time),
          satisfaction_rating = COALESCE(?, satisfaction_rating)
        WHERE admin_id = ?
      `).run(
        metrics.total_handled,
        metrics.avg_resolution_minutes,
        metrics.avg_satisfaction,
        adminId
      );
    }

  } catch (error) {
    logger.error('Failed to update admin metrics', {
      admin_id: adminId,
      error: error.message
    });
  }
}

/**
 * Record user satisfaction feedback
 */
function recordSatisfactionFeedback(escalationId, score, feedback = null) {
  if (score < 1 || score > 5) {
    throw new Error('Satisfaction score must be between 1 and 5');
  }

  db.prepare(`
    UPDATE escalation_queue
    SET user_satisfaction_score = ?,
        resolution_notes = COALESCE(resolution_notes, '') || CASE
          WHEN resolution_notes IS NOT NULL THEN char(10) || 'User feedback: ' || ?
          ELSE 'User feedback: ' || ?
        END
    WHERE id = ?
  `).run(score, feedback || `Satisfaction: ${score}/5`, feedback || `Satisfaction: ${score}/5`, escalationId);

  const escalation = db.prepare(`
    SELECT assigned_admin FROM escalation_queue WHERE id = ?
  `).get(escalationId);

  if (escalation && escalation.assigned_admin) {
    updateAdminMetrics(escalation.assigned_admin);
  }

  logger.info('Satisfaction feedback recorded', {
    escalation_id: escalationId,
    score,
    has_feedback: !!feedback
  });
}

/**
 * Get escalation analytics and metrics
 */
function getEscalationAnalytics(filters = {}) {
  const dateFrom = filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dateTo = filters.dateTo || new Date();

  const overall = db.prepare(`
    SELECT
      COUNT(*) as total_escalations,
      COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved_count,
      AVG(CASE WHEN resolved_at IS NOT NULL AND assigned_at IS NOT NULL
          THEN ROUND((julianday(resolved_at) - julianday(assigned_at)) * 24 * 60, 2) END) as avg_resolution_time,
      AVG(CASE WHEN first_response_at IS NOT NULL AND assigned_at IS NOT NULL
          THEN ROUND((julianday(first_response_at) - julianday(assigned_at)) * 24 * 60, 2) END) as avg_response_time,
      COUNT(CASE WHEN sla_deadline < resolved_at OR (sla_deadline < datetime('now') AND status NOT IN ('resolved', 'closed'))
          THEN 1 END) as sla_breaches,
      AVG(CAST(user_satisfaction_score as REAL)) as avg_satisfaction
    FROM escalation_queue
    WHERE created_at BETWEEN ? AND ?
  `).get(dateFrom.toISOString(), dateTo.toISOString());

  const byPriority = db.prepare(`
    SELECT priority, COUNT(*) as count
    FROM escalation_queue
    WHERE created_at BETWEEN ? AND ?
    GROUP BY priority
    ORDER BY
      CASE priority
        WHEN 'CRITICAL' THEN 1 WHEN 'URGENT' THEN 2 WHEN 'HIGH' THEN 3
        WHEN 'NORMAL' THEN 4 WHEN 'LOW' THEN 5
      END
  `).all(dateFrom.toISOString(), dateTo.toISOString());

  const byTrigger = db.prepare(`
    SELECT trigger_type, COUNT(*) as count
    FROM escalation_queue
    WHERE created_at BETWEEN ? AND ?
    GROUP BY trigger_type
    ORDER BY count DESC
  `).all(dateFrom.toISOString(), dateTo.toISOString());

  const adminPerformance = db.prepare(`
    SELECT admin_id, total_escalations_handled, avg_resolution_time,
      satisfaction_rating, active_escalations, availability_status
    FROM admin_workload
    ORDER BY total_escalations_handled DESC
  `).all();

  const dailyTrend = db.prepare(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as escalations,
      COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved
    FROM escalation_queue
    WHERE created_at BETWEEN ? AND ?
    GROUP BY DATE(created_at)
    ORDER BY date
  `).all(dateFrom.toISOString(), dateTo.toISOString());

  return {
    overall, byPriority, byTrigger, adminPerformance, dailyTrend,
    dateRange: { from: dateFrom, to: dateTo }
  };
}

/**
 * Check for SLA breaches and send alerts
 */
function checkSLABreaches() {
  try {
    const breachedEscalations = db.prepare(`
      SELECT eq.*, c.name as candidate_name
      FROM escalation_queue eq
      LEFT JOIN candidates c ON eq.candidate_id = c.id
      WHERE eq.sla_deadline < datetime('now')
        AND eq.status NOT IN ('resolved', 'closed')
        AND eq.sla_breach = FALSE
    `).all();

    if (breachedEscalations.length > 0) {
      const escalationIds = breachedEscalations.map(e => e.id);
      db.prepare(`
        UPDATE escalation_queue
        SET sla_breach = TRUE
        WHERE id IN (${escalationIds.map(() => '?').join(',')})
      `).run(...escalationIds);

      const ws = getWebsocketService();
      breachedEscalations.forEach(escalation => {
        ws.broadcastToAdmins({
          type: 'sla_breach_alert',
          escalation,
          message: `SLA BREACH: ${escalation.candidate_name} - ${escalation.trigger_reason}`
        });
      });

      logger.warn('SLA breaches detected', {
        count: breachedEscalations.length,
        escalation_ids: escalationIds
      });
    }

  } catch (error) {
    logger.error('Failed to check SLA breaches', { error: error.message });
  }
}

module.exports = {
  NOTIFICATION_CHANNELS,
  notifyAdminsOfEscalation,
  notifyAdminOfAssignment,
  notifyCandidateOfResolution,
  updateAdminMetrics,
  recordSatisfactionFeedback,
  getEscalationAnalytics,
  checkSLABreaches
};
