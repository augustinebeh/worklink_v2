/**
 * Chat API Service
 * Handles all chat and messaging operations
 */

import apiClient from './ApiClient.js';

export const chatService = {
  /**
   * Get all conversations for admin
   * @returns {Promise<Object>} List of conversations
   */
  async getConversations() {
    return apiClient.getJSON('/api/v1/chat/admin/conversations');
  },

  /**
   * Get candidates for chat
   * @returns {Promise<Object>} List of chat-enabled candidates
   */
  async getCandidates() {
    return apiClient.getJSON('/api/v1/chat/admin/candidates');
  },

  /**
   * Get chat templates
   * @returns {Promise<Object>} List of message templates
   */
  async getTemplates() {
    return apiClient.getJSON('/api/v1/chat/templates');
  },

  /**
   * Get messages for a conversation
   * @param {string} candidateId - Candidate ID
   * @returns {Promise<Object>} Messages and conversation data
   */
  async getMessages(candidateId) {
    return apiClient.getJSON(`/api/v1/chat/${candidateId}/messages`);
  },

  /**
   * Mark conversation as read
   * @param {string} candidateId - Candidate ID
   * @returns {Promise<Object>} Success status
   */
  async markAsRead(candidateId) {
    return apiClient.postJSON(`/api/v1/chat/admin/${candidateId}/read`);
  },

  /**
   * Send a message
   * @param {string} candidateId - Candidate ID
   * @param {Object} messageData - Message content and metadata
   * @returns {Promise<Object>} Sent message data
   */
  async sendMessage(candidateId, messageData) {
    return apiClient.postJSON(`/api/v1/chat/admin/${candidateId}/messages`, messageData);
  },

  /**
   * Update conversation status
   * @param {string} candidateId - Candidate ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated status
   */
  async updateStatus(candidateId, status) {
    return apiClient.putJSON(`/api/v1/conversations/${candidateId}/status`, { status });
  },

  /**
   * Update conversation priority
   * @param {string} candidateId - Candidate ID
   * @param {string} priority - New priority level
   * @returns {Promise<Object>} Updated priority
   */
  async updatePriority(candidateId, priority) {
    return apiClient.putJSON(`/api/v1/conversations/${candidateId}/priority`, { priority });
  },

  /**
   * Resolve a conversation
   * @param {string} candidateId - Candidate ID
   * @returns {Promise<Object>} Resolution status
   */
  async resolveConversation(candidateId) {
    return apiClient.postJSON(`/api/v1/conversations/${candidateId}/resolve`);
  },

  /**
   * Upload attachments
   * @param {FormData} formData - File upload data
   * @returns {Promise<Object>} Upload results
   */
  async uploadAttachments(formData) {
    // Use fetch directly for FormData uploads
    const token = sessionStorage.getItem('admin_token');
    const response = await fetch('/api/v1/chat/attachments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    return response.json();
  },
};

export default chatService;