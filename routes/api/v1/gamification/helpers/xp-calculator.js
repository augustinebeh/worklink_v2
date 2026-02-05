/**
 * XP Calculation Utilities
 * @module gamification/helpers/xp-calculator
 */

const { XP_THRESHOLDS, XP_VALUES, calculateLevel, calculateJobXP, getLevelTier } = require('../../../../../shared/constants');

/**
 * Calculate level progress for a candidate
 * @param {number} xp - Current XP
 * @param {number} level - Current level
 * @returns {object} Level progress information
 */
function calculateLevelProgress(xp, level) {
  const currentThreshold = XP_THRESHOLDS[level - 1] || 0;
  const nextThreshold = XP_THRESHOLDS[level] || XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
  const xpInLevel = xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const levelProgress = level >= 10 ? 100 : Math.round((xpInLevel / xpNeeded) * 100);

  return {
    levelProgress,
    xpToNextLevel: xpNeeded - xpInLevel,
    currentThreshold,
    nextThreshold,
    xpInLevel,
    xpNeeded
  };
}

/**
 * Process level up logic within a transaction
 * @param {object} db - Database instance
 * @param {string} candidateId - Candidate ID
 * @param {number} currentLevel - Current level
 * @returns {object} Level up result
 */
function processLevelUp(db, candidateId, currentLevel) {
  const candidate = db.prepare('SELECT xp, level FROM candidates WHERE id = ?').get(candidateId);
  const newLevel = calculateLevel(candidate.xp);
  const newTier = getLevelTier(newLevel);

  if (newLevel !== candidate.level) {
    db.prepare('UPDATE candidates SET level = ?, current_tier = ? WHERE id = ?')
      .run(newLevel, newTier, candidateId);

    return { leveledUp: true, oldLevel: candidate.level, newLevel, newTier };
  }

  return { leveledUp: false, level: candidate.level };
}

module.exports = {
  calculateLevelProgress,
  processLevelUp,
  calculateJobXP,
  calculateLevel,
  getLevelTier,
  XP_THRESHOLDS,
  XP_VALUES
};