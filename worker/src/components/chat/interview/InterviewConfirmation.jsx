import { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Check as CheckIcon,
  Video as VideoIcon,
  CalendarDays as CalendarDaysIcon
} from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Interview Confirmation Display
 */
export function InterviewConfirmation({
  interview,
  onReschedule,
  onCancel,
  onAddToCalendar,
  className = ''
}) {
  const [showDetails, setShowDetails] = useState(false);

  /**
   * Check if reschedule is allowed (24-hour restriction)
   */
  const canRescheduleInterview = (scheduledDate, scheduledTime) => {
    if (!scheduledDate || !scheduledTime) return false;

    const now = new Date();
    const interviewDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const hoursUntilInterview = (interviewDateTime - now) / (1000 * 60 * 60);
    return hoursUntilInterview > 24;
  };

  /**
   * Get countdown until 24-hour cutoff
   */
  const getHoursUntilCutoff = (scheduledDate, scheduledTime) => {
    if (!scheduledDate || !scheduledTime) return 0;

    const now = new Date();
    const interviewDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const cutoffTime = new Date(interviewDateTime);
    cutoffTime.setHours(cutoffTime.getHours() - 24);

    const hoursUntilCutoff = Math.max(0, (cutoffTime - now) / (1000 * 60 * 60));
    return Math.ceil(hoursUntilCutoff);
  };

  const canReschedule = canRescheduleInterview(interview.scheduled_date, interview.scheduled_time);
  const hoursUntilCutoff = getHoursUntilCutoff(interview.scheduled_date, interview.scheduled_time);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-800';
      case 'scheduled': return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-800';
      default: return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-600';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'scheduled': return 'Scheduled';
      case 'cancelled': return 'Cancelled';
      case 'completed': return 'Completed';
      default: return 'Pending';
    }
  };

  return (
    <div className={clsx(
      'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4',
      'shadow-sm',
      className
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
          <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-300" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Interview Scheduled ✅
            </h3>
            <span className={clsx(
              'px-2 py-1 rounded-full text-xs font-medium border',
              getStatusColor(interview.status)
            )}>
              {getStatusLabel(interview.status)}
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            Your verification interview is all set!
          </p>
        </div>
      </div>

      {/* Interview Info */}
      <div className="mt-4 bg-slate-50 dark:bg-slate-700 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {interview.displayTime?.full || `${interview.scheduled_date} at ${interview.scheduled_time}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {interview.duration_minutes || 30} minutes
          </span>
        </div>

        {interview.meeting_link && (
          <div className="flex items-center gap-2">
            <VideoIcon className="h-4 w-4 text-slate-500" />
            <a
              href={interview.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Join meeting (available 15 min before)
            </a>
          </div>
        )}
      </div>

      {/* Additional Details */}
      {showDetails && (
        <div className="mt-3 space-y-3">
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              What to expect:
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Quick verification of your profile and experience</li>
              <li>• Discussion about your career goals and interests</li>
              <li>• Overview of available opportunities</li>
              <li>• Q&A session for any questions you have</li>
            </ul>
          </div>

          {interview.notes && (
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                Notes:
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {interview.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mt-4">
        {onAddToCalendar && (
          <button
            onClick={onAddToCalendar}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            Add to Calendar
          </button>
        )}

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-medium text-sm transition-colors duration-200"
        >
          {showDetails ? 'Less' : 'Details'}
        </button>

        {interview.status === 'scheduled' && (
          canReschedule && onReschedule ? (
            <button
              onClick={onReschedule}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200 text-sm font-medium"
            >
              Reschedule
            </button>
          ) : (
            <div className="px-4 py-2">
              {!canReschedule ? (
                <div className="text-xs text-slate-500">
                  <div className="mb-1">🚫 Reschedule not available within 24 hours</div>
                  {hoursUntilCutoff > 0 && (
                    <div>Reschedule window closes in {hoursUntilCutoff} hours</div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Reschedule available until 24 hours before interview
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
