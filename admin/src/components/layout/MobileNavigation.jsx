/**
 * Mobile Navigation Component
 * Provides optimized mobile navigation with touch-friendly interface
 */

import { Fragment, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import {
  XIcon,
  MenuIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  HomeIcon,
  UsersIcon,
  BriefcaseIcon,
  SettingsIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import Logo from '../ui/Logo';
import { useAuth } from '../../contexts/AuthContext';

// Mobile-optimized navigation structure
const mobileNavigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: HomeIcon,
    highlight: true,
  },
  {
    name: 'Candidates',
    href: '/candidates',
    icon: UsersIcon,
  },
  {
    name: 'Jobs',
    href: '/jobs',
    icon: BriefcaseIcon,
  },
  {
    name: 'More',
    icon: MenuIcon,
    children: [
      { name: 'BPO Dashboard', href: '/bpo' },
      { name: 'Tender Monitor', href: '/tender-monitor' },
      { name: 'Clients', href: '/clients' },
      { name: 'Chat', href: '/chat' },
      { name: 'Deployments', href: '/deployments' },
      { name: 'Payments', href: '/payments' },
      { name: 'Financial Dashboard', href: '/financials' },
      { name: 'Training', href: '/training' },
      { name: 'Gamification', href: '/gamification' },
      { name: 'AI Automation', href: '/ai-automation' },
      { name: 'AI Sourcing', href: '/ai-sourcing' },
      { name: 'ML Dashboard', href: '/ml-dashboard' },
      { name: 'Telegram Groups', href: '/telegram-groups' },
      { name: 'Ad Optimization', href: '/ad-optimization' },
      { name: 'Retention Analytics', href: '/retention-analytics' },
      { name: 'Consultant Performance', href: '/consultant-performance' },
      { name: 'Interview Scheduling', href: '/interview-scheduling' },
    ],
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: SettingsIcon,
    requireAuth: true,
  },
];

/**
 * Mobile Navigation Menu (Slide-out)
 */
export function MobileNavMenu({ isOpen, onClose }) {
  const [expandedSections, setExpandedSections] = useState({});
  const location = useLocation();
  const { user, logout } = useAuth();

  const toggleSection = (name) => {
    setExpandedSections(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-50 lg:hidden" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-sm">
                  <div className="flex h-full flex-col bg-white dark:bg-gray-900 shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                      <Logo size="sm" />
                      <button
                        type="button"
                        className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                        onClick={onClose}
                      >
                        <XIcon className="h-6 w-6" />
                      </button>
                    </div>

                    {/* User Info */}
                    {user && (
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {user.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-4">
                      <ul className="space-y-2">
                        {mobileNavigation.map((item) => (
                          <MobileNavItem
                            key={item.name}
                            item={item}
                            location={location}
                            expandedSections={expandedSections}
                            toggleSection={toggleSection}
                            onClose={onClose}
                          />
                        ))}
                      </ul>
                    </nav>

                    {/* Footer Actions */}
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

/**
 * Mobile Navigation Item
 */
function MobileNavItem({ item, location, expandedSections, toggleSection, onClose }) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedSections[item.name];
  const isActive = location.pathname === item.href;

  if (hasChildren) {
    return (
      <li>
        <button
          onClick={() => toggleSection(item.name)}
          className="w-full flex items-center justify-between px-3 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-3">
            {item.icon && <item.icon className="h-5 w-5" />}
            {item.name}
          </div>
          <ChevronDownIcon
            className={clsx(
              'h-4 w-4 transition-transform',
              isExpanded && 'rotate-180'
            )}
          />
        </button>

        {isExpanded && (
          <ul className="mt-2 ml-8 space-y-1">
            {item.children.map((child) => (
              <li key={child.href}>
                <NavLink
                  to={child.href}
                  onClick={onClose}
                  className={({ isActive }) =>
                    clsx(
                      'block px-3 py-2 text-sm rounded-lg transition-colors',
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                    )
                  }
                >
                  {child.name}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <NavLink
        to={item.href}
        onClick={onClose}
        className={({ isActive }) =>
          clsx(
            'flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-colors',
            isActive
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800',
            item.highlight && !isActive && 'text-blue-600 dark:text-blue-400'
          )
        }
      >
        {item.icon && <item.icon className="h-5 w-5" />}
        {item.name}
      </NavLink>
    </li>
  );
}

/**
 * Bottom Tab Navigation for Mobile
 */
export function MobileTabBar() {
  const location = useLocation();

  const tabItems = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Candidates', href: '/candidates', icon: UsersIcon },
    { name: 'Jobs', href: '/jobs', icon: BriefcaseIcon },
    { name: 'Menu', href: '#', icon: MenuIcon, onClick: 'openMenu' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 lg:hidden z-40">
      <div className="grid grid-cols-4 h-16">
        {tabItems.map((item) => {
          const isActive = location.pathname === item.href;

          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={clsx(
                'flex flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <item.icon
                className={clsx(
                  'h-6 w-6',
                  isActive && 'scale-110'
                )}
              />
              <span className="leading-none">{item.name}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Mobile Header with hamburger menu
 */
export function MobileHeader({ onMenuClick, title }) {
  const { user } = useAuth();

  return (
    <header className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      {/* Left side - Menu button */}
      <button
        onClick={onMenuClick}
        className="p-2 -ml-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <MenuIcon className="h-6 w-6" />
      </button>

      {/* Center - Title or Logo */}
      <div className="flex-1 text-center">
        {title ? (
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {title}
          </h1>
        ) : (
          <Logo size="sm" />
        )}
      </div>

      {/* Right side - User avatar */}
      <div className="flex items-center">
        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
          <span className="text-xs font-medium text-white">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </span>
        </div>
      </div>
    </header>
  );
}

export default MobileNavMenu;