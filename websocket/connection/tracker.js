/**
 * Rate Limit Tracker
 * Handles rate limiting for WebSocket connections and messages
 * 
 * @module websocket/connection/tracker
 */

const { createLogger } = require('../../utils/structured-logger');
const clientStore = require('../utils/client-store');
const {
  MAX_CONNECTIONS_PER_IP,
  RATE_LIMIT_WINDOW,
  MAX_MESSAGES_PER_CONNECTION,
  MESSAGE_RATE_WINDOW
} = require('../config/constants');

const logger = createLogger('websocket:tracker');

/**
 * Check if an IP has exceeded connection rate limit
 * @param {string} ip - Client IP address
 * @returns {boolean} True if rate limit exceeded
 */
function isConnectionRateLimited(ip) {
  const count = clientStore.getConnectionCount(ip, RATE_LIMIT_WINDOW);
  
  if (count >= MAX_CONNECTIONS_PER_IP) {
    logger.warn('Connection rate limit exceeded', {
      ip,
      count,
      limit: MAX_CONNECTIONS_PER_IP,
      windowMs: RATE_LIMIT_WINDOW
    });
    return true;
  }
  
  return false;
}

/**
 * Track a new connection attempt
 * @param {string} ip - Client IP address
 * @returns {number} Current connection count for this IP
 */
function trackConnection(ip) {
  clientStore.trackConnection(ip);
  const count = clientStore.getConnectionCount(ip, RATE_LIMIT_WINDOW);
  
  logger.debug('Connection tracked', {
    ip,
    count,
    limit: MAX_CONNECTIONS_PER_IP
  });
  
  return count;
}

/**
 * Check if a connection has exceeded message rate limit
 * @param {string} connectionId - Unique connection identifier
 * @returns {boolean} True if rate limit exceeded
 */
function isMessageRateLimited(connectionId) {
  const count = clientStore.getMessageCount(connectionId, MESSAGE_RATE_WINDOW);
  
  if (count >= MAX_MESSAGES_PER_CONNECTION) {
    logger.warn('Message rate limit exceeded', {
      connectionId,
      count,
      limit: MAX_MESSAGES_PER_CONNECTION,
      windowMs: MESSAGE_RATE_WINDOW
    });
    return true;
  }
  
  return false;
}

/**
 * Track a new message from a connection
 * @param {string} connectionId - Unique connection identifier
 * @returns {number} Current message count for this connection
 */
function trackMessage(connectionId) {
  clientStore.trackMessage(connectionId);
  const count = clientStore.getMessageCount(connectionId, MESSAGE_RATE_WINDOW);
  
  logger.debug('Message tracked', {
    connectionId,
    count,
    limit: MAX_MESSAGES_PER_CONNECTION
  });
  
  return count;
}

/**
 * Get rate limit status for a connection
 * @param {string} connectionId - Unique connection identifier
 * @param {string} ip - Client IP address
 * @returns {Object} Rate limit status
 */
function getRateLimitStatus(connectionId, ip) {
  const connectionCount = clientStore.getConnectionCount(ip, RATE_LIMIT_WINDOW);
  const messageCount = clientStore.getMessageCount(connectionId, MESSAGE_RATE_WINDOW);
  
  return {
    connections: {
      count: connectionCount,
      limit: MAX_CONNECTIONS_PER_IP,
      remaining: Math.max(0, MAX_CONNECTIONS_PER_IP - connectionCount),
      limited: connectionCount >= MAX_CONNECTIONS_PER_IP
    },
    messages: {
      count: messageCount,
      limit: MAX_MESSAGES_PER_CONNECTION,
      remaining: Math.max(0, MAX_MESSAGES_PER_CONNECTION - messageCount),
      limited: messageCount >= MAX_MESSAGES_PER_CONNECTION
    }
  };
}

/**
 * Clear tracking data for a connection
 * @param {string} connectionId - Unique connection identifier
 */
function clearConnectionTracking(connectionId) {
  clientStore.clearTracking(connectionId);
  logger.debug('Connection tracking cleared', { connectionId });
}

/**
 * Generate a unique connection ID
 * @param {string} ip - Client IP address
 * @param {string} role - User role ('admin' or 'candidate')
 * @param {string} [candidateId] - Candidate ID (for candidates)
 * @returns {string} Unique connection ID
 */
function generateConnectionId(ip, role, candidateId = null) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  
  if (role === 'candidate' && candidateId) {
    return `${ip}-candidate-${candidateId}-${timestamp}-${random}`;
  }
  
  return `${ip}-${role}-${timestamp}-${random}`;
}

/**
 * Check if rate limiting should be enforced
 * Can be disabled for testing or special circumstances
 * @returns {boolean} True if rate limiting is enabled
 */
function isRateLimitingEnabled() {
  // Could add environment variable check here
  return process.env.DISABLE_RATE_LIMITING !== 'true';
}

module.exports = {
  isConnectionRateLimited,
  trackConnection,
  isMessageRateLimited,
  trackMessage,
  getRateLimitStatus,
  clearConnectionTracking,
  generateConnectionId,
  isRateLimitingEnabled
};
