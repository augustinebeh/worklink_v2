/**
 * Core Authentication Routes
 * Handles login, register, and me endpoints
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { validate, schemas } = require('../helpers/validation');
const { generateToken, generateAdminToken, authenticateToken } = require('../helpers/token-manager');
const logger = require('../../../../../utils/logger');

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

    // Candidate login
    const candidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get(email);

    if (!candidate) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    candidate.certifications = JSON.parse(candidate.certifications || '[]');

    res.json({
      success: true,
      data: candidate,
      token: generateToken(candidate),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /register
 * Register new candidate (email-based)
 */
router.post('/register', validate(schemas.registration), (req, res) => {
  try {
    const { name, email, phone, date_of_birth } = req.body;

    // Check if email exists
    const existing = db.prepare('SELECT id FROM candidates WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const id = 'CND' + Date.now().toString(36).toUpperCase();
    const referralCode = name.split(' ')[0].toUpperCase() + Date.now().toString(36).toUpperCase().slice(-4);

    db.prepare(`
      INSERT INTO candidates (id, name, email, phone, date_of_birth, status, source, referral_code)
      VALUES (?, ?, ?, ?, ?, 'lead', 'app', ?)
    `).run(id, name, email, phone, date_of_birth, referralCode);

    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
    candidate.certifications = JSON.parse(candidate.certifications || '[]');

    res.status(201).json({
      success: true,
      data: candidate,
      token: `demo-token-${candidate.id}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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

    candidate.certifications = JSON.parse(candidate.certifications || '[]');

    res.json({ success: true, data: candidate });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
    candidate.certifications = JSON.parse(candidate.certifications || '[]');
    res.json({ success: true, user: candidate, data: candidate });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
