/**
 * Connection Validator
 * Validates WebSocket connection authentication
 * 
 * @module websocket/connection/validator
 */

const { db } = require('../../db');
const { verifyToken } = require('../../middleware/auth');
const { createLogger } = require('../../utils/structured-logger');

const logger = createLogger('websocket:validator');

/**
 * Validate WebSocket connection token
 * Supports both JWT tokens and legacy demo tokens
 * 
 * @param {string} token - Authentication token
 * @param {string|null} candidateId - Candidate ID (for candidate connections)
 * @param {boolean} isAdmin - Whether this is an admin connection
 * @returns {Object} Validation result
 * @returns {boolean} result.valid - Whether the connection is valid
 * @returns {string} result.role - User role ('admin' or 'candidate')
 * @returns {string} [result.candidateId] - Candidate ID (for candidate connections)
 * @returns {string} [result.error] - Error message (if invalid)
 * 
 * @example
 * const result = validateConnection('jwt-token', null, true);
 * if (result.valid) {
 *   console.log('Admin connected');
 * }
 */
function validateConnection(token, candidateId, isAdmin) {
  // Check for missing token
  if (!token) {
    logger.warn('Connection attempt without token', { isAdmin, candidateId });
    return { valid: false, error: 'Missing authentication token' };
  }

  // Try JWT token first (preferred method)
  const decoded = verifyToken(token);
  if (decoded) {
    return validateJWTConnection(decoded, candidateId, isAdmin);
  }

  // Legacy demo tokens are no longer accepted in any environment
  logger.security('legacy_token_rejected', {
    tokenPreview: token.substring(0, 10) + '...',
    isAdmin,
    candidateId
  });
  return { valid: false, error: 'Invalid authentication token. Please log in again.' };
}

/**
 * Validate JWT token connection
 * @private
 * @param {Object} decoded - Decoded JWT payload
 * @param {string|null} candidateId - Candidate ID
 * @param {boolean} isAdmin - Whether this is an admin connection
 * @returns {Object} Validation result
 */
function validateJWTConnection(decoded, candidateId, isAdmin) {
  // Admin connection validation
  if (isAdmin && decoded.role === 'admin') {
    logger.info('Admin authenticated via JWT', { userId: decoded.id });
    return { valid: true, role: 'admin' };
  }

  // Candidate connection validation
  if (!isAdmin && decoded.role === 'candidate') {
    // Ensure token matches candidateId parameter
    if (candidateId && decoded.id !== candidateId) {
      logger.warn('Token candidateId mismatch', {
        tokenId: decoded.id,
        paramId: candidateId
      });
      return { valid: false, error: 'Token candidateId mismatch' };
    }

    // Verify candidate exists in database
    try {
      const candidate = db.prepare('SELECT id FROM candidates WHERE id = ?').get(decoded.id);
      if (!candidate) {
        logger.warn('Candidate not found in database', { candidateId: decoded.id });
        return { valid: false, error: 'Candidate not found' };
      }

      logger.info('Candidate authenticated via JWT', { candidateId: decoded.id });
      return { valid: true, role: 'candidate', candidateId: decoded.id };
    } catch (error) {
      logger.error('Database error during candidate validation', {
        candidateId: decoded.id,
        error: error.message
      });
      return { valid: false, error: 'Database error' };
    }
  }

  logger.warn('Invalid role for connection type', {
    isAdmin,
    tokenRole: decoded.role
  });
  return { valid: false, error: 'Invalid role for connection type' };
}

module.exports = {
  validateConnection
};
