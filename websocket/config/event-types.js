/**
 * WebSocket Event Types
 * Centralized event type constants for real-time communication
 * 
 * @module websocket/config/event-types
 */

const EventTypes = {
  // Chat events
  CHAT_MESSAGE: 'chat_message',
  CHAT_TYPING: 'typing',
  CHAT_READ: 'messages_read',

  // Status events
  STATUS_CHANGE: 'status_change',

  // Job events
  JOB_CREATED: 'job_created',
  JOB_UPDATED: 'job_updated',
  JOB_DELETED: 'job_deleted',

  // Deployment events
  DEPLOYMENT_CREATED: 'deployment_created',
  DEPLOYMENT_UPDATED: 'deployment_updated',
  DEPLOYMENT_STATUS_CHANGED: 'deployment_status_changed',

  // Payment events
  PAYMENT_CREATED: 'payment_created',
  PAYMENT_STATUS_CHANGED: 'payment_status_changed',

  // Notification events
  NOTIFICATION: 'notification',

  // Gamification events
  XP_EARNED: 'xp_earned',
  LEVEL_UP: 'level_up',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  QUEST_COMPLETED: 'quest_completed',

  // FOMO events
  FOMO_TRIGGER: 'fomo_trigger',
  FOMO_URGENCY: 'fomo_urgency',
  FOMO_SOCIAL_PROOF: 'fomo_social_proof',
  FOMO_SCARCITY: 'fomo_scarcity',
  FOMO_STREAK_RISK: 'fomo_streak_risk',
  FOMO_PEER_ACTIVITY: 'fomo_peer_activity',
  FOMO_COMPETITIVE_PRESSURE: 'fomo_competitive_pressure',

  // Candidate events
  CANDIDATE_UPDATED: 'candidate_updated'
};

/**
 * Check if a given type is a valid event type
 * @param {string} type - Event type to validate
 * @returns {boolean} True if valid
 */
function isValidEventType(type) {
  return Object.values(EventTypes).includes(type);
}

/**
 * Get all event types as an array
 * @returns {string[]} Array of event type values
 */
function getAllEventTypes() {
  return Object.values(EventTypes);
}

/**
 * Get event types by category
 * @param {string} category - Category name (chat, job, payment, etc.)
 * @returns {string[]} Array of event types in that category
 */
function getEventTypesByCategory(category) {
  const prefix = category.toUpperCase() + '_';
  return Object.entries(EventTypes)
    .filter(([key]) => key.startsWith(prefix) || key === category.toUpperCase())
    .map(([, value]) => value);
}

module.exports = {
  EventTypes,
  isValidEventType,
  getAllEventTypes,
  getEventTypesByCategory
};
