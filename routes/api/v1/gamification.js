const express = require('express');
const router = express.Router();
const { db } = require('../../../db');
const { createLogger } = require('../../../utils/structured-logger');

const logger = createLogger('gamification');
const {
  XP_THRESHOLDS,
  XP_VALUES,
  calculateLevel,
  calculateJobXP,
  getLevelTier,
  getSGDateString
} = require('../../../shared/constants');

// Get candidate gamification profile
router.get('/profile/:candidateId', (req, res) => {
  try {
    const candidate = db.prepare(`
      SELECT id, name, xp, level, streak_days, streak_last_date, total_jobs_completed, rating, profile_photo
      FROM candidates WHERE id = ?
    `).get(req.params.candidateId);

    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    // Get achievements
    const achievements = db.prepare(`
      SELECT a.*, 
        CASE WHEN ca.candidate_id IS NOT NULL THEN 1 ELSE 0 END as unlocked,
        ca.unlocked_at
      FROM achievements a
      LEFT JOIN candidate_achievements ca ON a.id = ca.achievement_id AND ca.candidate_id = ?
    `).all(req.params.candidateId);

    // Get active quests
    const quests = db.prepare(`
      SELECT q.*, 
        COALESCE(cq.progress, 0) as progress,
        COALESCE(cq.completed, 0) as completed,
        cq.started_at,
        cq.completed_at
      FROM quests q
      LEFT JOIN candidate_quests cq ON q.id = cq.quest_id AND cq.candidate_id = ?
      WHERE q.active = 1
    `).all(req.params.candidateId);

    // Parse quest requirements
    const parsedQuests = quests.map(q => ({
      ...q,
      requirement: JSON.parse(q.requirement || '{}'),
      target: JSON.parse(q.requirement || '{}').count || 1,
    }));

    // Get XP history (last 10 transactions)
    const xpHistory = db.prepare(`
      SELECT * FROM xp_transactions 
      WHERE candidate_id = ? 
      ORDER BY created_at DESC 
      LIMIT 10
    `).all(req.params.candidateId);

    // Calculate level progress
    const currentLevel = candidate.level;
    const currentThreshold = XP_THRESHOLDS[currentLevel - 1] || 0;
    const nextThreshold = XP_THRESHOLDS[currentLevel] || XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
    const xpInLevel = candidate.xp - currentThreshold;
    const xpNeeded = nextThreshold - currentThreshold;
    const levelProgress = currentLevel >= 10 ? 100 : Math.round((xpInLevel / xpNeeded) * 100);

    res.json({
      success: true,
      data: {
        ...candidate,
        levelProgress,
        xpToNextLevel: xpNeeded - xpInLevel,
        achievements,
        quests: parsedQuests,
        xpHistory,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Award XP
router.post('/xp/award', (req, res) => {
  try {
    const { candidate_id, amount, reason, reference_id, action_type } = req.body;

    // Use transaction to ensure atomicity and prevent race conditions
    const transaction = db.transaction(() => {
      // Add XP transaction with action_type
      db.prepare(`
        INSERT INTO xp_transactions (candidate_id, action_type, amount, reason, reference_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(candidate_id, action_type || 'manual', amount, reason, reference_id);

      // Update candidate XP and lifetime_xp
      // Also award points 1:1 with XP (only for positive amounts)
      if (amount > 0) {
        db.prepare('UPDATE candidates SET xp = xp + ?, lifetime_xp = lifetime_xp + ?, current_points = current_points + ? WHERE id = ?')
          .run(amount, amount, amount, candidate_id);
      } else {
        db.prepare('UPDATE candidates SET xp = MAX(0, xp + ?) WHERE id = ?')
          .run(amount, candidate_id);
      }

      // Check for level up - all within the same transaction
      const candidate = db.prepare('SELECT xp, level FROM candidates WHERE id = ?').get(candidate_id);
      const newLevel = calculateLevel(candidate.xp);
      const newTier = getLevelTier(newLevel);

      if (newLevel !== candidate.level) {
        db.prepare('UPDATE candidates SET level = ?, current_tier = ? WHERE id = ?')
          .run(newLevel, newTier, candidate_id);

        // Return level up info for response
        return { leveledUp: true, oldLevel: candidate.level, newLevel, newTier };
      }

      return { leveledUp: false, level: candidate.level };
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
    res.status(500).json({ success: false, error: error.message });
  }
});

// Award XP for job completion (Career Ladder Strategy)
router.post('/xp/job-complete', (req, res) => {
  try {
    const { candidate_id, hours_worked, is_urgent, was_on_time, rating, job_id } = req.body;

    // Calculate XP using the strategy formula
    const xpAmount = calculateJobXP(hours_worked, is_urgent, was_on_time, rating);

    // Use transaction to ensure atomicity and prevent race conditions
    const transaction = db.transaction(() => {
      // Add XP transaction
      db.prepare(`
        INSERT INTO xp_transactions (candidate_id, action_type, amount, reason, reference_id)
        VALUES (?, 'shift', ?, ?, ?)
      `).run(candidate_id, xpAmount, `Shift completion: ${hours_worked}hrs`, job_id);

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
      const candidate = db.prepare('SELECT xp, level FROM candidates WHERE id = ?').get(candidate_id);
      const newLevel = calculateLevel(candidate.xp);
      const newTier = getLevelTier(newLevel);

      if (newLevel !== candidate.level) {
        db.prepare('UPDATE candidates SET level = ?, current_tier = ? WHERE id = ?')
          .run(newLevel, newTier, candidate_id);

        return { leveledUp: true, oldLevel: candidate.level, newLevel, newTier, xpAmount };
      }

      return { leveledUp: false, level: candidate.level, xpAmount };
    });

    // Execute the transaction atomically
    const result = transaction();

    // Get updated candidate data after transaction
    const updatedCandidate = db.prepare('SELECT xp, level, current_tier FROM candidates WHERE id = ?').get(candidate_id);

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
    res.status(500).json({ success: false, error: error.message });
  }
});

// Apply penalty (no-show or late cancellation)
router.post('/xp/penalty', (req, res) => {
  try {
    const { candidate_id, penalty_type, reference_id } = req.body;

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
        return res.status(400).json({ success: false, error: 'Invalid penalty type' });
    }

    // Use transaction to ensure atomicity and prevent race conditions
    const transaction = db.transaction(() => {
      // Add XP transaction (negative amount)
      db.prepare(`
        INSERT INTO xp_transactions (candidate_id, action_type, amount, reason, reference_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(candidate_id, action_type, amount, reason, reference_id);

      // Update candidate XP (prevent going below 0)
      db.prepare('UPDATE candidates SET xp = MAX(0, xp + ?) WHERE id = ?').run(amount, candidate_id);

      // Check for level change - all within the same transaction
      const candidate = db.prepare('SELECT xp, level FROM candidates WHERE id = ?').get(candidate_id);
      const newLevel = calculateLevel(candidate.xp);
      const newTier = getLevelTier(newLevel);

      if (newLevel !== candidate.level) {
        db.prepare('UPDATE candidates SET level = ?, current_tier = ? WHERE id = ?')
          .run(newLevel, newTier, candidate_id);

        return { levelChanged: true, oldLevel: candidate.level, newLevel, newTier };
      }

      return { levelChanged: false, level: candidate.level, tier: newTier };
    });

    // Execute the transaction atomically
    const result = transaction();

    // Get updated candidate data after transaction
    const updatedCandidate = db.prepare('SELECT xp, level, current_tier FROM candidates WHERE id = ?').get(candidate_id);

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
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all achievements
router.get('/achievements', (req, res) => {
  try {
    const { page = 1, limit = 50, category } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

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
    const achievements = db.prepare(achievementsQuery).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: achievements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's achievements with claimed status
router.get('/achievements/user/:candidateId', (req, res) => {
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
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Unlock achievement (does NOT auto-award XP - must be claimed separately)
router.post('/achievements/unlock', (req, res) => {
  try {
    const { candidate_id, achievement_id } = req.body;

    // Check if already unlocked
    const existing = db.prepare(
      'SELECT * FROM candidate_achievements WHERE candidate_id = ? AND achievement_id = ?'
    ).get(candidate_id, achievement_id);

    if (existing) {
      return res.json({ success: true, already_unlocked: true, claimed: existing.claimed === 1 });
    }

    // Get achievement info
    const achievement = db.prepare('SELECT * FROM achievements WHERE id = ?').get(achievement_id);
    if (!achievement) {
      return res.status(404).json({ success: false, error: 'Achievement not found' });
    }

    // Unlock achievement (but don't award XP yet - user must claim)
    db.prepare(`
      INSERT INTO candidate_achievements (candidate_id, achievement_id, claimed)
      VALUES (?, ?, 0)
    `).run(candidate_id, achievement_id);

    res.json({
      success: true,
      data: {
        achievement,
        unlocked: true,
        claimed: false,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Claim achievement XP reward
router.post('/achievements/:achievementId/claim', (req, res) => {
  try {
    const { candidateId, candidate_id } = req.body;
    const finalCandidateId = candidateId || candidate_id;
    const achievementId = req.params.achievementId;

    // Check if achievement is unlocked
    const userAchievement = db.prepare(`
      SELECT * FROM candidate_achievements
      WHERE candidate_id = ? AND achievement_id = ?
    `).get(finalCandidateId, achievementId);

    if (!userAchievement) {
      return res.status(400).json({ success: false, error: 'Achievement not unlocked' });
    }

    if (userAchievement.claimed === 1) {
      return res.status(400).json({ success: false, error: 'Achievement already claimed' });
    }

    // Get achievement XP reward
    const achievement = db.prepare('SELECT * FROM achievements WHERE id = ?').get(achievementId);
    if (!achievement) {
      return res.status(404).json({ success: false, error: 'Achievement not found' });
    }

    // Mark as claimed
    db.prepare(`
      UPDATE candidate_achievements
      SET claimed = 1, claimed_at = CURRENT_TIMESTAMP
      WHERE candidate_id = ? AND achievement_id = ?
    `).run(finalCandidateId, achievementId);

    // Award XP and points (1:1)
    if (achievement.xp_reward > 0) {
      db.prepare('UPDATE candidates SET xp = xp + ?, current_points = current_points + ? WHERE id = ?').run(achievement.xp_reward, achievement.xp_reward, finalCandidateId);
      db.prepare(`
        INSERT INTO xp_transactions (candidate_id, amount, reason, reference_id)
        VALUES (?, ?, 'achievement_claim', ?)
      `).run(finalCandidateId, achievement.xp_reward, achievementId);
    }

    // Check for level up
    const candidate = db.prepare('SELECT xp, level FROM candidates WHERE id = ?').get(finalCandidateId);
    const newLevel = calculateLevel(candidate.xp);
    const leveledUp = newLevel > candidate.level;

    if (leveledUp) {
      db.prepare('UPDATE candidates SET level = ? WHERE id = ?').run(newLevel, finalCandidateId);
    }

    res.json({
      success: true,
      data: {
        achievement,
        xp_awarded: achievement.xp_reward,
        new_xp: candidate.xp,
        new_level: leveledUp ? newLevel : candidate.level,
        leveled_up: leveledUp,
      },
    });
  } catch (error) {
    console.error('Achievement claim error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check and unlock automatic achievements (Career Ladder Strategy)
// Categories: Reliable, Skilled, Social
router.post('/achievements/check/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const unlockedAchievements = [];

    // Get candidate info with stats
    const candidate = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM deployments WHERE candidate_id = c.id AND status = 'completed') as completed_shifts,
        (SELECT COUNT(DISTINCT strftime('%Y-%m-%d', created_at))
         FROM deployments
         WHERE candidate_id = c.id
         AND status = 'completed'
         AND strftime('%w', created_at) IN ('0', '6')) as weekend_shifts,
        (SELECT COUNT(DISTINCT json_extract(j.required_skills, '$[0]'))
         FROM deployments d
         JOIN jobs j ON d.job_id = j.id
         WHERE d.candidate_id = c.id AND d.status = 'completed') as job_categories
      FROM candidates c WHERE c.id = ?
    `).get(candidateId);

    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    // Get referral count
    const referralCount = db.prepare(`
      SELECT COUNT(*) as count FROM referrals
      WHERE referrer_id = ? AND status = 'completed'
    `).get(candidateId)?.count || 0;

    // Get consecutive 5-star ratings
    const fiveStarStreak = db.prepare(`
      SELECT COUNT(*) as count FROM deployments
      WHERE candidate_id = ? AND rating = 5 AND status = 'completed'
    `).get(candidateId)?.count || 0;

    // Get training modules completed
    const trainingCount = db.prepare(`
      SELECT COUNT(*) as count FROM training
    `).get()?.count || 0;

    const completedTraining = db.prepare(`
      SELECT COUNT(DISTINCT t.id) as count
      FROM training t
      WHERE t.id IN (
        SELECT json_each.value FROM candidates c, json_each(c.certifications)
        WHERE c.id = ?
      )
    `).get(candidateId)?.count || 0;

    // Helper to unlock achievement if not already unlocked
    const tryUnlock = (achievementId) => {
      const existing = db.prepare(
        'SELECT * FROM candidate_achievements WHERE candidate_id = ? AND achievement_id = ?'
      ).get(candidateId, achievementId);

      if (!existing) {
        const achievement = db.prepare('SELECT * FROM achievements WHERE id = ?').get(achievementId);
        if (achievement) {
          db.prepare(`
            INSERT INTO candidate_achievements (candidate_id, achievement_id, claimed)
            VALUES (?, ?, 0)
          `).run(candidateId, achievementId);
          unlockedAchievements.push(achievement);
        }
      }
    };

    // THE RELIABLE - Attendance Focused
    // Ironclad I: 10 shifts without cancellation
    if (candidate.completed_shifts >= 10) {
      tryUnlock('ACH_IRONCLAD_1');
    }
    // Ironclad II: 50 shifts without cancellation
    if (candidate.completed_shifts >= 50) {
      tryUnlock('ACH_IRONCLAD_2');
    }
    // Ironclad III: 100 shifts without cancellation
    if (candidate.completed_shifts >= 100) {
      tryUnlock('ACH_IRONCLAD_3');
    }
    // The Closer: 10 shifts on holidays/weekends
    if (candidate.weekend_shifts >= 10) {
      tryUnlock('ACH_CLOSER');
    }

    // THE SKILLED - Performance Focused
    // Five-Star General: 5.0 rating for 20 consecutive shifts
    if (fiveStarStreak >= 20) {
      tryUnlock('ACH_FIVE_STAR');
    }
    // Jack of All Trades: Jobs in 3 different categories
    if (candidate.job_categories >= 3) {
      tryUnlock('ACH_JACK');
    }
    // Certified Pro: Complete all training modules
    if (trainingCount > 0 && completedTraining >= trainingCount) {
      tryUnlock('ACH_CERTIFIED');
    }

    // THE SOCIAL - Community Focused
    // Headhunter: Refer 5 workers
    if (referralCount >= 5) {
      tryUnlock('ACH_HEADHUNTER');
    }

    res.json({
      success: true,
      data: {
        unlocked: unlockedAchievements,
        count: unlockedAchievements.length,
        stats: {
          completed_shifts: candidate.completed_shifts,
          weekend_shifts: candidate.weekend_shifts,
          job_categories: candidate.job_categories,
          five_star_streak: fiveStarStreak,
          referral_count: referralCount,
          training_completed: completedTraining,
          training_total: trainingCount,
        },
      },
    });
  } catch (error) {
    console.error('Achievement check error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all quests
router.get('/quests', (req, res) => {
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

    const parsed = quests.map(q => ({
      ...q,
      requirement: JSON.parse(q.requirement || '{}'),
    }));

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
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start quest
router.post('/quests/:questId/start', (req, res) => {
  try {
    const { candidate_id } = req.body;
    const quest = db.prepare('SELECT * FROM quests WHERE id = ?').get(req.params.questId);
    
    if (!quest) {
      return res.status(404).json({ success: false, error: 'Quest not found' });
    }
    
    const requirement = JSON.parse(quest.requirement || '{}');

    db.prepare(`
      INSERT OR REPLACE INTO candidate_quests (candidate_id, quest_id, progress, target, completed)
      VALUES (?, ?, 0, ?, 0)
    `).run(candidate_id, req.params.questId, requirement.count || 1);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update quest progress (for check-in type quests)
router.post('/quests/:questId/progress', (req, res) => {
  try {
    const { candidateId, increment = 1 } = req.body;
    const questId = req.params.questId;

    // Check if quest exists
    const quest = db.prepare('SELECT * FROM quests WHERE id = ?').get(questId);
    if (!quest) {
      return res.status(404).json({ success: false, error: 'Quest not found' });
    }

    const requirement = JSON.parse(quest.requirement || '{}');
    const target = requirement.count || 1;

    // Check if candidate has started this quest
    let candidateQuest = db.prepare(`
      SELECT * FROM candidate_quests WHERE candidate_id = ? AND quest_id = ?
    `).get(candidateId, questId);

    if (!candidateQuest) {
      // Auto-start the quest
      db.prepare(`
        INSERT INTO candidate_quests (candidate_id, quest_id, progress, target, completed, claimed)
        VALUES (?, ?, 0, ?, 0, 0)
      `).run(candidateId, questId, target);
      
      candidateQuest = { progress: 0, target, completed: 0, claimed: 0 };
    }

    // Check if already claimed
    if (candidateQuest.claimed) {
      return res.status(400).json({ success: false, error: 'Quest already claimed' });
    }

    // Update progress
    const newProgress = Math.min(candidateQuest.progress + increment, target);
    const isCompleted = newProgress >= target;

    db.prepare(`
      UPDATE candidate_quests 
      SET progress = ?, completed = ?, completed_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE candidate_id = ? AND quest_id = ?
    `).run(newProgress, isCompleted ? 1 : 0, isCompleted ? 1 : 0, candidateId, questId);

    res.json({
      success: true,
      data: {
        progress: newProgress,
        target,
        completed: isCompleted,
        status: isCompleted ? 'claimable' : 'in_progress',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Complete quest (mark progress as complete, not yet claimed)
router.post('/quests/:questId/complete', (req, res) => {
  try {
    const { candidate_id } = req.body;

    // Mark as completed (ready to claim)
    db.prepare(`
      UPDATE candidate_quests
      SET completed = 1, completed_at = CURRENT_TIMESTAMP
      WHERE candidate_id = ? AND quest_id = ?
    `).run(candidate_id, req.params.questId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Claim quest reward (award XP)
router.post('/quests/:questId/claim', (req, res) => {
  try {
    const { candidateId, candidate_id } = req.body;
    const finalCandidateId = candidateId || candidate_id;
    const questId = req.params.questId;
    const todaySG = getSGDateString(); // Today's date in Singapore timezone

    // Check if quest exists
    const quest = db.prepare('SELECT * FROM quests WHERE id = ?').get(questId);
    if (!quest) {
      return res.status(404).json({ success: false, error: 'Quest not found' });
    }

    const requirement = JSON.parse(quest.requirement || '{}');
    const target = requirement.count || 1;

    // Check if this is a daily quest (resets at midnight)
    const isDailyQuest = quest.type === 'daily' || requirement.type === 'checkin' || requirement.type === 'daily_login';

    // Check if this is a simple claimable quest (like daily check-in)
    const isSimpleQuest = target === 1 && (
      requirement.type === 'checkin' || 
      requirement.type === 'daily_login' ||
      quest.title?.toLowerCase().includes('check-in') ||
      quest.title?.toLowerCase().includes('daily check')
    );

    // Check candidate's quest progress
    let candidateQuest = db.prepare(`
      SELECT * FROM candidate_quests
      WHERE candidate_id = ? AND quest_id = ?
    `).get(finalCandidateId, questId);

    // For daily quests, check if already claimed TODAY
    if (isDailyQuest && candidateQuest?.claimed_at) {
      const claimedDate = candidateQuest.claimed_at.substring(0, 10);
      if (claimedDate === todaySG) {
        return res.status(400).json({ success: false, error: 'Already claimed today! Come back tomorrow.' });
      }
      // It's a new day - reset the quest for re-claim
      db.prepare(`
        UPDATE candidate_quests 
        SET progress = 0, completed = 0, claimed = 0, claimed_at = NULL
        WHERE candidate_id = ? AND quest_id = ?
      `).run(finalCandidateId, questId);
      candidateQuest = { ...candidateQuest, progress: 0, completed: 0, claimed: 0, claimed_at: null };
    }

    // Auto-create quest record if doesn't exist and it's a simple quest
    if (!candidateQuest && isSimpleQuest) {
      db.prepare(`
        INSERT INTO candidate_quests (candidate_id, quest_id, progress, target, completed, claimed)
        VALUES (?, ?, 1, 1, 1, 0)
      `).run(finalCandidateId, questId);
      candidateQuest = { progress: 1, target: 1, completed: 1, claimed: 0 };
    }

    if (!candidateQuest) {
      return res.status(400).json({ success: false, error: 'Quest not started' });
    }

    if (candidateQuest.claimed && !isDailyQuest) {
      return res.status(400).json({ success: false, error: 'Quest already claimed' });
    }

    if (candidateQuest.progress < target && !isSimpleQuest) {
      return res.status(400).json({ success: false, error: 'Quest not completed yet' });
    }

    // Mark as claimed with current timestamp
    db.prepare(`
      UPDATE candidate_quests
      SET claimed = 1, claimed_at = CURRENT_TIMESTAMP, progress = ?, completed = 1
      WHERE candidate_id = ? AND quest_id = ?
    `).run(target, finalCandidateId, questId);

    // Get current XP before update
    const candidateBefore = db.prepare('SELECT xp, level, current_points FROM candidates WHERE id = ?').get(finalCandidateId);
    const oldXP = candidateBefore?.xp || 0;
    const oldPoints = candidateBefore?.current_points || 0;

    // Award XP and points (1:1)
    db.prepare('UPDATE candidates SET xp = xp + ?, current_points = current_points + ? WHERE id = ?').run(quest.xp_reward, quest.xp_reward, finalCandidateId);
    db.prepare(`
      INSERT INTO xp_transactions (candidate_id, amount, reason, reference_id)
      VALUES (?, ?, 'quest_claim', ?)
    `).run(finalCandidateId, quest.xp_reward, questId);

    // Update streak for daily check-in
    if (isSimpleQuest) {
      const candidate = db.prepare('SELECT streak_days, streak_last_date FROM candidates WHERE id = ?').get(finalCandidateId);
      let newStreak = 1;
      
      if (candidate?.streak_last_date) {
        const lastDate = candidate.streak_last_date;
        // Calculate yesterday's date in SG timezone
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdaySG = yesterday.toLocaleDateString('sv-SE', { timeZone: 'Asia/Singapore' });
        
        if (lastDate === yesterdaySG) {
          // Consecutive day - increment streak
          newStreak = (candidate.streak_days || 0) + 1;
        } else if (lastDate === todaySG) {
          // Already checked in today - keep current streak
          newStreak = candidate.streak_days || 1;
        }
        // Otherwise streak resets to 1
      }
      
      db.prepare('UPDATE candidates SET streak_days = ?, streak_last_date = ? WHERE id = ?')
        .run(newStreak, todaySG, finalCandidateId);
    }

    // Check for level up
    const candidate = db.prepare('SELECT xp, level, streak_days FROM candidates WHERE id = ?').get(finalCandidateId);
    const newLevel = calculateLevel(candidate.xp);
    const leveledUp = newLevel > (candidateBefore?.level || 1);

    if (leveledUp) {
      db.prepare('UPDATE candidates SET level = ? WHERE id = ?').run(newLevel, finalCandidateId);
    }

    res.json({
      success: true,
      data: {
        xp_awarded: quest.xp_reward,
        old_xp: oldXP,
        new_xp: candidate.xp,
        old_level: candidateBefore?.level || 1,
        new_level: newLevel,
        leveled_up: leveledUp,
        streak_days: candidate.streak_days,
      },
    });
  } catch (error) {
    console.error('Quest claim error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's quests with progress
router.get('/quests/user/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const todaySG = getSGDateString(); // Today's date in Singapore timezone (YYYY-MM-DD)

    // Get all active quests with user progress (if any)
    const quests = db.prepare(`
      SELECT q.*,
        COALESCE(cq.progress, 0) as progress,
        COALESCE(cq.completed, 0) as completed,
        COALESCE(cq.claimed, 0) as claimed,
        cq.started_at,
        cq.completed_at,
        cq.claimed_at
      FROM quests q
      LEFT JOIN candidate_quests cq ON q.id = cq.quest_id AND cq.candidate_id = ?
      WHERE q.active = 1
      ORDER BY q.type, q.xp_reward DESC
    `).all(candidateId);

    const parsed = quests.map(q => {
      const requirement = JSON.parse(q.requirement || '{}');
      const target = requirement.count || 1;
      const progress = q.progress || 0;
      const isClaimed = q.claimed === 1;
      const isCompleted = progress >= target;
      
      // Check if this is a daily quest (resets at midnight)
      const isDailyQuest = q.type === 'daily' || requirement.type === 'checkin' || requirement.type === 'daily_login';
      
      // Check if this is a simple quest (target=1) like daily check-in
      const isSimpleQuest = target === 1 && (
        requirement.type === 'checkin' || 
        requirement.type === 'daily_login' ||
        q.title?.toLowerCase().includes('check-in') ||
        q.title?.toLowerCase().includes('daily check')
      );

      // For daily quests, check if already claimed TODAY
      let claimedToday = false;
      if (isDailyQuest && q.claimed_at) {
        const claimedDate = q.claimed_at.substring(0, 10); // Get YYYY-MM-DD from timestamp
        claimedToday = claimedDate === todaySG;
      }

      let status;
      if (isDailyQuest) {
        // Daily quests reset at midnight - only "claimed" if claimed today
        if (claimedToday) {
          status = 'claimed';
        } else if (isSimpleQuest) {
          status = 'claimable'; // Daily check-in is always claimable if not claimed today
        } else if (isCompleted) {
          status = 'claimable';
        } else if (progress > 0) {
          status = 'in_progress';
        } else {
          status = 'available';
        }
      } else {
        // Non-daily quests use normal logic
        if (isClaimed) {
          status = 'claimed';
        } else if (isCompleted) {
          status = 'claimable';
        } else if (progress > 0) {
          status = 'in_progress';
        } else {
          status = 'available';
        }
      }

      return {
        ...q,
        requirement,
        target,
        progress: isDailyQuest && !claimedToday ? 0 : progress, // Reset progress display for new day
        status,
        claimedToday,
      };
    });

    res.json({ success: true, data: parsed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update streak (Career Ladder Strategy - work streak for weekly quest)
router.post('/streak/update', (req, res) => {
  try {
    const { candidate_id } = req.body;
    const today = getSGDateString(); // Singapore timezone

    const candidate = db.prepare('SELECT streak_days, streak_last_date FROM candidates WHERE id = ?').get(candidate_id);

    let newStreak = 1;
    if (candidate.streak_last_date) {
      const lastDate = new Date(candidate.streak_last_date);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Already logged in today
        return res.json({ success: true, streak: candidate.streak_days, already_updated: true });
      } else if (diffDays === 1) {
        // Consecutive day
        newStreak = candidate.streak_days + 1;
      }
      // If diffDays > 1, streak resets to 1
    }

    db.prepare(`
      UPDATE candidates SET streak_days = ?, streak_last_date = ? WHERE id = ?
    `).run(newStreak, today, candidate_id);

    // Check for "Streak Keeper" weekly quest progress (3 days in a row)
    if (newStreak >= 3) {
      // Update quest progress for Streak Keeper
      const streakQuest = db.prepare('SELECT * FROM quests WHERE id = ?').get('QST_STREAK');
      if (streakQuest) {
        const candidateQuest = db.prepare(`
          SELECT * FROM candidate_quests WHERE candidate_id = ? AND quest_id = ?
        `).get(candidate_id, 'QST_STREAK');

        if (!candidateQuest) {
          db.prepare(`
            INSERT INTO candidate_quests (candidate_id, quest_id, progress, target, completed, claimed)
            VALUES (?, 'QST_STREAK', 3, 3, 1, 0)
          `).run(candidate_id);
        } else if (!candidateQuest.claimed) {
          db.prepare(`
            UPDATE candidate_quests
            SET progress = 3, completed = 1, completed_at = CURRENT_TIMESTAMP
            WHERE candidate_id = ? AND quest_id = 'QST_STREAK'
          `).run(candidate_id);
        }
      }
    }

    res.json({
      success: true,
      data: {
        streak: newStreak,
        streak_keeper_complete: newStreak >= 3,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get leaderboard
router.get('/leaderboard', (req, res) => {
  try {
    const { period = 'all', limit = 20 } = req.query;

    const leaderboard = db.prepare(`
      SELECT id, name, xp, level, total_jobs_completed, rating, profile_photo, streak_days, profile_flair, selected_border_id
      FROM candidates
      WHERE status = 'active'
      ORDER BY xp DESC
      LIMIT ?
    `).all(parseInt(limit));

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all profile borders with unlock status for a candidate
router.get('/borders/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const { page = 1, limit = 20, tier, unlocked } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get candidate info for level check
    const candidate = db.prepare(`
      SELECT level, selected_border_id FROM candidates WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    // Get candidate's achievements
    const achievements = db.prepare(`
      SELECT achievement_id FROM candidate_achievements WHERE candidate_id = ?
    `).all(candidateId);
    const achievementIds = new Set(achievements.map(a => a.achievement_id));

    // Build WHERE clause for filters
    let whereClause = 'WHERE pb.active = 1';
    let params = [candidateId];

    if (tier) {
      whereClause += ' AND pb.tier = ?';
      params.push(tier);
    }

    // Get total count for pagination (before applying unlock filter since it's computed)
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM profile_borders pb
      LEFT JOIN candidate_borders cb ON pb.id = cb.border_id AND cb.candidate_id = ?
      ${whereClause.replace('WHERE pb.active = 1', '')}
      WHERE pb.active = 1 ${tier ? 'AND pb.tier = ?' : ''}
    `;
    const totalParams = tier ? [candidateId, tier] : [candidateId];
    const { total } = db.prepare(totalQuery).get(...totalParams);

    // Get all borders with pagination
    const bordersQuery = `
      SELECT pb.*,
        CASE WHEN cb.candidate_id IS NOT NULL THEN 1 ELSE 0 END as manually_unlocked,
        cb.is_selected
      FROM profile_borders pb
      LEFT JOIN candidate_borders cb ON pb.id = cb.border_id AND cb.candidate_id = ?
      ${whereClause}
      ORDER BY
        CASE pb.tier
          WHEN 'bronze' THEN 1
          WHEN 'silver' THEN 2
          WHEN 'gold' THEN 3
          WHEN 'platinum' THEN 4
          WHEN 'diamond' THEN 5
          WHEN 'mythic' THEN 6
          WHEN 'special' THEN 7
        END,
        pb.rarity
      LIMIT ? OFFSET ?
    `;
    const borders = db.prepare(bordersQuery).all(...params, parseInt(limit), offset);

    const parsed = borders.map(border => {
      const requirement = JSON.parse(border.unlock_requirement || '{}');
      let unlocked = border.manually_unlocked === 1;
      let unlockReason = null;

      // Check unlock conditions
      if (!unlocked) {
        if (border.unlock_type === 'level' && requirement.level) {
          unlocked = candidate.level >= requirement.level;
          if (!unlocked) unlockReason = `Reach Level ${requirement.level}`;
        } else if (border.unlock_type === 'achievement' && requirement.achievement_id) {
          unlocked = achievementIds.has(requirement.achievement_id);
          if (!unlocked) unlockReason = 'Unlock achievement';
        } else if (border.unlock_type === 'special') {
          unlockReason = 'Special event border';
        }
      }

      return {
        id: border.id,
        name: border.name,
        description: border.description,
        tier: border.tier,
        rarity: border.rarity,
        gradient: border.gradient,
        glow: border.glow,
        animation: border.animation,
        unlocked,
        unlockReason,
        isSelected: border.id === candidate.selected_border_id,
      };
    });

    // Apply unlock filter if specified (after computing unlock status)
    let filteredParsed = parsed;
    if (unlocked !== undefined) {
      filteredParsed = parsed.filter(border => {
        return unlocked === 'true' ? border.unlocked : !border.unlocked;
      });
    }

    res.json({
      success: true,
      data: {
        borders: filteredParsed,
        selectedBorderId: candidate.selected_border_id,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get borders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Select a border for the candidate
router.post('/borders/:candidateId/select', (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const { borderId } = req.body;

    // If borderId is null, remove custom border (use default level-based)
    if (!borderId) {
      db.prepare('UPDATE candidates SET selected_border_id = NULL WHERE id = ?').run(candidateId);
      return res.json({ success: true, data: { selectedBorderId: null } });
    }

    // Check if border exists
    const border = db.prepare('SELECT * FROM profile_borders WHERE id = ?').get(borderId);
    if (!border) {
      return res.status(404).json({ success: false, error: 'Border not found' });
    }

    // Check if candidate has unlocked this border
    const candidate = db.prepare('SELECT level FROM candidates WHERE id = ?').get(candidateId);
    const requirement = JSON.parse(border.unlock_requirement || '{}');

    let unlocked = false;

    // Check manually unlocked
    const manualUnlock = db.prepare(`
      SELECT * FROM candidate_borders WHERE candidate_id = ? AND border_id = ?
    `).get(candidateId, borderId);

    if (manualUnlock) {
      unlocked = true;
    } else if (border.unlock_type === 'level' && requirement.level) {
      unlocked = candidate.level >= requirement.level;
    } else if (border.unlock_type === 'achievement' && requirement.achievement_id) {
      const hasAchievement = db.prepare(`
        SELECT * FROM candidate_achievements WHERE candidate_id = ? AND achievement_id = ?
      `).get(candidateId, requirement.achievement_id);
      unlocked = !!hasAchievement;
    }

    if (!unlocked) {
      return res.status(403).json({ success: false, error: 'Border not unlocked' });
    }

    // Update selected border
    db.prepare('UPDATE candidates SET selected_border_id = ? WHERE id = ?').run(borderId, candidateId);

    // Also add to candidate_borders if not there
    db.prepare(`
      INSERT OR IGNORE INTO candidate_borders (candidate_id, border_id, is_selected)
      VALUES (?, ?, 1)
    `).run(candidateId, borderId);

    // Update is_selected flags
    db.prepare('UPDATE candidate_borders SET is_selected = 0 WHERE candidate_id = ?').run(candidateId);
    db.prepare('UPDATE candidate_borders SET is_selected = 1 WHERE candidate_id = ? AND border_id = ?').run(candidateId, borderId);

    res.json({ success: true, data: { selectedBorderId: borderId } });
  } catch (error) {
    console.error('Select border error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// REWARDS SHOP (The Sink) - Career Ladder Strategy
// =====================================================

// Get all active rewards
router.get('/rewards', (req, res) => {
  try {
    const { page = 1, limit = 20, category, tier_required } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause for filters
    let whereClause = 'WHERE active = 1';
    let params = [];

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    if (tier_required) {
      whereClause += ' AND tier_required = ?';
      params.push(tier_required);
    }

    // Get total count for pagination
    const totalQuery = `SELECT COUNT(*) as total FROM rewards ${whereClause}`;
    const { total } = db.prepare(totalQuery).get(...params);

    // Get rewards with pagination
    const rewardsQuery = `
      SELECT * FROM rewards
      ${whereClause}
      ORDER BY category, points_cost
      LIMIT ? OFFSET ?
    `;
    const rewards = db.prepare(rewardsQuery).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: rewards,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's available and purchased rewards
router.get('/rewards/user/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;

    // Get candidate info for tier check
    const candidate = db.prepare(`
      SELECT current_points, current_tier, level FROM candidates WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    // Get all active rewards
    const rewards = db.prepare(`
      SELECT * FROM rewards WHERE active = 1 ORDER BY category, points_cost
    `).all();

    // Get user's purchases
    const purchases = db.prepare(`
      SELECT rp.*, r.name as reward_name
      FROM reward_purchases rp
      JOIN rewards r ON rp.reward_id = r.id
      WHERE rp.candidate_id = ?
      ORDER BY rp.created_at DESC
    `).all(candidateId);

    // Create a map of purchased reward counts
    const purchaseCounts = {};
    purchases.forEach(p => {
      purchaseCounts[p.reward_id] = (purchaseCounts[p.reward_id] || 0) + 1;
    });

    // Tier hierarchy for comparison
    const tierOrder = { bronze: 0, silver: 1, gold: 2, platinum: 3, diamond: 4, mythic: 5 };
    const userTierLevel = tierOrder[candidate.current_tier] || 0;

    // Annotate rewards with availability info
    const annotatedRewards = rewards.map(reward => {
      const requiredTierLevel = tierOrder[reward.tier_required] || 0;
      const meetsRequirement = userTierLevel >= requiredTierLevel;
      const canAfford = candidate.current_points >= reward.points_cost;
      const inStock = reward.stock === null || reward.stock > 0;
      const purchaseCount = purchaseCounts[reward.id] || 0;

      return {
        ...reward,
        meetsRequirement,
        canAfford,
        inStock,
        purchaseCount,
        canPurchase: meetsRequirement && canAfford && inStock,
      };
    });

    res.json({
      success: true,
      data: {
        rewards: annotatedRewards,
        purchases,
        userPoints: candidate.current_points,
        userTier: candidate.current_tier,
        userLevel: candidate.level,
      },
    });
  } catch (error) {
    console.error('Get user rewards error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Purchase a reward
router.post('/rewards/:rewardId/purchase', (req, res) => {
  try {
    const rewardId = req.params.rewardId;
    const { candidateId } = req.body;

    if (!candidateId) {
      return res.status(400).json({ success: false, error: 'candidateId is required' });
    }

    // Get reward
    const reward = db.prepare('SELECT * FROM rewards WHERE id = ? AND active = 1').get(rewardId);
    if (!reward) {
      return res.status(404).json({ success: false, error: 'Reward not found' });
    }

    // Get candidate
    const candidate = db.prepare(`
      SELECT id, current_points, current_tier, level FROM candidates WHERE id = ?
    `).get(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    // Check tier requirement
    const tierOrder = { bronze: 0, silver: 1, gold: 2, platinum: 3, diamond: 4, mythic: 5 };
    const userTierLevel = tierOrder[candidate.current_tier] || 0;
    const requiredTierLevel = tierOrder[reward.tier_required] || 0;

    if (userTierLevel < requiredTierLevel) {
      return res.status(403).json({
        success: false,
        error: `You need ${reward.tier_required} tier or higher to purchase this reward`,
      });
    }

    // Check points
    if (candidate.current_points < reward.points_cost) {
      return res.status(400).json({
        success: false,
        error: `Not enough points. Need ${reward.points_cost}, have ${candidate.current_points}`,
      });
    }

    // Check stock
    if (reward.stock !== null && reward.stock <= 0) {
      return res.status(400).json({ success: false, error: 'This reward is out of stock' });
    }

    // Create purchase record
    const purchaseId = `PUR_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Feature unlocks are auto-fulfilled
    const status = reward.category === 'feature' ? 'fulfilled' : 'pending';
    const fulfilledAt = reward.category === 'feature' ? new Date().toISOString() : null;

    db.prepare(`
      INSERT INTO reward_purchases (id, candidate_id, reward_id, points_spent, status, fulfilled_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(purchaseId, candidateId, rewardId, reward.points_cost, status, fulfilledAt);

    // Deduct points
    db.prepare('UPDATE candidates SET current_points = current_points - ? WHERE id = ?')
      .run(reward.points_cost, candidateId);

    // Decrement stock if limited
    if (reward.stock !== null) {
      db.prepare('UPDATE rewards SET stock = stock - 1 WHERE id = ?').run(rewardId);
    }

    // Get updated points
    const updatedCandidate = db.prepare('SELECT current_points FROM candidates WHERE id = ?').get(candidateId);

    res.json({
      success: true,
      data: {
        purchaseId,
        reward: reward.name,
        pointsSpent: reward.points_cost,
        newBalance: updatedCandidate.current_points,
        status,
      },
    });
  } catch (error) {
    console.error('Purchase reward error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// PROFILE FLAIR - Requires RWD_PROFILE_FLAIR reward
// =====================================================

// Get user's flair and check if they own the reward
router.get('/flair/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;

    const candidate = db.prepare(`
      SELECT profile_flair FROM candidates WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    // Check if user owns Profile Flair reward
    const ownsReward = db.prepare(`
      SELECT COUNT(*) as count FROM reward_purchases
      WHERE candidate_id = ? AND reward_id = 'RWD_PROFILE_FLAIR' AND status = 'fulfilled'
    `).get(candidateId).count > 0;

    res.json({
      success: true,
      data: {
        flair: candidate.profile_flair,
        ownsReward,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Set user's flair (requires owning Profile Flair reward)
router.post('/flair/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const { flair } = req.body;

    // Check if user owns Profile Flair reward
    const ownsReward = db.prepare(`
      SELECT COUNT(*) as count FROM reward_purchases
      WHERE candidate_id = ? AND reward_id = 'RWD_PROFILE_FLAIR' AND status = 'fulfilled'
    `).get(candidateId).count > 0;

    if (!ownsReward) {
      return res.status(403).json({
        success: false,
        error: 'You need to purchase the Profile Flair reward first',
      });
    }

    // Validate flair (should be a single emoji or short text)
    if (flair && flair.length > 10) {
      return res.status(400).json({ success: false, error: 'Flair must be 10 characters or less' });
    }

    // Update flair
    db.prepare('UPDATE candidates SET profile_flair = ? WHERE id = ?').run(flair || null, candidateId);

    res.json({
      success: true,
      data: { flair: flair || null },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// THEME PREFERENCE - Requires RWD_DARK_MODE reward
// =====================================================

// Available themes
const THEMES = ['default', 'midnight', 'ocean', 'forest', 'sunset', 'purple'];

// Get user's theme and check if they own the reward
router.get('/theme/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;

    const candidate = db.prepare(`
      SELECT theme_preference FROM candidates WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    // Check if user owns Dark Mode Pro reward
    const ownsReward = db.prepare(`
      SELECT COUNT(*) as count FROM reward_purchases
      WHERE candidate_id = ? AND reward_id = 'RWD_DARK_MODE' AND status = 'fulfilled'
    `).get(candidateId).count > 0;

    res.json({
      success: true,
      data: {
        theme: candidate.theme_preference || 'default',
        ownsReward,
        availableThemes: ownsReward ? THEMES : ['default'],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Set user's theme (requires owning Dark Mode Pro reward for non-default themes)
router.post('/theme/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const { theme } = req.body;

    // Validate theme
    if (!THEMES.includes(theme)) {
      return res.status(400).json({ success: false, error: 'Invalid theme' });
    }

    // Check if user owns Dark Mode Pro reward (required for non-default themes)
    if (theme !== 'default') {
      const ownsReward = db.prepare(`
        SELECT COUNT(*) as count FROM reward_purchases
        WHERE candidate_id = ? AND reward_id = 'RWD_DARK_MODE' AND status = 'fulfilled'
      `).get(candidateId).count > 0;

      if (!ownsReward) {
        return res.status(403).json({
          success: false,
          error: 'You need to purchase the Dark Mode Pro reward first',
        });
      }
    }

    // Update theme
    db.prepare('UPDATE candidates SET theme_preference = ? WHERE id = ?').run(theme, candidateId);

    res.json({
      success: true,
      data: { theme },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
