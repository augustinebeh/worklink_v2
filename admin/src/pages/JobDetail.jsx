import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../shared/services/api';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal, { ModalFooter } from '../components/ui/Modal';
import Input from '../components/ui/Input';
import JobDetailHeader, { QuickActions } from '../components/jobs/JobDetailHeader';
import { StatsGrid, JobDescription, FinancialSummary, ClientInfo } from '../components/jobs/JobDetailInfo';
import JobDeploymentList, { AssignWorkerModal } from '../components/jobs/JobDeploymentList';

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
      const [jobData, deploymentsData] = await Promise.all([
        api.jobs.getById(id),
        api.client.get(`/jobs/${id}/deployments`),
      ]);

      if (jobData.success) setJob(jobData.data);
      if (deploymentsData.success) setDeployments(deploymentsData.data || []);
    } catch (error) {
      // Failed to fetch job
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (deploymentId, newStatus) => {
    try {
      await api.client.patch(`/deployments/${deploymentId}`, { status: newStatus });
      fetchJobData();
    } catch (error) {
      // Failed to update deployment
    }
  };

  const fetchAvailableCandidates = async () => {
    try {
      const data = await api.candidates.getAll({ status: 'active', limit: 50 });
      if (data.success) {
        const assignedIds = deployments.map(d => d.candidate_id);
        setAvailableCandidates(data.data.filter(c => !assignedIds.includes(c.id)));
      }
    } catch (error) {
      // Failed to fetch candidates
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
      const data = await api.client.post('/deployments', {
        job_id: id,
        candidate_id: selectedCandidate,
        status: 'assigned',
      });
      if (data.success) {
        setShowAssignModal(false);
        setSelectedCandidate('');
        fetchJobData();
      }
    } catch (error) {
      // Failed to assign worker
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateJob = async () => {
    setSaving(true);
    try {
      const data = await api.jobs.update(id, {
        ...editForm,
        pay_rate: parseFloat(editForm.pay_rate),
        charge_rate: parseFloat(editForm.charge_rate),
        total_slots: parseInt(editForm.total_slots),
        xp_bonus: parseInt(editForm.xp_bonus) || 0,
      });
      if (data.success) {
        setShowEditModal(false);
        fetchJobData();
      }
    } catch (error) {
      // Failed to update job
    } finally {
      setSaving(false);
    }
  };

  const handleCancelJob = async () => {
    setSaving(true);
    try {
      const data = await api.jobs.updateStatus(id, 'cancelled');
      if (data.success) {
        setShowCancelModal(false);
        fetchJobData();
      }
    } catch (error) {
      // Failed to cancel job
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
      <JobDetailHeader
        job={job}
        onEdit={() => setShowEditModal(true)}
        onCancel={() => setShowCancelModal(true)}
      />

      <StatsGrid job={job} startTime={startTime} endTime={endTime} formatDate={formatDate} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <JobDescription job={job} formatCurrency={formatCurrency} />
          <JobDeploymentList
            deployments={deployments}
            onStatusChange={handleStatusChange}
            onOpenAssign={handleOpenAssignModal}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <FinancialSummary
            totalRevenue={totalRevenue}
            totalCost={totalCost}
            grossProfit={grossProfit}
            formatCurrency={formatCurrency}
          />
          <ClientInfo job={job} />
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickActions job={job} jobId={id} onCancel={() => setShowCancelModal(true)} />
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
      <AssignWorkerModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        candidates={availableCandidates}
        candidateSearch={candidateSearch}
        onSearchChange={setCandidateSearch}
        selectedCandidate={selectedCandidate}
        onSelectCandidate={setSelectedCandidate}
        onAssign={handleAssignWorker}
        saving={saving}
      />

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
