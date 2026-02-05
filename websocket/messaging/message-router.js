/**
 * Message Router
 * Routes incoming WebSocket messages to appropriate handlers
 * 
 * @module websocket/messaging/message-router
 */

const { createLogger } = require('../../utils/structured-logger');

const logger = createLogger('websocket:message-router');

/**
 * Route an incoming message to the appropriate handler
 * 
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} message - Parsed message object
 * @param {string} candidateId - Candidate ID (null for admin)
 * @param {boolean} isAdmin - Whether this is an admin connection
 * @param {Object} handlers - Handler functions for different message types
 * @returns {boolean} True if message was handled
 */
function routeMessage(ws, message, candidateId, isAdmin, handlers = {}) {
  if (!message || !message.type) {
    logger.warn('Invalid message format', { message });
    return false;
  }

  logger.debug('Routing message', {
    type: message.type,
    candidateId,
    isAdmin
  });

  try {
    switch (message.type) {
      // ==================== CHAT MESSAGES ====================
      case 'message':
        return handleChatMessage(message, candidateId, isAdmin, handlers);

      case 'typing':
        return handleTyping(message, candidateId, isAdmin, handlers);

      case 'read':
        return handleReadReceipt(message, candidateId, isAdmin, handlers);

      // ==================== STATUS UPDATES ====================
      case 'status':
        return handleStatusUpdate(message, candidateId, handlers);

      case 'get_status':
        return handleGetStatus(ws, message, isAdmin, handlers);

      // ==================== NOTIFICATIONS ====================
      case 'mark_notification_read':
        return handleMarkNotificationRead(message, candidateId, handlers);

      case 'mark_all_notifications_read':
        return handleMarkAllNotificationsRead(candidateId, handlers);

      // ==================== JOB APPLICATIONS ====================
      case 'apply_job':
        return handleJobApplication(message, candidateId, handlers);

      // ==================== CONNECTION KEEPALIVE ====================
      case 'ping':
        return handlePing(ws);

      // ==================== AI SUGGESTIONS (Admin Only) ====================
      case 'ai_suggestion_accept':
        return handleAISuggestionAccept(ws, message, isAdmin, handlers);

      case 'ai_suggestion_edit':
        return handleAISuggestionEdit(ws, message, isAdmin, handlers);

      case 'ai_suggestion_dismiss':
        return handleAISuggestionDismiss(ws, message, isAdmin, handlers);

      case 'ai_mode_update':
        return handleAIModeUpdate(ws, message, isAdmin, handlers);

      // ==================== CONVERSATION MANAGEMENT ====================
      case 'conversation_status_update':
        return handleConversationStatusUpdate(message, isAdmin, handlers);

      case 'conversation_priority_update':
        return handleConversationPriorityUpdate(message, isAdmin, handlers);

      case 'resolve_conversation':
        return handleResolveConversation(message, isAdmin, handlers);

      case 'get_quick_replies':
        return handleGetQuickReplies(ws, message, isAdmin, handlers);

      // ==================== FOMO EVENTS ====================
      case 'get_fomo_triggers':
        return handleGetFOMOTriggers(ws, message, handlers);

      // ==================== INTERVIEW SCHEDULING ====================
      case 'interview_scheduling':
        return handleInterviewScheduling(ws, message, candidateId, handlers);

      // ==================== UNKNOWN MESSAGE TYPE ====================
      default:
        logger.warn('Unknown message type', { type: message.type });
        return false;
    }
  } catch (error) {
    logger.error('Error routing message', {
      type: message.type,
      error: error.message,
      candidateId,
      isAdmin
    });
    return false;
  }
}

// ==================== MESSAGE HANDLERS ====================

function handleChatMessage(message, candidateId, isAdmin, handlers) {
  if (isAdmin) {
    if (!message.candidateId || !message.content) {
      logger.warn('Invalid admin message', { message });
      return false;
    }
    if (handlers.handleAdminMessage) {
      handlers.handleAdminMessage(message.candidateId, message.content, message.template_id);
      return true;
    }
  } else {
    if (!candidateId || !message.content) {
      logger.warn('Invalid candidate message', { message });
      return false;
    }
    if (handlers.sendMessageFromCandidate) {
      handlers.sendMessageFromCandidate(candidateId, message.content);
      return true;
    }
  }
  return false;
}

function handleTyping(message, candidateId, isAdmin, handlers) {
  if (handlers.handleTypingIndicator) {
    handlers.handleTypingIndicator(message, candidateId, isAdmin);
    return true;
  }
  return false;
}

