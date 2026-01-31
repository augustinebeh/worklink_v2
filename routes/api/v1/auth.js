const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { validate, schemas } = require('../../../middleware/validation');

// Login (simplified - no password for demo)
router.post('/login', (req, res) => {
  try {
    const { email, password, type = 'candidate' } = req.body;

    if (type === 'admin') {
      // Admin login - requires specific credentials
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      if (email === 'admin@talentvis.com' && password === adminPassword) {
        return res.json({
          success: true,
          data: {
            id: 'ADMIN001',
            name: 'Admin',
            email: email,
            role: 'admin',
          },
          token: 'demo-admin-token',
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
      token: `demo-token-${candidate.id}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Worker app login - simplified
router.post('/worker/login', (req, res) => {
  try {
    const { email } = req.body;

    const candidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get(email);
    
    if (!candidate) {
      return res.status(401).json({ success: false, error: 'Email not found. Please contact admin to register.' });
    }

    candidate.certifications = JSON.parse(candidate.certifications || '[]');

    res.json({
      success: true,
      data: candidate,
      token: `demo-token-${candidate.id}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Register new candidate
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

// Get current user
router.get('/me', (req, res) => {
  try {
    // In a real app, you'd verify the token
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (token === 'demo-admin-token') {
      return res.json({
        success: true,
        data: {
          id: 'ADMIN001',
          name: 'Admin',
          email: 'admin@talentvis.com',
          role: 'admin',
        },
      });
    }

    const candidateId = token.replace('demo-token-', '');
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);

    if (!candidate) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    candidate.certifications = JSON.parse(candidate.certifications || '[]');

    res.json({ success: true, data: candidate });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update push token for notifications
router.post('/push-token', (req, res) => {
  try {
    const { candidateId, pushToken } = req.body;

    db.prepare('UPDATE candidates SET push_token = ? WHERE id = ?').run(pushToken, candidateId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
