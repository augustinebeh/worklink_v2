/**
 * Jobs API Service
 * Handles all job-related API operations
 */

import apiClient from './ApiClient.js';

export const jobsService = {
  /**
   * Get all jobs with optional filtering
   * @param {Object} params - Query parameters for filtering/pagination
   * @returns {Promise<Object>} Jobs data with pagination info
   */
  async getAll(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/jobs${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get a single job by ID
   * @param {string|number} id - Job ID
   * @returns {Promise<Object>} Job data
   */
  async getById(id) {
    return apiClient.getJSON(`/api/v1/jobs/${id}`);
  },

  /**
   * Create a new job
   * @param {Object} jobData - New job data
   * @returns {Promise<Object>} Created job
   */
  async create(jobData) {
    return apiClient.postJSON('/api/v1/jobs', jobData);
  },

  /**
   * Update an existing job
   * @param {string|number} id - Job ID
   * @param {Object} jobData - Updated job data
   * @returns {Promise<Object>} Updated job
   */
  async update(id, jobData) {
    return apiClient.putJSON(`/api/v1/jobs/${id}`, jobData);
  },

  /**
   * Delete a job
   * @param {string|number} id - Job ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async delete(id) {
    return apiClient.deleteJSON(`/api/v1/jobs/${id}`);
  },

  /**
   * Update job status
   * @param {string|number} id - Job ID
   * @param {string} status - New status (active, paused, closed, etc.)
   * @returns {Promise<Object>} Updated job
   */
  async updateStatus(id, status) {
    return apiClient.patchJSON(`/api/v1/jobs/${id}/status`, { status });
  },

  /**
   * Get job applicants
   * @param {string|number} id - Job ID
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise<Object>} Applicants data with pagination
   */
  async getApplicants(id, params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/jobs/${id}/applicants${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Add applicant to job
   * @param {string|number} jobId - Job ID
   * @param {string|number} candidateId - Candidate ID
   * @param {Object} applicationData - Application data
   * @returns {Promise<Object>} Created application
   */
  async addApplicant(jobId, candidateId, applicationData = {}) {
    return apiClient.postJSON(`/api/v1/jobs/${jobId}/applicants`, {
      candidateId,
      ...applicationData
    });
  },

  /**
   * Update applicant status for a job
   * @param {string|number} jobId - Job ID
   * @param {string|number} candidateId - Candidate ID
   * @param {string} status - New application status
   * @returns {Promise<Object>} Updated application
   */
  async updateApplicantStatus(jobId, candidateId, status) {
    return apiClient.patchJSON(`/api/v1/jobs/${jobId}/applicants/${candidateId}`, { status });
  },

  /**
   * Get job performance metrics
   * @param {string|number} id - Job ID
   * @returns {Promise<Object>} Performance data
   */
  async getPerformance(id) {
    return apiClient.getJSON(`/api/v1/jobs/${id}/performance`);
  },

  /**
   * Search jobs by various criteria
   * @param {Object} searchParams - Search criteria
   * @returns {Promise<Object>} Search results with pagination
   */
  async search(searchParams) {
    return apiClient.postJSON('/api/v1/jobs/search', searchParams);
  },

  /**
   * Get job templates
   * @returns {Promise<Array>} Available job templates
   */
  async getTemplates() {
    return apiClient.getJSON('/api/v1/jobs/templates');
  },

  /**
   * Create job from template
   * @param {string|number} templateId - Template ID
   * @param {Object} customData - Custom data to override template
   * @returns {Promise<Object>} Created job
   */
  async createFromTemplate(templateId, customData = {}) {
    return apiClient.postJSON(`/api/v1/jobs/templates/${templateId}/create`, customData);
  },

  /**
   * Clone an existing job
   * @param {string|number} id - Job ID to clone
   * @param {Object} modifications - Modifications to apply to the clone
   * @returns {Promise<Object>} Cloned job
   */
  async clone(id, modifications = {}) {
    return apiClient.postJSON(`/api/v1/jobs/${id}/clone`, modifications);
  },

  /**
   * Get job analytics
   * @param {Object} filters - Date range and other filters
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(filters = {}) {
    const searchParams = new URLSearchParams(filters).toString();
    const url = `/api/v1/jobs/analytics${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get job matching candidates
   * @param {string|number} id - Job ID
   * @param {Object} params - Matching parameters
   * @returns {Promise<Array>} Matched candidates
   */
  async getMatchingCandidates(id, params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/jobs/${id}/matching-candidates${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Bulk update jobs
   * @param {Array} jobIds - Array of job IDs
   * @param {Object} updateData - Data to apply to all jobs
   * @returns {Promise<Object>} Bulk update result
   */
  async bulkUpdate(jobIds, updateData) {
    return apiClient.postJSON('/api/v1/jobs/bulk-update', {
      jobIds,
      ...updateData
    });
  },

  /**
   * Export jobs data
   * @param {Object} filters - Export filters
   * @param {string} format - Export format (csv, excel, etc.)
   * @returns {Promise<Blob>} File download
   */
  async exportData(filters = {}, format = 'csv') {
    const searchParams = new URLSearchParams({ ...filters, format }).toString();
    const response = await apiClient.get(`/api/v1/jobs/export?${searchParams}`);
    return response.blob();
  },

  /**
   * Schedule job posting
   * @param {string|number} id - Job ID
   * @param {Object} scheduleData - Scheduling information
   * @returns {Promise<Object>} Schedule confirmation
   */
  async schedule(id, scheduleData) {
    return apiClient.postJSON(`/api/v1/jobs/${id}/schedule`, scheduleData);
  },

  /**
   * Get job posting preview
   * @param {string|number} id - Job ID
   * @param {string} platform - Platform to preview for
   * @returns {Promise<Object>} Preview data
   */
  async getPreview(id, platform) {
    return apiClient.getJSON(`/api/v1/jobs/${id}/preview/${platform}`);
  }
};

export default jobsService;