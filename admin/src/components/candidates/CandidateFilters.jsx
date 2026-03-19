import React from 'react';
import {
  SearchIcon,
  GridIcon,
  ListIcon,
} from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { clsx } from 'clsx';

export function PipelineCard({ status, count, color, onClick, active }) {
  const colors = {
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    slate: 'from-slate-400 to-slate-500',
  };

  const descriptions = {
    total: 'All candidates',
    pending: 'Awaiting verification',
    active: 'Ready to deploy',
    inactive: 'Not available',
  };

  return (
    <button
      onClick={onClick}
      className={clsx(
        'p-4 rounded-xl border-2 transition-all text-left w-full',
        active
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-transparent bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700'
      )}
    >
      <div className={clsx('w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg mb-2', colors[color])}>
        {count}
      </div>
      <p className="font-medium text-slate-900 dark:text-white capitalize">{status}</p>
      <p className="text-xs text-slate-500 mt-0.5">{descriptions[status] || 'Click to filter'}</p>
    </button>
  );
}

export default function CandidateFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  view,
  onViewChange,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search candidates..."
          icon={SearchIcon}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-64"
        />
        <Select
          value={statusFilter}
          onChange={onStatusChange}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'pending', label: 'Pending' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
          className="w-36"
        />
      </div>
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
        <button
          onClick={() => onViewChange('grid')}
          className={clsx(
            'p-2 rounded-md transition-colors',
            view === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'hover:bg-white/50'
          )}
        >
          <GridIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => onViewChange('table')}
          className={clsx(
            'p-2 rounded-md transition-colors',
            view === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'hover:bg-white/50'
          )}
        >
          <ListIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
