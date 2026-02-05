/**
 * Clients API Service
 * Handles all client-related API operations
 */

import apiClient from './ApiClient.js';

const clientsService = {
  /**
   * Get all clients with optional filtering
   * @param {Object} params - Query parameters for filtering/pagination
   * @returns {Promise<Object>} Clients data with pagination info
   */
  async getAll(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/clients${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get a single client by ID
   * @param {string|number} id - Client ID
   * @returns {Promise<Object>} Client data
   */
  async getById(id) {
    return apiClient.getJSON(`/api/v1/clients/${id}`);
  },

  /**
   * Create a new client
   * @param {Object} clientData - New client data
   * @returns {Promise<Object>} Created client
   */
  async create(clientData) {
    return apiClient.postJSON('/api/v1/clients', clientData);
  },

  /**
   * Update an existing client
   * @param {string|number} id - Client ID
   * @param {Object} clientData - Updated client data
   * @returns {Promise<Object>} Updated client
   */
  async update(id, clientData) {
    return apiClient.putJSON(`/api/v1/clients/${id}`, clientData);
  },

  /**
   * Delete a client
   * @param {string|number} id - Client ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async delete(id) {
    return apiClient.deleteJSON(`/api/v1/clients/${id}`);
  },

  /**
   * Update client status
   * @param {string|number} id - Client ID
   * @param {string} status - New status (active, inactive, suspended, etc.)
   * @returns {Promise<Object>} Updated client
   */
  async updateStatus(id, status) {
    return apiClient.patchJSON(`/api/v1/clients/${id}/status`, { status });
  },

  /**
   * Get client jobs
   * @param {string|number} id - Client ID
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise<Object>} Client jobs with pagination
   */
  async getJobs(id, params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/clients/${id}/jobs${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get client contract history
   * @param {string|number} id - Client ID
   * @returns {Promise<Array>} Contract history
   */
  async getContracts(id) {
    return apiClient.getJSON(`/api/v1/clients/${id}/contracts`);
  },

  /**
   * Add a new contract for client
   * @param {string|number} id - Client ID
   * @param {Object} contractData - Contract information
   * @returns {Promise<Object>} Created contract
   */
  async addContract(id, contractData) {
    return apiClient.postJSON(`/api/v1/clients/${id}/contracts`, contractData);
  },

  /**
   * Update client contract
   * @param {string|number} clientId - Client ID
   * @param {string|number} contractId - Contract ID
   * @param {Object} contractData - Updated contract data
   * @returns {Promise<Object>} Updated contract
   */
  async updateContract(clientId, contractId, contractData) {
    return apiClient.putJSON(`/api/v1/clients/${clientId}/contracts/${contractId}`, contractData);
  },

  /**
   * Get client billing information
   * @param {string|number} id - Client ID
   * @returns {Promise<Object>} Billing data
   */
  async getBilling(id) {
    return apiClient.getJSON(`/api/v1/clients/${id}/billing`);
  },

  /**
   * Update client billing information
   * @param {string|number} id - Client ID
   * @param {Object} billingData - Billing information
   * @returns {Promise<Object>} Updated billing data
   */
  async updateBilling(id, billingData) {
    return apiClient.putJSON(`/api/v1/clients/${id}/billing`, billingData);
  },

  /**
   * Get client performance metrics
   * @param {string|number} id - Client ID
   * @param {Object} params - Date range and metrics filters
   * @returns {Promise<Object>} Performance data
   */
  async getPerformance(id, params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/clients/${id}/performance${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get client contact persons
   * @param {string|number} id - Client ID
   * @returns {Promise<Array>} Contact persons
   */
  async getContacts(id) {
    return apiClient.getJSON(`/api/v1/clients/${id}/contacts`);
  },

  /**
   * Add contact person to client
   * @param {string|number} id - Client ID
   * @param {Object} contactData - Contact information
   * @returns {Promise<Object>} Created contact
   */
  async addContact(id, contactData) {
    return apiClient.postJSON(`/api/v1/clients/${id}/contacts`, contactData);
  },

  /**
   * Update client contact
   * @param {string|number} clientId - Client ID
   * @param {string|number} contactId - Contact ID
   * @param {Object} contactData - Updated contact data
   * @returns {Promise<Object>} Updated contact
   */
  async updateContact(clientId, contactId, contactData) {
    return apiClient.putJSON(`/api/v1/clients/${clientId}/contacts/${contactId}`, contactData);
  },

  /**
   * Delete client contact
   * @param {string|number} clientId - Client ID
   * @param {string|number} contactId - Contact ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteContact(clientId, contactId) {
    return apiClient.deleteJSON(`/api/v1/clients/${clientId}/contacts/${contactId}`);
  },

  /**
   * Search clients by various criteria
   * @param {Object} searchParams - Search criteria
   * @returns {Promise<Object>} Search results with pagination
   */
  async search(searchParams) {
    return apiClient.postJSON('/api/v1/clients/search', searchParams);
  },

  /**
   * Get client analytics
   * @param {Object} filters - Date range and other filters
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(filters = {}) {
    const searchParams = new URLSearchParams(filters).toString();
    const url = `/api/v1/clients/analytics${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get client invoices
   * @param {string|number} id - Client ID
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise<Object>} Invoices with pagination
   */
  async getInvoices(id, params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/clients/${id}/invoices${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Generate invoice for client
   * @param {string|number} id - Client ID
   * @param {Object} invoiceData - Invoice details
   * @returns {Promise<Object>} Generated invoice
   */
  async generateInvoice(id, invoiceData) {
    return apiClient.postJSON(`/api/v1/clients/${id}/invoices`, invoiceData);
  },

  /**
   * Upload client documents
   * @param {string|number} id - Client ID
   * @param {FormData} formData - File upload data
   * @returns {Promise<Object>} Upload result
   */
  async uploadDocuments(id, formData) {
    const response = await apiClient.request(`/api/v1/clients/${id}/documents`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },

  /**
   * Get client documents
   * @param {string|number} id - Client ID
   * @returns {Promise<Array>} Client documents
   */
  async getDocuments(id) {
    return apiClient.getJSON(`/api/v1/clients/${id}/documents`);
  },

  /**
   * Export clients data
   * @param {Object} filters - Export filters
   * @param {string} format - Export format (csv, excel, etc.)
   * @returns {Promise<Blob>} File download
   */
  async exportData(filters = {}, format = 'csv') {
    const searchParams = new URLSearchParams({ ...filters, format }).toString();
    const response = await apiClient.get(`/api/v1/clients/export?${searchParams}`);
    return response.blob();
  },

  /**
   * Get client activity feed
   * @param {string|number} id - Client ID
   * @param {Object} params - Query parameters for pagination
   * @returns {Promise<Object>} Activity feed with pagination
   */
  async getActivityFeed(id, params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/clients/${id}/activity${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  }
};

export default clientsService;