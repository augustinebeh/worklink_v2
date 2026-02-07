import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  closestCorners,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  MouseSensor
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { clsx } from 'clsx';
import KanbanColumn, { KanbanColumnSkeleton } from './KanbanColumn';
import TenderCard from './TenderCard';
import { useKanbanDnd } from '../../hooks/useKanbanDnd';
import { pipelineService } from '../../shared/services/api';

/**
 * Stage configuration for the 8-stage tender lifecycle
 */
const STAGES = [
  { id: 'renewal_watch', name: 'Renewal Watch' },
  { id: 'new_opportunity', name: 'New Opportunity' },
  { id: 'review', name: 'Review' },
  { id: 'bidding', name: 'Bidding' },
  { id: 'internal_approval', name: 'Approval' },
  { id: 'submitted', name: 'Submitted' },
  { id: 'awarded', name: 'Won' },
  { id: 'lost', name: 'Lost' }
];

/**
 * BD Managers for assignment
 */
const BD_MANAGERS = [
  { id: 'sarah_tan', name: 'Sarah Tan', avatar: 'ST' },
  { id: 'david_lim', name: 'David Lim', avatar: 'DL' },
  { id: 'michelle_wong', name: 'Michelle Wong', avatar: 'MW' },
  { id: 'alex_chen', name: 'Alex Chen', avatar: 'AC' },
  { id: 'priya_sharma', name: 'Priya Sharma', avatar: 'PS' }
];

/**
 * KanbanBoard Component
 * Main kanban container with @dnd-kit sortable preset
 * Features:
 * - Enhanced collision detection with pointerWithin for accurate drop targeting
 * - Multiple sensor support (Mouse, Pointer, Touch, Keyboard)
 * - SortableContext for both stages and individual tender cards
 * - Optimistic updates with rollback on API errors
 * - Live displacement feedback during drag operations
 * - 8-stage tender lifecycle columns with horizontal scrolling
 */
