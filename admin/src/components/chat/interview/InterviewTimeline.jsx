import {
  Calendar,
  Clock,
  CheckCircle2,
  MessageSquare,
  Activity
} from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Interview Timeline - Shows progression through scheduling stages
 */
export function InterviewTimeline({
  stages = [],
  currentStage,
  className = ''
}) {
  const defaultStages = [
    { id: 'contact', label: 'Initial Contact', icon: MessageSquare },
    { id: 'queue', label: 'Added to Queue', icon: Clock },
    { id: 'scheduled', label: 'Interview Scheduled', icon: Calendar },
    { id: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
    { id: 'completed', label: 'Interview Complete', icon: CheckCircle2 }
  ];

  const timelineStages = stages.length > 0 ? stages : defaultStages;
  const currentIndex = timelineStages.findIndex(stage => stage.id === currentStage);

  return (
    <div className={clsx('space-y-4', className)}>
      <h4 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
        <Activity className="h-4 w-4" />
        Interview Progress
      </h4>

      <div className="space-y-3">
        {timelineStages.map((stage, index) => {
          const Icon = stage.icon;
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={stage.id} className="flex items-center gap-3">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors',
                isCompleted && 'bg-emerald-500 border-emerald-500 text-white',
                isCurrent && 'bg-blue-500 border-blue-500 text-white',
                isPending && 'border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500'
              )}>
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1">
                <div className={clsx(
                  'text-sm font-medium',
                  isCompleted && 'text-emerald-600 dark:text-emerald-400',
                  isCurrent && 'text-blue-600 dark:text-blue-400',
                  isPending && 'text-slate-500 dark:text-slate-400'
                )}>
                  {stage.label}
                </div>
                {stage.timestamp && (
                  <div className="text-xs text-slate-400">
                    {new Date(stage.timestamp).toLocaleString()}
                  </div>
                )}
              </div>

              {isCompleted && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
