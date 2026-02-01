/**
 * Smart Notifications Service
 *
 * Handles intelligent notification batching and prioritization
 * for the WorkLink platform. Provides urgency analysis,
 * notification queueing, and batched delivery to reduce
 * notification fatigue while ensuring urgent messages are
 * delivered immediately.
 */

const logger = require('../utils/logger');
const conversationManager = require('./conversation-manager');

// Urgent keywords that trigger immediate notifications
const URGENT_KEYWORDS = [
  'urgent',
  'emergency',
  'asap',
  'help',
  'problem',
  'issue',
  'cancel',
  'refund',
  'complaint',
  'angry',
  'immediately'
];

// Batching configuration
const BATCH_FLUSH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const BATCH_MAX_SIZE = 10;

// In-memory notification queue
// Structure: Map<candidateId, Array<{ candidateId, message, timestamp, workerName }>>
const notificationQueue = new Map();

// Track first messages to identify new conversations
const seenCandidates = new Set();

// Flush interval reference for cleanup
let flushIntervalId = null;

/**
 * Analyze message content for urgency indicators
 *
 * @param {string} message - The message content to analyze
 * @returns {{ isUrgent: boolean, keywords: string[], score: number }}
 *   - isUrgent: Whether the message is considered urgent
 *   - keywords: Array of urgent keywords found in the message
 *   - score: Urgency score from 0 to 1
 */
function analyzeMessageUrgency(message) {
  if (!message || typeof message !== 'string') {
    logger.warn('[SmartNotifications] analyzeMessageUrgency called with invalid message');
    return {
      isUrgent: false,
      keywords: [],
      score: 0
    };
  }

  const lowerMessage = message.toLowerCase();
  const foundKeywords = [];

  // Check for urgent keywords
  for (const keyword of URGENT_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  }

  // Calculate urgency score based on:
  // - Number of keywords found (weighted)
  // - Presence of multiple exclamation marks
  // - All caps words
  let score = 0;

  // Keyword contribution (up to 0.6)
  const keywordScore = Math.min(foundKeywords.length * 0.2, 0.6);
  score += keywordScore;

  // Exclamation marks contribution (up to 0.2)
  const exclamationCount = (message.match(/!/g) || []).length;
  const exclamationScore = Math.min(exclamationCount * 0.05, 0.2);
  score += exclamationScore;

  // All caps words contribution (up to 0.2)
  const words = message.split(/\s+/);
  const capsWords = words.filter(word =>
    word.length > 2 && word === word.toUpperCase() && /[A-Z]/.test(word)
  );
  const capsScore = Math.min(capsWords.length * 0.05, 0.2);
  score += capsScore;

  // Normalize score to 0-1 range
  score = Math.min(score, 1);

  const isUrgent = foundKeywords.length > 0 || score >= 0.5;

  logger.debug(`[SmartNotifications] Message urgency analysis: score=${score.toFixed(2)}, keywords=${foundKeywords.join(', ')}`);

  return {
    isUrgent,
    keywords: foundKeywords,
    score: parseFloat(score.toFixed(2))
  };
}

/**
 * Determine if a notification should be sent immediately
 * based on multiple factors
 *
 * @param {string} candidateId - The candidate/worker ID
 * @param {string} message - The message content
 * @returns {boolean} Whether to notify immediately
 */
function shouldNotifyImmediately(candidateId, message) {
  if (!candidateId) {
    logger.warn('[SmartNotifications] shouldNotifyImmediately called without candidateId');
    return false;
  }

  try {
    // Check 1: Message contains urgent keywords
    const urgencyAnalysis = analyzeMessageUrgency(message);
    if (urgencyAnalysis.isUrgent) {
      logger.info(`[SmartNotifications] Immediate notification: urgent keywords detected for ${candidateId}`);
      return true;
    }

    // Check 2: Conversation is escalated
    const metadata = conversationManager.getConversationMetadata(candidateId);
    if (metadata && metadata.escalated === 1) {
      logger.info(`[SmartNotifications] Immediate notification: conversation escalated for ${candidateId}`);
      return true;
    }

    // Check 3: Conversation priority is 'urgent' or 'high'
    if (metadata && (metadata.priority === 'urgent' || metadata.priority === 'high')) {
      logger.info(`[SmartNotifications] Immediate notification: ${metadata.priority} priority for ${candidateId}`);
      return true;
    }

    // Check 4: First message from candidate (new conversation)
    if (!seenCandidates.has(candidateId)) {
      seenCandidates.add(candidateId);
      logger.info(`[SmartNotifications] Immediate notification: first message from ${candidateId}`);
      return true;
    }

    return false;
  } catch (error) {
    logger.error(`[SmartNotifications] Error in shouldNotifyImmediately: ${error.message}`);
    // Default to immediate notification on error to avoid missing important messages
    return true;
  }
}

