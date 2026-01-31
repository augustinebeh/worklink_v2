/**
 * Shared constants for WorkLink gamification system
 * Used by both server and frontend
 */

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

const XP_THRESHOLDS = [0, 500, 1200, 2500, 5000, 8000, 12000, 18000, 25000, 35000];

const LEVEL_TITLES = {
  1: 'Rookie',
  2: 'Starter',
  3: 'Active',
  4: 'Reliable',
  5: 'Pro',
  6: 'Expert',
  7: 'Elite',
  8: 'Master',
  9: 'Legend',
  10: 'Champion',
};

function calculateLevel(xp) {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function calculateLevelProgress(xp, level) {
  const currentThreshold = XP_THRESHOLDS[level - 1] || 0;
  const nextThreshold = XP_THRESHOLDS[level] || XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
  const xpInLevel = xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  return level >= 10 ? 100 : Math.round((xpInLevel / xpNeeded) * 100);
}

function getLevelTitle(level) {
  return LEVEL_TITLES[level] || LEVEL_TITLES[1];
}

// CommonJS export for Node.js backend
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TIMEZONE,
    DEFAULT_LOCALE,
    getSGDateString,
    formatDateSG,
    XP_THRESHOLDS,
    LEVEL_TITLES,
    calculateLevel,
    calculateLevelProgress,
    getLevelTitle
  };
}
