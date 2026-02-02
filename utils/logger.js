/**
 * DEPRECATED: Legacy Logger for WorkLink Backend
 *
 * This logger is deprecated. Please use the new structured logger instead:
 * const { createLogger } = require('./structured-logger');
 * const logger = createLogger('your-module');
 *
 * Legacy wrapper for backward compatibility
 */

const { createLogger } = require('./structured-logger');
const structuredLogger = createLogger('legacy');

const isDev = process.env.NODE_ENV !== 'production';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function getTimestamp() {
  return new Date().toISOString();
}

function formatMessage(level, ...args) {
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}] [${level}]`;
  return [prefix, ...args];
}

// Legacy wrapper - delegates to structured logger for backward compatibility
const logger = {
  /**
   * General logging - now uses structured logger
   */
  log: (...args) => {
    structuredLogger.info(args.join(' '));
  },

  /**
   * Info level logging - now uses structured logger
   */
  info: (...args) => {
    structuredLogger.info(args.join(' '));
  },

  /**
   * Warning level logging - now uses structured logger
   */
  warn: (...args) => {
    structuredLogger.warn(args.join(' '));
  },

  /**
   * Debug level logging - now uses structured logger
   */
  debug: (...args) => {
    structuredLogger.debug(args.join(' '));
  },

  /**
   * Error level logging - now uses structured logger
   */
  error: (...args) => {
    structuredLogger.error(args.join(' '));
  },

  /**
   * Success messages - now uses structured logger
   */
  success: (...args) => {
    structuredLogger.info(args.join(' '), { category: 'success' });
  },

  /**
   * Database operations logging - now uses structured logger
   */
  db: (...args) => {
    structuredLogger.db('operation', 'unknown', { message: args.join(' ') });
  },

  /**
   * WebSocket logging - now uses structured logger
   */
  ws: (...args) => {
    structuredLogger.ws('event', { message: args.join(' ') });
  },

  /**
   * API request logging - now uses structured logger
   */
  api: (method, path, status, duration) => {
    structuredLogger.api(method, path, status, duration);
  },
};

module.exports = logger;
