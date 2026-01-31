import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboardIcon,
  UsersIcon,
  BriefcaseIcon,
  CalendarCheckIcon,
  WalletIcon,
  GraduationCapIcon,
  TrophyIcon,
  BarChart3Icon,
  SettingsIcon,
  Building2Icon,
  ChevronDownIcon,
  XIcon,
  DollarSignIcon,
  TargetIcon,
  BellIcon,
  SparklesIcon,
} from 'lucide-react';
import { clsx } from 'clsx';

// Simplified navigation - removed redundant pages
const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboardIcon,
    description: 'Overview & guides',
  },
  {
    name: 'Operations',
    icon: BriefcaseIcon,
    description: 'Daily workflow',
    children: [
      { name: 'Candidates', href: '/candidates', icon: UsersIcon, description: 'Your talent pool' },
      { name: 'Jobs', href: '/jobs', icon: BriefcaseIcon, description: 'Job postings' },
      { name: 'Deployments', href: '/deployments', icon: CalendarCheckIcon, description: 'Worker assignments' },
      { name: 'Payments', href: '/payments', icon: WalletIcon, description: 'Pay workers' },
    ],
  },
  {
    name: 'Sales & Tenders',
    icon: TargetIcon,
    description: 'Win new business',
    children: [
      { name: 'Tender Pipeline', href: '/bpo', icon: TargetIcon, description: 'All tenders' },
      { name: 'Tender Alerts', href: '/tender-monitor', icon: BellIcon, highlight: true, description: 'Keyword monitoring' },
      { name: 'Clients', href: '/clients', icon: Building2Icon, description: 'Your clients' },
    ],
  },
  {
    name: 'Performance',
    icon: BarChart3Icon,
    description: 'Track success',
    children: [
      { name: 'Financials', href: '/financials', icon: DollarSignIcon, description: 'Revenue & profit' },
      { name: 'Gamification', href: '/gamification', icon: TrophyIcon, description: 'Worker engagement' },
      { name: 'Training', href: '/training', icon: GraduationCapIcon, description: 'Certifications' },
    ],
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: SettingsIcon,
    description: 'Configuration',
  },
];

function NavItem({ item, collapsed }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  
  const isChildActive = hasChildren && item.children.some(child => location.pathname === child.href);
  const isActive = location.pathname === item.href;

  if (hasChildren) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            'w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all',
            isChildActive
              ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <div className="flex items-center gap-3">
            <div className={clsx(
              'p-1.5 rounded-lg',
              isChildActive ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-slate-100 dark:bg-slate-800'
            )}>
              <item.icon className="h-4 w-4" />
            </div>
            {!collapsed && (
              <div className="text-left">
                <span className="block">{item.name}</span>
                {item.description && (
                  <span className="text-2xs text-slate-400 font-normal">{item.description}</span>
                )}
              </div>
            )}
          </div>
          {!collapsed && (
            <span className={clsx('transition-transform', isOpen && 'rotate-180')}>
              <ChevronDownIcon className="h-4 w-4" />
            </span>
          )}
        </button>
        
        {!collapsed && isOpen && (
          <div className="ml-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-1">
            {item.children.map((child) => (
              <NavLink
                key={child.href}
                to={child.href}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all group',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
                    child.highlight && !isActive && 'text-emerald-600 dark:text-emerald-400'
                  )
                }
              >
                <child.icon className="h-4 w-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="block">{child.name}</span>
                </div>
                {child.highlight && (
                  <span className="px-1.5 py-0.5 text-2xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                    NEW
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all',
          isActive
            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        )
      }
    >
      <div className={clsx(
        'p-1.5 rounded-lg',
        isActive ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-slate-100 dark:bg-slate-800'
      )}>
        <item.icon className="h-4 w-4" />
      </div>
      {!collapsed && (
        <div className="text-left">
          <span className="block">{item.name}</span>
          {item.description && (
            <span className="text-2xs text-slate-400 font-normal">{item.description}</span>
          )}
        </div>
      )}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onClose, isMobile }) {
  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-72',
        isMobile && 'shadow-xl'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <SparklesIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">WorkLink</h1>
              <p className="text-2xs text-slate-500 dark:text-slate-400 -mt-0.5">Recruitment Platform</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600 flex items-center justify-center">
            <SparklesIcon className="h-5 w-5 text-white" />
          </div>
        )}
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <XIcon className="h-5 w-5 text-slate-500" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {navigation.map((item) => (
          <NavItem key={item.name} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Quick Tips Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 border border-primary-100 dark:border-primary-800">
            <div className="flex items-center gap-2 mb-2">
              <SparklesIcon className="h-4 w-4 text-primary-500" />
              <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">Pro Tip</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Check GeBIZ daily for new tenders. Set up keyword alerts to never miss an opportunity!
            </p>
          </div>
          <p className="text-2xs text-slate-400 text-center mt-3">
            WorkLink v2.0 • © 2025
          </p>
        </div>
      )}
    </aside>
  );
}
