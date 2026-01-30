import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import BottomNav from './components/layout/BottomNav';

// Pages
import Home from './pages/Home';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Calendar from './pages/Calendar';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import Login from './pages/Login';
import Quests from './pages/Quests';
import Achievements from './pages/Achievements';
import Leaderboard from './pages/Leaderboard';
import Training from './pages/Training';
import Notifications from './pages/Notifications';

function AppLayout({ children }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // For now, allow access but show login prompt in components that need user
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      
      {/* Main app with bottom nav */}
      <Route path="/" element={<AppLayout><Home /></AppLayout>} />
      <Route path="/jobs" element={<AppLayout><Jobs /></AppLayout>} />
      <Route path="/jobs/:id" element={<AppLayout><JobDetail /></AppLayout>} />
      <Route path="/calendar" element={<AppLayout><Calendar /></AppLayout>} />
      <Route path="/wallet" element={<AppLayout><Wallet /></AppLayout>} />
      <Route path="/profile" element={<AppLayout><Profile /></AppLayout>} />
      <Route path="/chat" element={<AppLayout><Chat /></AppLayout>} />
      <Route path="/notifications" element={<AppLayout><Notifications /></AppLayout>} />
      
      {/* Gamification */}
      <Route path="/quests" element={<AppLayout><Quests /></AppLayout>} />
      <Route path="/achievements" element={<AppLayout><Achievements /></AppLayout>} />
      <Route path="/leaderboard" element={<AppLayout><Leaderboard /></AppLayout>} />
      <Route path="/training" element={<AppLayout><Training /></AppLayout>} />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <AppRoutes />
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
