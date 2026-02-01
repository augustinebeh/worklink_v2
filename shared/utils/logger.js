/**
 * Logger Utility for Frontend Apps
 * Shared across Worker app and Admin app
 *
 * Development-only logging to keep production clean
 */

// Check for development environment (CommonJS compatible)
const isDev = process.env.NODE_ENV !== 'production';

const logger = {
  /**
   * General logging (development only)
   */
  log: (...args) => {
    if (isDev) console.log(...args);
  },

  /**
   * Info level logging (development only)
   */
  info: (...args) => {
    if (isDev) console.info('[INFO]', ...args);
  },

  /**
   * Warning level logging (development only)
   */
  warn: (...args) => {
    if (isDev) console.warn('[WARN]', ...args);
  },

  /**
   * Debug level logging (development only)
   */
  debug: (...args) => {
    if (isDev) console.log('[DEBUG]', ...args);
  },

  /**
   * Error level logging (always logged)
   */
  error: (...args) => {
    console.error('[ERROR]', ...args);
  },
};

// CommonJS exports
module.exports = logger;
