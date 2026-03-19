import React from 'react';
import {
  DatabaseIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  Loader2Icon,
  PlayIcon,
  ActivityIcon,
} from 'lucide-react';

export default function GeBizSyncPanel({ syncStatus, onStartSync, syncing }) {
  const { is_running, stage, progress, message, stats, elapsed_seconds, error_messages } = syncStatus;

  const formatElapsed = (seconds) => {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getProgressColor = () => {
    if (stage === 'error') return 'bg-red-500';
    if (stage === 'complete') return 'bg-green-500';
    return 'bg-indigo-500';
  };

  const getStageLabel = () => {
    const labels = {
      idle: 'Idle',
      initializing: 'Initializing',
      starting: 'Starting',
      checking: 'Checking DB',
      fetching: 'Fetching Data',
      processing: 'Processing',
      importing: 'Importing',
      complete: 'Complete',
      error: 'Error'
    };
    return labels[stage] || stage;
  };

  const getStageIcon = () => {
    if (stage === 'complete') return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    if (stage === 'error') return <AlertCircleIcon className="h-5 w-5 text-red-500" />;
    if (is_running) return <Loader2Icon className="h-5 w-5 text-indigo-500 animate-spin" />;
    return <DatabaseIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Sync Control Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStageIcon()}
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Data.gov.sg Sync
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {is_running ? message || 'Syncing historical tender data...' : stage === 'complete' ? 'Last sync completed successfully' : stage === 'error' ? 'Last sync encountered an error' : 'Sync GeBIZ historical tender data from Data.gov.sg'}
              </p>
            </div>
          </div>
          <button
            onClick={onStartSync}
            disabled={is_running || syncing}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {is_running ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4" />
                <span>Start Sync</span>
              </>
            )}
          </button>
        </div>

        {/* Progress Bar */}
        {(is_running || stage === 'complete' || stage === 'error') && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {getStageLabel()}
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {progress}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Live Stats Cards */}
      {(is_running || stage === 'complete' || stage === 'error') && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center space-x-2 mb-1">
              <ActivityIcon className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Fetched</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {(stats?.total_fetched || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center space-x-2 mb-1">
              <DatabaseIcon className="h-4 w-4 text-green-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Inserted</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {(stats?.total_inserted || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center space-x-2 mb-1">
              <ClockIcon className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Elapsed</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {formatElapsed(elapsed_seconds)}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center space-x-2 mb-1">
              <AlertCircleIcon className="h-4 w-4 text-red-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Errors</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {stats?.errors || 0}
            </p>
          </div>
        </div>
      )}

      {/* Error messages */}
      {error_messages && error_messages.length > 0 && stage === 'error' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Recent Errors</p>
          <ul className="text-xs text-red-700 dark:text-red-400 space-y-1">
            {error_messages.map((err, i) => (
              <li key={i} className="truncate">&bull; {err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
