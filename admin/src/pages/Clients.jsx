import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  SearchIcon,
  BuildingIcon,
  PhoneIcon,
  MailIcon,
  BriefcaseIcon,
} from 'lucide-react';
import { api } from '../shared/services/api';
import Card from '../components/ui/Card';
import Badge, { StatusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Modal, { ModalFooter } from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    uen: '',
    industry: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    payment_terms: '30',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const data = await api.clients.getAll();
      if (data.success) {
        setClients(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    try {
      const data = await api.clients.create(formData);
      if (data.success) {
        setShowAddModal(false);
        setFormData({
          company_name: '',
          uen: '',
          industry: '',
          contact_name: '',
          contact_email: '',
          contact_phone: '',
          payment_terms: '30',
        });
        fetchClients();
      }
    } catch (error) {
      console.error('Failed to create client:', error);
    }
  };

  const filteredClients = clients.filter(client => {
    if (!searchQuery) return true;
    return client.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           client.contact_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const columns = [
    {
      header: 'Company',
      accessor: 'company_name',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <Avatar name={value} size="sm" />
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{row.industry}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Contact',
      accessor: 'contact_name',
      render: (value, row) => (
        <div>
          <p className="text-slate-900 dark:text-white">{value}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{row.contact_email}</p>
        </div>
      ),
    },
    {
      header: 'Phone',
      accessor: 'contact_phone',
    },
    {
      header: 'Jobs',
      accessor: 'total_jobs',
      render: (value, row) => (
        <div className="flex items-center gap-1.5">
          <BriefcaseIcon className="h-4 w-4 text-slate-400" />
          <span>{value}</span>
          {row.active_jobs > 0 && (
            <Badge variant="success">{row.active_jobs} active</Badge>
          )}
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Clients</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage client relationships and contracts
          </p>
        </div>
        <Button icon={PlusIcon} onClick={() => setShowAddModal(true)}>
          Add Client
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{clients.length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Clients</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-emerald-600">{clients.filter(c => c.status === 'active').length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Active</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {clients.reduce((acc, c) => acc + (c.total_jobs || 0), 0)}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Jobs</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-blue-600">
            {clients.reduce((acc, c) => acc + (c.active_jobs || 0), 0)}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Active Jobs</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search clients..."
          icon={SearchIcon}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64"
        />
      </div>

      {/* Table */}
      <Card padding="none">
        <Table
          columns={columns}
          data={filteredClients}
          loading={loading}
          onRowClick={(row) => navigate(`/clients/${row.id}`)}
          emptyMessage="No clients found"
        />
      </Card>

      {/* Add Client Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Client"
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Company Name"
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            placeholder="e.g. Marina Bay Sands"
            containerClassName="md:col-span-2"
          />
          <Input
            label="UEN"
            value={formData.uen}
            onChange={(e) => setFormData({ ...formData, uen: e.target.value })}
            placeholder="e.g. 200604327R"
          />
          <Select
            label="Industry"
            value={formData.industry}
            onChange={(value) => setFormData({ ...formData, industry: value })}
            options={[
              { value: 'Hospitality', label: 'Hospitality' },
              { value: 'Events', label: 'Events' },
              { value: 'F&B', label: 'F&B' },
              { value: 'Retail', label: 'Retail' },
              { value: 'Aviation', label: 'Aviation' },
              { value: 'Entertainment', label: 'Entertainment' },
              { value: 'Corporate', label: 'Corporate' },
              { value: 'Other', label: 'Other' },
            ]}
          />
          <Input
            label="Contact Name"
            value={formData.contact_name}
            onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
            placeholder="Contact person name"
          />
          <Input
            label="Contact Email"
            type="email"
            value={formData.contact_email}
            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            placeholder="email@company.com"
          />
          <Input
            label="Contact Phone"
            value={formData.contact_phone}
            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
            placeholder="+65 XXXX XXXX"
          />
          <Select
            label="Payment Terms"
            value={formData.payment_terms}
            onChange={(value) => setFormData({ ...formData, payment_terms: value })}
            options={[
              { value: '7', label: 'Net 7 days' },
              { value: '14', label: 'Net 14 days' },
              { value: '30', label: 'Net 30 days' },
              { value: '45', label: 'Net 45 days' },
              { value: '60', label: 'Net 60 days' },
            ]}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
          <Button onClick={handleCreateClient}>Add Client</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
