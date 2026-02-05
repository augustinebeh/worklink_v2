import React, { createContext, useContext, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Simple Auth Context without external dependencies
const AuthContext = createContext(null);

function SimpleAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (email) => {
    setLoading(true);
    // Simulate login
    setTimeout(() => {
      setUser({ email, role: 'admin' });
      setLoading(false);
    }, 1000);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Simple Dashboard component
function SimpleDashboard() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#1e40af' }}>🏠 Simple Dashboard</h1>
        <button
          onClick={logout}
          style={{
            background: '#f44336',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px'
      }}>
        <h2>✅ Auth Context Working!</h2>
        <p><strong>User:</strong> {user?.email}</p>
        <p><strong>Role:</strong> {user?.role}</p>
        <p><strong>Time:</strong> {new Date().toLocaleString()}</p>

        <div style={{ marginTop: '20px' }}>
          <h3>🎯 Progress:</h3>
          <ul>
            <li>✅ Basic React App</li>
            <li>✅ React Router</li>
            <li>✅ Auth Context</li>
            <li>⏳ Layout Components</li>
            <li>⏳ Individual Pages</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Simple Login component
function SimpleLogin() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('admin@worklink.com');

  const handleSubmit = (e) => {
    e.preventDefault();
    login(email);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        minWidth: '300px'
      }}>
        <h2 style={{ textAlign: 'center', color: '#1e40af', marginBottom: '30px' }}>
          🔐 Login Test
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: '#1e40af',
              color: 'white',
              border: 'none',
              padding: '12px',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '🔄 Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <a href="/admin/test.html" style={{ color: '#1e40af', fontSize: '14px' }}>
            📋 Test Page
          </a>
          {' | '}
          <a href="/admin/emergency.html" style={{ color: '#f44336', fontSize: '14px' }}>
            🚨 Emergency
          </a>
        </div>
      </div>
    </div>
  );
}

// Main App Routes
function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>🔄 Loading...</h2>
          <p>Authenticating user...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <SimpleLogin />}
      />
      <Route
        path="/"
        element={user ? <SimpleDashboard /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <SimpleAuthProvider>
        <AppRoutes />
      </SimpleAuthProvider>
    </BrowserRouter>
  );
}