import React from 'react';
import {
  AlertCircleIcon,
  TrendingUpIcon,
  DollarSignIcon,
  ClockIcon,
  CheckIcon
} from 'lucide-react';

/**
 * Reusable Alert Card Component
 * Shows: icon, title, time ago, priority badge
 * Click to acknowledge
 */
export default function AlertCard({ alert, onAcknowledge, compact = false }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getAlertIcon = (triggerType) => {
    switch (triggerType) {
      case 'tender': return DollarSignIcon;
      case 'renewal': return TrendingUpIcon;
      case 'deadline': return ClockIcon;
      default: return AlertCircleIcon;
    }
  };

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'critical':
        return {
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          iconColor: 'text-red-600 dark:text-red-400',
          iconBg: 'bg-red-100 dark:bg-red-900/40',
          badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
          borderColor: 'border-l-red-500'
        };
      case 'high':
        return {
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          iconColor: 'text-orange-600 dark:text-orange-400',
          iconBg: 'bg-orange-100 dark:bg-orange-900/40',
          badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
          borderColor: 'border-l-orange-500'
        };
      case 'medium':
        return {
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          iconColor: 'text-blue-600 dark:text-blue-400',
          iconBg: 'bg-blue-100 dark:bg-blue-900/40',
          badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
          borderColor: 'border-l-blue-500'
        };
      case 'low':
        return {
          bgColor: 'bg-gray-50 dark:bg-slate-800/50',
          iconColor: 'text-gray-600 dark:text-gray-400',
          iconBg: 'bg-gray-100 dark:bg-slate-700',
          badgeColor: 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300',
          borderColor: 'border-l-gray-400'
        };
      default:
        return {
          bgColor: 'bg-gray-50 dark:bg-slate-800/50',
          iconColor: 'text-gray-600 dark:text-gray-400',
          iconBg: 'bg-gray-100 dark:bg-slate-700',
          badgeColor: 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300',
          borderColor: 'border-l-gray-400'
        };
    }
  };

  const Icon = getAlertIcon(alert.trigger_type);
  const isUnread = !alert.acknowledged_at;
  const priorityConfig = getPriorityConfig(alert.priority);

  const handleClick = () => {
    if (isUnread && onAcknowledge) {
      onAcknowledge(alert.id);
    }
  };

  return (
    <div
      className={`
        border-l-4 ${priorityConfig.borderColor}
        ${isUnread ? priorityConfig.bgColor : 'bg-white dark:bg-slate-900'}
        hover:bg-slate-50 dark:hover:bg-slate-800/50
        transition-colors duration-200
        ${compact ? 'p-3' : 'p-4'}
        ${isUnread ? 'cursor-pointer' : ''}
        group
      `}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={`
          ${compact ? 'p-1.5' : 'p-2'}
          rounded-full
          ${priorityConfig.iconBg}
          flex-shrink-0
        `}>
          <Icon className={`
            ${compact ? 'h-3 w-3' : 'h-4 w-4'}
            ${priorityConfig.iconColor}
          `} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`
                ${compact ? 'text-xs' : 'text-sm'}
                font-medium
                text-slate-900 dark:text-slate-100
                ${compact ? 'line-clamp-1' : 'line-clamp-2'}
              `}>
                {alert.alert_title}
              </p>

              {!compact && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                  {alert.alert_message}
                </p>
              )}

              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  {formatTime(alert.triggered_at)}
                </p>

                {/* Priority Badge */}
                <span className={`
                  px-2 py-0.5 rounded text-xs font-medium uppercase
                  ${priorityConfig.badgeColor}
                `}>
                  {alert.priority}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {isUnread && onAcknowledge && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAcknowledge(alert.id);
              }}
              className="
                mt-2 text-xs text-primary-600 hover:text-primary-700
                dark:text-primary-400 dark:hover:text-primary-300
                font-medium flex items-center space-x-1
                opacity-0 group-hover:opacity-100 transition-opacity
              "
            >
              <CheckIcon className="h-3 w-3" />
              <span>Mark as read</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}