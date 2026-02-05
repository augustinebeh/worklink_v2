/**
 * Candidate Connection Handler
 * Handles WebSocket connections for candidate clients
 * 
 * @module websocket/connection/candidate-handler
 */

const { createLogger } = require('../../utils/structured-logger');
const clientStore = require('../utils/client-store');
const { EventTypes } = require('../config/event-types');

const logger = createLogger('websocket:candidate-handler');

/**
 * Handle a new candidate WebSocket connection
 * Closes existing connections, sets up event handlers, sends initial state
 * 
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} candidateId - Candidate ID
 * @param {Object} [options] - Additional options
 * @param {string} [options.ip] - Client IP address
 * @param {string} [options.connectionId] - Unique connection identifier
 * @param {Function} [options.updateStatus] - Function to update candidate status
 * @param {Function} [options.sendHistory] - Function to send chat history
 * @param {Function} [options.sendNotifications] - Function to send notifications
 * @param {Function} [options.broadcastToAdmins] - Function to broadcast to admins
 */
function handleCandidateConnection(ws, candidateId, options = {}) {
  const {
    ip = 'unknown',
    connectionId,
    updateStatus,
    sendHistory,
    sendNotifications,
    broadcastToAdmins
  } = options;

  // Close existing connection for same candidate (single session per candidate)
  closeExistingConnection(candidateId);

  // Add candidate client to store
  clientStore.addCandidateClient(candidateId, ws);
  
  logger.info(`✅ Candidate ${candidateId} connected`, {
    totalCandidates: clientStore.getCandidateCount(),
    allCandidates: clientStore.getConnectedCandidateIds(),
    ip,
    connectionId
  });

  // Update candidate status to online
  if (updateStatus) {
    updateStatus(candidateId, 'online');
  }

  // Send initial state
  sendInitialState(ws, candidateId, {
    sendHistory,
    sendNotifications
  });

  // Notify admins of new connection
  if (broadcastToAdmins) {
    broadcastToAdmins({
      type: EventTypes.STATUS_CHANGE,
      candidateId,
      status: 'online',
      timestamp: new Date().toISOString()
    });
  }

  // Set up event handlers
  setupEventHandlers(ws, candidateId, {
    updateStatus,
    broadcastToAdmins,
    connectionId
  });
}

/**
 * Close existing connection for a candidate
 * Ensures only one active connection per candidate
 * @private
 * @param {string} candidateId - Candidate ID
 */
function closeExistingConnection(candidateId) {
  const existingWs = clientStore.getCandidateClient(candidateId);
  
  if (existingWs && existingWs.readyState === 1) { // OPEN
    logger.info(`Closing existing connection for candidate ${candidateId}`);
    existingWs.close(4001, 'New connection established');
  }
}

/**
 * Send initial state to newly connected candidate
 * @private
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} candidateId - Candidate ID
 * @param {Object} options - Options with callback functions
 */
function sendInitialState(ws, candidateId, options = {}) {
  const { sendHistory, sendNotifications } = options;

  try {
    // Send chat history
    if (sendHistory) {
      sendHistory(ws, candidateId);
    }

    // Send unread notifications
    if (sendNotifications) {
      sendNotifications(ws, candidateId);
    }

    logger.debug(`✅ Sent initial state to candidate ${candidateId}`);
  } catch (error) {
    logger.error(`Failed to send initial state to candidate ${candidateId}`, {
      error: error.message
    });
  }
}

/**
 * Set up WebSocket event handlers for candidate connection
 * @private
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} candidateId - Candidate ID
 * @param {Object} options - Options with callback functions
 */
function setupEventHandlers(ws, candidateId, options = {}) {
  const { updateStatus, broadcastToAdmins, connectionId } = options;

  // Handle connection close
  ws.on('close', (code, reason) => {
    handleClose(ws, candidateId, code, reason, {
      updateStatus,
      broadcastToAdmins,
      connectionId
    });
  });

  // Handle errors
  ws.on('error', (error) => {
    handleError(ws, candidateId, error, connectionId);
  });

  // Handle pong (keepalive response)
  ws.on('pong', () => {
    ws.isAlive = true;
    logger.debug(`👤 Candidate ${candidateId} pong received`, { connectionId });
  });
}

/**
 * Handle candidate connection close
 * @private
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} candidateId - Candidate ID
 * @param {number} code - Close code
 * @param {Buffer} reason - Close reason
 * @param {Object} options - Options with callback functions
 */
function handleClose(ws, candidateId, code, reason, options = {}) {
  const { updateStatus, broadcastToAdmins, connectionId } = options;

  // Remove candidate from store
  clientStore.removeCandidateClient(candidateId);

  // Update status to offline
  if (updateStatus) {
    updateStatus(candidateId, 'offline');
  }

  logger.info(`👤 Candidate ${candidateId} disconnected`, {
    code,
    reason: reason?.toString() || 'No reason provided',
    connectionId,
    totalCandidates: clientStore.getCandidateCount()
  });

  // Notify admins
  if (broadcastToAdmins) {
    broadcastToAdmins({
      type: EventTypes.STATUS_CHANGE,
      candidateId,
      status: 'offline',
      last_seen: new Date().toISOString()
    });
  }
}

/**
 * Handle candidate WebSocket error
 * @private
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} candidateId - Candidate ID
 * @param {Error} error - Error object
 * @param {string} connectionId - Unique connection identifier
 */
function handleError(ws, candidateId, error, connectionId) {
  logger.error(`👤 Candidate ${candidateId} WebSocket error`, {
    error: error.message,
    connectionId,
    readyState: ws.readyState
  });
}

/**
 * Send a message to a specific candidate connection
 * @param {string} candidateId - Candidate ID
 * @param {Object} data - Data to send
 * @returns {boolean} True if sent successfully
 */
function sendToCandidate(candidateId, data) {
  const ws = clientStore.getCandidateClient(candidateId);
  
  if (!ws) {
    logger.warn(`Cannot send to candidate ${candidateId}: not connected`);
    return false;
  }

  try {
    if (ws.readyState === 1) { // OPEN
      ws.send(JSON.stringify(data));
      logger.debug(`✅ Message sent to candidate ${candidateId}`, { type: data.type });
      return true;
    } else {
      logger.warn(`Cannot send to candidate ${candidateId}: connection not open`, {
        readyState: ws.readyState
      });
      return false;
    }
  } catch (error) {
    logger.error(`Failed to send message to candidate ${candidateId}`, {
      error: error.message,
      type: data.type
    });
    return false;
  }
}

/**
 * Check if a candidate is currently connected
 * @param {string} candidateId - Candidate ID
 * @returns {boolean} True if connected
 */
function isCandidateConnected(candidateId) {
  return clientStore.isCandidateConnected(candidateId);
}

/**
 * Get WebSocket connection for a candidate
 * @param {string} candidateId - Candidate ID
 * @returns {WebSocket|undefined} WebSocket connection or undefined
 */
function getCandidateConnection(candidateId) {
  return clientStore.getCandidateClient(candidateId);
}

module.exports = {
  handleCandidateConnection,
  sendToCandidate,
  isCandidateConnected,
  getCandidateConnection
};
