import React from 'react';
import { EyeIcon } from 'lucide-react';

export default function EPUAlertsTab({
  alerts,
  alertsPriority,
  setAlertsPriority,
  getPriorityColor
}) {
  return (
    <div className="space-y-4">
      {/* Alert Priority Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <select
          value={alertsPriority}
          onChange={(e) => setAlertsPriority(e.target.value)}
          className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="urgent">Urgent Alerts</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(alert.alert_priority)}`}>
                    {alert.alert_priority}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {alert.tender_no}
                  </span>
                </div>
                <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
                  {alert.title}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  {alert.agency}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Value:</span>
                    <span className="ml-1 font-medium text-slate-900 dark:text-white">
                      ${alert.estimated_value?.toLocaleString() || 'TBD'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Intelligence:</span>
                    <span className="ml-1 font-medium text-slate-900 dark:text-white">
                      {alert.intelligence_score}/100
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Win Probability:</span>
                    <span className="ml-1 font-medium text-slate-900 dark:text-white">
                      {alert.win_probability ? (alert.win_probability * 100).toFixed(0) + '%' : 'TBD'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Closing:</span>
                    <span className="ml-1 font-medium text-slate-900 dark:text-white">
                      {alert.closing_date || 'TBD'}
                    </span>
                  </div>
                </div>
              </div>
              <button className="text-indigo-600 hover:text-indigo-700 ml-4">
                <EyeIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
