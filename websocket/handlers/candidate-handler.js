/**
 * Candidate Message Handler
 * Handles messages sent by candidates
 */

const WebSocket = require('ws');
const { db } = require('../../db');
const { candidateClients } = require('../clients');
const { broadcastToAdmins } = require('../broadcast');
const { createLogger } = require('../../utils/structured-logger');
const { getConversationManager, getSmartNotifications } = require('../utils/lazy-loaders');

const logger = createLogger('websocket:candidate-handler');

/**
 * Process message from candidate
 * @param {number} candidateId - The candidate's ID
 * @param {string} content - Message content
 * @param {string} channel - Message channel (app, whatsapp, telegram)
 * @param {Function} aiProcessorCallback - Callback to trigger AI processing
 */
async function sendMessageFromCandidate(candidateId, content, channel = 'app', aiProcessorCallback = null) {
  console.log(`📨 Candidate ${candidateId} sent message: "${content.substring(0, 50)}..."`);
  const id = Date.now();
  const timestamp = new Date().toISOString();
  
  // Save message to database
  db.prepare(`
    INSERT INTO messages (id, candidate_id, sender, content, channel, read, created_at)
    VALUES (?, ?, 'candidate', ?, ?, 0, ?)
  `).run(id, candidateId, content, channel, timestamp);

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);

  // Update conversation metadata
  const convManager = getConversationManager();
  if (convManager) {
    try {
      convManager.recordCandidateMessage(candidateId);
      // Ensure conversation is open when candidate sends message
      const meta = convManager.getConversationMetadata(candidateId);
      if (meta.status === 'resolved') {
        convManager.updateStatus(candidateId, 'open');
      }
    } catch (e) {
      console.log('Conv manager error:', e.message);
    }
  }

  // Smart notifications - check if urgent
  const smartNotif = getSmartNotifications();
  let isUrgent = false;
  if (smartNotif) {
    try {
      const shouldNotifyNow = smartNotif.shouldNotifyImmediately(candidateId, content);
      isUrgent = shouldNotifyNow;

      if (shouldNotifyNow) {
        // Immediate notification to admins
        broadcastToAdmins({
          type: 'urgent_message',
          message,
          candidateId,
          channel,
          urgency: smartNotif.analyzeMessageUrgency(content)
        });
      } else {
        // Queue for batched notification
        smartNotif.queueNotification(candidateId, content);
      }
    } catch (e) {
      console.log('Smart notif error:', e.message);
    }
  }

  // Check for auto-escalation
  if (convManager) {
    try {
      const escalationCheck = convManager.checkForEscalation(candidateId, content, 1.0);
      if (escalationCheck.shouldEscalate) {
        convManager.escalate(candidateId, escalationCheck.reason);
        broadcastToAdmins({
          type: 'conversation_escalated',
          candidateId,
          reason: escalationCheck.reason
        });
      }
    } catch (e) {
      console.log('Escalation check error:', e.message);
    }
  }

  // Notify all admins (regular notification)
  logger.info(`🔔 [MESSAGE] Notifying admins of new message from candidate ${candidateId}`, {
    candidateId,
    messageId: message.id,
    content: content.substring(0, 50) + '...',
    channel,
    isUrgent
  });
  broadcastToAdmins({ type: 'new_message', message, candidateId, channel, isUrgent });

  // Confirm to candidate (only for app channel)
  if (channel === 'app') {
    const clientWs = candidateClients.get(candidateId);
    if (clientWs?.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'message_sent', message }));
    }
  }

  // Process implicit feedback from previous AI responses (non-blocking)
  try {
    const ml = require('../../services/ml');
    ml.processImplicitFeedback(candidateId, content).catch(err => {
      console.error('Implicit feedback processing error:', err.message);
    });
  } catch (error) {
    // ML service not loaded, skip
  }

  // Trigger AI processing if callback provided
  if (aiProcessorCallback) {
    console.log(`🤖 [WS] Triggering AI processing for candidate ${candidateId}`);
    aiProcessorCallback(candidateId, content, channel).catch(error => {
      console.error(`🤖 [WS] AI processing failed for candidate ${candidateId}:`, error.message);
    });
  }

  return message;
}

module.exports = {
  sendMessageFromCandidate
};
