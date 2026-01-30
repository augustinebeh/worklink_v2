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
  MessageSquareIcon,
  BarChart3Icon,
  SettingsIcon,
  FileTextIcon,
  Building2Icon,
  SearchIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XIcon,
  DollarSignIcon,
  TrendingUpIcon,
  TargetIcon,
  BotIcon,
  SparklesIcon,
} from 'lucide-react';
import { clsx } from 'clsx';

// Navigation structure
const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboardIcon,
  },
  {
    name: 'Operations',
    icon: BriefcaseIcon,
    children: [
      { name: 'Candidates', href: '/candidates', icon: UsersIcon },
      { name: 'Jobs', href: '/jobs', icon: BriefcaseIcon },
      { name: 'Deployments', href: '/deployments', icon: CalendarCheckIcon },
      { name: 'Payments', href: '/payments', icon: WalletIcon },
    ],
  },
  {
    name: 'BPO Automation',
    icon: TargetIcon,
    children: [
      { name: 'Tender Dashboard', href: '/bpo', icon: SearchIcon },
      { name: 'AI Automation', href: '/ai-automation', icon: BotIcon, highlight: true },
      { name: 'All Tenders', href: '/tenders', icon: FileTextIcon },
      { name: 'Clients', href: '/clients', icon: Building2Icon },
    ],
  },
  {
    name: 'Engagement',
    icon: TrophyIcon,
    children: [
      { name: 'Training', href: '/training', icon: GraduationCapIcon },
      { name: 'Gamification', href: '/gamification', icon: TrophyIcon },
      { name: 'Chat', href: '/chat', icon: MessageSquareIcon },
    ],
  },
  {
    name: 'Insights',
    icon: BarChart3Icon,
    children: [
      { name: 'Financials', href: '/financials', icon: DollarSignIcon, highlight: true },
      { name: 'Analytics', href: '/analytics', icon: TrendingUpIcon },
      { name: 'Settings', href: '/settings', icon: SettingsIcon },
    ],
  },
];

function NavItem({ item, collapsed, depth = 0 }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  
  // Check if any child is active
  const isChildActive = hasChildren && item.children.some(child => location.pathname === child.href);
  const isActive = location.pathname === item.href;

  if (hasChildren) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            'w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
            isChildActive
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.name}</span>}
          </div>
          {!collapsed && (
            <span className={clsx('transition-transform', isOpen && 'rotate-180')}>
              <ChevronDownIcon className="h-4 w-4" />
            </span>
          )}
        </button>
        
        {!collapsed && isOpen && (
          <div className="ml-4 pl-4 border-l border-slate-200 dark:border-slate-700 space-y-1">
            {item.children.map((child) => (
              <NavLink
                key={child.href}
                to={child.href}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
                    child.highlight && !isActive && 'text-emerald-600 dark:text-emerald-400'
                  )
                }
              >
                <child.icon className="h-4 w-4 flex-shrink-0" />
                <span>{child.name}</span>
                {child.highlight && (
                  <span className="ml-auto px-1.5 py-0.5 text-2xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded">
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
          'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
          isActive
            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        )
      }
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && <span>{item.name}</span>}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onClose, isMobile }) {
  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64',
        isMobile && 'shadow-xl'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">TV</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">TalentVis</h1>
              <p className="text-2xs text-slate-500 dark:text-slate-400 -mt-0.5">Command Center</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <span className="text-white font-bold text-sm">TV</span>
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

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        {!collapsed && (
          <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              TalentVis Platform v2.0
            </p>
            <p className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">
              © 2025 TalentVis Singapore
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
