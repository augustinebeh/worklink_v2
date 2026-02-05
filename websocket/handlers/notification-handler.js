/**
 * Notification Handler
 * Manages user notifications and push notifications
 */

const WebSocket = require('ws');
const { db } = require('../../db');
const { candidateClients, EventTypes } = require('../clients');

/**
 * Create a new notification for a candidate
 * @param {number} candidateId - The candidate's ID
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} data - Optional additional data
 * @returns {object} The created notification
 */
function createNotification(candidateId, type, title, message, data = null) {
  const id = Date.now();
  db.prepare(`
    INSERT INTO notifications (id, candidate_id, type, title, message, data, read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `).run(id, candidateId, type, title, message, data ? JSON.stringify(data) : null);

  const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);

  // Send to candidate if online
  const clientWs = candidateClients.get(candidateId);
  if (clientWs?.readyState === WebSocket.OPEN) {
    clientWs.send(JSON.stringify({ type: EventTypes.NOTIFICATION, notification }));
  }

  return notification;
}

/**
 * Send unread notifications to a websocket client
 * @param {WebSocket} ws - The websocket connection
 * @param {number} candidateId - The candidate's ID
 */
function sendUnreadNotifications(ws, candidateId) {
  const notifications = db.prepare(`
    SELECT * FROM notifications 
    WHERE candidate_id = ? AND read = 0 
    ORDER BY created_at DESC 
    LIMIT 20
  `).all(candidateId);

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count FROM notifications WHERE candidate_id = ? AND read = 0
  `).get(candidateId).count;

  ws.send(JSON.stringify({ type: 'notifications', notifications, unreadCount }));
}

/**
 * Mark a specific notification as read
 * @param {number} candidateId - The candidate's ID
 * @param {number} notificationId - The notification ID
 */
function markNotificationRead(candidateId, notificationId) {
  db.prepare(`
    UPDATE notifications SET read = 1 WHERE id = ? AND candidate_id = ?
  `).run(notificationId, candidateId);
}

/**
 * Mark all notifications as read for a candidate
 * @param {number} candidateId - The candidate's ID
 */
function markAllNotificationsRead(candidateId) {
  db.prepare(`
    UPDATE notifications SET read = 1 WHERE candidate_id = ? AND read = 0
  `).run(candidateId);
}

module.exports = {
  createNotification,
  sendUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