export default function KanbanBoard({
  onTenderClick,
  onStageChange,
  refreshKey = 0
}) {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Drag-to-scroll state
  const [isDragScrolling, setIsDragScrolling] = useState(false);
  const [dragScrollStart, setDragScrollStart] = useState({ x: 0, scrollLeft: 0 });
  const kanbanContainerRef = useRef(null);

  // Drag and drop hook
  const {
    activeId,
    overId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    isDragging
  } = useKanbanDnd({
    tenders,
    setTenders,
    onStageChange
  });

  // Configure sensors for drag and drop
  // Optimized for sortable preset with better collision detection
  const sensors = useSensors(
    // MouseSensor for precise mouse interactions
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    }),
    // PointerSensor for touch and pen
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    // KeyboardSensor with sortable coordinates
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    // TouchSensor for mobile with optimized constraints
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Longer delay for better mobile experience
        tolerance: 8,
      },
    })
  );

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch tenders data
  useEffect(() => {
    fetchTenders();
  }, [refreshKey]);

  const fetchTenders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await pipelineService.getTenders();

      if (response.success) {
        setTenders(response.data || []);
      } else {
        throw new Error(response.message || 'Failed to fetch tenders');
      }
    } catch (err) {
      console.error('Error fetching tenders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Group tenders by stage and create sortable context items
  const { tendersByStage, allTenderIds, stageIds } = useMemo(() => {
    const grouped = {};
    const allIds = [];

    // Initialize all stages
    STAGES.forEach(stage => {
      grouped[stage.id] = [];
    });

    // Group tenders by stage
    tenders.forEach(tender => {
      if (grouped[tender.stage]) {
        grouped[tender.stage].push(tender);
        allIds.push(tender.id);
      }
    });

    // Get stage IDs for column sortable context
    const stageIds = STAGES.map(stage => stage.id);

    return {
      tendersByStage: grouped,
      allTenderIds: allIds,
      stageIds: stageIds
    };
  }, [tenders]);

  // Get active tender for drag overlay
  const activeTender = useMemo(() => {
    if (!activeId) return null;
    return tenders.find(t => t.id === activeId);
  }, [activeId, tenders]);

  // Handle BD assignment
  const handleAssignBd = async (tender) => {
    // Show assignment modal or dropdown
    // For now, this is a placeholder
    console.log('Assign BD to tender:', tender.id);
  };

  // Handle view details
  const handleViewDetails = (tender) => {
    if (onTenderClick) {
      onTenderClick(tender);
    }
  };

  // Drag-to-scroll handlers for kanban board background
  const handleMouseDownScroll = (e) => {
    // Only start drag scrolling if not already dragging a card and clicking on background
    if (isDragging || !kanbanContainerRef.current) return;

    // Check if we're clicking on a card or button (avoid scrolling on interactive elements)
    const target = e.target;
    if (target.closest('[data-card-element="true"]') ||
        target.closest('button') ||
        target.closest('[role="button"]') ||
        target.closest('.sortable-item')) {
      return;
    }

    setIsDragScrolling(true);
    setDragScrollStart({
      x: e.pageX - kanbanContainerRef.current.offsetLeft,
      scrollLeft: kanbanContainerRef.current.scrollLeft
    });

    // Prevent text selection during drag
    e.preventDefault();
  };

  const handleMouseMoveScroll = (e) => {
    if (!isDragScrolling || !kanbanContainerRef.current) return;

    e.preventDefault();
    const x = e.pageX - kanbanContainerRef.current.offsetLeft;
    const walk = (x - dragScrollStart.x) * 2; // Multiply for faster scrolling
    kanbanContainerRef.current.scrollLeft = dragScrollStart.scrollLeft - walk;
  };

  const handleMouseUpScroll = () => {
    setIsDragScrolling(false);
  };

  const handleMouseLeaveScroll = () => {
    setIsDragScrolling(false);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">
            Error loading tenders: {error}
          </p>
          <button
            onClick={fetchTenders}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile Warning */}
      {isMobile && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Drag-and-drop is optimized for desktop. On mobile, use the stage dropdown to move tenders.
          </p>
        </div>
      )}

      {/* Kanban Board with Sortable Context */}
      <DndContext
        sensors={sensors}
        collisionDetection={(args) => {
          // Enhanced collision detection for live displacement
          const { droppableRects, droppableContainers, collisionRect } = args;

          // First try pointer within for precise targeting
          const pointerCollisions = pointerWithin(args);

          // If pointer is within any droppable, use those
          if (pointerCollisions.length > 0) {
            // Prioritize column containers over individual cards
            // Check if collision id corresponds to a stage (column)
            const columnCollisions = pointerCollisions.filter(collision =>
              STAGES.some(stage => stage.id === collision.id)
            );

            if (columnCollisions.length > 0) {
              return columnCollisions;
            }

            return pointerCollisions;
          }

          // Fallback to closest center for edge cases
          return closestCenter(args);
        }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Sortable Context for stages */}
        <SortableContext items={stageIds} strategy={verticalListSortingStrategy}>
          <div
            ref={kanbanContainerRef}
            className={clsx(
              'flex gap-4 overflow-x-auto pb-4',
              'scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-slate-100 dark:scrollbar-track-slate-800',
              isDragging && 'cursor-grabbing',
              isDragScrolling && 'cursor-grabbing select-none',
              !isDragging && !isDragScrolling && 'cursor-grab'
            )}
            role="application"
            aria-label="Tender lifecycle kanban board"
            onMouseDown={handleMouseDownScroll}
            onMouseMove={handleMouseMoveScroll}
            onMouseUp={handleMouseUpScroll}
            onMouseLeave={handleMouseLeaveScroll}
          >
            {loading ? (
              // Loading skeletons
              STAGES.map(stage => (
                <KanbanColumnSkeleton key={stage.id} />
              ))
            ) : (
              // Kanban columns with proper sortable context
              STAGES.map(stage => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  tenders={tendersByStage[stage.id] || []}
                  bdManagers={BD_MANAGERS}
                  onAssignBd={handleAssignBd}
                  onViewDetails={handleViewDetails}
                  isOver={overId === stage.id}
                  loading={loading}
                />
              ))
            )}
          </div>
        </SortableContext>

        {/* Drag Overlay with simplified animation */}
        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.2, 0, 0, 1)',
          }}
          style={{
            cursor: 'grabbing',
          }}
          // Disable automatic positioning adjustments
          adjustScale={false}
          wrapperElement="div"
        >
          {activeTender ? (
            <div
              className="opacity-90 shadow-2xl transform rotate-1 scale-105 z-50"
              style={{
                pointerEvents: 'none',
                borderRadius: '8px',
              }}
            >

              {/* Enhanced border glow */}
              <div
                className="absolute inset-0 rounded-lg border-2 border-blue-300 dark:border-blue-500 opacity-80"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.1), transparent, rgba(147,51,234,0.1))',
                  transform: 'scale(1.02)',
                  zIndex: -1,
                }}
              />

              <TenderCard
                tender={activeTender}
                bdManagers={BD_MANAGERS}
                isDragging={true}
              />
            </div>
          ) : null}
        </DragOverlay>

      </DndContext>

      {/* Keyboard Instructions */}
      {!isMobile && (
        <div className="bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <strong>Tip:</strong> Click and drag cards to move between stages.
            Use <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs">Tab</kbd> and
            <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs mx-1">Arrow Keys</kbd>
            for keyboard navigation.
          </p>
        </div>
      )}
    </div>
  );
}
