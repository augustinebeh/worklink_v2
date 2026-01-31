import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MenuIcon, BellIcon, QrCodeIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { clsx } from 'clsx';
import Sidebar from './Sidebar';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const ws = useWebSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Hide on login page
  if (location.pathname === '/login') return null;

  return (
    <>
      <header
        className={clsx(
          'sticky top-0 left-0 right-0 z-40',
          isDark
            ? 'bg-[#0a0f1a]/95 backdrop-blur-lg'
            : 'bg-white/95 backdrop-blur-lg'
        )}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Main Header Content */}
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left - Menu */}
          <button
            onClick={() => setSidebarOpen(true)}
            className={clsx(
              'p-2 -ml-2 rounded-xl transition-all active:scale-95',
              isDark
                ? 'text-white hover:bg-white/10'
                : 'text-slate-900 hover:bg-slate-100'
            )}
          >
            <MenuIcon className="h-6 w-6" strokeWidth={2} />
          </button>

          {/* Right - Actions */}
          <div className="flex items-center gap-1">
            {/* QR Scanner */}
            <button
              className={clsx(
                'p-2.5 rounded-xl transition-all active:scale-95',
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-white/5'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              <QrCodeIcon className="h-5 w-5" strokeWidth={2} />
            </button>

            {/* Notifications */}
            <button
              onClick={() => navigate('/notifications')}
              className={clsx(
                'relative p-2.5 rounded-xl transition-all active:scale-95',
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-white/5'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              <BellIcon className="h-5 w-5" strokeWidth={2} />
              {ws?.unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white px-1">
                    {ws.unreadNotifications > 99 ? '99+' : ws.unreadNotifications}
                  </span>
                </span>
              )}
            </button>

            {/* Profile Avatar */}
            {user && (
              <button
                onClick={() => navigate('/profile')}
                className={clsx(
                  'relative ml-1 rounded-xl p-0.5 transition-all active:scale-95',
                  'bg-gradient-to-br from-primary-500 via-violet-500 to-fuchsia-500'
                )}
              >
                <div className={clsx(
                  'w-9 h-9 rounded-[10px] flex items-center justify-center overflow-hidden',
                  isDark ? 'bg-[#0d1421]' : 'bg-white'
                )}>
                  {user.profile_photo ? (
                    <img
                      src={user.profile_photo}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold bg-gradient-to-br from-primary-400 to-violet-500 bg-clip-text text-transparent">
                      {user.name?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Subtle bottom gradient line */}
        <div className={clsx(
          'h-px',
          isDark
            ? 'bg-gradient-to-r from-transparent via-white/10 to-transparent'
            : 'bg-gradient-to-r from-transparent via-slate-200 to-transparent'
        )} />
      </header>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}
