/**
 * Core Authentication Routes
 * Handles login, register, and me endpoints
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { safeJsonParse } = require('../../../../../db/utils/db-helpers');
const crypto = require('crypto');
const { validate, schemas } = require('../helpers/validation');
const { generateToken, generateAdminToken, authenticateToken } = require('../helpers/token-manager');
const logger = require('../../../../../utils/logger');

/**
 * Hash a password using scrypt (NIST-recommended KDF)
 * Returns format: scrypt:<salt>:<hash> for new passwords
 * Supports legacy SHA-256 verification for migration
 */
const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function hashPassword(password, salt = '') {
  const scryptSalt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, scryptSalt, SCRYPT_KEYLEN, SCRYPT_COST);
  return `scrypt:${scryptSalt}:${derived.toString('hex')}`;
}

function verifyPassword(password, storedHash, legacySalt = '') {
  if (storedHash.startsWith('scrypt:')) {
    const [, salt, hash] = storedHash.split(':');
    const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_COST);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derived);
  }
  // Legacy SHA-256 verification for migration
  const legacyHash = crypto.createHash('sha256').update(password + legacySalt).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(legacyHash, 'hex'));
}

/**
 * POST /login
 * Core login for candidates and admins
 */
router.post('/login', (req, res) => {
  try {
    const { email, password, type = 'candidate' } = req.body;

    if (type === 'admin') {
      // Admin login - requires specific credentials from environment
      const adminPassword = process.env.ADMIN_PASSWORD;
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@worklink.sg';

      if (!adminPassword) {
        logger.error('SECURITY: ADMIN_PASSWORD environment variable not set');
        return res.status(500).json({ success: false, error: 'Server configuration error' });
      }

      if (email === adminEmail && password === adminPassword) {
        const admin = {
          id: 'ADMIN001',
          name: 'Admin',
          email: email,
          role: 'admin',
        };

        return res.json({
          success: true,
          data: admin,
          token: generateAdminToken(admin),
        });
      }
      return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
    }

    // Candidate login - require password
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    const candidate = db.prepare('SELECT * FROM candidates WHERE LOWER(email) = LOWER(?)').get(email);

    if (!candidate) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Verify password if candidate has one set
    if (candidate.password_hash) {
      if (!verifyPassword(password, candidate.password_hash, candidate.id)) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
      // Migrate legacy SHA-256 hash to scrypt on successful login
      if (!candidate.password_hash.startsWith('scrypt:')) {
        const newHash = hashPassword(password);
        db.prepare('UPDATE candidates SET password_hash = ? WHERE id = ?').run(newHash, candidate.id);
        logger.info(`Migrated password hash to scrypt for: ${candidate.id}`);
      }
    } else {
      // Legacy accounts without password - set the password on first login
      const newHash = hashPassword(password);
      db.prepare('UPDATE candidates SET password_hash = ? WHERE id = ?').run(newHash, candidate.id);
      logger.info(`Password set for legacy account: ${candidate.id}`);
    }

    candidate.certifications = safeJsonParse(candidate.certifications, []);

    res.json({
      success: true,
      data: candidate,
      token: generateToken(candidate),
    });
  } catch (error) {
    logger.error('Login error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /register
 * Register new candidate (email-based)
 */
router.post('/register', validate(schemas.registration), (req, res) => {
  try {
    const { name, email, phone, date_of_birth, password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    // Check if email exists (case-insensitive)
    const existing = db.prepare('SELECT id FROM candidates WHERE LOWER(email) = LOWER(?)').get(email);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const id = 'CND' + Date.now().toString(36).toUpperCase();
    const referralCode = name.split(' ')[0].toUpperCase() + Date.now().toString(36).toUpperCase().slice(-4);
    const passwordHash = hashPassword(password);

    db.prepare(`
      INSERT INTO candidates (id, name, email, phone, date_of_birth, status, source, referral_code, password_hash)
      VALUES (?, ?, ?, ?, ?, 'lead', 'app', ?, ?)
    `).run(id, name, email, phone, date_of_birth, referralCode, passwordHash);

    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
    candidate.certifications = safeJsonParse(candidate.certifications, []);

    res.status(201).json({
      success: true,
      data: candidate,
      token: generateToken(candidate),
    });
  } catch (error) {
    logger.error('Registration error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /me
 * Get current user
 */
router.get('/me', authenticateToken, (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.json({
        success: true,
        data: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
        },
      });
    }

    // For candidates, get fresh data from database
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.user.id);

    if (!candidate) {
      return res.status(401).json({ success: false, error: 'Candidate not found' });
    }

    candidate.certifications = safeJsonParse(candidate.certifications, []);

    res.json({ success: true, data: candidate });
  } catch (error) {
    logger.error('Auth route error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});


/**
 * GET /verify
 * Verify token and return user data
 */
router.get('/verify', authenticateToken, (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.json({
        success: true,
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
        },
        data: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
        },
      });
    }

    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.user.id);
    if (!candidate) {
      return res.status(401).json({ success: false, error: 'Candidate not found' });
    }
    candidate.certifications = safeJsonParse(candidate.certifications, []);
    res.json({ success: true, user: candidate, data: candidate });
  } catch (error) {
    logger.error('Auth route error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
