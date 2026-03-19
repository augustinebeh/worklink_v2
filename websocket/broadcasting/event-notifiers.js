/**
 * Event Notifiers
 * Helper functions for notifying clients about various events
 * 
 * @module websocket/broadcasting/event-notifiers
 */

const { db } = require('../../db');
const { EventTypes } = require('../config/event-types');
const broadcast = require('./broadcast-service');
const { createLogger } = require('../../utils/structured-logger');

const logger = createLogger('websocket:event-notifiers');

/**
 * Create a notification in the database and broadcast it to the candidate
 * This is the canonical notification creation function used across the WebSocket layer.
 * @param {string} candidateId - Candidate ID
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object|null} data - Additional data
 * @returns {Object|null} The created notification object, or null on failure
 */
function createNotification(candidateId, type, title, message, data = null) {
  try {
    const stmt = db.prepare(`
      INSERT INTO notifications (candidate_id, type, title, message, data, read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
    `);

    const result = stmt.run(
      candidateId,
      type,
      title,
      message,
      data ? JSON.stringify(data) : null
    );

    // Re-read from DB to get the full row with server-generated fields
    const notification = db.prepare('SELECT * FROM notifications WHERE rowid = ?')
      .get(result.lastInsertRowid);

    logger.info('Notification created', {
      candidateId,
      type,
      notificationId: result.lastInsertRowid
    });

    // Broadcast the new notification to the candidate if online
    broadcast.broadcastToCandidate(candidateId, {
      type: EventTypes.NOTIFICATION,
      notification
    });

    return notification;
  } catch (error) {
    logger.error('Failed to create notification', {
      candidateId,
      type,
      error: error.message
    });
    return null;
  }
}

/**
 * Notify about a new job creation
 * @param {Object} job - Job object
 */
function notifyJobCreated(job) {
  logger.info('Notifying job created', { jobId: job.id, title: job.title });
  
  // Notify admins
  broadcast.broadcastToAdmins({ type: EventTypes.JOB_CREATED, job });
  
  // Notify all online candidates
  const onlineCandidates = broadcast.getOnlineCandidates();
  broadcast.broadcastToCandidates(onlineCandidates, { type: EventTypes.JOB_CREATED, job });
}

/**
 * Notify about a job update
 * @param {Object} job - Job object
 */
function notifyJobUpdated(job) {
  logger.info('Notifying job updated', { jobId: job.id, title: job.title });
  broadcast.broadcastToAll({ type: EventTypes.JOB_UPDATED, job });
}

/**
 * Notify about a deployment update
 * @param {Object} deployment - Deployment object
 * @param {string} candidateId - Candidate ID
 */
function notifyDeploymentUpdated(deployment, candidateId) {
  logger.info('Notifying deployment updated', {
    deploymentId: deployment.id,
    candidateId
  });
  
  broadcast.broadcastToAdmins({ type: EventTypes.DEPLOYMENT_UPDATED, deployment });
  broadcast.broadcastToCandidate(candidateId, { type: EventTypes.DEPLOYMENT_UPDATED, deployment });
}

/**
 * Notify about a new payment
 * @param {Object} payment - Payment object
 * @param {string} candidateId - Candidate ID
 */
function notifyPaymentCreated(payment, candidateId) {
  logger.info('Notifying payment created', {
    paymentId: payment.id,
    candidateId,
    amount: payment.total_amount
  });
  
  broadcast.broadcastToAdmins({ type: EventTypes.PAYMENT_CREATED, payment });
  broadcast.broadcastToCandidate(candidateId, { type: EventTypes.PAYMENT_CREATED, payment });
  
  createNotification(
    candidateId,
    'payment',
    'New Payment',
    `You have a new payment of $${payment.total_amount?.toFixed(2)}`,
    { paymentId: payment.id }
  );
}

/**
 * Notify about a payment status change
 * @param {Object} payment - Payment object
 * @param {string} candidateId - Candidate ID
 */
function notifyPaymentStatusChanged(payment, candidateId) {
  logger.info('Notifying payment status changed', {
    paymentId: payment.id,
    candidateId,
    status: payment.status,
    amount: payment.total_amount
  });
  
  broadcast.broadcastToAdmins({ type: EventTypes.PAYMENT_STATUS_CHANGED, payment });
  broadcast.broadcastToCandidate(candidateId, { type: EventTypes.PAYMENT_STATUS_CHANGED, payment });
  
  if (payment.status === 'paid') {
    createNotification(
      candidateId,
      'payment',
      'Payment Received',
      `Your payment of $${payment.total_amount?.toFixed(2)} has been processed.`,
      { paymentId: payment.id }
    );
  }
}

/**
 * Notify about XP earned
 * @param {string} candidateId - Candidate ID
 * @param {number} xpAmount - Amount of XP earned
 * @param {string} reason - Reason for earning XP
 */
function notifyXPEarned(candidateId, xpAmount, reason) {
  logger.info('Notifying XP earned', { candidateId, xpAmount, reason });
  
  try {
    const candidate = db.prepare('SELECT xp, level FROM candidates WHERE id = ?').get(candidateId);
    
    broadcast.broadcastToCandidate(candidateId, { 
      type: EventTypes.XP_EARNED, 
      xp: xpAmount, 
      reason,
      totalXP: candidate?.xp || 0,
      level: candidate?.level || 1
    });
  } catch (error) {
    logger.error('Failed to notify XP earned', {
      candidateId,
      error: error.message
    });
  }
}

