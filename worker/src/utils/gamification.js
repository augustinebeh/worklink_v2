/**
 * WorkLink v2: "The Career Ladder" Gamification System
 *
 * Philosophy: Reward reliability and quality, not just hours worked.
 * Dual-Loop System:
 *   - Short Loop (Daily/Weekly): Quests and Streaks to form habits
 *   - Long Loop (Career Path): Tiers and Unlockables for retention
 *
 * Leveling Formula: XP_required = 500 × (Level ^ 1.5)
 */

// ============================================
// XP VALUES - The Economy
// ============================================
export const XP_VALUES = {
  // Positive Actions
  PER_HOUR_WORKED: 100,      // Base income: 1 hour ≈ 100 XP
  ON_TIME_ARRIVAL: 50,       // GPS-verified punctuality bonus
  FIVE_STAR_RATING: 200,     // Quality incentive
  URGENT_JOB_MULTIPLIER: 1.5, // Multiplier for urgent/last-minute jobs
  TRAINING_MODULE: 500,      // One-time boost per module
  REFERRAL_ACTIVE: 1000,     // Released after referee completes 1st job

  // Penalties (Loss aversion is stronger than gain motivation)
  NO_SHOW_PENALTY: -500,
  LATE_CANCEL_PENALTY: -500,
};

// ============================================
// LEVELING SYSTEM
// ============================================

/**
 * Calculate XP required for a specific level
 * Formula: 500 × (Level ^ 1.5)
 *
 * Progression curve:
 * - Levels 1-5: Achievable in first week (The Hook)
 * - Levels 6-20: Requires consistent monthly work (The Grind)
 * - Levels 21+: Requires months/years of loyalty (The Prestige)
 */
export function getXPForLevel(level) {
  if (level <= 1) return 0;
  return Math.floor(500 * Math.pow(level, 1.5));
}

/**
 * Generate XP thresholds for all levels up to max
 * Using dynamic calculation instead of hardcoded array
 */
export function generateXPThresholds(maxLevel = 100) {
  const thresholds = [];
  for (let i = 1; i <= maxLevel; i++) {
    thresholds.push(getXPForLevel(i));
  }
  return thresholds;
}

// Pre-calculated thresholds for performance (up to level 100)
export const XP_THRESHOLDS = generateXPThresholds(100);

/**
 * Calculate level from total XP
 */
export function calculateLevel(xp) {
  if (xp <= 0) return 1;

  // Binary search for efficiency
  let low = 1;
  let high = XP_THRESHOLDS.length;

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (getXPForLevel(mid) <= xp) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return low;
}

/**
 * Calculate progress percentage within current level
 */
export function calculateLevelProgress(xp, level) {
  const currentThreshold = getXPForLevel(level);
  const nextThreshold = getXPForLevel(level + 1);

  const xpInLevel = xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;

  if (xpNeeded <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)));
}

/**
 * Get XP needed to reach next level
 */
export function getXPToNextLevel(xp, level) {
  const nextThreshold = getXPForLevel(level + 1);
  return Math.max(0, nextThreshold - xp);
}

// ============================================
// 6-TIER SYSTEM
// ============================================

/**
 * Tier definitions with level ranges and benefits
 * Visual status is vital in a community-driven app
 */
export const TIERS = {
  bronze: {
    name: 'Bronze',
    min: 1,
    max: 9,
    color: 'amber',
    benefits: ['Access to standard jobs'],
    visual: 'Simple, matte bronze ring',
  },
  silver: {
    name: 'Silver',
    min: 10,
    max: 24,
    color: 'slate',
    benefits: ['Priority Access: See jobs 15 mins before Bronze'],
    visual: 'Metallic silver + shine effect',
  },
  gold: {
    name: 'Gold',
    min: 25,
    max: 49,
    color: 'yellow',
    benefits: ['Priority Access: See jobs 1 hour early', 'Instant Payouts'],
    visual: 'Gold + sparkle particle effect',
  },
  platinum: {
    name: 'Platinum',
    min: 50,
    max: 74,
    color: 'cyan',
    benefits: ['VIP Support: Direct line to Admin', 'Profile badge'],
    visual: 'Glowing blue/white neon pulse',
  },
  diamond: {
    name: 'Diamond',
    min: 75,
    max: 99,
    color: 'violet',
    benefits: ['Revenue Share: Lower platform commission'],
    visual: 'Prismatic refraction animation',
  },
  mythic: {
    name: 'Mythic',
    min: 100,
    max: Infinity,
    color: 'rose',
    benefits: ['Hall of Fame: Global Leaderboard permanence', 'Merch pack'],
    visual: 'Dark matter/Purple flame effect',
  },
};

/**
 * Get tier from level
 */
export function getLevelTier(level) {
  if (level >= 100) return 'mythic';
  if (level >= 75) return 'diamond';
  if (level >= 50) return 'platinum';
  if (level >= 25) return 'gold';
  if (level >= 10) return 'silver';
  return 'bronze';
}

/**
 * Get tier info object
 */
export function getTierInfo(level) {
  const tierKey = getLevelTier(level);
  return { key: tierKey, ...TIERS[tierKey] };
}

/**
 * Get tier benefits for a level
 */
export function getTierBenefits(level) {
  const tier = getTierInfo(level);
  return tier.benefits || [];
}

