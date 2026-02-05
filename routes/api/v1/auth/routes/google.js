/**
 * Google Authentication Routes
 * Handles google/login and google/config endpoints
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { verifyGoogleToken, processReferral, generateRandomAvatar } = require('../helpers/auth-utils');
const { generateDemoToken } = require('../helpers/token-manager');
const logger = require('../../../../../utils/logger');

/**
 * POST /google/login
 * Google Login - authenticate via Google Sign-In
 */
router.post('/google/login', async (req, res) => {
  try {
    const { credential, referralCode } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, error: 'No credential provided' });
    }

    logger.info('🔵 Google login attempt', { referralCode });

    // Verify the Google ID token
    const googleUser = await verifyGoogleToken(credential);

    if (!googleUser) {
      logger.warn('❌ Google auth verification failed');
      return res.status(401).json({ success: false, error: 'Invalid Google authentication' });
    }

    const { googleId, email, name, picture, givenName, familyName } = googleUser;
    const fullName = name || `${givenName || ''} ${familyName || ''}`.trim() || email.split('@')[0];

    // Check if user exists by google_id or email
    let candidate = db.prepare('SELECT * FROM candidates WHERE google_id = ? OR email = ?').get(googleId, email);

    if (candidate) {
      // Existing user - update with Google info if needed
      db.prepare(`
        UPDATE candidates SET
          google_id = COALESCE(google_id, ?),
          email = COALESCE(email, ?),
          profile_photo = COALESCE(NULLIF(?, ''), profile_photo),
          online_status = 'online',
          updated_at = datetime('now')
        WHERE id = ?
      `).run(googleId, email, picture, candidate.id);

      candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidate.id);
      candidate.certifications = JSON.parse(candidate.certifications || '[]');

      logger.info(`✅ Google login success: ${candidate.name} (existing user)`);

      return res.json({
        success: true,
        data: candidate,
        token: generateDemoToken(candidate),
        isNewUser: false,
      });
    }

    // New user - create account with pending status
    const id = 'CND' + Date.now().toString(36).toUpperCase();
    const newReferralCode = (givenName || fullName.split(' ')[0]).toUpperCase().slice(0, 4) + Date.now().toString(36).toUpperCase().slice(-4);

    db.prepare(`
      INSERT INTO candidates (
        id, name, email, google_id, status, source,
        referral_code, xp, level, profile_photo, online_status,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, 'pending', 'google', ?, 0, 1, ?, 'online', datetime('now'), datetime('now'))
    `).run(id, fullName, email, googleId, newReferralCode, picture || generateRandomAvatar(fullName));

    // Process referral if code provided
    const referredBy = processReferral(id, fullName, referralCode);

    candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
    candidate.certifications = JSON.parse(candidate.certifications || '[]');

    logger.info(`🔵 New Google registration: ${fullName} (${email})${referredBy ? ` - referred by ${referredBy}` : ''}`);

    res.status(201).json({
      success: true,
      data: candidate,
      token: generateDemoToken(candidate),
      isNewUser: true,
      referredBy: referredBy,
      message: 'Account created! Your account is pending approval.',
    });
  } catch (error) {
    logger.error('Google login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /google/config
 * Get Google Client ID for the frontend
 */
router.get('/google/config', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
    return res.status(500).json({ success: false, error: 'Google OAuth not configured' });
  }

  res.json({
    success: true,
    clientId: clientId,
  });
});

module.exports = router;