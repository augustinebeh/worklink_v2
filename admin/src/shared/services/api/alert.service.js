/**
 * Alert System Service
 * Handles alert rules, notifications, and user preferences
 */

import { apiClient as client } from './ApiClient.js';

const alertService = {
  // ========== ALERT RULES ==========
  
  /**
   * Get all alert rules
   * @param {Object} params - Query parameters
   */
  async getAlertRules(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/v1/alerts/rules${queryString ? `?${queryString}` : ''}`;
    const response = await client.get(url);
    return response.json();
  },

  /**
   * Create new alert rule
   * @param {Object} data - Rule data
   */
  async createAlertRule(data) {
    const response = await client.post('/api/v1/alerts/rules', data);
    return response.json();
  },

  /**
   * Update alert rule
   * @param {number} id - Rule ID
   * @param {Object} data - Fields to update
   */
  async updateAlertRule(id, data) {
    const response = await client.patch(`/api/v1/alerts/rules/${id}`, data);
    return response.json();
  },

  /**
   * Delete alert rule
   * @param {number} id - Rule ID
   */
  async deleteAlertRule(id) {
    const response = await client.delete(`/api/v1/alerts/rules/${id}`);
    return response.json();
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
    const response = await client.get(url);
    return response.json();
  },

  /**
   * Mark alert as read/acknowledged
   * @param {number} id - Alert ID
   * @param {Object} data - Acknowledgment data
   */
  async acknowledgeAlert(id, data = {}) {
    const response = await client.post(`/api/v1/alerts/history/${id}/acknowledge`, data);
    return response.json();
  },

  /**
   * Mark all alerts as read
   * @param {Object} data - Optional filters
   */
  async markAllRead(data = {}) {
    const response = await client.post('/api/v1/alerts/history/mark-all-read', data);
    return response.json();
  },

  /**
   * Get unread alert count
   */
  async getUnreadCount() {
    const response = await client.get('/api/v1/alerts/unread-count');
    return response.json();
  },

  // ========== ALERT ENGINE ==========

  /**
   * Manually trigger alert evaluation
   * @param {Object} data - Trigger context
   */
  async triggerAlerts(data) {
    const response = await client.post('/api/v1/alerts/trigger', data);
    return response.json();
  },

  // ========== USER PREFERENCES ==========

  /**
   * Get user notification preferences
   * @param {string} userId - User ID
   */
  async getPreferences(userId) {
    const queryString = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    const response = await client.get(`/api/v1/alerts/preferences${queryString}`);
    return response.json();
  },

  /**
   * Update notification preferences
   * @param {Object} data - Preference settings
   */
  async updatePreferences(data) {
    const response = await client.patch('/api/v1/alerts/preferences', data);
    return response.json();
  }
};

export default alertService;
