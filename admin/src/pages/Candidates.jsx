import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  SearchIcon, 
  FilterIcon, 
  DownloadIcon,
  MailIcon,
  PhoneIcon,
  StarIcon,
  TrophyIcon,
  ZapIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge, { StatusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Table, { TablePagination } from '../components/ui/Table';
import Avatar from '../components/ui/Avatar';
import Modal, { ModalFooter } from '../components/ui/Modal';
import { useData } from '../contexts/DataContext';
import { clsx } from 'clsx';

// Level title mapping
const levelTitles = {
  1: 'Rookie',
  2: 'Starter',
  3: 'Active',
  4: 'Reliable',
  5: 'Pro',
  6: 'Expert',
  7: 'Elite',
  8: 'Master',
  9: 'Legend',
  10: 'Champion',
};

// XP thresholds
const xpThresholds = [0, 500, 1200, 2500, 5000, 8000, 12000, 18000, 25000, 35000];

function CandidateCard({ candidate, onClick }) {
  const xpProgress = candidate.level < 10 
    ? ((candidate.xp - xpThresholds[candidate.level - 1]) / (xpThresholds[candidate.level] - xpThresholds[candidate.level - 1])) * 100
    : 100;

  return (
    <Card hover onClick={onClick} className="relative overflow-hidden">
      {/* Level indicator stripe */}
      <div 
        className={clsx(
          'absolute top-0 left-0 right-0 h-1',
          candidate.level >= 8 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
          candidate.level >= 5 ? 'bg-gradient-to-r from-primary-400 to-primary-600' :
          'bg-gradient-to-r from-slate-300 to-slate-400'
        )} 
      />
      
      <div className="flex items-start gap-4">
        <Avatar name={candidate.name} size="lg" status={candidate.availability === 'available' ? 'online' : 'busy'} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{candidate.name}</h3>
            <StatusBadge status={candidate.status} />
          </div>
          
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {candidate.email}
          </p>
          
          {/* Level & XP */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className={clsx(
                'px-2 py-0.5 rounded-full text-xs font-semibold',
                candidate.level >= 8 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                candidate.level >= 5 ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' :
                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}>
                Lv.{candidate.level} {levelTitles[candidate.level]}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>{candidate.xp.toLocaleString()} XP</span>
                {candidate.level < 10 && (
                  <span>{xpThresholds[candidate.level].toLocaleString()} XP</span>
                )}
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={clsx(
                    'h-full rounded-full transition-all',
                    candidate.level >= 8 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                    candidate.level >= 5 ? 'bg-gradient-to-r from-primary-400 to-primary-500' :
                    'bg-slate-400'
                  )}
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="mt-3 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
              <TrophyIcon className="h-4 w-4" />
              <span>{candidate.totalJobsCompleted} jobs</span>
            </div>
            {candidate.rating && (
              <div className="flex items-center gap-1 text-amber-500">
                <StarIcon className="h-4 w-4 fill-current" />
                <span>{candidate.rating}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <span>{candidate.certifications.length} certs</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Candidates() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid'); // 'grid' or 'table'
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pipelineStats, setPipelineStats] = useState({
    lead: 0,
    applied: 0,
    screening: 0,
    onboarding: 0,
    active: 0,
  });
  const pageSize = 20;

  // Fetch candidates from API
  useEffect(() => {
    fetchCandidates();
    fetchPipelineStats();
  }, [statusFilter, searchQuery, currentPage]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', currentPage);
      params.append('limit', pageSize);

      const res = await fetch(`/api/v1/candidates?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setCandidates(data.data.map(c => ({
          ...c,
          xp: c.xp || 0,
          level: c.level || 1,
          totalJobsCompleted: c.total_jobs_completed || 0,
          rating: c.rating || null,
          certifications: c.certifications || [],
          availability: c.online_status === 'online' ? 'available' : 'offline',
          createdAt: c.created_at,
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

  // Filter candidates (client-side for already fetched data)
  const filteredCandidates = candidates;

  // Table columns
  const columns = [
    {
      header: 'Candidate',
      accessor: 'name',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <Avatar name={value} size="sm" />
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Level',
      accessor: 'level',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <ZapIcon className={clsx(
            'h-4 w-4',
            value >= 8 ? 'text-amber-500' :
            value >= 5 ? 'text-primary-500' :
            'text-slate-400'
          )} />
          <span>Lv.{value}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{levelTitles[value]}</span>
        </div>
      ),
    },
    {
      header: 'XP',
      accessor: 'xp',
      render: (value) => (
        <span className="font-mono text-sm">{value.toLocaleString()}</span>
      ),
    },
    {
      header: 'Jobs',
      accessor: 'totalJobsCompleted',
    },
    {
      header: 'Rating',
      accessor: 'rating',
      render: (value) => value ? (
        <div className="flex items-center gap-1">
          <StarIcon className="h-4 w-4 text-amber-500 fill-current" />
          <span>{value}</span>
        </div>
      ) : (
        <span className="text-slate-400">-</span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      header: 'Source',
      accessor: 'source',
      render: (value) => (
        <Badge variant="neutral" className="capitalize">{value}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Candidates</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage your candidate pipeline and workforce
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" icon={DownloadIcon}>
            Export
          </Button>
          <Button size="sm" icon={PlusIcon} onClick={() => setShowAddModal(true)}>
            Add Candidate
          </Button>
        </div>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {Object.entries(pipelineStats).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={clsx(
              'p-4 rounded-xl border-2 transition-all text-left',
              statusFilter === status
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            )}
          >
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{count}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{status}</p>
          </button>
        ))}
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
              { value: 'all', label: 'All Statuses' },
              { value: 'lead', label: 'Lead' },
              { value: 'applied', label: 'Applied' },
              { value: 'screening', label: 'Screening' },
              { value: 'onboarding', label: 'Onboarding' },
              { value: 'active', label: 'Active' },
            ]}
            className="w-40"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('grid')}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              view === 'grid'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            Grid
          </button>
          <button
            onClick={() => setView('table')}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              view === 'table'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            Table
          </button>
        </div>
      </div>

      {/* Grid View */}
      {view === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onClick={() => navigate(`/candidates/${candidate.id}`)}
            />
          ))}
        </div>
      )}

      {/* Table View */}
      {view === 'table' && (
        <Card padding="none">
          <Table
            columns={columns}
            data={filteredCandidates}
            onRowClick={(row) => navigate(`/candidates/${row.id}`)}
          />
          <TablePagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredCandidates.length / pageSize)}
            totalItems={filteredCandidates.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </Card>
      )}

      {/* Add Candidate Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Candidate"
        description="Register a new candidate in the system"
      >
        <div className="space-y-4">
          <Input label="Full Name" placeholder="Enter full name" />
          <Input label="Email" type="email" placeholder="Enter email address" />
          <Input label="Phone" type="tel" placeholder="+65 XXXX XXXX" />
          <Input label="Date of Birth" type="date" />
          <Select
            label="Source"
            options={[
              { value: 'referral', label: 'Referral' },
              { value: 'social', label: 'Social Media' },
              { value: 'walk-in', label: 'Walk-in' },
              { value: 'gebiz', label: 'GeBIZ Tender' },
              { value: 'job-fair', label: 'Job Fair' },
            ]}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
          <Button onClick={() => setShowAddModal(false)}>Add Candidate</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
