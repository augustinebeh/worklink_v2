/**
 * Shared constants for WorkLink platform
 * Used by both server and frontend
 */

// Import gamification from the new consolidated location
const gamification = require('./utils/gamification');

// Singapore timezone (GMT+8)
const TIMEZONE = 'Asia/Singapore';
const DEFAULT_LOCALE = 'en-SG';

// Get date string in Singapore timezone (YYYY-MM-DD)
function getSGDateString(date = new Date()) {
  const d = new Date(date);
  return d.toLocaleDateString('en-CA', { timeZone: TIMEZONE }); // en-CA gives YYYY-MM-DD format
}

// Format date with Singapore timezone
function formatDateSG(date, options = { day: 'numeric', month: 'short' }) {
  return new Date(date).toLocaleDateString(DEFAULT_LOCALE, { ...options, timeZone: TIMEZONE });
}

// Re-export gamification constants for backward compatibility
const {
  XP_THRESHOLDS,
  LEVEL_TITLES,
  LEVEL_TIERS,
  calculateLevel,
  calculateLevelProgress,
  getLevelTitle,
  getLevelTier,
  formatXP,
  getXPForNextLevel,
} = gamification;

// CommonJS export for Node.js backend
module.exports = {
  // Timezone utilities
  TIMEZONE,
  DEFAULT_LOCALE,
  getSGDateString,
  formatDateSG,

  // Gamification (re-exported from utils/gamification.js)
  XP_THRESHOLDS,
  LEVEL_TITLES,
  LEVEL_TIERS,
  calculateLevel,
  calculateLevelProgress,
  getLevelTitle,
  getLevelTier,
  formatXP,
  getXPForNextLevel,
};
