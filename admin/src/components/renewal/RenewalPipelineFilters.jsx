import React from 'react';
import {
  BarChart3Icon,
  TrendingUpIcon,
  ClockIcon
} from 'lucide-react';
import RenewalFilters from './RenewalFilters';
import { formatCurrency } from '../../shared/utils/formatters';

export default function RenewalPipelineFilters({
  stats,
  filters,
  onFiltersChange,
  loading,
  totalCount
}) {
  return (
    <>
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Pipeline</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.summary.total_renewals || 0}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <BarChart3Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Next 6 Months</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">{stats.summary.next_6_months || 0}</p>
              </div>
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <ClockIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">High Probability</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-300">{stats.summary.high_probability || 0}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <TrendingUpIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pipeline Value</p>
                <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-300">
                  {formatCurrency(stats.summary.total_value || 0)}
                </p>
              </div>
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                <BarChart3Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <RenewalFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        loading={loading}
        totalCount={totalCount}
      />
    </>
  );
}
