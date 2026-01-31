/**
 * Gamification constants and utilities for Admin portal
 * Revamped leveling system - 50 levels, exponential growth
 * Max level is very hard to reach (requires years of active work)
 */

// XP thresholds for each level (index = level - 1)
export const XP_THRESHOLDS = [
  0,        // Level 1
  100,      // Level 2
  250,      // Level 3
  500,      // Level 4
  850,      // Level 5
  1300,     // Level 6
  1900,     // Level 7
  2700,     // Level 8
  3800,     // Level 9
  5200,     // Level 10
  7000,     // Level 11
  9200,     // Level 12
  12000,    // Level 13
  15500,    // Level 14
  20000,    // Level 15
  25500,    // Level 16
  32500,    // Level 17
  41000,    // Level 18
  52000,    // Level 19
  65000,    // Level 20
  82000,    // Level 21
  102000,   // Level 22
  127000,   // Level 23
  158000,   // Level 24
  195000,   // Level 25
  240000,   // Level 26
  295000,   // Level 27
  360000,   // Level 28
  440000,   // Level 29
  535000,   // Level 30
  650000,   // Level 31
  785000,   // Level 32
  950000,   // Level 33
  1150000,  // Level 34
  1380000,  // Level 35
  1660000,  // Level 36
  1990000,  // Level 37
  2380000,  // Level 38
  2850000,  // Level 39
  3400000,  // Level 40
  4050000,  // Level 41
  4820000,  // Level 42
  5730000,  // Level 43
  6800000,  // Level 44
  8050000,  // Level 45
  9500000,  // Level 46
  11200000, // Level 47
  13200000, // Level 48
  15500000, // Level 49
  18200000, // Level 50
];

export const LEVEL_TITLES = {
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

export function calculateLevel(xp) {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function calculateLevelProgress(xp, level) {
  const maxLevel = XP_THRESHOLDS.length;
  const safeLevel = Math.min(level, maxLevel);
  const currentThreshold = XP_THRESHOLDS[safeLevel - 1] || 0;
  const nextThreshold = XP_THRESHOLDS[safeLevel] || XP_THRESHOLDS[maxLevel - 1];

  if (safeLevel >= maxLevel) return 100;

  const xpInLevel = xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  return Math.max(0, Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)));
}

export function getLevelTitle(level) {
  return LEVEL_TITLES[level] || LEVEL_TITLES[1];
}
