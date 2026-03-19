import React from 'react';
import { EyeIcon } from 'lucide-react';

export default function EPUOpportunitiesTab({
  opportunities,
  opportunitiesFilters,
  setOpportunitiesFilters,
  opportunitiesPagination,
  setOpportunitiesPagination,
  loading,
  getPriorityColor
}) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={opportunitiesFilters.priority}
            onChange={(e) => setOpportunitiesFilters(prev => ({ ...prev, priority: e.target.value }))}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={opportunitiesFilters.service_type}
            onChange={(e) => setOpportunitiesFilters(prev => ({ ...prev, service_type: e.target.value }))}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Service Types</option>
            <option value="data_entry">Data Entry</option>
            <option value="administrative">Administrative</option>
            <option value="event_support">Event Support</option>
            <option value="general">General</option>
          </select>

          <input
            type="text"
            placeholder="Agency filter..."
            value={opportunitiesFilters.agency}
            onChange={(e) => setOpportunitiesFilters(prev => ({ ...prev, agency: e.target.value }))}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
          />

          <input
            type="number"
            placeholder="Min Intelligence Score"
            value={opportunitiesFilters.min_score}
            onChange={(e) => setOpportunitiesFilters(prev => ({ ...prev, min_score: parseInt(e.target.value) || 0 }))}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Opportunities Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Opportunity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Intelligence
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Closing Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : opportunities.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                  No opportunities found
                </td>
              </tr>
            ) : (
              opportunities.map((opp) => (
                <tr key={opp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {opp.title}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {opp.agency} • {opp.tender_no}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(opp.alert_priority)}`}>
                      {opp.alert_priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                    ${opp.estimated_value?.toLocaleString() || 'TBD'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mr-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${opp.intelligence_score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {opp.intelligence_score}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                    {opp.closing_date || 'TBD'}
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-indigo-600 hover:text-indigo-700">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {opportunitiesPagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <button
              onClick={() => setOpportunitiesPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={opportunitiesPagination.page === 1}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Page {opportunitiesPagination.page} of {opportunitiesPagination.totalPages}
            </span>
            <button
              onClick={() => setOpportunitiesPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
              disabled={opportunitiesPagination.page === opportunitiesPagination.totalPages}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
