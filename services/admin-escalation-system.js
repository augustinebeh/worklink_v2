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

const { db } = require('../db');
const { createLogger } = require('../utils/structured-logger');
const intervalRegistry = require('../utils/interval-registry');

const logger = createLogger('escalation-system');

// Import notification and analytics handlers
const notifHandler = require('./admin-escalation/notification-handler');

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
  NO_RESPONSE: 'no_response',
  RESCHEDULE_WITHIN_24H: 'reschedule_within_24h',
  CHAT_RESCHEDULE_REQUEST: 'chat_reschedule_request',
  REPEATED_RESCHEDULE: 'repeated_reschedule',
  NO_CALENDAR_AVAILABILITY: 'no_calendar_availability'
};

// Re-export notification channels
const NOTIFICATION_CHANNELS = notifHandler.NOTIFICATION_CHANNELS;

// Lazy load dependencies to avoid circular imports
let conversationManager = null;
let websocketService = null;

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

// Initialize database schema
function ensureSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS escalation_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'NORMAL',
      trigger_type TEXT NOT NULL,
      trigger_reason TEXT,
      context_data TEXT,
      assigned_admin TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      assigned_at DATETIME,
      first_response_at DATETIME,
      resolved_at DATETIME,
      sla_breach BOOLEAN DEFAULT FALSE,
      sla_deadline DATETIME,
      escalation_count INTEGER DEFAULT 1,
      user_satisfaction_score INTEGER,
      resolution_notes TEXT,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS escalation_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      escalation_id INTEGER NOT NULL,
      channel TEXT NOT NULL,
      recipient TEXT NOT NULL,
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
      specializations TEXT,
      availability_status TEXT DEFAULT 'available',
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
      avg_response_time REAL DEFAULT 0,
      avg_resolution_time REAL DEFAULT 0,
      sla_breach_count INTEGER DEFAULT 0,
      satisfaction_avg REAL DEFAULT 0,
      escalations_by_trigger TEXT,
      escalations_by_priority TEXT
    );
  `);

  try {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_escalation_metrics_date ON escalation_metrics(date);
      CREATE INDEX IF NOT EXISTS idx_escalation_queue_status ON escalation_queue(status);
      CREATE INDEX IF NOT EXISTS idx_escalation_queue_priority ON escalation_queue(priority);
      CREATE INDEX IF NOT EXISTS idx_escalation_queue_assigned ON escalation_queue(assigned_admin);
      CREATE INDEX IF NOT EXISTS idx_escalation_queue_sla ON escalation_queue(sla_deadline);
    `);
  } catch (error) {
    logger.warn('Could not create escalation indexes', { error: error.message });
  }

  try {
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='conversation_metadata'
    `).get();

    if (tableExists) {
      db.prepare(`
        INSERT OR IGNORE INTO admin_workload (admin_id)
        SELECT DISTINCT assigned_to FROM conversation_metadata WHERE assigned_to IS NOT NULL
      `).run();
    }
  } catch (error) {
    logger.warn('Could not initialize admin workload from conversation_metadata', { error: error.message });
  }
}

// Initialize schema
ensureSchema();

/**
 * Analyze message for escalation triggers
 */
function analyzeEscalationTriggers(candidateId, message, context = {}) {
  const triggers = [];
  let priority = 'NORMAL';
  let urgencyScore = 0;

  if (context.aiConfidence !== undefined && context.aiConfidence < 0.6) {
    triggers.push({ type: TRIGGER_TYPES.AI_CONFIDENCE, reason: `Low AI confidence: ${Math.round(context.aiConfidence * 100)}%`, weight: 3 });
    urgencyScore += 3;
  }

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
    triggers.push({ type: TRIGGER_TYPES.AUTOMATED_URGENCY, reason: `Urgent keywords detected: ${foundUrgentKeywords.join(', ')}`, weight: foundUrgentKeywords.length });
    urgencyScore += foundUrgentKeywords.length;
  }

  const systemKeywords = ['login', 'password', 'account', 'access', 'verification', 'approve', 'pending', 'stuck', 'frozen', 'loading', 'crash', 'error'];
  const foundSystemKeywords = systemKeywords.filter(keyword =>
    messageWords.some(word => word.includes(keyword))
  );

  if (foundSystemKeywords.length > 0) {
    triggers.push({ type: TRIGGER_TYPES.AUTOMATED_SYSTEM, reason: `System issue keywords: ${foundSystemKeywords.join(', ')}`, weight: 2 });
    urgencyScore += 2;
  }

  if (context.failedAttempts && context.failedAttempts >= 3) {
    triggers.push({ type: TRIGGER_TYPES.AUTOMATED_FAILURE, reason: `Multiple failed automated responses: ${context.failedAttempts} attempts`, weight: 4 });
    urgencyScore += 4;
  }

  if (context.candidateValue === 'high' || context.candidateLevel === 'premium') {
    triggers.push({ type: TRIGGER_TYPES.CONTEXT_BASED, reason: 'High-value candidate requires priority support', weight: 2 });
    urgencyScore += 2;
  }

  if (context.hoursSinceLastAdminResponse && context.hoursSinceLastAdminResponse >= 24) {
    triggers.push({ type: TRIGGER_TYPES.NO_RESPONSE, reason: `No admin response in ${context.hoursSinceLastAdminResponse} hours`, weight: 3 });
    urgencyScore += 3;
  }

  if (context.sentiment && context.sentiment.score < -0.5) {
    triggers.push({ type: TRIGGER_TYPES.SENTIMENT_NEGATIVE, reason: `Negative sentiment detected: ${context.sentiment.label}`, weight: 2 });
    urgencyScore += 2;
  }

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
    triggers, priority, urgencyScore,
    reason: triggers.map(t => t.reason).join('; ')
  };
}

/**
 * Create escalation entry
 */
function createEscalation(candidateId, triggerType, reason, priority = 'NORMAL', contextData = {}) {
  try {
    const candidate = db.prepare(`
      SELECT id, name, email, phone, level, xp, status,
             profile_photo, preferred_contact, verification_status
      FROM candidates WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      throw new Error(`Candidate ${candidateId} not found`);
    }

    const recentMessages = db.prepare(`
      SELECT * FROM messages WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 20
    `).all(candidateId);

    const convManager = getConversationManager();
    const convMetadata = convManager ? convManager.getConversationMetadata(candidateId) : {};

    const slaMinutes = PRIORITY_LEVELS[priority]?.slaMinutes || PRIORITY_LEVELS.NORMAL.slaMinutes;
    const slaDeadline = new Date(Date.now() + slaMinutes * 60 * 1000);

    const fullContext = {
      ...contextData, candidate, recentMessages,
      conversationMetadata: convMetadata,
      accountStatus: { level: candidate.level, xp: candidate.xp, verificationStatus: candidate.verification_status, status: candidate.status },
      systemContext: { escalationTime: new Date().toISOString(), triggerType, priority, slaDeadline: slaDeadline.toISOString() }
    };

    const escalationId = db.prepare(`
      INSERT INTO escalation_queue (
        candidate_id, priority, trigger_type, trigger_reason,
        context_data, sla_deadline, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(candidateId, priority, triggerType, reason, JSON.stringify(fullContext), slaDeadline.toISOString()).lastInsertRowid;

    const escalation = db.prepare(`SELECT * FROM escalation_queue WHERE id = ?`).get(escalationId);

    if (convManager) {
      convManager.escalate(candidateId, reason);
    }

    notifHandler.notifyAdminsOfEscalation(escalation);

    logger.info('Escalation created', {
      escalation_id: escalationId, candidate_id: candidateId, priority,
      trigger_type: triggerType, reason: reason.substring(0, 100)
    });

    return escalation;

  } catch (error) {
    logger.error('Failed to create escalation', { candidate_id: candidateId, error: error.message });
    throw error;
  }
}

/**
 * Manual escalation request from user
 */
function requestManualEscalation(candidateId, reason = 'User requested human support', additionalContext = {}) {
  const context = { ...additionalContext, manualRequest: true, userReason: reason };
  return createEscalation(candidateId, TRIGGER_TYPES.MANUAL_REQUEST, reason, 'NORMAL', context);
}

/**
 * Get escalation queue with filtering and sorting
 */
function getEscalationQueue(filters = {}) {
  let sql = `
    SELECT eq.*, c.name as candidate_name, c.email as candidate_email,
      c.phone as candidate_phone, c.profile_photo,
      aw.availability_status as admin_availability,
      CASE WHEN eq.sla_deadline < datetime('now') THEN 1 ELSE 0 END as sla_breached,
      ROUND((julianday('now') - julianday(eq.created_at)) * 24 * 60, 2) as age_minutes
    FROM escalation_queue eq
    LEFT JOIN candidates c ON eq.candidate_id = c.id
    LEFT JOIN admin_workload aw ON eq.assigned_admin = aw.admin_id
    WHERE 1=1
  `;

  const params = [];

  if (filters.status) { sql += ' AND eq.status = ?'; params.push(filters.status); }
  if (filters.priority) { sql += ' AND eq.priority = ?'; params.push(filters.priority); }
  if (filters.assignedAdmin) { sql += ' AND eq.assigned_admin = ?'; params.push(filters.assignedAdmin); }
  if (filters.unassignedOnly) { sql += ' AND eq.assigned_admin IS NULL'; }
  if (filters.slaBreachedOnly) { sql += ' AND eq.sla_deadline < datetime("now")'; }

  sql += `
    ORDER BY sla_breached DESC,
      CASE eq.priority WHEN 'CRITICAL' THEN 1 WHEN 'URGENT' THEN 2 WHEN 'HIGH' THEN 3 WHEN 'NORMAL' THEN 4 WHEN 'LOW' THEN 5 END,
      eq.created_at ASC
  `;

  if (filters.limit) { sql += ' LIMIT ?'; params.push(filters.limit); }

  const escalations = db.prepare(sql).all(...params);
  return escalations.map(escalation => ({
    ...escalation,
    context_data: escalation.context_data ? JSON.parse(escalation.context_data) : {}
  }));
}

/**
 * Assign escalation to admin with workload balancing
 */
function assignEscalation(escalationId, adminId = null) {
  try {
    const escalation = db.prepare(`SELECT * FROM escalation_queue WHERE id = ?`).get(escalationId);
    if (!escalation) throw new Error(`Escalation ${escalationId} not found`);
    if (escalation.status !== 'pending') throw new Error(`Escalation ${escalationId} is not in pending status`);

    if (!adminId) adminId = findBestAvailableAdmin(escalation);
    if (!adminId) throw new Error('No available admin found for assignment');

    db.prepare(`UPDATE escalation_queue SET assigned_admin = ?, status = 'assigned', assigned_at = datetime('now') WHERE id = ?`).run(adminId, escalationId);

    db.prepare(`
      INSERT OR REPLACE INTO admin_workload (admin_id, active_escalations, last_activity)
      VALUES (?, COALESCE((SELECT active_escalations FROM admin_workload WHERE admin_id = ?), 0) + 1, datetime('now'))
    `).run(adminId, adminId);

    const updatedEscalation = db.prepare(`
      SELECT eq.*, c.name as candidate_name FROM escalation_queue eq
      LEFT JOIN candidates c ON eq.candidate_id = c.id WHERE eq.id = ?
    `).get(escalationId);

    notifHandler.notifyAdminOfAssignment(adminId, updatedEscalation);

    const ws = getWebsocketService();
    ws.broadcastToAdmins({
      type: 'escalation_assigned', escalationId,
      assignedAdmin: adminId, candidateId: escalation.candidate_id
    });

    logger.info('Escalation assigned', { escalation_id: escalationId, assigned_admin: adminId, candidate_id: escalation.candidate_id });
    return updatedEscalation;

  } catch (error) {
    logger.error('Failed to assign escalation', { escalation_id: escalationId, admin_id: adminId, error: error.message });
    throw error;
  }
}

/**
 * Find best available admin for assignment
 */
function findBestAvailableAdmin(escalation) {
  const availableAdmins = db.prepare(`
    SELECT admin_id, active_escalations, max_capacity, specializations,
      availability_status, avg_resolution_time, satisfaction_rating,
      (max_capacity - active_escalations) as capacity_remaining
    FROM admin_workload
    WHERE availability_status IN ('available', 'busy')
      AND active_escalations < max_capacity
    ORDER BY availability_status ASC, capacity_remaining DESC,
      satisfaction_rating DESC, avg_resolution_time ASC
    LIMIT 1
  `).get();

  return availableAdmins ? availableAdmins.admin_id : null;
}

/**
 * Update escalation status
 */
function updateEscalationStatus(escalationId, status, adminId = null, notes = null) {
  const validStatuses = ['pending', 'assigned', 'in_progress', 'resolved', 'closed'];
  if (!validStatuses.includes(status)) throw new Error(`Invalid status: ${status}`);

  const escalation = db.prepare(`SELECT * FROM escalation_queue WHERE id = ?`).get(escalationId);
  if (!escalation) throw new Error(`Escalation ${escalationId} not found`);

  const updates = ['status = ?', 'updated_at = datetime("now")'];
  const params = [status];

  if (status === 'in_progress' && !escalation.first_response_at) {
    updates.push('first_response_at = datetime("now")');
  }

  if (status === 'resolved' || status === 'closed') {
    updates.push('resolved_at = datetime("now")');
    if (escalation.assigned_admin) {
      db.prepare(`UPDATE admin_workload SET active_escalations = GREATEST(0, active_escalations - 1) WHERE admin_id = ?`).run(escalation.assigned_admin);
    }
  }

  if (notes) { updates.push('resolution_notes = ?'); params.push(notes); }

  params.push(escalationId);
  db.prepare(`UPDATE escalation_queue SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updatedEscalation = db.prepare(`SELECT * FROM escalation_queue WHERE id = ?`).get(escalationId);

  const ws = getWebsocketService();
  ws.broadcastToAdmins({
    type: 'escalation_status_updated', escalationId, status,
    candidateId: escalation.candidate_id
  });

  if (status === 'resolved' && escalation.candidate_id) {
    notifHandler.notifyCandidateOfResolution(escalation.candidate_id, escalationId);
  }

  logger.info('Escalation status updated', { escalation_id: escalationId, status, admin_id: adminId });
  return updatedEscalation;
}