/**
 * Add a notification to the batch queue
 *
 * @param {string} candidateId - The candidate/worker ID
 * @param {string} message - The message content
 * @param {object} options - Additional options
 * @param {string} options.workerName - Name of the worker (for summary)
 * @returns {{ queued: boolean, queueSize: number, willFlushAt: Date | null }}
 */
function queueNotification(candidateId, message, options = {}) {
  if (!candidateId || !message) {
    logger.warn('[SmartNotifications] queueNotification called with missing parameters');
    return {
      queued: false,
      queueSize: 0,
      willFlushAt: null
    };
  }

  const { workerName = 'Unknown Worker' } = options;

  const notification = {
    candidateId,
    message,
    workerName,
    timestamp: new Date(),
    id: `${candidateId}-${Date.now()}`
  };

  // Get or create queue for this admin/system
  // Using 'admin' as the key since notifications are batched for admin consumption
  if (!notificationQueue.has('admin')) {
    notificationQueue.set('admin', []);
  }

  const queue = notificationQueue.get('admin');
  queue.push(notification);

  logger.info(`[SmartNotifications] Notification queued for ${candidateId}, queue size: ${queue.length}`);

  // Check if we should auto-flush due to queue size
  if (queue.length >= BATCH_MAX_SIZE) {
    logger.info('[SmartNotifications] Queue reached max size, triggering flush');
    flushNotificationQueue();
    return {
      queued: true,
      queueSize: 0,
      willFlushAt: null,
      flushed: true
    };
  }

  // Calculate when the next flush will occur
  const willFlushAt = new Date(Date.now() + BATCH_FLUSH_INTERVAL_MS);

  return {
    queued: true,
    queueSize: queue.length,
    willFlushAt
  };
}

/**
 * Flush the notification queue and send batched notifications
 *
 * @returns {{ sent: boolean, count: number, summary: string | null }}
 */
function flushNotificationQueue() {
  const queue = notificationQueue.get('admin') || [];

  if (queue.length === 0) {
    logger.debug('[SmartNotifications] Flush called but queue is empty');
    return {
      sent: false,
      count: 0,
      summary: null
    };
  }

  try {
    // Create summary of notifications
    const summary = createNotificationSummary(queue);

    // Log the batch being sent
    logger.info(`[SmartNotifications] Flushing ${queue.length} notifications: ${summary}`);

    // Clear the queue
    const notifications = [...queue];
    notificationQueue.set('admin', []);

    // Here you would integrate with the actual notification sending mechanism
    // For now, we emit an event that other services can listen to
    const result = {
      sent: true,
      count: notifications.length,
      summary,
      notifications
    };

    // Broadcast to admins via websocket (lazy load to avoid circular dependency)
    try {
      const { broadcastToAdmins } = require('../websocket');
      broadcastToAdmins({
        type: 'notification_batch',
        summary,
        count: notifications.length,
        notifications: notifications.map(n => ({
          candidateId: n.candidateId,
          workerName: n.workerName,
          preview: n.message.substring(0, 100),
          timestamp: n.timestamp
        })),
        timestamp: new Date().toISOString()
      });
    } catch (wsError) {
      logger.warn(`[SmartNotifications] Could not broadcast to admins: ${wsError.message}`);
    }

    return result;
  } catch (error) {
    logger.error(`[SmartNotifications] Error flushing notification queue: ${error.message}`);
    return {
      sent: false,
      count: 0,
      summary: null,
      error: error.message
    };
  }
}

/**
 * Get all pending notifications in the queue
 *
 * @returns {Array<{ candidateId: string, message: string, workerName: string, timestamp: Date, id: string }>}
 */
function getQueuedNotifications() {
  const queue = notificationQueue.get('admin') || [];
  return [...queue]; // Return a copy to prevent external modification
}

/**
 * Create a human-readable summary of batched notifications
 *
 * @param {Array<{ candidateId: string, workerName: string }>} notifications - Array of notification objects
 * @returns {string} Summary text like "3 new messages from 2 workers"
 */
function createNotificationSummary(notifications) {
  if (!notifications || notifications.length === 0) {
    return 'No new messages';
  }

  const messageCount = notifications.length;
  const uniqueWorkers = new Set(notifications.map(n => n.candidateId));
  const workerCount = uniqueWorkers.size;

  // Get worker names for detailed summary
  const workerNames = [...new Set(notifications.map(n => n.workerName))];

  if (messageCount === 1) {
    return `1 new message from ${workerNames[0] || 'a worker'}`;
  }

  if (workerCount === 1) {
    return `${messageCount} new messages from ${workerNames[0] || 'a worker'}`;
  }

  if (workerCount <= 3) {
    return `${messageCount} new messages from ${workerNames.join(', ')}`;
  }

  return `${messageCount} new messages from ${workerCount} workers`;
}

/**
 * Start the automatic flush interval
 * Should be called when the service initializes
 */
