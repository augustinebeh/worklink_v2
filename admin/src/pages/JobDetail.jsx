import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  DollarSignIcon,
  ZapIcon,
  EditIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  StarIcon,
  PhoneIcon,
  MailIcon,
  SearchIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge, { StatusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal, { ModalFooter } from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { clsx } from 'clsx';

function StatCard({ icon: Icon, label, value, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  };

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
      <div className={clsx('p-2 rounded-lg', colorClasses[color])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function DeploymentRow({ deployment, onStatusChange }) {
  const statusConfig = {
    pending: { color: 'warning', label: 'Pending' },
    confirmed: { color: 'info', label: 'Confirmed' },
    completed: { color: 'success', label: 'Completed' },
    cancelled: { color: 'error', label: 'Cancelled' },
    no_show: { color: 'error', label: 'No Show' },
  };

  const config = statusConfig[deployment.status] || statusConfig.pending;

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
          <span className="text-white font-semibold">{deployment.candidate_name?.charAt(0)}</span>
        </div>
        <div>
          <Link 
            to={`/candidates/${deployment.candidate_id}`}
            className="font-medium text-slate-900 dark:text-white hover:text-primary-600"
          >
            {deployment.candidate_name}
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>{deployment.candidate_email}</span>
            {deployment.candidate_phone && <span>{deployment.candidate_phone}</span>}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {deployment.rating && (
          <div className="flex items-center gap-1 text-gold-500">
            <StarIcon className="h-4 w-4 fill-gold-400" />
            <span className="font-medium">{deployment.rating}</span>
          </div>
        )}
        <StatusBadge status={deployment.status} />
        
        {deployment.status === 'pending' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStatusChange(deployment.id, 'confirmed')}
              className="p-2 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
            >
              <CheckCircleIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onStatusChange(deployment.id, 'cancelled')}
              className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
            >
              <XCircleIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableCandidates, setAvailableCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    location: '',
    job_date: '',
    start_time: '',
    end_time: '',
    pay_rate: '',
    charge_rate: '',
    total_slots: '',
    xp_bonus: '',
  });

  useEffect(() => {
    fetchJobData();
  }, [id]);

  useEffect(() => {
    if (job) {
      setEditForm({
        title: job.title || '',
        description: job.description || '',
        location: job.location || '',
        job_date: job.job_date || '',
        start_time: job.start_time || '',
        end_time: job.end_time || '',
        pay_rate: job.pay_rate || '',
        charge_rate: job.charge_rate || '',
        total_slots: job.total_slots || '',
        xp_bonus: job.xp_bonus || '',
      });
    }
  }, [job]);

  const fetchJobData = async () => {
    try {
      const [jobRes, deploymentsRes] = await Promise.all([
        fetch(`/api/v1/jobs/${id}`),
        fetch(`/api/v1/jobs/${id}/deployments`),
      ]);

      const jobData = await jobRes.json();
      const deploymentsData = await deploymentsRes.json();

      if (jobData.success) setJob(jobData.data);
      if (deploymentsData.success) setDeployments(deploymentsData.data || []);
    } catch (error) {
      console.error('Failed to fetch job:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (deploymentId, newStatus) => {
    try {
      await fetch(`/api/v1/deployments/${deploymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchJobData();
    } catch (error) {
      console.error('Failed to update deployment:', error);
    }
  };

  const fetchAvailableCandidates = async () => {
    try {
      const res = await fetch('/api/v1/candidates?status=active&limit=50');
      const data = await res.json();
      if (data.success) {
        // Filter out already assigned candidates
        const assignedIds = deployments.map(d => d.candidate_id);
        setAvailableCandidates(data.data.filter(c => !assignedIds.includes(c.id)));
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    }
  };

  const handleOpenAssignModal = () => {
    fetchAvailableCandidates();
    setShowAssignModal(true);
  };

  const handleAssignWorker = async () => {
    if (!selectedCandidate) return;
    setSaving(true);
    try {
      const res = await fetch('/api/v1/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: id,
          candidate_id: selectedCandidate,
          status: 'assigned',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAssignModal(false);
        setSelectedCandidate('');
        fetchJobData();
      }
    } catch (error) {
      console.error('Failed to assign worker:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateJob = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          pay_rate: parseFloat(editForm.pay_rate),
          charge_rate: parseFloat(editForm.charge_rate),
          total_slots: parseInt(editForm.total_slots),
          xp_bonus: parseInt(editForm.xp_bonus) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        fetchJobData();
      }
    } catch (error) {
      console.error('Failed to update job:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelJob = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCancelModal(false);
        fetchJobData();
      }
    } catch (error) {
      console.error('Failed to cancel job:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value) => 
    new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(value || 0);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Job not found</p>
        <Button onClick={() => navigate('/jobs')} className="mt-4">Back to Jobs</Button>
      </div>
    );
  }

  const startTime = job.start_time || '09:00';
  const endTime = job.end_time || '17:00';
  const start = startTime.split(':').map(Number);
  let end = endTime.split(':').map(Number);
  if (end[0] < start[0]) end[0] += 24;
  const hours = ((end[0] * 60 + end[1]) - (start[0] * 60 + start[1]) - (job.break_minutes || 0)) / 60;

  const totalRevenue = hours * job.charge_rate * job.filled_slots;
  const totalCost = hours * job.pay_rate * job.filled_slots;
  const grossProfit = totalRevenue - totalCost;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/jobs')}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeftIcon className="h-5 w-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{job.title}</h1>
            <p className="text-slate-500">{job.company_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={job.status} />
          <Button variant="secondary" size="sm" icon={EditIcon} onClick={() => setShowEditModal(true)}>Edit</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={CalendarIcon} label="Date" value={formatDate(job.job_date)} color="info" />
        <StatCard icon={ClockIcon} label="Time" value={`${startTime} - ${endTime}`} color="primary" />
        <StatCard icon={UsersIcon} label="Workers" value={`${job.filled_slots}/${job.total_slots}`} color="warning" />
        <StatCard icon={MapPinIcon} label="Location" value={job.location} color="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-400">{job.description || 'No description provided.'}</p>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <p className="text-sm text-slate-500">Charge Rate</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(job.charge_rate)}/hr</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pay Rate</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(job.pay_rate)}/hr</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Break Time</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{job.break_minutes || 0} min</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">XP Bonus</p>
                  <p className="text-lg font-semibold text-primary-600">{job.xp_bonus || 0} XP</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Workers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Assigned Workers ({deployments.length})</CardTitle>
                <Button size="sm" icon={PlusIcon} onClick={handleOpenAssignModal}>
                  Assign Worker
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {deployments.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No workers assigned yet</p>
              ) : (
                <div className="space-y-3">
                  {deployments.map(d => (
                    <DeploymentRow 
                      key={d.id} 
                      deployment={d} 
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Revenue</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Worker Pay</span>
                  <span className="font-semibold text-slate-900 dark:text-white">-{formatCurrency(totalCost)}</span>
                </div>
                <div className="border-t pt-4 flex justify-between">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Gross Profit</span>
                  <span className={clsx(
                    'font-bold',
                    grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {formatCurrency(grossProfit)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Margin</span>
                  <span className="text-slate-600">
                    {totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent>
              <Link 
                to={`/clients/${job.client_id}`}
                className="block p-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <p className="font-semibold text-slate-900 dark:text-white">{job.company_name}</p>
                <p className="text-sm text-slate-500 mt-1">{job.industry}</p>
              </Link>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="secondary" className="w-full justify-start" icon={UsersIcon} onClick={() => navigate(`/ai-sourcing?job=${id}`)}>
                  Find Candidates
                </Button>
                <Button variant="secondary" className="w-full justify-start" icon={MailIcon} onClick={() => navigate(`/chat?job=${id}`)}>
                  Message Workers
                </Button>
                {job.status === 'open' && (
                  <Button variant="danger" className="w-full justify-start" icon={XCircleIcon} onClick={() => setShowCancelModal(true)}>
                    Cancel Job
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Job Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Job"
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Job Title"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            containerClassName="md:col-span-2"
          />
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            />
          </div>
          <Input
            label="Location"
            value={editForm.location}
            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
          />
          <Input
            label="Date"
            type="date"
            value={editForm.job_date}
            onChange={(e) => setEditForm({ ...editForm, job_date: e.target.value })}
          />
          <Input
            label="Start Time"
            type="time"
            value={editForm.start_time}
            onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
          />
          <Input
            label="End Time"
            type="time"
            value={editForm.end_time}
            onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
          />
          <Input
            label="Pay Rate ($/hr)"
            type="number"
            value={editForm.pay_rate}
            onChange={(e) => setEditForm({ ...editForm, pay_rate: e.target.value })}
          />
          <Input
            label="Charge Rate ($/hr)"
            type="number"
            value={editForm.charge_rate}
            onChange={(e) => setEditForm({ ...editForm, charge_rate: e.target.value })}
          />
          <Input
            label="Total Slots"
            type="number"
            value={editForm.total_slots}
            onChange={(e) => setEditForm({ ...editForm, total_slots: e.target.value })}
          />
          <Input
            label="XP Bonus"
            type="number"
            value={editForm.xp_bonus}
            onChange={(e) => setEditForm({ ...editForm, xp_bonus: e.target.value })}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button onClick={handleUpdateJob} loading={saving}>Save Changes</Button>
        </ModalFooter>
      </Modal>

      {/* Assign Worker Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Worker"
        description="Select a candidate to assign to this job"
      >
        <div className="space-y-4">
          <Input
            placeholder="Search candidates..."
            icon={SearchIcon}
            value={candidateSearch}
            onChange={(e) => setCandidateSearch(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto space-y-2">
            {availableCandidates
              .filter(c => c.name.toLowerCase().includes(candidateSearch.toLowerCase()))
              .map((candidate) => (
              <div
                key={candidate.id}
                onClick={() => setSelectedCandidate(candidate.id)}
                className={clsx(
                  'p-3 rounded-lg cursor-pointer transition-colors flex items-center gap-3',
                  selectedCandidate === candidate.id
                    ? 'bg-primary-100 dark:bg-primary-900/30 border border-primary-300 dark:border-primary-700'
                    : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
                  <span className="text-white font-semibold">{candidate.name?.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">{candidate.name}</p>
                  <p className="text-sm text-slate-500">Level {candidate.level || 1} • {candidate.total_jobs_completed || 0} jobs</p>
                </div>
                {candidate.rating > 0 && (
                  <div className="flex items-center gap-1 text-amber-500">
                    <StarIcon className="h-4 w-4 fill-amber-400" />
                    <span>{candidate.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            ))}
            {availableCandidates.length === 0 && (
              <p className="text-center text-slate-500 py-8">No available candidates</p>
            )}
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancel</Button>
          <Button onClick={handleAssignWorker} loading={saving} disabled={!selectedCandidate}>Assign Worker</Button>
        </ModalFooter>
      </Modal>

      {/* Cancel Job Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Job"
        description="Are you sure you want to cancel this job?"
      >
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">
            <strong>Warning:</strong> This action will cancel the job and notify all assigned workers.
            This cannot be undone.
          </p>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowCancelModal(false)}>Keep Job</Button>
          <Button variant="danger" onClick={handleCancelJob} loading={saving}>Yes, Cancel Job</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
