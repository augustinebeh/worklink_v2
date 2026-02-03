import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { PageTransition } from './PageTransition';
import { MobileNavMenu, MobileTabBar, MobileHeader } from './MobileNavigation';
import { clsx } from 'clsx';

export default function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
          mobileOpen={false}
          onMobileClose={() => {}}
        />
      </div>

      {/* Mobile Navigation */}
      <MobileNavMenu
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className={clsx(
        'transition-all duration-300 pb-16 lg:pb-0', // Add bottom padding on mobile for tab bar
        sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-72'
      )}>
        {/* Mobile Header */}
        <MobileHeader
          onMenuClick={() => setMobileSidebarOpen(true)}
          title={getPageTitle(location.pathname)}
        />

        {/* Desktop Header */}
        <div className="hidden lg:block">
          <Header
            onMenuClick={() => setMobileSidebarOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
          />
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <MobileTabBar />
    </div>
  );
}

/**
 * Get page title based on pathname
 */
function getPageTitle(pathname) {
  const routes = {
    '/': 'Dashboard',
    '/candidates': 'Candidates',
    '/jobs': 'Jobs',
    '/clients': 'Clients',
    '/bpo': 'BPO Dashboard',
    '/tender-monitor': 'Tender Monitor',
    '/chat': 'Chat',
    '/settings': 'Settings',
    '/financials': 'Financials',
    '/training': 'Training',
    '/gamification': 'Gamification',
  };

  return routes[pathname] || 'WorkLink Admin';
}
}
