/**
 * Escalation API Service
 * Handles escalation queue and ticket management
 */

import apiClient from './ApiClient.js';

const escalationService = {
  /**
   * Get escalation queue
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise<Object>} Escalation queue data
   */
  async getQueue(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/admin-escalation/queue${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get a single escalation by ID
   * @param {string|number} id - Escalation ID
   * @returns {Promise<Object>} Escalation data
   */
  async getById(id) {
    return apiClient.getJSON(`/api/v1/admin-escalation/${id}`);
  },

  /**
   * Create a new escalation
   * @param {Object} escalationData - Escalation data
   * @returns {Promise<Object>} Created escalation
   */
  async create(escalationData) {
    return apiClient.postJSON('/api/v1/admin-escalation', escalationData);
  },

  /**
   * Assign escalation to admin
   * @param {string|number} id - Escalation ID
   * @param {string|number} adminId - Admin ID
   * @returns {Promise<Object>} Assignment result
   */
  async assign(id, adminId) {
    return apiClient.postJSON(`/api/v1/admin-escalation/${id}/assign`, { adminId });
  },

  /**
   * Resolve escalation
   * @param {string|number} id - Escalation ID
   * @param {Object} resolutionData - Resolution notes and data
   * @returns {Promise<Object>} Resolution result
   */
  async resolve(id, resolutionData) {
    return apiClient.postJSON(`/api/v1/admin-escalation/${id}/resolve`, resolutionData);
  },

  /**
   * Add note to escalation
   * @param {string|number} id - Escalation ID
   * @param {Object} noteData - Note content
   * @returns {Promise<Object>} Created note
   */
  async addNote(id, noteData) {
    return apiClient.postJSON(`/api/v1/admin-escalation/${id}/notes`, noteData);
  },

  /**
   * Update escalation priority
   * @param {string|number} id - Escalation ID
   * @param {string} priority - Priority level (low, medium, high, urgent)
   * @returns {Promise<Object>} Update result
   */
  async updatePriority(id, priority) {
    return apiClient.patchJSON(`/api/v1/admin-escalation/${id}/priority`, { priority });
  },

  /**
   * Get escalation analytics
   * @param {Object} filters - Date range and other filters
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(filters = {}) {
    const searchParams = new URLSearchParams(filters).toString();
    const url = `/api/v1/escalation-analytics${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get escalations by candidate
   * @param {string|number} candidateId - Candidate ID
   * @returns {Promise<Object>} Candidate escalations
   */
  async getByCandidateId(candidateId) {
    return apiClient.getJSON(`/api/v1/admin-escalation/candidate/${candidateId}`);
  },

  /**
   * Get escalations assigned to admin
   * @param {string|number} adminId - Admin ID
   * @returns {Promise<Object>} Admin's escalations
   */
  async getByAdminId(adminId) {
    return apiClient.getJSON(`/api/v1/admin-escalation/admin/${adminId}`);
  },

  /**
   * Bulk assign escalations
   * @param {Array} escalationIds - Array of escalation IDs
   * @param {string|number} adminId - Admin ID
   * @returns {Promise<Object>} Bulk assignment result
   */
  async bulkAssign(escalationIds, adminId) {
    return apiClient.postJSON('/api/v1/admin-escalation/bulk-assign', {
      escalationIds,
      adminId
    });
  },

  /**
   * Get escalation statistics
   * @returns {Promise<Object>} Escalation stats
   */
  async getStats() {
    return apiClient.getJSON('/api/v1/admin-escalation/stats');
  }
};

export default escalationService;
