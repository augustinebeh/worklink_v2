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
  pointerWithin,
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
import KanbanHeader, { KanbanFooter, STAGES, BD_MANAGERS } from './KanbanHeader';
import { useKanbanDnd } from '../../hooks/useKanbanDnd';
import { pipelineService } from '../../shared/services/api';

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
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Group tenders by stage and create sortable context items
  const { tendersByStage, stageIds } = useMemo(() => {
    const grouped = {};

    STAGES.forEach(stage => {
      grouped[stage.id] = [];
    });

    tenders.forEach(tender => {
      if (grouped[tender.stage]) {
        grouped[tender.stage].push(tender);
      }
    });

    const stageIds = STAGES.map(stage => stage.id);

    return {
      tendersByStage: grouped,
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
  };

  // Handle view details
  const handleViewDetails = (tender) => {
    if (onTenderClick) {
      onTenderClick(tender);
    }
  };

  // Drag-to-scroll handlers for kanban board background
  const handleMouseDownScroll = (e) => {
    if (isDragging || !kanbanContainerRef.current) return;

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

    e.preventDefault();
  };

  const handleMouseMoveScroll = (e) => {
    if (!isDragScrolling || !kanbanContainerRef.current) return;

    e.preventDefault();
    const x = e.pageX - kanbanContainerRef.current.offsetLeft;
    const walk = (x - dragScrollStart.x) * 2;
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
      <KanbanHeader isMobile={isMobile} />

      {/* Kanban Board with Sortable Context */}
      <DndContext
        sensors={sensors}
        collisionDetection={(args) => {
          const pointerCollisions = pointerWithin(args);

          if (pointerCollisions.length > 0) {
            const columnCollisions = pointerCollisions.filter(collision =>
              STAGES.some(stage => stage.id === collision.id)
            );

            if (columnCollisions.length > 0) {
              return columnCollisions;
            }

            return pointerCollisions;
          }

          return closestCenter(args);
        }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
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
              STAGES.map(stage => (
                <KanbanColumnSkeleton key={stage.id} />
              ))
            ) : (
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

        {/* Drag Overlay */}
        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.2, 0, 0, 1)',
          }}
          style={{ cursor: 'grabbing' }}
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

      <KanbanFooter isMobile={isMobile} />
    </div>
  );
}
