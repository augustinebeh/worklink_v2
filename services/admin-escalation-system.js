/**
 * Admin Escalation and Handoff System
 *
 * Provides seamless escalation from automated responses to human support
 * with intelligent context preservation, priority routing, and performance tracking.
 *
 * Features:
 * - Automated escalation triggers (urgency, failed interactions, system issues)
 * - Manual escalation requests from users
 * - Real-time admin notifications via multiple channels
 * - Priority queue management with SLA tracking
 * - Context preservation for seamless handoffs
 * - Performance metrics and analytics
 */

const { db } = require('../db/database');
const { createLogger } = require('../utils/structured-logger');

const logger = createLogger('escalation-system');

// Priority levels and SLA times (in minutes)
const PRIORITY_LEVELS = {
  CRITICAL: { level: 1, slaMinutes: 5, description: 'System issues, payment problems' },
  URGENT: { level: 2, slaMinutes: 15, description: 'High-value users, verification pending' },
  HIGH: { level: 3, slaMinutes: 60, description: 'Repeated failed interactions' },
  NORMAL: { level: 4, slaMinutes: 240, description: 'General escalation requests' },
  LOW: { level: 5, slaMinutes: 1440, description: 'Non-urgent inquiries' }
};

// Escalation trigger types
const TRIGGER_TYPES = {
  AUTOMATED_URGENCY: 'automated_urgency',
  AUTOMATED_FAILURE: 'automated_failure',
  AUTOMATED_SYSTEM: 'automated_system',
  MANUAL_REQUEST: 'manual_request',
  CONTEXT_BASED: 'context_based',
  AI_CONFIDENCE: 'ai_confidence',
  SENTIMENT_NEGATIVE: 'sentiment_negative',
  NO_RESPONSE: 'no_response'
};

// Admin notification channels
const NOTIFICATION_CHANNELS = {
  WEBSOCKET: 'websocket',
  TELEGRAM: 'telegram',
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push'
};

// Lazy load dependencies to avoid circular imports
let conversationManager = null;
let websocketService = null;
let messagingService = null;

function getConversationManager() {
  if (!conversationManager) {
    conversationManager = require('./conversation-manager');
  }
  return conversationManager;
}

function getWebsocketService() {
  if (!websocketService) {
    websocketService = require('../websocket');
  }
  return websocketService;
}

function getMessagingService() {
  if (!messagingService) {
    messagingService = require('./messaging');
  }
  return messagingService;
}

