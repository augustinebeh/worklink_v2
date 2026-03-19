/**
 * Streak Milestone Processor
 *
 * Extracted milestone processing functions for the Streak Protection System.
 * Handles milestone detection, celebration notifications, competitive alerts,
 * and peer motivation messaging.
 */

const { db } = require('../../db');
const { createLogger } = require('../../utils/structured-logger');

const logger = createLogger('streak-milestone-processor');

/**
 * Check if a candidate has reached a new milestone of the given type and value.
 */
function isNewMilestone(candidate, type, value) {
  if (type === 'daily' && candidate.streak_days === value) return true;
  if (type === 'weekly' && candidate.streak_days === value * 7) return true;
  if (type === 'monthly' && candidate.streak_days === value * 30) return true;

  return false;
}

/**
 * Generate a celebration message for a milestone achievement.
 */
function generateCelebrationMessage(milestone) {
  const messages = {
    daily: [
      `\u{1F525} Incredible! ${milestone.value} days of consistency!`,
      `\u{1F389} ${milestone.value}-day streak achieved! You're unstoppable!`,
      `\u{1F4AA} ${milestone.value} days straight! Your dedication is inspiring!`
    ],
    weekly: [
      `\u{1F31F} ${milestone.value} weeks of perfect streaks! Amazing!`,
      `\u{1F680} ${milestone.value} consecutive weeks! You're a legend!`,
      `\u{1F451} ${milestone.value} weeks of excellence! Keep dominating!`
    ],
    monthly: [
      `\u{1F3C6} ${milestone.value} months of streaks! Absolutely legendary!`,
      `\u{1F48E} ${milestone.value} months of consistency! Hall of fame material!`,
      `\u{1F9BE} ${milestone.value} months strong! You're redefining dedication!`
    ]
  };

  const categoryMessages = messages[milestone.type] || [`Achievement: ${milestone.value} ${milestone.type}!`];
  return categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
}

/**
 * Calculate the rarity tier of a milestone based on its type and value.
 */
function calculateMilestoneRarity(milestone) {
  if (milestone.type === 'monthly' && milestone.value >= 12) return 'legendary';
  if (milestone.type === 'daily' && milestone.value >= 365) return 'legendary';
  if (milestone.type === 'weekly' && milestone.value >= 52) return 'legendary';

  if (milestone.type === 'daily' && milestone.value >= 100) return 'epic';
  if (milestone.type === 'weekly' && milestone.value >= 12) return 'epic';
  if (milestone.type === 'monthly' && milestone.value >= 6) return 'epic';

  if (milestone.type === 'daily' && milestone.value >= 30) return 'rare';
  if (milestone.type === 'weekly' && milestone.value >= 4) return 'rare';
  if (milestone.type === 'monthly' && milestone.value >= 3) return 'rare';

  return 'common';
}

/**
 * Calculate XP reward for a milestone based on type and rarity.
 */
function calculateMilestoneXP(milestone) {
  const baseXP = {
    daily: milestone.value * 50,
    weekly: milestone.value * 300,
    monthly: milestone.value * 1200
  };

  const rarityMultiplier = {
    common: 1,
    rare: 1.5,
    epic: 2.0,
    legendary: 3.0
  };

  const rarity = calculateMilestoneRarity(milestone);
  return Math.floor(baseXP[milestone.type] * rarityMultiplier[rarity]);
}

/**
 * Generate a competitive message for a peer about someone else's milestone.
 */
function generateCompetitiveMessage(milestone, peer) {
  const gap = milestone.candidate.streak_days - peer.streak_days;

  if (gap > 50) {
    return `A peer just hit a ${milestone.value}-${milestone.type} milestone! They're ${gap} days ahead - time to catch up! \u{1F3C3}\u200D\u2642\uFE0F`;
  } else if (gap > 10) {
    return `Someone in your area achieved ${milestone.value} ${milestone.type}s! Close the ${gap}-day gap! \u{1F3AF}`;
  } else {
    return `A nearby worker just hit ${milestone.value} ${milestone.type}s! You're only ${gap} days behind! \u{1F525}`;
  }
}

/**
 * Generate a delayed motivation message for competitive alerts.
 */
