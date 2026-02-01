import { useState, useEffect } from 'react';
import {
  BookOpenIcon,
  PlayCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  AwardIcon,
  ZapIcon,
  LockIcon,
  ChevronRightIcon,
  StarIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/ui/Toast';
import { clsx } from 'clsx';
import { DEFAULT_LOCALE, TIMEZONE } from '../utils/constants';

function TrainingCard({ training, completed, onStart, isDark }) {
  const isLocked = training.prerequisite && !training.prerequisiteCompleted;

  return (
    <div className={clsx(
      'p-4 rounded-2xl border backdrop-blur-md transition-all',
      completed
        ? isDark
          ? 'bg-accent-500/10 border-accent-500/30 shadow-lg shadow-accent-500/5'
          : 'bg-emerald-50 border-emerald-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
        : isLocked
          ? isDark
            ? 'bg-white/[0.02] border-white/[0.05] opacity-60'
            : 'bg-slate-50 border-slate-200 opacity-60'
          : isDark
            ? 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05] hover:border-primary-500/30'
            : 'bg-white border-slate-200 shadow-[0_4px_15px_rgba(0,0,0,0.04)] hover:border-primary-300'
    )}>
      <div className="flex gap-4">
        {/* Icon */}
        <div className={clsx(
          'w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0',
          completed
            ? 'bg-accent-500/20'
            : isLocked
              ? isDark ? 'bg-dark-700' : 'bg-slate-200'
              : 'bg-primary-500/20'
        )}>
          {completed ? (
            <CheckCircleIcon className="h-8 w-8 text-accent-400" />
          ) : isLocked ? (
            <LockIcon className={clsx('h-8 w-8', isDark ? 'text-dark-500' : 'text-slate-400')} />
          ) : (
            <BookOpenIcon className="h-8 w-8 text-primary-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className={clsx(
            'font-semibold text-lg',
            completed
              ? 'text-accent-500'
              : isLocked
                ? isDark ? 'text-dark-500' : 'text-slate-400'
                : isDark ? 'text-white' : 'text-slate-900'
          )}>
            {training.title}
          </h3>
          <p className={clsx('text-sm mt-1 line-clamp-2', isDark ? 'text-dark-400' : 'text-slate-500')}>{training.description}</p>

          {/* Meta info */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <div className={clsx('flex items-center gap-1', isDark ? 'text-dark-400' : 'text-slate-500')}>
              <ClockIcon className="h-4 w-4" />
              <span>{training.duration_minutes} min</span>
            </div>
            <div className={clsx(
              'flex items-center gap-1',
              completed ? 'text-accent-400' : 'text-primary-400'
            )}>
              <ZapIcon className="h-4 w-4" />
              <span>+{training.xp_reward} XP</span>
            </div>
            {training.certification_name && (
              <div className="flex items-center gap-1 text-gold-400">
                <AwardIcon className="h-4 w-4" />
                <span className="truncate max-w-[100px]">{training.certification_name}</span>
              </div>
            )}
          </div>

          {/* Action button - Neon style */}
          {!isLocked && !completed && (
            <button
              onClick={() => onStart(training.id)}
              className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-violet-500 text-white text-sm font-medium shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all active:scale-[0.98]"
            >
              <PlayCircleIcon className="h-4 w-4" />
              Start Training
            </button>
          )}

          {isLocked && (
            <p className={clsx('mt-3 text-xs', isDark ? 'text-dark-500' : 'text-slate-400')}>
              Complete "{training.prerequisite}" first to unlock
            </p>
          )}

          {completed && (
            <div className="mt-3 flex items-center gap-2 text-accent-500 text-sm">
              <CheckCircleIcon className="h-4 w-4" />
              <span>Completed</span>
              {training.completed_at && (
                <span className={isDark ? 'text-dark-500' : 'text-slate-400'}>
                  • {new Date(training.completed_at).toLocaleDateString(DEFAULT_LOCALE, { day: 'numeric', month: 'short', timeZone: TIMEZONE })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CertificationCard({ certification, isDark }) {
  return (
    <div className={clsx(
      'relative p-4 rounded-xl border backdrop-blur-md overflow-hidden',
      isDark
        ? 'bg-white/[0.03] border-gold-500/30'
        : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 shadow-[0_4px_15px_rgba(0,0,0,0.04)]'
    )}>
      {/* Gold glow for dark mode */}
      {isDark && (
        <div className="absolute inset-0 bg-gradient-to-br from-gold-500/10 to-amber-500/5" />
      )}
      <div className="relative flex items-center gap-3">
        <div className={clsx('p-3 rounded-xl border', isDark ? 'bg-gold-500/20 border-gold-500/30' : 'bg-amber-100 border-amber-200')}>
          <AwardIcon className="h-6 w-6 text-gold-500" />
        </div>
        <div className="flex-1">
          <h4
            className={clsx('font-semibold', isDark ? 'text-white' : 'text-slate-900')}
            style={isDark ? { textShadow: '0 0 15px rgba(251,191,36,0.3)' } : undefined}
          >
            {certification.name}
          </h4>
          <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-slate-500')}>
            {certification.earned_at
              ? `Earned ${new Date(certification.earned_at).toLocaleDateString(DEFAULT_LOCALE, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  timeZone: TIMEZONE
                })}`
              : 'Certified'
            }
          </p>
        </div>
        <div className="flex items-center gap-1 text-gold-500">
          <StarIcon className="h-5 w-5 fill-gold-400" />
        </div>
      </div>
    </div>
  );
}

export default function Training() {
  const { user, refreshUser } = useAuth();
  const { isDark } = useTheme();
  const toast = useToast();
  const [trainings, setTrainings] = useState([]);
  const [completedIds, setCompletedIds] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [activeTraining, setActiveTraining] = useState(null);

  useEffect(() => {
    fetchTrainings();
  }, [user]);

  const fetchTrainings = async () => {
    try {
      const res = await fetch('/api/v1/training');
      const data = await res.json();
      if (data.success) {
        setTrainings(data.data);
        
        // Get user's completed trainings from certifications
        if (user?.certifications) {
          const certs = Array.isArray(user.certifications)
            ? user.certifications
            : JSON.parse(user.certifications || '[]');

          const completed = data.data.filter(t => certs.includes(t.certification_name)).map(t => t.id);
          setCompletedIds(completed);

          // Set certifications - earned_at will be null if not tracked
          // The display component will handle missing dates gracefully
          setCertifications(certs.map((name, idx) => ({
            id: `cert-${idx}`,
            name,
            earned_at: null, // Date not tracked - would need DB schema update to store
          })));
        }
      }
    } catch (error) {
      console.error('Failed to fetch trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTraining = (trainingId) => {
    const training = trainings.find(t => t.id === trainingId);
    if (training) {
      setActiveTraining(training);
    }
  };

  const handleCompleteTraining = async () => {
    if (!activeTraining || !user?.id) return;

    try {
      // Call API to mark training as complete
      const res = await fetch(`/api/v1/training/${activeTraining.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: user.id }),
      });
      const data = await res.json();

      if (data.success) {
        // Mark as completed locally
        setCompletedIds(prev => [...prev, activeTraining.id]);

        if (activeTraining.certification_name) {
          setCertifications(prev => [...prev, {
            id: Date.now(),
            name: activeTraining.certification_name,
            earned_at: new Date().toISOString(),
          }]);
        }

        toast.success('Training Complete!', `+${activeTraining.xp_reward} XP earned`);
        refreshUser?.();
      } else {
        toast.error('Failed to complete', data.error || 'Please try again');
      }
    } catch (error) {
      console.error('Failed to complete training:', error);
      // Still mark as completed locally for demo purposes
      setCompletedIds(prev => [...prev, activeTraining.id]);
      toast.success('Training Complete!', `+${activeTraining.xp_reward} XP earned`);
    }

    setActiveTraining(null);
  };

  const filteredTrainings = trainings.filter(t => {
    if (filter === 'completed') return completedIds.includes(t.id);
    if (filter === 'available') return !completedIds.includes(t.id);
    return true;
  });

  // Training Modal/View
  if (activeTraining) {
    return (
      <div className={clsx('min-h-screen pb-24', isDark ? 'bg-dark-950' : 'bg-transparent')}>
        <div className={clsx(
          'sticky top-0 z-10 px-4 pt-safe pb-4 border-b',
          isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-slate-200'
        )}>
          <button
            onClick={() => setActiveTraining(null)}
            className={clsx('mb-4', isDark ? 'text-dark-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}
          >
            ← Back to Training
          </button>
          <h1 className={clsx('text-xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>{activeTraining.title}</h1>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Training content placeholder */}
          <div className={clsx(
            'aspect-video rounded-2xl flex items-center justify-center',
            isDark ? 'bg-dark-800' : 'bg-slate-100'
          )}>
            <div className="text-center">
              <PlayCircleIcon className="h-16 w-16 text-primary-400 mx-auto mb-4" />
              <p className={isDark ? 'text-dark-400' : 'text-slate-500'}>Training content coming soon</p>
              <p className={clsx('text-sm mt-1', isDark ? 'text-dark-500' : 'text-slate-400')}>Duration: {activeTraining.duration_minutes} minutes</p>
            </div>
          </div>

          {/* Training info */}
          <div className={clsx(
            'p-4 rounded-xl border',
            isDark ? 'bg-dark-800/50 border-white/5' : 'bg-white border-slate-200'
          )}>
            <h3 className={clsx('font-semibold mb-2', isDark ? 'text-white' : 'text-slate-900')}>About this training</h3>
            <p className={isDark ? 'text-dark-400' : 'text-slate-600'}>{activeTraining.description}</p>

            <div className={clsx('flex items-center gap-4 mt-4 pt-4 border-t', isDark ? 'border-white/5' : 'border-slate-100')}>
              <div className="flex items-center gap-1 text-primary-400">
                <ZapIcon className="h-4 w-4" />
                <span>+{activeTraining.xp_reward} XP</span>
              </div>
              {activeTraining.certification_name && (
                <div className="flex items-center gap-1 text-gold-500">
                  <AwardIcon className="h-4 w-4" />
                  <span>{activeTraining.certification_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Complete button */}
          <button
            onClick={handleCompleteTraining}
            className="w-full py-4 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors active:scale-[0.98]"
          >
            Mark as Complete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('min-h-screen pb-24', isDark ? 'bg-dark-950' : 'bg-transparent')}>
      {/* Header - Glassmorphism */}
      <div className={clsx(
        'sticky top-0 z-10 backdrop-blur-xl px-4 pt-safe pb-4',
        isDark ? 'bg-dark-950/90 border-b border-white/[0.08]' : 'bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
      )}>
        <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>Training</h1>
        <p className={clsx('text-sm mt-1', isDark ? 'text-dark-400' : 'text-slate-500')}>Learn skills and earn certifications</p>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Progress summary - Glassmorphism */}
        <div className={clsx(
          'relative p-5 rounded-2xl border backdrop-blur-md overflow-hidden',
          isDark
            ? 'bg-white/[0.03] border-white/[0.08]'
            : 'bg-gradient-to-r from-primary-50 to-accent-50 border-primary-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
        )}>
          {/* Background glow */}
          {isDark && (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-accent-500/10" />
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary-500/15 rounded-full blur-[40px]" />
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gold-500/15 rounded-full blur-[40px]" />
            </>
          )}
          <div className="relative flex items-center justify-between">
            <div>
              <p
                className={clsx('text-3xl font-bold', isDark ? 'text-white' : 'text-slate-900')}
                style={isDark ? { textShadow: '0 0 20px rgba(99,102,241,0.3)' } : undefined}
              >
                {completedIds.length}<span className={isDark ? 'text-dark-500' : 'text-slate-400'}>/{trainings.length}</span>
              </p>
              <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>Courses completed</p>
            </div>
            <div className={clsx(
              'text-right px-4 py-3 rounded-xl backdrop-blur-md border',
              isDark ? 'bg-gold-500/10 border-gold-500/20' : 'bg-amber-50 border-amber-200'
            )}>
              <p
                className="text-2xl font-bold text-gold-500"
                style={isDark ? { textShadow: '0 0 15px rgba(251,191,36,0.4)' } : undefined}
              >
                {certifications.length}
              </p>
              <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-slate-500')}>Certifications</p>
            </div>
          </div>
        </div>

        {/* Certifications earned */}
        {certifications.length > 0 && (
          <div>
            <h2 className={clsx('text-lg font-semibold mb-3', isDark ? 'text-white' : 'text-slate-900')}>Your Certifications</h2>
            <div className="space-y-3">
              {certifications.map(cert => (
                <CertificationCard key={cert.id} certification={cert} isDark={isDark} />
              ))}
            </div>
          </div>
        )}

        {/* Filter tabs - Glass style */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All Courses' },
            { id: 'available', label: 'Available' },
            { id: 'completed', label: 'Completed' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                filter === tab.id
                  ? 'bg-gradient-to-r from-primary-500 to-violet-500 text-white border-transparent shadow-lg shadow-primary-500/25'
                  : isDark
                    ? 'bg-white/[0.05] border-white/[0.1] text-dark-400 hover:bg-white/[0.08] hover:text-white'
                    : 'bg-white border-slate-200 text-slate-500 shadow-sm'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Training list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredTrainings.length === 0 ? (
          <div className="text-center py-12">
            <BookOpenIcon className={clsx('h-12 w-12 mx-auto mb-4', isDark ? 'text-dark-600' : 'text-slate-300')} />
            <p className={isDark ? 'text-dark-400' : 'text-slate-500'}>No trainings available yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrainings.map(training => (
              <TrainingCard
                key={training.id}
                training={training}
                completed={completedIds.includes(training.id)}
                onStart={handleStartTraining}
                isDark={isDark}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
