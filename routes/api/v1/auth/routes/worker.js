/**
 * Worker Authentication Routes
 * Handles worker app login endpoint
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { generateToken } = require('../helpers/token-manager');
const logger = require('../../../../../utils/logger');

/**
 * POST /worker/login
 * Worker app login - simplified
 */
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
      token: generateToken(candidate),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;