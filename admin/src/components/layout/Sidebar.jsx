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
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  DollarSignIcon,
  TargetIcon,
  BellIcon,
  SparklesIcon,
  MessageCircleIcon,
  BotIcon,
  FileTextIcon,
  SendIcon,
  SearchIcon,
  BrainIcon,
  ZapIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import Logo, { LogoIcon } from '../ui/Logo';
import { useAdminWebSocket } from '../../contexts/WebSocketContext';

// Navigation organized by role/focus area
const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboardIcon,
    description: 'Overview & guides',
  },

  // === BPO & TENDER ACQUISITION ===
  {
    name: 'BPO & Tenders',
    icon: TargetIcon,
    description: 'Tender acquisition',
    badge: 'BPO',
    children: [
      { name: 'Tender Pipeline', href: '/bpo', icon: FileTextIcon, description: 'View all tenders' },
      { name: 'Tender Alerts', href: '/tender-monitor', icon: BellIcon, highlight: true, description: 'GeBIZ monitoring' },
      { name: 'Tender AI Tools', href: '/ai-automation', icon: BotIcon, description: 'Scraper & analysis' },
      { name: 'Clients', href: '/clients', icon: Building2Icon, description: 'Client management' },
    ],
  },

  // === CANDIDATE RECRUITMENT ===
  {
    name: 'Recruitment',
    icon: UsersIcon,
    description: 'Candidate acquisition',
    badge: 'HR',
    children: [
      { name: 'Candidates', href: '/candidates', icon: UsersIcon, description: 'Talent pool' },
      { name: 'Jobs', href: '/jobs', icon: BriefcaseIcon, description: 'Job postings' },
      { name: 'Sourcing AI', href: '/ai-sourcing', icon: SearchIcon, description: 'Posting & outreach' },
      { name: 'Telegram Groups', href: '/telegram-groups', icon: SendIcon, description: 'Group posting' },
      { name: 'Chat', href: '/chat', icon: MessageCircleIcon, description: 'Message workers', showUnreadBadge: true },
    ],
  },

  // === AI & MACHINE LEARNING ===
  {
    name: 'AI & ML',
    icon: BrainIcon,
    description: 'Intelligence & learning',
    badge: 'AI',
    children: [
      { name: 'ML Dashboard', href: '/ml-dashboard', icon: BrainIcon, highlight: true, description: 'Knowledge base' },
      { name: 'Ad Optimization', href: '/ad-optimization', icon: ZapIcon, highlight: true, description: 'A/B testing' },
    ],
  },

  // === OPERATIONS (Active work) ===
  {
    name: 'Operations',
    icon: CalendarCheckIcon,
    description: 'Day-to-day work',
    children: [
      { name: 'Deployments', href: '/deployments', icon: CalendarCheckIcon, description: 'Worker assignments' },
      { name: 'Payments', href: '/payments', icon: WalletIcon, description: 'Pay workers' },
    ],
  },

  // === PERFORMANCE ===
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

function NavItem({ item, collapsed, unreadTotal = 0 }) {
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
          aria-expanded={isOpen}
          aria-controls={`nav-section-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
          className={clsx(
            'w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary-500/50',
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
              <div className="text-left flex-1">
                <div className="flex items-center gap-2">
                  <span className="block">{item.name}</span>
                  {item.badge && (
                    <span className={clsx(
                      'px-1.5 py-0.5 text-2xs font-semibold rounded',
                      item.badge === 'BPO' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                      item.badge === 'HR' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    )}>
                      {item.badge}
                    </span>
                  )}
                </div>
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
          <div
            id={`nav-section-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
            className="ml-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-1"
            role="group"
            aria-label={`${item.name} navigation`}
          >
            {item.children.map((child) => (
              <NavLink
                key={child.href}
                to={child.href}
                aria-current={location.pathname === child.href ? 'page' : undefined}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2 min-h-[40px] text-sm rounded-lg transition-all group focus:outline-none focus:ring-2 focus:ring-primary-500/50',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
                    child.highlight && !isActive && 'text-emerald-600 dark:text-emerald-400'
                  )
                }
              >
                <child.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <span className="block">{child.name}</span>
                </div>
                {child.showUnreadBadge && unreadTotal > 0 && (
                  <span className="px-2 py-0.5 text-2xs font-bold bg-red-500 text-white rounded-full min-w-[20px] text-center">
                    {unreadTotal > 99 ? '99+' : unreadTotal}
                  </span>
                )}
                {child.highlight && !child.showUnreadBadge && (
                  <span className="px-1.5 py-0.5 text-2xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full" aria-label="New feature">
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
      aria-current={isActive ? 'page' : undefined}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2.5 min-h-[44px] text-sm font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/50',
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
        <item.icon className="h-4 w-4" aria-hidden="true" />
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

export default function Sidebar({ collapsed, onCollapse, mobileOpen, onMobileClose }) {
  const { unreadTotal } = useAdminWebSocket();
  const isMobile = mobileOpen !== undefined;

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-72',
        // On mobile: hidden by default, shown when mobileOpen is true
        isMobile && !mobileOpen && 'max-lg:-translate-x-full',
        isMobile && mobileOpen && 'shadow-xl'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
        {!collapsed && <Logo size="md" />}
        {collapsed && <LogoIcon size={40} className="mx-auto" />}
        {mobileOpen && onMobileClose && (
          <button
            onClick={onMobileClose}
            aria-label="Close sidebar"
            className="p-2 min-h-[40px] min-w-[40px] rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/50 lg:hidden"
          >
            <XIcon className="h-5 w-5 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2" aria-label="Main navigation">
        {navigation.map((item) => (
          <NavItem key={item.name} item={item} collapsed={collapsed} unreadTotal={unreadTotal} />
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

      {/* Collapse Toggle Button - Desktop only */}
      <button
        onClick={() => onCollapse?.(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={clsx(
          'hidden lg:flex absolute -right-3 top-20 h-6 w-6 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/50'
        )}
      >
        {collapsed ? (
          <ChevronRightIcon className="h-4 w-4" />
        ) : (
          <ChevronLeftIcon className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
