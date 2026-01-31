/**
 * Development-only logging utility for Admin portal
 * Logs are suppressed in production builds
 */

const isDev = import.meta.env.DEV;

const logger = {
  log: (...args) => isDev && console.log(...args),
  info: (...args) => isDev && console.info('[INFO]', ...args),
  warn: (...args) => isDev && console.warn('[WARN]', ...args),
  debug: (...args) => isDev && console.log('[DEBUG]', ...args),
  // Errors are always logged (even in production)
  error: (...args) => console.error('[ERROR]', ...args),
};

export default logger;
