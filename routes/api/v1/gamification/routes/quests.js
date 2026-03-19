/**
 * Gamification Quest Routes
 * Handles quest listing, starting, progress tracking, completion, and claiming
 * @module gamification/routes/quests
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { createLogger } = require('../../../../../utils/structured-logger');
const { parseQuests, updateQuestProgress } = require('../helpers/quest-processor');
const { processLevelUp } = require('../helpers/xp-calculator');
const { getCandidateQuests, createXPTransaction } = require('../helpers/database-queries');
const { authenticateToken, authenticateAdmin } = require('../../../../../middleware/auth');

const logger = createLogger('gamification-quests');

/**
 * GET /quests
 * Get all quests with pagination and filtering
 */
router.get('/quests', authenticateToken, (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause for type filter
    let whereClause = 'WHERE active = 1';
    let params = [];
    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    // Get total count for pagination
    const totalQuery = `SELECT COUNT(*) as total FROM quests ${whereClause}`;
    const { total } = db.prepare(totalQuery).get(...params);

    // Get quests with pagination
    const questsQuery = `
      SELECT * FROM quests
      ${whereClause}
      ORDER BY type, xp_reward DESC
      LIMIT ? OFFSET ?
    `;
    const quests = db.prepare(questsQuery).all(...params, parseInt(limit), offset);

    const parsed = parseQuests(quests);

    res.json({
      success: true,
      data: parsed,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Failed to get quests', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /quests/:questId/start
 * Start a quest for a candidate
 */
router.post('/quests/:questId/start', authenticateToken, (req, res) => {
  try {
    const { candidate_id } = req.body;
    const questId = req.params.questId;

    if (!candidate_id) {
      return res.status(400).json({
        success: false,
        error: 'candidate_id is required'
      });
    }

    const quest = db.prepare('SELECT * FROM quests WHERE id = ?').get(questId);
    if (!quest || !quest.active) {
      return res.status(404).json({
        success: false,
        error: 'Quest not found or inactive'
      });
    }

    // Check if already started
    const existing = db.prepare(`
      SELECT * FROM candidate_quests WHERE candidate_id = ? AND quest_id = ?
    `).get(candidate_id, questId);

    if (existing) {
      return res.json({
        success: true,
        already_started: true,
        progress: existing.progress,
        target: existing.target
      });
    }

    const requirement = JSON.parse(quest.requirement || '{}');

    db.prepare(`
      INSERT INTO candidate_quests (candidate_id, quest_id, progress, target, completed, started_at)
      VALUES (?, ?, 0, ?, 0, datetime('now'))
    `).run(candidate_id, questId, requirement.count || 1);

    logger.business('quest_started', {
      candidate_id,
      quest_id: questId,
      quest_name: quest.title,
      target: requirement.count || 1
    });

    res.json({
      success: true,
      data: {
        quest,
        progress: 0,
        target: requirement.count || 1,
        started: true
      }
    });

  } catch (error) {
    logger.error('Failed to start quest', {
      candidate_id: req.body.candidate_id,
      quest_id: req.params.questId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /quests/:questId/progress
 * Update quest progress (for check-in type quests)
 */
router.post('/quests/:questId/progress', authenticateToken, (req, res) => {
  try {
    const { candidateId, increment = 1 } = req.body;
    const questId = req.params.questId;

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        error: 'candidateId is required'
      });
    }

    const result = updateQuestProgress(db, questId, candidateId, increment);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to update quest progress', {
      candidate_id: req.body.candidateId,
      quest_id: req.params.questId,
      increment: req.body.increment,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /quests/:questId/complete
 * Complete quest (mark progress as complete, not yet claimed)
 */
router.post('/quests/:questId/complete', authenticateToken, (req, res) => {
  try {
    const { candidateId } = req.body;
    const questId = req.params.questId;

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        error: 'candidateId is required'
      });
    }

    // Check if quest exists and is started
    const candidateQuest = db.prepare(`
      SELECT * FROM candidate_quests WHERE candidate_id = ? AND quest_id = ?
    `).get(candidateId, questId);

    if (!candidateQuest) {
      return res.status(400).json({
        success: false,
        error: 'Quest not started'
      });
    }

    if (candidateQuest.completed) {
      return res.json({
        success: true,
        already_completed: true
      });
    }

    // Mark as completed
    db.prepare(`
      UPDATE candidate_quests
      SET completed = 1, completed_at = datetime('now')
      WHERE candidate_id = ? AND quest_id = ?
    `).run(candidateId, questId);

    logger.business('quest_completed', {
      candidate_id: candidateId,
      quest_id: questId,
      progress: candidateQuest.progress,
      target: candidateQuest.target
    });

    res.json({
      success: true,
      data: {
        questId,
        candidateId,
        completed: true
      }
    });

  } catch (error) {
    logger.error('Failed to complete quest', {
      candidate_id: req.body.candidateId,
      quest_id: req.params.questId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /quests/:questId/claim
 * Claim quest reward (award XP)
 */
router.post('/quests/:questId/claim', authenticateToken, (req, res) => {
  try {
    const { candidateId } = req.body;
    const questId = req.params.questId;

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        error: 'candidateId is required'
      });
    }

    const transaction = db.transaction(() => {
      // Check if quest is completed and not yet claimed
      const candidateQuest = db.prepare(`
        SELECT * FROM candidate_quests WHERE candidate_id = ? AND quest_id = ?
      `).get(candidateId, questId);

      if (!candidateQuest) {
        throw new Error('Quest not started');
      }

      if (!candidateQuest.completed) {
        throw new Error('Quest not completed');
      }

      if (candidateQuest.claimed) {
        throw new Error('Quest reward already claimed');
      }

      // Get quest details
      const quest = db.prepare('SELECT * FROM quests WHERE id = ?').get(questId);
      if (!quest) {
        throw new Error('Quest not found');
      }

      // Mark as claimed
      db.prepare(`
        UPDATE candidate_quests
        SET claimed = 1, claimed_at = datetime('now')
        WHERE candidate_id = ? AND quest_id = ?
      `).run(candidateId, questId);

      // Award XP and points
      if (quest.xp_reward > 0) {
        db.prepare(`
          UPDATE candidates
          SET xp = xp + ?, current_points = current_points + ?
          WHERE id = ?
        `).run(quest.xp_reward, quest.xp_reward, candidateId);

        createXPTransaction(db, {
          candidateId: candidateId,
          actionType: 'quest',
          amount: quest.xp_reward,
          reason: `Quest completed: ${quest.title}`,
          referenceId: questId
        });
      }

      // Check for level up
      const levelResult = processLevelUp(db, candidateId);

      return { quest, levelResult };
    });

    const result = transaction();
    const candidate = db.prepare('SELECT xp, level FROM candidates WHERE id = ?').get(candidateId);

    logger.business('quest_reward_claimed', {
      candidate_id: candidateId,
      quest_id: questId,
      quest_name: result.quest.title,
      xp_awarded: result.quest.xp_reward,
      leveled_up: result.levelResult.leveledUp
    });

    res.json({
      success: true,
      data: {
        quest: result.quest,
        xp_awarded: result.quest.xp_reward,
        new_xp: candidate.xp,
        new_level: candidate.level,
        leveled_up: result.levelResult.leveledUp,
        old_level: result.levelResult.oldLevel
      }
    });

  } catch (error) {
    logger.error('Failed to claim quest reward', {
      candidate_id: req.body.candidateId,
      quest_id: req.params.questId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /quests
 * Create a new quest (Admin only)
 */
router.post('/quests', authenticateAdmin, (req, res) => {
  try {
    const { title, description, type, requirement, xp_reward, bonus_reward } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'title is required' });
    }

    const id = 'QST' + Date.now().toString(36).toUpperCase();
    const reqStr = typeof requirement === 'object' ? JSON.stringify(requirement) : (requirement || '{}');

    db.prepare(`
      INSERT INTO quests (id, title, description, type, requirement, xp_reward, bonus_reward, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, title, description || null, type || null, reqStr, xp_reward || 0, bonus_reward || 0);

    const quest = db.prepare('SELECT * FROM quests WHERE id = ?').get(id);

    logger.business('quest_created', { id, title, type });

    res.status(201).json({ success: true, data: quest });
  } catch (error) {
    logger.error('Failed to create quest', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PUT /quests/:id
 * Update a quest (Admin only)
 */
router.put('/quests/:id', authenticateAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM quests WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Quest not found' });
    }

    const allowedFields = ['title', 'description', 'type', 'xp_reward', 'bonus_reward', 'active'];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    // Handle requirement separately (JSON)
    if (req.body.requirement !== undefined) {
      updates.push('requirement = ?');
      values.push(typeof req.body.requirement === 'object' ? JSON.stringify(req.body.requirement) : req.body.requirement);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    values.push(id);
    db.prepare(`UPDATE quests SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM quests WHERE id = ?').get(id);

    logger.business('quest_updated', { id, fields: updates.length });

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Failed to update quest', { id: req.params.id, error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * DELETE /quests/:id
 * Delete a quest (Admin only)
 */
router.delete('/quests/:id', authenticateAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM quests WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Quest not found' });
    }

    // Remove candidate associations first
    db.prepare('DELETE FROM candidate_quests WHERE quest_id = ?').run(id);
    db.prepare('DELETE FROM quests WHERE id = ?').run(id);

    logger.business('quest_deleted', { id, title: existing.title });

    res.json({ success: true, message: 'Quest deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete quest', { id: req.params.id, error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /quests/user/:candidateId
 * Get user's quests with progress
 */
router.get('/quests/user/:candidateId', authenticateToken, (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const { page = 1, limit = 20, completed, claimed } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause for filters
    let whereClause = 'WHERE cq.candidate_id = ? AND q.active = 1';
    let params = [candidateId];

    if (completed !== undefined) {
      whereClause += ' AND cq.completed = ?';
      params.push(completed === 'true' ? 1 : 0);
    }

    if (claimed !== undefined) {
      whereClause += ' AND cq.claimed = ?';
      params.push(claimed === 'true' ? 1 : 0);
    }

    // Get total count for pagination
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM candidate_quests cq
      JOIN quests q ON cq.quest_id = q.id
      ${whereClause}
    `;
    const { total } = db.prepare(totalQuery).get(...params);

    // Get user's quests with progress
    const userQuestsQuery = `
      SELECT cq.*, q.title, q.description, q.xp_reward, q.type, q.requirement
      FROM candidate_quests cq
      JOIN quests q ON cq.quest_id = q.id
      ${whereClause}
      ORDER BY cq.started_at DESC
      LIMIT ? OFFSET ?
    `;
    const userQuests = db.prepare(userQuestsQuery).all(...params, parseInt(limit), offset);

    const parsed = parseQuests(userQuests);

    res.json({
      success: true,
      data: parsed,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Failed to get user quests', {
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