function handleReadReceipt(message, candidateId, isAdmin, handlers) {
  if (handlers.handleReadReceiptHandler) {
    handlers.handleReadReceiptHandler(message, candidateId, isAdmin);
    return true;
  }
  return false;
}

function handleStatusUpdate(message, candidateId, handlers) {
  if (candidateId && message.status && handlers.updateCandidateStatus) {
    handlers.updateCandidateStatus(candidateId, message.status);
    return true;
  }
  return false;
}

function handleGetStatus(ws, message, isAdmin, handlers) {
  if (isAdmin && message.candidateId && handlers.sendCandidateStatus) {
    handlers.sendCandidateStatus(ws, message.candidateId);
    return true;
  }
  return false;
}

function handleMarkNotificationRead(message, candidateId, handlers) {
  if (candidateId && message.notificationId && handlers.markNotificationRead) {
    handlers.markNotificationRead(candidateId, message.notificationId);
    return true;
  }
  return false;
}

function handleMarkAllNotificationsRead(candidateId, handlers) {
  if (candidateId && handlers.markAllNotificationsRead) {
    handlers.markAllNotificationsRead(candidateId);
    return true;
  }
  return false;
}

function handleJobApplication(message, candidateId, handlers) {
  if (candidateId && message.jobId && handlers.handleJobApplicationHandler) {
    handlers.handleJobApplicationHandler(candidateId, message.jobId);
    return true;
  }
  return false;
}

function handlePing(ws) {
  try {
    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
    return true;
  } catch (error) {
    logger.error('Failed to send pong', { error: error.message });
    return false;
  }
}

function handleAISuggestionAccept(ws, message, isAdmin, handlers) {
  if (isAdmin && message.suggestionId && message.candidateId && handlers.handleAISuggestionAcceptHandler) {
    handlers.handleAISuggestionAcceptHandler(message.suggestionId, message.candidateId, ws);
    return true;
  }
  return false;
}

function handleAISuggestionEdit(ws, message, isAdmin, handlers) {
  if (isAdmin && message.suggestionId && message.candidateId && message.content && handlers.handleAISuggestionEditHandler) {
    handlers.handleAISuggestionEditHandler(message.suggestionId, message.candidateId, message.content, ws);
    return true;
  }
  return false;
}

function handleAISuggestionDismiss(ws, message, isAdmin, handlers) {
  if (isAdmin && message.suggestionId && handlers.handleAISuggestionDismissHandler) {
    handlers.handleAISuggestionDismissHandler(message.suggestionId, ws);
    return true;
  }
  return false;
}

function handleAIModeUpdate(ws, message, isAdmin, handlers) {
  if (isAdmin && message.candidateId && message.mode && handlers.handleAIModeUpdateHandler) {
    handlers.handleAIModeUpdateHandler(message.candidateId, message.mode, ws);
    return true;
  }
  return false;
}

function handleConversationStatusUpdate(message, isAdmin, handlers) {
  if (isAdmin && message.candidateId && message.status && handlers.handleConversationStatusUpdateHandler) {
    handlers.handleConversationStatusUpdateHandler(message.candidateId, message.status);
    return true;
  }
  return false;
}

function handleConversationPriorityUpdate(message, isAdmin, handlers) {
  if (isAdmin && message.candidateId && message.priority && handlers.handleConversationPriorityUpdateHandler) {
    handlers.handleConversationPriorityUpdateHandler(message.candidateId, message.priority);
    return true;
  }
  return false;
}

function handleResolveConversation(message, isAdmin, handlers) {
  if (isAdmin && message.candidateId && handlers.handleResolveConversationHandler) {
    handlers.handleResolveConversationHandler(message.candidateId);
    return true;
  }
  return false;
}

function handleGetQuickReplies(ws, message, isAdmin, handlers) {
  if (isAdmin && message.candidateId && handlers.handleGetQuickRepliesHandler) {
    handlers.handleGetQuickRepliesHandler(message.candidateId, ws);
    return true;
  }
  return false;
}

function handleGetFOMOTriggers(ws, message, handlers) {
  if (message.candidateId && handlers.handleGetFOMOTriggersHandler) {
    handlers.handleGetFOMOTriggersHandler(message.candidateId, ws);
    return true;
  }
  return false;
}

function handleInterviewScheduling(ws, message, candidateId, handlers) {
  if (candidateId && message.content && handlers.handleInterviewSchedulingHandler) {
    handlers.handleInterviewSchedulingHandler(ws, message, candidateId);
    return true;
  }
  return false;
}

module.exports = {
  routeMessage
};
