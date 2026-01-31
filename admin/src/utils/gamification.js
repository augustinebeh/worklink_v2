/**
 * Gamification constants and utilities for Admin portal
 * Centralized to avoid duplication across components
 */

export const XP_THRESHOLDS = [0, 500, 1200, 2500, 5000, 8000, 12000, 18000, 25000, 35000];

export const LEVEL_TITLES = {
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

export function calculateLevel(xp) {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function calculateLevelProgress(xp, level) {
  const currentThreshold = XP_THRESHOLDS[level - 1] || 0;
  const nextThreshold = XP_THRESHOLDS[level] || XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
  const xpInLevel = xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  return level >= 10 ? 100 : Math.round((xpInLevel / xpNeeded) * 100);
}

export function getLevelTitle(level) {
  return LEVEL_TITLES[level] || LEVEL_TITLES[1];
}