/**
 * Notify about a level up
 * @param {string} candidateId - Candidate ID
 * @param {number} newLevel - New level
 */
function notifyLevelUp(candidateId, newLevel) {
  logger.info('Notifying level up', { candidateId, newLevel });
  
  broadcast.broadcastToCandidate(candidateId, { type: EventTypes.LEVEL_UP, level: newLevel });
  broadcast.broadcastToAdmins({ type: EventTypes.LEVEL_UP, candidateId, level: newLevel });
  
  createNotification(
    candidateId,
    'gamification',
    'Level Up! 🎉',
    `Congratulations! You've reached Level ${newLevel}!`,
    { level: newLevel }
  );
}

/**
 * Notify about an achievement unlock
 * @param {string} candidateId - Candidate ID
 * @param {Object} achievement - Achievement object
 */
function notifyAchievementUnlocked(candidateId, achievement) {
  logger.info('Notifying achievement unlocked', {
    candidateId,
    achievementId: achievement.id,
    achievementName: achievement.name
  });
  
  broadcast.broadcastToCandidate(candidateId, { type: EventTypes.ACHIEVEMENT_UNLOCKED, achievement });
  broadcast.broadcastToAdmins({ type: EventTypes.ACHIEVEMENT_UNLOCKED, candidateId, achievement });
  
  createNotification(
    candidateId,
    'gamification',
    'Achievement Unlocked! 🏆',
    `You've earned: ${achievement.name}`,
    { achievementId: achievement.id }
  );
}

/**
 * Notify about a quest completion
 * @param {string} candidateId - Candidate ID
 * @param {Object} quest - Quest object
 */
function notifyQuestCompleted(candidateId, quest) {
  logger.info('Notifying quest completed', {
    candidateId,
    questId: quest.id,
    questName: quest.name
  });
  
  broadcast.broadcastToCandidate(candidateId, { type: EventTypes.QUEST_COMPLETED, quest });
  broadcast.broadcastToAdmins({ type: EventTypes.QUEST_COMPLETED, candidateId, quest });
  
  createNotification(
    candidateId,
    'gamification',
    'Quest Completed! ⭐',
    `You've completed: ${quest.name}`,
    { questId: quest.id, reward: quest.reward }
  );
}

/**
 * Notify about candidate profile updates
 * @param {string} candidateId - Candidate ID
 * @param {Object} updates - Updated fields
 */
function notifyCandidateUpdated(candidateId, updates) {
  logger.info('Notifying candidate updated', {
    candidateId,
    fields: Object.keys(updates)
  });
  
  broadcast.broadcastToCandidate(candidateId, { type: EventTypes.CANDIDATE_UPDATED, updates });
  broadcast.broadcastToAdmins({ type: EventTypes.CANDIDATE_UPDATED, candidateId, updates });
}

/**
 * Notify about a status change
 * @param {string} candidateId - Candidate ID
 * @param {string} status - New status
 * @param {Object} additionalData - Additional data
 */
function notifyStatusChange(candidateId, status, additionalData = {}) {
  logger.info('Notifying status change', { candidateId, status });
  
  broadcast.broadcastToCandidate(candidateId, {
    type: EventTypes.STATUS_CHANGE,
    status,
    ...additionalData
  });
  
  broadcast.broadcastToAdmins({
    type: EventTypes.STATUS_CHANGE,
    candidateId,
    status,
    ...additionalData
  });
}

// FOMO event notifiers

function notifyFOMOEvent(candidateId, trigger) {
  broadcast.broadcastToCandidate(candidateId, {
    type: EventTypes.FOMO_TRIGGER,
    trigger
  });
}

function notifyUrgencyAlert(candidateId, alert) {
  broadcast.broadcastToCandidate(candidateId, {
    type: EventTypes.FOMO_URGENCY,
    alert
  });
}

function notifyScarcityAlert(candidateId, alert) {
  broadcast.broadcastToCandidate(candidateId, {
    type: EventTypes.FOMO_SCARCITY,
    alert
  });
}

function notifyStreakRisk(candidateId, risk) {
  broadcast.broadcastToCandidate(candidateId, {
    type: EventTypes.FOMO_STREAK_RISK,
    risk
  });
}

function notifyCompetitivePressure(candidateId, pressure) {
  broadcast.broadcastToCandidate(candidateId, {
    type: EventTypes.FOMO_COMPETITIVE_PRESSURE,
    pressure
  });
}

module.exports = {
  // Notification creation
  createNotification,

  // Job events
  notifyJobCreated,
  notifyJobUpdated,

  // Deployment events
  notifyDeploymentUpdated,

  // Payment events
  notifyPaymentCreated,
  notifyPaymentStatusChanged,

  // Gamification events
  notifyXPEarned,
  notifyLevelUp,
  notifyAchievementUnlocked,
  notifyQuestCompleted,

  // Candidate events
  notifyCandidateUpdated,
  notifyStatusChange,

  // FOMO events
  notifyFOMOEvent,
  notifyUrgencyAlert,
  notifyScarcityAlert,
  notifyStreakRisk,
  notifyCompetitivePressure,
};
