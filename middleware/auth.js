/**
 * Enhanced Authentication Middleware
 *
 * Provides comprehensive authentication and authorization
 * with support for different user types and permissions.
 */

const jwt = require('jsonwebtoken');
const { db } = require('../db');
const logger = require('../utils/logger');

// JWT secret from environment - NO FALLBACK (must be configured)
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

if (!JWT_SECRET) {
  logger.error('CRITICAL: JWT_SECRET environment variable is not set. Authentication will not work.');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
}

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'candidate',
    type: user.type || 'candidate' // candidate, admin, support
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'worklink-v2',
    audience: 'worklink-users'
  });
}

/**
 * Generate JWT token for admin
 * @param {Object} admin - Admin object with id, email, name
 * @returns {string} JWT token
 */
function generateAdminToken(admin) {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: 'admin'
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'worklink-v2',
      audience: 'worklink-users'
    }
  );
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 */
function verifyToken(token) {
  try {
    if (!JWT_SECRET) {
      logger.error('Cannot verify token: JWT_SECRET not configured');
      return null;
    }

    return jwt.verify(token, JWT_SECRET, {
      issuer: 'worklink-v2',
      audience: 'worklink-users'
    });
  } catch (error) {
    // Return null instead of throwing to prevent server crashes
    return null;
  }
}

/**
 * Extract token from request
 * @param {Object} req - Express request object
 * @returns {string|null} Token or null
 */
function extractToken(req) {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie (for web app)
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  return null;
}

/**
 * Get user details from database
 * @param {string} userId - User ID
 * @param {string} userType - User type (candidate, admin, support)
 * @returns {Object|null} User object or null
 */
function getUserFromDatabase(userId, userType = 'candidate') {
  try {
    let user = null;

    if (userType === 'candidate') {
      user = db.prepare(`
        SELECT id, name, email, status, created_at,
               'candidate' as role, 'candidate' as type
        FROM candidates
        WHERE id = ?
      `).get(userId);
    } else if (userType === 'admin' || userType === 'support') {
      // Admin users are verified by JWT role claim issued during login.
      // Only ADMIN001 (the env-configured admin) is a valid admin ID.
      if (userId === 'ADMIN001') {
        user = {
          id: userId,
          name: 'Admin',
          email: process.env.ADMIN_EMAIL || 'admin@worklink.sg',
          role: 'admin',
          type: 'admin',
          status: 'active'
        };
      }
    }

    return user;
  } catch (error) {
    logger.error('Database error in getUserFromDatabase', { error: error.message });
    return null;
  }
}

/**
 * Basic authentication middleware
 * Verifies token and attaches user to request
 */
function authenticateUser(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token',
        code: 'INVALID_TOKEN'
      });
    }

    // Get user from database
    const user = getUserFromDatabase(decoded.id, decoded.type || decoded.role);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user is active
    if (user.status !== 'active' && user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Account is not active',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Attach user to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token',
      code: 'INVALID_TOKEN',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Alias for backward compatibility
function authenticateToken(req, res, next) {
  return authenticateUser(req, res, next);
}

/**
 * Optional authentication middleware
 * Attaches user if token is present but doesn't require it
 */
function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = getUserFromDatabase(decoded.id, decoded.type);

        if (user && user.status === 'active') {
          req.user = user;
          req.token = token;
        }
      }
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}

/**
 * Authentication middleware that allows both admin and candidate access
 */
function authenticateAny(req, res, next) {
  authenticateUser(req, res, next);
}

/**
 * Admin authentication middleware
 * Requires user to be authenticated and have admin role
 */
function authenticateAdmin(req, res, next) {
  authenticateUser(req, res, () => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    next();
  });
}

/**
 * Authentication middleware for candidate-only access
 */
function authenticateCandidate(req, res, next) {
  authenticateToken(req, res, (err) => {
    if (err) return next(err);

    if (req.user.role !== 'candidate') {
      return res.status(403).json({
        success: false,
        error: 'Candidate access required'
      });
    }

    next();
  });
}

/**
 * Middleware to ensure candidate can only access their own data
 */
function authenticateCandidateOwnership(req, res, next) {
  authenticateCandidate(req, res, (err) => {
    if (err) return next(err);

    const candidateId = req.params.id || req.params.candidateId || req.body.candidate_id;

    if (candidateId && candidateId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Can only access your own data'
      });
    }

    next();
  });
}

/**
 * Middleware that allows admin access or candidate own-data access
 */
function authenticateAdminOrOwner(req, res, next) {
  authenticateToken(req, res, (err) => {
    if (err) return next(err);

    const candidateId = req.params.id || req.params.candidateId || req.body.candidate_id;

    // Admin can access anything
    if (req.user.role === 'admin') {
      return next();
    }

    // Candidates can only access their own data
    if (req.user.role === 'candidate' && candidateId && candidateId === req.user.id) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  });
}

/**
 * Legacy auth - now delegates to standard authenticateUser
 * Kept for backward compatibility of imports only
 */
function legacyAuth(req, res, next) {
  return authenticateUser(req, res, next);
}

module.exports = {
  generateToken,
  generateAdminToken,
  verifyToken,
  authenticateToken,
  authenticateAny,
  authenticateAdmin,
  authenticateCandidate,
  authenticateCandidateOwnership,
  authenticateAdminOrOwner,
  optionalAuth,
  legacyAuth,
  JWT_SECRET
};