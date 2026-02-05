/**
 * Gamification Profile Routes
 * Handles candidate profile and core gamification data
 * @module gamification/routes/profile
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { createLogger } = require('../../../../../utils/structured-logger');
const { calculateLevelProgress } = require('../helpers/xp-calculator');
const { parseQuests } = require('../helpers/quest-processor');
const {
  getCandidateProfile,
  getCandidateAchievements,
  getCandidateQuests,
  getXPHistory
} = require('../helpers/database-queries');

const logger = createLogger('gamification-profile');

/**
 * GET /profile/:candidateId
 * Get candidate gamification profile with all related data
 */
router.get('/profile/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;

    // Get candidate profile
    const candidate = getCandidateProfile(db, candidateId);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Get achievements with unlock status
    const achievements = getCandidateAchievements(db, candidateId);

    // Get active quests with progress
    const quests = getCandidateQuests(db, candidateId);
    const parsedQuests = parseQuests(quests);

    // Get XP history (last 10 transactions)
    const xpHistory = getXPHistory(db, candidateId, 10);

    // Calculate level progress
    const levelProgressData = calculateLevelProgress(candidate.xp, candidate.level);

    logger.business('profile_accessed', {
      candidate_id: candidateId,
      current_level: candidate.level,
      current_xp: candidate.xp,
      achievements_unlocked: achievements.filter(a => a.unlocked).length,
      active_quests: quests.filter(q => q.started_at && !q.completed).length
    });

    res.json({
      success: true,
      data: {
        ...candidate,
        ...levelProgressData,
        achievements,
        quests: parsedQuests,
        xpHistory,
      },
    });

  } catch (error) {
    logger.error('Failed to get candidate profile', {
      candidate_id: req.params.candidateId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;