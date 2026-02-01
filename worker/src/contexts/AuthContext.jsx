import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user and token
    const storedUser = localStorage.getItem('worker_user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    } else {
      // Clear incomplete auth state
      localStorage.removeItem('worker_user');
      localStorage.removeItem('token');
    }
    setLoading(false);
  }, []);

  const login = async (email) => {
    try {
      const res = await fetch('/api/v1/auth/worker/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
        localStorage.setItem('worker_user', JSON.stringify(data.data));
        localStorage.setItem('token', data.token);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('worker_user');
    localStorage.removeItem('token');
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/v1/candidates/${user.id}`);
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
        localStorage.setItem('worker_user', JSON.stringify(data.data));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
