import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BuildingIcon,
  MailIcon,
  PhoneIcon,
  GlobeIcon,
  CalendarIcon,
  DollarSignIcon,
  BriefcaseIcon,
  EditIcon,
  UsersIcon,
  TrendingUpIcon,
  CheckCircleIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge, { StatusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import { clsx } from 'clsx';

function StatCard({ icon: Icon, label, value, subvalue, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  };

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={clsx('p-3 rounded-xl', colorClasses[color])}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          {subvalue && <p className="text-xs text-slate-400">{subvalue}</p>}
        </div>
      </div>
    </Card>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ totalJobs: 0, totalRevenue: 0, activeJobs: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const fetchClientData = async () => {
    try {
      const [clientRes, jobsRes] = await Promise.all([
        fetch(`/api/v1/clients/${id}`),
        fetch(`/api/v1/clients/${id}/jobs`),
      ]);

      const clientData = await clientRes.json();
      const jobsData = await jobsRes.json();

      if (clientData.success) setClient(clientData.data);
      if (jobsData.success) {
        setJobs(jobsData.data || []);
        
        // Calculate stats
        const totalJobs = jobsData.data.length;
        const activeJobs = jobsData.data.filter(j => j.status === 'open').length;
        const totalRevenue = jobsData.data.reduce((sum, j) => {
          const hours = 5; // Approximate
          return sum + (hours * j.charge_rate * j.filled_slots);
        }, 0);
        
        setStats({ totalJobs, totalRevenue, activeJobs });
      }
    } catch (error) {
      console.error('Failed to fetch client:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => 
    new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 }).format(value || 0);

  const columns = [
    { 
      header: 'Job', 
      accessor: 'title',
      render: (value, row) => (
        <Link to={`/jobs/${row.id}`} className="font-medium text-primary-600 hover:underline">
          {value}
        </Link>
      )
    },
    { header: 'Date', accessor: 'job_date', render: (value) => new Date(value).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' }) },
    { header: 'Workers', accessor: 'filled_slots', render: (value, row) => `${value}/${row.total_slots}` },
    { header: 'Rate', accessor: 'charge_rate', render: (value) => formatCurrency(value) + '/hr' },
    { header: 'Status', accessor: 'status', render: (value) => <StatusBadge status={value} /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Client not found</p>
        <Button onClick={() => navigate('/clients')} className="mt-4">Back to Clients</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/clients')}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeftIcon className="h-5 w-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{client.company_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="info">{client.industry || 'Not specified'}</Badge>
              <StatusBadge status={client.status} />
            </div>
          </div>
        </div>
        <Button variant="secondary" icon={EditIcon}>Edit Client</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BriefcaseIcon} label="Total Jobs" value={stats.totalJobs} color="primary" />
        <StatCard icon={CheckCircleIcon} label="Active Jobs" value={stats.activeJobs} color="success" />
        <StatCard icon={DollarSignIcon} label="Total Revenue" value={formatCurrency(stats.totalRevenue)} color="info" />
        <StatCard icon={CalendarIcon} label="Payment Terms" value={`${client.payment_terms || 30} days`} color="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <UsersIcon className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Contact Person</p>
                  <p className="font-medium text-slate-900 dark:text-white">{client.contact_name || 'Not set'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <MailIcon className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <a href={`mailto:${client.contact_email}`} className="font-medium text-primary-600 hover:underline">
                    {client.contact_email || 'Not set'}
                  </a>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <PhoneIcon className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Phone</p>
                  <a href={`tel:${client.contact_phone}`} className="font-medium text-slate-900 dark:text-white">
                    {client.contact_phone || 'Not set'}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <BuildingIcon className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">UEN</p>
                  <p className="font-medium text-slate-900 dark:text-white">{client.uen || 'Not set'}</p>
                </div>
              </div>
            </div>

            {client.notes && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-slate-500 mb-2">Notes</p>
                <p className="text-slate-700 dark:text-slate-300">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Jobs History */}
        <Card className="lg:col-span-2" padding="none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Job History</CardTitle>
              <Link to={`/jobs?client=${id}`}>
                <Button size="sm" variant="secondary">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <Table 
            columns={columns} 
            data={jobs.slice(0, 10)} 
            loading={false}
            emptyMessage="No jobs found for this client"
          />
        </Card>
      </div>
    </div>
  );
}
