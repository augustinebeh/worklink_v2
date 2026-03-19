/**
 * Notification Handler
 * Thin re-export shim for backward compatibility.
 *
 * Canonical implementations:
 *  - createNotification       -> ../broadcasting/event-notifiers.js
 *  - sendUnreadNotifications  -> ../features/status-notifications.js
 *  - markNotificationRead     -> ../features/status-notifications.js
 *  - markAllNotificationsRead -> ../features/status-notifications.js
 */

const { createNotification } = require('../broadcasting/event-notifiers');
const {
  sendUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead
} = require('../features/status-notifications');

module.exports = {
  createNotification,
  sendUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
