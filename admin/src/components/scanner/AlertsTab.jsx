import React from 'react';
import {
  PlusIcon,
  XIcon,
  TrashIcon,
  CheckCircleIcon
} from 'lucide-react';

const RECOMMENDED_KEYWORDS = [
  'manpower',
  'temporary staff',
  'cleaning services',
  'security services',
  'event support',
  'customer service'
];

/**
 * AlertsTab
 * Keyword alerts management: create, toggle, delete alerts + recommended keywords.
 */
export default function AlertsTab({
  alerts,
  loading,
  showNewAlert,
  setShowNewAlert,
  newAlertKeyword,
  setNewAlertKeyword,
  newAlertSource,
  setNewAlertSource,
  onCreateAlert,
  onToggleAlert,
  onDeleteAlert
}) {
  return (
    <div className="space-y-6">
      {/* Header + New Alert button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Keyword Alerts</h3>
        <button
          onClick={() => setShowNewAlert(!showNewAlert)}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 flex items-center space-x-2"
        >
          <PlusIcon className="h-4 w-4" />
          <span>New Alert</span>
        </button>
      </div>

      {/* New Alert Form */}
      {showNewAlert && (
        <NewAlertForm
          keyword={newAlertKeyword}
          setKeyword={setNewAlertKeyword}
          source={newAlertSource}
          setSource={setNewAlertSource}
          onCreate={onCreateAlert}
          onCancel={() => { setShowNewAlert(false); setNewAlertKeyword(''); }}
        />
      )}

      {/* Alerts Table */}
      <AlertsTable
        alerts={alerts}
        loading={loading}
        onToggle={onToggleAlert}
        onDelete={onDeleteAlert}
      />

      {/* Recommended Keywords */}
      <RecommendedKeywords
        alerts={alerts}
        onSelect={(kw) => { setNewAlertKeyword(kw); setShowNewAlert(true); }}
      />
    </div>
  );
}

function NewAlertForm({ keyword, setKeyword, source, setSource, onCreate, onCancel }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-indigo-200 dark:border-indigo-700 p-4">
      <div className="flex items-end space-x-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Keyword</label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. cleaning services"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
          >
            <option value="gebiz">GeBIZ</option>
            <option value="all">All Sources</option>
          </select>
        </div>
        <button
          onClick={onCreate}
          disabled={!keyword.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 dark:bg-emerald-500 rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function AlertsTable({ alerts, loading, onToggle, onDelete }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Keyword</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Source</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Matches</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Unread</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
          {loading ? (
            <tr>
              <td colSpan="6" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">Loading...</td>
            </tr>
          ) : alerts.length === 0 ? (
            <tr>
              <td colSpan="6" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                No alerts configured. Add a keyword above to start watching.
              </td>
            </tr>
          ) : (
            alerts.map((alert) => (
              <tr key={alert.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                  {alert.keyword}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                  {alert.source || 'gebiz'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                  {alert.match_count || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {(alert.unread || 0) > 0 ? (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                      {alert.unread}
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">0</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => onToggle(alert.id, alert.status)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      alert.status === 'active'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {alert.status === 'active' ? 'Active' : 'Paused'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => onDelete(alert.id)}
                    className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function RecommendedKeywords({ alerts, onSelect }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Recommended Keywords</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        Common BPO-related keywords to help you discover relevant tenders faster.
      </p>
      <div className="flex flex-wrap gap-2">
        {RECOMMENDED_KEYWORDS.map((kw) => {
          const exists = alerts.some((a) => a.keyword.toLowerCase() === kw.toLowerCase());
          return (
            <button
              key={kw}
              disabled={exists}
              onClick={() => onSelect(kw)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center space-x-1 ${
                exists
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800'
              }`}
            >
              <PlusIcon className="h-3 w-3" />
              <span>{kw}</span>
              {exists && <CheckCircleIcon className="h-3 w-3 ml-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
