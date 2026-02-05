/**
 * BPO Tender Lifecycle Service
 * Handles 7-stage tender pipeline management
 */

import { apiClient as client } from './ApiClient.js';

const lifecycleService = {
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
    const response = await client.get(url);
    return response.json();
  },

  /**
   * Get single tender with full details
   * @param {number} id - Tender ID
   */
  async getTenderById(id) {
    const response = await client.get(`/api/v1/bpo/lifecycle/${id}`);
    return response.json();
  },

  /**
   * Create new tender card
   * @param {Object} data - Tender data
   */
  async createTender(data) {
    const response = await client.post('/api/v1/bpo/lifecycle', data);
    return response.json();
  },

  /**
   * Update tender fields
   * @param {number} id - Tender ID
   * @param {Object} data - Fields to update
   */
  async updateTender(id, data) {
    const response = await client.patch(`/api/v1/bpo/lifecycle/${id}`, data);
    return response.json();
  },

  /**
   * Move tender to different stage
   * @param {number} id - Tender ID
   * @param {Object} data - Stage movement data
   */
  async moveTender(id, data) {
    const response = await client.post(`/api/v1/bpo/lifecycle/${id}/move`, data);
    return response.json();
  },

  /**
   * Record Go/No-Go decision
   * @param {number} id - Tender ID
   * @param {Object} data - Decision data
   */
  async recordDecision(id, data) {
    const response = await client.post(`/api/v1/bpo/lifecycle/${id}/decision`, data);
    return response.json();
  },

  /**
   * Get pipeline statistics
   */
  async getPipelineStats() {
    const response = await client.get('/api/v1/bpo/lifecycle/dashboard/stats');
    return response.json();
  },

  /**
   * Get tenders closing soon
   * @param {number} days - Days threshold (default 7)
   */
  async getClosingDeadlines(days = 7) {
    const response = await client.get(`/api/v1/bpo/lifecycle/dashboard/deadlines?days=${days}`);
    return response.json();
  },

  /**
   * Move renewal to new opportunity stage
   * @param {number} renewalId - Renewal ID
   */
  async moveRenewalToOpportunity(renewalId) {
    const response = await client.post(`/api/v1/bpo/lifecycle/renewal/${renewalId}/move`);
    return response.json();
  },

  /**
   * Delete tender
   * @param {number} id - Tender ID
   */
  async deleteTender(id) {
    const response = await client.delete(`/api/v1/bpo/lifecycle/${id}`);
    return response.json();
  }
};

export default lifecycleService;
