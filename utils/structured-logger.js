/**
 * Simple Logger for WorkLink v2
 * Lightweight console-based logging to prevent initialization issues
 */

// Configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVICE_NAME = 'worklink-v2';

// Simple console-based logger
class StructuredLogger {
  constructor(module = 'app') {
    this.module = module;
    this.startTime = Date.now();
  }

  // Format log message with structured data
  _formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();

    if (NODE_ENV === 'production') {
      // JSON format for production
      return JSON.stringify({
        timestamp,
        level,
        service: SERVICE_NAME,
        module: this.module,
        message,
        env: NODE_ENV,
        version: '2.0.1',
        ...meta
      });
    } else {
      // Human readable format for development
      const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} [${level.toUpperCase()}] [${this.module}] ${message}${metaStr}`;
    }
  }

  // Core logging methods
  error(message, meta = {}) {
    console.error(this._formatMessage('error', message, meta));
    return this;
  }

  warn(message, meta = {}) {
    console.warn(this._formatMessage('warn', message, meta));
    return this;
  }

  info(message, meta = {}) {
    console.log(this._formatMessage('info', message, meta));
    return this;
  }

  debug(message, meta = {}) {
    if (NODE_ENV !== 'production') {
      console.log(this._formatMessage('debug', message, meta));
    }
    return this;
  }

  // Specialized logging methods (simplified)
  security(event, meta = {}) {
    return this.warn(`Security Event: ${event}`, { category: 'security', event_type: event, ...meta });
  }

  api(method, path, statusCode, duration, meta = {}) {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const message = `${method} ${path} ${statusCode} ${duration}ms`;
    const apiMeta = { method, path, status_code: statusCode, duration_ms: duration, ...meta };

    return this[level](message, apiMeta);
  }

  db(operation, table, meta = {}) {
    return this.debug(`DB ${operation}: ${table}`, { operation, table, ...meta });
  }

  ws(event, meta = {}) {
    return this.debug(`WebSocket: ${event}`, { event, ...meta });
  }

  auth(action, user_id, meta = {}) {
    return this.info(`Auth: ${action}`, { action, user_id, ...meta });
  }

  gamification(action, candidate_id, meta = {}) {
    return this.info(`Gamification: ${action}`, { action, candidate_id, ...meta });
  }

  performance(operation, duration, meta = {}) {
    const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug';
    return this[level](`Performance: ${operation} took ${duration}ms`, { operation, duration_ms: duration, ...meta });
  }

  timer(operation) {
    const start = Date.now();
    return {
      end: (meta = {}) => {
        const duration = Date.now() - start;
        this.performance(operation, duration, meta);
        return duration;
      }
    };
  }

  business(event, meta = {}) {
    return this.info(`Business: ${event}`, { event, ...meta });
  }

  child(childMeta = {}) {
    const childModule = childMeta.module || this.module;
    return new StructuredLogger(childModule);
  }
}

// Singleton pattern for easy access
const defaultLogger = new StructuredLogger('app');

// Add request correlation ID middleware support
defaultLogger.addCorrelationId = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] ||
    req.headers['x-request-id'] ||
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  // Add to logger context
  req.logger = defaultLogger.child({ correlation_id: correlationId });

  next();
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  defaultLogger.error('Unhandled Promise Rejection', {
    reason: reason?.toString(),
    stack: reason?.stack
  });
});

module.exports = {
  StructuredLogger,
  logger: defaultLogger,
  createLogger: (module) => new StructuredLogger(module)
};

// Export default logger for backward compatibility
module.exports.default = defaultLogger;