// Set up periodic SLA monitoring
const slaCheckInterval = setInterval(notifHandler.checkSLABreaches, 5 * 60 * 1000);
intervalRegistry.register('admin-escalation-sla-check', slaCheckInterval, 'SLA breach monitoring (every 5 minutes)');

// Export as a class for easier instantiation
class AdminEscalationSystem {
  constructor() {
    this.PRIORITY_LEVELS = PRIORITY_LEVELS;
    this.TRIGGER_TYPES = TRIGGER_TYPES;
    this.NOTIFICATION_CHANNELS = NOTIFICATION_CHANNELS;
  }

  analyzeEscalationTriggers = analyzeEscalationTriggers;
  createEscalation = createEscalation;
  requestManualEscalation = requestManualEscalation;
  getEscalationQueue = getEscalationQueue;
  assignEscalation = assignEscalation;
  updateEscalationStatus = updateEscalationStatus;
  recordSatisfactionFeedback = notifHandler.recordSatisfactionFeedback;
  getEscalationAnalytics = notifHandler.getEscalationAnalytics;
  updateAdminMetrics = notifHandler.updateAdminMetrics;
  checkSLABreaches = notifHandler.checkSLABreaches;
}

// Export both the class and the functions for backward compatibility
module.exports = AdminEscalationSystem;

module.exports.analyzeEscalationTriggers = analyzeEscalationTriggers;
module.exports.createEscalation = createEscalation;
module.exports.requestManualEscalation = requestManualEscalation;
module.exports.getEscalationQueue = getEscalationQueue;
module.exports.assignEscalation = assignEscalation;
module.exports.updateEscalationStatus = updateEscalationStatus;
module.exports.recordSatisfactionFeedback = notifHandler.recordSatisfactionFeedback;
module.exports.getEscalationAnalytics = notifHandler.getEscalationAnalytics;
module.exports.updateAdminMetrics = notifHandler.updateAdminMetrics;
module.exports.checkSLABreaches = notifHandler.checkSLABreaches;
module.exports.PRIORITY_LEVELS = PRIORITY_LEVELS;
module.exports.TRIGGER_TYPES = TRIGGER_TYPES;
module.exports.NOTIFICATION_CHANNELS = NOTIFICATION_CHANNELS;
