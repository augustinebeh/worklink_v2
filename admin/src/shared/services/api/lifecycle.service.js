/**
 * BPO Tender Lifecycle Service
 * Handles 7-stage tender pipeline management
 */

import ApiClient from './ApiClient.js';

const client = new ApiClient();

export const lifecycleService = {
  /**
   * Get all tenders in pipeline
   * @param {Object} params - Query parameters
   * @param {string} params.stage - Filter by stage
   * @param {string} params.priority - Filter by priority
   * @param {string} params.agency - Filter by agency
   * @param {string} params.assigned_to - Filter by assigned user
   * @param {boolean} params.urgent - Only urgent tenders
   * @param {boolean} params.renewal - Only renewals
   * @param {number} params.limit - Results per page
   * @param {number} params.offset - Pagination offset
   */
  async getTenders(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/v1/bpo/lifecycle${queryString ? `?${queryString}` : ''}`;
    return client.get(url);
  },

  /**
   * Get single tender with full details
   * @param {number} id - Tender ID
   */
  async getTenderById(id) {
    return client.get(`/api/v1/bpo/lifecycle/${id}`);
  },

  /**
   * Create new tender card
   * @param {Object} data - Tender data
   */
  async createTender(data) {
    return client.post('/api/v1/bpo/lifecycle', data);
  },

  /**
   * Update tender fields
   * @param {number} id - Tender ID
   * @param {Object} data - Fields to update
   */
  async updateTender(id, data) {
    return client.patch(`/api/v1/bpo/lifecycle/${id}`, data);
  },

  /**
   * Move tender to different stage
   * @param {number} id - Tender ID
   * @param {Object} data - Stage movement data
   */
  async moveTender(id, data) {
    return client.post(`/api/v1/bpo/lifecycle/${id}/move`, data);
  },

  /**
   * Record Go/No-Go decision
   * @param {number} id - Tender ID
   * @param {Object} data - Decision data
   */
  async recordDecision(id, data) {
    return client.post(`/api/v1/bpo/lifecycle/${id}/decision`, data);
  },

  /**
   * Get pipeline statistics
   */
  async getPipelineStats() {
    return client.get('/api/v1/bpo/lifecycle/dashboard/stats');
  },

  /**
   * Get tenders closing soon
   * @param {number} days - Days threshold (default 7)
   */
  async getClosingDeadlines(days = 7) {
    return client.get(`/api/v1/bpo/lifecycle/dashboard/deadlines?days=${days}`);
  },

  /**
   * Move renewal to new opportunity stage
   * @param {number} renewalId - Renewal ID
   */
  async moveRenewalToOpportunity(renewalId) {
    return client.post(`/api/v1/bpo/lifecycle/renewal/${renewalId}/move`);
  },

  /**
   * Delete tender
   * @param {number} id - Tender ID
   */
  async deleteTender(id) {
    return client.delete(`/api/v1/bpo/lifecycle/${id}`);
  }
};

export default lifecycleService;
