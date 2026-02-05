/**
 * Service Lazy Loaders
 * Lazy-loading functions for services to avoid circular dependencies
 * 
 * @module websocket/utils/lazy-loaders
 */

const { createLogger } = require('../../utils/structured-logger');
const logger = createLogger('websocket:lazy-loaders');

// Service instances (null until first access)
let fomoEngine = null;
let messagingService = null;
let aiChatService = null;
let conversationManager = null;
let smartNotifications = null;
let quickReplies = null;

/**
 * Get FOMO engine instance (lazy-loaded)
 * @returns {Object|null} FOMO engine service or null if unavailable
 */
function getFOMOEngine() {
  if (!fomoEngine) {
    try {
      fomoEngine = require('../../services/fomo-engine');
      logger.info('FOMO engine loaded successfully');
    } catch (error) {
      logger.warn('FOMO engine not loaded', { error: error.message });
    }
  }
  return fomoEngine;
}

/**
 * Get messaging service instance (lazy-loaded)
 * Lazy-loaded to avoid circular dependency
 * @returns {Object} Messaging service
 */
function getMessaging() {
  if (!messagingService) {
    try {
      messagingService = require('../../services/messaging');
      logger.info('Messaging service loaded successfully');
    } catch (error) {
      logger.error('Failed to load messaging service', { error: error.message });
      throw error;
    }
  }
  return messagingService;
}

/**
 * Get AI chat service instance (lazy-loaded)
 * @returns {Object} AI chat service
 */
function getAIChat() {
  if (!aiChatService) {
    try {
      aiChatService = require('../../services/ai-chat');
      logger.info('AI chat service loaded successfully');
    } catch (error) {
      logger.error('Failed to load AI chat service', { error: error.message });
      throw error;
    }
  }
  return aiChatService;
}

/**
 * Get conversation manager instance (lazy-loaded)
 * @returns {Object|null} Conversation manager or null if unavailable
 */
function getConversationManager() {
  if (!conversationManager) {
    try {
      conversationManager = require('../../services/conversation-manager');
      logger.info('Conversation manager loaded successfully');
    } catch (error) {
      logger.warn('Conversation manager not loaded', { error: error.message });
    }
  }
  return conversationManager;
}

/**
 * Get smart notifications service instance (lazy-loaded)
 * @returns {Object|null} Smart notifications service or null if unavailable
 */
function getSmartNotifications() {
  if (!smartNotifications) {
    try {
      smartNotifications = require('../../services/smart-notifications');
      logger.info('Smart notifications loaded successfully');
    } catch (error) {
      logger.warn('Smart notifications not loaded', { error: error.message });
    }
  }
  return smartNotifications;
}

/**
 * Get quick replies service instance (lazy-loaded)
 * @returns {Object|null} Quick replies service or null if unavailable
 */
function getQuickReplies() {
  if (!quickReplies) {
    try {
      quickReplies = require('../../services/quick-replies');
      logger.info('Quick replies loaded successfully');
    } catch (error) {
      logger.warn('Quick replies not loaded', { error: error.message });
    }
  }
  return quickReplies;
}

/**
 * Reset all lazy-loaded services (useful for testing)
 */
function resetServices() {
  fomoEngine = null;
  messagingService = null;
  aiChatService = null;
  conversationManager = null;
  smartNotifications = null;
  quickReplies = null;
  logger.info('All lazy-loaded services reset');
}

/**
 * Check which services are currently loaded
 * @returns {Object} Status of each service
 */
function getLoadedServices() {
  return {
    fomoEngine: !!fomoEngine,
    messagingService: !!messagingService,
    aiChatService: !!aiChatService,
    conversationManager: !!conversationManager,
    smartNotifications: !!smartNotifications,
    quickReplies: !!quickReplies
  };
}

module.exports = {
  getFOMOEngine,
  getMessaging,
  getAIChat,
  getConversationManager,
  getSmartNotifications,
  getQuickReplies,
  resetServices,
  getLoadedServices
};
