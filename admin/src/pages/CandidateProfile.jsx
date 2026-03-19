import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import { api } from '../shared/services/api';
import Button from '../components/ui/Button';
import Modal, { ModalFooter } from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { clsx } from 'clsx';
import { XP_THRESHOLDS as xpThresholds } from '../../../shared/utils/gamification-browser';

// Extracted sub-components
import CandidateHeader from '../components/candidates/CandidateHeader';
import CandidateDetails from '../components/candidates/CandidateDetails';
import CandidateActivity from '../components/candidates/CandidateActivity';

export default function CandidateProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchCandidate();
  }, [id]);

  const fetchCandidate = async () => {
    try {
      setLoading(true);
      const data = await api.candidates.getById(id);

      if (data.success) {
        setCandidate(data.data);
        setEditForm({
          name: data.data.name,
          email: data.data.email,
          phone: data.data.phone,
          status: data.data.status,
        });
      } else {
        setError(data.error || 'Failed to load candidate');
      }
    } catch (err) {
      setError('Failed to fetch candidate data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCandidate = async () => {
    try {
      const data = await api.candidates.update(id, editForm);
      if (data.success) {
        setCandidate({ ...candidate, ...data.data });
        setShowEditModal(false);
      }
    } catch (err) {
      // Update failed - modal stays open for retry
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-slate-500">{error || 'Candidate not found'}</p>
        <Button variant="secondary" onClick={() => navigate('/candidates')}>
          Back to Candidates
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          icon={ArrowLeftIcon}
          onClick={() => navigate('/candidates')}
        >
          Back
        </Button>
      </div>

      {/* Profile Header + Stats */}
      <CandidateHeader
        candidate={candidate}
        xpThresholds={xpThresholds}
        onEdit={() => setShowEditModal(true)}
        onMessage={() => navigate(`/chat?candidate=${candidate.id}`)}
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'deployments', label: 'Job History' },
          { id: 'achievements', label: 'Achievements' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <CandidateDetails candidate={candidate} />}
      {(activeTab === 'deployments' || activeTab === 'achievements') && (
        <CandidateActivity activeTab={activeTab} candidate={candidate} />
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Candidate"
        description="Update candidate information"
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={editForm.name || ''}
            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
          />
          <Input
            label="Email"
            type="email"
            value={editForm.email || ''}
            onChange={(e) => setEditForm({...editForm, email: e.target.value})}
          />
          <Input
            label="Phone"
            value={editForm.phone || ''}
            onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
          />
          <Select
            label="Status"
            value={editForm.status || 'pending'}
            onChange={(val) => setEditForm({...editForm, status: val})}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button onClick={handleUpdateCandidate}>Save Changes</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
