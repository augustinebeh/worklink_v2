/**
 * Tender Pipeline Service
 * Unified 7-stage tender pipeline management
 */

import { apiClient as client } from './ApiClient.js';

const pipelineService = {
  async getTenders(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/v1/pipeline${queryString ? `?${queryString}` : ''}`;
    const response = await client.get(url);
    return response.json();
  },

  async getTenderById(id) {
    const response = await client.get(`/api/v1/pipeline/${id}`);
    return response.json();
  },

  async createTender(data) {
    const response = await client.post('/api/v1/pipeline', data);
    return response.json();
  },

  async updateTender(id, data) {
    const response = await client.patch(`/api/v1/pipeline/${id}`, data);
    return response.json();
  },

  async moveTender(id, data) {
    const response = await client.post(`/api/v1/pipeline/${id}/move`, data);
    return response.json();
  },

  async recordDecision(id, data) {
    const response = await client.post(`/api/v1/pipeline/${id}/decision`, data);
    return response.json();
  },

  async getPipelineStats() {
    const response = await client.get('/api/v1/pipeline/stats');
    return response.json();
  },

  async getClosingDeadlines(days = 7) {
    const response = await client.get(`/api/v1/pipeline/deadlines?days=${days}`);
    return response.json();
  },

  async moveRenewalToOpportunity(renewalId) {
    const response = await client.post(`/api/v1/pipeline/renewal/${renewalId}/move`);
    return response.json();
  },

  async addFromScanner(data) {
    const response = await client.post('/api/v1/pipeline/from-scanner', data);
    return response.json();
  },

  async deleteTender(id) {
    const response = await client.delete(`/api/v1/pipeline/${id}`);
    return response.json();
  }
};

export default pipelineService;
