/**
 * FOMO Messaging & Immediate Trigger Module
 */

const { createLogger } = require('../../utils/structured-logger');
const { db } = require('../../db');

const logger = createLogger('fomo-engine');

function generateFOMOMessage(eventType, eventData, candidate) {
  const templates = {
    job_urgency: [
      `🔥 Only ${eventData.remainingSlots} spots left for "${eventData.jobTitle}"! Apply now before it fills up.`,
      `⚡ ${eventData.remainingSlots} workers needed for "${eventData.jobTitle}" - don't miss out!`,
      `🎯 Almost full! "${eventData.jobTitle}" has just ${eventData.remainingSlots} spots remaining.`
    ],
    peer_activity: [
      `👥 ${eventData.participantCount} people in your area applied to jobs in the last hour!`,
      `🏃‍♂️ Your peers are staying active - ${eventData.participantCount} recent applications near you.`,
      `🌟 ${eventData.participantCount} workers just like you grabbed opportunities. Your turn?`
    ],
    tier_competition: [
      `🥇 ${eventData.competitorCount} other ${eventData.tierLevel} workers are viewing "${eventData.jobTitle}". Apply first!`,
      `⚔️ Competition alert! ${eventData.competitorCount} ${eventData.tierLevel}-tier candidates applied to "${eventData.jobTitle}".`,
      `🚀 Be faster! ${eventData.competitorCount} workers at your level are after this job too.`
    ],
    streak_protection: [
      `🔥 Don't lose your ${eventData.streakDays}-day streak! Check in within ${eventData.hoursRemaining} hours.`,
      `⚠️ Streak alert! Your ${eventData.streakDays}-day streak expires in ${eventData.hoursRemaining} hours.`,
      `💪 Protect your momentum! ${eventData.streakDays} days of consistency shouldn't go to waste.`
    ],
    time_limited: [
      `⏰ Hurry! Applications for "${eventData.jobTitle}" close in ${eventData.hoursRemaining} hours.`,
      `🚨 Last chance! "${eventData.jobTitle}" deadline in ${eventData.hoursRemaining} hours.`,
      `⏳ Time running out! ${eventData.hoursRemaining}h left to apply for "${eventData.jobTitle}".`
    ]
  };

  const messageOptions = templates[eventType] || [`New opportunity: ${eventType}`];
  return messageOptions[Math.floor(Math.random() * messageOptions.length)];
}

function getFOMOAction(eventType, eventData) {
  const actions = {
    job_urgency: { type: 'view_job', jobId: eventData.jobId },
    peer_activity: { type: 'browse_jobs' },
    tier_competition: { type: 'view_job', jobId: eventData.jobId },
    streak_protection: { type: 'quick_checkin' },
    time_limited: { type: 'view_job', jobId: eventData.jobId },
    skill_demand: { type: 'browse_jobs', filter: 'skills' }
  };
  return actions[eventType] || { type: 'browse_jobs' };
}

function processImmediateFOMO(candidateId, activityType, metadata, createFOMOEventFn) {
  try {
    if (activityType === 'job_application' && metadata.jobId) {
      triggerCompetitivePressure(metadata.jobId, candidateId, createFOMOEventFn);
    }

    if (activityType === 'level_up') {
      triggerPeerCompetitionAlert(candidateId, metadata, createFOMOEventFn);
    }

    logger.debug('Processed immediate FOMO', { candidateId, activityType, metadata });
  } catch (error) {
    logger.error('Failed to process immediate FOMO:', error);
  }
}

function triggerCompetitivePressure(jobId, applicantId, createFOMOEventFn) {
  const viewingCandidates = getCandidatesViewingJob(jobId);
  viewingCandidates.forEach(candidateId => {
    if (candidateId !== applicantId) {
      createFOMOEventFn(candidateId, 'competitive_pressure', {
        jobId, recentApplications: 1,
        message: 'Someone just applied to this job you\'re viewing!'
      });
    }
  });
}

function triggerPeerCompetitionAlert(leveledUpCandidateId, levelData, createFOMOEventFn) {
  const peers = db.prepare(`
    SELECT id FROM candidates
    WHERE status = 'active' AND id != ?
      AND level BETWEEN ? AND ?
      AND location_area = (SELECT location_area FROM candidates WHERE id = ?)
  `).all(leveledUpCandidateId, levelData.newLevel - 2, levelData.newLevel + 2, leveledUpCandidateId);

  peers.forEach(peer => {
    createFOMOEventFn(peer.id, 'peer_level_up', {
      peerLevel: levelData.newLevel, competitiveMessage: true
    });
  });
}

function getCandidatesViewingJob(jobId) {
  return [];
}

function isHighImpactActivity(activityType) {
  const highImpactTypes = [
    'job_application', 'job_view', 'level_up',
    'tier_promotion', 'high_rating_received', 'urgent_job_completed'
  ];
  return highImpactTypes.includes(activityType);
}

module.exports = {
  generateFOMOMessage, getFOMOAction, processImmediateFOMO, isHighImpactActivity
};
