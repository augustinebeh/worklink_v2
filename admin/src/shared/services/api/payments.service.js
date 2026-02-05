/**
 * Payments API Service
 * Handles all payment and billing operations
 */

import apiClient from './ApiClient.js';

export const paymentsService = {
  /**
   * Get all payments with optional filtering
   * @param {Object} params - Query parameters (status, etc.)
   * @returns {Promise<Object>} List of payments
   */
  async getAll(params = {}) {
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined && value !== '')
    );
    const searchParams = new URLSearchParams(filteredParams).toString();
    const url = `/api/v1/payments${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get payment by ID
   * @param {string} id - Payment ID
   * @returns {Promise<Object>} Payment details
   */
  async getById(id) {
    return apiClient.getJSON(`/api/v1/payments/${id}`);
  },

  /**
   * Batch approve payments
   * @param {Array} paymentIds - Array of payment IDs to approve
   * @returns {Promise<Object>} Batch approval result
   */
  async batchApprove(paymentIds) {
    return apiClient.postJSON('/api/v1/payments/batch-approve', { payment_ids: paymentIds });
  },

  /**
   * Approve single payment
   * @param {string} id - Payment ID
   * @returns {Promise<Object>} Approval result
   */
  async approve(id) {
    return apiClient.postJSON(`/api/v1/payments/${id}/approve`);
  },

  /**
   * Reject payment
   * @param {string} id - Payment ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Rejection result
   */
  async reject(id, reason) {
    return apiClient.postJSON(`/api/v1/payments/${id}/reject`, { reason });
  },

  /**
   * Mark payment as paid
   * @param {string} id - Payment ID
   * @returns {Promise<Object>} Payment status update
   */
  async markAsPaid(id) {
    return apiClient.postJSON(`/api/v1/payments/${id}/paid`);
  },

  /**
   * Get payment statistics
   * @param {Object} params - Date range filters
   * @returns {Promise<Object>} Payment stats and metrics
   */
  async getStats(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/payments/stats${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Export payments data
   * @param {Object} params - Export parameters
   * @param {string} format - Export format (csv, xlsx)
   * @returns {Promise<Blob>} File download
   */
  async export(params = {}, format = 'csv') {
    const searchParams = new URLSearchParams({ ...params, format }).toString();
    const response = await apiClient.get(`/api/v1/payments/export?${searchParams}`);
    return response.blob();
  },

  /**
   * Process bulk payment upload
   * @param {FormData} formData - Payment file upload
   * @returns {Promise<Object>} Upload processing results
   */
  async bulkUpload(formData) {
    // Use fetch directly for FormData uploads
    const token = sessionStorage.getItem('admin_token');
    const response = await fetch('/api/v1/payments/bulk-upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    return response.json();
  },
};

export default paymentsService;