/**
 * FOMO Streak Protection Module
 */

const { createLogger } = require('../../utils/structured-logger');
const { db } = require('../../db');

const logger = createLogger('fomo-engine');

function checkStreakProtectionOpportunities(createFOMOEventFn, createSocialProofEventFn) {
  try {
    const atRiskCandidates = db.prepare(`
      SELECT id, name, streak_days, streak_last_date, level,
        (julianday('now') - julianday(streak_last_date)) * 24 as hours_since_checkin
      FROM candidates
      WHERE status = 'active' AND streak_days >= 3
        AND hours_since_checkin > 18 AND hours_since_checkin < 30
    `).all();

    atRiskCandidates.forEach(candidate => {
      createStreakProtectionEvent(candidate, createFOMOEventFn);
    });

    const recentAchievers = db.prepare(`
      SELECT c.id, c.name, c.level, c.streak_days,
        CASE WHEN c.level >= 100 THEN 'mythic' WHEN c.level >= 75 THEN 'diamond'
             WHEN c.level >= 50 THEN 'platinum' WHEN c.level >= 25 THEN 'gold'
             WHEN c.level >= 10 THEN 'silver' ELSE 'bronze' END as tier_level
      FROM candidates c
      WHERE (c.streak_days % 7 = 0 AND c.streak_days >= 7)
         OR (c.level % 5 = 0 AND c.level >= 5)
         OR datetime(c.updated_at) > datetime('now', '-6 hours')
    `).all();

    createPeerMilestoneEvents(recentAchievers, createSocialProofEventFn);

    logger.info(`Processed streak protection for ${atRiskCandidates.length} candidates`);
  } catch (error) {
    logger.error('Failed to check streak protection opportunities:', error);
  }
}

function createStreakProtectionEvent(candidate, createFOMOEventFn) {
  const protectionId = `prot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const offerExpiresAt = new Date();
  offerExpiresAt.setHours(offerExpiresAt.getHours() + 6);

  const riskLevel = calculateStreakRisk(candidate.hours_since_checkin, candidate.streak_days);

  try {
    db.prepare(`
      INSERT INTO fomo_streak_protection
      (id, candidate_id, streak_days, risk_level, protection_offered, offer_expires_at)
      VALUES (?, ?, ?, ?, TRUE, ?)
    `).run(protectionId, candidate.id, candidate.streak_days, riskLevel, offerExpiresAt.toISOString());

    createFOMOEventFn(candidate.id, 'streak_protection', {
      streakDays: candidate.streak_days, riskLevel,
      hoursRemaining: Math.max(0, 24 - candidate.hours_since_checkin),
      protectionId
    });

    logger.debug('Created streak protection event', {
      candidateId: candidate.id, streakDays: candidate.streak_days, riskLevel
    });
  } catch (error) {
    logger.error('Failed to create streak protection event:', error);
  }
}

function calculateStreakRisk(hoursSinceCheckin, streakDays) {
  if (hoursSinceCheckin > 23) return 'critical';
  if (hoursSinceCheckin > 20) return 'high';
  if (hoursSinceCheckin > 18) return 'medium';
  return 'low';
}

function createPeerMilestoneEvents(achievers, createSocialProofEventFn) {
  if (achievers.length === 0) return;

  const tierGroups = new Map();
  achievers.forEach(achiever => {
    if (!tierGroups.has(achiever.tier_level)) tierGroups.set(achiever.tier_level, []);
    tierGroups.get(achiever.tier_level).push(achiever);
  });

  tierGroups.forEach((tierAchievers, tier) => {
    createSocialProofEventFn('peer_milestones', {
      tierLevel: tier, achieverCount: tierAchievers.length,
      milestoneTypes: categorizeMilestones(tierAchievers), competitiveMessage: true
    });
  });
}

function categorizeMilestones(achievers) {
  const milestones = { streaks: 0, levelUps: 0, tierPromotions: 0 };
  achievers.forEach(achiever => {
    if (achiever.streak_days % 7 === 0) milestones.streaks++;
    if (achiever.level % 5 === 0) milestones.levelUps++;
  });
  return milestones;
}

module.exports = { checkStreakProtectionOpportunities };
