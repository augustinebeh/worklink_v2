import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Frontend-only auth: Auto-login for development
    const mockUser = {
      id: 'admin-1',
      email: 'admin@worklink.com',
      name: 'Admin User',
      role: 'admin',
      permissions: ['all']
    };

    // Simulate auth check delay
    setTimeout(() => {
      setUser(mockUser);
      sessionStorage.setItem('admin_user', JSON.stringify(mockUser));
      sessionStorage.setItem('admin_token', 'demo-admin-token');
      setLoading(false);
      console.log('Frontend-only auth: Auto-logged in as admin');
    }, 500);
  }, []);

  const login = async (email, password) => {
    try {
      // Frontend-only mock login
      await new Promise(resolve => setTimeout(resolve, 500));

      if (email && password) {
        const mockUser = {
          id: 'admin-1',
          email,
          name: 'Admin User',
          role: 'admin',
          permissions: ['all']
        };

        setUser(mockUser);
        sessionStorage.setItem('admin_user', JSON.stringify(mockUser));
        sessionStorage.setItem('admin_token', 'demo-admin-token');
        console.log('Frontend-only login successful:', email);
        return { success: true };
      }
      return { success: false, error: 'Invalid credentials' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_token');
    navigate('login');
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
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
