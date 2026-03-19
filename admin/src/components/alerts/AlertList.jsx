import React from 'react';
import { BellIcon, CheckIcon } from 'lucide-react';
import AlertCard from './AlertCard';

/**
 * AlertList - Renders the alert list with selection checkboxes,
 * loading/error/empty states, and pagination controls.
 */
export default function AlertList({
  alerts,
  loading,
  error,
  selectedAlerts,
  onSelectAlert,
  onAcknowledge,
  onRetry,
  hasFilters,
  pagination,
  onPageChange,
}) {
  return (
    <>
      {/* Content */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 dark:text-red-400 mb-2">{error}</div>
            <button
              onClick={onRetry}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              Try again
            </button>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12">
            <BellIcon className="h-12 w-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No alerts found
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {hasFilters ? 'Try adjusting your filters' : 'You\'re all caught up!'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-4 p-4">
                <input
                  type="checkbox"
                  checked={selectedAlerts.includes(alert.id)}
                  onChange={() => onSelectAlert(alert.id)}
                  className="mt-2 rounded border-slate-300 dark:border-slate-600"
                />
                <div className="flex-1">
                  <AlertCard
                    alert={alert}
                    onAcknowledge={onAcknowledge}
                    compact={false}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {alerts.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} alerts
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(0, pagination.offset - pagination.limit))}
              disabled={pagination.offset === 0}
              className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.offset + pagination.limit)}
              disabled={pagination.offset + pagination.limit >= pagination.total}
              className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
