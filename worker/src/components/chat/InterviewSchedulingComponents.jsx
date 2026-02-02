import { useState, useEffect } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  PhoneIcon,
  VideoIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowRightIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

/**
 * Interview Offer Card - Displays when SLM makes scheduling offers
 */
export function InterviewOfferCard({
  offer,
  onAccept,
  onDecline,
  onViewAvailability,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={clsx(
      'bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-900/20 dark:to-cyan-900/20',
      'border border-emerald-200 dark:border-emerald-700 rounded-xl p-4 mb-4',
      'shadow-sm hover:shadow-md transition-shadow duration-200',
      className
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-800 rounded-lg flex items-center justify-center flex-shrink-0">
          <CalendarIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Interview Opportunity! 🎉
          </h3>
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            Ready to fast-track your approval process?
          </p>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <InformationCircleIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Interview Details */}
      <div className="mt-3 bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
        <div className="flex items-center gap-2 mb-2">
          <ClockIcon className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            15-minute verification call
          </span>
        </div>

        {offer?.suggestedSlot && (
          <div className="flex items-center gap-2 mb-2">
            <CalendarDaysIcon className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Available: {offer.suggestedSlot.displayTime?.full || offer.suggestedSlot.time}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <VideoIcon className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            Video call (link provided after booking)
          </span>
        </div>
      </div>

      {/* Benefits */}
      {isExpanded && (
        <div className="mt-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-3">
          <h4 className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
            What you'll get:
          </h4>
          <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
            <li className="flex items-center gap-2">
              <CheckIcon className="h-3 w-3" />
              Fast-track account approval
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="h-3 w-3" />
              Personalized career guidance
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="h-3 w-3" />
              Priority access to opportunities
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="h-3 w-3" />
              No commitment required
            </li>
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={onAccept}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <CheckIcon className="h-4 w-4" />
          Book Now
        </button>

        <button
          onClick={onViewAvailability}
          className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <CalendarIcon className="h-4 w-4" />
          Choose Time
        </button>

        <button
          onClick={onDecline}
          className="px-3 py-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Availability Selection Interface
 */
export function AvailabilitySelector({
  availableSlots = [],
  onSelectSlot,
  onCancel,
  loading = false,
  className = ''
}) {
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Group slots by date
  const slotsByDate = availableSlots.reduce((acc, slot) => {
    const date = slot.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(slot);
    return acc;
  }, {});

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
  };

  const handleConfirm = () => {
    if (selectedSlot && onSelectSlot) {
      onSelectSlot(selectedSlot);
    }
  };

  return (
    <div className={clsx(
      'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4',
      'shadow-sm',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Choose Your Interview Time
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Select your preferred time slot from the options below
          </p>
        </div>

        <button
          onClick={onCancel}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Loading available slots...
          </p>
        </div>
      )}

      {/* No Slots Available */}
      {!loading && availableSlots.length === 0 && (
        <div className="text-center py-8">
          <ExclamationTriangleIcon className="h-12 w-12 text-amber-500 mx-auto mb-2" />
          <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
            No slots available
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            We don't have any available slots right now. Please try again later or contact us directly.
          </p>
          <button
            onClick={onCancel}
            className="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200"
          >
            Go Back
          </button>
        </div>
      )}

      {/* Available Slots */}
      {!loading && availableSlots.length > 0 && (
        <div className="space-y-4">
          {Object.entries(slotsByDate).map(([date, slots]) => (
            <div key={date} className="space-y-2">
              <h4 className="text-sm font-medium text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-600 pb-1">
                {slots[0]?.displayTime?.date || new Date(date).toLocaleDateString('en-SG', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric'
                })}
              </h4>

              <div className="grid grid-cols-2 gap-2">
                {slots.map((slot, index) => (
                  <button
                    key={`${slot.date}-${slot.time}-${index}`}
                    onClick={() => handleSlotSelect(slot)}
                    className={clsx(
                      'p-3 rounded-lg border text-left transition-all duration-200',
                      selectedSlot?.datetime === slot.datetime
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                        : 'border-slate-200 dark:border-slate-600 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <ClockIcon className={clsx(
                        'h-4 w-4',
                        selectedSlot?.datetime === slot.datetime
                          ? 'text-emerald-600'
                          : 'text-slate-500'
                      )} />
                      <span className={clsx(
                        'text-sm font-medium',
                        selectedSlot?.datetime === slot.datetime
                          ? 'text-emerald-900 dark:text-emerald-100'
                          : 'text-slate-900 dark:text-white'
                      )}>
                        {slot.displayTime?.time || slot.time}
                      </span>
                    </div>
                    {selectedSlot?.datetime === slot.datetime && (
                      <div className="flex items-center gap-1 mt-1">
                        <CheckIcon className="h-3 w-3 text-emerald-600" />
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          Selected
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Selection */}
      {selectedSlot && (
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-600">
          <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-3 mb-4">
            <h4 className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-1">
              Selected Time:
            </h4>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              {selectedSlot.displayTime?.full || `${selectedSlot.date} at ${selectedSlot.time}`}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <CheckIcon className="h-4 w-4" />
              Confirm Booking
              <ArrowRightIcon className="h-4 w-4" />
            </button>

            <button
              onClick={() => setSelectedSlot(null)}
              className="px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200 text-sm font-medium"
            >
              Change
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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

        {interview.status === 'scheduled' && onReschedule && (
          <button
            onClick={onReschedule}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200 text-sm font-medium"
          >
            Reschedule
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Scheduling Status Indicator - Small indicator for chat header or sidebar
 */
export function SchedulingStatusIndicator({
  stage,
  interview,
  className = '',
  size = 'sm'
}) {
  const getStageInfo = (stage) => {
    switch (stage) {
      case 'interview_scheduled':
        return {
          icon: CalendarIcon,
          label: 'Interview Scheduled',
          color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/50',
          dotColor: 'bg-blue-500'
        };
      case 'interview_confirmed':
        return {
          icon: CheckIcon,
          label: 'Interview Confirmed',
          color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/50',
          dotColor: 'bg-emerald-500'
        };
      case 'in_queue':
        return {
          icon: ClockIcon,
          label: 'In Scheduling Queue',
          color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/50',
          dotColor: 'bg-amber-500'
        };
      case 'in_conversation':
        return {
          icon: PhoneIcon,
          label: 'In Conversation',
          color: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/50',
          dotColor: 'bg-purple-500'
        };
      default:
        return null;
    }
  };

  const stageInfo = getStageInfo(stage);

  if (!stageInfo) return null;

  const Icon = stageInfo.icon;
  const isSmall = size === 'sm';

  return (
    <div className={clsx(
      'flex items-center gap-2',
      isSmall ? 'px-2 py-1' : 'px-3 py-2',
      'rounded-full border',
      stageInfo.color,
      className
    )}>
      <div className={clsx(
        'relative',
        isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2'
      )}>
        <div className={clsx(
          'absolute inset-0 rounded-full',
          stageInfo.dotColor
        )}></div>
        <div className={clsx(
          'absolute inset-0 rounded-full animate-ping',
          stageInfo.dotColor,
          'opacity-75'
        )}></div>
      </div>

      <Icon className={clsx(
        isSmall ? 'h-3 w-3' : 'h-4 w-4'
      )} />

      {!isSmall && (
        <span className="text-xs font-medium">
          {stageInfo.label}
        </span>
      )}
    </div>
  );
}

/**
 * Hook to manage interview scheduling state
 */
export function useInterviewScheduling(candidateId) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    if (!candidateId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/v1/interview-scheduling/candidate/${candidateId}/status`);
      const data = await response.json();

      if (data.success) {
        setStatus(data.data);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch interview status');
      }
    } catch (err) {
      setError('Failed to fetch interview status');
      console.error('Interview status fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async (days = 7) => {
    try {
      const response = await fetch(`/api/v1/interview-scheduling/slots/available?days=${days}&candidateId=${candidateId}`);
      const data = await response.json();

      if (data.success) {
        return data.data.slots || [];
      } else {
        throw new Error(data.message || 'Failed to fetch available slots');
      }
    } catch (err) {
      console.error('Available slots fetch error:', err);
      throw err;
    }
  };

  const scheduleInterview = async (date, time, notes = '') => {
    try {
      const response = await fetch(`/api/v1/interview-scheduling/candidate/${candidateId}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date, time, notes }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchStatus(); // Refresh status
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to schedule interview');
      }
    } catch (err) {
      console.error('Schedule interview error:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [candidateId]);

  return {
    status,
    loading,
    error,
    refetch: fetchStatus,
    fetchAvailableSlots,
    scheduleInterview,
  };
}