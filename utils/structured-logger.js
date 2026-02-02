/**
 * Structured Logger for WorkLink v2
 * Production-ready logging with Winston, structured data, and multiple outputs
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug');
const SERVICE_NAME = 'worklink-v2';

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, module, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      service: service || SERVICE_NAME,
      module: module || 'unknown',
      message,
      ...meta
    };

    // Add environment info
    logEntry.env = NODE_ENV;

    return JSON.stringify(logEntry);
  })
);

// Console format for development (human-readable)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, module, ...meta }) => {
    let output = `${timestamp} [${level}]`;

    if (module) {
      output += ` [${module}]`;
    }

    output += ` ${message}`;

    // Add structured data if present
    const metaKeys = Object.keys(meta).filter(key =>
      !['timestamp', 'level', 'message', 'service', 'module', 'env'].includes(key)
    );

    if (metaKeys.length > 0) {
      const metaData = {};
      metaKeys.forEach(key => {
        metaData[key] = meta[key];
      });
      output += ` ${JSON.stringify(metaData)}`;
    }

    return output;
  })
);

// Transport configurations
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    level: LOG_LEVEL,
    format: NODE_ENV === 'production' ? structuredFormat : consoleFormat,
    silent: process.env.SILENT_LOGS === 'true'
  })
);

// File transports (production and when specified)
if (NODE_ENV === 'production' || process.env.ENABLE_FILE_LOGS === 'true') {
  // Combined logs (all levels)
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: LOG_LEVEL,
      format: structuredFormat
    })
  );

  // Error logs (error level only)
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: structuredFormat
    })
  );

  // Security logs (security events)
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d',
      format: structuredFormat
    })
  );

  // API access logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'api-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '7d',
      format: structuredFormat
    })
  );
}

// Create the Winston logger
const logger = winston.createLogger({
  level: LOG_LEVEL,
  transports,
  exitOnError: false, // Don't exit on handled exceptions

  // Default metadata
  defaultMeta: {
    service: SERVICE_NAME,
    env: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  }
});

// Enhanced logging interface
class StructuredLogger {
  constructor(module = 'app') {
    this.module = module;
    this.startTime = Date.now();
  }

  // Core logging methods with structured data support
  error(message, meta = {}) {
    return logger.error(message, { module: this.module, ...meta });
  }

  warn(message, meta = {}) {
    return logger.warn(message, { module: this.module, ...meta });
  }

  info(message, meta = {}) {
    return logger.info(message, { module: this.module, ...meta });
  }

  debug(message, meta = {}) {
    return logger.debug(message, { module: this.module, ...meta });
  }

  // Security logging (always goes to security log file in production)
  security(event, meta = {}) {
    const securityMeta = {
      module: this.module,
      category: 'security',
      event_type: event,
      timestamp: new Date().toISOString(),
      ...meta
    };

    if (NODE_ENV === 'production') {
      // Route to security log file
      const securityTransport = logger.transports.find(t =>
        t instanceof DailyRotateFile && t.filename.includes('security')
      );
      if (securityTransport) {
        securityTransport.log({ level: 'warn', message: `Security Event: ${event}`, ...securityMeta });
      }
    }

    return logger.warn(`Security Event: ${event}`, securityMeta);
  }

  // API request logging with performance metrics
  api(method, path, statusCode, duration, meta = {}) {
    const apiMeta = {
      module: 'api',
      method,
      path,
      status_code: statusCode,
      duration_ms: duration,
      category: 'api_access',
      ...meta
    };

    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const message = `${method} ${path} ${statusCode} ${duration}ms`;

    if (NODE_ENV === 'production') {
      // Route to API log file
      const apiTransport = logger.transports.find(t =>
        t instanceof DailyRotateFile && t.filename.includes('api')
      );
      if (apiTransport) {
        apiTransport.log({ level, message, ...apiMeta });
      }
    }

    return logger.log(level, message, apiMeta);
  }

  // Database operation logging
  db(operation, table, meta = {}) {
    return logger.debug(`DB ${operation}: ${table}`, {
      module: 'database',
      operation,
      table,
      ...meta
    });
  }

  // WebSocket logging
  ws(event, meta = {}) {
    return logger.debug(`WebSocket: ${event}`, {
      module: 'websocket',
      event,
      ...meta
    });
  }

  // Authentication logging
  auth(action, user_id, meta = {}) {
    return logger.info(`Auth: ${action}`, {
      module: 'auth',
      action,
      user_id,
      ...meta
    });
  }

  // Gamification logging
  gamification(action, candidate_id, meta = {}) {
    return logger.info(`Gamification: ${action}`, {
      module: 'gamification',
      action,
      candidate_id,
      ...meta
    });
  }

  // Performance tracking
  performance(operation, duration, meta = {}) {
    const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug';
    return logger.log(level, `Performance: ${operation} took ${duration}ms`, {
      module: 'performance',
      operation,
      duration_ms: duration,
      ...meta
    });
  }

  // Create a timer for performance tracking
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

  // Business logic logging
  business(event, meta = {}) {
    return logger.info(`Business: ${event}`, {
      module: 'business',
      event,
      ...meta
    });
  }

  // Create child logger with additional context
  child(childMeta = {}) {
    const childModule = childMeta.module || this.module;
    const child = new StructuredLogger(childModule);
    child.defaultMeta = { ...this.defaultMeta, ...childMeta };
    return child;
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

// Graceful shutdown
process.on('SIGTERM', () => {
  defaultLogger.info('SIGTERM received, closing log transports');
  logger.close();
});

// Handle uncaught exceptions
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logsDir, 'exceptions.log'),
    format: structuredFormat
  })
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  defaultLogger.error('Unhandled Promise Rejection', {
    reason: reason?.toString(),
    stack: reason?.stack,
    promise: promise?.toString()
  });
});

module.exports = {
  StructuredLogger,
  logger: defaultLogger,
  createLogger: (module) => new StructuredLogger(module)
};

// Export default logger for backward compatibility
module.exports.default = defaultLogger;