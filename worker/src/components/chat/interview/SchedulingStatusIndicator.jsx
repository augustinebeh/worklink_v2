import {
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Check as CheckIcon,
  Phone as PhoneIcon
} from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Scheduling Status Indicator - Small indicator for chat header or sidebar
 */
export function SchedulingStatusIndicator({
  stage,
  interview,
  className = '',
  size = 'sm'
}) {
  const getStageInfo = (stage) => {
    switch (stage) {
      case 'interview_scheduled':
        return {
          icon: CalendarIcon,
          label: 'Interview Scheduled',
          color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/50',
          dotColor: 'bg-blue-500'
        };
      case 'interview_confirmed':
        return {
          icon: CheckIcon,
          label: 'Interview Confirmed',
          color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/50',
          dotColor: 'bg-emerald-500'
        };
      case 'in_queue':
        return {
          icon: ClockIcon,
          label: 'In Scheduling Queue',
          color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/50',
          dotColor: 'bg-amber-500'
        };
      case 'in_conversation':
        return {
          icon: PhoneIcon,
          label: 'In Conversation',
          color: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/50',
          dotColor: 'bg-purple-500'
        };
      default:
        return null;
    }
  };

  const stageInfo = getStageInfo(stage);

  if (!stageInfo) return null;

  const Icon = stageInfo.icon;
  const isSmall = size === 'sm';

  return (
    <div className={clsx(
      'flex items-center gap-2',
      isSmall ? 'px-2 py-1' : 'px-3 py-2',
      'rounded-full border',
      stageInfo.color,
      className
    )}>
      <div className={clsx(
        'relative',
        isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2'
      )}>
        <div className={clsx(
          'absolute inset-0 rounded-full',
          stageInfo.dotColor
        )}></div>
        <div className={clsx(
          'absolute inset-0 rounded-full animate-ping',
          stageInfo.dotColor,
          'opacity-75'
        )}></div>
      </div>

      <Icon className={clsx(
        isSmall ? 'h-3 w-3' : 'h-4 w-4'
      )} />

      {!isSmall && (
        <span className="text-xs font-medium">
          {stageInfo.label}
        </span>
      )}
    </div>
  );
}
