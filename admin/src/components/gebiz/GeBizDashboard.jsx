import React from 'react';
import {
  DatabaseIcon,
  TrendingUpIcon,
} from 'lucide-react';
import GeBizSyncPanel from './GeBizSyncPanel';

export default function GeBizDashboard({ syncStatus, onStartSync, syncing, stats, agencies }) {
  return (
    <div className="space-y-4">
      {/* Sync Status Panel (inline, not modal) */}
      <GeBizSyncPanel
        syncStatus={syncStatus}
        onStartSync={onStartSync}
        syncing={syncing}
      />

      {/* Quick overview when data exists */}
      {stats.totalTenders > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Quick Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalTenders.toLocaleString()}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Historical records in database</p>
            </div>
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalSuppliers.toLocaleString()}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Unique suppliers tracked</p>
            </div>
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{agencies.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Government agencies</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 text-center">
            Use Competitors, Tenders, and Agencies tabs to explore the data
          </p>
        </div>
      )}

      {/* Empty state when no data */}
      {stats.totalTenders === 0 && !syncStatus.is_running && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
          <DatabaseIcon className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No Historical Data Yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Click "Start Sync" above to import historical GeBIZ tender data from Data.gov.sg.
            This will populate the Competitors, Tenders, and Agencies tabs.
          </p>
        </div>
      )}
    </div>
  );
}
