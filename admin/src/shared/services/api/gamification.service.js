/**
 * Gamification API Service
 * Handles all gamification-related API operations
 */

import apiClient from './ApiClient.js';

export const gamificationService = {
  /**
   * Get all achievements
   * @returns {Promise<Object>} Achievements data
   */
  async getAchievements() {
    return apiClient.getJSON('/api/v1/gamification/achievements');
  },

  /**
   * Create a new achievement
   * @param {Object} achievementData - Achievement data
   * @returns {Promise<Object>} Created achievement
   */
  async createAchievement(achievementData) {
    return apiClient.postJSON('/api/v1/gamification/achievements', achievementData);
  },

  /**
   * Update an achievement
   * @param {string|number} id - Achievement ID
   * @param {Object} achievementData - Updated achievement data
   * @returns {Promise<Object>} Updated achievement
   */
  async updateAchievement(id, achievementData) {
    return apiClient.putJSON(`/api/v1/gamification/achievements/${id}`, achievementData);
  },

  /**
   * Delete an achievement
   * @param {string|number} id - Achievement ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteAchievement(id) {
    return apiClient.deleteJSON(`/api/v1/gamification/achievements/${id}`);
  },

  /**
   * Get all quests
   * @returns {Promise<Object>} Quests data
   */
  async getQuests() {
    return apiClient.getJSON('/api/v1/gamification/quests');
  },

  /**
   * Create a new quest
   * @param {Object} questData - Quest data
   * @returns {Promise<Object>} Created quest
   */
  async createQuest(questData) {
    return apiClient.postJSON('/api/v1/gamification/quests', questData);
  },

  /**
   * Update a quest
   * @param {string|number} id - Quest ID
   * @param {Object} questData - Updated quest data
   * @returns {Promise<Object>} Updated quest
   */
  async updateQuest(id, questData) {
    return apiClient.putJSON(`/api/v1/gamification/quests/${id}`, questData);
  },

  /**
   * Delete a quest
   * @param {string|number} id - Quest ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteQuest(id) {
    return apiClient.deleteJSON(`/api/v1/gamification/quests/${id}`);
  },

  /**
   * Get leaderboard
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Leaderboard data
   */
  async getLeaderboard(params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    const url = `/api/v1/gamification/leaderboard${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get candidate's gamification stats
   * @param {string|number} candidateId - Candidate ID
   * @returns {Promise<Object>} Candidate stats
   */
  async getCandidateStats(candidateId) {
    return apiClient.getJSON(`/api/v1/gamification/candidates/${candidateId}/stats`);
  },

  /**
   * Award achievement to candidate
   * @param {string|number} candidateId - Candidate ID
   * @param {string|number} achievementId - Achievement ID
   * @returns {Promise<Object>} Award result
   */
  async awardAchievement(candidateId, achievementId) {
    return apiClient.postJSON(`/api/v1/gamification/candidates/${candidateId}/achievements`, {
      achievementId
    });
  },

  /**
   * Add XP to candidate
   * @param {string|number} candidateId - Candidate ID
   * @param {number} xp - XP amount to add
   * @param {string} reason - Reason for XP award
   * @returns {Promise<Object>} Updated stats
   */
  async addXP(candidateId, xp, reason) {
    return apiClient.postJSON(`/api/v1/gamification/candidates/${candidateId}/xp`, {
      xp,
      reason
    });
  },

  /**
   * Get gamification analytics
   * @param {Object} filters - Date range and other filters
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(filters = {}) {
    const searchParams = new URLSearchParams(filters).toString();
    const url = `/api/v1/gamification/analytics${searchParams ? `?${searchParams}` : ''}`;
    return apiClient.getJSON(url);
  },

  /**
   * Get tier information
   * @returns {Promise<Object>} Tier data
   */
  async getTiers() {
    return apiClient.getJSON('/api/v1/gamification/tiers');
  },

  /**
   * Update tier configuration
   * @param {string|number} tierId - Tier ID
   * @param {Object} tierData - Updated tier data
   * @returns {Promise<Object>} Updated tier
   */
  async updateTier(tierId, tierData) {
    return apiClient.putJSON(`/api/v1/gamification/tiers/${tierId}`, tierData);
  }
};

export default gamificationService;
