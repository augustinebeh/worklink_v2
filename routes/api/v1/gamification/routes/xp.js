/**
 * Gamification XP Routes
 * Handles XP awards, penalties, job completion, and streak management
 * @module gamification/routes/xp
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { createLogger } = require('../../../../../utils/structured-logger');
const { processLevelUp, calculateJobXP, XP_VALUES } = require('../helpers/xp-calculator');
const { processStreakUpdate } = require('../helpers/quest-processor');
const { createXPTransaction, updateCandidateXP } = require('../helpers/database-queries');

const logger = createLogger('gamification-xp');

/**
 * POST /xp/award
 * Award XP to a candidate with optional level up handling
 */
router.post('/xp/award', (req, res) => {
  try {
    const { candidate_id, amount, reason, reference_id, action_type } = req.body;

    if (!candidate_id || !amount || !reason) {
      return res.status(400).json({
        success: false,
        error: 'candidate_id, amount, and reason are required'
      });
    }

    // Use transaction to ensure atomicity and prevent race conditions
    const transaction = db.transaction(() => {
      // Add XP transaction with action_type
      createXPTransaction(db, {
        candidateId: candidate_id,
        actionType: action_type || 'manual',
        amount,
        reason,
        referenceId: reference_id
      });

      // Update candidate XP and lifetime_xp
      // Also award points 1:1 with XP (only for positive amounts)
      updateCandidateXP(db, candidate_id, amount);

      // Check for level up - all within the same transaction
      return processLevelUp(db, candidate_id);
    });

    // Execute the transaction atomically
    const result = transaction();

    // Get updated candidate data after transaction
    const updatedCandidate = db.prepare('SELECT xp, level, current_tier FROM candidates WHERE id = ?').get(candidate_id);

    // Log XP award
    logger.business('xp_awarded', {
      candidate_id,
      amount,
      reason,
      reference_id,
      action_type: action_type || 'manual',
      leveled_up: result.leveledUp,
      old_level: result.oldLevel,
      new_level: result.newLevel || updatedCandidate.level,
      total_xp: updatedCandidate.xp
    });

    res.json({
      success: true,
      data: {
        xp: updatedCandidate.xp,
        level: updatedCandidate.level,
        tier: updatedCandidate.current_tier,
        leveledUp: result.leveledUp,
        oldLevel: result.oldLevel || updatedCandidate.level,
        newLevel: result.newLevel || updatedCandidate.level,
      },
    });

  } catch (error) {
    logger.error('Failed to award XP', {
      candidate_id: req.body.candidate_id,
      amount: req.body.amount,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /xp/job-complete
 * Award XP for job completion using Career Ladder Strategy formula
 */
router.post('/xp/job-complete', (req, res) => {
  try {
    const { candidate_id, hours_worked, is_urgent, was_on_time, rating, job_id } = req.body;

    if (!candidate_id || !hours_worked || !job_id) {
      return res.status(400).json({
        success: false,
        error: 'candidate_id, hours_worked, and job_id are required'
      });
    }

    // Calculate XP using the strategy formula
    const xpAmount = calculateJobXP(hours_worked, is_urgent, was_on_time, rating);

    // Use transaction to ensure atomicity and prevent race conditions
    const transaction = db.transaction(() => {
      // Add XP transaction
      createXPTransaction(db, {
        candidateId: candidate_id,
        actionType: 'shift',
        amount: xpAmount,
        reason: `Shift completion: ${hours_worked}hrs`,
        referenceId: job_id
      });

      // Update candidate XP, lifetime_xp, current_points (1:1), and total_jobs_completed
      db.prepare(`
        UPDATE candidates
        SET xp = xp + ?,
            lifetime_xp = lifetime_xp + ?,
            current_points = current_points + ?,
            total_jobs_completed = total_jobs_completed + 1
        WHERE id = ?
      `).run(xpAmount, xpAmount, xpAmount, candidate_id);

      // Check for level up - all within the same transaction
      const result = processLevelUp(db, candidate_id);
      return { ...result, xpAmount };
    });

    // Execute the transaction atomically
    const result = transaction();

    // Get updated candidate data after transaction
    const updatedCandidate = db.prepare('SELECT xp, level, current_tier FROM candidates WHERE id = ?').get(candidate_id);

    logger.business('job_xp_awarded', {
      candidate_id,
      job_id,
      hours_worked,
      is_urgent,
      was_on_time,
      rating,
      xp_awarded: result.xpAmount,
      leveled_up: result.leveledUp,
      total_xp: updatedCandidate.xp
    });

    res.json({
      success: true,
      data: {
        xp_awarded: result.xpAmount,
        breakdown: {
          base: hours_worked * XP_VALUES.PER_HOUR_WORKED,
          urgent_bonus: is_urgent ? (hours_worked * XP_VALUES.PER_HOUR_WORKED * 0.5) : 0,
          on_time_bonus: was_on_time ? XP_VALUES.ON_TIME_ARRIVAL : 0,
          rating_bonus: rating === 5 ? XP_VALUES.FIVE_STAR_RATING : 0,
        },
        new_xp: updatedCandidate.xp,
        new_level: updatedCandidate.level,
        new_tier: updatedCandidate.current_tier,
        leveled_up: result.leveledUp,
        old_level: result.oldLevel || updatedCandidate.level,
      },
    });

  } catch (error) {
    logger.error('Failed to award job completion XP', {
      candidate_id: req.body.candidate_id,
      job_id: req.body.job_id,
      hours_worked: req.body.hours_worked,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /xp/penalty
 * Apply penalty for no-shows or late cancellations
 */
router.post('/xp/penalty', (req, res) => {
  try {
    const { candidate_id, penalty_type, reference_id } = req.body;

    if (!candidate_id || !penalty_type) {
      return res.status(400).json({
        success: false,
        error: 'candidate_id and penalty_type are required'
      });
    }

    let amount;
    let reason;
    let action_type;

    switch (penalty_type) {
      case 'no_show':
        amount = XP_VALUES.NO_SHOW_PENALTY;
        reason = 'No-show penalty';
        action_type = 'penalty';
        break;
      case 'late_cancel':
        amount = XP_VALUES.LATE_CANCEL_PENALTY;
        reason = 'Late cancellation penalty';
        action_type = 'penalty';
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid penalty type. Must be no_show or late_cancel'
        });
    }

    // Use transaction to ensure atomicity and prevent race conditions
    const transaction = db.transaction(() => {
      // Add XP transaction (negative amount)
      createXPTransaction(db, {
        candidateId: candidate_id,
        actionType: action_type,
        amount,
        reason,
        referenceId: reference_id
      });

      // Update candidate XP (prevent going below 0)
      db.prepare('UPDATE candidates SET xp = MAX(0, xp + ?) WHERE id = ?').run(amount, candidate_id);

      // Check for level change - all within the same transaction
      const result = processLevelUp(db, candidate_id);
      return { ...result, levelChanged: result.leveledUp };
    });

    // Execute the transaction atomically
    const result = transaction();

    // Get updated candidate data after transaction
    const updatedCandidate = db.prepare('SELECT xp, level, current_tier FROM candidates WHERE id = ?').get(candidate_id);

    logger.business('penalty_applied', {
      candidate_id,
      penalty_type,
      amount: Math.abs(amount),
      reference_id,
      level_changed: result.levelChanged,
      new_xp: updatedCandidate.xp
    });

    res.json({
      success: true,
      data: {
        penalty_applied: Math.abs(amount),
        new_xp: updatedCandidate.xp,
        new_level: updatedCandidate.level,
        new_tier: updatedCandidate.current_tier,
        level_changed: result.levelChanged,
      },
    });

  } catch (error) {
    logger.error('Failed to apply penalty', {
      candidate_id: req.body.candidate_id,
      penalty_type: req.body.penalty_type,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /streak/update
 * Update work streak for Career Ladder Strategy - weekly quest
 */
router.post('/streak/update', (req, res) => {
  try {
    const { candidate_id } = req.body;

    if (!candidate_id) {
      return res.status(400).json({
        success: false,
        error: 'candidate_id is required'
      });
    }

    const result = processStreakUpdate(db, candidate_id);

    res.json({
      success: true,
      data: {
        candidateId: result.candidateId,
        oldStreak: result.oldStreak,
        newStreak: result.newStreak,
        streakLastDate: result.streakLastDate,
        streak_keeper_complete: result.newStreak >= 3,
      },
    });

  } catch (error) {
    logger.error('Failed to update streak', {
      candidate_id: req.body.candidate_id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;