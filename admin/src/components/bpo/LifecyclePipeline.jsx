import React from 'react';
import KanbanBoard from './KanbanBoard';

/**
 * Tender Lifecycle Pipeline Component
 * Kanban-only view — renders the drag-and-drop board directly.
 * Stats are handled by the parent page's analytics bar.
 */
export default function LifecyclePipeline({ onTenderClick, onStageChange, refreshKey = 0 }) {
  return (
    <KanbanBoard
      onTenderClick={onTenderClick}
      onStageChange={onStageChange}
      refreshKey={refreshKey}
    />
  );
}
