const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { XP_THRESHOLDS, calculateLevel } = require('../../../shared/constants');

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
    const { candidate_id, amount, reason, reference_id } = req.body;

    // Add XP transaction
    db.prepare(`
      INSERT INTO xp_transactions (candidate_id, amount, reason, reference_id)
      VALUES (?, ?, ?, ?)
    `).run(candidate_id, amount, reason, reference_id);

    // Update candidate XP
    db.prepare('UPDATE candidates SET xp = xp + ? WHERE id = ?').run(amount, candidate_id);

    // Check for level up
    const candidate = db.prepare('SELECT xp, level FROM candidates WHERE id = ?').get(candidate_id);
    const newLevel = calculateLevel(candidate.xp);

    if (newLevel > candidate.level) {
      db.prepare('UPDATE candidates SET level = ? WHERE id = ?').run(newLevel, candidate_id);
    }

    res.json({
      success: true,
      data: {
        xp: candidate.xp,
        level: newLevel,
        leveledUp: newLevel > candidate.level,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all achievements
router.get('/achievements', (req, res) => {
  try {
    const achievements = db.prepare('SELECT * FROM achievements ORDER BY category, rarity').all();
    res.json({ success: true, data: achievements });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Unlock achievement
router.post('/achievements/unlock', (req, res) => {
  try {
    const { candidate_id, achievement_id } = req.body;

    // Check if already unlocked
    const existing = db.prepare(
      'SELECT * FROM candidate_achievements WHERE candidate_id = ? AND achievement_id = ?'
    ).get(candidate_id, achievement_id);

    if (existing) {
      return res.json({ success: true, already_unlocked: true });
    }

    // Get achievement XP reward
    const achievement = db.prepare('SELECT * FROM achievements WHERE id = ?').get(achievement_id);

    // Unlock achievement
    db.prepare(`
      INSERT INTO candidate_achievements (candidate_id, achievement_id)
      VALUES (?, ?)
    `).run(candidate_id, achievement_id);

    // Award XP
    if (achievement.xp_reward > 0) {
      db.prepare('UPDATE candidates SET xp = xp + ? WHERE id = ?').run(achievement.xp_reward, candidate_id);
      db.prepare(`
        INSERT INTO xp_transactions (candidate_id, amount, reason, reference_id)
        VALUES (?, ?, 'achievement', ?)
      `).run(candidate_id, achievement.xp_reward, achievement_id);
    }

    res.json({
      success: true,
      data: {
        achievement,
        xp_awarded: achievement.xp_reward,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all quests
router.get('/quests', (req, res) => {
  try {
    const quests = db.prepare('SELECT * FROM quests WHERE active = 1').all();
    const parsed = quests.map(q => ({
      ...q,
      requirement: JSON.parse(q.requirement || '{}'),
    }));
    res.json({ success: true, data: parsed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start quest
router.post('/quests/:questId/start', (req, res) => {
  try {
    const { candidate_id } = req.body;
    const quest = db.prepare('SELECT * FROM quests WHERE id = ?').get(req.params.questId);
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

// Complete quest
router.post('/quests/:questId/complete', (req, res) => {
  try {
    const { candidate_id } = req.body;
    const quest = db.prepare('SELECT * FROM quests WHERE id = ?').get(req.params.questId);

    // Mark as completed
    db.prepare(`
      UPDATE candidate_quests 
      SET completed = 1, completed_at = CURRENT_TIMESTAMP 
      WHERE candidate_id = ? AND quest_id = ?
    `).run(candidate_id, req.params.questId);

    // Award XP
    db.prepare('UPDATE candidates SET xp = xp + ? WHERE id = ?').run(quest.xp_reward, candidate_id);
    db.prepare(`
      INSERT INTO xp_transactions (candidate_id, amount, reason, reference_id)
      VALUES (?, ?, 'quest', ?)
    `).run(candidate_id, quest.xp_reward, req.params.questId);

    res.json({
      success: true,
      data: { xp_awarded: quest.xp_reward },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update streak
router.post('/streak/update', (req, res) => {
  try {
    const { candidate_id } = req.body;
    const today = new Date().toISOString().split('T')[0];

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

    // Check for streak achievements
    const streakAchievements = [
      { days: 7, id: 'ACH005' },
      { days: 30, id: 'ACH006' },
    ];

    let unlockedAchievement = null;
    for (const sa of streakAchievements) {
      if (newStreak >= sa.days) {
        const existing = db.prepare(
          'SELECT * FROM candidate_achievements WHERE candidate_id = ? AND achievement_id = ?'
        ).get(candidate_id, sa.id);

        if (!existing) {
          db.prepare(`
            INSERT INTO candidate_achievements (candidate_id, achievement_id)
            VALUES (?, ?)
          `).run(candidate_id, sa.id);
          unlockedAchievement = db.prepare('SELECT * FROM achievements WHERE id = ?').get(sa.id);
        }
      }
    }

    res.json({
      success: true,
      data: {
        streak: newStreak,
        unlockedAchievement,
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
      SELECT id, name, xp, level, total_jobs_completed, rating, profile_photo, streak_days
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

module.exports = router;