// Initialize database schema
function ensureSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS escalation_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'NORMAL',
      trigger_type TEXT NOT NULL,
      trigger_reason TEXT,
      context_data TEXT, -- JSON data for handoff context
      assigned_admin TEXT,
      status TEXT DEFAULT 'pending', -- pending, assigned, in_progress, resolved, closed
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      assigned_at DATETIME,
      first_response_at DATETIME,
      resolved_at DATETIME,
      sla_breach BOOLEAN DEFAULT FALSE,
      sla_deadline DATETIME,
      escalation_count INTEGER DEFAULT 1,
      user_satisfaction_score INTEGER, -- 1-5 rating
      resolution_notes TEXT,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS escalation_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      escalation_id INTEGER NOT NULL,
      channel TEXT NOT NULL,
      recipient TEXT NOT NULL, -- admin ID, phone, email, etc
      message TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      delivered BOOLEAN DEFAULT FALSE,
      read BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (escalation_id) REFERENCES escalation_queue(id)
    );

    CREATE TABLE IF NOT EXISTS admin_workload (
      admin_id TEXT PRIMARY KEY,
      active_escalations INTEGER DEFAULT 0,
      max_capacity INTEGER DEFAULT 5,
      specializations TEXT, -- JSON array of specialization tags
      availability_status TEXT DEFAULT 'available', -- available, busy, away, offline
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_escalations_handled INTEGER DEFAULT 0,
      avg_resolution_time REAL DEFAULT 0,
      satisfaction_rating REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS escalation_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      total_escalations INTEGER DEFAULT 0,
      resolved_escalations INTEGER DEFAULT 0,
      avg_response_time REAL DEFAULT 0, -- in minutes
      avg_resolution_time REAL DEFAULT 0, -- in minutes
      sla_breach_count INTEGER DEFAULT 0,
      satisfaction_avg REAL DEFAULT 0,
      escalations_by_trigger TEXT, -- JSON object with trigger type counts
      escalations_by_priority TEXT -- JSON object with priority counts
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_escalation_metrics_date ON escalation_metrics(date);
    CREATE INDEX IF NOT EXISTS idx_escalation_queue_status ON escalation_queue(status);
    CREATE INDEX IF NOT EXISTS idx_escalation_queue_priority ON escalation_queue(priority);
    CREATE INDEX IF NOT EXISTS idx_escalation_queue_assigned ON escalation_queue(assigned_admin);
    CREATE INDEX IF NOT EXISTS idx_escalation_queue_sla ON escalation_queue(sla_deadline);
  `);

  // Insert default admin workload entries for existing admins
  db.prepare(`
    INSERT OR IGNORE INTO admin_workload (admin_id)
    SELECT DISTINCT assigned_to FROM conversation_metadata WHERE assigned_to IS NOT NULL
  `).run();
}

// Initialize schema
ensureSchema();

/**
 * Analyze message for escalation triggers
 * @param {string} candidateId - The candidate ID
 * @param {string} message - Message content
 * @param {object} context - Additional context (AI confidence, previous attempts, etc.)
 * @returns {object} Analysis result with escalation recommendation
 */
function analyzeEscalationTriggers(candidateId, message, context = {}) {
  const triggers = [];
  let priority = 'NORMAL';
  let urgencyScore = 0;

  // 1. Check AI confidence
  if (context.aiConfidence !== undefined && context.aiConfidence < 0.6) {
    triggers.push({
      type: TRIGGER_TYPES.AI_CONFIDENCE,
      reason: `Low AI confidence: ${Math.round(context.aiConfidence * 100)}%`,
      weight: 3
    });
    urgencyScore += 3;
  }

  // 2. Analyze message content for urgency keywords
  const urgentKeywords = [
    'urgent', 'emergency', 'asap', 'immediately', 'critical', 'breaking',
    'payment', 'salary', 'money', 'paid', 'missing', 'wrong amount',
    'help', 'problem', 'issue', 'error', 'bug', 'broken', 'not working',
    'angry', 'frustrated', 'disappointed', 'complaint', 'unacceptable',
    'cancel', 'quit', 'leave', 'resign', 'stop'
  ];

  const messageWords = message.toLowerCase().split(/\s+/);
  const foundUrgentKeywords = urgentKeywords.filter(keyword =>
    messageWords.some(word => word.includes(keyword))
  );

  if (foundUrgentKeywords.length > 0) {
    triggers.push({
      type: TRIGGER_TYPES.AUTOMATED_URGENCY,
      reason: `Urgent keywords detected: ${foundUrgentKeywords.join(', ')}`,
      weight: foundUrgentKeywords.length
    });
    urgencyScore += foundUrgentKeywords.length;
  }

  // 3. Check for system-related issues
  const systemKeywords = [
    'login', 'password', 'account', 'access', 'verification', 'approve',
    'pending', 'stuck', 'frozen', 'loading', 'crash', 'error'
  ];

  const foundSystemKeywords = systemKeywords.filter(keyword =>
    messageWords.some(word => word.includes(keyword))
  );

  if (foundSystemKeywords.length > 0) {
    triggers.push({
      type: TRIGGER_TYPES.AUTOMATED_SYSTEM,
      reason: `System issue keywords: ${foundSystemKeywords.join(', ')}`,
      weight: 2
    });
    urgencyScore += 2;
  }

  // 4. Check for repeated failed interactions
  if (context.failedAttempts && context.failedAttempts >= 3) {
    triggers.push({
      type: TRIGGER_TYPES.AUTOMATED_FAILURE,
      reason: `Multiple failed automated responses: ${context.failedAttempts} attempts`,
      weight: 4
    });
    urgencyScore += 4;
  }

  // 5. Check for high-value candidate context
  if (context.candidateValue === 'high' || context.candidateLevel === 'premium') {
    triggers.push({
      type: TRIGGER_TYPES.CONTEXT_BASED,
      reason: 'High-value candidate requires priority support',
      weight: 2
    });
    urgencyScore += 2;
  }

  // 6. Check for no admin response threshold
  if (context.hoursSinceLastAdminResponse && context.hoursSinceLastAdminResponse >= 24) {
    triggers.push({
      type: TRIGGER_TYPES.NO_RESPONSE,
      reason: `No admin response in ${context.hoursSinceLastAdminResponse} hours`,
      weight: 3
    });
    urgencyScore += 3;
  }

  // 7. Sentiment analysis - negative sentiment
  if (context.sentiment && context.sentiment.score < -0.5) {
    triggers.push({
      type: TRIGGER_TYPES.SENTIMENT_NEGATIVE,
      reason: `Negative sentiment detected: ${context.sentiment.label}`,
      weight: 2
    });
    urgencyScore += 2;
  }

  // Determine priority based on urgency score and context
  if (urgencyScore >= 8 || context.isSystemIssue || context.isPaymentIssue) {
    priority = 'CRITICAL';
  } else if (urgencyScore >= 6 || context.candidateValue === 'high') {
    priority = 'URGENT';
  } else if (urgencyScore >= 4) {
    priority = 'HIGH';
  } else if (urgencyScore >= 2) {
    priority = 'NORMAL';
  } else {
    priority = 'LOW';
  }

  return {
    shouldEscalate: triggers.length > 0 || urgencyScore >= 2,
    triggers,
    priority,
    urgencyScore,
    reason: triggers.map(t => t.reason).join('; ')
  };
}

/**
 * Create escalation entry
 * @param {string} candidateId - The candidate ID
 * @param {string} triggerType - Type of trigger
 * @param {string} reason - Escalation reason
 * @param {string} priority - Priority level
 * @param {object} contextData - Context for handoff
 * @returns {object} Created escalation
 */
function createEscalation(candidateId, triggerType, reason, priority = 'NORMAL', contextData = {}) {
  try {
    // Get candidate info
    const candidate = db.prepare(`
      SELECT id, name, email, phone, level, xp, status,
             profile_photo, preferred_contact, verification_status
      FROM candidates WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      throw new Error(`Candidate ${candidateId} not found`);
    }

    // Get conversation history
    const recentMessages = db.prepare(`
      SELECT * FROM messages
      WHERE candidate_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(candidateId);

    // Get conversation metadata
    const convManager = getConversationManager();
    const convMetadata = convManager ? convManager.getConversationMetadata(candidateId) : {};

    // Calculate SLA deadline
    const slaMinutes = PRIORITY_LEVELS[priority]?.slaMinutes || PRIORITY_LEVELS.NORMAL.slaMinutes;
    const slaDeadline = new Date(Date.now() + slaMinutes * 60 * 1000);

    // Prepare comprehensive context
    const fullContext = {
      ...contextData,
      candidate,
      recentMessages,
      conversationMetadata: convMetadata,
      accountStatus: {
        level: candidate.level,
        xp: candidate.xp,
        verificationStatus: candidate.verification_status,
        status: candidate.status
      },
      systemContext: {
        escalationTime: new Date().toISOString(),
        triggerType,
        priority,
        slaDeadline: slaDeadline.toISOString()
      }
    };

    // Insert escalation
    const escalationId = db.prepare(`
      INSERT INTO escalation_queue (
        candidate_id, priority, trigger_type, trigger_reason,
        context_data, sla_deadline, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      candidateId,
      priority,
      triggerType,
      reason,
      JSON.stringify(fullContext),
      slaDeadline.toISOString()
    ).lastInsertRowid;

    const escalation = db.prepare(`
      SELECT * FROM escalation_queue WHERE id = ?
    `).get(escalationId);

    // Update conversation metadata to mark as escalated
    if (convManager) {
      convManager.escalate(candidateId, reason);
    }

    // Send notifications to admins
    notifyAdminsOfEscalation(escalation);

    // Log escalation
    logger.info('Escalation created', {
      escalation_id: escalationId,
      candidate_id: candidateId,
      priority,
      trigger_type: triggerType,
      reason: reason.substring(0, 100)
    });

    return escalation;

  } catch (error) {
    logger.error('Failed to create escalation', {
      candidate_id: candidateId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Manual escalation request from user
 * @param {string} candidateId - The candidate ID
 * @param {string} reason - User-provided reason
 * @param {object} additionalContext - Additional context
 * @returns {object} Created escalation
 */
function requestManualEscalation(candidateId, reason = 'User requested human support', additionalContext = {}) {
  const context = {
    ...additionalContext,
    manualRequest: true,
    userReason: reason
  };

  return createEscalation(
    candidateId,
    TRIGGER_TYPES.MANUAL_REQUEST,
    reason,
    'NORMAL',
    context
  );
}

/**
 * Get escalation queue with filtering and sorting
 * @param {object} filters - Filter options
 * @returns {array} Escalations in queue
 */
function getEscalationQueue(filters = {}) {
  let sql = `
    SELECT
      eq.*,
      c.name as candidate_name,
      c.email as candidate_email,
      c.phone as candidate_phone,
      c.profile_photo,
      aw.availability_status as admin_availability,
      CASE
        WHEN eq.sla_deadline < datetime('now') THEN 1
        ELSE 0
      END as sla_breached,
      ROUND(
        (julianday('now') - julianday(eq.created_at)) * 24 * 60, 2
      ) as age_minutes
    FROM escalation_queue eq
    LEFT JOIN candidates c ON eq.candidate_id = c.id
    LEFT JOIN admin_workload aw ON eq.assigned_admin = aw.admin_id
    WHERE 1=1
  `;

  const params = [];

  // Apply filters
  if (filters.status) {
    sql += ' AND eq.status = ?';
    params.push(filters.status);
  }

  if (filters.priority) {
    sql += ' AND eq.priority = ?';
    params.push(filters.priority);
  }

  if (filters.assignedAdmin) {
    sql += ' AND eq.assigned_admin = ?';
    params.push(filters.assignedAdmin);
  }

  if (filters.unassignedOnly) {
    sql += ' AND eq.assigned_admin IS NULL';
  }

  if (filters.slaBreachedOnly) {
    sql += ' AND eq.sla_deadline < datetime("now")';
  }

  // Sorting: SLA breached first, then by priority, then by age
  sql += `
    ORDER BY
      sla_breached DESC,
      CASE eq.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'URGENT' THEN 2
        WHEN 'HIGH' THEN 3
        WHEN 'NORMAL' THEN 4
        WHEN 'LOW' THEN 5
      END,
      eq.created_at ASC
  `;

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }

  const escalations = db.prepare(sql).all(...params);

  // Parse context data
  return escalations.map(escalation => ({
    ...escalation,
    context_data: escalation.context_data ? JSON.parse(escalation.context_data) : {}
  }));
}

/**
 * Assign escalation to admin with workload balancing
 * @param {number} escalationId - Escalation ID
 * @param {string} adminId - Admin ID to assign to (null for auto-assignment)
 * @returns {object} Updated escalation
 */
function assignEscalation(escalationId, adminId = null) {
  try {
    const escalation = db.prepare(`
      SELECT * FROM escalation_queue WHERE id = ?
    `).get(escalationId);

    if (!escalation) {
      throw new Error(`Escalation ${escalationId} not found`);
    }

    if (escalation.status !== 'pending') {
      throw new Error(`Escalation ${escalationId} is not in pending status`);
    }

    // Auto-assign if no admin specified
    if (!adminId) {
      adminId = findBestAvailableAdmin(escalation);
    }

    if (!adminId) {
      throw new Error('No available admin found for assignment');
    }

    // Update escalation
    db.prepare(`
      UPDATE escalation_queue
      SET assigned_admin = ?, status = 'assigned', assigned_at = datetime('now')
      WHERE id = ?
    `).run(adminId, escalationId);

    // Update admin workload
    db.prepare(`
      INSERT OR REPLACE INTO admin_workload (admin_id, active_escalations, last_activity)
      VALUES (
        ?,
        COALESCE((SELECT active_escalations FROM admin_workload WHERE admin_id = ?), 0) + 1,
        datetime('now')
      )
    `).run(adminId, adminId);

    const updatedEscalation = db.prepare(`
      SELECT eq.*, c.name as candidate_name
      FROM escalation_queue eq
      LEFT JOIN candidates c ON eq.candidate_id = c.id
      WHERE eq.id = ?
    `).get(escalationId);

    // Notify assigned admin
    notifyAdminOfAssignment(adminId, updatedEscalation);

    // Broadcast assignment to all admins
    const ws = getWebsocketService();
    ws.broadcastToAdmins({
      type: 'escalation_assigned',
      escalationId,
      assignedAdmin: adminId,
      candidateId: escalation.candidate_id
    });

    logger.info('Escalation assigned', {
      escalation_id: escalationId,
      assigned_admin: adminId,
      candidate_id: escalation.candidate_id
    });

    return updatedEscalation;

  } catch (error) {
    logger.error('Failed to assign escalation', {
      escalation_id: escalationId,
      admin_id: adminId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Find best available admin for assignment
 * @param {object} escalation - Escalation object
 * @returns {string|null} Best admin ID or null if none available
 */
function findBestAvailableAdmin(escalation) {
  // Get available admins with their workload and specializations
  const availableAdmins = db.prepare(`
    SELECT
      admin_id,
      active_escalations,
      max_capacity,
      specializations,
      availability_status,
      avg_resolution_time,
      satisfaction_rating,
      (max_capacity - active_escalations) as capacity_remaining
    FROM admin_workload
    WHERE availability_status IN ('available', 'busy')
      AND active_escalations < max_capacity
    ORDER BY
      availability_status ASC,  -- 'available' comes before 'busy'
      capacity_remaining DESC,
      satisfaction_rating DESC,
      avg_resolution_time ASC
    LIMIT 1
  `).get();

  return availableAdmins ? availableAdmins.admin_id : null;
}

/**
 * Update escalation status
 * @param {number} escalationId - Escalation ID
 * @param {string} status - New status
 * @param {string} adminId - Admin making the update
 * @param {string} notes - Optional notes
 * @returns {object} Updated escalation
 */
function updateEscalationStatus(escalationId, status, adminId = null, notes = null) {
  const validStatuses = ['pending', 'assigned', 'in_progress', 'resolved', 'closed'];

  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const escalation = db.prepare(`
    SELECT * FROM escalation_queue WHERE id = ?
  `).get(escalationId);

  if (!escalation) {
    throw new Error(`Escalation ${escalationId} not found`);
  }

  const updates = ['status = ?', 'updated_at = datetime("now")'];
  const params = [status];

  // Handle status-specific updates
  if (status === 'in_progress' && !escalation.first_response_at) {
    updates.push('first_response_at = datetime("now")');
  }

  if (status === 'resolved' || status === 'closed') {
    updates.push('resolved_at = datetime("now")');

    // Update admin workload (decrease active count)
    if (escalation.assigned_admin) {
      db.prepare(`
        UPDATE admin_workload
        SET active_escalations = GREATEST(0, active_escalations - 1)
        WHERE admin_id = ?
      `).run(escalation.assigned_admin);
    }
  }

  if (notes) {
    updates.push('resolution_notes = ?');
    params.push(notes);
  }

  params.push(escalationId);

  db.prepare(`
    UPDATE escalation_queue
    SET ${updates.join(', ')}
    WHERE id = ?
  `).run(...params);

  const updatedEscalation = db.prepare(`
    SELECT * FROM escalation_queue WHERE id = ?
  `).get(escalationId);

  // Broadcast status update
  const ws = getWebsocketService();
  ws.broadcastToAdmins({
    type: 'escalation_status_updated',
    escalationId,
    status,
    candidateId: escalation.candidate_id
  });

  // Notify candidate if resolved
  if (status === 'resolved' && escalation.candidate_id) {
    notifyCandidateOfResolution(escalation.candidate_id, escalationId);
  }

  logger.info('Escalation status updated', {
    escalation_id: escalationId,
    status,
    admin_id: adminId
  });

  return updatedEscalation;
}

/**
 * Record user satisfaction feedback
 * @param {number} escalationId - Escalation ID
 * @param {number} score - Satisfaction score (1-5)
 * @param {string} feedback - Optional feedback text
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

  // Update admin satisfaction rating
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
 * Send notifications to admins about new escalation
 * @param {object} escalation - Escalation object
 */
async function notifyAdminsOfEscalation(escalation) {
  try {
    const context = JSON.parse(escalation.context_data || '{}');
    const candidate = context.candidate || {};

    const message = `🚨 New ${escalation.priority} Priority Escalation\n\n` +
      `👤 ${candidate.name || 'Unknown'} (${candidate.email || escalation.candidate_id})\n` +
      `📝 ${escalation.trigger_reason}\n` +
      `⏰ SLA: ${new Date(escalation.sla_deadline).toLocaleString()}`;

    // WebSocket notification
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

    // Record notification
    const notificationId = db.prepare(`
      INSERT INTO escalation_notifications (escalation_id, channel, recipient, message)
      VALUES (?, ?, ?, ?)
    `).run(escalation.id, NOTIFICATION_CHANNELS.WEBSOCKET, 'all_admins', message).lastInsertRowid;

    // Telegram notification for high priority
    if (['CRITICAL', 'URGENT'].includes(escalation.priority)) {
      try {
        const messaging = getMessagingService();
        // This would need to be implemented based on your Telegram bot setup
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
 * @param {string} adminId - Admin ID
 * @param {object} escalation - Escalation object
 */
function notifyAdminOfAssignment(adminId, escalation) {
  const message = `📋 Escalation Assigned to You\n\n` +
    `👤 ${escalation.candidate_name}\n` +
    `📝 ${escalation.trigger_reason}\n` +
    `⏰ SLA: ${new Date(escalation.sla_deadline).toLocaleString()}`;

  // WebSocket notification to specific admin
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
 * @param {string} candidateId - Candidate ID
 * @param {number} escalationId - Escalation ID
 */
function notifyCandidateOfResolution(candidateId, escalationId) {
  try {
    const ws = getWebsocketService();

    // Notify via WebSocket if online
    ws.broadcastToCandidate(candidateId, {
      type: 'escalation_resolved',
      escalationId,
      message: 'Your support request has been resolved. We hope we were able to help!',
      feedbackRequest: true
    });

    // Create in-app notification
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
 * @param {string} adminId - Admin ID
 */
function updateAdminMetrics(adminId) {
  try {
    // Calculate metrics from resolved escalations
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
 * Get escalation analytics and metrics
 * @param {object} filters - Date range and other filters
 * @returns {object} Analytics data
 */
function getEscalationAnalytics(filters = {}) {
  const dateFrom = filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dateTo = filters.dateTo || new Date();

  // Overall metrics
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

  // By priority
  const byPriority = db.prepare(`
    SELECT priority, COUNT(*) as count
    FROM escalation_queue
    WHERE created_at BETWEEN ? AND ?
    GROUP BY priority
    ORDER BY
      CASE priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'URGENT' THEN 2
        WHEN 'HIGH' THEN 3
        WHEN 'NORMAL' THEN 4
        WHEN 'LOW' THEN 5
      END
  `).all(dateFrom.toISOString(), dateTo.toISOString());

  // By trigger type
  const byTrigger = db.prepare(`
    SELECT trigger_type, COUNT(*) as count
    FROM escalation_queue
    WHERE created_at BETWEEN ? AND ?
    GROUP BY trigger_type
    ORDER BY count DESC
  `).all(dateFrom.toISOString(), dateTo.toISOString());

  // Admin performance
  const adminPerformance = db.prepare(`
    SELECT
      aw.admin_id,
      aw.total_escalations_handled,
      aw.avg_resolution_time,
      aw.satisfaction_rating,
      aw.active_escalations,
      aw.availability_status
    FROM admin_workload aw
    ORDER BY aw.total_escalations_handled DESC
  `).all();

  // Daily trend
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
    overall,
    byPriority,
    byTrigger,
    adminPerformance,
    dailyTrend,
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
      // Mark as breached
      const escalationIds = breachedEscalations.map(e => e.id);
      db.prepare(`
        UPDATE escalation_queue
        SET sla_breach = TRUE
        WHERE id IN (${escalationIds.map(() => '?').join(',')})
      `).run(...escalationIds);

      // Send alerts
      const ws = getWebsocketService();
      breachedEscalations.forEach(escalation => {
        ws.broadcastToAdmins({
          type: 'sla_breach_alert',
          escalation,
          message: `🚨 SLA BREACH: ${escalation.candidate_name} - ${escalation.trigger_reason}`
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

// Set up periodic SLA monitoring
setInterval(checkSLABreaches, 5 * 60 * 1000); // Check every 5 minutes

module.exports = {
  // Core functions
  analyzeEscalationTriggers,
  createEscalation,
  requestManualEscalation,

  // Queue management
  getEscalationQueue,
  assignEscalation,
  updateEscalationStatus,

  // Feedback and satisfaction
  recordSatisfactionFeedback,

  // Analytics and metrics
  getEscalationAnalytics,
  updateAdminMetrics,

  // Monitoring
  checkSLABreaches,

  // Constants
  PRIORITY_LEVELS,
  TRIGGER_TYPES,
  NOTIFICATION_CHANNELS
};