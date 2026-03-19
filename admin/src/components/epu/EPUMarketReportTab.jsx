import React from 'react';

export default function EPUMarketReportTab({ marketReport }) {
  if (!marketReport) return null;

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            EPU/SER/19 Market Report
          </h3>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Generated: {new Date(marketReport.generated_at).toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{marketReport.active_opportunities}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Active Opportunities</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ${(marketReport.total_estimated_value / 1000000).toFixed(1)}M
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Market Value</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{marketReport.high_priority_alerts.length}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">High Priority Alerts</div>
          </div>
        </div>
      </div>

      {/* Service Type Analysis */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Service Type Distribution
        </h4>
        <div className="space-y-3">
          {Object.entries(marketReport.service_type_breakdown).map(([type, data]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                {type.replace(/_/g, ' ')}
              </span>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {data.count} opportunities
                </span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  ${(data.estimated_value / 1000).toFixed(0)}K
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agency Analysis */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Top Agencies by Activity
        </h4>
        <div className="space-y-3">
          {Object.entries(marketReport.agency_breakdown).slice(0, 10).map(([agency, data]) => (
            <div key={agency} className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {agency}
              </span>
              <div className="flex items-center space-x-4">
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
  );
}
