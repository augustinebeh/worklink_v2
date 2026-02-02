const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { XP_THRESHOLDS, calculateLevel, getSGDateString } = require('../../../shared/constants');

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

// Get user's achievements with claimed status
router.get('/achievements/user/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;

    // Get user's unlocked achievements with claimed status
    const userAchievements = db.prepare(`
      SELECT ca.*, a.name, a.description, a.icon, a.category, a.xp_reward, a.rarity
      FROM candidate_achievements ca
      JOIN achievements a ON ca.achievement_id = a.id
      WHERE ca.candidate_id = ?
    `).all(candidateId);

    res.json({ success: true, data: userAchievements });
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

    // Award XP
    if (achievement.xp_reward > 0) {
      db.prepare('UPDATE candidates SET xp = xp + ? WHERE id = ?').run(achievement.xp_reward, finalCandidateId);
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

// Check and unlock automatic achievements (first login, profile complete, verified)
router.post('/achievements/check/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const unlockedAchievements = [];

    // Get candidate info
    const candidate = db.prepare(`
      SELECT id, name, phone, profile_photo, address, status, created_at
      FROM candidates WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

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

    // ACH012: First login (always unlocked when this check runs)
    tryUnlock('ACH012');

    // ACH013: Profile complete (100%)
    const isProfileComplete = !!(candidate.name && candidate.phone && candidate.profile_photo && candidate.address);
    if (isProfileComplete) {
      tryUnlock('ACH013');
    }

    // ACH014: Account verified (status is active)
    if (candidate.status === 'active') {
      tryUnlock('ACH014');
    }

    res.json({
      success: true,
      data: {
        unlocked: unlockedAchievements,
        count: unlockedAchievements.length,
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
    const candidateBefore = db.prepare('SELECT xp, level FROM candidates WHERE id = ?').get(finalCandidateId);
    const oldXP = candidateBefore?.xp || 0;

    // Award XP
    db.prepare('UPDATE candidates SET xp = xp + ? WHERE id = ?').run(quest.xp_reward, finalCandidateId);
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

// Update streak
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

// Get all profile borders with unlock status for a candidate
router.get('/borders/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    
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

    // Get all borders
    const borders = db.prepare(`
      SELECT pb.*, 
        CASE WHEN cb.candidate_id IS NOT NULL THEN 1 ELSE 0 END as manually_unlocked,
        cb.is_selected
      FROM profile_borders pb
      LEFT JOIN candidate_borders cb ON pb.id = cb.border_id AND cb.candidate_id = ?
      WHERE pb.active = 1
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
    `).all(candidateId);

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

    res.json({ 
      success: true, 
      data: {
        borders: parsed,
        selectedBorderId: candidate.selected_border_id,
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

module.exports = router;
