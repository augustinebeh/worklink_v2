import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ToastProvider } from './components/ui/Toast';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary, { AsyncErrorBoundary } from './shared/components/ErrorBoundary';
import { setupGlobalErrorHandling } from './shared/hooks/useErrorHandler';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Candidates from './pages/Candidates';
import CandidateProfile from './pages/CandidateProfile';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import BPODashboard from './pages/BPODashboard';
import Settings from './pages/Settings';
import FinancialDashboard from './pages/FinancialDashboard';
import Deployments from './pages/Deployments';
import Payments from './pages/Payments';
import Chat from './pages/Chat';
import EscalationQueue from './pages/EscalationQueue';
import Training from './pages/Training';
import Gamification from './pages/Gamification';
import TenderMonitor from './pages/TenderMonitor';
import AIAutomation from './pages/AIAutomation';
import AISourcing from './pages/AISourcing';
import MLDashboard from './pages/MLDashboard';
import TelegramGroups from './pages/TelegramGroups';
import AdOptimization from './pages/AdOptimization';
import RetentionAnalytics from './pages/RetentionAnalytics';
import ConsultantPerformance from './pages/ConsultantPerformance';
import InterviewScheduling from './pages/InterviewScheduling';

// The ProtectedRoute is now imported from components/auth/ProtectedRoute

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
        {/* Dashboard - main entry point with guides */}
        <Route
          index
          element={
            <ErrorBoundary level="page">
              <Dashboard />
            </ErrorBoundary>
          }
        />

        {/* Operations */}
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
        
        {/* Sales & Tenders */}
        <Route path="bpo" element={<BPODashboard />} />
        <Route path="tender-monitor" element={<TenderMonitor />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        
        {/* Performance */}
        <Route path="financials" element={<FinancialDashboard />} />
        <Route path="retention-analytics" element={<RetentionAnalytics />} />
        <Route path="gamification" element={<Gamification />} />
        <Route path="training" element={<Training />} />
        
        {/* Engagement */}
        <Route path="chat" element={<Chat />} />
        <Route path="escalation-queue" element={<EscalationQueue />} />
        
        {/* Settings - Admin only */}
        <Route
          path="settings"
          element={
            <ProtectedRoute requireRole="admin">
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* AI & Automation - Admin or Manager */}
        <Route path="ai-automation" element={<AIAutomation />} />
        <Route path="ai-sourcing" element={<AISourcing />} />
        <Route path="consultant-performance" element={<ConsultantPerformance />} />
        <Route path="interview-scheduling" element={<InterviewScheduling />} />
        <Route path="ml-dashboard" element={<MLDashboard />} />
        <Route
          path="telegram-groups"
          element={
            <ProtectedRoute requirePermission="telegram:manage">
              <TelegramGroups />
            </ProtectedRoute>
          }
        />
        <Route
          path="ad-optimization"
          element={
            <ProtectedRoute requirePermission="ads:manage">
              <AdOptimization />
            </ProtectedRoute>
          }
        />

        {/* Redirects for removed/consolidated pages */}
        <Route path="analytics" element={<Navigate to="financials" replace />} />
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
      <AsyncErrorBoundary>
        <BrowserRouter basename="/admin">
          <ThemeProvider>
            <AuthProvider>
              <WebSocketProvider>
                <DataProvider>
                  <ToastProvider>
                    <AppRoutes />
                  </ToastProvider>
                </DataProvider>
              </WebSocketProvider>
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </AsyncErrorBoundary>
    </ErrorBoundary>
  );
}
