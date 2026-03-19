import React from 'react';

export default function EPUCompetitorsTab({
  competitors,
  competitorFilters,
  setCompetitorFilters,
  getThreatColor
}) {
  return (
    <div className="space-y-4">
      {/* Competitor Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <select
          value={competitorFilters.service_type}
          onChange={(e) => setCompetitorFilters(prev => ({ ...prev, service_type: e.target.value }))}
          className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Service Types</option>
          <option value="data_entry">Data Entry</option>
          <option value="administrative">Administrative</option>
          <option value="event_support">Event Support</option>
        </select>
      </div>

      {/* Competitors Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Competitor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Threat Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Win Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Threat Score
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {competitors.map((comp) => (
              <tr key={comp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {comp.company_name}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {comp.total_epu_contracts} contracts
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${getThreatColor(comp.threat_level)}`}></div>
                    <span className="text-sm text-slate-900 dark:text-white capitalize">
                      {comp.threat_level}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                  {(comp.win_rate * 100).toFixed(0)}%
                </td>
                <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                  ${comp.total_epu_value?.toLocaleString() || '0'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mr-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{ width: `${comp.overall_threat_score}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {comp.overall_threat_score}/100
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
