/**
 * Telegram Authentication Routes
 * Handles telegram/login, telegram/config, and telegram/debug endpoints
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { verifyTelegramAuth, processReferral, generateRandomAvatar } = require('../helpers/auth-utils');
const { generateDemoToken } = require('../helpers/token-manager');
const logger = require('../../../../../utils/logger');

// Telegram bot token from env
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * POST /telegram/login
 * Telegram Login - authenticate via Telegram widget
 */
router.post('/telegram/login', (req, res) => {
  try {
    const { referralCode, ...telegramData } = req.body;

    logger.info('📱 Telegram login attempt:', {
      id: telegramData.id,
      username: telegramData.username,
      referralCode,
      requestBody: req.body,
      hasHash: !!telegramData.hash,
      authDate: telegramData.auth_date,
      fields: Object.keys(telegramData)
    });

    // Verify the Telegram authentication data
    if (!verifyTelegramAuth(telegramData)) {
      logger.error('❌ Telegram auth verification failed', {
        telegramData,
        botTokenExists: !!TELEGRAM_BOT_TOKEN,
        tokenPrefix: TELEGRAM_BOT_TOKEN ? TELEGRAM_BOT_TOKEN.substring(0, 10) + '...' : 'missing'
      });
      return res.status(401).json({ success: false, error: 'Invalid Telegram authentication' });
    }

    const telegramId = telegramData.id.toString();
    const firstName = telegramData.first_name || '';
    const lastName = telegramData.last_name || '';
    const username = telegramData.username || '';
    const photoUrl = telegramData.photo_url || '';
    const fullName = `${firstName} ${lastName}`.trim() || username || `User ${telegramId}`;

    // Check if user exists by telegram_chat_id
    let candidate = db.prepare('SELECT * FROM candidates WHERE telegram_chat_id = ?').get(telegramId);

    if (candidate) {
      // Existing user - update last login info
      db.prepare(`
        UPDATE candidates SET
          telegram_username = ?,
          profile_photo = COALESCE(NULLIF(?, ''), profile_photo),
          online_status = 'online',
          updated_at = datetime('now')
        WHERE telegram_chat_id = ?
      `).run(username, photoUrl, telegramId);

      candidate = db.prepare('SELECT * FROM candidates WHERE telegram_chat_id = ?').get(telegramId);
      candidate.certifications = JSON.parse(candidate.certifications || '[]');

      logger.info(`✅ Telegram login success: ${candidate.name} (existing user)`);

      return res.json({
        success: true,
        data: candidate,
        token: generateDemoToken(candidate),
        isNewUser: false,
      });
    }

    // New user - create account with pending status
    const id = 'CND' + Date.now().toString(36).toUpperCase();
    const newReferralCode = fullName.split(' ')[0].toUpperCase().slice(0, 4) + Date.now().toString(36).toUpperCase().slice(-4);

    db.prepare(`
      INSERT INTO candidates (
        id, name, telegram_chat_id, telegram_username, status, source,
        referral_code, xp, level, profile_photo, online_status,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, 'pending', 'telegram', ?, 0, 1, ?, 'online', datetime('now'), datetime('now'))
    `).run(id, fullName, telegramId, username, newReferralCode, photoUrl || generateRandomAvatar(fullName));

    // Process referral if code provided
    const referredBy = processReferral(id, fullName, referralCode);

    candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
    candidate.certifications = JSON.parse(candidate.certifications || '[]');

    logger.info(`📱 New Telegram registration: ${fullName} (@${username || 'no username'})${referredBy ? ` - referred by ${referredBy}` : ''}`);

    res.status(201).json({
      success: true,
      data: candidate,
      token: generateDemoToken(candidate),
      isNewUser: true,
      referredBy: referredBy,
      message: 'Account created! Your account is pending approval.',
    });
  } catch (error) {
    logger.error('Telegram login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /telegram/config
 * Get Telegram bot username for the widget
 */
router.get('/telegram/config', (req, res) => {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;

  if (!botUsername) {
    return res.status(500).json({ success: false, error: 'Telegram bot not configured' });
  }

  res.json({
    success: true,
    botUsername: botUsername,
  });
});

/**
 * POST /telegram/debug
 * Telegram Debug - test auth verification (for debugging only)
 */
router.post('/telegram/debug', (req, res) => {
  try {
    const telegramData = req.body;

    logger.info('🔧 Telegram debug request:', {
      body: req.body,
      headers: req.headers,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const verificationResult = verifyTelegramAuth(telegramData);

    res.json({
      success: true,
      debug: {
        receivedData: telegramData,
        verificationPassed: verificationResult,
        botTokenConfigured: !!TELEGRAM_BOT_TOKEN,
        currentTimestamp: Math.floor(Date.now() / 1000)
      }
    });
  } catch (error) {
    logger.error('Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;