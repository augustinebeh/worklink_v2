import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  MailIcon,
  PhoneIcon,
  CalendarIcon,
  MapPinIcon,
  StarIcon,
  TrophyIcon,
  ZapIcon,
  EditIcon,
  UserIcon,
  BriefcaseIcon,
  WalletIcon,
  AwardIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  FlameIcon,
  BadgeCheckIcon,
  SendIcon,
  MoreVerticalIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge, { StatusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Modal, { ModalFooter } from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import PerformanceScores from '../components/candidate/PerformanceScores';
import { clsx } from 'clsx';
import { XP_THRESHOLDS as xpThresholds, LEVEL_TITLES } from '../../../shared/utils/gamification-browser';

// Level configuration (uses shared LEVEL_TITLES)
const levelConfig = {
  1: { title: LEVEL_TITLES[1], color: 'slate', minXp: 0 },
  2: { title: LEVEL_TITLES[2], color: 'slate', minXp: 500 },
  3: { title: LEVEL_TITLES[3], color: 'slate', minXp: 1200 },
  4: { title: LEVEL_TITLES[4], color: 'blue', minXp: 2500 },
  5: { title: LEVEL_TITLES[5], color: 'blue', minXp: 5000 },
  6: { title: LEVEL_TITLES[6], color: 'purple', minXp: 8000 },
  7: { title: LEVEL_TITLES[7], color: 'purple', minXp: 12000 },
  8: { title: LEVEL_TITLES[8], color: 'amber', minXp: 18000 },
  9: { title: LEVEL_TITLES[9], color: 'amber', minXp: 25000 },
  10: { title: LEVEL_TITLES[10], color: 'amber', minXp: 35000 },
};

function StatCard({ icon: Icon, label, value, subValue, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  };

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
      <div className={clsx('p-2.5 rounded-lg', colorClasses[color])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        {subValue && <p className="text-xs text-slate-400">{subValue}</p>}
      </div>
    </div>
  );
}

function AchievementBadge({ achievement }) {
  const rarityColors = {
    common: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600',
    rare: 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700',
    epic: 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700',
    legendary: 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700',
  };

  return (
    <div className={clsx(
      'flex items-center gap-3 p-3 rounded-lg border-2',
      rarityColors[achievement.rarity || 'common']
    )}>
      <span className="text-2xl">{achievement.icon || '🏆'}</span>
      <div>
        <p className="font-medium text-slate-900 dark:text-white text-sm">{achievement.name}</p>
        <p className="text-xs text-slate-500">{achievement.description}</p>
      </div>
    </div>
  );
}

function DeploymentRow({ deployment }) {
  const statusColors = {
    completed: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    assigned: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    cancelled: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className={clsx('p-2 rounded-lg', statusColors[deployment.status] || statusColors.assigned)}>
          {deployment.status === 'completed' ? (
            <CheckCircleIcon className="h-4 w-4" />
          ) : deployment.status === 'cancelled' ? (
            <XCircleIcon className="h-4 w-4" />
          ) : (
            <ClockIcon className="h-4 w-4" />
          )}
        </div>
        <div>
          <p className="font-medium text-slate-900 dark:text-white text-sm">{deployment.job_title}</p>
          <p className="text-xs text-slate-500">{deployment.company_name} • {deployment.location}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm text-slate-900 dark:text-white">{new Date(deployment.job_date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}</p>
        {deployment.rating && (
          <div className="flex items-center gap-1 text-amber-500 text-xs">
            <StarIcon className="h-3 w-3 fill-current" />
            <span>{deployment.rating}</span>
          </div>
        )}
      </div>
    </div>
  );
}

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
      const res = await fetch(`/api/v1/candidates/${id}`);
      const data = await res.json();
      
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
      const res = await fetch(`/api/v1/candidates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        setCandidate({ ...candidate, ...data.data });
        setShowEditModal(false);
      }
    } catch (err) {
      alert('Failed to update candidate');
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

  const level = candidate.level || 1;
  const levelInfo = levelConfig[level];
  const currentXp = candidate.xp || 0;
  const nextLevelXp = level < 10 ? xpThresholds[level] : xpThresholds[9];
  const prevLevelXp = xpThresholds[level - 1];
  const xpProgress = level < 10 
    ? ((currentXp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100 
    : 100;

  const certifications = candidate.certifications || [];
  const achievements = candidate.achievements || [];
  const deployments = candidate.deployments || [];

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Profile Header Card */}
      <Card className="relative overflow-hidden">
        {/* Level color stripe */}
        <div className={clsx(
          'absolute top-0 left-0 right-0 h-2',
          level >= 8 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
          level >= 5 ? 'bg-gradient-to-r from-primary-400 to-primary-600' :
          'bg-gradient-to-r from-slate-300 to-slate-400'
        )} />

        <div className="pt-4">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Avatar & Basic Info */}
            <div className="flex items-start gap-4">
              <Avatar 
                name={candidate.name} 
                src={candidate.profile_photo}
                size="xl" 
                status={candidate.online_status === 'online' ? 'online' : 'offline'}
              />
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {candidate.name}
                  </h1>
                  <StatusBadge status={candidate.status} />
                </div>
                
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <MailIcon className="h-4 w-4" />
                    <span className="text-sm">{candidate.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <PhoneIcon className="h-4 w-4" />
                    <span className="text-sm">{candidate.phone}</span>
                  </div>
                  {candidate.date_of_birth && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <CalendarIcon className="h-4 w-4" />
                      <span className="text-sm">
                        {new Date(candidate.date_of_birth).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Level Badge */}
                <div className="mt-4">
                  <div className={clsx(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
                    level >= 8 ? 'bg-amber-100 dark:bg-amber-900/30' :
                    level >= 5 ? 'bg-primary-100 dark:bg-primary-900/30' :
                    'bg-slate-100 dark:bg-slate-800'
                  )}>
                    <ZapIcon className={clsx(
                      'h-4 w-4',
                      level >= 8 ? 'text-amber-600' :
                      level >= 5 ? 'text-primary-600' :
                      'text-slate-500'
                    )} />
                    <span className={clsx(
                      'font-semibold',
                      level >= 8 ? 'text-amber-700 dark:text-amber-400' :
                      level >= 5 ? 'text-primary-700 dark:text-primary-400' :
                      'text-slate-700 dark:text-slate-300'
                    )}>
                      Level {level} {levelInfo.title}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="md:ml-auto flex items-center gap-2">
              <Button variant="secondary" size="sm" icon={SendIcon} onClick={() => navigate(`/chat?candidate=${candidate.id}`)}>
                Message
              </Button>
              <Button size="sm" icon={EditIcon} onClick={() => setShowEditModal(true)}>
                Edit Profile
              </Button>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {currentXp.toLocaleString()} XP
              </span>
              {level < 10 && (
                <span className="text-sm text-slate-500">
                  {(nextLevelXp - currentXp).toLocaleString()} XP to Level {level + 1}
                </span>
              )}
            </div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  level >= 8 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                  level >= 5 ? 'bg-gradient-to-r from-primary-400 to-primary-500' :
                  'bg-slate-400'
                )}
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={BriefcaseIcon} 
          label="Jobs Completed" 
          value={candidate.total_jobs_completed || 0}
          color="primary"
        />
        <StatCard 
          icon={StarIcon} 
          label="Average Rating" 
          value={candidate.rating ? candidate.rating.toFixed(1) : '-'}
          subValue={candidate.rating ? '⭐'.repeat(Math.round(candidate.rating)) : 'No ratings yet'}
          color="amber"
        />
        <StatCard 
          icon={WalletIcon} 
          label="Total Earnings" 
          value={`$${(candidate.total_earnings || 0).toFixed(0)}`}
          subValue={`+$${(candidate.total_incentives_earned || 0).toFixed(0)} incentives`}
          color="emerald"
        />
        <StatCard 
          icon={FlameIcon} 
          label="Current Streak" 
          value={`${candidate.streak_days || 0} days`}
          color="blue"
        />
      </div>

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
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Certifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgeCheckIcon className="h-5 w-5 text-primary-500" />
                Certifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {certifications.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {certifications.map((cert, idx) => (
                    <Badge key={idx} variant="success" className="px-3 py-1">
                      {cert}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No certifications yet</p>
              )}
            </CardContent>
          </Card>

          {/* Source & Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary-500" />
                Profile Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Source</span>
                <Badge variant="neutral" className="capitalize">{candidate.source || 'Direct'}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Referral Code</span>
                <span className="font-mono text-sm">{candidate.referral_code || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Member Since</span>
                <span>{new Date(candidate.created_at).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last Active</span>
                <span>{candidate.last_seen ? new Date(candidate.last_seen).toLocaleDateString() : 'Never'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Performance Scores */}
          <PerformanceScores candidateId={candidate.id} />

          {/* Recent Achievements */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrophyIcon className="h-5 w-5 text-amber-500" />
                Achievements ({achievements.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {achievements.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {achievements.slice(0, 6).map((ach) => (
                    <AchievementBadge key={ach.id} achievement={ach} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">No achievements unlocked yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'deployments' && (
        <Card>
          <CardHeader>
            <CardTitle>Job History</CardTitle>
          </CardHeader>
          <CardContent>
            {deployments.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {deployments.map((dep) => (
                  <DeploymentRow key={dep.id} deployment={dep} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">No job history yet</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'achievements' && (
        <Card>
          <CardHeader>
            <CardTitle>All Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            {achievements.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.map((ach) => (
                  <AchievementBadge key={ach.id} achievement={ach} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">No achievements unlocked yet</p>
            )}
          </CardContent>
        </Card>
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
