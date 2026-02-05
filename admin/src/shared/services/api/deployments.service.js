/**
 * Deployments API Service
 * Handles all deployment and assignment operations
 */

import apiClient from './ApiClient.js';

const deploymentsService = {
  /**
   * Get all deployments with optional filtering
   * @param {Object} params - Query parameters (status, date range, etc.)
   * @returns {Promise<Object>} List of deployments
   */
  async getAll(params = {}) {
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined && value !== '')
    );
    const searchParams = new URLSearchParams(filteredParams).toString();
    const url = `/api/v1/deployments${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get deployment by ID
   * @param {string} id - Deployment ID
   * @returns {Promise<Object>} Deployment details
   */
  async getById(id) {
    return apiClient.getJSON(`/api/v1/deployments/${id}`);
  },

  /**
   * Create new deployment
   * @param {Object} deploymentData - Deployment information
   * @returns {Promise<Object>} Created deployment
   */
  async create(deploymentData) {
    return apiClient.postJSON('/api/v1/deployments', deploymentData);
  },

  /**
   * Update deployment
   * @param {string} id - Deployment ID
   * @param {Object} updates - Deployment updates
   * @returns {Promise<Object>} Updated deployment
   */
  async update(id, updates) {
    return apiClient.putJSON(`/api/v1/deployments/${id}`, updates);
  },

  /**
   * Cancel deployment
   * @param {string} id - Deployment ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancellation result
   */
  async cancel(id, reason) {
    return apiClient.postJSON(`/api/v1/deployments/${id}/cancel`, { reason });
  },

  /**
   * Complete deployment
   * @param {string} id - Deployment ID
   * @param {Object} completionData - Completion details (hours worked, etc.)
   * @returns {Promise<Object>} Completion result
   */
  async complete(id, completionData) {
    return apiClient.postJSON(`/api/v1/deployments/${id}/complete`, completionData);
  },

  /**
   * Get deployment statistics
   * @param {Object} params - Date range filters
   * @returns {Promise<Object>} Deployment stats and metrics
   */
  async getStats(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/deployments/stats${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Assign candidate to job
   * @param {Object} assignmentData - Assignment details
   * @returns {Promise<Object>} Assignment result
   */
  async assign(assignmentData) {
    return apiClient.postJSON('/api/v1/deployments/assign', assignmentData);
  },

  /**
   * Bulk assign candidates to jobs
   * @param {Array} assignments - Array of assignment objects
   * @returns {Promise<Object>} Bulk assignment result
   */
  async bulkAssign(assignments) {
    return apiClient.postJSON('/api/v1/deployments/bulk-assign', { assignments });
  },

  /**
   * Get upcoming deployments
   * @param {Object} params - Date range and filters
   * @returns {Promise<Object>} Upcoming deployments
   */
  async getUpcoming(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/deployments/upcoming${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Export deployments data
   * @param {Object} params - Export parameters
   * @param {string} format - Export format (csv, xlsx)
   * @returns {Promise<Blob>} File download
   */
  async export(params = {}, format = 'csv') {
    const searchParams = new URLSearchParams({ ...params, format }).toString();
    const response = await apiClient.get(`/api/v1/deployments/export?${searchParams}`);
    return response.blob();
  },
};

export default deploymentsService;