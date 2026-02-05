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

  // Fall back to legacy demo tokens (temporary for migration)
  logger.warn('Using legacy demo token for WebSocket auth', {
    tokenPreview: token.substring(0, 10) + '...',
    isAdmin,
    candidateId
  });

  return validateLegacyConnection(token, candidateId, isAdmin);
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

/**
 * Validate legacy demo token connection
 * @private
 * @param {string} token - Demo token
 * @param {string|null} candidateId - Candidate ID
 * @param {boolean} isAdmin - Whether this is an admin connection
 * @returns {Object} Validation result
 */
function validateLegacyConnection(token, candidateId, isAdmin) {
  // Admin token validation
  if (isAdmin) {
    if (token === 'demo-admin-token') {
      logger.info('Admin authenticated via legacy token');
      return { valid: true, role: 'admin' };
    }
    logger.warn('Invalid admin demo token', { tokenPreview: token.substring(0, 10) });
    return { valid: false, error: 'Invalid admin token' };
  }

  // Candidate token validation
  if (candidateId) {
    // Token format: demo-token-{candidateId}
    const expectedToken = `demo-token-${candidateId}`;
    
    if (token === expectedToken) {
      // Verify candidate exists in database
      try {
        const candidate = db.prepare('SELECT id FROM candidates WHERE id = ?').get(candidateId);
        if (candidate) {
          logger.info('Candidate authenticated via legacy token', { candidateId });
          return { valid: true, role: 'candidate', candidateId };
        }
        logger.warn('Candidate not found in database', { candidateId });
        return { valid: false, error: 'Candidate not found' };
      } catch (error) {
        logger.error('Database error during legacy candidate validation', {
          candidateId,
          error: error.message
        });
        return { valid: false, error: 'Database error' };
      }
    }
    
    logger.warn('Invalid candidate demo token', {
      candidateId,
      expectedToken: expectedToken.substring(0, 20) + '...',
      receivedToken: token.substring(0, 20) + '...'
    });
    return { valid: false, error: 'Invalid token for candidate' };
  }

  logger.warn('Invalid connection parameters', { token: token.substring(0, 10) });
  return { valid: false, error: 'Invalid connection parameters' };
}

/**
 * Check if a token appears to be a JWT
 * @param {string} token - Token to check
 * @returns {boolean} True if token looks like a JWT
 */
function isJWTToken(token) {
  return token && token.split('.').length === 3;
}

/**
 * Check if a token appears to be a legacy demo token
 * @param {string} token - Token to check
 * @returns {boolean} True if token looks like a demo token
 */
function isLegacyToken(token) {
  return token && (token === 'demo-admin-token' || token.startsWith('demo-token-'));
}

module.exports = {
  validateConnection,
  isJWTToken,
  isLegacyToken
};
