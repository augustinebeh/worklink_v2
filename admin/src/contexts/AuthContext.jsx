import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

      if (!token || token === 'demo-admin-token') {
        // No valid token, user needs to log in
        setLoading(false);
        return;
      }

      // If we have both token and user, trust them initially
      if (storedUser) {
        setUser(storedUser);
        setLoading(false);
        
        // Verify in background (don't block UI)
        authService.verifyToken()
          .then(response => {
            if (response.success && (response.data || response.user)) {
              const userData = response.data || response.user;
              setUser(userData);
            }
          })
          .catch(() => {
            // Don't clear auth - user is already using the app
          });
        
        return;
      }

      // No stored user, try to verify token
      const response = await authService.verifyToken();

      if (response.success && (response.data || response.user)) {
        const userData = response.data || response.user;
        setUser(userData);
      } else {
        // Token is invalid, clear auth data
        authService.clearLocalAuth();
      }
    } catch (error) {
      // Only clear auth if it's a definite auth failure (401, 403)
      if (error.status === 401 || error.status === 403) {
        authService.clearLocalAuth();
        setUser(null);
      } else {
        // For network errors or other issues, keep existing auth
        const storedUser = authService.getCurrentUser();
        if (storedUser) {
          setUser(storedUser);
        }
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

      if (response.success && response.data) {
        setUser(response.data);
        return { success: true };
      } else {
        const errorMsg = response.error || 'Login failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      // Login failed
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

      // Navigate to login
      navigate('/login');
    } catch (error) {
      // Logout error
      // Still clear local state even if API call fails
      setUser(null);
      setError(null);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update user data in context
   */
  const updateUser = (userData) => {
    setUser(userData);
    // Also update in localStorage
    if (userData) {
      localStorage.setItem('admin_user', JSON.stringify(userData));
    }
  };

  const hasRole = useCallback((role) => {
    return user?.role === role;
  }, [user]);

  const hasPermission = useCallback((permission) => {
    // Admin has all permissions
    if (user?.role === 'admin') return true;
    return false;
  }, [user]);

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    hasRole,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
