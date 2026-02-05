/**
 * Admin Connection Handler
 * Handles WebSocket connections for admin clients
 * 
 * @module websocket/connection/admin-handler
 */

const { createLogger } = require('../../utils/structured-logger');
const clientStore = require('../utils/client-store');

const logger = createLogger('websocket:admin-handler');

/**
 * Handle a new admin WebSocket connection
 * Sets up event handlers and sends initial state
 * 
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} [options] - Additional options
 * @param {string} [options.ip] - Client IP address
 * @param {string} [options.connectionId] - Unique connection identifier
 */
function handleAdminConnection(ws, options = {}) {
  const { ip = 'unknown', connectionId } = options;

  // Add admin client to store
  clientStore.addAdminClient(ws);
  
  logger.info('👤 [ADMIN] Admin connected successfully', {
    totalAdminClients: clientStore.getAdminCount(),
    ip,
    connectionId,
    remoteAddress: ws._socket?.remoteAddress || 'unknown'
  });

  // Send initial state - list of online candidates
  sendInitialState(ws);

  // Set up event handlers
  setupEventHandlers(ws, connectionId);
}

/**
 * Send initial state to newly connected admin
 * @private
 * @param {WebSocket} ws - WebSocket connection
 */
function sendInitialState(ws) {
  try {
    const onlineCandidates = clientStore.getConnectedCandidateIds();
    const stats = clientStore.getStats();
    
    const initialMessage = {
      type: 'online_candidates',
      candidates: onlineCandidates,
      stats: {
        totalCandidates: stats.candidates,
        totalAdmins: stats.admins,
        totalConnections: stats.total
      }
    };

    ws.send(JSON.stringify(initialMessage));
    
    logger.debug('👤 [ADMIN] Sent initial state', {
      candidateCount: onlineCandidates.length,
      candidates: onlineCandidates.slice(0, 10) // Log first 10
    });
  } catch (error) {
    logger.error('👤 [ADMIN] Failed to send initial state', {
      error: error.message
    });
  }
}

/**
 * Set up WebSocket event handlers for admin connection
 * @private
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} connectionId - Unique connection identifier
 */
function setupEventHandlers(ws, connectionId) {
  // Handle connection close
  ws.on('close', (code, reason) => {
    handleClose(ws, code, reason, connectionId);
  });

  // Handle errors
  ws.on('error', (error) => {
    handleError(ws, error, connectionId);
  });

  // Handle pong (keepalive response)
  ws.on('pong', () => {
    ws.isAlive = true;
    logger.debug('👤 [ADMIN] Received pong', { connectionId });
  });
}

/**
 * Handle admin connection close
 * @private
 * @param {WebSocket} ws - WebSocket connection
 * @param {number} code - Close code
 * @param {Buffer} reason - Close reason
 * @param {string} connectionId - Unique connection identifier
 */
function handleClose(ws, code, reason, connectionId) {
  clientStore.removeAdminClient(ws);
  
  logger.info('👤 [ADMIN] Admin disconnected', {
    code,
    reason: reason?.toString() || 'No reason provided',
    connectionId,
    remainingAdminClients: clientStore.getAdminCount()
  });
}

/**
 * Handle admin WebSocket error
 * @private
 * @param {WebSocket} ws - WebSocket connection
 * @param {Error} error - Error object
 * @param {string} connectionId - Unique connection identifier
 */
function handleError(ws, error, connectionId) {
  logger.error('👤 [ADMIN] WebSocket error', {
    error: error.message,
    connectionId,
    readyState: ws.readyState
  });
}

/**
 * Send a message to a specific admin connection
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} data - Data to send
 * @returns {boolean} True if sent successfully
 */
function sendToAdmin(ws, data) {
  try {
    if (ws.readyState === 1) { // OPEN
      ws.send(JSON.stringify(data));
      logger.debug('👤 [ADMIN] Message sent', { type: data.type });
      return true;
    } else {
      logger.warn('👤 [ADMIN] Cannot send, connection not open', {
        readyState: ws.readyState
      });
      return false;
    }
  } catch (error) {
    logger.error('👤 [ADMIN] Failed to send message', {
      error: error.message,
      type: data.type
    });
    return false;
  }
}

/**
 * Broadcast connection stats update to all admins
 */
function broadcastStatsToAdmins() {
  const stats = clientStore.getStats();
  const adminClients = clientStore.getAdminClients();
  
  const message = JSON.stringify({
    type: 'connection_stats',
    stats: {
      candidates: stats.candidates,
      admins: stats.admins,
      total: stats.total,
      onlineCandidates: stats.candidateIds
    }
  });

  let sent = 0;
  adminClients.forEach(ws => {
    try {
      if (ws.readyState === 1) { // OPEN
        ws.send(message);
        sent++;
      }
    } catch (error) {
      logger.error('Failed to broadcast stats to admin', {
        error: error.message
      });
    }
  });

  logger.debug('👤 [ADMIN] Broadcasted stats', {
    sent,
    total: adminClients.size
  });
}

module.exports = {
  handleAdminConnection,
  sendToAdmin,
  broadcastStatsToAdmins
};
