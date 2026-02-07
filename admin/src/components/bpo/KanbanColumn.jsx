import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { clsx } from 'clsx';
import {
  EyeIcon,
  AlertCircleIcon,
  FileTextIcon,
  CheckCircleIcon,
  SendIcon,
  TrophyIcon,
  XCircleIcon
} from 'lucide-react';
import TenderCard, { TenderCardSkeleton } from './TenderCard';

// Stage icons mapping
const STAGE_ICONS = {
  renewal_watch: EyeIcon,
  new_opportunity: AlertCircleIcon,
  review: FileTextIcon,
  bidding: FileTextIcon,
  internal_approval: CheckCircleIcon,
  submitted: SendIcon,
  awarded: TrophyIcon,
  lost: XCircleIcon
};

// Stage colors mapping
const STAGE_COLORS = {
  renewal_watch: {
    bg: 'bg-purple-50 dark:bg-purple-900/10',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-700 dark:text-purple-300',
    header: 'bg-purple-100 dark:bg-purple-900/20',
    dragOver: 'ring-4 ring-purple-300 dark:ring-purple-700 bg-purple-100 dark:bg-purple-900/30'
  },
  new_opportunity: {
    bg: 'bg-blue-50 dark:bg-blue-900/10',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    header: 'bg-blue-100 dark:bg-blue-900/20',
    dragOver: 'ring-4 ring-blue-300 dark:ring-blue-700 bg-blue-100 dark:bg-blue-900/30'
  },
  review: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/10',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-700 dark:text-yellow-300',
    header: 'bg-yellow-100 dark:bg-yellow-900/20',
    dragOver: 'ring-4 ring-yellow-300 dark:ring-yellow-700 bg-yellow-100 dark:bg-yellow-900/30'
  },
  bidding: {
    bg: 'bg-orange-50 dark:bg-orange-900/10',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-700 dark:text-orange-300',
    header: 'bg-orange-100 dark:bg-orange-900/20',
    dragOver: 'ring-4 ring-orange-300 dark:ring-orange-700 bg-orange-100 dark:bg-orange-900/30'
  },
  internal_approval: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/10',
    border: 'border-indigo-200 dark:border-indigo-800',
    text: 'text-indigo-700 dark:text-indigo-300',
    header: 'bg-indigo-100 dark:bg-indigo-900/20',
    dragOver: 'ring-4 ring-indigo-300 dark:ring-indigo-700 bg-indigo-100 dark:bg-indigo-900/30'
  },
  submitted: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/10',
    border: 'border-cyan-200 dark:border-cyan-800',
    text: 'text-cyan-700 dark:text-cyan-300',
    header: 'bg-cyan-100 dark:bg-cyan-900/20',
    dragOver: 'ring-4 ring-cyan-300 dark:ring-cyan-700 bg-cyan-100 dark:bg-cyan-900/30'
  },
  awarded: {
    bg: 'bg-green-50 dark:bg-green-900/10',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-700 dark:text-green-300',
    header: 'bg-green-100 dark:bg-green-900/20',
    dragOver: 'ring-4 ring-green-300 dark:ring-green-700 bg-green-100 dark:bg-green-900/30'
  },
  lost: {
    bg: 'bg-red-50 dark:bg-red-900/10',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
    header: 'bg-red-100 dark:bg-red-900/20',
    dragOver: 'ring-4 ring-red-300 dark:ring-red-700 bg-red-100 dark:bg-red-900/30'
  }
};

/**
 * KanbanColumn Component
 * Individual droppable stage column for kanban board
 * Shows stage header with icon, name, tender count
 * Vertical scrolling container for tender cards
 * Visual feedback for drag-over states
 */
