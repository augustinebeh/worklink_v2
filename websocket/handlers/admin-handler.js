/**
 * Admin Message Handler
 * Handles messages sent by admins to candidates
 */

const { getMessaging } = require('../utils/lazy-loaders');
const { createLogger } = require('../../utils/structured-logger');

const logger = createLogger('websocket:admin-handler');

/**
 * Handle admin message to candidate
 * Routes message through messaging service
 * @param {number} candidateId - The candidate's ID
 * @param {string} content - Message content
 * @param {number} templateId - Optional template ID
 */
async function handleAdminMessage(candidateId, content, templateId = null) {
  try {
    const messaging = getMessaging();
    const result = await messaging.sendToCandidate(candidateId, content, {
      channel: 'auto',
      templateId: templateId
    });

    if (!result.success) {
      logger.error('Failed to send message', { error: result.error });
    }
  } catch (error) {
    logger.error('Error in handleAdminMessage', { error: error.message });
  }
}

module.exports = {
  handleAdminMessage
};
