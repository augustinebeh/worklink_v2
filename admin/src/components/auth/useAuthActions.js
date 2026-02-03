/**
 * Authentication Action Hooks
 * Provides convenient hooks for common authentication actions
 */

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../shared/services/api';

/**
 * Hook for handling login form with state management
 */
export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();

  const handleLogin = async (email, password) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await login(email, password);

      if (!result.success) {
        setError(result.error || 'Login failed');
        return false;
      }

      return true;
    } catch (error) {
      setError(error.message || 'Login failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    handleLogin,
    isLoading,
    error,
    clearError
  };
}

/**
 * Hook for handling logout with confirmation
 */
export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async (skipConfirmation = false) => {
    if (!skipConfirmation) {
      const confirmed = window.confirm('Are you sure you want to log out?');
      if (!confirmed) return false;
    }

    setIsLoading(true);
    try {
      await logout();
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, we should still clear local state
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleLogout,
    isLoading
  };
}

/**
 * Hook for handling password changes
 */
export function usePasswordChange() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const changePassword = async (currentPassword, newPassword) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await authService.changePassword(currentPassword, newPassword);

      if (result.success) {
        setSuccess(true);
        return true;
      } else {
        setError(result.error || 'Failed to change password');
        return false;
      }
    } catch (error) {
      setError(error.message || 'Failed to change password');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearState = () => {
    setError(null);
    setSuccess(false);
  };

  return {
    changePassword,
    isLoading,
    error,
    success,
    clearState
  };
}

/**
 * Hook for handling profile updates
 */
export function useProfileUpdate() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const { updateProfile } = useAuth();

  const handleUpdateProfile = async (profileData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateProfile(profileData);

      if (result.success) {
        setSuccess(true);
        return true;
      } else {
        setError(result.error || 'Failed to update profile');
        return false;
      }
    } catch (error) {
      setError(error.message || 'Failed to update profile');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearState = () => {
    setError(null);
    setSuccess(false);
  };

  return {
    handleUpdateProfile,
    isLoading,
    error,
    success,
    clearState
  };
}

/**
 * Hook for handling password reset requests
 */
export function usePasswordReset() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const requestReset = async (email) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await authService.requestPasswordReset(email);

      if (result.success) {
        setSuccess(true);
        return true;
      } else {
        setError(result.error || 'Failed to send reset email');
        return false;
      }
    } catch (error) {
      setError(error.message || 'Failed to send reset email');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (token, newPassword) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.resetPassword(token, newPassword);

      if (result.success) {
        return true;
      } else {
        setError(result.error || 'Failed to reset password');
        return false;
      }
    } catch (error) {
      setError(error.message || 'Failed to reset password');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearState = () => {
    setError(null);
    setSuccess(false);
  };

  return {
    requestReset,
    resetPassword,
    isLoading,
    error,
    success,
    clearState
  };
}

/**
 * Hook for handling 2FA operations
 */
export function useTwoFactor() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [setupData, setSetupData] = useState(null);

  const enableTwoFactor = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.enableTwoFactor();

      if (result.success) {
        setSetupData(result.data);
        return result.data;
      } else {
        setError(result.error || 'Failed to enable 2FA');
        return null;
      }
    } catch (error) {
      setError(error.message || 'Failed to enable 2FA');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTwoFactor = async (code) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.verifyTwoFactor(code);

      if (result.success) {
        setSetupData(null);
        return true;
      } else {
        setError(result.error || 'Invalid verification code');
        return false;
      }
    } catch (error) {
      setError(error.message || 'Verification failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const disableTwoFactor = async (code) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.disableTwoFactor(code);

      if (result.success) {
        return true;
      } else {
        setError(result.error || 'Failed to disable 2FA');
        return false;
      }
    } catch (error) {
      setError(error.message || 'Failed to disable 2FA');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearState = () => {
    setError(null);
    setSetupData(null);
  };

  return {
    enableTwoFactor,
    verifyTwoFactor,
    disableTwoFactor,
    isLoading,
    error,
    setupData,
    clearState
  };
}

/**
 * Hook for session management
 */
export function useSessionManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);

  const loadSessions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.getSessions();
      setSessions(result.sessions || []);
      return true;
    } catch (error) {
      setError(error.message || 'Failed to load sessions');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const revokeSession = async (sessionId) => {
    try {
      const result = await authService.revokeSession(sessionId);

      if (result.success) {
        // Remove from local list
        setSessions(prev => prev.filter(session => session.id !== sessionId));
        return true;
      } else {
        setError(result.error || 'Failed to revoke session');
        return false;
      }
    } catch (error) {
      setError(error.message || 'Failed to revoke session');
      return false;
    }
  };

  const revokeAllSessions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.revokeAllSessions();

      if (result.success) {
        setSessions([]);
        return true;
      } else {
        setError(result.error || 'Failed to revoke sessions');
        return false;
      }
    } catch (error) {
      setError(error.message || 'Failed to revoke sessions');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    loadSessions,
    revokeSession,
    revokeAllSessions,
    sessions,
    isLoading,
    error
  };
}