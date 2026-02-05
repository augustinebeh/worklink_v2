/**
 * Client Store
 * Manages connected WebSocket clients (candidates and admins)
 * 
 * @module websocket/utils/client-store
 */

const { createLogger } = require('../../utils/structured-logger');
const logger = createLogger('websocket:client-store');

// Store connected clients
const candidateClients = new Map(); // candidateId -> WebSocket
const adminClients = new Set(); // Set of admin WebSocket connections

// Connection tracking for rate limiting
const connectionTracker = new Map(); // IP -> Array of connection timestamps
const messageTracker = new Map(); // Connection ID -> Array of message timestamps

/**
 * Add a candidate client connection
 * @param {string} candidateId - Candidate ID
 * @param {WebSocket} ws - WebSocket connection
 */
function addCandidateClient(candidateId, ws) {
  if (!candidateId || !ws) {
    logger.error('Invalid parameters for addCandidateClient', { candidateId, hasWs: !!ws });
    return;
  }

  if (candidateClients.has(candidateId)) {
    logger.warn('Candidate already connected, replacing connection', { candidateId });
    const existingWs = candidateClients.get(candidateId);
    if (existingWs && existingWs.readyState === 1) {
      existingWs.close();
    }
  }

  candidateClients.set(candidateId, ws);
  logger.info('Candidate client added', { candidateId, totalCandidates: candidateClients.size });
}

/**
 * Remove a candidate client connection
 * @param {string} candidateId - Candidate ID
 */
function removeCandidateClient(candidateId) {
  if (!candidateId) {
    return;
  }

  const removed = candidateClients.delete(candidateId);
  if (removed) {
    logger.info('Candidate client removed', { candidateId, totalCandidates: candidateClients.size });
  }
}

/**
 * Get a candidate client connection
 * @param {string} candidateId - Candidate ID
 * @returns {WebSocket|undefined} WebSocket connection or undefined
 */
function getCandidateClient(candidateId) {
  return candidateClients.get(candidateId);
}

/**
 * Check if a candidate is connected
 * @param {string} candidateId - Candidate ID
 * @returns {boolean} True if connected
 */
function isCandidateConnected(candidateId) {
  const ws = candidateClients.get(candidateId);
  return ws && ws.readyState === 1; // OPEN state
}

/**
 * Get all connected candidate IDs
 * @returns {string[]} Array of candidate IDs
 */
function getConnectedCandidateIds() {
  return Array.from(candidateClients.keys());
}

/**
 * Add an admin client connection
 * @param {WebSocket} ws - WebSocket connection
 */
function addAdminClient(ws) {
  if (!ws) {
    logger.error('Invalid WebSocket for addAdminClient');
    return;
  }

  adminClients.add(ws);
  logger.info('Admin client added', { totalAdmins: adminClients.size });
}

/**
 * Remove an admin client connection
 * @param {WebSocket} ws - WebSocket connection
 */
function removeAdminClient(ws) {
  if (!ws) {
    return;
  }

  const removed = adminClients.delete(ws);
  if (removed) {
    logger.info('Admin client removed', { totalAdmins: adminClients.size });
  }
}

/**
 * Get all admin clients
 * @returns {Set<WebSocket>} Set of admin WebSocket connections
 */
function getAdminClients() {
  return adminClients;
}

/**
 * Get count of connected admins
 * @returns {number} Number of connected admins
 */
function getAdminCount() {
  return adminClients.size;
}

/**
 * Get count of connected candidates
 * @returns {number} Number of connected candidates
 */
function getCandidateCount() {
  return candidateClients.size;
}

/**
 * Get connection statistics
 * @returns {Object} Statistics object
 */
function getStats() {
  return {
    candidates: candidateClients.size,
    admins: adminClients.size,
    total: candidateClients.size + adminClients.size,
    candidateIds: Array.from(candidateClients.keys())
  };
}

/**
 * Track a connection for rate limiting
 * @param {string} ip - Client IP address
 * @param {number} timestamp - Connection timestamp
 */
function trackConnection(ip, timestamp = Date.now()) {
  if (!connectionTracker.has(ip)) {
    connectionTracker.set(ip, []);
  }
  connectionTracker.get(ip).push(timestamp);
}

/**
 * Get connection count for an IP within a time window
 * @param {string} ip - Client IP address
 * @param {number} windowMs - Time window in milliseconds
 * @returns {number} Number of connections in window
 */
function getConnectionCount(ip, windowMs) {
  const connections = connectionTracker.get(ip) || [];
  const cutoff = Date.now() - windowMs;
  
  // Filter out old connections
  const recentConnections = connections.filter(t => t > cutoff);
  connectionTracker.set(ip, recentConnections);
  
  return recentConnections.length;
}

/**
 * Track a message for rate limiting
 * @param {string} connectionId - Unique connection identifier
 * @param {number} timestamp - Message timestamp
 */
function trackMessage(connectionId, timestamp = Date.now()) {
  if (!messageTracker.has(connectionId)) {
    messageTracker.set(connectionId, []);
  }
  messageTracker.get(connectionId).push(timestamp);
}

/**
 * Get message count for a connection within a time window
 * @param {string} connectionId - Unique connection identifier
 * @param {number} windowMs - Time window in milliseconds
 * @returns {number} Number of messages in window
 */
function getMessageCount(connectionId, windowMs) {
  const messages = messageTracker.get(connectionId) || [];
  const cutoff = Date.now() - windowMs;
  
  // Filter out old messages
  const recentMessages = messages.filter(t => t > cutoff);
  messageTracker.set(connectionId, recentMessages);
  
  return recentMessages.length;
}

/**
 * Clear all tracking data for a connection
 * @param {string} connectionId - Unique connection identifier
 */
function clearTracking(connectionId) {
  messageTracker.delete(connectionId);
}

/**
 * Clear all client data (useful for testing)
 */
function clearAll() {
  candidateClients.clear();
  adminClients.clear();
  connectionTracker.clear();
  messageTracker.clear();
  logger.info('All client data cleared');
}

module.exports = {
  // Candidate clients
  addCandidateClient,
  removeCandidateClient,
  getCandidateClient,
  isCandidateConnected,
  getConnectedCandidateIds,
  getCandidateCount,
  
  // Admin clients
  addAdminClient,
  removeAdminClient,
  getAdminClients,
  getAdminCount,
  
  // Statistics
  getStats,
  
  // Rate limiting
  trackConnection,
  getConnectionCount,
  trackMessage,
  getMessageCount,
  clearTracking,
  
  // Testing
  clearAll
};
