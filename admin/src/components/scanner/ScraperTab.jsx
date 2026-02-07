import React from 'react';
import {
  PlayIcon,
  SquareIcon,
  RotateCcwIcon,
  ZapIcon
} from 'lucide-react';

const formatTime = (t) => {
  if (!t) return 'N/A';
  try { return new Date(t).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' }); }
  catch (e) { return t; }
};

/**
 * ScraperTab
 * Scraper status dashboard + action buttons + recent logs table.
 */
export default function ScraperTab({
  scraperStatus,
  scraperLogs,
  scraperRunning,
  loading,
  onAction
}) {
  const sched = scraperStatus?.scheduler || {};
  const totalJobs = (sched.jobsCompleted || 0) + (sched.jobsFailed || 0);
  const successRate = totalJobs > 0 ? ((sched.jobsCompleted / totalJobs) * 100).toFixed(0) : null;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Scraper Status</h3>

        {scraperStatus ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatusMetric label="Scheduler">
              <div className="flex items-center space-x-2 mt-1">
                <span className={`h-2.5 w-2.5 rounded-full ${scraperRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {scraperRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
            </StatusMetric>
            <StatusMetric label="Last Run" value={formatTime(sched.lastExecution) || 'Never'} />
            <StatusMetric label="Next Run" value={formatTime(sched.nextExecution)} />
            <StatusMetric label="Total Runs" value={sched.jobsExecuted ?? 0} />
            <StatusMetric label="Success Rate" value={successRate != null ? `${successRate}%` : 'N/A'} />
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading scraper status...</p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <ActionButton onClick={() => onAction('start')} icon={PlayIcon} label="Start" color="emerald" />
          <ActionButton onClick={() => onAction('stop')} icon={SquareIcon} label="Stop" color="red" />
          <ActionButton onClick={() => onAction('restart')} icon={RotateCcwIcon} label="Restart" variant="secondary" />
          <ActionButton onClick={() => onAction('trigger')} icon={ZapIcon} label="Run Now" color="indigo" />
        </div>
      </div>

      {/* Logs Table */}
      <LogsTable logs={scraperLogs} loading={loading} />
    </div>
  );
}

function StatusMetric({ label, value, children }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      {children || (
        <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{value}</p>
      )}
    </div>
  );
}

function ActionButton({ onClick, icon: Icon, label, color, variant }) {
  if (variant === 'secondary') {
    return (
      <button
        onClick={onClick}
        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2"
      >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </button>
    );
  }

  const colorClasses = {
    emerald: 'text-white bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600',
    red: 'text-white bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600',
    indigo: 'text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center space-x-2 ${colorClasses[color] || colorClasses.indigo}`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

function LogsTable({ logs, loading }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Scraping Logs</h3>
      </div>
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Timestamp</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">New Tenders</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Duration</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Details</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
          {loading ? (
            <tr>
              <td colSpan="5" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">Loading...</td>
            </tr>
          ) : logs.length === 0 ? (
            <tr>
              <td colSpan="5" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                No scraping logs available
              </td>
            </tr>
          ) : (
            logs.map((log, idx) => (
              <tr key={log.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                  {log.started_at ? new Date(log.started_at).toLocaleString('en-SG') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    log.status === 'completed'
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                      : log.status === 'failed'
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                      : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                  }`}>
                    {log.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                  {log.records_new != null ? `${log.records_new} new / ${log.records_processed || 0} total` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                  {log.duration_seconds != null ? `${log.duration_seconds}s` : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
                  {log.errors || '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
