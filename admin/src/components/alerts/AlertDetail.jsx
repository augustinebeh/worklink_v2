import React from 'react';
import { CheckIcon, FilterIcon } from 'lucide-react';

/**
 * AlertFilters - Filter panel for alerts (priority, type, status).
 */
function AlertFilters({ filters, onFilterChange, onClearFilters, show }) {
  if (!show) return null;

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Priority
          </label>
          <select
            value={filters.priority}
            onChange={(e) => onFilterChange('priority', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Type
          </label>
          <select
            value={filters.trigger_type}
            onChange={(e) => onFilterChange('trigger_type', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="">All Types</option>
            <option value="tender">Tender</option>
            <option value="renewal">Renewal</option>
            <option value="deadline">Deadline</option>
            <option value="system">System</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Status
          </label>
          <select
            value={filters.unread_only ? 'unread' : 'all'}
            onChange={(e) => onFilterChange('unread_only', e.target.value === 'unread')}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="all">All Alerts</option>
            <option value="unread">Unread Only</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={onClearFilters}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * AlertBulkActions - Bulk action bar shown when alerts are selected.
 */
function AlertBulkActions({ selectedCount, onBulkMarkRead, onCancel }) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg border border-primary-200 dark:border-primary-700 mb-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-primary-800 dark:text-primary-200">
          {selectedCount} alert{selectedCount > 1 ? 's' : ''} selected
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onBulkMarkRead}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            <CheckIcon className="h-4 w-4" />
            Mark as Read
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * AlertGlobalActions - Select all / Mark all read bar.
 */
function AlertGlobalActions({
  alerts,
  selectedAlerts,
  unreadCount,
  onSelectAll,
  onMarkAllRead,
}) {
  if (unreadCount === 0) return null;

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onSelectAll}
          className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-2"
        >
          <input
            type="checkbox"
            checked={selectedAlerts.length === alerts.length && alerts.length > 0}
            onChange={onSelectAll}
            className="rounded border-slate-300 dark:border-slate-600"
          />
          Select All
        </button>
      </div>

      <button
        onClick={onMarkAllRead}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
      >
        <CheckIcon className="h-4 w-4" />
        Mark All as Read
      </button>
    </div>
  );
}

/**
 * AlertStats - Stats row showing total, unread, read, and selected counts.
 */
function AlertStats({ totalCount, unreadCount, selectedCount }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {totalCount}
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">Total Alerts</div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
          {unreadCount}
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">Unread</div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
          {totalCount - unreadCount}
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">Read</div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {selectedCount}
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">Selected</div>
      </div>
    </div>
  );
}

export { AlertFilters, AlertBulkActions, AlertGlobalActions, AlertStats };
