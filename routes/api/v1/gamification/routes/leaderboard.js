/**
 * Gamification Leaderboard Routes
 * Handles leaderboard display and ranking functionality
 * @module gamification/routes/leaderboard
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { createLogger } = require('../../../../../utils/structured-logger');
const { getLeaderboard } = require('../helpers/database-queries');
const { authenticateToken } = require('../../../../../middleware/auth');

const logger = createLogger('gamification-leaderboard');

/**
 * GET /leaderboard
 * Get leaderboard with ranking and filtering options
 */
router.get('/leaderboard', authenticateToken, (req, res) => {
  try {
    const { period = 'all', limit = 20, tier } = req.query;
    let parsedLimit = parseInt(limit);

    // Validate limit
    if (parsedLimit <= 0 || parsedLimit > 100) {
      parsedLimit = 20;
    }

    let leaderboardQuery = `
      SELECT
        c.id,
        c.name,
        c.xp,
        c.level,
        c.total_jobs_completed,
        c.rating,
        c.profile_photo,
        c.streak_days,
        c.profile_flair,
        c.selected_border_id,
        c.current_tier,
        ROW_NUMBER() OVER (ORDER BY c.xp DESC, c.total_jobs_completed DESC) as rank,
        pb.id as border_id,
        pb.name as border_name,
        pb.image_url as border_image_url,
        pb.rarity as border_rarity
      FROM candidates c
      LEFT JOIN profile_borders pb ON c.selected_border_id = pb.id
      WHERE c.status = 'active' AND c.xp > 0
    `;

    let params = [];

    // Add tier filter if specified
    if (tier) {
      leaderboardQuery += ` AND c.current_tier = ?`;
      params.push(tier);
    }

    // Add period filter (future enhancement)
    // For now, we only support 'all' time

    leaderboardQuery += ` ORDER BY c.xp DESC, c.total_jobs_completed DESC LIMIT ?`;
    params.push(parsedLimit);

    const leaderboard = db.prepare(leaderboardQuery).all(...params);

    // Get total count for context
    let countQuery = `
      SELECT COUNT(*) as total
      FROM candidates
      WHERE status = 'active' AND xp > 0
    `;

    let countParams = [];
    if (tier) {
      countQuery += ` AND current_tier = ?`;
      countParams.push(tier);
    }

    const { total } = db.prepare(countQuery).get(...countParams);

    // Extract border information from the joined query results
    const leaderboardWithBorders = leaderboard.map(candidate => {
      const { border_id, border_name, border_image_url, border_rarity, ...candidateData } = candidate;

      const borderInfo = border_id
        ? { id: border_id, name: border_name, image_url: border_image_url, rarity: border_rarity }
        : null;

      return {
        ...candidateData,
        border: borderInfo
      };
    });

    logger.business('leaderboard_accessed', {
      period,
      tier: tier || 'all',
      limit: parsedLimit,
      total_candidates: total,
      returned_count: leaderboard.length
    });

    res.json({
      success: true,
      data: leaderboardWithBorders,
      meta: {
        period,
        tier: tier || 'all',
        total_candidates: total,
        showing: leaderboard.length,
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to get leaderboard', {
      period: req.query.period,
      tier: req.query.tier,
      limit: req.query.limit,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /leaderboard/rank/:candidateId
 * Get a specific candidate's ranking and nearby candidates
 */
router.get('/leaderboard/rank/:candidateId', authenticateToken, (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const { context = 5 } = req.query; // Number of candidates to show above/below
    const contextLimit = Math.min(parseInt(context), 10); // Max 10 for performance

    // Get candidate's rank
    const candidateRank = db.prepare(`
      SELECT
        id,
        name,
        xp,
        level,
        total_jobs_completed,
        rating,
        profile_photo,
        current_tier,
        (SELECT COUNT(*) + 1 FROM candidates c2 WHERE c2.status = 'active' AND c2.xp > c1.xp) as rank
      FROM candidates c1
      WHERE c1.id = ? AND c1.status = 'active'
    `).get(candidateId);

    if (!candidateRank) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found or inactive'
      });
    }

    // Get context around the candidate's rank
    const contextQuery = `
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
      LIMIT ? OFFSET ?
    `;

    const startOffset = Math.max(0, candidateRank.rank - contextLimit - 1);
    const contextCandidates = db.prepare(contextQuery).all(
      (contextLimit * 2) + 1,
      startOffset
    );

    res.json({
      success: true,
      data: {
        candidate: candidateRank,
        context: contextCandidates,
        rank_info: {
          current_rank: candidateRank.rank,
          showing_from: startOffset + 1,
          showing_to: startOffset + contextCandidates.length
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get candidate rank', {
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