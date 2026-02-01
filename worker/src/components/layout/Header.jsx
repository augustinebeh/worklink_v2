import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MenuIcon, BellIcon, MessageCircleIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { clsx } from 'clsx';
import Sidebar from './Sidebar';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
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
        className="fixed top-0 left-0 right-0 z-[9999] backdrop-blur-xl bg-[#0a1628]/90 border-b border-white/[0.05]"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Main Header Content */}
        <div className="relative flex items-center justify-between px-4 h-14">
          {/* Left - Menu */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all active:scale-95"
          >
            <MenuIcon className="h-6 w-6" strokeWidth={2} />
          </button>

          {/* Right - Actions */}
          <div className="flex items-center gap-1">
            {/* Chat */}
            <button
              onClick={() => navigate('/chat')}
              className="relative p-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all active:scale-95"
            >
              <MessageCircleIcon className="h-5 w-5" strokeWidth={2} />
              {ws?.unreadMessages > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white px-1">
                    {ws.unreadMessages > 99 ? '99+' : ws.unreadMessages}
                  </span>
                </span>
              )}
            </button>

            {/* Notifications */}
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all active:scale-95"
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
          </div>
        </div>

        {/* Subtle bottom glow line */}
        <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
      </header>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}
