import { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Check as CheckIcon,
  X as XMarkIcon,
  Video as VideoIcon,
  Info as InformationCircleIcon,
  CalendarDays as CalendarDaysIcon
} from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Interview Offer Card - Displays when SLM makes scheduling offers
 */
export function InterviewOfferCard({
  offer,
  selectedSlot,
  onAccept,
  onDecline,
  onViewAvailability,
  showOnlyAfterSlotSelection = false,
  className = ''
}) {
  // Only render if showOnlyAfterSlotSelection is false OR selectedSlot exists
  if (showOnlyAfterSlotSelection && !selectedSlot) {
    return null;
  }
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

        {(selectedSlot || offer?.suggestedSlot) && (
          <div className="flex items-center gap-2 mb-2">
            <CalendarDaysIcon className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {selectedSlot ?
                `Selected: ${selectedSlot.displayTime?.full || `${selectedSlot.date} at ${selectedSlot.time}`}` :
                `Available: ${offer.suggestedSlot.displayTime?.full || offer.suggestedSlot.time}`
              }
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
