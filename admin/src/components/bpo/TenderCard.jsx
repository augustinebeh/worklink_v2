import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DollarSignIcon,
  ClockIcon,
  BuildingIcon,
  UserIcon,
  AlertCircleIcon,
  PercentIcon,
  CalendarIcon
} from 'lucide-react';
import { clsx } from 'clsx';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

/**
 * TenderCard Component
 * Compact draggable tender card for kanban board
 * Shows: Priority badges, tender title, agency, value, deadline, BD assignment
 * Optimized for 320px column width
 */
export default function TenderCard({
  tender,
  onAssignBd,
  onViewDetails,
  bdManagers = [],
  isDragging = false
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
    isOver
  } = useSortable({
    id: tender.id,
    data: {
      type: 'tender',
      tender
    },
    disabled: false
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : (transition || 'transform 250ms cubic-bezier(0.18, 0.67, 0.6, 1.22)'),
    opacity: isDragging || isSortableDragging ? 0.4 : 1,
    pointerEvents: isDragging || isSortableDragging ? 'none' : 'auto',
    zIndex: isDragging || isSortableDragging ? 999 : 'auto',
    // Enhanced shadow and scale for better visual feedback
    boxShadow: isDragging || isSortableDragging
      ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      : isOver
        ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        : undefined,
    willChange: 'transform, opacity',
  };

  // Calculate deadline info
  const getDeadlineInfo = (date) => {
    if (!date) return null;
    const deadline = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Overdue', color: 'text-red-600', urgent: true };
    if (diffDays === 0) return { text: 'Today', color: 'text-red-600', urgent: true };
    if (diffDays === 1) return { text: 'Tomorrow', color: 'text-orange-600', urgent: true };
    if (diffDays <= 7) return { text: `${diffDays}d`, color: 'text-orange-600', urgent: true };
    return { text: `${diffDays}d`, color: 'text-slate-600', urgent: false };
  };

  const deadline = tender.closing_date ? getDeadlineInfo(tender.closing_date) : null;
  const assignedBd = bdManagers.find(m => m.id === tender.assigned_to);

  // Priority styles
  const priorityStyles = {
    critical: 'border-l-4 border-red-500 bg-red-50/50 dark:bg-red-900/10',
    high: 'border-l-4 border-orange-500 bg-orange-50/50 dark:bg-orange-900/10',
    medium: 'border-l-4 border-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10',
    low: 'border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-900/10',
  };

  const priorityBadgeStyles = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  };

  const draggingClass = (isDragging || isSortableDragging)
    ? 'opacity-40 shadow-2xl scale-105 rotate-2 ring-2 ring-primary-500 ring-opacity-50'
    : isOver
      ? 'shadow-lg scale-[1.02] ring-1 ring-primary-300 ring-opacity-30'
      : 'hover:shadow-md hover:scale-[1.01]';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3',
        'cursor-grab active:cursor-grabbing',
        'transition-all duration-250 ease-out transform-gpu',
        draggingClass,
        priorityStyles[tender.priority || 'low'],
        // Additional hover states for better live displacement feedback
        !isDragging && !isSortableDragging && 'hover:ring-1 hover:ring-slate-300 dark:hover:ring-slate-600'
      )}
      {...attributes}
      {...listeners}
      role="button"
      aria-label={`Tender card: ${tender.title}`}
      tabIndex={0}
      data-card-element="true"
    >
      {/* Header with priority badge */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
            {tender.title}
          </h4>
        </div>
        {tender.priority && (
          <span
            className={clsx(
              'ml-2 px-2 py-0.5 rounded text-xs font-medium uppercase flex-shrink-0',
              priorityBadgeStyles[tender.priority]
            )}
          >
            {tender.priority}
          </span>
        )}
      </div>

      {/* Agency */}
      <div className="flex items-center space-x-1 mb-2">
        <BuildingIcon className="h-3 w-3 text-slate-500 dark:text-slate-400 flex-shrink-0" />
        <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
          {tender.agency}
        </span>
      </div>

      {/* Value and Deadline */}
      <div className="flex items-center justify-between mb-2 text-xs">
        {tender.estimated_value && (
          <div className="flex items-center space-x-1 text-slate-700 dark:text-slate-300">
            <DollarSignIcon className="h-3 w-3" />
            <span className="font-medium">
              ${(tender.estimated_value / 1000).toFixed(0)}K
            </span>
          </div>
        )}
        {deadline && (
          <div className={clsx('flex items-center space-x-1', deadline.color)}>
            <ClockIcon className="h-3 w-3" />
            <span className="font-medium">{deadline.text}</span>
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mb-2">
        {tender.is_renewal && (
          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
            RENEWAL
          </span>
        )}
        {tender.urgent && (
          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-medium flex items-center space-x-1">
            <AlertCircleIcon className="h-3 w-3" />
            <span>URGENT</span>
          </span>
        )}
        {tender.renewal_probability && (
          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium flex items-center space-x-1">
            <PercentIcon className="h-3 w-3" />
            <span>{tender.renewal_probability}%</span>
          </span>
        )}
      </div>

      {/* BD Assignment */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
        {assignedBd ? (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full flex items-center justify-center text-xs font-medium">
              {assignedBd.avatar}
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {assignedBd.name.split(' ')[0]}
            </span>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAssignBd && onAssignBd(tender);
            }}
            className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center space-x-1"
            aria-label="Assign BD manager"
          >
            <UserIcon className="h-3 w-3" />
            <span>Assign BD</span>
          </button>
        )}

        {/* View Details Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails && onViewDetails(tender);
          }}
          className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium"
          aria-label="View tender details"
        >
          Details
        </button>
      </div>
    </div>
  );
}

/**
 * TenderCardSkeleton Component
 * Loading skeleton for tender cards
 */
export function TenderCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 animate-pulse">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
      <div className="flex justify-between mb-2">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
      </div>
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
    </div>
  );
}
