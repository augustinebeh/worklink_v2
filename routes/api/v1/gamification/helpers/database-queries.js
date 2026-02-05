/**
 * Database Query Utilities for Gamification
 * @module gamification/helpers/database-queries
 */

/**
 * Get candidate profile with gamification data
 * @param {object} db - Database instance
 * @param {string} candidateId - Candidate ID
 * @returns {object|null} Candidate profile or null if not found
 */
function getCandidateProfile(db, candidateId) {
  return db.prepare(`
    SELECT id, name, xp, level, streak_days, streak_last_date, total_jobs_completed, rating, profile_photo
    FROM candidates WHERE id = ?
  `).get(candidateId);
}

/**
 * Get achievements for a candidate
 * @param {object} db - Database instance
 * @param {string} candidateId - Candidate ID
 * @returns {Array} Array of achievements with unlock status
 */
function getCandidateAchievements(db, candidateId) {
  return db.prepare(`
    SELECT a.*,
      CASE WHEN ca.candidate_id IS NOT NULL THEN 1 ELSE 0 END as unlocked,
      ca.unlocked_at
    FROM achievements a
    LEFT JOIN candidate_achievements ca ON a.id = ca.achievement_id AND ca.candidate_id = ?
  `).all(candidateId);
}

/**
 * Get active quests for a candidate
 * @param {object} db - Database instance
 * @param {string} candidateId - Candidate ID
 * @returns {Array} Array of active quests with progress
 */
function getCandidateQuests(db, candidateId) {
  return db.prepare(`
    SELECT q.*,
      COALESCE(cq.progress, 0) as progress,
      COALESCE(cq.completed, 0) as completed,
      cq.started_at,
      cq.completed_at
    FROM quests q
    LEFT JOIN candidate_quests cq ON q.id = cq.quest_id AND cq.candidate_id = ?
    WHERE q.active = 1
  `).all(candidateId);
}

/**
 * Get XP transaction history for a candidate
 * @param {object} db - Database instance
 * @param {string} candidateId - Candidate ID
 * @param {number} limit - Number of transactions to retrieve (default 10)
 * @returns {Array} Array of XP transactions
 */
function getXPHistory(db, candidateId, limit = 10) {
  return db.prepare(`
    SELECT * FROM xp_transactions
    WHERE candidate_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(candidateId, limit);
}

/**
 * Get leaderboard data
 * @param {object} db - Database instance
 * @param {number} limit - Number of candidates to retrieve (default 20)
 * @returns {Array} Array of leaderboard entries
 */
function getLeaderboard(db, limit = 20) {
  return db.prepare(`
    SELECT
      id,
      name,
      xp,
      level,
      total_jobs_completed,
      rating,
      profile_photo,
      current_tier,
      ROW_NUMBER() OVER (ORDER BY xp DESC, total_jobs_completed DESC) as rank
    FROM candidates
    WHERE status = 'active' AND xp > 0
    ORDER BY xp DESC, total_jobs_completed DESC
    LIMIT ?
  `).all(limit);
}

/**
 * Get profile borders with unlock status for a candidate
 * @param {object} db - Database instance
 * @param {string} candidateId - Candidate ID
 * @returns {Array} Array of borders with unlock status
 */
function getCandidateBorders(db, candidateId) {
  return db.prepare(`
    SELECT
      pb.*,
      CASE
        WHEN pb.unlock_requirement = 'none' THEN 1
        WHEN pb.unlock_requirement = 'level' AND c.level >= pb.unlock_value THEN 1
        WHEN pb.unlock_requirement = 'xp' AND c.xp >= pb.unlock_value THEN 1
        WHEN pb.unlock_requirement = 'jobs' AND c.total_jobs_completed >= pb.unlock_value THEN 1
        WHEN pb.unlock_requirement = 'tier' AND c.current_tier = pb.unlock_criteria THEN 1
        WHEN pb.unlock_requirement = 'achievement' AND ca.candidate_id IS NOT NULL THEN 1
        ELSE 0
      END as unlocked,
      CASE WHEN c.selected_border_id = pb.id THEN 1 ELSE 0 END as selected
    FROM profile_borders pb
    CROSS JOIN candidates c
    LEFT JOIN candidate_achievements ca ON pb.unlock_requirement = 'achievement'
      AND ca.candidate_id = c.id
      AND ca.achievement_id = (SELECT id FROM achievements WHERE code = pb.unlock_criteria LIMIT 1)
    WHERE c.id = ?
    ORDER BY pb.rarity ASC, pb.name ASC
  `).all(candidateId);
}

/**
 * Get rewards with purchase status for a candidate
 * @param {object} db - Database instance
 * @param {string} candidateId - Candidate ID
 * @returns {Array} Array of rewards with purchase status
 */
function getCandidateRewards(db, candidateId) {
  return db.prepare(`
    SELECT
      r.*,
      CASE WHEN cr.candidate_id IS NOT NULL THEN 1 ELSE 0 END as purchased,
      cr.purchased_at,
      c.current_points
    FROM rewards r
    CROSS JOIN candidates c
    LEFT JOIN candidate_rewards cr ON r.id = cr.reward_id AND cr.candidate_id = c.id
    WHERE c.id = ? AND r.active = 1
    ORDER BY r.category, r.point_cost ASC
  `).all(candidateId);
}

/**
 * Create XP transaction
 * @param {object} db - Database instance
 * @param {object} params - Transaction parameters
 * @param {string} params.candidateId - Candidate ID
 * @param {string} params.actionType - Action type
 * @param {number} params.amount - XP amount
 * @param {string} params.reason - Reason for XP award
 * @param {string} params.referenceId - Reference ID
 */
function createXPTransaction(db, { candidateId, actionType, amount, reason, referenceId }) {
  return db.prepare(`
    INSERT INTO xp_transactions (candidate_id, action_type, amount, reason, reference_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(candidateId, actionType, amount, reason, referenceId);
}

/**
 * Update candidate XP and points
 * @param {object} db - Database instance
 * @param {string} candidateId - Candidate ID
 * @param {number} xpAmount - XP amount to add
 */
function updateCandidateXP(db, candidateId, xpAmount) {
  if (xpAmount > 0) {
    return db.prepare(`
      UPDATE candidates
      SET xp = xp + ?, lifetime_xp = lifetime_xp + ?, current_points = current_points + ?
      WHERE id = ?
    `).run(xpAmount, xpAmount, xpAmount, candidateId);
  } else {
    return db.prepare(`
      UPDATE candidates
      SET xp = MAX(0, xp + ?)
      WHERE id = ?
    `).run(xpAmount, candidateId);
  }
}

module.exports = {
  getCandidateProfile,
  getCandidateAchievements,
  getCandidateQuests,
  getXPHistory,
  getLeaderboard,
  getCandidateBorders,
  getCandidateRewards,
  createXPTransaction,
  updateCandidateXP
};