import React from 'react';
import { InboxIcon, BellIcon, TagIcon, ZapIcon } from 'lucide-react';

/**
 * ScannerKpiCards
 * Four KPI stat cards shown at top of scanner page.
 */
export default function ScannerKpiCards({ feedStats, unreadCount, activeAlertCount, scraperRunning }) {
  const cards = [
    {
      label: 'Open Tenders',
      value: feedStats.open || 0,
      icon: InboxIcon,
      color: 'text-indigo-600 dark:text-indigo-400'
    },
    {
      label: 'Unread Matches',
      value: unreadCount,
      icon: BellIcon,
      color: 'text-amber-600 dark:text-amber-400'
    },
    {
      label: 'Active Alerts',
      value: activeAlertCount,
      icon: TagIcon,
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: 'Scraper Status',
      value: null, // special rendering
      icon: ZapIcon,
      color: 'text-green-600 dark:text-green-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{card.label}</p>
                {card.label === 'Scraper Status' ? (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`h-3 w-3 rounded-full ${scraperRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {scraperRunning ? 'Running' : 'Stopped'}
                    </p>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
                )}
              </div>
              <Icon className={`h-8 w-8 ${card.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
