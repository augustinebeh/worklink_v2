import { useState } from 'react';
import {
  Clock as ClockIcon,
  Check as CheckIcon,
  X as XMarkIcon,
  AlertTriangle as ExclamationTriangleIcon,
  ArrowRight as ArrowRightIcon
} from 'lucide-react';
import { clsx } from 'clsx';

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
