/**
 * WebSocket Module - Main Entry Point
 * Handles real-time communication between admin portal and worker PWA
 * 
 * @module websocket
 */

const WebSocket = require('ws');
const { createLogger } = require('../utils/structured-logger');
const intervalRegistry = require('../utils/interval-registry');

// Import configuration
const { EventTypes } = require('./config/event-types');
const { WS_SERVER_CONFIG } = require('./config/constants');

// Import utilities
const clientStore = require('./utils/client-store');
const { getMessaging, getConversationManager } = require('./utils/lazy-loaders');

// Import connection handling
const validator = require('./connection/validator');
const tracker = require('./connection/tracker');
const adminHandler = require('./connection/admin-handler');
const candidateHandler = require('./connection/candidate-handler');

// Import messaging
const messageRouter = require('./messaging/message-router');

// Import broadcasting
const broadcast = require('./broadcasting/broadcast-service');
const eventNotifiers = require('./broadcasting/event-notifiers');

// Import features
const chatFeatures = require('./features/chat-features');
const statusNotifications = require('./features/status-notifications');

const logger = createLogger('websocket');

/**
 * Set up WebSocket server
 * @param {http.Server} server - HTTP server instance
 * @returns {WebSocket.Server} WebSocket server instance
 */
function setupWebSocket(server) {
  const wss = new WebSocket.Server({
    server,
    ...WS_SERVER_CONFIG
  });

  logger.info('WebSocket server initialized', {
    path: WS_SERVER_CONFIG.path,
    maxPayload: WS_SERVER_CONFIG.maxPayload
  });

  wss.on('connection', (ws, req) => {
    handleConnection(ws, req);
  });

  // Set up periodic cleanup
  setupPeriodicCleanup(wss);

  return wss;
}

/**
 * Handle new WebSocket connection
 * @private
 * @param {WebSocket} ws - WebSocket connection
 * @param {http.IncomingMessage} req - HTTP request
 */
function handleConnection(ws, req) {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const candidateId = url.searchParams.get('candidateId');
  const isAdmin = url.searchParams.get('admin') === 'true';
  const token = url.searchParams.get('token');

  logger.info('WebSocket connection attempt', {
    ip: clientIp,
    isAdmin,
    candidateId,
    hasToken: !!token
  });

  // Rate limiting check
  if (tracker.isRateLimitingEnabled() && tracker.isConnectionRateLimited(clientIp)) {
    logger.warn('Connection rate limit exceeded', { ip: clientIp });
    ws.close(4008, 'Rate limit exceeded');
    return;
  }

  // Track connection
  tracker.trackConnection(clientIp);

  // Validate authentication
  const authResult = validator.validateConnection(token, candidateId, isAdmin);
  if (!authResult.valid) {
    logger.security('websocket_auth_failed', {
      ip: clientIp,
      candidateId,
      isAdmin,
      error: authResult.error
    });
    ws.close(4001, authResult.error || 'Authentication failed');
    return;
  }

  logger.auth('websocket_auth_success', authResult.candidateId || 'admin', {
    role: authResult.role,
    ip: clientIp
  });

  // Generate unique connection ID
  const connectionId = tracker.generateConnectionId(clientIp, authResult.role, authResult.candidateId);

  // Set up connection based on role
  if (isAdmin) {
    setupAdminConnection(ws, clientIp, connectionId);
  } else if (candidateId) {
    setupCandidateConnection(ws, candidateId, clientIp, connectionId);
  } else {
    ws.close(4000, 'Missing candidateId or admin parameter');
    return;
  }

  // Handle incoming messages
  setupMessageHandler(ws, candidateId, isAdmin, clientIp, connectionId);
}

/**
 * Set up admin connection
 * @private
 */
function setupAdminConnection(ws, ip, connectionId) {
  adminHandler.handleAdminConnection(ws, { ip, connectionId });
}

/**
 * Set up candidate connection
 * @private
 */
function setupCandidateConnection(ws, candidateId, ip, connectionId) {
  candidateHandler.handleCandidateConnection(ws, candidateId, {
    ip,
    connectionId,
    updateStatus: statusNotifications.updateCandidateStatus,
    sendHistory: chatFeatures.sendChatHistory,
    sendNotifications: statusNotifications.sendUnreadNotifications,
    broadcastToAdmins: broadcast.broadcastToAdmins
  });
}

/**
 * Set up message handler for WebSocket connection
 * @private
 */
