import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  SearchIcon, 
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  UsersIcon,
  DollarSignIcon,
  ZapIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../components/ui/Card';
import Badge, { StatusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Table, { TablePagination } from '../components/ui/Table';
import Modal, { ModalFooter } from '../components/ui/Modal';
import { clsx } from 'clsx';

export default function Jobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Form state
  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    description: '',
    job_date: '',
    start_time: '',
    end_time: '',
    location: '',
    pay_rate: '',
    total_slots: '',
    xp_bonus: '0',
    featured: false,
  });

  useEffect(() => {
    fetchJobs();
    fetchClients();
  }, [statusFilter]);

  const fetchJobs = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const res = await fetch(`/api/v1/jobs?${params}`);
      const data = await res.json();
      if (data.success) {
        setJobs(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/v1/clients');
      const data = await res.json();
      if (data.success) {
        setClients(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleCreateJob = async () => {
    try {
      const res = await fetch('/api/v1/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          pay_rate: parseFloat(formData.pay_rate),
          total_slots: parseInt(formData.total_slots),
          xp_bonus: parseInt(formData.xp_bonus) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setFormData({
          client_id: '',
          title: '',
          description: '',
          job_date: '',
          start_time: '',
          end_time: '',
          location: '',
          pay_rate: '',
          total_slots: '',
          xp_bonus: '0',
          featured: false,
        });
        fetchJobs();
      }
    } catch (error) {
      console.error('Failed to create job:', error);
    }
  };

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    if (!searchQuery) return true;
    return job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           job.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           job.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Stats
  const stats = {
    total: jobs.length,
    open: jobs.filter(j => j.status === 'open').length,
    filled: jobs.filter(j => j.status === 'filled').length,
    completed: jobs.filter(j => j.status === 'completed').length,
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-SG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const columns = [
    {
      header: 'Job',
      accessor: 'title',
      render: (value, row) => (
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-900 dark:text-white">{value}</p>
            {row.featured === 1 && (
              <ZapIcon className="h-4 w-4 text-primary-500" />
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{row.client_name}</p>
        </div>
      ),
    },
    {
      header: 'Date & Time',
      accessor: 'job_date',
      render: (value, row) => (
        <div>
          <p className="text-slate-900 dark:text-white">{formatDate(value)}</p>
          <p className="text-sm text-slate-500">{row.start_time} - {row.end_time}</p>
        </div>
      ),
    },
    {
      header: 'Location',
      accessor: 'location',
      render: (value) => (
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <MapPinIcon className="h-4 w-4" />
          <span>{value}</span>
        </div>
      ),
    },
    {
      header: 'Pay Rate',
      accessor: 'pay_rate',
      render: (value) => (
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          ${value}/hr
        </span>
      ),
    },
    {
      header: 'Slots',
      accessor: 'total_slots',
      render: (value, row) => (
        <div className="flex items-center gap-1.5">
          <UsersIcon className="h-4 w-4 text-slate-400" />
          <span className={row.filled_slots >= value ? 'text-emerald-600' : ''}>
            {row.filled_slots}/{value}
          </span>
        </div>
      ),
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Jobs</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage job postings and assignments
          </p>
        </div>
        <Button icon={PlusIcon} onClick={() => setShowAddModal(true)}>
          Post New Job
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Jobs', value: stats.total, color: 'slate' },
          { label: 'Open', value: stats.open, color: 'emerald' },
          { label: 'Filled', value: stats.filled, color: 'blue' },
          { label: 'Completed', value: stats.completed, color: 'slate' },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={() => setStatusFilter(stat.label.toLowerCase() === 'total jobs' ? 'all' : stat.label.toLowerCase())}
            className={clsx(
              'p-4 rounded-xl border-2 transition-all text-left',
              statusFilter === (stat.label.toLowerCase() === 'total jobs' ? 'all' : stat.label.toLowerCase())
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            )}
          >
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Search jobs..."
          icon={SearchIcon}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64"
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'open', label: 'Open' },
            { value: 'filled', label: 'Filled' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          className="w-40"
        />
      </div>

      {/* Table */}
      <Card padding="none">
        <Table
          columns={columns}
          data={filteredJobs}
          loading={loading}
          onRowClick={(row) => navigate(`/jobs/${row.id}`)}
          emptyMessage="No jobs found"
        />
      </Card>

      {/* Add Job Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Post New Job"
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Client"
            value={formData.client_id}
            onChange={(value) => setFormData({ ...formData, client_id: value })}
            options={clients.map(c => ({ value: c.id, label: c.company_name }))}
            containerClassName="md:col-span-2"
          />
          <Input
            label="Job Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Banquet Server"
            containerClassName="md:col-span-2"
          />
          <Input
            label="Date"
            type="date"
            value={formData.job_date}
            onChange={(e) => setFormData({ ...formData, job_date: e.target.value })}
          />
          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g. Marina Bay Sands"
          />
          <Input
            label="Start Time"
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          />
          <Input
            label="End Time"
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          />
          <Input
            label="Pay Rate ($/hr)"
            type="number"
            value={formData.pay_rate}
            onChange={(e) => setFormData({ ...formData, pay_rate: e.target.value })}
            placeholder="15"
          />
          <Input
            label="Total Slots"
            type="number"
            value={formData.total_slots}
            onChange={(e) => setFormData({ ...formData, total_slots: e.target.value })}
            placeholder="8"
          />
          <Input
            label="XP Bonus"
            type="number"
            value={formData.xp_bonus}
            onChange={(e) => setFormData({ ...formData, xp_bonus: e.target.value })}
            placeholder="50"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              checked={formData.featured}
              onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
              className="rounded border-slate-300"
            />
            <label htmlFor="featured" className="text-sm text-slate-700 dark:text-slate-300">
              Featured Job (shown prominently to candidates)
            </label>
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
          <Button onClick={handleCreateJob}>Post Job</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
