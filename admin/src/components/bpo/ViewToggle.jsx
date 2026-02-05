import React, { useState, useEffect } from 'react';
import { LayoutListIcon, LayoutGridIcon } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * ViewToggle Component
 * Toggle between List and Kanban views for tender pipeline
 * Features:
 * - Persists user preference to localStorage
 * - Auto-disables kanban on mobile (<768px) with tooltip
 * - Keyboard shortcut support (K for kanban, L for list)
 * - Accessible with ARIA labels
 */
export default function ViewToggle({ viewMode, onViewModeChange, disabled = false }) {
  const [isMobile, setIsMobile] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      // Auto-switch to list view on mobile
      if (mobile && viewMode === 'kanban') {
        handleViewChange('list');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, [viewMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only trigger if not in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        if (!isMobile && !disabled) {
          handleViewChange('kanban');
        }
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleViewChange('list');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isMobile, disabled]);

  const handleViewChange = (mode) => {
    // Prevent kanban on mobile
    if (mode === 'kanban' && isMobile) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
      return;
    }

    // Save to localStorage
    localStorage.setItem('bpo_tender_view_mode', mode);

    // Notify parent
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  const isKanbanDisabled = disabled || isMobile;

  return (
    <div className="relative inline-flex">
      {/* Toggle Button Group */}
      <div
        className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-1"
        role="group"
        aria-label="View mode toggle"
      >
        {/* List View Button */}
        <button
          onClick={() => handleViewChange('list')}
          className={clsx(
            'px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2',
            viewMode === 'list'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          )}
          aria-label="List view"
          aria-pressed={viewMode === 'list'}
        >
          <LayoutListIcon className="h-4 w-4" />
          <span>List</span>
          <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600">
            L
          </kbd>
        </button>

        {/* Kanban View Button */}
        <button
          onClick={() => handleViewChange('kanban')}
          disabled={isKanbanDisabled}
          className={clsx(
            'px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2',
            viewMode === 'kanban'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
            isKanbanDisabled && 'opacity-50 cursor-not-allowed'
          )}
          aria-label="Kanban view"
          aria-pressed={viewMode === 'kanban'}
          aria-disabled={isKanbanDisabled}
          onMouseEnter={() => isKanbanDisabled && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <LayoutGridIcon className="h-4 w-4" />
          <span>Kanban</span>
          <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600">
            K
          </kbd>
        </button>
      </div>

      {/* Mobile Disabled Tooltip */}
      {showTooltip && isMobile && (
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-700 rotate-45"></div>
            Kanban view is only available on desktop (768px+)
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook to manage view mode state with localStorage persistence
 */
export function useViewMode(defaultMode = 'kanban') {
  const [viewMode, setViewMode] = useState(() => {
    // Try to load from localStorage
    const saved = localStorage.getItem('bpo_tender_view_mode');

    // Check if mobile
    const isMobile = window.innerWidth < 768;

    // Force list view on mobile
    if (isMobile) return 'list';

    return saved || defaultMode;
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  return [viewMode, handleViewModeChange];
}
