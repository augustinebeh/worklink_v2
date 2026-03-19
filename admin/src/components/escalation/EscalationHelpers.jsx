import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Timer, User } from 'lucide-react';
import Badge from '../ui/Badge';
import { clsx } from 'clsx';
import { PRIORITY_CONFIG, STATUS_CONFIG } from './constants';

// Priority indicator component
export function PriorityIndicator({ priority, size = 'md' }) {
  const config = PRIORITY_CONFIG[priority];
  const Icon = config?.icon || User;

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <div className={clsx(
      'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
      config?.color
    )}>
      <Icon className={sizeClasses[size]} />
      {priority}
    </div>
  );
}

// Status badge component
export function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config?.badge || 'secondary'} size="sm">
      {config?.label || status}
    </Badge>
  );
}

// Time since component
export function TimeSince({ date, showIcon = true }) {
  const [timeSince, setTimeSince] = useState('');

  useEffect(() => {
    const updateTimeSince = () => {
      if (!date) return;

      const now = new Date();
      const past = new Date(date);
      const diffMs = now - past;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 60) {
        setTimeSince(`${diffMins}m ago`);
      } else if (diffHours < 24) {
        setTimeSince(`${diffHours}h ago`);
      } else {
        setTimeSince(`${diffDays}d ago`);
      }
    };

    updateTimeSince();
    const interval = setInterval(updateTimeSince, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [date]);

  return (
    <div className="flex items-center gap-1 text-xs text-slate-500">
      {showIcon && <Clock className="h-3 w-3" />}
      {timeSince}
    </div>
  );
}

// SLA indicator component
export function SLAIndicator({ escalation }) {
  const slaDeadline = new Date(escalation.sla_deadline);
  const now = new Date();
  const isBreached = slaDeadline < now;
  const minutesRemaining = Math.floor((slaDeadline - now) / (1000 * 60));

  if (isBreached) {
    return (
      <div className="flex items-center gap-1 text-red-600 text-xs font-medium">
        <AlertTriangle className="h-3 w-3" />
        SLA BREACHED
      </div>
    );
  }

  if (minutesRemaining <= 30) {
    return (
      <div className="flex items-center gap-1 text-orange-600 text-xs font-medium">
        <Timer className="h-3 w-3" />
        {minutesRemaining}m remaining
      </div>
    );
  }

  const hoursRemaining = Math.floor(minutesRemaining / 60);
  return (
    <div className="flex items-center gap-1 text-slate-500 text-xs">
      <Timer className="h-3 w-3" />
      {hoursRemaining > 0 ? `${hoursRemaining}h ${minutesRemaining % 60}m` : `${minutesRemaining}m`}
    </div>
  );
}
