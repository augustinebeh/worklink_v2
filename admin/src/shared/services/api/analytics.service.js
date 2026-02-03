/**
 * Analytics API Service
 * Handles all analytics and dashboard data operations
 */

import apiClient from './ApiClient.js';

export const analyticsService = {
  /**
   * Get dashboard analytics data
   * @param {Object} params - Date range and filters
   * @returns {Promise<Object>} Dashboard analytics
   */
  async getDashboard(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/analytics/dashboard${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get financial dashboard data
   * @param {Object} params - Date range and filters
   * @returns {Promise<Object>} Financial analytics
   */
  async getFinancialDashboard(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/analytics/financial/dashboard${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get candidates analytics
   * @param {Object} params - Date range and filters
   * @returns {Promise<Object>} Candidate metrics and trends
   */
  async getCandidates(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/analytics/candidates${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get jobs analytics
   * @param {Object} params - Date range and filters
   * @returns {Promise<Object>} Job metrics and trends
   */
  async getJobs(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/analytics/jobs${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get clients analytics
   * @param {Object} params - Date range and filters
   * @returns {Promise<Object>} Client metrics and trends
   */
  async getClients(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/analytics/clients${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get performance metrics
   * @param {string} type - Type of performance metrics (consultant, team, platform, etc.)
   * @param {Object} params - Date range and filters
   * @returns {Promise<Object>} Performance data
   */
  async getPerformance(type, params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/analytics/performance/${type}${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get real-time metrics
   * @returns {Promise<Object>} Real-time dashboard data
   */
  async getRealTimeMetrics() {
    return apiClient.getJSON('/api/v1/analytics/realtime');
  },

  /**
   * Get retention analytics
   * @param {Object} params - Date range and filters
   * @returns {Promise<Object>} Retention metrics
   */
  async getRetention(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/analytics/retention${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get revenue analytics
   * @param {Object} params - Date range and filters
   * @returns {Promise<Object>} Revenue breakdown and trends
   */
  async getRevenue(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/analytics/revenue${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get conversion funnel data
   * @param {Object} params - Date range and filters
   * @returns {Promise<Object>} Conversion funnel metrics
   */
  async getConversionFunnel(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/analytics/funnel${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get market trends and insights
   * @param {Object} params - Date range and filters
   * @returns {Promise<Object>} Market analysis data
   */
  async getMarketTrends(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/analytics/market-trends${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get user engagement metrics
   * @param {Object} params - Date range and filters
   * @returns {Promise<Object>} User engagement data
   */
  async getEngagement(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/analytics/engagement${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get custom report data
   * @param {string} reportId - Report configuration ID
   * @param {Object} params - Report parameters
   * @returns {Promise<Object>} Custom report data
   */
  async getCustomReport(reportId, params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/analytics/reports/${reportId}${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Create custom report
   * @param {Object} reportConfig - Report configuration
   * @returns {Promise<Object>} Created report configuration
   */
  async createCustomReport(reportConfig) {
    return apiClient.postJSON('/api/v1/analytics/reports', reportConfig);
  },

  /**
   * Export analytics data
   * @param {string} type - Type of analytics to export
   * @param {Object} params - Export parameters
   * @param {string} format - Export format
   * @returns {Promise<Blob>} File download
   */
  async exportData(type, params = {}, format = 'csv') {
    const searchParams = new URLSearchParams({ ...params, format }).toString();
    const response = await apiClient.get(`/api/v1/analytics/${type}/export?${searchParams}`);
    return response.blob();
  },

  /**
   * Get gamification analytics
   * @param {Object} params - Date range and filters
   * @returns {Promise<Object>} Gamification metrics
   */
  async getGamification(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/analytics/gamification${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get AI performance metrics
   * @param {Object} params - Date range and filters
   * @returns {Promise<Object>} AI system performance data
   */
  async getAIPerformance(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/analytics/ai-performance${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get system health metrics
   * @returns {Promise<Object>} System health and status
   */
  async getSystemHealth() {
    return apiClient.getJSON('/api/v1/analytics/system-health');
  }
};

export default analyticsService;