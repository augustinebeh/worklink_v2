/**
 * Quest Processing Utilities
 * @module gamification/helpers/quest-processor
 */

const { createLogger } = require('../../../../../utils/structured-logger');
const { getSGDateString } = require('../../../../../shared/constants');
const logger = createLogger('gamification-quests');

/**
 * Parse quest requirements and add computed properties
 * @param {Array} quests - Array of quest objects
 * @returns {Array} Parsed quests with requirement and target properties
 */
function parseQuests(quests) {
  return quests.map(q => ({
    ...q,
    requirement: JSON.parse(q.requirement || '{}'),
    target: JSON.parse(q.requirement || '{}').count || 1,
  }));
}

/**
 * Update quest progress for check-in type quests
 * @param {object} db - Database instance
 * @param {string} questId - Quest ID
 * @param {string} candidateId - Candidate ID
 * @param {number} incrementBy - Amount to increment progress by (default 1)
 * @returns {object} Updated quest progress
 */
function updateQuestProgress(db, questId, candidateId, incrementBy = 1) {
  try {
    // Get quest details
    const quest = db.prepare('SELECT * FROM quests WHERE id = ?').get(questId);
    if (!quest || !quest.active) {
      throw new Error('Quest not found or inactive');
    }

    const requirement = JSON.parse(quest.requirement || '{}');
    const target = requirement.count || 1;

    // Get current progress
    const candidateQuest = db.prepare(`
      SELECT * FROM candidate_quests
      WHERE quest_id = ? AND candidate_id = ?
    `).get(questId, candidateId);

    if (!candidateQuest) {
      throw new Error('Quest not started by candidate');
    }

    if (candidateQuest.completed) {
      throw new Error('Quest already completed');
    }

    // Update progress
    const newProgress = Math.min(candidateQuest.progress + incrementBy, target);
    const isCompleted = newProgress >= target;

    db.prepare(`
      UPDATE candidate_quests
      SET progress = ?, completed = ?, completed_at = ?
      WHERE quest_id = ? AND candidate_id = ?
    `).run(
      newProgress,
      isCompleted ? 1 : 0,
      isCompleted ? new Date().toISOString() : null,
      questId,
      candidateId
    );

    logger.business('quest_progress_updated', {
      quest_id: questId,
      candidate_id: candidateId,
      old_progress: candidateQuest.progress,
      new_progress: newProgress,
      target,
      completed: isCompleted,
      increment: incrementBy
    });

    return {
      questId,
      candidateId,
      progress: newProgress,
      target,
      completed: isCompleted,
      questName: quest.name
    };

  } catch (error) {
    logger.error('Failed to update quest progress', {
      quest_id: questId,
      candidate_id: candidateId,
      increment: incrementBy,
      error: error.message
    });
    throw error;
  }
}

/**
 * Process streak update for weekly quest
 * @param {object} db - Database instance
 * @param {string} candidateId - Candidate ID
 * @returns {object} Streak update result
 */
function processStreakUpdate(db, candidateId) {
  try {
    const today = getSGDateString();

    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
    if (!candidate) {
      throw new Error('Candidate not found');
    }

    let newStreakDays = 1;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getSGDateString(yesterday);

    // Check if we can extend the streak
    if (candidate.streak_last_date === yesterdayStr) {
      newStreakDays = candidate.streak_days + 1;
    } else if (candidate.streak_last_date !== today) {
      // Reset streak if there's a gap (unless it's today)
      newStreakDays = 1;
    } else {
      // Already updated today
      newStreakDays = candidate.streak_days;
    }

    // Update candidate streak
    db.prepare(`
      UPDATE candidates
      SET streak_days = ?, streak_last_date = ?
      WHERE id = ?
    `).run(newStreakDays, today, candidateId);

    // Check if we need to update the weekly quest (QST_WEEKLY_WARRIOR)
    const weeklyQuest = db.prepare(`
      SELECT cq.*, q.requirement
      FROM candidate_quests cq
      JOIN quests q ON cq.quest_id = q.id
      WHERE cq.candidate_id = ? AND q.code = 'QST_WEEKLY_WARRIOR' AND cq.completed = 0
    `).get(candidateId);

    if (weeklyQuest) {
      const requirement = JSON.parse(weeklyQuest.requirement || '{}');
      const target = requirement.count || 7;

      if (newStreakDays >= target && !weeklyQuest.completed) {
        db.prepare(`
          UPDATE candidate_quests
          SET progress = ?, completed = 1, completed_at = ?
          WHERE quest_id = ? AND candidate_id = ?
        `).run(target, new Date().toISOString(), weeklyQuest.quest_id, candidateId);

        logger.business('weekly_quest_completed', {
          candidate_id: candidateId,
          streak_days: newStreakDays,
          quest_id: weeklyQuest.quest_id
        });
      }
    }

    logger.business('streak_updated', {
      candidate_id: candidateId,
      old_streak: candidate.streak_days,
      new_streak: newStreakDays,
      last_date: today
    });

    return {
      candidateId,
      oldStreak: candidate.streak_days,
      newStreak: newStreakDays,
      streakLastDate: today
    };

  } catch (error) {
    logger.error('Failed to update streak', {
      candidate_id: candidateId,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  parseQuests,
  updateQuestProgress,
  processStreakUpdate
};