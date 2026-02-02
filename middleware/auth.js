const jwt = require('jsonwebtoken');
const { db } = require('../db');
const logger = require('../utils/logger');

// JWT secret - in production, use a strong secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'worklink-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token for a candidate
 * @param {Object} candidate - Candidate object with id, email, name
 * @returns {string} JWT token
 */
function generateToken(candidate) {
  return jwt.sign(
    {
      id: candidate.id,
      email: candidate.email,
      name: candidate.name,
      role: 'candidate'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
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
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token payload or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.warn('Token verification failed', { error: error.message });
    return null;
  }
}

/**
 * Authentication middleware for protecting routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }

  // Add user info to request object
  req.user = decoded;
  next();
}

/**
 * Authentication middleware that allows both admin and candidate access
 */
function authenticateAny(req, res, next) {
  authenticateToken(req, res, next);
}

/**
 * Authentication middleware for admin-only access
 */
function authenticateAdmin(req, res, next) {
  authenticateToken(req, res, (err) => {
    if (err) return next(err);

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
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
 * Optional authentication - sets req.user if token is valid, but doesn't block if invalid
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }

  next();
}

/**
 * Legacy token support for migration period
 * Supports both JWT tokens and old demo tokens
 * TODO: Remove after migration to JWT
 */
function legacyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  // Try JWT first
  const decoded = verifyToken(token);
  if (decoded) {
    req.user = decoded;
    return next();
  }

  // Fall back to legacy demo tokens (temporary)
  if (token === 'demo-admin-token') {
    req.user = {
      id: 'ADMIN001',
      email: 'admin@talentvis.com',
      name: 'Admin',
      role: 'admin'
    };
    return next();
  }

  if (token.startsWith('demo-token-')) {
    const candidateId = token.replace('demo-token-', '');
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);

    if (candidate) {
      req.user = {
        id: candidate.id,
        email: candidate.email,
        name: candidate.name,
        role: 'candidate'
      };
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid or expired token'
  });
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