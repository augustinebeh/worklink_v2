/**
 * Logger Utility for WorkLink Backend
 * Provides consistent logging with timestamps and log levels
 */

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

const logger = {
  /**
   * General logging (development only)
   */
  log: (...args) => {
    if (isDev) {
      console.log(...formatMessage('LOG'), ...args);
    }
  },

  /**
   * Info level logging (development only)
   */
  info: (...args) => {
    if (isDev) {
      console.info(`${colors.blue}[INFO]${colors.reset}`, getTimestamp(), ...args);
    }
  },

  /**
   * Warning level logging (development only)
   */
  warn: (...args) => {
    if (isDev) {
      console.warn(`${colors.yellow}[WARN]${colors.reset}`, getTimestamp(), ...args);
    }
  },

  /**
   * Debug level logging (development only)
   */
  debug: (...args) => {
    if (isDev && process.env.DEBUG) {
      console.log(`${colors.cyan}[DEBUG]${colors.reset}`, getTimestamp(), ...args);
    }
  },

  /**
   * Error level logging (always logged)
   */
  error: (...args) => {
    console.error(`${colors.red}[ERROR]${colors.reset}`, getTimestamp(), ...args);
  },

  /**
   * Success messages (development only)
   */
  success: (...args) => {
    if (isDev) {
      console.log(`${colors.green}[SUCCESS]${colors.reset}`, getTimestamp(), ...args);
    }
  },

  /**
   * Database operations logging
   */
  db: (...args) => {
    if (isDev) {
      console.log(`${colors.magenta}[DB]${colors.reset}`, getTimestamp(), ...args);
    }
  },

  /**
   * WebSocket logging
   */
  ws: (...args) => {
    if (isDev) {
      console.log(`${colors.cyan}[WS]${colors.reset}`, getTimestamp(), ...args);
    }
  },

  /**
   * API request logging
   */
  api: (method, path, status, duration) => {
    if (isDev) {
      const statusColor = status >= 400 ? colors.red : status >= 300 ? colors.yellow : colors.green;
      console.log(
        `${colors.blue}[API]${colors.reset}`,
        getTimestamp(),
        `${method} ${path}`,
        `${statusColor}${status}${colors.reset}`,
        `${duration}ms`
      );
    }
  },
};

module.exports = logger;
