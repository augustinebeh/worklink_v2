/**
 * Error Handler Middleware
 * Centralized error handling for Express routes
 */

const logger = require('../utils/logger');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(status, message, code = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'ApiError';
  }

  static badRequest(message = 'Bad Request', code = 'BAD_REQUEST') {
    return new ApiError(400, message, code);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new ApiError(403, message, code);
  }

  static notFound(message = 'Not Found', code = 'NOT_FOUND') {
    return new ApiError(404, message, code);
  }

  static conflict(message = 'Conflict', code = 'CONFLICT') {
    return new ApiError(409, message, code);
  }

  static internal(message = 'Internal Server Error', code = 'INTERNAL_ERROR') {
    return new ApiError(500, message, code);
  }
}

/**
 * Wrap async route handlers to catch errors
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Wrapped function that catches errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Express error handling middleware
 * Should be added as the last middleware
 */
function errorHandler(err, req, res, next) {
  // Log the error
  if (err.status >= 500 || !err.status) {
    logger.error('Server error:', err.message, err.stack);
  } else {
    logger.warn('Request error:', err.message);
  }

  // Determine status code
  const status = err.status || 500;

  // Build response
  const response = {
    success: false,
    error: err.message || 'Internal Server Error',
  };

  // Add error code if available
  if (err.code) {
    response.code = err.code;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}

/**
 * Not found handler for undefined routes
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    path: req.path,
  });
}

/**
 * Success response helper
 * @param {Object} res - Express response object
 * @param {any} data - Response data
 * @param {number} status - HTTP status code (default: 200)
 */
function successResponse(res, data, status = 200) {
  res.status(status).json({
    success: true,
    data,
  });
}

/**
 * Paginated response helper
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination info { page, limit, total }
 */
function paginatedResponse(res, data, pagination) {
  const { page, limit, total } = pagination;
  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  });
}

module.exports = {
  ApiError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  successResponse,
  paginatedResponse,
};
