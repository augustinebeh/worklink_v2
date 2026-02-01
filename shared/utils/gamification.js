/**
 * Gamification constants and utilities
 * Shared across Worker app, Admin app, and Backend
 *
 * 50-level system with exponential growth
 * Max level requires years of active work to achieve
 */

// XP thresholds for each level (index = level - 1)
// Exponential growth: each level requires ~40% more XP than previous
const XP_THRESHOLDS = [
  0,        // Level 1: 0 XP
  100,      // Level 2: 100 XP
  250,      // Level 3: 250 XP
  500,      // Level 4: 500 XP
  850,      // Level 5: 850 XP
  1300,     // Level 6: 1,300 XP
  1900,     // Level 7: 1,900 XP
  2700,     // Level 8: 2,700 XP
  3800,     // Level 9: 3,800 XP
  5200,     // Level 10: 5,200 XP
  7000,     // Level 11: 7,000 XP
  9200,     // Level 12: 9,200 XP
  12000,    // Level 13: 12,000 XP
  15500,    // Level 14: 15,500 XP
  20000,    // Level 15: 20,000 XP
  25500,    // Level 16: 25,500 XP
  32500,    // Level 17: 32,500 XP
  41000,    // Level 18: 41,000 XP
  52000,    // Level 19: 52,000 XP
  65000,    // Level 20: 65,000 XP
  82000,    // Level 21: 82,000 XP
  102000,   // Level 22: 102,000 XP
  127000,   // Level 23: 127,000 XP
  158000,   // Level 24: 158,000 XP
  195000,   // Level 25: 195,000 XP (Milestone)
  240000,   // Level 26
  295000,   // Level 27
  360000,   // Level 28
  440000,   // Level 29
  535000,   // Level 30: 535,000 XP (Milestone)
  650000,   // Level 31
  785000,   // Level 32
  950000,   // Level 33
  1150000,  // Level 34
  1380000,  // Level 35: 1.38M XP (Milestone)
  1660000,  // Level 36
  1990000,  // Level 37
  2380000,  // Level 38
  2850000,  // Level 39
  3400000,  // Level 40: 3.4M XP (Milestone)
  4050000,  // Level 41
  4820000,  // Level 42
  5730000,  // Level 43
  6800000,  // Level 44
  8050000,  // Level 45: 8.05M XP (Milestone)
  9500000,  // Level 46
  11200000, // Level 47
  13200000, // Level 48
  15500000, // Level 49
  18200000, // Level 50: 18.2M XP (Max - Legend status)
];

const LEVEL_TITLES = {
  1: 'Newcomer',
  2: 'Beginner',
  3: 'Learner',
  4: 'Trainee',
  5: 'Junior',
  6: 'Worker',
  7: 'Skilled',
  8: 'Capable',
  9: 'Proficient',
  10: 'Experienced',
  11: 'Competent',
  12: 'Seasoned',
  13: 'Adept',
  14: 'Specialist',
  15: 'Professional',
  16: 'Senior',
  17: 'Advanced',
  18: 'Expert',
  19: 'Veteran',
  20: 'Elite',
  21: 'Elite+',
  22: 'Elite++',
  23: 'Master',
  24: 'Master+',
  25: 'Grandmaster',
  26: 'Grandmaster+',
  27: 'Grandmaster++',
  28: 'Champion',
  29: 'Champion+',
  30: 'Super Champion',
  31: 'Hero',
  32: 'Hero+',
  33: 'Hero++',
  34: 'Super Hero',
  35: 'Mythic',
  36: 'Mythic+',
  37: 'Mythic++',
  38: 'Super Mythic',
  39: 'Immortal',
  40: 'Legendary',
  41: 'Legendary+',
  42: 'Legendary++',
  43: 'Super Legend',
  44: 'Titan',
  45: 'Titan+',
  46: 'Titan++',
  47: 'Demigod',
  48: 'Demigod+',
  49: 'Transcendent',
  50: 'WorkLink God',
};

// Tier colors for different level ranges
const LEVEL_TIERS = {
  bronze: { min: 1, max: 9, color: 'amber' },
  silver: { min: 10, max: 19, color: 'slate' },
  gold: { min: 20, max: 29, color: 'yellow' },
  platinum: { min: 30, max: 39, color: 'cyan' },
  diamond: { min: 40, max: 49, color: 'violet' },
  mythic: { min: 50, max: 50, color: 'rose' },
};

function calculateLevel(xp) {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function calculateLevelProgress(xp, level) {
  const maxLevel = XP_THRESHOLDS.length;
  const safeLevel = Math.min(level || calculateLevel(xp), maxLevel);
  const currentThreshold = XP_THRESHOLDS[safeLevel - 1] || 0;
  const nextThreshold = XP_THRESHOLDS[safeLevel] || XP_THRESHOLDS[maxLevel - 1];

  if (safeLevel >= maxLevel) return 100;

  const xpInLevel = xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  return Math.max(0, Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)));
}

function getLevelTitle(level) {
  return LEVEL_TITLES[level] || LEVEL_TITLES[1];
}

function getLevelTier(level) {
  for (const [tier, range] of Object.entries(LEVEL_TIERS)) {
    if (level >= range.min && level <= range.max) return tier;
  }
  return 'bronze';
}

function formatXP(xp) {
  if (xp >= 1000000) return `${(xp / 1000000).toFixed(1)}M`;
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
  return xp.toString();
}

function getXPForNextLevel(level) {
  const maxLevel = XP_THRESHOLDS.length;
  if (level >= maxLevel) return XP_THRESHOLDS[maxLevel - 1];
  return XP_THRESHOLDS[level] || 0;
}

// CommonJS exports for backend
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
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
}

// ES6 exports for frontend (will be tree-shaken if not used)
export {
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
