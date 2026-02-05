/**
 * Alert System Service
 * Handles alert rules, notifications, and user preferences
 */

import ApiClient from './ApiClient.js';

const client = new ApiClient();

export const alertService = {
  // ========== ALERT RULES ==========
  
  /**
   * Get all alert rules
   * @param {Object} params - Query parameters
   */
  async getAlertRules(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/v1/alerts/rules${queryString ? `?${queryString}` : ''}`;
    return client.get(url);
  },

  /**
   * Create new alert rule
   * @param {Object} data - Rule data
   */
  async createAlertRule(data) {
    return client.post('/api/v1/alerts/rules', data);
  },

  /**
   * Update alert rule
   * @param {number} id - Rule ID
   * @param {Object} data - Fields to update
   */
  async updateAlertRule(id, data) {
    return client.patch(`/api/v1/alerts/rules/${id}`, data);
  },

  /**
   * Delete alert rule
   * @param {number} id - Rule ID
   */
  async deleteAlertRule(id) {
    return client.delete(`/api/v1/alerts/rules/${id}`);
  },

  // ========== ALERT HISTORY ==========

  /**
   * Get alert history with filtering
   * @param {Object} params - Query parameters
   * @param {string} params.priority - Filter by priority
   * @param {boolean} params.unread_only - Only unread alerts
   * @param {string} params.trigger_type - Filter by type
   * @param {number} params.limit - Results per page
   * @param {number} params.offset - Pagination offset
   */
  async getAlertHistory(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/v1/alerts/history${queryString ? `?${queryString}` : ''}`;
    return client.get(url);
  },

  /**
   * Mark alert as read/acknowledged
   * @param {number} id - Alert ID
   * @param {Object} data - Acknowledgment data
   */
  async acknowledgeAlert(id, data = {}) {
    return client.post(`/api/v1/alerts/history/${id}/acknowledge`, data);
  },

  /**
   * Mark all alerts as read
   * @param {Object} data - Optional filters
   */
  async markAllRead(data = {}) {
    return client.post('/api/v1/alerts/history/mark-all-read', data);
  },

  /**
   * Get unread alert count
   */
  async getUnreadCount() {
    return client.get('/api/v1/alerts/unread-count');
  },

  // ========== ALERT ENGINE ==========

  /**
   * Manually trigger alert evaluation
   * @param {Object} data - Trigger context
   */
  async triggerAlerts(data) {
    return client.post('/api/v1/alerts/trigger', data);
  },

  // ========== USER PREFERENCES ==========

  /**
   * Get user notification preferences
   * @param {string} userId - User ID
   */
  async getPreferences(userId) {
    const queryString = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    return client.get(`/api/v1/alerts/preferences${queryString}`);
  },

  /**
   * Update notification preferences
   * @param {Object} data - Preference settings
   */
  async updatePreferences(data) {
    return client.patch('/api/v1/alerts/preferences', data);
  }
};

export default alertService;
