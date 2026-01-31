import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { HomeIcon, BriefcaseIcon, CalendarIcon, WalletIcon, UserIcon, PlusIcon, ZapIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useState } from 'react';

const navItems = [
  { path: '/', icon: HomeIcon, label: 'Home' },
  { path: '/jobs', icon: BriefcaseIcon, label: 'Jobs' },
  { path: 'action', icon: ZapIcon, label: 'Quick', isAction: true },
  { path: '/wallet', icon: WalletIcon, label: 'Wallet' },
  { path: '/profile', icon: UserIcon, label: 'Profile' },
];

function QuickActionMenu({ isOpen, onClose }) {
  const navigate = useNavigate();

  const actions = [
    { label: 'Browse Jobs', icon: BriefcaseIcon, path: '/jobs', color: 'from-blue-500 to-cyan-500' },
    { label: 'My Calendar', icon: CalendarIcon, path: '/calendar', color: 'from-purple-500 to-violet-500' },
    { label: 'View Quests', icon: ZapIcon, path: '/quests', color: 'from-orange-500 to-red-500' },
    { label: 'Refer Friend', icon: UserIcon, path: '/referrals', color: 'from-green-500 to-emerald-500' },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Menu */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
        <div className="bg-dark-800 rounded-2xl border border-white/10 p-4 shadow-2xl">
          <div className="grid grid-cols-2 gap-3">
            {actions.map((action) => (
              <button
                key={action.path}
                onClick={() => {
                  navigate(action.path);
                  onClose();
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark-700/50 hover:bg-dark-700 transition-colors active:scale-95"
              >
                <div className={clsx(
                  'p-3 rounded-xl bg-gradient-to-br',
                  action.color
                )}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm text-white font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const ws = useWebSocket();
  const [showQuickAction, setShowQuickAction] = useState(false);

  // Hide on login page
  if (location.pathname === '/login') return null;

  return (
    <>
      <QuickActionMenu
        isOpen={showQuickAction}
        onClose={() => setShowQuickAction(false)}
      />

      <nav className="fixed bottom-0 left-0 right-0 bg-dark-900/95 backdrop-blur-xl border-t border-white/5 pb-safe z-50">
        <div className="flex items-center justify-around px-2 h-16">
          {navItems.map(({ path, icon: Icon, label, isAction }) => {
            if (isAction) {
              return (
                <button
                  key={path}
                  onClick={() => setShowQuickAction(!showQuickAction)}
                  className={clsx(
                    'relative -mt-6 flex flex-col items-center justify-center transition-all duration-200',
                    showQuickAction && 'rotate-45'
                  )}
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-lg shadow-primary-500/30 active:scale-95 transition-transform">
                    <PlusIcon className="h-7 w-7 text-white" strokeWidth={2.5} />
                  </div>
                </button>
              );
            }

            const isActive = location.pathname === path ||
              (path !== '/' && location.pathname.startsWith(path));

            return (
              <NavLink
                key={path}
                to={path}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'flex flex-col items-center justify-center w-16 py-2 transition-all duration-200 relative',
                  isActive
                    ? 'text-primary-400'
                    : 'text-dark-500 active:text-dark-300'
                )}
              >
                <div className="relative">
                  <Icon
                    className={clsx(
                      'h-6 w-6 mb-0.5 transition-all duration-200',
                      isActive && 'stroke-[2.5px]'
                    )}
                  />
                </div>
                <span className={clsx(
                  'text-2xs font-medium transition-colors',
                  isActive && 'text-primary-400'
                )}>
                  {label}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-400" />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
