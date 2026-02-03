const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../../../db');
const { validate, schemas } = require('../../../middleware/validation');
const { generateToken, generateAdminToken, authenticateToken } = require('../../../middleware/auth');
const logger = require('../../../utils/logger');

// Telegram bot token from env
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Random default avatar generator
function generateRandomAvatar(name) {
  // DiceBear avatar styles - variety of fun, professional avatars
  const styles = [
    'avataaars',
    'avataaars-neutral', 
    'bottts',
    'fun-emoji',
    'lorelei',
    'lorelei-neutral',
    'micah',
    'miniavs',
    'notionists',
    'notionists-neutral',
    'open-peeps',
    'personas',
    'pixel-art',
    'pixel-art-neutral',
    'thumbs',
  ];
  
  // Pick a random style
  const style = styles[Math.floor(Math.random() * styles.length)];
  
  // Add random seed variation for more uniqueness
  const seed = `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

// Verify Telegram Login data
function verifyTelegramAuth(authData) {
  logger.info('🔍 Starting Telegram auth verification');

  if (!TELEGRAM_BOT_TOKEN) {
    logger.error('TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  const { hash, ...data } = authData;
  logger.info('📊 Auth data analysis:', {
    providedHash: hash,
    fields: Object.keys(data),
    authData: data
  });

  // Check auth_date is not too old (within 1 day)
  const authDate = parseInt(data.auth_date);
  const now = Math.floor(Date.now() / 1000);
  const ageDays = (now - authDate) / 86400;

  logger.info('⏰ Timestamp validation:', {
    authDate,
    currentTime: now,
    ageDays: ageDays.toFixed(2),
    isValid: now - authDate <= 86400
  });

  if (now - authDate > 86400) {
    logger.warn('❌ Telegram auth data expired (older than 24 hours)');
    return false;
  }

  // Create data check string
  const checkString = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n');

  logger.info('🔑 Hash calculation:', {
    checkString,
    tokenPrefix: TELEGRAM_BOT_TOKEN.substring(0, 10) + '...'
  });

  // Create secret key from bot token
  const secretKey = crypto
    .createHash('sha256')
    .update(TELEGRAM_BOT_TOKEN)
    .digest();

  // Calculate hash
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex');

  const isValid = calculatedHash === hash;

  logger.info('🎯 Hash verification result:', {
    calculatedHash,
    providedHash: hash,
    match: isValid
  });

  return isValid;
}

// Verify Google ID token
async function verifyGoogleToken(idToken) {
  if (!GOOGLE_CLIENT_ID) {
    logger.error('GOOGLE_CLIENT_ID not configured');
    return null;
  }

  try {
    // Use Google's tokeninfo endpoint for verification
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    
    if (!response.ok) {
      logger.warn('Google token verification failed');
      return null;
    }

    const payload = await response.json();

    // Verify the token is for our app
    if (payload.aud !== GOOGLE_CLIENT_ID) {
      logger.warn('Google token audience mismatch');
      return null;
    }

    // Check token is not expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && parseInt(payload.exp) < now) {
      logger.warn('Google token expired');
      return null;
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === 'true',
      name: payload.name,
      picture: payload.picture,
      givenName: payload.given_name,
      familyName: payload.family_name,
    };
  } catch (error) {
    logger.error('Google token verification error:', error);
    return null;
  }
}

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
      token: generateToken(candidate),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to process referral for new user
function processReferral(newCandidateId, newCandidateName, referralCode) {
  if (!referralCode) return null;

  try {
    // Find the referrer by their referral code
    const referrer = db.prepare('SELECT id, name FROM candidates WHERE referral_code = ?').get(referralCode);
    if (!referrer) {
      logger.warn(`Invalid referral code: ${referralCode}`);
      return null;
    }

    // Update the new candidate's referred_by field
    db.prepare('UPDATE candidates SET referred_by = ? WHERE id = ?').run(referrer.id, newCandidateId);

    // Create referral record
    const refId = 'REF' + Date.now().toString(36).toUpperCase();
    const tier1Bonus = db.prepare('SELECT bonus_amount FROM referral_tiers WHERE tier_level = 1').get();
    const bonusAmount = tier1Bonus?.bonus_amount || 25;

    db.prepare(`
      INSERT INTO referrals (id, referrer_id, referred_id, status, tier, bonus_amount)
      VALUES (?, ?, ?, 'registered', 1, ?)
    `).run(refId, referrer.id, newCandidateId, bonusAmount);

    // Notify the referrer
    db.prepare(`
      INSERT INTO notifications (candidate_id, type, title, message, data)
      VALUES (?, 'referral', 'New Referral! 🎉', ?, ?)
    `).run(
      referrer.id,
      `${newCandidateName} just signed up using your code! You'll earn $${bonusAmount} when they complete their first job.`,
      JSON.stringify({ referred_id: newCandidateId, referred_name: newCandidateName })
    );

    logger.info(`✅ Referral processed: ${newCandidateName} referred by ${referrer.name}`);
    return referrer.name;
  } catch (error) {
    logger.error('Referral processing error:', error);
    return null;
  }
}

// Telegram Login - authenticate via Telegram widget
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
        token: `demo-token-${candidate.id}`,
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
      token: `demo-token-${candidate.id}`,
      isNewUser: true,
      referredBy: referredBy,
      message: 'Account created! Your account is pending approval.',
    });
  } catch (error) {
    logger.error('Telegram login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Telegram bot username for the widget
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

// Telegram Debug - test auth verification (for debugging only)
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

// Google Login - authenticate via Google Sign-In
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
        token: `demo-token-${candidate.id}`,
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
      token: `demo-token-${candidate.id}`,
      isNewUser: true,
      referredBy: referredBy,
      message: 'Account created! Your account is pending approval.',
    });
  } catch (error) {
    logger.error('Google login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Google Client ID for the frontend
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

// Get current user
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
