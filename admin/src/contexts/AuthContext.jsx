import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../shared/services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * Initialize authentication by checking for existing valid token
   */
  const initializeAuth = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if we have a stored token
      const storedUser = authService.getCurrentUser();
      const token = authService.getToken();

      if (!token || token === 'demo-admin-token' || !storedUser) {
        // No valid token, user needs to log in
        setLoading(false);
        return;
      }

      // Verify token with backend
      const response = await authService.verifyToken();

      if (response.success && response.user) {
        setUser(response.user);
        console.log('✅ Authentication verified:', response.user.email);
      } else {
        // Token is invalid, clear auth data
        authService.clearLocalAuth();
        console.log('❌ Token verification failed');
      }
    } catch (error) {
      console.error('❌ Auth initialization failed:', error.message);

      // Clear invalid auth data
      authService.clearLocalAuth();

      // Don't show error for common auth failures during initialization
      if (error.status !== 401 && error.status !== 403) {
        setError('Failed to verify authentication. Please log in again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login with email and password
   */
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.login(email, password);

      if (response.success && response.user) {
        setUser(response.user);
        console.log('✅ Login successful:', response.user.email);
        return { success: true };
      } else {
        const errorMsg = response.error || 'Login failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      const errorMsg = error.message || 'Login failed. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout current user
   */
  const logout = async () => {
    try {
      setLoading(true);

      // Call logout API (this clears server-side session)
      await authService.logout();

      setUser(null);
      setError(null);
      console.log('✅ Logout successful');

      navigate('/login', { replace: true });
    } catch (error) {
      console.error('❌ Logout error:', error.message);

      // Even if logout API fails, clear local data and redirect
      setUser(null);
      setError(null);
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh authentication token
   */
  const refreshAuth = async () => {
    try {
      const response = await authService.refreshToken();

      if (response.success && response.user) {
        setUser(response.user);
        return true;
      } else {
        await logout();
        return false;
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error.message);
      await logout();
      return false;
    }
  };

  /**
   * Update user profile
   */
  const updateProfile = async (profileData) => {
    try {
      const response = await authService.updateProfile(profileData);

      if (response.success && response.user) {
        setUser(response.user);
        return { success: true };
      } else {
        const errorMsg = response.error || 'Profile update failed';
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      console.error('❌ Profile update failed:', error.message);
      return { success: false, error: error.message };
    }
  };

  /**
   * Clear authentication error
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;

    // Admin users have all permissions
    if (user.permissions.includes('all') || user.role === 'admin') return true;

    // Check specific permission
    return user.permissions.includes(permission);
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasRole = (...roles) => {
    if (!user || !user.role) return false;
    return roles.includes(user.role);
  };

  /**
   * Check if user can access a specific resource
   */
  const canAccess = (resource, action = 'read') => {
    if (!user) return false;

    // Admin users can access everything
    if (user.role === 'admin') return true;

    // Check specific permission pattern: resource:action
    return hasPermission(`${resource}:${action}`) || hasPermission(resource);
  };

  const value = {
    // State
    user,
    loading,
    error,
    isAuthenticated: !!user,

    // Actions
    login,
    logout,
    refreshAuth,
    updateProfile,
    clearError,

    // Permission checking
    hasPermission,
    hasRole,
    canAccess,

    // Convenience getters
    isAdmin: user?.role === 'admin',
    userId: user?.id,
    userEmail: user?.email,
    userName: user?.name,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
