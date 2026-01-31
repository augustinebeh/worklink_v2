import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { HomeIcon, BriefcaseIcon, WalletIcon, UserIcon, SearchIcon, GridIcon } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { path: '/', icon: HomeIcon, label: 'Home' },
  { path: '/jobs', icon: SearchIcon, label: 'Jobs' },
  { path: '/wallet', icon: WalletIcon, label: 'Wallet' },
  { path: '/profile', icon: UserIcon, label: 'Account' },
];

export default function BottomNav() {
  const location = useLocation();

  // Hide on login page
  if (location.pathname === '/login') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0f1a]/98 backdrop-blur-xl border-t border-white/5 pb-safe z-50">
      <div className="flex items-center justify-around px-2 h-16 max-w-md mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path ||
            (path !== '/' && location.pathname.startsWith(path));

          return (
            <NavLink
              key={path}
              to={path}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'flex flex-col items-center justify-center flex-1 py-2 transition-all duration-200 relative group',
                isActive
                  ? 'text-white'
                  : 'text-dark-500 hover:text-dark-300'
              )}
            >
              <div className={clsx(
                'relative p-2 rounded-xl transition-all duration-200',
                isActive && 'bg-primary-500/20'
              )}>
                <Icon
                  className={clsx(
                    'h-5 w-5 transition-all duration-200',
                    isActive ? 'text-primary-400' : 'text-dark-500 group-hover:text-dark-300'
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span className={clsx(
                'text-2xs font-medium mt-0.5 transition-colors',
                isActive ? 'text-primary-400' : 'text-dark-500'
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
