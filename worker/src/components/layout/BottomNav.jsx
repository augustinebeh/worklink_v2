import { NavLink, useLocation } from 'react-router-dom';
import { HomeIcon, BriefcaseIcon, WalletIcon, UserIcon, SearchIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { haptic } from '../../hooks/useHaptic';

const navItems = [
  { path: '/', icon: HomeIcon, label: 'Home' },
  { path: '/jobs', icon: SearchIcon, label: 'Jobs' },
  { path: '/wallet', icon: WalletIcon, label: 'Wallet' },
  { path: '/profile', icon: UserIcon, label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();

  const handleNavClick = (e, path, isActive) => {
    haptic.light();
    if (isActive) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  if (location.pathname === '/login') return null;

  const activeIndex = navItems.findIndex(({ path }) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a1628]/95 backdrop-blur-xl border-t border-white/[0.05]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

      {/* Active indicator glow */}
      {activeIndex >= 0 && (
        <div
          className="absolute top-0 w-16 h-1 bg-emerald-500 rounded-b-full transition-all duration-300 ease-out"
          style={{
            left: `calc(${(activeIndex * 25) + 12.5}% - 32px)`,
            boxShadow: '0 0 20px 4px rgba(16, 185, 129, 0.4)',
          }}
        />
      )}

      <div className="relative flex items-center justify-around px-2 h-16 w-full">
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
              className="flex flex-col items-center justify-center flex-1 py-2 transition-all duration-200 relative group"
            >
              <div className={clsx(
                'relative p-2.5 rounded-2xl transition-all duration-200',
                isActive && 'bg-emerald-500/20'
              )}>
                <Icon
                  className={clsx(
                    'h-5 w-5 transition-all duration-200',
                    isActive ? 'text-emerald-400' : 'text-white/40 group-hover:text-white/60'
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span className={clsx(
                'text-[10px] font-medium mt-0.5 transition-colors',
                isActive ? 'text-emerald-400' : 'text-white/40'
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
