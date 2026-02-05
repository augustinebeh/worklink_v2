/**
 * Achievement Checking and Unlocking Logic
 * @module gamification/helpers/achievement-checker
 */

const { createLogger } = require('../../../../../utils/structured-logger');
const logger = createLogger('gamification-achievements');

/**
 * Check and unlock automatic achievements for a candidate
 * @param {object} db - Database instance
 * @param {string} candidateId - Candidate ID
 * @returns {Array} Array of newly unlocked achievements
 */
function checkAndUnlockAchievements(db, candidateId) {
  try {
    // Get candidate stats
    const candidate = db.prepare(`
      SELECT
        total_jobs_completed,
        xp,
        level,
        (SELECT COUNT(*) FROM candidate_reviews WHERE candidate_id = ? AND rating >= 4) as good_reviews,
        (SELECT COUNT(*) FROM candidate_reviews WHERE candidate_id = ? AND rating = 5) as perfect_reviews,
        (SELECT COUNT(*) FROM jobs WHERE assigned_to = ? AND status = 'completed' AND was_on_time = 1) as on_time_jobs,
        (SELECT COUNT(DISTINCT client_id) FROM jobs WHERE assigned_to = ? AND status = 'completed') as unique_clients
      FROM candidates WHERE id = ?
    `).get(candidateId, candidateId, candidateId, candidateId, candidateId);

    if (!candidate) {
      return [];
    }

    const unlockedAchievements = [];

    // Reliable Category Achievements
    if (candidate.total_jobs_completed >= 1) {
      unlockedAchievements.push(...unlockAchievement(db, candidateId, 'ACH_FIRST_SHIFT'));
    }
    if (candidate.total_jobs_completed >= 5) {
      unlockedAchievements.push(...unlockAchievement(db, candidateId, 'ACH_FIVE_SHIFTS'));
    }
    if (candidate.total_jobs_completed >= 10) {
      unlockedAchievements.push(...unlockAchievement(db, candidateId, 'ACH_TEN_SHIFTS'));
    }
    if (candidate.total_jobs_completed >= 25) {
      unlockedAchievements.push(...unlockAchievement(db, candidateId, 'ACH_VETERAN'));
    }
    if (candidate.total_jobs_completed >= 50) {
      unlockedAchievements.push(...unlockAchievement(db, candidateId, 'ACH_POWERHOUSE'));
    }
    if (candidate.total_jobs_completed >= 100) {
      unlockedAchievements.push(...unlockAchievement(db, candidateId, 'ACH_CENTURION'));
    }

    // Perfect attendance achievements
    if (candidate.on_time_jobs >= 5) {
      unlockedAchievements.push(...unlockAchievement(db, candidateId, 'ACH_PUNCTUAL'));
    }
    if (candidate.on_time_jobs >= 15) {
      unlockedAchievements.push(...unlockAchievement(db, candidateId, 'ACH_CLOCKWORK'));
    }

    // Skilled Category Achievements
    if (candidate.level >= 2) {
      unlockedAchievements.push(...unlockAchievement(db, candidateId, 'ACH_LEVEL_UP'));
    }
    if (candidate.level >= 5) {
      unlockedAchievements.push(...unlockAchievement(db, candidateId, 'ACH_RISING_STAR'));
    }
    if (candidate.level >= 10) {
      unlockedAchievements.push(...unlockAchievement(db, candidateId, 'ACH_EXPERT'));
    }

    // Rating achievements
    if (candidate.good_reviews >= 5) {
      unlockedAchievements.push(...unlockAchievement(db, candidateId, 'ACH_WELL_LIKED'));
    }
    if (candidate.perfect_reviews >= 3) {
      unlockedAchievements.push(...unlockAchievement(db, candidateId, 'ACH_PERFECTIONIST'));
    }

    // Social Category Achievements
    if (candidate.unique_clients >= 3) {
      unlockedAchievements.push(...unlockAchievement(db, candidateId, 'ACH_NETWORKER'));
    }
    if (candidate.unique_clients >= 10) {
      unlockedAchievements.push(...unlockAchievement(db, candidateId, 'ACH_SOCIALITE'));
    }

    logger.business('achievements_checked', {
      candidate_id: candidateId,
      newly_unlocked: unlockedAchievements.length,
      achievements: unlockedAchievements.map(a => a.code),
      candidate_stats: candidate
    });

    return unlockedAchievements;

  } catch (error) {
    logger.error('Failed to check achievements', { candidate_id: candidateId, error: error.message });
    return [];
  }
}

/**
 * Unlock a specific achievement for a candidate
 * @param {object} db - Database instance
 * @param {string} candidateId - Candidate ID
 * @param {string} achievementCode - Achievement code
 * @returns {Array} Array containing the achievement if newly unlocked, empty if already unlocked
 */
function unlockAchievement(db, candidateId, achievementCode) {
  try {
    // Check if already unlocked
    const existing = db.prepare(`
      SELECT 1 FROM candidate_achievements ca
      JOIN achievements a ON ca.achievement_id = a.id
      WHERE ca.candidate_id = ? AND a.code = ?
    `).get(candidateId, achievementCode);

    if (existing) {
      return []; // Already unlocked
    }

    // Get the achievement
    const achievement = db.prepare('SELECT * FROM achievements WHERE code = ?').get(achievementCode);
    if (!achievement) {
      return []; // Achievement doesn't exist
    }

    // Unlock it (but don't claim - that's separate)
    db.prepare(`
      INSERT INTO candidate_achievements (candidate_id, achievement_id, unlocked_at)
      VALUES (?, ?, datetime('now'))
    `).run(candidateId, achievement.id);

    logger.business('achievement_unlocked', {
      candidate_id: candidateId,
      achievement_code: achievementCode,
      achievement_name: achievement.name,
      xp_reward: achievement.xp_reward
    });

    return [achievement];

  } catch (error) {
    logger.error('Failed to unlock achievement', {
      candidate_id: candidateId,
      achievement_code: achievementCode,
      error: error.message
    });
    return [];
  }
}

module.exports = {
  checkAndUnlockAchievements,
  unlockAchievement
};