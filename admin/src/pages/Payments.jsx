import { useState, useEffect } from 'react';
import { 
  DollarSignIcon, 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon,
  DownloadIcon,
  SearchIcon,
  FilterIcon,
  BanknoteIcon,
  WalletIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge, { StatusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { clsx } from 'clsx';

const formatCurrency = (value) => new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 2 }).format(value || 0);

function StatCard({ title, value, subtitle, icon: Icon, color, onClick, active }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };
  
  return (
    <Card 
      hover={!!onClick} 
      className={clsx('cursor-pointer transition-all', active && 'ring-2 ring-primary-500')}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className={clsx('p-3 rounded-xl', colors[color])}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-sm text-slate-500">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </Card>
  );
}

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [showApproveModal, setShowApproveModal] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const fetchPayments = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const res = await fetch(`/api/v1/payments?${params}`);
      const data = await res.json();
      if (data.success) setPayments(data.data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: payments.reduce((sum, p) => sum + (p.total_amount || 0), 0),
    pending: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.total_amount || 0), 0),
    approved: payments.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.total_amount || 0), 0),
    paid: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.total_amount || 0), 0),
    pendingCount: payments.filter(p => p.status === 'pending').length,
  };

  const filteredPayments = payments.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return p.candidate_name?.toLowerCase().includes(query);
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPayments(filteredPayments.filter(p => p.status === 'pending').map(p => p.id));
    } else {
      setSelectedPayments([]);
    }
  };

  const handleSelectPayment = (id) => {
    setSelectedPayments(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleBatchApprove = async () => {
    try {
      const res = await fetch('/api/v1/payments/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_ids: selectedPayments }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedPayments([]);
        setShowApproveModal(false);
        fetchPayments();
      }
    } catch (error) {
      console.error('Failed to approve payments:', error);
    }
  };

  const columns = [
    {
      header: (
        <input
          type="checkbox"
          onChange={handleSelectAll}
          checked={selectedPayments.length === filteredPayments.filter(p => p.status === 'pending').length && selectedPayments.length > 0}
          className="rounded border-slate-300"
        />
      ),
      accessor: 'id',
      render: (value, row) => row.status === 'pending' ? (
        <input
          type="checkbox"
          checked={selectedPayments.includes(value)}
          onChange={() => handleSelectPayment(value)}
          className="rounded border-slate-300"
        />
      ) : null,
    },
    {
      header: 'Candidate',
      accessor: 'candidate_name',
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <span className="text-sm font-medium text-primary-600">{value?.charAt(0)}</span>
          </div>
          <span className="font-medium text-slate-900 dark:text-white">{value}</span>
        </div>
      ),
    },
    {
      header: 'Date',
      accessor: 'created_at',
      render: (value) => value?.split('T')[0],
    },
    {
      header: 'Hours',
      accessor: 'hours_worked',
      render: (value) => value ? `${value.toFixed(1)}h` : '-',
    },
    {
      header: 'Base Pay',
      accessor: 'base_amount',
      render: (value) => formatCurrency(value),
    },
    {
      header: 'Incentive',
      accessor: 'incentive_amount',
      render: (value) => value > 0 ? (
        <span className="text-emerald-600 font-medium">+{formatCurrency(value)}</span>
      ) : '-',
    },
    {
      header: 'Total',
      accessor: 'total_amount',
      render: (value) => <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(value)}</span>,
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payments</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage candidate payroll and withdrawals</p>
        </div>
        {selectedPayments.length > 0 && (
          <Button onClick={() => setShowApproveModal(true)} icon={CheckCircleIcon}>
            Approve Selected ({selectedPayments.length})
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Pending" 
          value={formatCurrency(stats.pending)} 
          subtitle={`${stats.pendingCount} payments`}
          icon={ClockIcon} 
          color="amber"
          onClick={() => setStatusFilter('pending')}
          active={statusFilter === 'pending'}
        />
        <StatCard 
          title="Approved" 
          value={formatCurrency(stats.approved)} 
          icon={CheckCircleIcon} 
          color="blue"
          onClick={() => setStatusFilter('approved')}
          active={statusFilter === 'approved'}
        />
        <StatCard 
          title="Paid" 
          value={formatCurrency(stats.paid)} 
          icon={BanknoteIcon} 
          color="emerald"
          onClick={() => setStatusFilter('paid')}
          active={statusFilter === 'paid'}
        />
        <StatCard 
          title="Total Processed" 
          value={formatCurrency(stats.total)} 
          icon={WalletIcon} 
          color="purple"
          onClick={() => setStatusFilter('all')}
          active={statusFilter === 'all'}
        />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search candidates..."
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
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'processing', label: 'Processing' },
              { value: 'paid', label: 'Paid' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            className="w-48"
          />
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        <Table
          columns={columns}
          data={filteredPayments}
          loading={loading}
          emptyMessage="No payments found"
        />
      </Card>

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve Payments"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            Are you sure you want to approve {selectedPayments.length} payment(s)?
          </p>
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
            <p className="text-sm text-slate-500">Total Amount</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(payments.filter(p => selectedPayments.includes(p.id)).reduce((sum, p) => sum + p.total_amount, 0))}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowApproveModal(false)}>Cancel</Button>
            <Button onClick={handleBatchApprove}>Approve Payments</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
