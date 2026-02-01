const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { validate, schemas } = require('../../../middleware/validation');
const logger = require('../../../utils/logger');

// Login (simplified - no password for demo)
router.post('/login', (req, res) => {
  try {
    const { email, password, type = 'candidate' } = req.body;

    if (type === 'admin') {
      // Admin login - requires specific credentials from environment
      const adminPassword = process.env.ADMIN_PASSWORD;
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@talentvis.com';

      if (!adminPassword) {
        logger.error('SECURITY: ADMIN_PASSWORD environment variable not set');
        return res.status(500).json({ success: false, error: 'Server configuration error' });
      }

      if (email === adminEmail && password === adminPassword) {
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
    const { email, phone } = req.body;

    let candidate;
    
    // Support login by phone (Telegram users) or email
    if (phone) {
      candidate = db.prepare('SELECT * FROM candidates WHERE phone = ?').get(phone);
    } else if (email) {
      candidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get(email);
    }

    // Demo account handling - create or update Sarah Tan
    if (email === 'sarah.tan@email.com') {
      if (!candidate) {
        // Create new demo account
        logger.info('🎭 Creating demo account: Sarah Tan');
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
            'active', 'direct', 15500, 14, 5, 42,
            '["Food Safety", "First Aid", "Customer Service"]',
            '["Customer Service", "Cash Handling", "Event Support", "F&B Service"]',
            '["Central", "East", "West"]',
            'SARAH001', 2, 180.00, 250.00, 661.00, 4.8,
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah%20Tan',
            'online', 1, datetime('now', '-180 days'), datetime('now')
          )
        `).run();
      } else {
        // Update existing demo account with correct values
        logger.info('🔄 Updating demo account: Sarah Tan');
        db.prepare(`
          UPDATE candidates SET
            xp = 15500,
            level = 14,
            total_earnings = 661.00,
            total_jobs_completed = 42,
            streak_days = 5,
            rating = 4.8,
            updated_at = datetime('now')
          WHERE email = 'sarah.tan@email.com'
        `).run();
      }

      // Refresh candidate data to get the ID
      candidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get(email);

      // Ensure payment history exists (only if candidate was created successfully)
      if (candidate) {
        try {
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
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
            `).run(p[0], candidate.id, p[1], p[2], p[3], p[4], p[5], p[6]);
          });
        } catch (paymentErr) {
          logger.info('⚠️ Could not create demo payments:', paymentErr.message);
        }
      }
    }

    if (!candidate) {
      const loginMethod = phone ? 'phone number' : 'email';
      return res.status(401).json({ success: false, error: `${loginMethod} not found. Please sign up first.` });
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

// Register new candidate (email-based)
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

// Register via Telegram (phone-based, no email required)
router.post('/register/telegram', (req, res) => {
  try {
    const { name, phone, telegram_username } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Name and phone number are required' });
    }

    // Validate phone format (Singapore format: +65XXXXXXXX or 65XXXXXXXX or 8/9XXXXXXX)
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    let normalizedPhone = cleanPhone;
    
    if (cleanPhone.startsWith('+65')) {
      normalizedPhone = cleanPhone;
    } else if (cleanPhone.startsWith('65')) {
      normalizedPhone = '+' + cleanPhone;
    } else if (cleanPhone.match(/^[89]\d{7}$/)) {
      normalizedPhone = '+65' + cleanPhone;
    } else {
      return res.status(400).json({ success: false, error: 'Please enter a valid Singapore phone number' });
    }

    // Check if phone exists
    const existingPhone = db.prepare('SELECT id FROM candidates WHERE phone = ?').get(normalizedPhone);
    if (existingPhone) {
      return res.status(400).json({ success: false, error: 'Phone number already registered. Please login instead.' });
    }

    // Check if telegram username exists (if provided)
    if (telegram_username) {
      const existingTelegram = db.prepare('SELECT id FROM candidates WHERE telegram_username = ?').get(telegram_username);
      if (existingTelegram) {
        return res.status(400).json({ success: false, error: 'Telegram username already registered' });
      }
    }

    const id = 'CND' + Date.now().toString(36).toUpperCase();
    const referralCode = name.split(' ')[0].toUpperCase() + Date.now().toString(36).toUpperCase().slice(-4);

    db.prepare(`
      INSERT INTO candidates (
        id, name, phone, telegram_username, status, source, referral_code, 
        xp, level, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, 'pending', 'telegram', ?, 0, 1, datetime('now'), datetime('now'))
    `).run(id, name.trim(), normalizedPhone, telegram_username || null, referralCode);

    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
    candidate.certifications = JSON.parse(candidate.certifications || '[]');

    logger.info(`📱 New Telegram registration: ${name} (${normalizedPhone})`);

    res.status(201).json({
      success: true,
      data: candidate,
      token: `demo-token-${candidate.id}`,
      message: 'Registration successful! Your account is pending approval.',
    });
  } catch (error) {
    logger.error('Telegram registration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login via phone (for Telegram users)
router.post('/worker/login/phone', (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    // Normalize phone number
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    let normalizedPhone = cleanPhone;
    
    if (cleanPhone.startsWith('+65')) {
      normalizedPhone = cleanPhone;
    } else if (cleanPhone.startsWith('65')) {
      normalizedPhone = '+' + cleanPhone;
    } else if (cleanPhone.match(/^[89]\d{7}$/)) {
      normalizedPhone = '+65' + cleanPhone;
    }

    const candidate = db.prepare('SELECT * FROM candidates WHERE phone = ?').get(normalizedPhone);

    if (!candidate) {
      return res.status(401).json({ success: false, error: 'Phone number not found. Please sign up first.' });
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
