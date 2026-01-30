import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
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
import Analytics from './pages/Analytics';
import Chat from './pages/Chat';
import AIAutomation from './pages/AIAutomation';
import Training from './pages/Training';
import Gamification from './pages/Gamification';

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
        {/* Dashboard */}
        <Route index element={<Dashboard />} />
        
        {/* Candidates */}
        <Route path="candidates" element={<Candidates />} />
        <Route path="candidates/:id" element={<CandidateProfile />} />
        
        {/* Jobs */}
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        
        {/* Deployments */}
        <Route path="deployments" element={<Deployments />} />
        
        {/* Payments */}
        <Route path="payments" element={<Payments />} />
        
        {/* BPO */}
        <Route path="bpo" element={<BPODashboard />} />
        <Route path="ai-automation" element={<AIAutomation />} />
        
        {/* Clients */}
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        
        {/* Engagement */}
        <Route path="training" element={<Training />} />
        <Route path="gamification" element={<Gamification />} />
        <Route path="chat" element={<Chat />} />
        
        {/* Insights */}
        <Route path="financials" element={<FinancialDashboard />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
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
              <AppRoutes />
            </DataProvider>
          </WebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
