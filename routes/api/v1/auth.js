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

    let candidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get(email);

    // Auto-create demo account if it doesn't exist
    if (!candidate && email === 'sarah.tan@email.com') {
      console.log('🎭 Auto-creating demo account: Sarah Tan');
      db.prepare(`
        INSERT INTO candidates (
          id, name, email, phone, status, source,
          xp, level, streak_days, total_jobs_completed,
          certifications, skills, preferred_locations,
          referral_code, referral_tier, total_referral_earnings,
          total_incentives_earned, total_earnings, rating,
          profile_photo, online_status, whatsapp_opted_in, created_at, updated_at
        ) VALUES (
          'CND_DEMO_001', 'Sarah Tan', 'sarah.tan@email.com', '+6591234567',
          'active', 'direct', 15383, 10, 5, 42,
          '["Food Safety", "First Aid", "Customer Service"]',
          '["Customer Service", "Cash Handling", "Event Support", "F&B Service"]',
          '["Central", "East", "West"]',
          'SARAH001', 2, 180.00, 250.00, 8750.00, 4.8,
          'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah%20Tan',
          'online', 1, datetime('now', '-180 days'), datetime('now')
        )
      `).run();

      // Add payment history
      const payments = [
        ['PAY_DEMO_001', 120.00, 0, 120.00, 8.0, 'paid', '-7 days'],
        ['PAY_DEMO_002', 108.00, 20.00, 128.00, 6.0, 'paid', '-14 days'],
        ['PAY_DEMO_003', 160.00, 0, 160.00, 8.0, 'paid', '-21 days'],
        ['PAY_DEMO_004', 110.00, 15.00, 125.00, 5.0, 'pending', '-3 days'],
        ['PAY_DEMO_005', 128.00, 0, 128.00, 8.0, 'approved', '-1 days'],
      ];
      payments.forEach(p => {
        db.prepare(`
          INSERT OR IGNORE INTO payments (id, candidate_id, base_amount, incentive_amount, total_amount, hours_worked, status, created_at)
          VALUES (?, 'CND_DEMO_001', ?, ?, ?, ?, ?, datetime('now', ?))
        `).run(p[0], p[1], p[2], p[3], p[4], p[5], p[6]);
      });

      candidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get(email);
    }

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
