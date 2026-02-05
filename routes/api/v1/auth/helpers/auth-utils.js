/**
 * Authentication Utilities
 * Common utility functions for authentication operations
 */

const crypto = require('crypto');
const axios = require('axios');
const logger = require('../../../../../utils/logger');

// Environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

/**
 * Generate a random avatar URL using DiceBear API
 * @param {string} name - User's name for seeding the avatar
 * @returns {string} Avatar URL
 */
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

/**
 * Verify Telegram authentication data
 * @param {object} authData - Telegram auth data
 * @returns {boolean} True if verification passes
 */
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

/**
 * Verify Google ID token
 * @param {string} idToken - Google ID token
 * @returns {object|null} Google user data or null if verification fails
 */
async function verifyGoogleToken(idToken) {
  if (!GOOGLE_CLIENT_ID) {
    logger.error('GOOGLE_CLIENT_ID not configured');
    return null;
  }

  // DEV MODE: Skip backend verification (frontend already verified)
  if (process.env.NODE_ENV !== 'production') {
    logger.warn('🔧 DEV MODE: Skipping Google token verification (trusting frontend)');

    // Decode JWT without verification (dev only!)
    try {
      const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
      return {
        googleId: payload.sub,
        email: payload.email,
        emailVerified: true,
        name: payload.name,
        picture: payload.picture,
        givenName: payload.given_name,
        familyName: payload.family_name,
      };
    } catch (error) {
      logger.error('Failed to decode JWT:', error.message);
      return null;
    }
  }

  // PRODUCTION: Verify with Google API
  try {
    // Use Google's tokeninfo endpoint for verification with axios
    const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo`, {
      params: { id_token: idToken },
      timeout: 10000 // 10 second timeout
    });

    const payload = response.data;

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
    logger.error('Google token verification error:', error.message);
    if (error.response) {
      logger.error('Google API response:', error.response.status, error.response.data);
    }
    return null;
  }
}

/**
 * Process referral for new user
 * @param {string} newCandidateId - New candidate's ID
 * @param {string} newCandidateName - New candidate's name
 * @param {string} referralCode - Referral code provided
 * @returns {string|null} Referrer's name or null if no referral
 */
function processReferral(newCandidateId, newCandidateName, referralCode) {
  if (!referralCode) return null;

  try {
    const { db } = require('../../../../../db');

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

module.exports = {
  generateRandomAvatar,
  verifyTelegramAuth,
  verifyGoogleToken,
  processReferral
};