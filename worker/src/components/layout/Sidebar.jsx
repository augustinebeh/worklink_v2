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
import { clsx } from 'clsx';
import { LogoIcon } from '../ui/Logo';
import { haptic } from '../../hooks/useHaptic';
import { XP_THRESHOLDS, calculateLevel, LEVEL_TITLES } from '../../utils/gamification';

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

  const userXP = user?.xp || 0;
  const userLevel = calculateLevel(userXP);
  const levelTitle = LEVEL_TITLES[userLevel] || 'Newcomer';
  const currentThreshold = XP_THRESHOLDS[userLevel - 1] || 0;
  const nextThreshold = XP_THRESHOLDS[userLevel] || XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
  const xpInLevel = Math.max(0, userXP - currentThreshold);
  const xpNeeded = Math.max(1, nextThreshold - currentThreshold);
  const progress = userLevel >= XP_THRESHOLDS.length ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100);

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={clsx(
          'fixed top-0 left-0 bottom-0 w-72 z-[100] transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'bg-[#0a1628] border-r border-white/[0.05]'
        )}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <LogoIcon size={28} />
            <span className="font-bold text-white">WorkLink</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="px-4 py-4 border-b border-white/[0.05]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold overflow-hidden">
                {user.profile_photo ? (
                  <img
                    src={user.profile_photo}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <span style={{ display: user.profile_photo ? 'none' : 'flex' }}>
                  {user.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{user.name || 'User'}</p>
                <p className="text-sm text-emerald-400">{levelTitle}</p>
              </div>
            </div>
            
            {/* XP Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1 text-white/50">
                  <ZapIcon className="h-3 w-3 text-violet-400" />
                  Level {userLevel}
                </span>
                <span className="text-emerald-400 font-medium">
                  {xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Menu Sections */}
        <div className="flex-1 overflow-y-auto py-4">
          {menuSections.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-white/30">
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
                        ? 'bg-emerald-500/20 text-emerald-400 border-r-2 border-emerald-500'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
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
          className="px-4 py-4 border-t border-white/[0.05]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
        >
          <p className="text-xs text-white/30">WorkLink v2.0</p>
        </div>
      </div>
    </>
  );
}
