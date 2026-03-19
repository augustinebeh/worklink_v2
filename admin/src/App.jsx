import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
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

// Import BPO Intelligence System pages
import BPODashboard from './pages/BPODashboard';
import BPOTenderLifecycle from './pages/BPOTenderLifecycle';
import GeBizIntelligence from './pages/GeBizIntelligence';
import RenewalPipeline from './pages/RenewalPipeline';
import RenewalDetail from './pages/RenewalDetail';
import TenderScanner from './pages/TenderScanner';

// Import refactored pages
import Analytics from './pages/Analytics';
import RetentionAnalytics from './pages/RetentionAnalytics';
import Gamification from './pages/Gamification';
import Training from './pages/Training';
import AISourcing from './pages/AISourcing';
import AIAutomation from './pages/AIAutomation';
import ConsultantPerformance from './pages/ConsultantPerformance';
import InterviewScheduling from './pages/InterviewScheduling';
import MLDashboard from './pages/MLDashboard';
import TelegramGroups from './pages/TelegramGroups';
import AdOptimization from './pages/AdOptimization';
import TenderMonitor from './pages/TenderMonitor';
import EPUIntelligence from './pages/EPUIntelligence';
import GeBizRSSMonitor from './pages/GeBizRSSMonitor';

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
        <Route path="clients" element={<ErrorBoundary level="page"><Clients /></ErrorBoundary>} />
        <Route path="clients/:id" element={<ErrorBoundary level="page"><ClientDetail /></ErrorBoundary>} />

        {/* Financial */}
        <Route path="financials" element={<ErrorBoundary level="page"><FinancialDashboard /></ErrorBoundary>} />

        {/* Communication */}
        <Route path="chat" element={<ErrorBoundary level="page"><Chat /></ErrorBoundary>} />
        <Route path="escalation-queue" element={<ErrorBoundary level="page"><EscalationQueue /></ErrorBoundary>} />

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
              <ErrorBoundary level="page">
                <Settings />
              </ErrorBoundary>
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

        {/* BPO & Tenders System (Reorganized Feb 2026) */}
        <Route
          path="tender-pipeline"
          element={
            <ErrorBoundary level="page">
              <BPOTenderLifecycle />
            </ErrorBoundary>
          }
        />
        <Route
          path="tender-scanner"
          element={
            <ErrorBoundary level="page">
              <TenderScanner />
            </ErrorBoundary>
          }
        />
        <Route
          path="gebiz-intelligence"
          element={
            <ErrorBoundary level="page">
              <GeBizIntelligence />
            </ErrorBoundary>
          }
        />
        <Route
          path="renewal/:id"
          element={
            <ErrorBoundary level="page">
              <RenewalDetail />
            </ErrorBoundary>
          }
        />

        {/* Analytics & Intelligence */}
        <Route path="analytics" element={<ErrorBoundary level="page"><Analytics /></ErrorBoundary>} />
        <Route path="retention-analytics" element={<ErrorBoundary level="page"><RetentionAnalytics /></ErrorBoundary>} />
        <Route path="ad-optimization" element={<ErrorBoundary level="page"><AdOptimization /></ErrorBoundary>} />
        <Route path="ml-dashboard" element={<ErrorBoundary level="page"><MLDashboard /></ErrorBoundary>} />
        <Route path="epu-intelligence" element={<ErrorBoundary level="page"><EPUIntelligence /></ErrorBoundary>} />
        <Route path="ai-automation" element={<ErrorBoundary level="page"><AIAutomation /></ErrorBoundary>} />

        {/* Workforce Management */}
        <Route path="gamification" element={<ErrorBoundary level="page"><Gamification /></ErrorBoundary>} />
        <Route path="training" element={<ErrorBoundary level="page"><Training /></ErrorBoundary>} />
        <Route path="ai-sourcing" element={<ErrorBoundary level="page"><AISourcing /></ErrorBoundary>} />
        <Route path="consultant-performance" element={<ErrorBoundary level="page"><ConsultantPerformance /></ErrorBoundary>} />
        <Route path="interview-scheduling" element={<ErrorBoundary level="page"><InterviewScheduling /></ErrorBoundary>} />

        {/* Communication */}
        <Route path="telegram-groups" element={<ErrorBoundary level="page"><TelegramGroups /></ErrorBoundary>} />

        {/* BPO & Tenders (additional) */}
        <Route path="bpo" element={<ErrorBoundary level="page"><BPODashboard /></ErrorBoundary>} />
        <Route path="renewal-pipeline" element={<ErrorBoundary level="page"><RenewalPipeline /></ErrorBoundary>} />
        <Route path="tender-monitor" element={<ErrorBoundary level="page"><TenderMonitor /></ErrorBoundary>} />
        <Route path="gebiz-rss" element={<ErrorBoundary level="page"><GeBizRSSMonitor /></ErrorBoundary>} />

        {/* Legacy redirects */}
        <Route path="tender-lifecycle" element={<Navigate to="tender-pipeline" replace />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  // Setup global error handling with cleanup
  React.useEffect(() => {
    const cleanup = setupGlobalErrorHandling();
    return cleanup;
  }, []);

  return (
    <ErrorBoundary level="app">
      <BrowserRouter basename="/admin">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <WebSocketProvider>
                <ToastProvider>
                  <AppRoutes />
                </ToastProvider>
              </WebSocketProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}