import {
  BookOpenIcon,
  PlayCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ZapIcon,
  LockIcon,
} from 'lucide-react';
import { clsx } from 'clsx';

export default function TrainingCard({ module, userProgress, onStart }) {
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
