import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DownloadIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react';
import { api } from '../shared/services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';

import CandidateCard from '../components/candidates/CandidateCard';
import CandidateTable from '../components/candidates/CandidateTable';
import CandidateFilters, { PipelineCard } from '../components/candidates/CandidateFilters';

export default function Candidates() {
  const navigate = useNavigate();
  const [allCandidates, setAllCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Candidate Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingCandidate, setAddingCandidate] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    source: 'direct',
    status: 'pending',
  });

  const handleAddCandidate = async () => {
    if (!newCandidate.name || !newCandidate.email) {
      return;
    }

    setAddingCandidate(true);
    try {
      const data = await api.candidates.create(newCandidate);

      if (data.success) {
        setShowAddModal(false);
        setNewCandidate({
          name: '',
          email: '',
          phone: '',
          date_of_birth: '',
          source: 'direct',
          status: 'lead',
        });
        fetchCandidates();
      }
    } catch (error) {
      // Failed to add candidate
    } finally {
      setAddingCandidate(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);

      const data = await api.candidates.getAll();

      if (data.success) {
        setAllCandidates(data.data.map(c => ({
          ...c,
          certifications: typeof c.certifications === 'string' ? JSON.parse(c.certifications || '[]') : (c.certifications || []),
        })));
      }
    } catch (error) {
      // Failed to fetch candidates
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering for status and search
  const candidates = allCandidates.filter(candidate => {
    if (statusFilter !== 'all' && candidate.status !== statusFilter) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        candidate.name?.toLowerCase().includes(query) ||
        candidate.email?.toLowerCase().includes(query) ||
        candidate.phone?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Compute stats from ALL candidates (not filtered)
  const pipelineStats = {
    total: allCandidates.length,
    pending: allCandidates.filter(c => c.status === 'pending').length,
    active: allCandidates.filter(c => c.status === 'active').length,
    inactive: allCandidates.filter(c => c.status === 'inactive').length,
  };

  const handleExport = () => {
    if (candidates.length === 0) {
      return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Status', 'Level', 'XP', 'Jobs Completed', 'Rating', 'Source', 'Created At'];

    const rows = candidates.map(c => [
      c.name || '',
      c.email || '',
      c.phone || '',
      c.status || '',
      c.level || 1,
      c.xp || 0,
      c.total_jobs_completed || 0,
      c.rating || '',
      c.source || '',
      c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `candidates_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-primary-500" />
            Candidates
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {pipelineStats.total} workers in your talent pool
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" icon={DownloadIcon} onClick={handleExport}>Export</Button>
          <Button size="sm" icon={UserPlusIcon} onClick={() => setShowAddModal(true)}>Add Candidate</Button>
        </div>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-4 gap-3">
        <PipelineCard
          status="total"
          count={pipelineStats.total || 0}
          color="slate"
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <PipelineCard
          status="pending"
          count={pipelineStats.pending || 0}
          color="amber"
          active={statusFilter === 'pending'}
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
        />
        <PipelineCard
          status="active"
          count={pipelineStats.active || 0}
          color="emerald"
          active={statusFilter === 'active'}
          onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
        />
        <PipelineCard
          status="inactive"
          count={pipelineStats.inactive || 0}
          color="slate"
          active={statusFilter === 'inactive'}
          onClick={() => setStatusFilter(statusFilter === 'inactive' ? 'all' : 'inactive')}
        />
      </div>

      {/* Filters & View Toggle */}
      <CandidateFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        view={view}
        onViewChange={setView}
      />

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : candidates.length === 0 ? (
        <Card className="text-center py-12">
          <UserPlusIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No candidates found</h3>
          <p className="text-slate-500 mb-4">
            {searchQuery ? 'Try adjusting your search terms' : 'Start building your talent pool'}
          </p>
          <Button icon={UserPlusIcon} onClick={() => setShowAddModal(true)}>Add Your First Candidate</Button>
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidates.map(candidate => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onClick={() => navigate(`/candidates/${candidate.id}`)}
            />
          ))}
        </div>
      ) : (
        <Card padding="none">
          <CandidateTable
            candidates={candidates}
            onRowClick={(row) => navigate(`/candidates/${row.id}`)}
          />
        </Card>
      )}

      {/* Add Candidate Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Candidate"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Enter full name"
              value={newCandidate.name}
              onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              placeholder="Enter email address"
              value={newCandidate.email}
              onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Phone Number
            </label>
            <Input
              type="tel"
              placeholder="Enter phone number"
              value={newCandidate.phone}
              onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Date of Birth
            </label>
            <Input
              type="date"
              value={newCandidate.date_of_birth}
              onChange={(e) => setNewCandidate({ ...newCandidate, date_of_birth: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Source
              </label>
              <Select
                value={newCandidate.source}
                onChange={(value) => setNewCandidate({ ...newCandidate, source: value })}
                options={[
                  { value: 'direct', label: 'Direct' },
                  { value: 'referral', label: 'Referral' },
                  { value: 'job_portal', label: 'Job Portal' },
                  { value: 'social_media', label: 'Social Media' },
                  { value: 'walk_in', label: 'Walk-in' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Initial Status
              </label>
              <Select
                value={newCandidate.status}
                onChange={(value) => setNewCandidate({ ...newCandidate, status: value })}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCandidate}
              loading={addingCandidate}
              icon={UserPlusIcon}
            >
              Add Candidate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
