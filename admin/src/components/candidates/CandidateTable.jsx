import React from 'react';
import { StarIcon } from 'lucide-react';
import { StatusBadge } from '../ui/Badge';
import Table from '../ui/Table';
import { clsx } from 'clsx';
import { LEVEL_TITLES as levelTitles } from '../../../../shared/utils/gamification-browser';

const getAvatarUrl = (candidate) => {
  if (candidate.profile_photo) return candidate.profile_photo;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(candidate.name)}`;
};

const columns = [
  {
    header: 'Candidate',
    accessor: 'name',
    render: (value, row) => (
      <div className="flex items-center gap-3">
        <img
          src={getAvatarUrl(row)}
          alt={value}
          className="h-10 w-10 rounded-lg object-cover"
        />
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{value}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      </div>
    ),
  },
  {
    header: 'Level',
    accessor: 'level',
    render: (value) => (
      <div className="flex items-center gap-2">
        <div className={clsx(
          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
          value >= 8 ? 'bg-amber-500 text-white' :
          value >= 5 ? 'bg-primary-500 text-white' :
          'bg-slate-200 text-slate-600'
        )}>
          {value}
        </div>
        <span className="text-sm">{levelTitles[value]}</span>
      </div>
    ),
  },
  {
    header: 'XP',
    accessor: 'xp',
    render: (value) => <span className="font-mono text-sm">{(value || 0).toLocaleString()}</span>,
  },
  {
    header: 'Jobs',
    accessor: 'total_jobs_completed',
    render: (value) => value || 0,
  },
  {
    header: 'Rating',
    accessor: 'rating',
    render: (value) => value > 0 ? (
      <div className="flex items-center gap-1">
        <StarIcon className="h-4 w-4 text-amber-500 fill-amber-500" />
        <span>{Number(value).toFixed(1)}</span>
      </div>
    ) : <span className="text-slate-400">-</span>,
  },
  {
    header: 'Status',
    accessor: 'status',
    render: (value) => <StatusBadge status={value} />,
  },
];

export default function CandidateTable({ candidates, onRowClick }) {
  return (
    <Table
      columns={columns}
      data={candidates}
      onRowClick={onRowClick}
    />
  );
}
