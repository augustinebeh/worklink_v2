import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import { PageTransition } from './components/layout/PageTransition';
import InstallPrompt from './components/InstallPrompt';

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const Jobs = lazy(() => import('./pages/Jobs'));
const JobDetail = lazy(() => import('./pages/JobDetail'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Profile = lazy(() => import('./pages/Profile'));
const Chat = lazy(() => import('./pages/Chat'));
const Login = lazy(() => import('./pages/Login'));
const Quests = lazy(() => import('./pages/Quests'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Training = lazy(() => import('./pages/Training'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Referrals = lazy(() => import('./pages/Referrals'));

// Loading spinner for lazy-loaded pages
function PageLoader() {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
    </div>
  );
}

function AppLayout({ children }) {
  const location = useLocation();

  // Hide header and bottom nav on chat page for full-screen messenger experience
  const isChatPage = location.pathname === '/chat';

  return (
    <>
      {!isChatPage && <Header />}
      <main className="flex-1 min-h-screen">
        <Suspense fallback={<PageLoader />}>
          <PageTransition key={location.pathname}>
            {children}
          </PageTransition>
        </Suspense>
      </main>
      {!isChatPage && <BottomNav />}
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
      <ThemeProvider>
        <AuthProvider>
          <WebSocketProvider>
            <ToastProvider>
              <AppRoutes />
              <InstallPrompt />
            </ToastProvider>
          </WebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
