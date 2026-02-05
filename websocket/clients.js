/**
 * WebSocket Client Storage
 * Manages connected clients and event type constants
 */

// Store connected clients
const candidateClients = new Map(); // candidateId -> WebSocket
const adminClients = new Set(); // Set of admin WebSocket connections

// Event types for real-time sync
const EventTypes = {
  // Chat
  CHAT_MESSAGE: 'chat_message',
  CHAT_TYPING: 'typing',
  CHAT_READ: 'messages_read',

  // Status
  STATUS_CHANGE: 'status_change',

  // Jobs
  JOB_CREATED: 'job_created',
  JOB_UPDATED: 'job_updated',
  JOB_DELETED: 'job_deleted',

  // Deployments
  DEPLOYMENT_CREATED: 'deployment_created',
  DEPLOYMENT_UPDATED: 'deployment_updated',
  DEPLOYMENT_STATUS_CHANGED: 'deployment_status_changed',

  // Payments
  PAYMENT_CREATED: 'payment_created',
  PAYMENT_STATUS_CHANGED: 'payment_status_changed',

  // Notifications
  NOTIFICATION: 'notification',

  // Gamification
  XP_EARNED: 'xp_earned',
  LEVEL_UP: 'level_up',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  QUEST_COMPLETED: 'quest_completed',

  // FOMO Events
  FOMO_TRIGGER: 'fomo_trigger',
  FOMO_URGENCY: 'fomo_urgency',
  FOMO_SOCIAL_PROOF: 'fomo_social_proof',
  FOMO_SCARCITY: 'fomo_scarcity',
  FOMO_STREAK_RISK: 'fomo_streak_risk',
  FOMO_PEER_ACTIVITY: 'fomo_peer_activity',
  FOMO_COMPETITIVE_PRESSURE: 'fomo_competitive_pressure',

  // Candidate updates
  CANDIDATE_UPDATED: 'candidate_updated'
};

module.exports = {
  candidateClients,
  adminClients,
  EventTypes
};
