/**
 * Tender Scanner Service
 * Live feed, alerts, keyword management, and scraper controls
 */

import { apiClient as client } from './ApiClient.js';

const scannerService = {
  // Feed
  async getFeed(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/v1/scanner/feed${queryString ? `?${queryString}` : ''}`;
    const response = await client.get(url);
    return response.json();
  },

  async dismissTender(id) {
    const response = await client.post(`/api/v1/scanner/feed/${id}/dismiss`);
    return response.json();
  },

  async getFeedStats() {
    const response = await client.get('/api/v1/scanner/feed/stats');
    return response.json();
  },

  // Alerts
  async getAlerts() {
    const response = await client.get('/api/v1/scanner/alerts');
    return response.json();
  },

  async createAlert(data) {
    const response = await client.post('/api/v1/scanner/alerts', data);
    return response.json();
  },

  async updateAlert(id, data) {
    const response = await client.patch(`/api/v1/scanner/alerts/${id}`, data);
    return response.json();
  },

  async deleteAlert(id) {
    const response = await client.delete(`/api/v1/scanner/alerts/${id}`);
    return response.json();
  },

  async getAlertMatches(id) {
    const response = await client.get(`/api/v1/scanner/alerts/${id}/matches`);
    return response.json();
  },

  // Matches
  async getUnreadMatches() {
    const response = await client.get('/api/v1/scanner/matches/unread');
    return response.json();
  },

  async markMatchesRead(matchIds = null) {
    const response = await client.post('/api/v1/scanner/matches/mark-read', { match_ids: matchIds });
    return response.json();
  },

  // Scraper
  async getScraperStatus() {
    const response = await client.get('/api/v1/scanner/scraper/status');
    return response.json();
  },

  async getScraperHealth() {
    const response = await client.get('/api/v1/scanner/scraper/health');
    return response.json();
  },

  async triggerScrape() {
    const response = await client.post('/api/v1/scanner/scraper/trigger');
    return response.json();
  },

  async controlScheduler(action) {
    const response = await client.post(`/api/v1/scanner/scraper/scheduler/${action}`);
    return response.json();
  },

  async getScraperLogs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/v1/scanner/scraper/logs${queryString ? `?${queryString}` : ''}`;
    const response = await client.get(url);
    return response.json();
  },

  // Dashboard
  async getDashboard() {
    const response = await client.get('/api/v1/scanner/dashboard');
    return response.json();
  }
};

export default scannerService;
