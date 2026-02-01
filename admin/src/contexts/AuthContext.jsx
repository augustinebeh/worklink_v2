import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session
    const storedUser = sessionStorage.getItem('admin_user');
    const storedToken = sessionStorage.getItem('admin_token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    } else {
      // Clear incomplete auth state
      sessionStorage.removeItem('admin_user');
      sessionStorage.removeItem('admin_token');
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, type: 'admin' }),
      });
      const data = await res.json();

      if (data.success) {
        setUser(data.data);
        sessionStorage.setItem('admin_user', JSON.stringify(data.data));
        sessionStorage.setItem('admin_token', data.token);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_token');
    navigate('/login');
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
