import {
  Calendar,
  CheckCircle2,
  MessageSquare,
  Zap
} from 'lucide-react';
import { clsx } from 'clsx';

/**
 * SLM Activity Indicator - Shows when SLM is handling scheduling
 */
export function SLMActivityIndicator({
  isActive,
  activityType,
  lastActivity,
  className = ''
}) {
  const getActivityInfo = (type) => {
    switch (type) {
      case 'scheduling_conversation':
        return {
          icon: MessageSquare,
          label: 'SLM handling scheduling',
          color: 'text-purple-600 bg-purple-50 border-purple-200'
        };
      case 'collecting_availability':
        return {
          icon: Calendar,
          label: 'Collecting availability',
          color: 'text-blue-600 bg-blue-50 border-blue-200'
        };
      case 'confirming_booking':
        return {
          icon: CheckCircle2,
          label: 'Confirming booking',
          color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
        };
      default:
        return {
          icon: Zap,
          label: 'SLM active',
          color: 'text-amber-600 bg-amber-50 border-amber-200'
        };
    }
  };

  if (!isActive) return null;

  const activityInfo = getActivityInfo(activityType);
  const Icon = activityInfo.icon;

  return (
    <div className={clsx(
      'flex items-center gap-2 px-3 py-2 rounded-lg border',
      activityInfo.color,
      className
    )}>
      <div className="relative">
        <Icon className="h-4 w-4" />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-ping" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">
          {activityInfo.label}
        </div>
        {lastActivity && (
          <div className="text-xs opacity-75">
            Last activity: {new Date(lastActivity).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
