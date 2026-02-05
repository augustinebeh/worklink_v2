/**
 * Typing and Read Receipt Handler
 * Manages typing indicators, read receipts, and chat history
 */

const WebSocket = require('ws');
const { db } = require('../../db');
const { candidateClients, EventTypes } = require('../clients');
const { broadcastToAdmins } = require('../broadcast');
const { getConversationManager } = require('./lazy-loaders');

/**
 * Send chat history to websocket client
 */
function sendChatHistory(ws, candidateId) {
  const messages = db.prepare(`
    SELECT * FROM messages WHERE candidate_id = ? ORDER BY created_at ASC LIMIT 100
  `).all(candidateId);

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count FROM messages 
    WHERE candidate_id = ? AND sender = 'admin' AND read = 0
  `).get(candidateId).count;

  ws.send(JSON.stringify({ type: 'chat_history', messages, unreadCount }));
}

/**
 * Handle typing indicator events
 */
function handleTypingIndicator(message, candidateId, isAdmin) {
  if (isAdmin && message.candidateId) {
    const clientWs = candidateClients.get(message.candidateId);
    if (clientWs?.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: EventTypes.CHAT_TYPING, typing: message.typing }));
    }
  } else if (candidateId) {
    broadcastToAdmins({ type: EventTypes.CHAT_TYPING, candidateId, typing: message.typing });
  }
}

/**
 * Handle read receipt events
 */
function handleReadReceipt(message, candidateId, isAdmin) {
  const readAt = new Date().toISOString();

  if (isAdmin && message.candidateId) {
    // Admin reading candidate messages - update with timestamp
    db.prepare(`
      UPDATE messages SET read = 1, read_at = ? WHERE candidate_id = ? AND sender = 'candidate' AND read = 0
    `).run(readAt, message.candidateId);

    const clientWs = candidateClients.get(message.candidateId);
    if (clientWs?.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: EventTypes.CHAT_READ, by: 'admin', readAt }));
    }

    // Update conversation metadata - record admin activity
    const convManager = getConversationManager();
    if (convManager) {
      try {
        convManager.recordAdminReply(message.candidateId);
      } catch (e) { /* ignore */ }
    }
  } else if (candidateId) {
    // Candidate reading admin messages - update with timestamp
    db.prepare(`
      UPDATE messages SET read = 1, read_at = ? WHERE candidate_id = ? AND sender = 'admin' AND read = 0
    `).run(readAt, candidateId);

    broadcastToAdmins({ type: EventTypes.CHAT_READ, candidateId, by: 'candidate', readAt });
  }
}

module.exports = {
  sendChatHistory,
  handleTypingIndicator,
  handleReadReceipt
};
