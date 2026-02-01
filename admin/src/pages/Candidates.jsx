import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  SearchIcon,
  DownloadIcon,
  StarIcon,
  TrophyIcon,
  ZapIcon,
  GridIcon,
  ListIcon,
  SparklesIcon,
  ChevronRightIcon,
  HelpCircleIcon,
  UserPlusIcon,
  BriefcaseIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge, { StatusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { clsx } from 'clsx';
import { XP_THRESHOLDS as xpThresholds, LEVEL_TITLES as levelTitles } from '../utils/gamification';

// Generate avatar URL if not provided
const getAvatarUrl = (candidate) => {
  if (candidate.profile_photo) return candidate.profile_photo;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(candidate.name)}`;
};

// Tips for managing candidates
const candidateTips = [
  { title: '🎯 Quality First', content: '10 reliable workers beat 50 flaky ones. Focus on retention.' },
  { title: '💰 Fair Pay', content: 'Pay 5-10% above market to attract and keep the best.' },
  { title: '📱 Stay Connected', content: 'Workers with WhatsApp opt-in have 3x better response rates.' },
  { title: '⭐ Level System', content: 'Higher level workers = more reliable. Prioritize Lv.5+ for important jobs.' },
];

function CandidateCard({ candidate, onClick }) {
  const xpProgress = candidate.level < 10 
    ? ((candidate.xp - xpThresholds[candidate.level - 1]) / (xpThresholds[candidate.level] - xpThresholds[candidate.level - 1])) * 100
    : 100;

  return (
    <Card hover onClick={onClick} className="relative overflow-hidden cursor-pointer group">
      {/* Level indicator stripe */}
      <div 
        className={clsx(
          'absolute top-0 left-0 right-0 h-1.5 transition-all',
          candidate.level >= 8 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
          candidate.level >= 5 ? 'bg-gradient-to-r from-primary-400 to-primary-600' :
          'bg-gradient-to-r from-slate-300 to-slate-400'
        )} 
      />
      
      <div className="flex items-start gap-4 pt-2">
        {/* Avatar with profile photo */}
        <div className="relative flex-shrink-0">
          <img 
            src={getAvatarUrl(candidate)}
            alt={candidate.name}
            className="h-14 w-14 rounded-xl object-cover ring-2 ring-white dark:ring-slate-800 shadow-sm"
          />
          {/* Level badge */}
          <div className={clsx(
            'absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm',
            candidate.level >= 8 ? 'bg-amber-500 text-white' :
            candidate.level >= 5 ? 'bg-primary-500 text-white' :
            'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          )}>
            {candidate.level}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{candidate.name}</h3>
            <StatusBadge status={candidate.status} />
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <span className={clsx(
              'text-xs font-medium',
              candidate.level >= 8 ? 'text-amber-600' :
              candidate.level >= 5 ? 'text-primary-600' :
              'text-slate-500'
            )}>
              {levelTitles[candidate.level]}
            </span>
            {candidate.rating > 0 && (
              <div className="flex items-center gap-0.5 text-amber-500">
                <StarIcon className="h-3 w-3 fill-current" />
                <span className="text-xs font-medium">{Number(candidate.rating).toFixed(1)}</span>
              </div>
            )}
          </div>
          
          {/* XP Bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-2xs text-slate-400 mb-0.5">
              <span>{candidate.xp?.toLocaleString() || 0} XP</span>
              {candidate.level < 10 && <span>{xpThresholds[candidate.level]?.toLocaleString()} XP</span>}
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={clsx(
                  'h-full rounded-full transition-all',
                  candidate.level >= 8 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                  candidate.level >= 5 ? 'bg-gradient-to-r from-primary-400 to-primary-500' :
                  'bg-slate-400'
                )}
                style={{ width: `${Math.min(xpProgress, 100)}%` }}
              />
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <BriefcaseIcon className="h-3 w-3" />
              <span>{candidate.total_jobs_completed || 0} jobs</span>
            </div>
            {Array.isArray(candidate.certifications) && candidate.certifications.length > 0 && (
              <div className="flex items-center gap-1">
                <TrophyIcon className="h-3 w-3" />
                <span>{candidate.certifications.length} certs</span>
              </div>
            )}
          </div>
        </div>
        
        <ChevronRightIcon className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
      </div>
    </Card>
  );
}

function PipelineCard({ status, count, color, onClick, active }) {
  const colors = {
    emerald: 'from-emerald-500 to-emerald-600',
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-600',
    slate: 'from-slate-400 to-slate-500',
  };
  
  return (
    <button 
      onClick={onClick}
      className={clsx(
        'p-4 rounded-xl border-2 transition-all text-left w-full',
        active 
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
          : 'border-transparent bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700'
      )}
    >
      <div className={clsx('w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg mb-2', colors[color])}>
        {count}
      </div>
      <p className="font-medium text-slate-900 dark:text-white capitalize">{status}</p>
      <p className="text-xs text-slate-500 mt-0.5">
        {status === 'active' ? 'Ready to deploy' : 
         status === 'onboarding' ? 'In progress' :
         status === 'screening' ? 'Under review' :
         status === 'lead' ? 'New interest' : 'Click to filter'}
      </p>
    </button>
  );
}

export default function Candidates() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTips, setShowTips] = useState(true);
  const [currentTip, setCurrentTip] = useState(0);
  const [pipelineStats, setPipelineStats] = useState({
    lead: 0,
    screening: 0,
    onboarding: 0,
    active: 0,
    inactive: 0,
  });

  // Add Candidate Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingCandidate, setAddingCandidate] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    source: 'direct',
    status: 'lead',
  });

  const handleAddCandidate = async () => {
    if (!newCandidate.name || !newCandidate.email) {
      alert('Name and email are required');
      return;
    }

    setAddingCandidate(true);
    try {
      const res = await fetch('/api/v1/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCandidate),
      });
      const data = await res.json();

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
        fetchPipelineStats();
      } else {
        alert(data.error || 'Failed to add candidate');
      }
    } catch (error) {
      console.error('Failed to add candidate:', error);
      alert('Failed to add candidate');
    } finally {
      setAddingCandidate(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchPipelineStats();
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % candidateTips.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/v1/candidates?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setCandidates(data.data.map(c => ({
          ...c,
          certifications: typeof c.certifications === 'string' ? JSON.parse(c.certifications || '[]') : (c.certifications || []),
        })));
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPipelineStats = async () => {
    try {
      const res = await fetch('/api/v1/candidates/stats/pipeline');
      const data = await res.json();
      if (data.success) {
        setPipelineStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch pipeline stats:', error);
    }
  };

  // Table columns with profile photos
  const columns = [
    {
      header: 'Candidate',
      accessor: 'name',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <img 
            src={getAvatarUrl(row)}
            alt={value}
            className="h-10 w-10 rounded-lg object-cover"
          />
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Level',
      accessor: 'level',
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className={clsx(
            'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
            value >= 8 ? 'bg-amber-500 text-white' :
            value >= 5 ? 'bg-primary-500 text-white' :
            'bg-slate-200 text-slate-600'
          )}>
            {value}
          </div>
          <span className="text-sm">{levelTitles[value]}</span>
        </div>
      ),
    },
    {
      header: 'XP',
      accessor: 'xp',
      render: (value) => <span className="font-mono text-sm">{(value || 0).toLocaleString()}</span>,
    },
    {
      header: 'Jobs',
      accessor: 'total_jobs_completed',
      render: (value) => value || 0,
    },
    {
      header: 'Rating',
      accessor: 'rating',
      render: (value) => value > 0 ? (
        <div className="flex items-center gap-1">
          <StarIcon className="h-4 w-4 text-amber-500 fill-amber-500" />
          <span>{Number(value).toFixed(1)}</span>
        </div>
      ) : <span className="text-slate-400">-</span>,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (value) => <StatusBadge status={value} />,
    },
  ];

  const totalCandidates = Object.values(pipelineStats).reduce((a, b) => a + b, 0);

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
            {totalCandidates} workers in your talent pool
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" icon={DownloadIcon}>Export</Button>
          <Button size="sm" icon={UserPlusIcon} onClick={() => setShowAddModal(true)}>Add Candidate</Button>
        </div>
      </div>

      {/* Tips Banner */}
      {showTips && (
        <Card className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-primary-100 dark:border-primary-800">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/50">
                <HelpCircleIcon className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">{candidateTips[currentTip].title}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{candidateTips[currentTip].content}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {candidateTips.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentTip(i)}
                  className={clsx(
                    'w-2 h-2 rounded-full transition-colors',
                    i === currentTip ? 'bg-primary-500' : 'bg-slate-300'
                  )}
                />
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <PipelineCard 
          status="active" 
          count={pipelineStats.active || 0} 
          color="emerald" 
          active={statusFilter === 'active'}
          onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
        />
        <PipelineCard 
          status="onboarding" 
          count={pipelineStats.onboarding || 0} 
          color="blue" 
          active={statusFilter === 'onboarding'}
          onClick={() => setStatusFilter(statusFilter === 'onboarding' ? 'all' : 'onboarding')}
        />
        <PipelineCard 
          status="screening" 
          count={pipelineStats.screening || 0} 
          color="amber" 
          active={statusFilter === 'screening'}
          onClick={() => setStatusFilter(statusFilter === 'screening' ? 'all' : 'screening')}
        />
        <PipelineCard 
          status="lead" 
          count={pipelineStats.lead || 0} 
          color="purple" 
          active={statusFilter === 'lead'}
          onClick={() => setStatusFilter(statusFilter === 'lead' ? 'all' : 'lead')}
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Input 
            placeholder="Search candidates..." 
            icon={SearchIcon}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Select 
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'onboarding', label: 'Onboarding' },
              { value: 'screening', label: 'Screening' },
              { value: 'lead', label: 'Lead' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            className="w-36"
          />
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setView('grid')}
            className={clsx(
              'p-2 rounded-md transition-colors',
              view === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'hover:bg-white/50'
            )}
          >
            <GridIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('table')}
            className={clsx(
              'p-2 rounded-md transition-colors',
              view === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'hover:bg-white/50'
            )}
          >
            <ListIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

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
          <Table
            columns={columns}
            data={candidates}
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
                  { value: 'lead', label: 'Lead' },
                  { value: 'screening', label: 'Screening' },
                  { value: 'onboarding', label: 'Onboarding' },
                  { value: 'active', label: 'Active' },
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

// Add missing UsersIcon import alias
const UsersIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
