import React from 'react';

/**
 * STAGES - Stage configuration for the 8-stage tender lifecycle
 */
export const STAGES = [
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
 * BD_MANAGERS - BD Managers for assignment
 */
export const BD_MANAGERS = [
  { id: 'sarah_tan', name: 'Sarah Tan', avatar: 'ST' },
  { id: 'david_lim', name: 'David Lim', avatar: 'DL' },
  { id: 'michelle_wong', name: 'Michelle Wong', avatar: 'MW' },
  { id: 'alex_chen', name: 'Alex Chen', avatar: 'AC' },
  { id: 'priya_sharma', name: 'Priya Sharma', avatar: 'PS' }
];

/**
 * KanbanHeader - Mobile warning and keyboard instruction tips for the Kanban board
 */
export default function KanbanHeader({ isMobile }) {
  return (
    <>
      {/* Mobile Warning */}
      {isMobile && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Drag-and-drop is optimized for desktop. On mobile, use the stage dropdown to move tenders.
          </p>
        </div>
      )}
    </>
  );
}

/**
 * KanbanFooter - Keyboard navigation instructions
 */
export function KanbanFooter({ isMobile }) {
  if (isMobile) return null;

  return (
    <div className="bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
      <p className="text-xs text-slate-600 dark:text-slate-400">
        <strong>Tip:</strong> Click and drag cards to move between stages.
        Use <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs">Tab</kbd> and
        <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs mx-1">Arrow Keys</kbd>
        for keyboard navigation.
      </p>
    </div>
  );
}
