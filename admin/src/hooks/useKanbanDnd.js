import { useState, useCallback } from 'react';
import { lifecycleService } from '../shared/services/api';
import { useToast } from '../components/ui/Toast';

/**
 * Custom hook for managing Kanban drag-and-drop logic
 * Handles dragStart, dragOver, dragEnd events with API integration
 * Implements optimistic updates with error rollback
 */
export function useKanbanDnd({ tenders, setTenders, onStageChange }) {
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [previousState, setPreviousState] = useState(null);
  const toast = useToast();

  /**
   * Handle drag start event
   * Stores the dragging tender ID and saves current state for rollback
   */
  const handleDragStart = useCallback((event) => {
    const { active } = event;
    setActiveId(active.id);

    // Save current state for potential rollback
    setPreviousState({
      tenders: [...tenders],
      tenderId: active.id
    });
  }, [tenders]);

  /**
   * Handle drag over event
   * Updates the overId for visual feedback
   */
  const handleDragOver = useCallback((event) => {
    const { over } = event;
    setOverId(over?.id || null);
  }, []);

  /**
   * Handle drag end event
   * Performs optimistic update and API call
   * Rolls back on error
   */
  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;

    setActiveId(null);
    setOverId(null);

    if (!over) {
      setPreviousState(null);
      return;
    }

    // Extract tender ID and target stage/position
    const tenderId = active.id;
    const overId = over.id;

    // Find the tender being moved
    const tender = tenders.find(t => t.id === tenderId);

    if (!tender) {
      setPreviousState(null);
      return;
    }

    // Determine if we're dropping on a stage column or another tender
    const overTender = tenders.find(t => t.id === overId);
    const targetStage = overTender ? overTender.stage : overId;

    // Check if this is a valid stage
    const validStages = ['renewal_watch', 'new_opportunity', 'review', 'bidding', 'internal_approval', 'submitted', 'awarded', 'lost'];
    if (!validStages.includes(targetStage)) {
      setPreviousState(null);
      return;
    }

    // No change if dropped on same stage
    if (tender.stage === targetStage) {
      setPreviousState(null);
      // For reordering within same column, just update optimistically
      if (overTender && tenderId !== overId) {
        const currentStage = tender.stage;
        const stageTenders = tenders.filter(t => t.stage === currentStage);
        const oldIndex = stageTenders.findIndex(t => t.id === tenderId);
        const newIndex = stageTenders.findIndex(t => t.id === overId);

        if (oldIndex !== newIndex) {
          // Reorder within the same stage
          setTenders(prevTenders => {
            const newTenders = [...prevTenders];
            const reorderedStageTenders = [...stageTenders];

            // Move item to new position
            const [movedTender] = reorderedStageTenders.splice(oldIndex, 1);
            reorderedStageTenders.splice(newIndex, 0, movedTender);

            // Update the main array with new order
            return newTenders.map(t =>
              t.stage === currentStage ? reorderedStageTenders.find(st => st.id === t.id) || t : t
            );
          });
        }
      }
      return;
    }

    // Optimistic update - move tender to new stage immediately
    setTenders(prevTenders => {
      return prevTenders.map(t =>
        t.id === tenderId
          ? { ...t, stage: targetStage, updated_at: new Date().toISOString() }
          : t
      );
    });

    try {
      // Make API call to persist the change
      const response = await lifecycleService.moveTender(tenderId, {
        new_stage: targetStage,
        user_id: sessionStorage.getItem('user_id') || 'admin',
        notes: `Moved via drag-and-drop from ${tender.stage} to ${targetStage}`
      });

      if (response.success) {
        // Success notification
        toast.success(
          'Tender Moved',
          `Successfully moved to ${formatStageName(targetStage)}`
        );

        // Clear previous state
        setPreviousState(null);

        // Notify parent component
        if (onStageChange) {
          onStageChange(tenderId, targetStage);
        }
      } else {
        throw new Error(response.message || 'Failed to move tender');
      }
    } catch (error) {
      console.error('Error moving tender:', error);

      // Rollback to previous state
      if (previousState) {
        setTenders(previousState.tenders);
      }

      // Error notification
      toast.error(
        'Move Failed',
        error.message || 'Could not move tender. Please try again.'
      );

      setPreviousState(null);
    }
  }, [tenders, setTenders, previousState, onStageChange, toast]);

  /**
   * Handle drag cancel event
   * Resets all drag state
   */
  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
    setPreviousState(null);
  }, []);

  return {
    activeId,
    overId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    isDragging: activeId !== null
  };
}

/**
 * Helper function to format stage names for display
 */
function formatStageName(stageId) {
  const stageNames = {
    renewal_watch: 'Renewal Watch',
    new_opportunity: 'New Opportunity',
    review: 'Review',
    bidding: 'Bidding',
    internal_approval: 'Approval',
    submitted: 'Submitted',
    awarded: 'Won',
    lost: 'Lost'
  };
  return stageNames[stageId] || stageId;
}

export default useKanbanDnd;
