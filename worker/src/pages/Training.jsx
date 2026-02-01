import { useState, useEffect } from 'react';
import {
  BookOpenIcon,
  PlayCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ZapIcon,
  LockIcon,
  XIcon,
  ChevronRightIcon,
  AwardIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { clsx } from 'clsx';

// Training Module Modal
function TrainingModal({ module, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  
  // Mock training content - in production this would come from the API
  const steps = module.content ? JSON.parse(module.content) : [
    { title: 'Introduction', content: module.description || 'Welcome to this training module.' },
    { title: 'Key Concepts', content: 'Learn the key concepts and best practices for this topic.' },
    { title: 'Practical Tips', content: 'Apply what you\'ve learned with these practical tips.' },
    { title: 'Summary', content: 'Great job! You\'ve completed this training module.' },
  ];
  
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    await onComplete(module);
    setCompleting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#0a1628] rounded-t-3xl sm:rounded-3xl border border-white/[0.08] max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-[#0a1628] px-4 py-4 border-b border-white/[0.05]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <BookOpenIcon className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{module.title}</h2>
                <p className="text-xs text-white/40">{module.category || 'Training'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 transition-colors"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-white/40 mt-2 text-center">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[200px]">
          <h3 className="text-xl font-semibold text-white mb-4">{steps[currentStep].title}</h3>
          <p className="text-white/60 leading-relaxed">{steps[currentStep].content}</p>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0a1628] px-4 py-4 border-t border-white/[0.05]">
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={completing}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-semibold shadow-lg shadow-cyan-500/25 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {completing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  Completing...
                </span>
              ) : isLastStep ? (
                <span className="flex items-center justify-center gap-2">
                  <AwardIcon className="h-5 w-5" />
                  Complete & Earn {module.xp_reward || 50} XP
                </span>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrainingCard({ module, userProgress, onStart }) {
  const isCompleted = userProgress?.status === 'completed';
  const isInProgress = userProgress?.status === 'in_progress';
  const isLocked = module.prerequisite && !userProgress?.prerequisiteMet;
  const progress = userProgress?.progress || 0;

  return (
    <div className={clsx(
      'p-4 rounded-2xl border transition-all',
      isCompleted
        ? 'bg-emerald-500/10 border-emerald-500/30'
        : isLocked
          ? 'bg-white/[0.02] border-white/[0.03] opacity-50'
          : 'bg-[#0a1628]/80 border-white/[0.05] hover:border-cyan-500/30'
    )}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={clsx(
          'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0',
          isCompleted ? 'bg-emerald-500/20' : isLocked ? 'bg-white/5' : 'bg-cyan-500/20'
        )}>
          {isCompleted ? (
            <CheckCircleIcon className="h-7 w-7 text-emerald-400" />
          ) : isLocked ? (
            <LockIcon className="h-6 w-6 text-white/30" />
          ) : (
            <BookOpenIcon className="h-7 w-7 text-cyan-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx(
              'px-2 py-0.5 rounded-md text-xs font-medium',
              isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'
            )}>
              {module.category || 'Training'}
            </span>
            <span className="flex items-center gap-1 text-xs text-white/40">
              <ClockIcon className="h-3 w-3" /> {module.duration || '15'} min
            </span>
          </div>

          <h3 className={clsx(
            'font-semibold',
            isCompleted ? 'text-emerald-400' : isLocked ? 'text-white/40' : 'text-white'
          )}>
            {module.title}
          </h3>

          <p className={clsx('text-sm mt-0.5', isLocked ? 'text-white/20' : 'text-white/40')}>
            {module.description}
          </p>

          {/* Progress */}
          {isInProgress && !isCompleted && (
            <div className="mt-3">
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/20">
            <ZapIcon className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-sm font-bold text-violet-400">+{module.xp_reward || 50}</span>
          </div>

          {!isLocked && !isCompleted && (
            <button
              onClick={() => onStart(module)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
            >
              <PlayCircleIcon className="h-4 w-4" />
              {isInProgress ? 'Continue' : 'Start'}
            </button>
          )}

          {isCompleted && (
            <span className="text-xs text-emerald-400 font-medium">Completed</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Training() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [modules, setModules] = useState([]);
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [activeModule, setActiveModule] = useState(null);

  useEffect(() => {
    if (user) fetchTraining();
  }, [user]);

  const fetchTraining = async () => {
    try {
      const [modulesRes, progressRes] = await Promise.all([
        fetch('/api/v1/training'),
        fetch(`/api/v1/training/progress/${user.id}`),
      ]);
      const modulesData = await modulesRes.json();
      const progressData = await progressRes.json();
      
      if (modulesData.success) setModules(modulesData.data || []);
      if (progressData.success) {
        const progressMap = {};
        (progressData.data || []).forEach(p => {
          progressMap[p.module_id] = p;
        });
        setUserProgress(progressMap);
      }
    } catch (error) {
      console.error('Failed to fetch training:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartModule = (module) => {
    setActiveModule(module);
  };

  const handleCompleteModule = async (module) => {
    try {
      const res = await fetch(`/api/v1/training/${module.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: user.id }),
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Training Completed!', `+${module.xp_reward || 50} XP earned`);
        setActiveModule(null);
        fetchTraining();
        refreshUser?.();
      } else {
        toast.error('Failed', data.error || 'Could not complete training');
      }
    } catch (error) {
      toast.error('Error', 'Please try again');
    }
  };

  const completedCount = Object.values(userProgress).filter(p => p.status === 'completed').length;
  const totalXP = modules.reduce((sum, m) => {
    if (userProgress[m.id]?.status === 'completed') return sum + (m.xp_reward || 50);
    return sum;
  }, 0);

  const filteredModules = modules.filter(m => {
    const progress = userProgress[m.id];
    if (filter === 'completed') return progress?.status === 'completed';
    if (filter === 'available') return progress?.status !== 'completed';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#020817] pb-24">
      {/* Header Card */}
      <div className="px-4 pt-4">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0f2847]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute inset-0 rounded-3xl border border-white/[0.08]" />
          
          <div className="relative p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <BookOpenIcon className="h-7 w-7 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Training</h1>
                <p className="text-white/50">Learn & earn XP</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-2xl font-bold text-emerald-400">{completedCount}/{modules.length}</p>
                <p className="text-xs text-white/40">Completed</p>
              </div>
              <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                <p className="text-2xl font-bold text-violet-400">{totalXP}</p>
                <p className="text-xs text-white/40">XP Earned</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'available', label: 'Available' },
            { id: 'completed', label: 'Completed' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                filter === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'bg-[#0a1628] border border-white/[0.05] text-white/50 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modules List */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-2xl bg-[#0a1628] animate-pulse" />
            ))}
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-[#0a1628]/50 border border-white/[0.05]">
            <BookOpenIcon className="h-16 w-16 mx-auto mb-4 text-white/10" />
            <h3 className="text-white font-semibold mb-2">No modules found</h3>
            <p className="text-white/40 text-sm">Check back later for new training</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredModules.map(module => (
              <TrainingCard
                key={module.id}
                module={module}
                userProgress={userProgress[module.id]}
                onStart={handleStartModule}
              />
            ))}
          </div>
        )}
      </div>

      {/* Training Modal */}
      {activeModule && (
        <TrainingModal
          module={activeModule}
          onClose={() => setActiveModule(null)}
          onComplete={handleCompleteModule}
        />
      )}
    </div>
  );
}
