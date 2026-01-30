import { NavLink, useLocation } from 'react-router-dom';
import { HomeIcon, BriefcaseIcon, CalendarIcon, WalletIcon, UserIcon, MessageCircleIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { useWebSocket } from '../../contexts/WebSocketContext';

const navItems = [
  { path: '/', icon: HomeIcon, label: 'Home' },
  { path: '/jobs', icon: BriefcaseIcon, label: 'Jobs' },
  { path: '/calendar', icon: CalendarIcon, label: 'Calendar' },
  { path: '/chat', icon: MessageCircleIcon, label: 'Chat', badgeKey: 'unreadMessages' },
  { path: '/wallet', icon: WalletIcon, label: 'Wallet' },
  { path: '/profile', icon: UserIcon, label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const ws = useWebSocket();

  // Hide on login page
  if (location.pathname === '/login') return null;

  const getBadgeCount = (badgeKey) => {
    if (!ws || !badgeKey) return 0;
    return ws[badgeKey] || 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-dark-900/95 backdrop-blur-lg border-t border-white/5 pb-safe z-50">
      <div className="flex items-center justify-around px-2">
        {navItems.map(({ path, icon: Icon, label, badgeKey }) => {
          const isActive = location.pathname === path || 
            (path !== '/' && location.pathname.startsWith(path));
          
          const badgeCount = getBadgeCount(badgeKey);
          
          return (
            <NavLink
              key={path}
              to={path}
              className={clsx(
                'flex flex-col items-center justify-center py-2 px-3 min-w-[60px] transition-colors relative',
                isActive ? 'text-primary-400' : 'text-dark-500'
              )}
            >
              <div className="relative">
                <Icon className={clsx('h-5 w-5 mb-1', isActive && 'stroke-[2.5px]')} />
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-2xs font-bold flex items-center justify-center">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </div>
              <span className="text-2xs font-medium">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
