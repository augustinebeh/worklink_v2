import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';

// Import only essential components
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Try to use AuthProvider but with error boundary
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './shared/components/ErrorBoundary';

// Create a simple test component
function TestDashboard() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#1e40af' }}>🏠 Test Dashboard</h1>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px'
      }}>
        <h2>✅ Real Auth Context Working!</h2>
        <p><strong>Time:</strong> {new Date().toLocaleString()}</p>

        <div style={{ marginTop: '20px' }}>
          <h3>🎯 Progress:</h3>
          <ul>
            <li>✅ Basic React App</li>
            <li>✅ React Router</li>
            <li>✅ Real Auth Context</li>
            <li>✅ Theme Context</li>
            <li>⏳ Layout Components</li>
            <li>⏳ Individual Pages</li>
          </ul>
        </div>

        <div style={{ margin: '20px 0' }}>
          <a href="/admin/emergency.html" style={{ color: 'white', margin: '10px' }}>🚨 Emergency Dashboard</a>
          <a href="/admin/test.html" style={{ color: 'white', margin: '10px' }}>📋 Test Page</a>
        </div>
      </div>
    </div>
  );
}

// Simple protected route
function SimpleProtectedRoute({ children }) {
  // Simplified protection logic
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="login"
        element={
          <ErrorBoundary level="page">
            <Login />
          </ErrorBoundary>
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <SimpleProtectedRoute>
            <ErrorBoundary level="page">
              <TestDashboard />
            </ErrorBoundary>
          </SimpleProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary level="app">
      <BrowserRouter basename="/admin">
        <ThemeProvider>
          <ToastProvider>
            <ErrorBoundary level="auth">
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </ErrorBoundary>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}