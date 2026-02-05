/**
 * Admin Message Handler
 * Handles messages sent by admins to candidates
 */

const WebSocket = require('ws');
const { db } = require('../../db');
const { candidateClients, EventTypes } = require('../clients');
const { broadcastToAdmins } = require('../broadcast');
const { createNotification } = require('./notification-handler');
const { getMessaging } = require('../utils/lazy-loaders');

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
      console.error('Failed to send message:', result.error);
    }
  } catch (error) {
    console.error('Error in handleAdminMessage:', error);
  }
}

/**
 * Send direct message to candidate (without routing)
 * @param {number} candidateId - The candidate's ID
 * @param {string} content - Message content
 * @param {number} templateId - Optional template ID
 * @param {string} channel - Message channel (app, whatsapp, telegram)
 */
function sendMessageToCandidate(candidateId, content, templateId = null, channel = 'app') {
  const id = Date.now();
  const timestamp = new Date().toISOString();
  db.prepare(`
    INSERT INTO messages (id, candidate_id, sender, content, template_id, channel, read, created_at)
    VALUES (?, ?, 'admin', ?, ?, ?, 0, ?)
  `).run(id, candidateId, content, templateId, channel, timestamp);

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);

  // Send to candidate if online (only for app channel)
  if (channel === 'app') {
    const clientWs = candidateClients.get(candidateId);
    if (clientWs?.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: EventTypes.CHAT_MESSAGE, message }));
    } else {
      // Queue push notification
      createNotification(candidateId, 'chat', 'New message from WorkLink', content);
    }
  }

  // Confirm to all admins
  broadcastToAdmins({ type: 'message_sent', message, candidateId, channel });
}

module.exports = {
  handleAdminMessage,
  sendMessageToCandidate
};
