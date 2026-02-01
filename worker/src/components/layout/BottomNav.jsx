import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { HomeIcon, BriefcaseIcon, WalletIcon, UserIcon, SearchIcon, GridIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { clsx } from 'clsx';
import { haptic } from '../../hooks/useHaptic';

const navItems = [
  { path: '/', icon: HomeIcon, label: 'Home' },
  { path: '/jobs', icon: SearchIcon, label: 'Jobs' },
  { path: '/wallet', icon: WalletIcon, label: 'Wallet' },
  { path: '/profile', icon: UserIcon, label: 'Account' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const handleNavClick = (e, path, isActive) => {
    haptic.light();

    // If already on this page, scroll to top
    if (isActive) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Navigate and scroll to top
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  // Hide on login page
  if (location.pathname === '/login') return null;

  return (
    <nav
      className={clsx(
        'fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl',
        isDark
          ? 'bg-dark-900/70 border-t border-white/5'
          : 'bg-white/80 border-t border-slate-200/60 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]'
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Glassmorphism overlay */}
      <div className={clsx(
        'absolute inset-0 pointer-events-none',
        isDark
          ? 'bg-gradient-to-r from-blue-900/10 via-transparent to-cyan-900/10'
          : ''
      )} />

      {/* Top glow line - only in dark mode */}
      {isDark && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      )}

      <div className="relative flex items-center justify-around px-4 h-16 w-full">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path ||
            (path !== '/' && location.pathname.startsWith(path));

          return (
            <NavLink
              key={path}
              to={path}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              onClick={(e) => handleNavClick(e, path, isActive)}
              className={clsx(
                'flex flex-col items-center justify-center flex-1 py-2 transition-all duration-200 relative group'
              )}
            >
              <div className={clsx(
                'relative p-2 rounded-xl transition-all duration-200',
                isActive && (isDark ? 'bg-primary-500/20' : 'bg-primary-500/10')
              )}>
                <Icon
                  className={clsx(
                    'h-5 w-5 transition-all duration-200',
                    isActive
                      ? (isDark ? 'text-primary-400' : 'text-primary-600')
                      : (isDark ? 'text-dark-500 group-hover:text-dark-300' : 'text-slate-400 group-hover:text-slate-600')
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span className={clsx(
                'text-2xs font-medium mt-0.5 transition-colors',
                isActive
                  ? (isDark ? 'text-primary-400' : 'text-primary-600')
                  : (isDark ? 'text-dark-500' : 'text-slate-400')
              )}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
