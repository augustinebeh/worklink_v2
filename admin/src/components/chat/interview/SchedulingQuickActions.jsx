import { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  TrendingUp
} from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Scheduling Quick Actions - Floating action buttons
 */
export function SchedulingQuickActions({
  candidateId,
  onScheduleInterview,
  onViewQueue,
  onViewAnalytics,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={clsx('relative', className)}>
      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center',
          isOpen && 'rotate-45'
        )}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Action Menu */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 space-y-2">
          <button
            onClick={() => {
              onScheduleInterview?.();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors text-sm font-medium"
          >
            <Calendar className="h-4 w-4" />
            Schedule Interview
          </button>

          <button
            onClick={() => {
              onViewQueue?.();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors text-sm font-medium"
          >
            <Clock className="h-4 w-4" />
            View Queue
          </button>

          <button
            onClick={() => {
              onViewAnalytics?.();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors text-sm font-medium"
          >
            <TrendingUp className="h-4 w-4" />
            Analytics
          </button>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