function setupMessageHandler(ws, candidateId, isAdmin, clientIp, connectionId) {
  ws.on('message', (data) => {
    try {
      // Message rate limiting
      if (tracker.isRateLimitingEnabled() && tracker.isMessageRateLimited(connectionId)) {
        logger.warn('Message rate limit exceeded', { connectionId, candidateId, isAdmin });
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Rate limit exceeded. Please slow down.'
        }));
        return;
      }

      // Track message
      tracker.trackMessage(connectionId);

      // Parse message
      const message = JSON.parse(data);

      // Route message to appropriate handler
      const handlers = createHandlers();
      const handled = messageRouter.routeMessage(ws, message, candidateId, isAdmin, handlers);

      if (!handled) {
        logger.warn('Unhandled message type', {
          type: message.type,
          candidateId,
          isAdmin
        });
      }

    } catch (error) {
      logger.error('Error handling WebSocket message', {
        error: error.message,
        candidateId,
        isAdmin,
        connectionId
      });
    }
  });
}

/**
 * Create handler functions object for message router
 * @private
 * @returns {Object} Handlers object
 */
function createHandlers() {
  return {
    // Chat handlers
    handleAdminMessage: async (candidateId, content, templateId) => {
      const messaging = getMessaging();
      if (messaging) {
        await messaging.sendAdminMessage(candidateId, content, templateId);
      }
    },
    sendMessageFromCandidate: async (candidateId, content) => {
      const messaging = getMessaging();
      if (messaging) {
        await messaging.sendCandidateMessage(candidateId, content);
      }
    },
    handleTypingIndicator: chatFeatures.handleTypingIndicator,
    handleReadReceiptHandler: chatFeatures.handleReadReceipt,

    // Status handlers
    updateCandidateStatus: statusNotifications.updateCandidateStatus,
    sendCandidateStatus: statusNotifications.sendCandidateStatus,

    // Notification handlers
    markNotificationRead: statusNotifications.markNotificationRead,
    markAllNotificationsRead: statusNotifications.markAllNotificationsRead,

    // Job application handler
    handleJobApplicationHandler: async (candidateId, jobId) => {
      // Job application logic would go here
      logger.info('Job application', { candidateId, jobId });
    },

    // AI/Conversation handlers (would be implemented based on existing functions)
    handleAISuggestionAcceptHandler: async (suggestionId, candidateId, ws) => {
      logger.info('AI suggestion accepted', { suggestionId, candidateId });
    },
    handleAISuggestionEditHandler: async (suggestionId, candidateId, content, ws) => {
      logger.info('AI suggestion edited', { suggestionId, candidateId });
    },
    handleAISuggestionDismissHandler: async (suggestionId, ws) => {
      logger.info('AI suggestion dismissed', { suggestionId });
    },
    handleAIModeUpdateHandler: async (candidateId, mode, ws) => {
      logger.info('AI mode updated', { candidateId, mode });
    },
    handleConversationStatusUpdateHandler: (candidateId, status) => {
      const convManager = getConversationManager();
      if (convManager) {
        convManager.updateStatus(candidateId, status);
      }
    },
    handleConversationPriorityUpdateHandler: (candidateId, priority) => {
      const convManager = getConversationManager();
      if (convManager) {
        convManager.updatePriority(candidateId, priority);
      }
    },
    handleResolveConversationHandler: (candidateId) => {
      const convManager = getConversationManager();
      if (convManager) {
        convManager.resolve(candidateId);
      }
    },
    handleGetQuickRepliesHandler: async (candidateId, ws) => {
      logger.info('Quick replies requested', { candidateId });
    },
    handleGetFOMOTriggersHandler: async (candidateId, ws) => {
      logger.info('FOMO triggers requested', { candidateId });
    }
  };
}

/**
 * Set up periodic cleanup tasks
 * @private
 * @param {WebSocket.Server} wss - WebSocket server
 */
function setupPeriodicCleanup(wss) {
  // Ping all clients every 30 seconds to keep connections alive
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        logger.info('Terminating inactive WebSocket connection');
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  // Register interval for cleanup during shutdown
  intervalRegistry.register('websocket-ping', interval, 'WebSocket ping/pong heartbeat');

  wss.on('close', () => {
    intervalRegistry.clear('websocket-ping');
    logger.info('WebSocket server closed');
  });
}

// Export main function and utilities
module.exports = {
  setupWebSocket,
  
  // Export for testing and external use
  EventTypes,
  broadcast,
  eventNotifiers,
  clientStore,
  
  // Helper functions
  isCandidateOnline: broadcast.isCandidateOnline,
  getOnlineCandidates: broadcast.getOnlineCandidates,
  getConnectionStats: broadcast.getConnectionStats
};
