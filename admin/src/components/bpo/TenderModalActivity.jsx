/**
 * Tender Modal Activity Component
 * Displays the activity timeline for a tender detail modal
 */

import { HistoryIcon } from 'lucide-react';

export default function TenderModalActivity({ activities, loadingActivities }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <HistoryIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Activity Timeline</label>
      </div>
      {loadingActivities ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No activity recorded yet.</p>
      ) : (
        <div className="space-y-3 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-slate-700">
          {activities.map((act, idx) => (
            <div key={idx} className="flex items-start gap-3 relative">
              <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 z-10 ${
                act.type === 'created' ? 'bg-blue-500' :
                act.type === 'stage_change' ? 'bg-amber-500' :
                act.type === 'decision' ? 'bg-purple-500' :
                act.type === 'outcome' ? 'bg-green-500' : 'bg-slate-400'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 dark:text-slate-300">{act.detail}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{new Date(act.date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
