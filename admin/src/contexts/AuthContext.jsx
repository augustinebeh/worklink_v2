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

      console.log('🔍 Auth init - token exists:', !!token);
      console.log('🔍 Auth init - stored user exists:', !!storedUser);

      if (!token || token === 'demo-admin-token') {
        // No valid token, user needs to log in
        console.log('⚠️ No valid token found');
        setLoading(false);
        return;
      }

      // If we have both token and user, trust them initially
      if (storedUser) {
        console.log('✅ Using stored user data:', storedUser.email);
        setUser(storedUser);
        setLoading(false);
        
        // Verify in background (don't block UI)
        authService.verifyToken()
          .then(response => {
            if (response.success && (response.data || response.user)) {
              const userData = response.data || response.user;
              setUser(userData);
              console.log('✅ Token verified with backend:', userData.email);
            }
          })
          .catch(error => {
            console.warn('⚠️ Background token verification failed:', error.message);
            // Don't clear auth - user is already using the app
          });
        
        return;
      }

      // No stored user, try to verify token
      console.log('🔄 Verifying token with backend...');
      const response = await authService.verifyToken();

      if (response.success && (response.data || response.user)) {
        const userData = response.data || response.user;
        setUser(userData);
        console.log('✅ Authentication verified:', userData.email);
      } else {
        // Token is invalid, clear auth data
        console.log('❌ Token verification failed - clearing auth');
        authService.clearLocalAuth();
      }
    } catch (error) {
      console.error('❌ Auth initialization failed:', error.message);

      // Only clear auth if it's a definite auth failure (401, 403)
      if (error.status === 401 || error.status === 403) {
        console.log('🔴 Auth error - clearing credentials');
        authService.clearLocalAuth();
        setUser(null);
      } else {
        // For network errors or other issues, keep existing auth
        console.warn('⚠️ Non-auth error during init - keeping existing session');
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
        console.log('✅ Login successful:', response.data.email);
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

      console.log('✅ Logged out successfully');

      // Navigate to login
      navigate('/login');
    } catch (error) {
      console.error('❌ Logout error:', error.message);
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

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
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
