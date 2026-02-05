/**
 * WebSocket Configuration Constants
 * Centralized configuration values for WebSocket server
 * 
 * @module websocket/config/constants
 */

// Connection limits
const MAX_CONNECTIONS_PER_IP = 10;
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds

// Message rate limiting
const MAX_MESSAGES_PER_CONNECTION = 100; // messages per minute
const MESSAGE_RATE_WINDOW = 60000; // 1 minute in milliseconds

// WebSocket server configuration
const WS_SERVER_CONFIG = {
  path: '/ws',
  clientTracking: true,
  maxPayload: 100 * 1024 // 100KB max message size
};

// Reconnection settings
const RECONNECT_DELAY = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

// Timeouts
const PING_INTERVAL = 30000; // 30 seconds
const PONG_TIMEOUT = 5000; // 5 seconds
const MESSAGE_TIMEOUT = 30000; // 30 seconds for message processing

// Buffer sizes
const MAX_PENDING_MESSAGES = 100;
const MAX_HISTORY_MESSAGES = 50;

/**
 * Get WebSocket server configuration
 * @returns {Object} WebSocket server config object
 */
function getServerConfig() {
  return { ...WS_SERVER_CONFIG };
}

/**
 * Get rate limit configuration
 * @returns {Object} Rate limit settings
 */
function getRateLimitConfig() {
  return {
    maxConnectionsPerIp: MAX_CONNECTIONS_PER_IP,
    rateLimitWindow: RATE_LIMIT_WINDOW,
    maxMessagesPerConnection: MAX_MESSAGES_PER_CONNECTION,
    messageRateWindow: MESSAGE_RATE_WINDOW
  };
}

/**
 * Get timeout configuration
 * @returns {Object} Timeout settings
 */
function getTimeoutConfig() {
  return {
    pingInterval: PING_INTERVAL,
    pongTimeout: PONG_TIMEOUT,
    messageTimeout: MESSAGE_TIMEOUT,
    reconnectDelay: RECONNECT_DELAY,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS
  };
}

module.exports = {
  // Connection limits
  MAX_CONNECTIONS_PER_IP,
  RATE_LIMIT_WINDOW,
  
  // Message limits
  MAX_MESSAGES_PER_CONNECTION,
  MESSAGE_RATE_WINDOW,
  
  // Server config
  WS_SERVER_CONFIG,
  
  // Reconnection
  RECONNECT_DELAY,
  MAX_RECONNECT_ATTEMPTS,
  
  // Timeouts
  PING_INTERVAL,
  PONG_TIMEOUT,
  MESSAGE_TIMEOUT,
  
  // Buffers
  MAX_PENDING_MESSAGES,
  MAX_HISTORY_MESSAGES,
  
  // Helper functions
  getServerConfig,
  getRateLimitConfig,
  getTimeoutConfig
};