// ============================================
// LEVEL TITLES
// ============================================

export const LEVEL_TITLES = {
  // Bronze Tier (1-9)
  1: 'Newcomer',
  2: 'Beginner',
  3: 'Trainee',
  4: 'Apprentice',
  5: 'Junior Worker',
  6: 'Worker',
  7: 'Skilled Worker',
  8: 'Reliable Worker',
  9: 'Trusted Worker',

  // Silver Tier (10-24)
  10: 'Silver Member',
  11: 'Experienced',
  12: 'Competent',
  13: 'Proficient',
  14: 'Seasoned',
  15: 'Senior Worker',
  16: 'Specialist',
  17: 'Expert',
  18: 'Veteran',
  19: 'Silver Elite',
  20: 'Master Worker',
  21: 'Senior Master',
  22: 'Grand Master',
  23: 'Silver Champion',
  24: 'Silver Legend',

  // Gold Tier (25-49)
  25: 'Gold Member',
  30: 'Gold Elite',
  35: 'Gold Master',
  40: 'Gold Champion',
  45: 'Gold Legend',
  49: 'Gold Supreme',

  // Platinum Tier (50-74)
  50: 'Platinum Member',
  55: 'Platinum Elite',
  60: 'Platinum Master',
  65: 'Platinum Champion',
  70: 'Platinum Legend',
  74: 'Platinum Supreme',

  // Diamond Tier (75-99)
  75: 'Diamond Member',
  80: 'Diamond Elite',
  85: 'Diamond Master',
  90: 'Diamond Champion',
  95: 'Diamond Legend',
  99: 'Diamond Supreme',

  // Mythic Tier (100+)
  100: 'Mythic',
};

/**
 * Get title for a level (with interpolation for unlisted levels)
 */
export function getLevelTitle(level) {
  if (LEVEL_TITLES[level]) return LEVEL_TITLES[level];

  // Find nearest lower defined title
  const definedLevels = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => a - b);
  for (let i = definedLevels.length - 1; i >= 0; i--) {
    if (definedLevels[i] <= level) {
      return LEVEL_TITLES[definedLevels[i]];
    }
  }

  return 'Newcomer';
}

// ============================================
// ACHIEVEMENT CATEGORIES
// ============================================

export const ACHIEVEMENT_CATEGORIES = {
  reliable: {
    name: 'The Reliable',
    description: 'Attendance Focused',
    achievements: ['ironclad_1', 'ironclad_2', 'ironclad_3', 'early_bird', 'the_closer'],
  },
  skilled: {
    name: 'The Skilled',
    description: 'Performance Focused',
    achievements: ['five_star_general', 'jack_of_all_trades', 'certified_pro'],
  },
  social: {
    name: 'The Social',
    description: 'Community Focused',
    achievements: ['headhunter'],
  },
};

// ============================================
// QUEST TYPES
// ============================================

export const QUEST_TYPES = {
  daily: {
    name: 'Daily',
    resetTime: '00:00',
    color: 'blue',
  },
  weekly: {
    name: 'Weekly',
    resetDay: 'Monday',
    color: 'purple',
  },
  special: {
    name: 'Special',
    color: 'amber',
  },
  repeatable: {
    name: 'Repeatable',
    color: 'green',
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format XP number with commas
 */
export function formatXP(xp) {
  return xp.toLocaleString();
}

/**
 * Calculate XP earned for a completed job
 */
export function calculateJobXP(hours, isUrgent = false, wasOnTime = false, rating = null) {
  let xp = hours * XP_VALUES.PER_HOUR_WORKED;

  if (isUrgent) {
    xp *= XP_VALUES.URGENT_JOB_MULTIPLIER;
  }

  if (wasOnTime) {
    xp += XP_VALUES.ON_TIME_ARRIVAL;
  }

  if (rating === 5) {
    xp += XP_VALUES.FIVE_STAR_RATING;
  }

  return Math.floor(xp);
}

/**
 * Check if user qualifies for tier benefits
 */
export function hasTierBenefit(level, benefit) {
  const tier = getLevelTier(level);

  switch (benefit) {
    case 'priority_15min':
      return ['silver', 'gold', 'platinum', 'diamond', 'mythic'].includes(tier);
    case 'priority_1hour':
      return ['gold', 'platinum', 'diamond', 'mythic'].includes(tier);
    case 'instant_payout':
      return ['gold', 'platinum', 'diamond', 'mythic'].includes(tier);
    case 'vip_support':
      return ['platinum', 'diamond', 'mythic'].includes(tier);
    case 'revenue_share':
      return ['diamond', 'mythic'].includes(tier);
    case 'hall_of_fame':
      return tier === 'mythic';
    default:
      return false;
  }
}

/**
 * Get job visibility delay based on tier (in minutes)
 * Higher tiers see jobs earlier
 */
export function getJobVisibilityDelay(level) {
  const tier = getLevelTier(level);

  switch (tier) {
    case 'mythic':
    case 'diamond':
    case 'platinum':
    case 'gold':
      return 0; // See jobs 1 hour early (no delay)
    case 'silver':
      return 45; // See jobs 15 mins early (45 min delay vs 1 hour)
    case 'bronze':
    default:
      return 60; // Standard visibility (1 hour delay)
  }
}

// Legacy export for backwards compatibility
export const LEVEL_TIERS = TIERS;
