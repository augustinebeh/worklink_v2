import { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  User
} from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Interview Details Panel - Detailed view of interview information
 */
export function InterviewDetailsPanel({
  interview,
  candidate,
  onClose,
  onUpdateStatus,
  onReschedule,
  onCancel,
  className = ''
}) {
  const [notes, setNotes] = useState(interview?.notes || '');
  const [isEditing, setIsEditing] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-800';
      case 'scheduled':
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800';
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800';
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-800';
      case 'no_show':
        return 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-600';
    }
  };

  const handleStatusUpdate = (newStatus) => {
    if (onUpdateStatus) {
      onUpdateStatus(interview.id, newStatus, notes);
    }
  };

  const handleSaveNotes = () => {
    if (onUpdateStatus) {
      onUpdateStatus(interview.id, interview.status, notes);
    }
    setIsEditing(false);
  };

  return (
    <div className={clsx(
      'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Interview Details
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {candidate?.name || 'Unknown Candidate'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Status:
          </span>
          <div className="flex items-center gap-2">
            <span className={clsx(
              'px-2 py-1 rounded-full text-xs font-medium border capitalize',
              getStatusColor(interview.status)
            )}>
              {interview.status?.replace('_', ' ') || 'Scheduled'}
            </span>

            {interview.status === 'scheduled' && (
              <button
                onClick={() => handleStatusUpdate('confirmed')}
                className="px-2 py-1 text-xs bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors"
              >
                Mark Confirmed
              </button>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Date & Time
            </label>
            <div className="text-sm text-slate-900 dark:text-white">
              {interview.displayTime?.full || `${interview.scheduled_date} at ${interview.scheduled_time}`}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Duration
            </label>
            <div className="text-sm text-slate-900 dark:text-white">
              {interview.duration_minutes || 30} minutes
            </div>
          </div>
        </div>

        {/* Type & Meeting Link */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Interview Type
            </label>
            <div className="text-sm text-slate-900 dark:text-white capitalize">
              {interview.interview_type || 'Onboarding'}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Meeting Link
            </label>
            {interview.meeting_link ? (
              <a
                href={interview.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Join Meeting
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Not available
              </div>
            )}
          </div>
        </div>

        {/* Candidate Info */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
          <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <User className="h-4 w-4" />
            Candidate Information
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-600 dark:text-slate-400">Name:</span>
              <div className="text-slate-900 dark:text-white">{candidate?.name || 'N/A'}</div>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Email:</span>
              <div className="text-slate-900 dark:text-white">{candidate?.email || 'N/A'}</div>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Phone:</span>
              <div className="text-slate-900 dark:text-white">{candidate?.phone || 'N/A'}</div>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Status:</span>
              <div className="text-slate-900 dark:text-white capitalize">{candidate?.status || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Notes
            </label>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Edit className="h-3 w-3" />
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNotes}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setNotes(interview?.notes || '');
                    setIsEditing(false);
                  }}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Add notes about the interview..."
            />
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 rounded-lg p-3 min-h-[60px]">
              {notes || 'No notes added yet.'}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          {interview.status === 'scheduled' && (
            <>
              <button
                onClick={() => handleStatusUpdate('completed')}
                className="flex-1 bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Complete
              </button>

              <button
                onClick={onReschedule}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Reschedule
              </button>

              <button
                onClick={onCancel}
                className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Cancel
              </button>
            </>
          )}

          {interview.status === 'confirmed' && (
            <button
              onClick={() => handleStatusUpdate('completed')}
              className="flex-1 bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