export default function KanbanColumn({
  stage,
  tenders = [],
  bdManagers = [],
  onAssignBd,
  onViewDetails,
  isOver = false,
  loading = false
}) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: stage.id,
    data: {
      type: 'column',
      stage: stage.id,
      accepts: ['tender']
    }
  });

  const Icon = STAGE_ICONS[stage.id] || FileTextIcon;
  const colors = STAGE_COLORS[stage.id] || STAGE_COLORS.review;
  const tenderIds = tenders.map(t => t.id);

  // Determine if this column should show drag-over state
  const showDragOver = isOver || isDroppableOver;

  return (
    <div
      className={clsx(
        'flex flex-col rounded-lg border-2 transition-all duration-200',
        'w-80 flex-shrink-0',
        colors.bg,
        colors.border,
        showDragOver && colors.dragOver
      )}
      style={{ height: 'calc(100vh - 300px)' }}
      role="region"
      aria-label={`${stage.name} stage`}
    >
      {/* Column Header */}
      <div className={clsx('p-4 rounded-t-lg', colors.header)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon className={clsx('h-5 w-5', colors.text)} aria-hidden="true" />
            <h3 className={clsx('font-semibold text-sm', colors.text)}>
              {stage.name}
            </h3>
          </div>
          <span
            className={clsx(
              'px-2 py-1 rounded-full text-xs font-bold',
              colors.text,
              'bg-white/50 dark:bg-slate-900/20'
            )}
            aria-label={`${tenders.length} tenders in ${stage.name}`}
          >
            {tenders.length}
          </span>
        </div>
      </div>

      {/* Droppable Card Container — fills column, scrolls internally */}
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 min-h-0 overflow-y-auto p-3 relative',
          'scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent hover:scrollbar-thumb-slate-400 dark:hover:scrollbar-thumb-slate-500',
          'transition-all duration-250 ease-out',
          showDragOver && [
            'bg-gradient-to-b from-slate-50/80 to-slate-100/60 dark:from-slate-800/50 dark:to-slate-700/30',
            'ring-2 ring-primary-300/40 dark:ring-primary-400/30',
            'shadow-inner'
          ]
        )}
        style={{
          pointerEvents: 'auto',
          willChange: 'background, transform',
          scrollBehavior: 'smooth',
        }}
        onDragOver={(e) => {
          e.preventDefault(); // Allow dropping
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {loading ? (
          // Loading skeletons
          <>
            <TenderCardSkeleton />
            <TenderCardSkeleton />
            <TenderCardSkeleton />
          </>
        ) : tenders.length > 0 ? (
          // Tender cards with sortable context for live displacement
          <SortableContext items={tenderIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {tenders.map((tender, index) => (
                <div
                  key={tender.id}
                  className="relative transform-gpu"
                  style={{
                    // Enhanced animation for smoother displacement
                    transition: 'transform 250ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms ease-in-out',
                    willChange: 'transform',
                  }}
                >
                  <TenderCard
                    tender={tender}
                    bdManagers={bdManagers}
                    onAssignBd={onAssignBd}
                    onViewDetails={onViewDetails}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
        ) : (
          // Empty state with enhanced drop zone
          <div className={clsx(
            'flex flex-col items-center justify-center py-12 text-center transition-all duration-250',
            'rounded-lg border-2 border-dashed mx-1',
            showDragOver
              ? 'border-primary-400 dark:border-primary-500 bg-primary-50/50 dark:bg-primary-900/20 scale-105'
              : 'border-slate-300 dark:border-slate-600 border-opacity-50'
          )}>
            <Icon className={clsx(
              'h-12 w-12 mb-3 transition-all duration-250',
              showDragOver ? 'opacity-70 scale-110' : 'opacity-30',
              colors.text
            )} aria-hidden="true" />
            <p className={clsx(
              'text-sm transition-opacity duration-250',
              showDragOver ? 'opacity-80 font-medium' : 'opacity-60',
              colors.text
            )}>
              {showDragOver ? 'Drop tender here' : 'No tenders in this stage'}
            </p>
            {showDragOver && (
              <div className={clsx(
                'mt-3 px-3 py-1 rounded-full text-xs font-medium animate-pulse',
                'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300',
                'border border-primary-300 dark:border-primary-600'
              )}>
                Ready to move
              </div>
            )}
          </div>
        )}
      </div>

      {/* Column Footer — sticky bottom, never fills space */}
      {tenders.length > 0 && (
        <div className="flex-shrink-0 p-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Total Value:</span>
            <span className="font-semibold">
              ${(tenders.reduce((sum, t) => sum + (t.estimated_value || 0), 0) / 1000).toFixed(0)}K
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * KanbanColumnSkeleton Component
 * Loading skeleton for column
 */
export function KanbanColumnSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border-2 border-slate-200 dark:border-slate-700 w-80 flex-shrink-0 animate-pulse" style={{ height: 'calc(100vh - 300px)' }}>
      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-t-lg flex-shrink-0">
        <div className="h-5 bg-slate-300 dark:bg-slate-600 rounded w-32"></div>
      </div>
      <div className="p-3 space-y-2 flex-1 min-h-0">
        <TenderCardSkeleton />
        <TenderCardSkeleton />
      </div>
    </div>
  );
}
