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
import { clsx } from 'clsx';
import { DEFAULT_LOCALE, TIMEZONE } from '../utils/constants';

function TrainingCard({ training, completed, onStart }) {
  const isLocked = training.prerequisite && !training.prerequisiteCompleted;
  
  return (
    <div className={clsx(
      'p-4 rounded-2xl border transition-all',
      completed 
        ? 'bg-accent-900/20 border-accent-500/30' 
        : isLocked 
          ? 'bg-dark-800/30 border-white/5 opacity-60'
          : 'bg-dark-800/50 border-white/5 hover:border-primary-500/30'
    )}>
      <div className="flex gap-4">
        {/* Icon */}
        <div className={clsx(
          'w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0',
          completed ? 'bg-accent-500/20' : isLocked ? 'bg-dark-700' : 'bg-primary-500/20'
        )}>
          {completed ? (
            <CheckCircleIcon className="h-8 w-8 text-accent-400" />
          ) : isLocked ? (
            <LockIcon className="h-8 w-8 text-dark-500" />
          ) : (
            <BookOpenIcon className="h-8 w-8 text-primary-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className={clsx(
            'font-semibold text-lg',
            completed ? 'text-accent-400' : isLocked ? 'text-dark-500' : 'text-white'
          )}>
            {training.title}
          </h3>
          <p className="text-sm text-dark-400 mt-1 line-clamp-2">{training.description}</p>

          {/* Meta info */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <div className="flex items-center gap-1 text-dark-400">
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

          {/* Action button */}
          {!isLocked && !completed && (
            <button
              onClick={() => onStart(training.id)}
              className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              <PlayCircleIcon className="h-4 w-4" />
              Start Training
            </button>
          )}

          {isLocked && (
            <p className="mt-3 text-xs text-dark-500">
              Complete "{training.prerequisite}" first to unlock
            </p>
          )}

          {completed && (
            <div className="mt-3 flex items-center gap-2 text-accent-400 text-sm">
              <CheckCircleIcon className="h-4 w-4" />
              <span>Completed</span>
              {training.completed_at && (
                <span className="text-dark-500">
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

function CertificationCard({ certification }) {
  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-gold-900/30 to-gold-800/10 border border-gold-500/30">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gold-500/20">
          <AwardIcon className="h-6 w-6 text-gold-400" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-white">{certification.name}</h4>
          <p className="text-xs text-dark-400">
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
        <div className="flex items-center gap-1 text-gold-400">
          <StarIcon className="h-4 w-4 fill-gold-400" />
        </div>
      </div>
    </div>
  );
}

export default function Training() {
  const { user } = useAuth();
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
    if (!activeTraining) return;
    
    // Mark as completed (in real app, verify completion on backend)
    setCompletedIds(prev => [...prev, activeTraining.id]);
    
    if (activeTraining.certification_name) {
      setCertifications(prev => [...prev, {
        id: Date.now(),
        name: activeTraining.certification_name,
        earned_at: new Date().toISOString(),
      }]);
    }
    
    setActiveTraining(null);
    
    // In real app, call API
    // await fetch(`/api/v1/training/${activeTraining.id}/complete`, { method: 'POST' });
  };

  const filteredTrainings = trainings.filter(t => {
    if (filter === 'completed') return completedIds.includes(t.id);
    if (filter === 'available') return !completedIds.includes(t.id);
    return true;
  });

  // Training Modal/View
  if (activeTraining) {
    return (
      <div className="min-h-screen bg-dark-950 pb-24">
        <div className="sticky top-0 z-10 bg-dark-900 px-4 pt-safe pb-4 border-b border-white/5">
          <button 
            onClick={() => setActiveTraining(null)}
            className="text-dark-400 hover:text-white mb-4"
          >
            ← Back to Training
          </button>
          <h1 className="text-xl font-bold text-white">{activeTraining.title}</h1>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Training content placeholder */}
          <div className="aspect-video rounded-2xl bg-dark-800 flex items-center justify-center">
            <div className="text-center">
              <PlayCircleIcon className="h-16 w-16 text-primary-400 mx-auto mb-4" />
              <p className="text-dark-400">Training content would appear here</p>
              <p className="text-sm text-dark-500 mt-1">Duration: {activeTraining.duration_minutes} minutes</p>
            </div>
          </div>

          {/* Training info */}
          <div className="p-4 rounded-xl bg-dark-800/50 border border-white/5">
            <h3 className="font-semibold text-white mb-2">About this training</h3>
            <p className="text-dark-400">{activeTraining.description}</p>
            
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-1 text-primary-400">
                <ZapIcon className="h-4 w-4" />
                <span>+{activeTraining.xp_reward} XP</span>
              </div>
              {activeTraining.certification_name && (
                <div className="flex items-center gap-1 text-gold-400">
                  <AwardIcon className="h-4 w-4" />
                  <span>{activeTraining.certification_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Complete button */}
          <button
            onClick={handleCompleteTraining}
            className="w-full py-4 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors"
          >
            Mark as Complete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-dark-950/95 backdrop-blur-lg px-4 pt-safe pb-4 border-b border-white/5">
        <h1 className="text-2xl font-bold text-white">Training</h1>
        <p className="text-dark-400 text-sm mt-1">Learn skills and earn certifications</p>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Progress summary */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary-900/30 to-accent-900/30 border border-primary-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-white">
                {completedIds.length}/{trainings.length}
              </p>
              <p className="text-sm text-dark-400">Courses completed</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gold-400">{certifications.length}</p>
              <p className="text-sm text-dark-400">Certifications</p>
            </div>
          </div>
        </div>

        {/* Certifications earned */}
        {certifications.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Your Certifications</h2>
            <div className="space-y-3">
              {certifications.map(cert => (
                <CertificationCard key={cert.id} certification={cert} />
              ))}
            </div>
          </div>
        )}

        {/* Filter tabs */}
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
                'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                filter === tab.id 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-dark-800 text-dark-400'
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
            <BookOpenIcon className="h-12 w-12 text-dark-600 mx-auto mb-4" />
            <p className="text-dark-400">No trainings found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrainings.map(training => (
              <TrainingCard 
                key={training.id} 
                training={training} 
                completed={completedIds.includes(training.id)}
                onStart={handleStartTraining}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
