/**
 * Authentication API Service
 * Handles all authentication-related operations
 */

import apiClient from './ApiClient.js';

export const authService = {
  /**
   * Login user with credentials
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Authentication result with token and user data
   */
  async login(email, password) {
    const response = await apiClient.postJSON('/api/v1/auth/login', {
      email,
      password,
      type: 'admin'  // Required for admin authentication
    });

    // Store token and user data if login successful
    if (response.success && response.token) {
      sessionStorage.setItem('admin_token', response.token);
      sessionStorage.setItem('admin_user', JSON.stringify(response.data));
      // Also store in localStorage for persistence
      localStorage.setItem('admin_token', response.token);
      localStorage.setItem('admin_user', JSON.stringify(response.data));
    }

    return response;
  },

  /**
   * Logout current user
   * @returns {Promise<Object>} Logout confirmation
   */
  async logout() {
    try {
      // Call logout endpoint to invalidate token on server
      const response = await apiClient.postJSON('/api/v1/auth/logout');
      return response;
    } catch (error) {
      console.warn('Logout API call failed:', error.message);
      // Continue with local cleanup even if API call fails
      return { success: true };
    } finally {
      // Always clear local storage
      this.clearLocalAuth();
    }
  },

  /**
   * Clear local authentication data
   */
  clearLocalAuth() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_token'); // Also clear from sessionStorage if used
    sessionStorage.removeItem('admin_user');
  },

  /**
   * Refresh authentication token
   * @returns {Promise<Object>} New token data
   */
  async refreshToken() {
    const currentToken = sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token');
    if (!currentToken || currentToken === 'demo-admin-token') {
      throw new Error('No valid token to refresh');
    }

    const response = await apiClient.postJSON('/api/v1/auth/refresh', {
      refreshToken: currentToken
    });

    if (response.success && response.token) {
      sessionStorage.setItem('admin_token', response.token);
      localStorage.setItem('admin_token', response.token);
      if (response.user) {
        sessionStorage.setItem('admin_user', JSON.stringify(response.user));
        localStorage.setItem('admin_user', JSON.stringify(response.user));
      }
    }

    return response;
  },

  /**
   * Verify current token validity
   * @returns {Promise<Object>} Verification result with user data
   */
  async verifyToken() {
    const token = sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token');
    if (!token || token === 'demo-admin-token') {
      throw new Error('No token to verify');
    }

    const response = await apiClient.getJSON('/api/v1/auth/verify');

    // Update stored user data if provided
    if (response.success && response.user) {
      sessionStorage.setItem('admin_user', JSON.stringify(response.user));
      localStorage.setItem('admin_user', JSON.stringify(response.user));
    }

    return response;
  },

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<Object>} Password reset request result
   */
  async requestPasswordReset(email) {
    return apiClient.postJSON('/api/v1/auth/password-reset/request', { email });
  },

  /**
   * Reset password with token
   * @param {string} token - Reset token from email
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Password reset result
   */
  async resetPassword(token, newPassword) {
    return apiClient.postJSON('/api/v1/auth/password-reset/confirm', {
      token,
      newPassword
    });
  },

  /**
   * Change current user's password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Password change result
   */
  async changePassword(currentPassword, newPassword) {
    return apiClient.postJSON('/api/v1/auth/change-password', {
      currentPassword,
      newPassword
    });
  },

  /**
   * Update user profile
   * @param {Object} profileData - Updated profile information
   * @returns {Promise<Object>} Updated user data
   */
  async updateProfile(profileData) {
    const response = await apiClient.putJSON('/api/v1/auth/profile', profileData);

    if (response.success && response.user) {
      sessionStorage.setItem('admin_user', JSON.stringify(response.user));
      localStorage.setItem('admin_user', JSON.stringify(response.user));
    }

    return response;
  },

  /**
   * Get current user profile
   * @returns {Promise<Object>} User profile data
   */
  async getProfile() {
    const response = await apiClient.getJSON('/api/v1/auth/profile');

    if (response.user) {
      sessionStorage.setItem('admin_user', JSON.stringify(response.user));
      localStorage.setItem('admin_user', JSON.stringify(response.user));
    }

    return response;
  },

  /**
   * Enable two-factor authentication
   * @returns {Promise<Object>} 2FA setup data (QR code, backup codes, etc.)
   */
  async enableTwoFactor() {
    return apiClient.postJSON('/api/v1/auth/2fa/enable');
  },

  /**
   * Verify two-factor authentication setup
   * @param {string} code - 2FA verification code
   * @returns {Promise<Object>} 2FA verification result
   */
  async verifyTwoFactor(code) {
    return apiClient.postJSON('/api/v1/auth/2fa/verify', { code });
  },

  /**
   * Disable two-factor authentication
   * @param {string} code - 2FA verification code
   * @returns {Promise<Object>} 2FA disable result
   */
  async disableTwoFactor(code) {
    return apiClient.postJSON('/api/v1/auth/2fa/disable', { code });
  },

  /**
   * Get user permissions
   * @returns {Promise<Object>} User permissions and roles
   */
  async getPermissions() {
    return apiClient.getJSON('/api/v1/auth/permissions');
  },

  /**
   * Get user sessions
   * @returns {Promise<Array>} Active user sessions
   */
  async getSessions() {
    return apiClient.getJSON('/api/v1/auth/sessions');
  },

  /**
   * Revoke a specific session
   * @param {string} sessionId - Session ID to revoke
   * @returns {Promise<Object>} Session revocation result
   */
  async revokeSession(sessionId) {
    return apiClient.deleteJSON(`/api/v1/auth/sessions/${sessionId}`);
  },

  /**
   * Revoke all sessions except current
   * @returns {Promise<Object>} Bulk session revocation result
   */
  async revokeAllSessions() {
    return apiClient.postJSON('/api/v1/auth/sessions/revoke-all');
  },

  /**
   * Check if user is currently authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    const token = sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token');
    const user = sessionStorage.getItem('admin_user') || localStorage.getItem('admin_user');
    return !!(token && user && token !== 'demo-admin-token');
  },

  /**
   * Get current user data from storage
   * @returns {Object|null} Current user data
   */
  getCurrentUser() {
    try {
      const userData = sessionStorage.getItem('admin_user') || localStorage.getItem('admin_user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data from storage:', error);
      // Clear corrupted data and try to recover
      this.clearLocalAuth();
      return null;
    }
  },

  /**
   * Get current auth token
   * @returns {string|null} Current authentication token
   */
  getToken() {
    return sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token');
  }
};

export default authService;