function generateDelayedMotivationMessage(milestone, target) {
  const gap = milestone.streak_days - target.streak_days;

  const messages = [
    `\u{1F3C6} A ${milestone.tier} worker in your area just achieved their ${milestone.milestone_value}-${milestone.milestone_type} milestone!`,
    `\u{1F4AA} Someone nearby is dominating with ${milestone.streak_days} consecutive days!`,
    `\u{1F31F} Peer alert: Another worker just hit ${milestone.milestone_value} ${milestone.milestone_type}s of consistency!`,
    `\u{1F3AF} Motivation boost: A colleague just reached ${milestone.streak_days} days straight!`
  ];

  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Send a celebration notification for a milestone achievement via WebSocket.
 */
async function sendMilestoneCelebration(milestone) {
  try {
    const { notifyAchievementUnlocked } = require('../../websocket');

    const celebrationMessage = generateCelebrationMessage(milestone);

    notifyAchievementUnlocked(milestone.candidate.id, {
      id: `streak_milestone_${milestone.type}_${milestone.value}`,
      name: `${milestone.value}-${milestone.type} Streak Warrior`,
      description: celebrationMessage,
      type: 'streak_milestone',
      rarity: calculateMilestoneRarity(milestone),
      xp_reward: calculateMilestoneXP(milestone)
    });

    logger.debug('Sent milestone celebration', {
      candidateId: milestone.candidate.id,
      milestone: milestone
    });
  } catch (error) {
    logger.error('Failed to send milestone celebration:', error);
  }
}

/**
 * Create competitive alerts for peers when a milestone is achieved.
 */
async function createCompetitiveMilestoneAlerts(milestone) {
  try {
    const peers = db.prepare(`
      SELECT id, name, streak_days, level
      FROM candidates
      WHERE status = 'active'
        AND location_area = ?
        AND level BETWEEN ? AND ?
        AND id != ?
        AND streak_days < ?
      LIMIT 10
    `).all(
      milestone.candidate.location_area,
      milestone.candidate.level - 10,
      milestone.candidate.level + 10,
      milestone.candidate.id,
      milestone.candidate.streak_days
    );

    const { notifyCompetitivePressure } = require('../../websocket');

    peers.forEach(peer => {
      notifyCompetitivePressure(peer.id, {
        type: 'peer_milestone',
        achieverTier: milestone.candidate.tier,
        milestoneType: milestone.type,
        milestoneValue: milestone.value,
        streakGap: milestone.candidate.streak_days - peer.streak_days,
        motivationalMessage: generateCompetitiveMessage(milestone, peer)
      });
    });

    logger.debug('Created competitive milestone alerts', {
      achieverId: milestone.candidate.id,
      peerCount: peers.length,
      milestone: milestone
    });
  } catch (error) {
    logger.error('Failed to create competitive milestone alerts:', error);
  }
}

/**
 * Record a milestone achievement in the database and trigger notifications.
 */
async function processMilestone(milestone) {
  try {
    const milestoneId = `mile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    db.prepare(`
      INSERT INTO streak_milestones
      (id, candidate_id, milestone_type, milestone_value, achieved_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(
      milestoneId,
      milestone.candidate.id,
      milestone.type,
      milestone.value,
      new Date().toISOString()
    );

    await sendMilestoneCelebration(milestone);
    await createCompetitiveMilestoneAlerts(milestone);

    logger.debug('Processed milestone', {
      candidateId: milestone.candidate.id,
      type: milestone.type,
      value: milestone.value
    });
  } catch (error) {
    logger.error('Failed to process milestone:', error);
  }
}

/**
 * Check a candidate against all milestone thresholds and process new ones.
 */
async function checkMilestoneAchievements(candidate, milestoneThresholds) {
  try {
    const achievedMilestones = [];

    milestoneThresholds.forEach(category => {
      category.values.forEach(value => {
        if (isNewMilestone(candidate, category.type, value)) {
          achievedMilestones.push({
            type: category.type,
            value: value,
            candidate: candidate
          });
        }
      });
    });

    for (const milestone of achievedMilestones) {
      await processMilestone(milestone);
    }
  } catch (error) {
    logger.error('Failed to check milestone achievements:', error);
  }
}

/**
 * Process milestone achievements for all recently active candidates.
 */
async function processMilestoneAchievements(milestoneThresholds) {
  try {
    const recentAchievers = db.prepare(`
      SELECT
        c.id, c.name, c.streak_days, c.level, c.location_area,
        CASE
          WHEN c.level >= 100 THEN 'mythic'
          WHEN c.level >= 75 THEN 'diamond'
          WHEN c.level >= 50 THEN 'platinum'
          WHEN c.level >= 25 THEN 'gold'
          WHEN c.level >= 10 THEN 'silver'
          ELSE 'bronze'
        END as tier
      FROM candidates c
      WHERE c.status = 'active'
        AND c.streak_days > 0
        AND datetime(c.updated_at) > datetime('now', '-2 hours')
    `).all();

    for (const candidate of recentAchievers) {
      await checkMilestoneAchievements(candidate, milestoneThresholds);
    }

    logger.info(`Processed milestones for ${recentAchievers.length} candidates`);
  } catch (error) {
    logger.error('Failed to process milestone achievements:', error);
  }
}

/**
 * Send competitive milestone alerts for recent uncelebrated milestones.
 */
async function sendCompetitiveMilestoneAlerts() {
  try {
    const recentMilestones = db.prepare(`
      SELECT sm.*, c.name, c.location_area, c.level, c.streak_days,
             CASE
               WHEN c.level >= 100 THEN 'mythic'
               WHEN c.level >= 75 THEN 'diamond'
               WHEN c.level >= 50 THEN 'platinum'
               WHEN c.level >= 25 THEN 'gold'
               WHEN c.level >= 10 THEN 'silver'
               ELSE 'bronze'
             END as tier
      FROM streak_milestones sm
      JOIN candidates c ON sm.candidate_id = c.id
      WHERE sm.achieved_at > datetime('now', '-2 hours')
        AND sm.competitive_alert_sent = FALSE
        AND c.status = 'active'
    `).all();

    for (const milestone of recentMilestones) {
      await sendDelayedCompetitiveAlert(milestone);

      db.prepare(`
        UPDATE streak_milestones
        SET competitive_alert_sent = TRUE
        WHERE id = ?
      `).run(milestone.id);
    }

    logger.debug(`Sent competitive alerts for ${recentMilestones.length} milestones`);
  } catch (error) {
    logger.error('Failed to send competitive milestone alerts:', error);
  }
}

/**
 * Send delayed competitive alerts to motivation targets near a milestone achiever.
 */
async function sendDelayedCompetitiveAlert(milestone) {
  try {
    const motivationTargets = db.prepare(`
      SELECT id, name, streak_days, level
      FROM candidates
      WHERE status = 'active'
        AND location_area = ?
        AND id != ?
        AND (
          streak_days BETWEEN ? AND ? OR
          level BETWEEN ? AND ?
        )
      LIMIT 15
    `).all(
      milestone.location_area,
      milestone.candidate_id,
      Math.max(0, milestone.streak_days - 20),
      milestone.streak_days + 10,
      milestone.level - 15,
      milestone.level + 15
    );

    const { broadcastToCandidate, EventTypes } = require('../../websocket');

    motivationTargets.forEach(target => {
      const motivationMessage = generateDelayedMotivationMessage(milestone, target);

      broadcastToCandidate(target.id, {
        type: EventTypes.FOMO_PEER_ACTIVITY,
        subtype: 'milestone_motivation',
        message: motivationMessage,
        achieverTier: milestone.tier,
        milestoneData: {
          type: milestone.milestone_type,
          value: milestone.milestone_value,
          daysAhead: milestone.streak_days - target.streak_days
        },
        motivational: true,
        urgency: 'medium'
      });
    });

    logger.debug('Sent delayed competitive alert', {
      milestoneId: milestone.id,
      targetCount: motivationTargets.length
    });
  } catch (error) {
    logger.error('Failed to send delayed competitive alert:', error);
  }
}

module.exports = {
  isNewMilestone,
  generateCelebrationMessage,
  calculateMilestoneRarity,
  calculateMilestoneXP,
  generateCompetitiveMessage,
  generateDelayedMotivationMessage,
  sendMilestoneCelebration,
  createCompetitiveMilestoneAlerts,
  processMilestone,
  checkMilestoneAchievements,
  processMilestoneAchievements,
  sendCompetitiveMilestoneAlerts,
  sendDelayedCompetitiveAlert
};
