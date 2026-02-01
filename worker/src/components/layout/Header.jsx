import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MenuIcon, BellIcon, MessageCircleIcon } from 'lucide-react';
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
      {/* Spacer to push content below fixed header */}
      <div
        className="w-full"
        style={{ height: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}
      />

      <header
        className={clsx(
          'fixed top-0 left-0 right-0 z-[9999]',
          isDark
            ? 'backdrop-blur-xl bg-dark-900/70 border-b border-white/5'
            : 'backdrop-blur-md bg-white/90 border-b border-[#C2DAE6] shadow-sm'
        )}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Glassmorphism overlay */}
        <div className={clsx(
          'absolute inset-0 pointer-events-none',
          isDark
            ? 'bg-gradient-to-r from-blue-900/10 via-transparent to-cyan-900/10'
            : ''
        )} />

        {/* Light mode: Gradient fade to transparent at bottom */}
        {!isDark && (
          <div
            className="absolute inset-x-0 bottom-0 h-8 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.6))',
              maskImage: 'linear-gradient(to top, black, transparent)',
              WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
            }}
          />
        )}

        {/* Main Header Content */}
        <div className="relative flex items-center justify-between px-4 h-14">
          {/* Left - Menu */}
          <button
            onClick={() => setSidebarOpen(true)}
            className={clsx(
              'p-2 -ml-2 rounded-xl transition-all active:scale-95',
              isDark
                ? 'text-white hover:bg-white/10'
                : 'text-slate-700 hover:text-slate-900 hover:bg-black/5'
            )}
          >
            <MenuIcon className="h-6 w-6" strokeWidth={2} />
          </button>

          {/* Right - Actions */}
          <div className="flex items-center gap-1">
            {/* Chat */}
            <button
              onClick={() => navigate('/chat')}
              className={clsx(
                'relative p-2.5 rounded-xl transition-all active:scale-95',
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-white/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
              )}
            >
              <MessageCircleIcon className="h-5 w-5" strokeWidth={2} />
              {ws?.unreadMessages > 0 && (
                <span className={clsx(
                  'absolute top-1.5 right-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center',
                  isDark
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                    : 'bg-primary-500 shadow-md'
                )}>
                  <span className={clsx(
                    'text-[10px] font-bold px-1',
                    isDark ? 'text-white' : 'text-white'
                  )}>
                    {ws.unreadMessages > 99 ? '99+' : ws.unreadMessages}
                  </span>
                </span>
              )}
            </button>

            {/* Notifications */}
            <button
              onClick={() => navigate('/notifications')}
              className={clsx(
                'relative p-2.5 rounded-xl transition-all active:scale-95',
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-white/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
              )}
            >
              <BellIcon className="h-5 w-5" strokeWidth={2} />
              {ws?.unreadNotifications > 0 && (
                <span className={clsx(
                  'absolute top-1.5 right-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center',
                  isDark
                    ? 'bg-gradient-to-br from-red-500 to-rose-600'
                    : 'bg-red-500 shadow-md'
                )}>
                  <span className={clsx(
                    'text-[10px] font-bold px-1',
                    isDark ? 'text-white' : 'text-white'
                  )}>
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
                  isDark
                    ? 'bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600'
                    : 'bg-gradient-to-br from-primary-500 to-cyan-500'
                )}
              >
                <div className={clsx(
                  'w-9 h-9 rounded-[10px] flex items-center justify-center overflow-hidden',
                  isDark ? 'bg-dark-900' : 'bg-white'
                )}>
                  {user.profile_photo ? (
                    <img
                      src={user.profile_photo}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className={clsx(
                      'text-sm font-bold bg-clip-text text-transparent',
                      isDark
                        ? 'bg-gradient-to-br from-blue-400 to-cyan-500'
                        : 'bg-gradient-to-br from-primary-500 to-cyan-500'
                    )}>
                      {user.name?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Subtle bottom glow line - only in dark mode */}
        {isDark && (
          <div className="h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        )}
      </header>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}
