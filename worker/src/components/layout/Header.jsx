import { useNavigate, useLocation } from 'react-router-dom';
import { BellIcon, SettingsIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { clsx } from 'clsx';
import { LogoIcon } from '../ui/Logo';

const PAGE_TITLES = {
  '/': null, // Home shows logo
  '/jobs': 'Find Jobs',
  '/wallet': 'Wallet',
  '/profile': 'Profile',
  '/calendar': 'Availability',
  '/notifications': 'Notifications',
  '/quests': 'Quests',
  '/achievements': 'Achievements',
  '/leaderboard': 'Leaderboard',
  '/training': 'Training',
  '/referrals': 'Refer & Earn',
  '/chat': 'Messages',
};

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const ws = useWebSocket();

  // Hide on login page
  if (location.pathname === '/login') return null;

  // Get page title or show logo on home
  const isHome = location.pathname === '/';
  const pageTitle = PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/jobs/') ? 'Job Details' : 'WorkLink');

  return (
    <header
      className={clsx(
        'sticky top-0 z-40 border-b',
        isDark
          ? 'bg-[#0a0f1a] border-white/5'
          : 'bg-white border-slate-200'
      )}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left side - Logo or Title */}
        <div className="flex items-center gap-3">
          {isHome ? (
            <>
              <LogoIcon size={32} />
              <span className={clsx(
                'font-bold text-lg',
                isDark ? 'text-white' : 'text-slate-900'
              )}>
                WorkLink
              </span>
            </>
          ) : (
            <h1 className={clsx(
              'font-semibold text-lg',
              isDark ? 'text-white' : 'text-slate-900'
            )}>
              {pageTitle}
            </h1>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button
            onClick={() => navigate('/notifications')}
            className={clsx(
              'relative p-2 rounded-full transition-colors',
              isDark
                ? 'text-dark-400 hover:text-white hover:bg-white/5'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            )}
          >
            <BellIcon className="h-5 w-5" />
            {ws?.unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          {/* Profile Avatar */}
          {user && (
            <button
              onClick={() => navigate('/profile')}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center text-white font-semibold text-sm overflow-hidden"
            >
              {user.profile_photo ? (
                <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
              ) : (
                user.name?.charAt(0) || 'U'
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
