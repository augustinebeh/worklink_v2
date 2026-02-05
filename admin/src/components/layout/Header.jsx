import { useState } from 'react';
import { 
  MenuIcon, 
  SearchIcon, 
  SunIcon, 
  MoonIcon,
  UserIcon,
  LogOutIcon,
  SettingsIcon,
} from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { clsx } from 'clsx';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../ui/Avatar';
import { AlertBell } from '../bpo';

export default function Header({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        <div className="hidden sm:flex items-center">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidates, jobs, tenders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 lg:w-80 pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
        </button>

        {/* New AlertBell Component */}
        <AlertBell />

        <Menu as="div" className="relative">
          <Menu.Button className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Avatar name={user?.name || 'Admin'} size="sm" status="online" />
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.name || 'Admin'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Administrator</p>
            </div>
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden focus:outline-none">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.name || 'Admin'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email || 'admin@worklink.sg'}</p>
              </div>
              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button className={clsx('flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300', active && 'bg-slate-50 dark:bg-slate-800')}>
                      <UserIcon className="h-4 w-4" />
                      Profile
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button className={clsx('flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300', active && 'bg-slate-50 dark:bg-slate-800')}>
                      <SettingsIcon className="h-4 w-4" />
                      Settings
                    </button>
                  )}
                </Menu.Item>
              </div>
              <div className="py-1 border-t border-slate-200 dark:border-slate-800">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={logout}
                      className={clsx('flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400', active && 'bg-slate-50 dark:bg-slate-800')}
                    >
                      <LogOutIcon className="h-4 w-4" />
                      Sign out
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </header>
  );
}
