import React from 'react';
import { CalendarIcon } from 'lucide-react';
import { formatCurrency, formatDate } from '../../shared/utils/formatters';

/**
 * Get probability color class based on percentage
 */
function getProbabilityColor(probability) {
  if (probability >= 80) return 'text-green-600 bg-green-50';
  if (probability >= 60) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
}

/**
 * Get urgency badge for a renewal based on days until RFP
 */
function getUrgencyBadge(renewal) {
  const daysUntilRfp = renewal.days_until_rfp || 0;

  if (daysUntilRfp < 0) {
    return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">Overdue</span>;
  }
  if (daysUntilRfp <= 30) {
    return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">Imminent</span>;
  }
  if (daysUntilRfp <= 90) {
    return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">Approaching</span>;
  }
  return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">Future</span>;
}

export default function RenewalPipelineTable({
  renewals,
  loading,
  filters,
  pagination,
  onPageChange
}) {
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Agency & Contract
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                End Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Probability
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Assigned To
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {renewals.map((renewal) => (
              <tr key={renewal.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{renewal.agency}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {renewal.contract_description || 'No description'}
                    </div>
                    {renewal.incumbent_supplier && (
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        Current: {renewal.incumbent_supplier}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                  {renewal.contract_value ? formatCurrency(renewal.contract_value) : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                  <div>
                    {formatDate(renewal.contract_end_date)}
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {renewal.months_until_expiry > 0
                        ? `${renewal.months_until_expiry} months`
                        : 'Expired'
                      }
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProbabilityColor(renewal.renewal_probability)}`}>
                    {renewal.renewal_probability}%
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col space-y-1">
                    <span className="capitalize text-sm text-slate-900 dark:text-white">
                      {renewal.engagement_status?.replace('_', ' ') || 'Not Started'}
                    </span>
                    {getUrgencyBadge(renewal)}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                  {renewal.assigned_bd_manager || (
                    <span className="text-slate-400 dark:text-slate-500">Unassigned</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-slate-800 px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => onPageChange(Math.max(pagination.page - 1, 1))}
              disabled={pagination.page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(Math.min(pagination.page + 1, totalPages))}
              disabled={pagination.page === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Showing{' '}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.total}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {/* Page numbers would go here - simplified for now */}
                <button
                  onClick={() => onPageChange(Math.max(pagination.page - 1, 1))}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => onPageChange(Math.min(pagination.page + 1, totalPages))}
                  disabled={pagination.page === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {renewals.length === 0 && !loading && (
        <div className="text-center py-12">
          <CalendarIcon className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600" />
          <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No renewals found</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {filters.search || filters.min_probability > 0 || filters.agency
              ? 'Try adjusting your filters'
              : 'No renewal opportunities in the pipeline yet'
            }
          </p>
        </div>
      )}
    </div>
  );
}
