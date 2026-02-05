/**
 * Notification API Service
 * Handles notification sending and management
 */

import apiClient from './ApiClient.js';

const notificationService = {
  /**
   * Get all notifications for current user
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise<Object>} Notifications data
   */
  async getAll(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/notifications${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get unread notifications count
   * @returns {Promise<Object>} Unread count
   */
  async getUnreadCount() {
    return apiClient.getJSON('/api/v1/notifications/unread/count');
  },

  /**
   * Mark notification as read
   * @param {string|number} id - Notification ID
   * @returns {Promise<Object>} Update result
   */
  async markAsRead(id) {
    return apiClient.patchJSON(`/api/v1/notifications/${id}/read`, {});
  },

  /**
   * Mark all notifications as read
   * @returns {Promise<Object>} Update result
   */
  async markAllAsRead() {
    return apiClient.postJSON('/api/v1/notifications/mark-all-read', {});
  },

  /**
   * Delete a notification
   * @param {string|number} id - Notification ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async delete(id) {
    return apiClient.deleteJSON(`/api/v1/notifications/${id}`);
  },

  /**
   * Send notification to candidate(s)
   * @param {Object} notificationData - Notification content and recipients
   * @returns {Promise<Object>} Send result
   */
  async send(notificationData) {
    return apiClient.postJSON('/api/v1/notifications/send', notificationData);
  },

  /**
   * Send bulk notification
   * @param {Array} candidateIds - Array of candidate IDs
   * @param {Object} notificationContent - Notification content
   * @returns {Promise<Object>} Bulk send result
   */
  async sendBulk(candidateIds, notificationContent) {
    return apiClient.postJSON('/api/v1/notifications/send-bulk', {
      candidateIds,
      ...notificationContent
    });
  },

  /**
   * Get notification preferences
   * @param {string|number} userId - User ID (optional, defaults to current user)
   * @returns {Promise<Object>} Preferences
   */
  async getPreferences(userId = null) {
    const url = userId 
      ? `/api/v1/notifications/preferences/${userId}`
      : '/api/v1/notifications/preferences';
    return apiClient.getJSON(url);
  },

  /**
   * Update notification preferences
   * @param {Object} preferences - Preference settings
   * @param {string|number} userId - User ID (optional, defaults to current user)
   * @returns {Promise<Object>} Update result
   */
  async updatePreferences(preferences, userId = null) {
    const url = userId
      ? `/api/v1/notifications/preferences/${userId}`
      : '/api/v1/notifications/preferences';
    return apiClient.putJSON(url, preferences);
  },

  /**
   * Get notification templates
   * @returns {Promise<Object>} Available templates
   */
  async getTemplates() {
    return apiClient.getJSON('/api/v1/notifications/templates');
  },

  /**
   * Create notification template
   * @param {Object} templateData - Template data
   * @returns {Promise<Object>} Created template
   */
  async createTemplate(templateData) {
    return apiClient.postJSON('/api/v1/notifications/templates', templateData);
  },

  /**
   * Update notification template
   * @param {string|number} id - Template ID
   * @param {Object} templateData - Updated template data
   * @returns {Promise<Object>} Updated template
   */
  async updateTemplate(id, templateData) {
    return apiClient.putJSON(`/api/v1/notifications/templates/${id}`, templateData);
  },

  /**
   * Delete notification template
   * @param {string|number} id - Template ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteTemplate(id) {
    return apiClient.deleteJSON(`/api/v1/notifications/templates/${id}`);
  },

  /**
   * Get notification history/logs
   * @param {Object} filters - Date range and other filters
   * @returns {Promise<Object>} Notification history
   */
  async getHistory(filters = {}) {
    const searchParams = new URLSearchParams(filters).toString();
    const url = `/api/v1/notifications/history${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  }
};

export default notificationService;
