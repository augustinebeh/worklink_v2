import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  XIcon,
  HomeIcon,
  SearchIcon,
  WalletIcon,
  UserIcon,
  TrophyIcon,
  TargetIcon,
  AwardIcon,
  GiftIcon,
  CalendarIcon,
  GraduationCapIcon,
  BellIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { clsx } from 'clsx';
import { LogoIcon } from '../ui/Logo';
import { haptic } from '../../hooks/useHaptic';

const menuSections = [
  {
    title: 'Main',
    items: [
      { path: '/', icon: HomeIcon, label: 'Home' },
      { path: '/jobs', icon: SearchIcon, label: 'Find Jobs' },
      { path: '/wallet', icon: WalletIcon, label: 'Wallet' },
      { path: '/calendar', icon: CalendarIcon, label: 'Availability' },
    ],
  },
  {
    title: 'Rewards',
    items: [
      { path: '/quests', icon: TargetIcon, label: 'Quests' },
      { path: '/achievements', icon: AwardIcon, label: 'Achievements' },
      { path: '/leaderboard', icon: TrophyIcon, label: 'Leaderboard' },
      { path: '/referrals', icon: GiftIcon, label: 'Refer & Earn' },
    ],
  },
  {
    title: 'More',
    items: [
      { path: '/training', icon: GraduationCapIcon, label: 'Training' },
      { path: '/notifications', icon: BellIcon, label: 'Notifications' },
      { path: '/profile', icon: UserIcon, label: 'Profile' },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isDark } = useTheme();

  // Close sidebar on route change
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNavigation = (path) => {
    haptic.light();
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/60 z-[100] transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={clsx(
          'fixed top-0 left-0 bottom-0 w-72 z-[100] transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isDark ? 'bg-[#0a0f1a]' : 'bg-white'
        )}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/5">
          <div className="flex items-center gap-3">
            <LogoIcon size={28} />
            <span className={clsx('font-bold', isDark ? 'text-white' : 'text-slate-900')}>
              WorkLink
            </span>
          </div>
          <button
            onClick={onClose}
            className={clsx(
              'p-2 rounded-full transition-colors',
              isDark ? 'text-dark-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'
            )}
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="px-4 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center text-white font-bold overflow-hidden">
                {user.profile_photo ? (
                  <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  user.name?.charAt(0) || 'U'
                )}
              </div>
              <div>
                <p className={clsx('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
                  {user.name || 'User'}
                </p>
                <p className="text-sm text-primary-400">Level {user.level || 1}</p>
              </div>
            </div>
          </div>
        )}

        {/* Menu Sections */}
        <div className="flex-1 overflow-y-auto py-4">
          {menuSections.map((section) => (
            <div key={section.title} className="mb-4">
              <p className={clsx(
                'px-4 mb-2 text-xs font-semibold uppercase tracking-wider',
                isDark ? 'text-dark-500' : 'text-slate-400'
              )}>
                {section.title}
              </p>
              {section.items.map(({ path, icon: Icon, label }) => {
                const isActive = location.pathname === path ||
                  (path !== '/' && location.pathname.startsWith(path));

                return (
                  <button
                    key={path}
                    onClick={() => handleNavigation(path)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 transition-colors',
                      isActive
                        ? isDark
                          ? 'bg-primary-500/20 text-primary-400 border-r-2 border-primary-500'
                          : 'bg-primary-50 text-primary-600 border-r-2 border-primary-500'
                        : isDark
                          ? 'text-dark-300 hover:bg-white/5'
                          : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-4 border-t border-white/5"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
        >
          <p className={clsx('text-xs', isDark ? 'text-dark-600' : 'text-slate-400')}>
            WorkLink v2.0
          </p>
        </div>
      </div>
    </>
  );
}
