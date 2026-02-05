/**
 * Interview Scheduling Handler
 * Handles real-time interview scheduling conversations via WebSocket
 * Integrated into modular websocket structure
 */

const { createLogger } = require('../../utils/structured-logger');
const { db } = require('../../db');

const logger = createLogger('websocket:interview-scheduling');

// Store active interview conversations (one per candidate)
const activeInterviewConversations = new Map();

/**
 * Get or create interview conversation manager for candidate
 * @param {string} candidateId - Candidate ID
 * @returns {Object} Conversation manager instance
 */
function getOrCreateInterviewConversation(candidateId) {
  if (!activeInterviewConversations.has(candidateId)) {
    logger.info('Creating new interview conversation', { candidateId });
    
    // Try to load the ConversationManager if available
    try {
      const { ConversationManager } = require('../../utils/new-interview-scheduler');
      const conversation = new ConversationManager(candidateId, db);
      activeInterviewConversations.set(candidateId, conversation);
      return conversation;
    } catch (error) {
      logger.warn('ConversationManager not available, using basic handler', {
        candidateId,
        error: error.message
      });
      
      // Fallback to basic conversation tracking
      const basicConversation = {
        candidateId,
        messages: [],
        context: {},
        createdAt: new Date()
      };
      activeInterviewConversations.set(candidateId, basicConversation);
      return basicConversation;
    }
  }
  return activeInterviewConversations.get(candidateId);
}

/**
 * Handle incoming interview scheduling message from candidate
 * @param {Object} ws - WebSocket connection
 * @param {Object} message - Message data
 * @param {string} candidateId - Candidate ID
 * @param {Function} broadcastToAdmins - Function to broadcast to admins
 */
async function handleInterviewSchedulingMessage(ws, message, candidateId, broadcastToAdmins) {
  const { content } = message;
  
  logger.info('Processing interview scheduling message', {
    candidateId,
    contentPreview: content.substring(0, 50)
  });
  
  try {
    // Get conversation manager for this candidate
    const conversation = getOrCreateInterviewConversation(candidateId);
    
    // If using ConversationManager
    if (conversation.handleMessage) {
      const response = await conversation.handleMessage(content);
      
      logger.debug('Interview scheduler response', {
        candidateId,
        responseType: response.type
      });
      
      // Send response to candidate
      ws.send(JSON.stringify({
        type: 'interview_bot_response',
        content: response.content,
        metadata: {
          responseType: response.type,
          slots: response.slots || [],
          booking: response.booking || null,
          timestamp: new Date().toISOString()
        }
      }));
      
      // If booking confirmed, notify admins
      if (response.type === 'confirmation' && response.booking) {
        logger.info('Interview booked, notifying admins', {
          candidateId,
          booking: response.booking
        });
        
        broadcastToAdmins({
          type: 'interview_booked',
          candidateId: candidateId,
          booking: response.booking,
          timestamp: new Date().toISOString()
        });
      }
      
      // If escalation needed, notify admins
      if (response.action === 'escalate_to_admin') {
        logger.info('Escalating interview conversation to admin', {
          candidateId
        });
        
        broadcastToAdmins({
          type: 'interview_escalation_requested',
          candidateId: candidateId,
          context: conversation.context,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Basic conversation tracking without ConversationManager
      conversation.messages.push({
        role: 'candidate',
        content,
        timestamp: new Date()
      });
      
      // Send basic acknowledgment
      ws.send(JSON.stringify({
        type: 'interview_bot_response',
        content: 'Thank you for your message about interview scheduling. Our team will get back to you shortly!',
        metadata: {
          responseType: 'acknowledgment',
          timestamp: new Date().toISOString()
        }
      }));
      
      // Notify admins for manual handling
      broadcastToAdmins({
        type: 'interview_message',
        candidateId,
        content,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    logger.error('Error handling interview scheduling message', {
      candidateId,
      error: error.message,
      stack: error.stack
    });
    
    // Send error response to candidate
    ws.send(JSON.stringify({
      type: 'interview_bot_response',
      content: `I encountered a small issue, but don't worry! 😊\n\nLet me connect you with our team directly for interview scheduling assistance.`,
      metadata: {
        responseType: 'error',
        error: error.message
      }
    }));
    
    // Notify admins of error
    broadcastToAdmins({
      type: 'interview_scheduling_error',
      candidateId: candidateId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Clean up interview conversation when candidate disconnects
 * @param {string} candidateId - Candidate ID
 */
function cleanupInterviewConversation(candidateId) {
  if (activeInterviewConversations.has(candidateId)) {
    logger.info('Cleaning up interview conversation', { candidateId });
    activeInterviewConversations.delete(candidateId);
  }
}

/**
 * Get interview conversation stats (for debugging)
 * @returns {Object} Stats about active conversations
 */
function getInterviewConversationStats() {
  return {
    activeConversations: activeInterviewConversations.size,
    conversations: Array.from(activeInterviewConversations.keys())
  };
}

module.exports = {
  handleInterviewSchedulingMessage,
  getOrCreateInterviewConversation,
  cleanupInterviewConversation,
  getInterviewConversationStats
};
