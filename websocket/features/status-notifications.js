/**
 * Status & Notifications Manager
 * Handles candidate status updates and notification management
 * 
 * @module websocket/features/status-notifications
 */

const { db } = require('../../db');
const { EventTypes } = require('../config/event-types');
const { createLogger } = require('../../utils/structured-logger');
const clientStore = require('../utils/client-store');

const logger = createLogger('websocket:status-notifications');

// ==================== STATUS MANAGEMENT ====================

/**
 * Update candidate online status
 * @param {string} candidateId - Candidate ID
 * @param {string} status - New status ('online', 'offline', 'away', etc.)
 */
function updateCandidateStatus(candidateId, status) {
  try {
    db.prepare(`
      UPDATE candidates 
      SET online_status = ?, last_seen = datetime('now') 
      WHERE id = ?
    `).run(status, candidateId);

    logger.info('Candidate status updated', { candidateId, status });
  } catch (error) {
    logger.error('Failed to update candidate status', {
      candidateId,
      status,
      error: error.message
    });
  }
}

/**
 * Send candidate status information to a client
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} candidateId - Candidate ID
 */
function sendCandidateStatus(ws, candidateId) {
  try {
    const candidate = db.prepare(`
      SELECT online_status, last_seen 
      FROM candidates 
      WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      logger.warn('Candidate not found for status request', { candidateId });
      return;
    }

    ws.send(JSON.stringify({
      type: 'status_response',
      candidateId,
      online_status: candidate.online_status,
      last_seen: candidate.last_seen,
      isOnline: clientStore.isCandidateConnected(candidateId)
    }));

    logger.debug('Candidate status sent', { candidateId });
  } catch (error) {
    logger.error('Failed to send candidate status', {
      candidateId,
      error: error.message
    });
  }
}

/**
 * Get candidate status
 * @param {string} candidateId - Candidate ID
 * @returns {Object|null} Status object or null
 */
function getCandidateStatus(candidateId) {
  try {
    const candidate = db.prepare(`
      SELECT online_status, last_seen 
      FROM candidates 
      WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      return null;
    }

    return {
      online_status: candidate.online_status,
      last_seen: candidate.last_seen,
      isOnline: clientStore.isCandidateConnected(candidateId)
    };
  } catch (error) {
    logger.error('Failed to get candidate status', {
      candidateId,
      error: error.message
    });
    return null;
  }
}

// ==================== NOTIFICATION MANAGEMENT ====================

/**
 * Create a new notification for a candidate
 * @param {string} candidateId - Candidate ID
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object|null} data - Additional data
 * @returns {Object|null} Created notification or null
 */
function createNotification(candidateId, type, title, message, data = null) {
  try {
    const id = Date.now();
    
    db.prepare(`
      INSERT INTO notifications (id, candidate_id, type, title, message, data, read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
    `).run(id, candidateId, type, title, message, data ? JSON.stringify(data) : null);

    const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);

    logger.info('Notification created', {
      candidateId,
      type,
      notificationId: id
    });

    // Send to candidate if online
    const clientWs = clientStore.getCandidateClient(candidateId);
    if (clientWs?.readyState === 1) { // OPEN
      clientWs.send(JSON.stringify({
        type: EventTypes.NOTIFICATION,
        notification
      }));
    }

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
 * Send unread notifications to a candidate
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} candidateId - Candidate ID
 */
function sendUnreadNotifications(ws, candidateId) {
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE candidate_id = ? AND read = 0 
      ORDER BY created_at DESC 
      LIMIT 20
    `).all(candidateId);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE candidate_id = ? AND read = 0
    `).get(candidateId).count;

    ws.send(JSON.stringify({
      type: 'notifications',
      notifications,
      unreadCount
    }));

    logger.info('Unread notifications sent', {
      candidateId,
      count: notifications.length,
      unreadCount
    });
  } catch (error) {
    logger.error('Failed to send unread notifications', {
      candidateId,
      error: error.message
    });
  }
}

/**
 * Mark a notification as read
 * @param {string} candidateId - Candidate ID
 * @param {number} notificationId - Notification ID
 */
function markNotificationRead(candidateId, notificationId) {
  try {
    const result = db.prepare(`
      UPDATE notifications 
      SET read = 1 
      WHERE id = ? AND candidate_id = ?
    `).run(notificationId, candidateId);

    logger.info('Notification marked as read', {
      candidateId,
      notificationId,
      updated: result.changes
    });
  } catch (error) {
    logger.error('Failed to mark notification as read', {
      candidateId,
      notificationId,
      error: error.message
    });
  }
}

/**
 * Mark all notifications as read for a candidate
 * @param {string} candidateId - Candidate ID
 */
function markAllNotificationsRead(candidateId) {
  try {
    const result = db.prepare(`
      UPDATE notifications 
      SET read = 1 
      WHERE candidate_id = ? AND read = 0
    `).run(candidateId);

    logger.info('All notifications marked as read', {
      candidateId,
      updated: result.changes
    });

    return result.changes;
  } catch (error) {
    logger.error('Failed to mark all notifications as read', {
      candidateId,
      error: error.message
    });
    return 0;
  }
}

/**
 * Get unread notification count for a candidate
 * @param {string} candidateId - Candidate ID
 * @returns {number} Unread count
 */
function getUnreadNotificationCount(candidateId) {
  try {
    const result = db.prepare(`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE candidate_id = ? AND read = 0
    `).get(candidateId);

    return result.count || 0;
  } catch (error) {
    logger.error('Failed to get unread notification count', {
      candidateId,
      error: error.message
    });
    return 0;
  }
}

/**
 * Delete old read notifications
 * @param {number} daysOld - Delete notifications older than this many days
 * @returns {number} Number of deleted notifications
 */
function deleteOldNotifications(daysOld = 30) {
  try {
    const result = db.prepare(`
      DELETE FROM notifications 
      WHERE read = 1 
        AND created_at < datetime('now', '-${daysOld} days')
    `).run();

    logger.info('Old notifications deleted', {
      daysOld,
      deleted: result.changes
    });

    return result.changes;
  } catch (error) {
    logger.error('Failed to delete old notifications', {
      daysOld,
      error: error.message
    });
    return 0;
  }
}

module.exports = {
  // Status management
  updateCandidateStatus,
  sendCandidateStatus,
  getCandidateStatus,

  // Notification management
  createNotification,
  sendUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
  deleteOldNotifications
};
