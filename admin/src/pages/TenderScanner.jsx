import React from 'react';
import {
  RefreshCwIcon,
  RadioIcon,
  BellIcon,
  ActivityIcon,
  GlobeIcon,
  CheckCircleIcon
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import {
  useScanner,
  ScannerKpiCards,
  LiveFeedTab,
  AlertsTab,
  ScraperTab,
  PortalsTab
} from '../components/scanner';

const TABS = [
  { id: 'feed', name: 'Live Feed', icon: RadioIcon },
  { id: 'alerts', name: 'Alerts & Keywords', icon: BellIcon },
  { id: 'scraper', name: 'Scraper Controls', icon: ActivityIcon },
  { id: 'portals', name: 'Portals & Sources', icon: GlobeIcon }
];

/**
 * TenderScanner Page
 * Thin shell: header, KPI cards, tab bar, and delegates to tab components.
 * All state and logic lives in useScanner hook.
 */
export default function TenderScanner() {
  const toast = useToast();
  const scanner = useScanner(toast);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Live Feed Scanner</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Discover new tenders, manage alerts &amp; control scraping
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {scanner.unreadCount > 0 && (
            <button
              onClick={scanner.handleMarkRead}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2"
            >
              <CheckCircleIcon className="h-4 w-4" />
              <span>Mark All Read</span>
            </button>
          )}
          <button
            onClick={scanner.refreshAll}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 flex items-center space-x-2"
          >
            <RefreshCwIcon className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <ScannerKpiCards
        feedStats={scanner.feedStats}
        unreadCount={scanner.unreadCount}
        activeAlertCount={scanner.activeAlertCount}
        scraperRunning={scanner.scraperRunning}
      />

      {/* Tab Bar */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => scanner.setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${scanner.activeTab === tab.id
                    ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}
                `}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {scanner.activeTab === 'feed' && (
          <LiveFeedTab
            feedTenders={scanner.feedTenders}
            feedSearch={scanner.feedSearch}
            setFeedSearch={scanner.setFeedSearch}
            feedFilter={scanner.feedFilter}
            setFeedFilter={scanner.setFeedFilter}
            activePortals={scanner.activePortals}
            loading={scanner.loading}
            onAddToPipeline={scanner.handleAddToPipeline}
            onDismiss={scanner.handleDismiss}
            categories={scanner.categories}
            enabledCategories={scanner.enabledCategories}
            onToggleCategory={scanner.handleToggleCategory}
          />
        )}

        {scanner.activeTab === 'alerts' && (
          <AlertsTab
            alerts={scanner.alerts}
            loading={scanner.loading}
            showNewAlert={scanner.showNewAlert}
            setShowNewAlert={scanner.setShowNewAlert}
            newAlertKeyword={scanner.newAlertKeyword}
            setNewAlertKeyword={scanner.setNewAlertKeyword}
            newAlertSource={scanner.newAlertSource}
            setNewAlertSource={scanner.setNewAlertSource}
            onCreateAlert={scanner.handleCreateAlert}
            onToggleAlert={scanner.handleToggleAlert}
            onDeleteAlert={scanner.handleDeleteAlert}
          />
        )}

        {scanner.activeTab === 'scraper' && (
          <ScraperTab
            scraperStatus={scanner.scraperStatus}
            scraperLogs={scanner.scraperLogs}
            scraperRunning={scanner.scraperRunning}
            loading={scanner.loading}
            onAction={scanner.handleScraperAction}
          />
        )}

        {scanner.activeTab === 'portals' && (
          <PortalsTab
            portals={scanner.portals}
            portalsLoading={scanner.portalsLoading}
            onTogglePortal={scanner.handleTogglePortal}
            categories={scanner.categories}
            enabledCategories={scanner.enabledCategories}
            onToggleCategory={scanner.handleToggleCategory}
          />
        )}
      </div>
    </div>
  );
}
