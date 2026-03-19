/**
 * Gamification Achievement Routes
 * Handles achievement listing, unlocking, claiming, and checking
 * @module gamification/routes/achievements
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { createLogger } = require('../../../../../utils/structured-logger');
const { processLevelUp, calculateLevel } = require('../helpers/xp-calculator');
const { checkAndUnlockAchievements, unlockAchievement } = require('../helpers/achievement-checker');
const { getCandidateAchievements, createXPTransaction, updateCandidateXP } = require('../helpers/database-queries');
const { authenticateToken, authenticateAdmin } = require('../../../../../middleware/auth');

const logger = createLogger('gamification-achievements');

/**
 * GET /achievements
 * Get all achievements with pagination and filtering
 */
router.get('/achievements', authenticateToken, (req, res) => {
  try {
    const { category } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 50), 500);
    const offset = (page - 1) * limit;

    // Build WHERE clause for category filter
    let whereClause = '';
    let params = [];
    if (category) {
      whereClause = 'WHERE category = ?';
      params.push(category);
    }

    // Get total count for pagination
    const totalQuery = `SELECT COUNT(*) as total FROM achievements ${whereClause}`;
    const { total } = db.prepare(totalQuery).get(...params);

    // Get achievements with pagination
    const achievementsQuery = `
      SELECT * FROM achievements
      ${whereClause}
      ORDER BY category, rarity
      LIMIT ? OFFSET ?
    `;
    const achievements = db.prepare(achievementsQuery).all(...params, limit, offset);

    res.json({
      success: true,
      data: achievements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Failed to get achievements', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /achievements/user/:candidateId
 * Get user's achievements with claimed status
 */
router.get('/achievements/user/:candidateId', authenticateToken, (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const { page = 1, limit = 50, category, claimed } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause for filters
    let whereClause = 'WHERE ca.candidate_id = ?';
    let params = [candidateId];

    if (category) {
      whereClause += ' AND a.category = ?';
      params.push(category);
    }

    if (claimed !== undefined) {
      whereClause += ' AND ca.claimed = ?';
      params.push(claimed === 'true' ? 1 : 0);
    }

    // Get total count for pagination
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM candidate_achievements ca
      JOIN achievements a ON ca.achievement_id = a.id
      ${whereClause}
    `;
    const { total } = db.prepare(totalQuery).get(...params);

    // Get user's unlocked achievements with claimed status
    const userAchievementsQuery = `
      SELECT ca.*, a.name, a.description, a.icon, a.category, a.xp_reward, a.rarity
      FROM candidate_achievements ca
      JOIN achievements a ON ca.achievement_id = a.id
      ${whereClause}
      ORDER BY ca.unlocked_at DESC
      LIMIT ? OFFSET ?
    `;
    const userAchievements = db.prepare(userAchievementsQuery).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: userAchievements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Failed to get user achievements', {
      candidate_id: req.params.candidateId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /achievements/unlock
 * Unlock achievement (does NOT auto-award XP - must be claimed separately)
 */
router.post('/achievements/unlock', authenticateToken, (req, res) => {
  try {
    const { candidate_id, achievement_id } = req.body;

    if (!candidate_id || !achievement_id) {
      return res.status(400).json({
        success: false,
        error: 'candidate_id and achievement_id are required'
      });
    }

    // Check if already unlocked
    const existing = db.prepare(
      'SELECT * FROM candidate_achievements WHERE candidate_id = ? AND achievement_id = ?'
    ).get(candidate_id, achievement_id);

    if (existing) {
      return res.json({
        success: true,
        already_unlocked: true,
        claimed: existing.claimed === 1
      });
    }

    // Get achievement info
    const achievement = db.prepare('SELECT * FROM achievements WHERE id = ?').get(achievement_id);
    if (!achievement) {
      return res.status(404).json({
        success: false,
        error: 'Achievement not found'
      });
    }

    // Unlock achievement (but don't award XP yet - user must claim)
    db.prepare(`
      INSERT INTO candidate_achievements (candidate_id, achievement_id, claimed)
      VALUES (?, ?, 0)
    `).run(candidate_id, achievement_id);

    logger.business('achievement_manually_unlocked', {
      candidate_id,
      achievement_id,
      achievement_name: achievement.name
    });

    res.json({
      success: true,
      data: {
        achievement,
        unlocked: true,
        claimed: false,
      },
    });

  } catch (error) {
    logger.error('Failed to unlock achievement', {
      candidate_id: req.body.candidate_id,
      achievement_id: req.body.achievement_id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /achievements/:achievementId/claim
 * Claim achievement XP reward
 */
router.post('/achievements/:achievementId/claim', authenticateToken, (req, res) => {
  try {
    const { candidateId, candidate_id } = req.body;
    const finalCandidateId = candidateId || candidate_id;
    const achievementId = req.params.achievementId;

    if (!finalCandidateId) {
      return res.status(400).json({
        success: false,
        error: 'candidateId or candidate_id is required'
      });
    }

    // Get achievement XP reward
    const achievement = db.prepare('SELECT * FROM achievements WHERE id = ?').get(achievementId);
    if (!achievement) {
      return res.status(404).json({
        success: false,
        error: 'Achievement not found'
      });
    }

    // Use transaction for claiming - check + claim inside transaction to prevent race condition
    const transaction = db.transaction(() => {
      // Check if achievement is unlocked (inside transaction to prevent concurrent claims)
      const userAchievement = db.prepare(`
        SELECT * FROM candidate_achievements
        WHERE candidate_id = ? AND achievement_id = ?
      `).get(finalCandidateId, achievementId);

      if (!userAchievement) {
        return { error: 'Achievement not unlocked', status: 400 };
      }

      if (userAchievement.claimed === 1) {
        return { error: 'Achievement already claimed', status: 400 };
      }

      // Mark as claimed
      db.prepare(`
        UPDATE candidate_achievements
        SET claimed = 1, claimed_at = CURRENT_TIMESTAMP
        WHERE candidate_id = ? AND achievement_id = ?
      `).run(finalCandidateId, achievementId);

      // Award XP and points (1:1)
      if (achievement.xp_reward > 0) {
        updateCandidateXP(db, finalCandidateId, achievement.xp_reward);
        createXPTransaction(db, {
          candidateId: finalCandidateId,
          actionType: 'achievement',
          amount: achievement.xp_reward,
          reason: `Achievement claimed: ${achievement.name}`,
          referenceId: achievementId
        });
      }

      // Check for level up
      return { levelResult: processLevelUp(db, finalCandidateId) };
    });

    const txResult = transaction();

    if (txResult.error) {
      return res.status(txResult.status).json({
        success: false,
        error: txResult.error
      });
    }

    const levelResult = txResult.levelResult;
    const candidate = db.prepare('SELECT xp, level FROM candidates WHERE id = ?').get(finalCandidateId);

    logger.business('achievement_claimed', {
      candidate_id: finalCandidateId,
      achievement_id: achievementId,
      achievement_name: achievement.name,
      xp_awarded: achievement.xp_reward,
      leveled_up: levelResult.leveledUp
    });

    res.json({
      success: true,
      data: {
        achievement,
        xp_awarded: achievement.xp_reward,
        new_xp: candidate.xp,
        new_level: candidate.level,
        leveled_up: levelResult.leveledUp,
        old_level: levelResult.oldLevel
      },
    });

  } catch (error) {
    logger.error('Failed to claim achievement', {
      candidate_id: req.body.candidateId || req.body.candidate_id,
      achievement_id: req.params.achievementId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /achievements
 * Create a new achievement (Admin only)
 */
router.post('/achievements', authenticateAdmin, (req, res) => {
  try {
    const { code, name, description, icon, category, requirement_type, requirement_value, xp_reward, rarity } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }

    const id = 'ACH' + Date.now().toString(36).toUpperCase();

    db.prepare(`
      INSERT INTO achievements (id, code, name, description, icon, category, requirement_type, requirement_value, xp_reward, rarity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, code || null, name, description || null, icon || null, category || null, requirement_type || null, requirement_value || 0, xp_reward || 0, rarity || 'common');

    const achievement = db.prepare('SELECT * FROM achievements WHERE id = ?').get(id);

    logger.business('achievement_created', { id, name, category });

    res.status(201).json({ success: true, data: achievement });
  } catch (error) {
    logger.error('Failed to create achievement', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PUT /achievements/:id
 * Update an achievement (Admin only)
 */
router.put('/achievements/:id', authenticateAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM achievements WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Achievement not found' });
    }

    const allowedFields = ['code', 'name', 'description', 'icon', 'category', 'requirement_type', 'requirement_value', 'xp_reward', 'rarity'];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    values.push(id);
    db.prepare(`UPDATE achievements SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM achievements WHERE id = ?').get(id);

    logger.business('achievement_updated', { id, fields: updates.length });

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Failed to update achievement', { id: req.params.id, error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * DELETE /achievements/:id
 * Delete an achievement (Admin only)
 */
router.delete('/achievements/:id', authenticateAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM achievements WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Achievement not found' });
    }

    // Remove candidate associations first
    db.prepare('DELETE FROM candidate_achievements WHERE achievement_id = ?').run(id);
    db.prepare('DELETE FROM achievements WHERE id = ?').run(id);

    logger.business('achievement_deleted', { id, name: existing.name });

    res.json({ success: true, message: 'Achievement deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete achievement', { id: req.params.id, error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /achievements/check/:candidateId
 * Check and unlock automatic achievements (Career Ladder Strategy)
 */
router.post('/achievements/check/:candidateId', authenticateToken, (req, res) => {
  try {
    const candidateId = req.params.candidateId;

    // Use the helper function to check and unlock achievements
    const unlockedAchievements = checkAndUnlockAchievements(db, candidateId);

    res.json({
      success: true,
      data: {
        candidateId,
        newly_unlocked: unlockedAchievements.length,
        achievements: unlockedAchievements
      }
    });

  } catch (error) {
    logger.error('Failed to check achievements', {
      candidate_id: req.params.candidateId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;