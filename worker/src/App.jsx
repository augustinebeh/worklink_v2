import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ToastProvider } from './components/ui/Toast';
import BottomNav from './components/layout/BottomNav';
import { PageTransition } from './components/layout/PageTransition';

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
import Referrals from './pages/Referrals';

function AppLayout({ children }) {
  const location = useLocation();

  return (
    <>
      <PageTransition key={location.pathname}>
        {children}
      </PageTransition>
      <BottomNav />
    </>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" />
          <p className="text-dark-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the attempted URL for redirecting after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public route - Login */}
      <Route path="/login" element={<Login />} />

      {/* All other routes require authentication */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout><Home /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <ProtectedRoute>
            <AppLayout><Jobs /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs/:id"
        element={
          <ProtectedRoute>
            <AppLayout><JobDetail /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <AppLayout><Calendar /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/wallet"
        element={
          <ProtectedRoute>
            <AppLayout><Wallet /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout><Profile /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <AppLayout><Chat /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <AppLayout><Notifications /></AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Gamification routes */}
      <Route
        path="/quests"
        element={
          <ProtectedRoute>
            <AppLayout><Quests /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/achievements"
        element={
          <ProtectedRoute>
            <AppLayout><Achievements /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <AppLayout><Leaderboard /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/training"
        element={
          <ProtectedRoute>
            <AppLayout><Training /></AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Referrals */}
      <Route
        path="/referrals"
        element={
          <ProtectedRoute>
            <AppLayout><Referrals /></AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to home (which will redirect to login if not authenticated) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
