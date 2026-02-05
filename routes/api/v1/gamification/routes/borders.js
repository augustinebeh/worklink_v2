/**
 * Gamification Profile Borders Routes
 * Handles profile border listing, unlocking, and selection
 * @module gamification/routes/borders
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { createLogger } = require('../../../../../utils/structured-logger');
const { getCandidateBorders } = require('../helpers/database-queries');

const logger = createLogger('gamification-borders');

/**
 * GET /borders/:candidateId
 * Get all profile borders with unlock status for a candidate
 */
router.get('/borders/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const { page = 1, limit = 20, tier, unlocked } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get candidate info for border calculations
    const candidate = db.prepare(`
      SELECT level, selected_border_id, current_tier, xp, total_jobs_completed
      FROM candidates WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Get candidate's achievements for border unlock checks
    const achievements = db.prepare(`
      SELECT a.code, ca.achievement_id
      FROM candidate_achievements ca
      JOIN achievements a ON ca.achievement_id = a.id
      WHERE ca.candidate_id = ?
    `).all(candidateId);
    const achievementCodes = new Set(achievements.map(a => a.code));

    // Build WHERE clause for filters
    let whereClause = 'WHERE pb.active = 1';
    let params = [];

    if (tier) {
      whereClause += ' AND pb.rarity = ?';
      params.push(tier);
    }

    // Get total count for pagination
    const totalQuery = `SELECT COUNT(*) as total FROM profile_borders pb ${whereClause}`;
    const { total } = db.prepare(totalQuery).get(...params);

    // Get all borders
    const bordersQuery = `
      SELECT pb.*
      FROM profile_borders pb
      ${whereClause}
      ORDER BY
        CASE pb.rarity
          WHEN 'common' THEN 1
          WHEN 'rare' THEN 2
          WHEN 'epic' THEN 3
          WHEN 'legendary' THEN 4
          WHEN 'mythic' THEN 5
        END,
        pb.name
      LIMIT ? OFFSET ?
    `;
    const borders = db.prepare(bordersQuery).all(...params, parseInt(limit), offset);

    // Process borders to determine unlock status
    const processedBorders = borders.map(border => {
      let unlocked = false;
      let unlockReason = null;

      // Check unlock conditions
      switch (border.unlock_requirement) {
        case 'none':
          unlocked = true;
          break;

        case 'level':
          unlocked = candidate.level >= border.unlock_value;
          if (!unlocked) unlockReason = `Reach Level ${border.unlock_value}`;
          break;

        case 'xp':
          unlocked = candidate.xp >= border.unlock_value;
          if (!unlocked) unlockReason = `Earn ${border.unlock_value} XP`;
          break;

        case 'jobs':
          unlocked = candidate.total_jobs_completed >= border.unlock_value;
          if (!unlocked) unlockReason = `Complete ${border.unlock_value} shifts`;
          break;

        case 'tier':
          unlocked = candidate.current_tier === border.unlock_criteria;
          if (!unlocked) unlockReason = `Reach ${border.unlock_criteria} tier`;
          break;

        case 'achievement':
          unlocked = achievementCodes.has(border.unlock_criteria);
          if (!unlocked) unlockReason = `Unlock the ${border.unlock_criteria} achievement`;
          break;

        default:
          unlockReason = 'Special unlock required';
      }

      return {
        id: border.id,
        name: border.name,
        description: border.description,
        rarity: border.rarity,
        image_url: border.image_url,
        gradient: border.gradient,
        glow: border.glow,
        animation: border.animation,
        unlocked,
        unlockReason,
        selected: border.id === candidate.selected_border_id,
        unlock_requirement: border.unlock_requirement,
        unlock_value: border.unlock_value
      };
    });

    // Apply unlock filter if specified
    let filteredBorders = processedBorders;
    if (unlocked !== undefined) {
      const showUnlocked = unlocked === 'true';
      filteredBorders = processedBorders.filter(border => border.unlocked === showUnlocked);
    }

    logger.business('borders_viewed', {
      candidate_id: candidateId,
      tier: tier || 'all',
      unlocked_filter: unlocked,
      total_borders: total,
      unlocked_count: processedBorders.filter(b => b.unlocked).length
    });

    res.json({
      success: true,
      data: filteredBorders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: unlocked !== undefined ? filteredBorders.length : total,
        pages: Math.ceil((unlocked !== undefined ? filteredBorders.length : total) / parseInt(limit))
      },
      meta: {
        candidate_level: candidate.level,
        current_tier: candidate.current_tier,
        selected_border: candidate.selected_border_id
      }
    });

  } catch (error) {
    logger.error('Failed to get borders', {
      candidate_id: req.params.candidateId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /borders/:candidateId/select
 * Select a border for the candidate
 */
router.post('/borders/:candidateId/select', (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const { border_id } = req.body;

    if (!border_id) {
      return res.status(400).json({
        success: false,
        error: 'border_id is required'
      });
    }

    // Get candidate info
    const candidate = db.prepare(`
      SELECT level, current_tier, xp, total_jobs_completed
      FROM candidates WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Get border info
    const border = db.prepare('SELECT * FROM profile_borders WHERE id = ? AND active = 1').get(border_id);
    if (!border) {
      return res.status(404).json({
        success: false,
        error: 'Border not found or inactive'
      });
    }

    // Check if candidate can use this border
    let canUse = false;
    switch (border.unlock_requirement) {
      case 'none':
        canUse = true;
        break;
      case 'level':
        canUse = candidate.level >= border.unlock_value;
        break;
      case 'xp':
        canUse = candidate.xp >= border.unlock_value;
        break;
      case 'jobs':
        canUse = candidate.total_jobs_completed >= border.unlock_value;
        break;
      case 'tier':
        canUse = candidate.current_tier === border.unlock_criteria;
        break;
      case 'achievement':
        const achievement = db.prepare(`
          SELECT ca.candidate_id
          FROM candidate_achievements ca
          JOIN achievements a ON ca.achievement_id = a.id
          WHERE ca.candidate_id = ? AND a.code = ?
        `).get(candidateId, border.unlock_criteria);
        canUse = !!achievement;
        break;
    }

    if (!canUse) {
      return res.status(400).json({
        success: false,
        error: 'Border not unlocked'
      });
    }

    // Update candidate's selected border
    db.prepare('UPDATE candidates SET selected_border_id = ? WHERE id = ?').run(border_id, candidateId);

    logger.business('border_selected', {
      candidate_id: candidateId,
      border_id,
      border_name: border.name,
      border_rarity: border.rarity
    });

    res.json({
      success: true,
      data: {
        border,
        selected: true,
        message: `${border.name} border selected successfully`
      }
    });

  } catch (error) {
    logger.error('Failed to select border', {
      candidate_id: req.params.candidateId,
      border_id: req.body.border_id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;