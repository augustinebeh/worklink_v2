/**
 * WebSocket Integration Helper for Chat
 * Handles real-time message broadcasting and notifications
 * @module chat/helpers/websocket-integration
 */

const logger = require('../../../../../utils/logger');

let websocketModule = null;

/**
 * Lazy load websocket module to avoid circular dependencies
 */
function getWebSocket() {
  if (!websocketModule) {
    try {
      websocketModule = require('../../../../../websocket');
    } catch (error) {
      logger.warn('WebSocket module not available', { error: error.message });
      return null;
    }
  }
  return websocketModule;
}

/**
 * Broadcast message to a specific candidate
 * @param {string} candidateId - Candidate ID to send to
 * @param {Object} messageData - Message data to broadcast
 * @returns {boolean} Success status
 */
async function broadcastToCandidate(candidateId, messageData) {
  try {
    const websocket = getWebSocket();
    if (!websocket || !websocket.broadcastToCandidate) {
      logger.warn('WebSocket broadcast not available');
      return false;
    }

    await websocket.broadcastToCandidate(candidateId, {
      type: 'chat_message',
      data: messageData,
      timestamp: new Date().toISOString()
    });

    return true;
  } catch (error) {
    logger.error('Failed to broadcast to candidate', {
      candidateId,
      error: error.message
    });
    return false;
  }
}

/**
 * Broadcast message to all admin users
 * @param {Object} messageData - Message data to broadcast
 * @returns {boolean} Success status
 */
async function broadcastToAdmins(messageData) {
  try {
    const websocket = getWebSocket();
    if (!websocket || !websocket.broadcastToAdmins) {
      logger.warn('WebSocket broadcast not available');
      return false;
    }

    await websocket.broadcastToAdmins({
      type: 'chat_message',
      data: messageData,
      timestamp: new Date().toISOString()
    });

    return true;
  } catch (error) {
    logger.error('Failed to broadcast to admins', {
      error: error.message
    });
    return false;
  }
}

/**
 * Broadcast typing indicator
 * @param {string} candidateId - Candidate ID
 * @param {string} sender - Sender type ('admin' or 'candidate')
 * @param {boolean} isTyping - Whether user is typing
 * @returns {boolean} Success status
 */
async function broadcastTypingIndicator(candidateId, sender, isTyping) {
  try {
    const websocket = getWebSocket();
    if (!websocket) {
      return false;
    }

    const typingData = {
      type: 'typing',
      candidateId,
      sender,
      isTyping,
      timestamp: new Date().toISOString()
    };

    if (sender === 'admin') {
      await websocket.broadcastToCandidate(candidateId, typingData);
    } else {
      await websocket.broadcastToAdmins(typingData);
    }

    return true;
  } catch (error) {
    logger.error('Failed to broadcast typing indicator', {
      candidateId,
      sender,
      error: error.message
    });
    return false;
  }
}

/**
 * Broadcast message read receipt
 * @param {string} candidateId - Candidate ID
 * @param {string} messageId - Message ID that was read
 * @param {string} reader - Who read the message ('admin' or 'candidate')
 * @returns {boolean} Success status
 */
async function broadcastReadReceipt(candidateId, messageId, reader) {
  try {
    const websocket = getWebSocket();
    if (!websocket) {
      return false;
    }

    const readData = {
      type: 'message_read',
      candidateId,
      messageId,
      reader,
      timestamp: new Date().toISOString()
    };

    if (reader === 'admin') {
      await websocket.broadcastToCandidate(candidateId, readData);
    } else {
      await websocket.broadcastToAdmins(readData);
    }

    return true;
  } catch (error) {
    logger.error('Failed to broadcast read receipt', {
      candidateId,
      messageId,
      error: error.message
    });
    return false;
  }
}

/**
 * Broadcast conversation status update
 * @param {string} candidateId - Candidate ID
 * @param {Object} statusUpdate - Status update data
 * @returns {boolean} Success status
 */
async function broadcastConversationStatus(candidateId, statusUpdate) {
  try {
    const websocket = getWebSocket();
    if (!websocket) {
      return false;
    }

    await websocket.broadcastToAdmins({
      type: 'conversation_status',
      candidateId,
      data: statusUpdate,
      timestamp: new Date().toISOString()
    });

    return true;
  } catch (error) {
    logger.error('Failed to broadcast conversation status', {
      candidateId,
      error: error.message
    });
    return false;
  }
}

/**
 * Check if a candidate is currently online
 * @param {string} candidateId - Candidate ID to check
 * @returns {Promise<boolean>} Online status
 */
async function isCandidateOnline(candidateId) {
  try {
    const websocket = getWebSocket();
    if (!websocket || !websocket.isCandidateOnline) {
      return false;
    }

    return await websocket.isCandidateOnline(candidateId);
  } catch (error) {
    logger.error('Failed to check candidate online status', {
      candidateId,
      error: error.message
    });
    return false;
  }
}

/**
 * Get list of online candidates
 * @returns {Promise<Array<string>>} Array of online candidate IDs
 */
async function getOnlineCandidates() {
  try {
    const websocket = getWebSocket();
    if (!websocket || !websocket.getOnlineCandidates) {
      return [];
    }

    return await websocket.getOnlineCandidates();
  } catch (error) {
    logger.error('Failed to get online candidates', {
      error: error.message
    });
    return [];
  }
}

/**
 * Send notification to candidate
 * @param {string} candidateId - Candidate ID
 * @param {Object} notification - Notification data
 * @returns {boolean} Success status
 */
async function sendNotification(candidateId, notification) {
  try {
    const websocket = getWebSocket();
    if (!websocket) {
      return false;
    }

    await websocket.broadcastToCandidate(candidateId, {
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString()
    });

    return true;
  } catch (error) {
    logger.error('Failed to send notification', {
      candidateId,
      error: error.message
    });
    return false;
  }
}

module.exports = {
  broadcastToCandidate,
  broadcastToAdmins,
  broadcastTypingIndicator,
  broadcastReadReceipt,
  broadcastConversationStatus,
  isCandidateOnline,
  getOnlineCandidates,
  sendNotification
};