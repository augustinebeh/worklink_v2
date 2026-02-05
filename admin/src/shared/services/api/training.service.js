/**
 * Training API Service
 * Handles all training-related API operations
 */

import apiClient from './ApiClient.js';

const trainingService = {
  /**
   * Get all training modules
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise<Object>} Training modules data
   */
  async getModules(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/training/modules${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get a single training module by ID
   * @param {string|number} id - Module ID
   * @returns {Promise<Object>} Module data
   */
  async getModuleById(id) {
    return apiClient.getJSON(`/api/v1/training/modules/${id}`);
  },

  /**
   * Create a new training module
   * @param {Object} moduleData - Module data
   * @returns {Promise<Object>} Created module
   */
  async createModule(moduleData) {
    return apiClient.postJSON('/api/v1/training/modules', moduleData);
  },

  /**
   * Update a training module
   * @param {string|number} id - Module ID
   * @param {Object} moduleData - Updated module data
   * @returns {Promise<Object>} Updated module
   */
  async updateModule(id, moduleData) {
    return apiClient.putJSON(`/api/v1/training/modules/${id}`, moduleData);
  },

  /**
   * Delete a training module
   * @param {string|number} id - Module ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteModule(id) {
    return apiClient.deleteJSON(`/api/v1/training/modules/${id}`);
  },

  /**
   * Get candidate's training progress
   * @param {string|number} candidateId - Candidate ID
   * @returns {Promise<Object>} Training progress data
   */
  async getCandidateProgress(candidateId) {
    return apiClient.getJSON(`/api/v1/training/candidates/${candidateId}/progress`);
  },

  /**
   * Enroll candidate in a module
   * @param {string|number} candidateId - Candidate ID
   * @param {string|number} moduleId - Module ID
   * @returns {Promise<Object>} Enrollment result
   */
  async enrollCandidate(candidateId, moduleId) {
    return apiClient.postJSON(`/api/v1/training/candidates/${candidateId}/enroll`, {
      moduleId
    });
  },

  /**
   * Record module completion
   * @param {string|number} candidateId - Candidate ID
   * @param {string|number} moduleId - Module ID
   * @param {Object} completionData - Completion data (score, passed, etc.)
   * @returns {Promise<Object>} Completion record
   */
  async recordCompletion(candidateId, moduleId, completionData) {
    return apiClient.postJSON(`/api/v1/training/candidates/${candidateId}/complete/${moduleId}`, completionData);
  },

  /**
   * Get training analytics
   * @param {Object} filters - Date range and other filters
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(filters = {}) {
    const searchParams = new URLSearchParams(filters).toString();
    const url = `/api/v1/training/analytics${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get module completions
   * @param {string|number} moduleId - Module ID
   * @returns {Promise<Object>} Completion statistics
   */
  async getModuleCompletions(moduleId) {
    return apiClient.getJSON(`/api/v1/training/modules/${moduleId}/completions`);
  },

  /**
   * Bulk enroll candidates
   * @param {Array} candidateIds - Array of candidate IDs
   * @param {string|number} moduleId - Module ID
   * @returns {Promise<Object>} Bulk enrollment result
   */
  async bulkEnroll(candidateIds, moduleId) {
    return apiClient.postJSON('/api/v1/training/bulk-enroll', {
      candidateIds,
      moduleId
    });
  }
};

export default trainingService;
