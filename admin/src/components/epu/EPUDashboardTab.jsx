import React from 'react';
import { EyeIcon } from 'lucide-react';

export default function EPUDashboardTab({ dashboardData, getPriorityColor }) {
  return (
    <div className="space-y-6">
      {/* Recent High Priority Opportunities */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Recent High Priority Opportunities
        </h3>
        <div className="space-y-3">
          {dashboardData.recent_opportunities.slice(0, 5).map((opp, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-slate-900 dark:text-white">{opp.title}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {opp.agency} • ${opp.estimated_value?.toLocaleString()} • Score: {opp.intelligence_score}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(opp.alert_priority)}`}>
                  {opp.alert_priority}
                </span>
                <button className="text-indigo-600 hover:text-indigo-700">
                  <EyeIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Service Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Service Type Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(dashboardData.service_breakdown).map(([type, data]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                  {type.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {data.count} tenders
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    ${(data.estimated_value / 1000).toFixed(0)}K
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Top Agencies
          </h3>
          <div className="space-y-3">
            {Object.entries(dashboardData.agency_breakdown).slice(0, 5).map(([agency, data]) => (
              <div key={agency} className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {agency}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {data.count} tenders
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    ${(data.estimated_value / 1000).toFixed(0)}K
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
