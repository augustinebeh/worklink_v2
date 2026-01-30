import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CalendarIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon,
  UserIcon,
  MapPinIcon,
  DollarSignIcon,
  FilterIcon,
  SearchIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge, { StatusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import { clsx } from 'clsx';

const formatCurrency = (value) => new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 2 }).format(value || 0);

function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };
  
  return (
    <Card className="text-center">
      <div className={clsx('w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3', colors[color])}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm text-slate-500">{title}</p>
    </Card>
  );
}

export default function Deployments() {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDeployments();
  }, [statusFilter]);

  const fetchDeployments = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const res = await fetch(`/api/v1/deployments?${params}`);
      const data = await res.json();
      if (data.success) setDeployments(data.data);
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: deployments.length,
    assigned: deployments.filter(d => d.status === 'assigned').length,
    confirmed: deployments.filter(d => d.status === 'confirmed').length,
    completed: deployments.filter(d => d.status === 'completed').length,
    noShow: deployments.filter(d => d.status === 'no_show').length,
  };

  const filteredDeployments = deployments.filter(d => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      d.candidate_name?.toLowerCase().includes(query) ||
      d.job_title?.toLowerCase().includes(query) ||
      d.location?.toLowerCase().includes(query)
    );
  });

  const statusColors = {
    assigned: 'warning',
    confirmed: 'info',
    checked_in: 'primary',
    completed: 'success',
    no_show: 'error',
    cancelled: 'neutral',
  };

  const columns = [
    {
      header: 'Candidate',
      accessor: 'candidate_name',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <span className="text-sm font-medium text-primary-600">{value?.charAt(0)}</span>
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-500">Level {row.candidate_level || 1}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Job',
      accessor: 'job_title',
      render: (value, row) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{value}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <MapPinIcon className="h-3 w-3" /> {row.location}
          </p>
        </div>
      ),
    },
    {
      header: 'Date',
      accessor: 'job_date',
      render: (value) => (
        <span className="text-slate-600 dark:text-slate-400">{value}</span>
      ),
    },
    {
      header: 'Hours',
      accessor: 'hours_worked',
      render: (value) => value ? `${value.toFixed(1)}h` : '-',
    },
    {
      header: 'Earnings',
      accessor: 'candidate_pay',
      render: (value, row) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{value ? formatCurrency(value) : '-'}</p>
          {row.incentive_amount > 0 && (
            <p className="text-xs text-emerald-600">+{formatCurrency(row.incentive_amount)} bonus</p>
          )}
        </div>
      ),
    },
    {
      header: 'Profit',
      accessor: 'gross_profit',
      render: (value) => (
        <span className="font-medium text-emerald-600">{value ? formatCurrency(value) : '-'}</span>
      ),
    },
    {
      header: 'Rating',
      accessor: 'rating',
      render: (value) => value ? (
        <div className="flex items-center gap-1">
          <span className="text-amber-500">★</span>
          <span>{value}</span>
        </div>
      ) : '-',
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (value) => <StatusBadge status={value} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Deployments</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage candidate job assignments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard title="Total" value={stats.total} icon={CalendarIcon} color="blue" />
        <StatCard title="Assigned" value={stats.assigned} icon={ClockIcon} color="amber" />
        <StatCard title="Confirmed" value={stats.confirmed} icon={CheckCircleIcon} color="purple" />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircleIcon} color="emerald" />
        <StatCard title="No Show" value={stats.noShow} icon={XCircleIcon} color="red" />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search candidates, jobs..."
            icon={SearchIcon}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'assigned', label: 'Assigned' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'checked_in', label: 'Checked In' },
              { value: 'completed', label: 'Completed' },
              { value: 'no_show', label: 'No Show' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
            className="w-48"
          />
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        <Table
          columns={columns}
          data={filteredDeployments}
          loading={loading}
          emptyMessage="No deployments found"
        />
      </Card>
    </div>
  );
}
