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
  ZapIcon,
  UserCogIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { clsx } from 'clsx';
import { LogoIcon } from '../ui/Logo';
import { haptic } from '../../hooks/useHaptic';
import { XP_THRESHOLDS, calculateLevel } from '../../utils/gamification';

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
      { path: '/complete-profile', icon: UserCogIcon, label: 'Edit Profile' },
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
          isDark ? 'bg-[#0b1426]' : 'bg-white shadow-xl'
        )}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Header */}
        <div className={clsx(
          'flex items-center justify-between px-4 h-14 border-b',
          isDark ? 'border-white/5' : 'border-slate-100'
        )}>
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
              isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'
            )}
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* User Info */}
        {user && (() => {
          const userXP = user.xp || 0;
          const userLevel = calculateLevel(userXP);
          const currentThreshold = XP_THRESHOLDS[userLevel - 1] || 0;
          const nextThreshold = XP_THRESHOLDS[userLevel] || XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
          const xpInLevel = Math.max(0, userXP - currentThreshold);
          const xpNeeded = Math.max(1, nextThreshold - currentThreshold);
          const progress = userLevel >= XP_THRESHOLDS.length ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100);

          return (
            <div className={clsx(
              'px-4 py-4 border-b',
              isDark ? 'border-white/5' : 'border-slate-100'
            )}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold overflow-hidden">
                  {user.profile_photo ? (
                    <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    user.name?.charAt(0) || 'U'
                  )}
                </div>
                <div className="flex-1">
                  <p className={clsx('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
                    {user.name || 'User'}
                  </p>
                  <p className="text-sm text-blue-400">Level {userLevel}</p>
                </div>
              </div>
              {/* XP Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={clsx('flex items-center gap-1', isDark ? 'text-slate-400' : 'text-slate-500')}>
                    <ZapIcon className="h-3 w-3 text-cyan-400" />
                    {xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP
                  </span>
                  <span className="text-cyan-400 font-medium">{Math.round(progress)}%</span>
                </div>
                <div className={clsx('h-1.5 rounded-full overflow-hidden', isDark ? 'bg-white/10' : 'bg-slate-200')}>
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Menu Sections */}
        <div className="flex-1 overflow-y-auto py-4">
          {menuSections.map((section) => (
            <div key={section.title} className="mb-4">
              <p className={clsx(
                'px-4 mb-2 text-xs font-semibold uppercase tracking-wider',
                isDark ? 'text-slate-500' : 'text-slate-400'
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
                          ? 'bg-blue-500/20 text-blue-400 border-r-2 border-blue-500'
                          : 'bg-blue-50 text-blue-600 border-r-2 border-blue-500'
                        : isDark
                          ? 'text-slate-300 hover:bg-white/5'
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
          className={clsx(
            'px-4 py-4 border-t',
            isDark ? 'border-white/5' : 'border-slate-100'
          )}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
        >
          <p className={clsx('text-xs', isDark ? 'text-slate-600' : 'text-slate-400')}>
            WorkLink v2.0
          </p>
        </div>
      </div>
    </>
  );
}
