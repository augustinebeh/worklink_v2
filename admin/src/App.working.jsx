import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './shared/components/ErrorBoundary';
import { setupGlobalErrorHandling } from './shared/hooks/useErrorHandler';
import QueryProvider from './shared/providers/QueryProvider';

// Import only the essential, working pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Candidates from './pages/Candidates';
import CandidateProfile from './pages/CandidateProfile';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Settings from './pages/Settings';
import FinancialDashboard from './pages/FinancialDashboard';
import Deployments from './pages/Deployments';
import Payments from './pages/Payments';
import Chat from './pages/Chat';
import EscalationQueue from './pages/EscalationQueue';

// Import new working pages
import Alerts from './pages/Alerts';
import AlertSettings from './pages/AlertSettings';

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
          <ProtectedRoute>
            <ErrorBoundary level="app">
              <AdminLayout />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      >
        {/* Dashboard - main entry point */}
        <Route
          index
          element={
            <ErrorBoundary level="page">
              <Dashboard />
            </ErrorBoundary>
          }
        />

        {/* Core Operations */}
        <Route
          path="candidates"
          element={
            <ErrorBoundary level="page">
              <Candidates />
            </ErrorBoundary>
          }
        />
        <Route
          path="candidates/:id"
          element={
            <ErrorBoundary level="page">
              <CandidateProfile />
            </ErrorBoundary>
          }
        />
        <Route
          path="jobs"
          element={
            <ErrorBoundary level="page">
              <Jobs />
            </ErrorBoundary>
          }
        />
        <Route
          path="jobs/:id"
          element={
            <ErrorBoundary level="page">
              <JobDetail />
            </ErrorBoundary>
          }
        />
        <Route
          path="deployments"
          element={
            <ErrorBoundary level="page">
              <Deployments />
            </ErrorBoundary>
          }
        />
        <Route
          path="payments"
          element={
            <ErrorBoundary level="page">
              <Payments />
            </ErrorBoundary>
          }
        />

        {/* Client Management */}
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />

        {/* Financial */}
        <Route path="financials" element={<FinancialDashboard />} />

        {/* Communication */}
        <Route path="chat" element={<Chat />} />
        <Route path="escalation-queue" element={<EscalationQueue />} />

        {/* Alerts System */}
        <Route
          path="alert-settings"
          element={
            <ErrorBoundary level="page">
              <AlertSettings />
            </ErrorBoundary>
          }
        />
        <Route
          path="alerts"
          element={
            <ErrorBoundary level="page">
              <Alerts />
            </ErrorBoundary>
          }
        />

        {/* Settings - Admin only */}
        <Route
          path="settings"
          element={
            <ProtectedRoute requireRole="admin">
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Emergency Routes */}
        <Route
          path="emergency"
          element={
            <div style={{padding: '20px'}}>
              <h1>🚨 Emergency Access</h1>
              <p>React portal is working! Use navigation above.</p>
              <a href="/admin/emergency.html">Backup Dashboard</a>
            </div>
          }
        />

        {/* Redirects for removed/problematic pages */}
        <Route path="analytics" element={<Navigate to="financials" replace />} />
        <Route path="bpo" element={<Navigate to="clients" replace />} />
        <Route path="gebiz-intelligence" element={<Navigate to="clients" replace />} />
        <Route path="tender-monitor" element={<Navigate to="clients" replace />} />
        <Route path="renewal-pipeline" element={<Navigate to="clients" replace />} />
        <Route path="retention-analytics" element={<Navigate to="financials" replace />} />
        <Route path="gamification" element={<Navigate to="deployments" replace />} />
        <Route path="training" element={<Navigate to="deployments" replace />} />
        <Route path="ai-sourcing" element={<Navigate to="candidates" replace />} />
        <Route path="consultant-performance" element={<Navigate to="deployments" replace />} />
        <Route path="interview-scheduling" element={<Navigate to="candidates" replace />} />
        <Route path="ml-dashboard" element={<Navigate to="financials" replace />} />
        <Route path="telegram-groups" element={<Navigate to="chat" replace />} />
        <Route path="ad-optimization" element={<Navigate to="financials" replace />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  // Setup global error handling
  React.useEffect(() => {
    setupGlobalErrorHandling();
  }, []);

  return (
    <ErrorBoundary level="app">
      <BrowserRouter basename="/admin">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <ToastProvider>
                <AppRoutes />
              </ToastProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}