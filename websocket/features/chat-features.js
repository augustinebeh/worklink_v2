/**
 * Chat Features
 * Handles chat-related features like history, typing indicators, and read receipts
 * 
 * @module websocket/features/chat-features
 */

const { db } = require('../../db');
const { EventTypes } = require('../config/event-types');
const { createLogger } = require('../../utils/structured-logger');
const clientStore = require('../utils/client-store');
const broadcast = require('../broadcasting/broadcast-service');

const logger = createLogger('websocket:chat-features');

/**
 * Send chat history to a newly connected client
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} candidateId - Candidate ID
 */
function sendChatHistory(ws, candidateId) {
  try {
    // Get last 100 messages for this candidate
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE candidate_id = ? 
      ORDER BY created_at ASC 
      LIMIT 100
    `).all(candidateId);

    // Get unread count
    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM messages 
      WHERE candidate_id = ? 
        AND sender = 'admin' 
        AND read = 0
    `).get(candidateId).count;

    ws.send(JSON.stringify({
      type: 'chat_history',
      messages,
      unreadCount
    }));

    logger.info('Chat history sent', {
      candidateId,
      messageCount: messages.length,
      unreadCount
    });
  } catch (error) {
    logger.error('Failed to send chat history', {
      candidateId,
      error: error.message
    });
  }
}

/**
 * Handle typing indicator updates
 * @param {Object} message - Message containing typing state
 * @param {string} candidateId - Candidate ID (null for admin)
 * @param {boolean} isAdmin - Whether sender is admin
 */
function handleTypingIndicator(message, candidateId, isAdmin) {
  try {
    if (isAdmin && message.candidateId) {
      // Admin is typing - notify the candidate
      const clientWs = clientStore.getCandidateClient(message.candidateId);
      if (clientWs?.readyState === 1) { // OPEN
        clientWs.send(JSON.stringify({
          type: EventTypes.CHAT_TYPING,
          typing: message.typing
        }));
      }
      logger.debug('Admin typing indicator sent', {
        candidateId: message.candidateId,
        typing: message.typing
      });
    } else if (candidateId) {
      // Candidate is typing - notify all admins
      broadcast.broadcastToAdmins({
        type: EventTypes.CHAT_TYPING,
        candidateId,
        typing: message.typing
      });
      logger.debug('Candidate typing indicator sent', {
        candidateId,
        typing: message.typing
      });
    }
  } catch (error) {
    logger.error('Failed to handle typing indicator', {
      candidateId,
      isAdmin,
      error: error.message
    });
  }
}

/**
 * Handle read receipts - mark messages as read
 * @param {Object} message - Message object
 * @param {string} candidateId - Candidate ID (null for admin)
 * @param {boolean} isAdmin - Whether reader is admin
 */
function handleReadReceipt(message, candidateId, isAdmin) {
  const readAt = new Date().toISOString();

  try {
    if (isAdmin && message.candidateId) {
      // Admin reading candidate messages
      const result = db.prepare(`
        UPDATE messages 
        SET read = 1, read_at = ? 
        WHERE candidate_id = ? 
          AND sender = 'candidate' 
          AND read = 0
      `).run(readAt, message.candidateId);

      logger.info('Admin read candidate messages', {
        candidateId: message.candidateId,
        messagesRead: result.changes,
        readAt
      });

      // Notify candidate
      const clientWs = clientStore.getCandidateClient(message.candidateId);
      if (clientWs?.readyState === 1) { // OPEN
        clientWs.send(JSON.stringify({
          type: EventTypes.CHAT_READ,
          by: 'admin',
          readAt
        }));
      }

      // Record admin activity in conversation manager
      recordAdminActivity(message.candidateId);

    } else if (candidateId) {
      // Candidate reading admin messages
      const result = db.prepare(`
        UPDATE messages 
        SET read = 1, read_at = ? 
        WHERE candidate_id = ? 
          AND sender = 'admin' 
          AND read = 0
      `).run(readAt, candidateId);

      logger.info('Candidate read admin messages', {
        candidateId,
        messagesRead: result.changes,
        readAt
      });

      // Notify admins
      broadcast.broadcastToAdmins({
        type: EventTypes.CHAT_READ,
        candidateId,
        by: 'candidate',
        readAt
      });
    }
  } catch (error) {
    logger.error('Failed to handle read receipt', {
      candidateId,
      isAdmin,
      error: error.message
    });
  }
}

/**
 * Record admin activity in conversation manager
 * @private
 * @param {string} candidateId - Candidate ID
 */
function recordAdminActivity(candidateId) {
  try {
    const { getConversationManager } = require('../utils/lazy-loaders');
    const convManager = getConversationManager();
    
    if (convManager && convManager.recordAdminReply) {
      convManager.recordAdminReply(candidateId);
      logger.debug('Admin activity recorded', { candidateId });
    }
  } catch (error) {
    logger.warn('Failed to record admin activity', {
      candidateId,
      error: error.message
    });
  }
}

/**
 * Get unread message count for a candidate
 * @param {string} candidateId - Candidate ID
 * @returns {number} Unread count
 */
function getUnreadCount(candidateId) {
  try {
    const result = db.prepare(`
      SELECT COUNT(*) as count 
      FROM messages 
      WHERE candidate_id = ? 
        AND sender = 'admin' 
        AND read = 0
    `).get(candidateId);
    
    return result.count || 0;
  } catch (error) {
    logger.error('Failed to get unread count', {
      candidateId,
      error: error.message
    });
    return 0;
  }
}

/**
 * Mark all messages as read for a candidate
 * @param {string} candidateId - Candidate ID
 * @param {string} sender - Who is marking as read ('admin' or 'candidate')
 * @returns {number} Number of messages marked as read
 */
function markAllAsRead(candidateId, sender) {
  try {
    const readAt = new Date().toISOString();
    const otherSender = sender === 'admin' ? 'candidate' : 'admin';
    
    const result = db.prepare(`
      UPDATE messages 
      SET read = 1, read_at = ? 
      WHERE candidate_id = ? 
        AND sender = ? 
        AND read = 0
    `).run(readAt, candidateId, otherSender);

    logger.info('Marked all messages as read', {
      candidateId,
      sender,
      messagesRead: result.changes
    });

    return result.changes;
  } catch (error) {
    logger.error('Failed to mark all as read', {
      candidateId,
      sender,
      error: error.message
    });
    return 0;
  }
}

module.exports = {
  sendChatHistory,
  handleTypingIndicator,
  handleReadReceipt,
  getUnreadCount,
  markAllAsRead
};
