import {
  SearchIcon,
  UsersIcon,
  DollarSignIcon,
} from 'lucide-react';
import Card from '../ui/Card';
import Badge, { StatusBadge } from '../ui/Badge';
import Table from '../ui/Table';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { clsx } from 'clsx';

function PipelineTenderCard({ tender, onClick }) {
  const daysUntilClose = Math.ceil((new Date(tender.closing_date) - new Date()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysUntilClose <= 7 && daysUntilClose > 0;

  return (
    <div onClick={onClick} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between gap-2 mb-3">
        <Badge variant="info" className="text-2xs">{tender.source?.toUpperCase()}</Badge>
        {isUrgent && <Badge variant="error" className="text-2xs">{daysUntilClose}d left</Badge>}
      </div>
      <h4 className="font-medium text-slate-900 dark:text-white text-sm line-clamp-2 mb-2">{tender.title}</h4>
      <p className="text-xs text-slate-500 mb-3">{tender.agency}</p>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-slate-500">
          <UsersIcon className="h-3 w-3" />
          <span>{tender.manpower_required || '?'} pax</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-600 font-medium">
          <DollarSignIcon className="h-3 w-3" />
          <span>${((tender.estimated_value || 0) / 1000).toFixed(0)}K</span>
        </div>
      </div>
      {tender.win_probability && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Win Probability</span>
            <span className={clsx('font-medium', tender.win_probability >= 60 ? 'text-emerald-600' : tender.win_probability >= 40 ? 'text-amber-600' : 'text-slate-500')}>
              {tender.win_probability}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BPOPipelineChart({
  tenders,
  tendersByStatus,
  loading,
  view,
  setView,
  statusFilter,
  setStatusFilter,
  formatCurrency,
}) {
  const columns = [
    { header: 'Tender', accessor: 'title', render: (value, row) => (<div><p className="font-medium text-slate-900 dark:text-white line-clamp-1">{value}</p><p className="text-xs text-slate-500">{row.external_id}</p></div>) },
    { header: 'Agency', accessor: 'agency' },
    { header: 'Value', accessor: 'estimated_value', render: (value) => <span className="font-medium text-emerald-600">{formatCurrency(value)}</span> },
    { header: 'Headcount', accessor: 'manpower_required', render: (value) => <div className="flex items-center gap-1.5"><UsersIcon className="h-4 w-4 text-slate-400" /><span>{value || '-'}</span></div> },
    { header: 'Win %', accessor: 'win_probability', render: (value) => value ? <span className={clsx('font-medium', value >= 60 ? 'text-emerald-600' : value >= 40 ? 'text-amber-600' : 'text-slate-500')}>{value}%</span> : '-' },
    { header: 'Status', accessor: 'status', render: (value) => <StatusBadge status={value} /> },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {['kanban', 'table'].map((v) => (
            <button key={v} onClick={() => setView(v)} className={clsx('px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize', view === v ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-slate-600 hover:bg-slate-100')}>
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Search tenders..." icon={SearchIcon} className="w-64" />
          <Select value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'All Statuses' }, { value: 'new', label: 'New' }, { value: 'reviewing', label: 'Reviewing' }, { value: 'bidding', label: 'Bidding' }, { value: 'submitted', label: 'Submitted' }]} className="w-40" />
        </div>
      </div>

      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(tendersByStatus).map(([status, statusTenders]) => (
            <div key={status} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-white capitalize">{status}</h3>
                <Badge variant="neutral">{statusTenders.length}</Badge>
              </div>
              <div className="space-y-3 min-h-[200px]">
                {statusTenders.map((tender) => <PipelineTenderCard key={tender.id} tender={tender} />)}
                {statusTenders.length === 0 && (
                  <div className="p-4 text-center text-sm text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">No tenders</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'table' && (
        <Card padding="none">
          <Table columns={columns} data={tenders} loading={loading} emptyMessage="No tenders found" />
        </Card>
      )}
    </>
  );
}
