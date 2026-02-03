/**
 * Candidates API Service
 * Handles all candidate-related API operations
 */

import apiClient from './ApiClient.js';

export const candidatesService = {
  /**
   * Get all candidates with optional filtering
   * @param {Object} params - Query parameters for filtering/pagination
   * @returns {Promise<Object>} Candidates data with pagination info
   */
  async getAll(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/candidates${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get a single candidate by ID
   * @param {string|number} id - Candidate ID
   * @returns {Promise<Object>} Candidate data
   */
  async getById(id) {
    return apiClient.getJSON(`/api/v1/candidates/${id}`);
  },

  /**
   * Create a new candidate
   * @param {Object} candidateData - New candidate data
   * @returns {Promise<Object>} Created candidate
   */
  async create(candidateData) {
    return apiClient.postJSON('/api/v1/candidates', candidateData);
  },

  /**
   * Update an existing candidate
   * @param {string|number} id - Candidate ID
   * @param {Object} candidateData - Updated candidate data
   * @returns {Promise<Object>} Updated candidate
   */
  async update(id, candidateData) {
    return apiClient.putJSON(`/api/v1/candidates/${id}`, candidateData);
  },

  /**
   * Delete a candidate
   * @param {string|number} id - Candidate ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async delete(id) {
    return apiClient.deleteJSON(`/api/v1/candidates/${id}`);
  },

  /**
   * Update candidate status
   * @param {string|number} id - Candidate ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated candidate
   */
  async updateStatus(id, status) {
    return apiClient.patchJSON(`/api/v1/candidates/${id}/status`, { status });
  },

  /**
   * Get candidate performance data
   * @param {string|number} id - Candidate ID
   * @returns {Promise<Object>} Performance metrics
   */
  async getPerformance(id) {
    return apiClient.getJSON(`/api/v1/candidates/${id}/performance`);
  },

  /**
   * Get candidate application history
   * @param {string|number} id - Candidate ID
   * @returns {Promise<Array>} Application history
   */
  async getApplications(id) {
    return apiClient.getJSON(`/api/v1/candidates/${id}/applications`);
  },

  /**
   * Add notes to a candidate
   * @param {string|number} id - Candidate ID
   * @param {Object} noteData - Note content and metadata
   * @returns {Promise<Object>} Created note
   */
  async addNote(id, noteData) {
    return apiClient.postJSON(`/api/v1/candidates/${id}/notes`, noteData);
  },

  /**
   * Upload candidate documents
   * @param {string|number} id - Candidate ID
   * @param {FormData} formData - File upload data
   * @returns {Promise<Object>} Upload result
   */
  async uploadDocuments(id, formData) {
    // For file uploads, we need to handle FormData differently
    const response = await apiClient.request(`/api/v1/candidates/${id}/documents`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type for FormData - let browser set it with boundary
    });
    return response.json();
  },

  /**
   * Search candidates by various criteria
   * @param {Object} searchParams - Search criteria
   * @returns {Promise<Object>} Search results with pagination
   */
  async search(searchParams) {
    return apiClient.postJSON('/api/v1/candidates/search', searchParams);
  },

  /**
   * Get candidate statistics/analytics
   * @param {Object} filters - Date range and other filters
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(filters = {}) {
    const searchParams = new URLSearchParams(filters).toString();
    const url = `/api/v1/candidates/analytics${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Bulk update candidates
   * @param {Array} candidateIds - Array of candidate IDs
   * @param {Object} updateData - Data to apply to all candidates
   * @returns {Promise<Object>} Bulk update result
   */
  async bulkUpdate(candidateIds, updateData) {
    return apiClient.postJSON('/api/v1/candidates/bulk-update', {
      candidateIds,
      ...updateData
    });
  },

  /**
   * Export candidates data
   * @param {Object} filters - Export filters
   * @param {string} format - Export format (csv, excel, etc.)
   * @returns {Promise<Blob>} File download
   */
  async exportData(filters = {}, format = 'csv') {
    const searchParams = new URLSearchParams({ ...filters, format }).toString();
    const response = await apiClient.get(`/api/v1/candidates/export?${searchParams}`);
    return response.blob();
  }
};

export default candidatesService;