function startAutoFlush() {
  if (flushIntervalId) {
    logger.warn('[SmartNotifications] Auto flush already running');
    return;
  }

  flushIntervalId = setInterval(() => {
    const queue = notificationQueue.get('admin') || [];
    if (queue.length > 0) {
      logger.info('[SmartNotifications] Auto-flush triggered by interval');
      flushNotificationQueue();
    }
  }, BATCH_FLUSH_INTERVAL_MS);

  logger.info(`[SmartNotifications] Auto-flush started (every ${BATCH_FLUSH_INTERVAL_MS / 1000 / 60} minutes)`);
}

/**
 * Stop the automatic flush interval
 * Should be called during graceful shutdown
 */
function stopAutoFlush() {
  if (flushIntervalId) {
    clearInterval(flushIntervalId);
    flushIntervalId = null;
    logger.info('[SmartNotifications] Auto-flush stopped');
  }
}

/**
 * Process an incoming message and determine notification strategy
 * This is the main entry point for the notification system
 *
 * @param {string} candidateId - The candidate/worker ID
 * @param {string} message - The message content
 * @param {object} options - Additional options
 * @param {string} options.workerName - Name of the worker
 * @param {function} options.onImmediate - Callback for immediate notifications
 * @returns {{ immediate: boolean, queued: boolean, urgency: object }}
 */
function processMessage(candidateId, message, options = {}) {
  const { workerName = 'Unknown Worker', onImmediate = null } = options;

  // Analyze message urgency
  const urgency = analyzeMessageUrgency(message);

  // Determine if immediate notification is needed
  const shouldSendNow = shouldNotifyImmediately(candidateId, message);

  if (shouldSendNow) {
    logger.info(`[SmartNotifications] Sending immediate notification for ${candidateId}`);

    // Trigger immediate notification callback if provided
    if (typeof onImmediate === 'function') {
      try {
        onImmediate({
          candidateId,
          message,
          workerName,
          urgency,
          timestamp: new Date()
        });
      } catch (callbackError) {
        logger.error(`[SmartNotifications] Immediate callback error: ${callbackError.message}`);
      }
    }

    // Also broadcast immediately via websocket
    try {
      const { broadcastToAdmins } = require('../websocket');
      broadcastToAdmins({
        type: 'urgent_notification',
        candidateId,
        workerName,
        preview: message.substring(0, 200),
        urgency,
        timestamp: new Date().toISOString()
      });
    } catch (wsError) {
      logger.warn(`[SmartNotifications] Could not broadcast urgent notification: ${wsError.message}`);
    }

    return {
      immediate: true,
      queued: false,
      urgency
    };
  }

  // Queue for batched delivery
  const queueResult = queueNotification(candidateId, message, { workerName });

  return {
    immediate: false,
    queued: queueResult.queued,
    queueSize: queueResult.queueSize,
    willFlushAt: queueResult.willFlushAt,
    urgency
  };
}

/**
 * Clear a specific candidate from the seen candidates set
 * Useful for testing or when a conversation is resolved
 *
 * @param {string} candidateId - The candidate ID to clear
 */
function clearSeenCandidate(candidateId) {
  seenCandidates.delete(candidateId);
  logger.debug(`[SmartNotifications] Cleared seen status for ${candidateId}`);
}

/**
 * Get current queue statistics
 *
 * @returns {{ queueSize: number, oldestTimestamp: Date | null, uniqueWorkers: number }}
 */
function getQueueStats() {
  const queue = notificationQueue.get('admin') || [];

  return {
    queueSize: queue.length,
    oldestTimestamp: queue.length > 0 ? queue[0].timestamp : null,
    uniqueWorkers: new Set(queue.map(n => n.candidateId)).size,
    seenCandidatesCount: seenCandidates.size
  };
}

// Auto-start the flush interval when module loads
startAutoFlush();

// Handle process termination gracefully (skip in development for fast Ctrl+C)
const isDev = process.env.NODE_ENV !== 'production';

process.on('SIGTERM', () => {
  logger.info('[SmartNotifications] SIGTERM received, flushing queue before shutdown');
  flushNotificationQueue();
  stopAutoFlush();
});

process.on('SIGINT', () => {
  if (isDev) {
    // In development, exit immediately without graceful shutdown
    stopAutoFlush();
    process.exit(0);
  }
  logger.info('[SmartNotifications] SIGINT received, flushing queue before shutdown');
  flushNotificationQueue();
  stopAutoFlush();
});

module.exports = {
  // Constants
  URGENT_KEYWORDS,
  BATCH_FLUSH_INTERVAL_MS,
  BATCH_MAX_SIZE,

  // Core functions
  analyzeMessageUrgency,
  shouldNotifyImmediately,
  queueNotification,
  flushNotificationQueue,
  getQueuedNotifications,
  createNotificationSummary,

  // Main entry point
  processMessage,

  // Lifecycle management
  startAutoFlush,
  stopAutoFlush,

  // Utility functions
  clearSeenCandidate,
  getQueueStats
};
