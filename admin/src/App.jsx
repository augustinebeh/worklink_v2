import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ToastProvider } from './components/ui/Toast';
import AdminLayout from './components/layout/AdminLayout';

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
import Training from './pages/Training';
import Gamification from './pages/Gamification';
import TenderMonitor from './pages/TenderMonitor';
import AIAutomation from './pages/AIAutomation';
import AISourcing from './pages/AISourcing';
import MLDashboard from './pages/MLDashboard';
import TelegramGroups from './pages/TelegramGroups';
import AdOptimization from './pages/AdOptimization';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard - main entry point with guides */}
        <Route index element={<Dashboard />} />
        
        {/* Operations */}
        <Route path="candidates" element={<Candidates />} />
        <Route path="candidates/:id" element={<CandidateProfile />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        <Route path="deployments" element={<Deployments />} />
        <Route path="payments" element={<Payments />} />
        
        {/* Sales & Tenders */}
        <Route path="bpo" element={<BPODashboard />} />
        <Route path="tender-monitor" element={<TenderMonitor />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        
        {/* Performance */}
        <Route path="financials" element={<FinancialDashboard />} />
        <Route path="gamification" element={<Gamification />} />
        <Route path="training" element={<Training />} />
        
        {/* Engagement */}
        <Route path="chat" element={<Chat />} />
        
        {/* Settings */}
        <Route path="settings" element={<Settings />} />
        
        {/* AI & Automation */}
        <Route path="ai-automation" element={<AIAutomation />} />
        <Route path="ai-sourcing" element={<AISourcing />} />
        <Route path="ml-dashboard" element={<MLDashboard />} />
        <Route path="telegram-groups" element={<TelegramGroups />} />
        <Route path="ad-optimization" element={<AdOptimization />} />

        {/* Redirects for removed/consolidated pages */}
        <Route path="analytics" element={<Navigate to="/financials" replace />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
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
  );
}
