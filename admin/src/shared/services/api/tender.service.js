/**
 * Tender API Service
 * Handles tender monitoring and bidding operations
 */

import apiClient from './ApiClient.js';

export const tenderService = {
  /**
   * Get all tenders
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise<Object>} Tenders data
   */
  async getAll(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/tenders${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get a single tender by ID
   * @param {string|number} id - Tender ID
   * @returns {Promise<Object>} Tender data
   */
  async getById(id) {
    return apiClient.getJSON(`/api/v1/tenders/${id}`);
  },

  /**
   * Create a new tender entry
   * @param {Object} tenderData - Tender data
   * @returns {Promise<Object>} Created tender
   */
  async create(tenderData) {
    return apiClient.postJSON('/api/v1/tenders', tenderData);
  },

  /**
   * Update a tender
   * @param {string|number} id - Tender ID
   * @param {Object} tenderData - Updated tender data
   * @returns {Promise<Object>} Updated tender
   */
  async update(id, tenderData) {
    return apiClient.putJSON(`/api/v1/tenders/${id}`, tenderData);
  },

  /**
   * Delete a tender
   * @param {string|number} id - Tender ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async delete(id) {
    return apiClient.deleteJSON(`/api/v1/tenders/${id}`);
  },

  /**
   * Get tender monitor data (GeBIZ scraping results)
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Monitor data
   */
  async getMonitorData(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/tender-monitor${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Scrape GeBIZ for new tenders
   * @param {Object} keywords - Keywords to search for
   * @returns {Promise<Object>} Scraping result
   */
  async scrapeGeBIZ(keywords = []) {
    return apiClient.postJSON('/api/v1/tender-monitor/scrape', { keywords });
  },

  /**
   * Add tender to watchlist
   * @param {string|number} tenderId - Tender ID
   * @returns {Promise<Object>} Watchlist update result
   */
  async addToWatchlist(tenderId) {
    return apiClient.postJSON(`/api/v1/tenders/${tenderId}/watchlist`, {});
  },

  /**
   * Remove tender from watchlist
   * @param {string|number} tenderId - Tender ID
   * @returns {Promise<Object>} Watchlist update result
   */
  async removeFromWatchlist(tenderId) {
    return apiClient.deleteJSON(`/api/v1/tenders/${tenderId}/watchlist`);
  },

  /**
   * Submit bid for tender
   * @param {string|number} tenderId - Tender ID
   * @param {Object} bidData - Bid information
   * @returns {Promise<Object>} Bid submission result
   */
  async submitBid(tenderId, bidData) {
    return apiClient.postJSON(`/api/v1/tenders/${tenderId}/bids`, bidData);
  },

  /**
   * Get tender analytics
   * @param {Object} filters - Date range and other filters
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(filters = {}) {
    const searchParams = new URLSearchParams(filters).toString();
    const url = `/api/v1/tenders/analytics${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get keyword alerts
   * @returns {Promise<Object>} Keyword alert configuration
   */
  async getKeywordAlerts() {
    return apiClient.getJSON('/api/v1/tender-monitor/keywords');
  },

  /**
   * Update keyword alerts
   * @param {Array} keywords - Array of keywords to monitor
   * @returns {Promise<Object>} Update result
   */
  async updateKeywordAlerts(keywords) {
    return apiClient.putJSON('/api/v1/tender-monitor/keywords', { keywords });
  },

  /**
   * Get tender statistics overview
   * @returns {Promise<Object>} Statistics data including counts by status, total value, win rate
   */
  async getStats() {
    return apiClient.getJSON('/api/v1/tenders/stats/overview');
  },

  /**
   * Get BPO acquisition recommendations
   * @returns {Promise<Object>} Recommendations data including portals, tools, keywords
   */
  async getRecommendations() {
    return apiClient.getJSON('/api/v1/tenders/recommendations/acquisition');
  }
};

export default tenderService;
