import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Save, Copy, Trash2, Plus, Settings, AlertTriangle, X } from 'lucide-react';
import { format, addDays, startOfWeek, setHours, setMinutes } from 'date-fns';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' }
];

const AVAILABILITY_TEMPLATES = [
  {
    id: 'business_hours',
    name: 'Business Hours (9-5)',
    description: 'Standard business hours Monday to Friday',
    schedule: {
      monday: [{ start: '09:00', end: '17:00' }],
      tuesday: [{ start: '09:00', end: '17:00' }],
      wednesday: [{ start: '09:00', end: '17:00' }],
      thursday: [{ start: '09:00', end: '17:00' }],
      friday: [{ start: '09:00', end: '17:00' }],
      saturday: [],
      sunday: []
    }
  },
  {
    id: 'flexible',
    name: 'Flexible Hours',
    description: '10-6 weekdays, 10-2 weekends',
    schedule: {
      monday: [{ start: '10:00', end: '18:00' }],
      tuesday: [{ start: '10:00', end: '18:00' }],
      wednesday: [{ start: '10:00', end: '18:00' }],
      thursday: [{ start: '10:00', end: '18:00' }],
      friday: [{ start: '10:00', end: '18:00' }],
      saturday: [{ start: '10:00', end: '14:00' }],
      sunday: [{ start: '10:00', end: '14:00' }]
    }
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: '6 AM to 2 PM weekdays',
    schedule: {
      monday: [{ start: '06:00', end: '14:00' }],
      tuesday: [{ start: '06:00', end: '14:00' }],
      wednesday: [{ start: '06:00', end: '14:00' }],
      thursday: [{ start: '06:00', end: '14:00' }],
      friday: [{ start: '06:00', end: '14:00' }],
      saturday: [],
      sunday: []
    }
  }
];

const AvailabilityManager = ({
  isOpen,
  onClose,
  onSave,
  currentAvailability = {},
  className = ''
}) => {
  const [weeklySchedule, setWeeklySchedule] = useState({});
  const [bufferTime, setBufferTime] = useState(15);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize with current availability or empty schedule
    const initialSchedule = {};
    DAYS_OF_WEEK.forEach(day => {
      initialSchedule[day.key] = currentAvailability[day.key] || [];
    });
    setWeeklySchedule(initialSchedule);
  }, [currentAvailability, isOpen]);

  const addTimeSlot = (dayKey) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [dayKey]: [...prev[dayKey], { start: '09:00', end: '17:00' }]
    }));
  };

  const removeTimeSlot = (dayKey, index) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [dayKey]: prev[dayKey].filter((_, i) => i !== index)
    }));
  };

  const updateTimeSlot = (dayKey, index, field, value) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [dayKey]: prev[dayKey].map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      )
    }));
  };

  const applyTemplate = (templateId) => {
    const template = AVAILABILITY_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setWeeklySchedule(template.schedule);
      setSelectedTemplate(templateId);
    }
  };

  const copyDay = (fromDay, toDay) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [toDay]: [...prev[fromDay]]
    }));
  };

  const clearDay = (dayKey) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [dayKey]: []
    }));
  };

  const validateSchedule = () => {
    for (const [dayKey, slots] of Object.entries(weeklySchedule)) {
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (slot.start >= slot.end) {
          return `Invalid time range on ${DAYS_OF_WEEK.find(d => d.key === dayKey)?.label}`;
        }

        // Check for overlaps
        for (let j = i + 1; j < slots.length; j++) {
          const otherSlot = slots[j];
          if ((slot.start < otherSlot.end && slot.end > otherSlot.start)) {
            return `Time slots overlap on ${DAYS_OF_WEEK.find(d => d.key === dayKey)?.label}`;
          }
        }
      }
    }
    return null;
  };

  const handleSave = async () => {
    const validation = validateSchedule();
    if (validation) {
      setError(validation);
      return;
    }

    try {
      setLoading(true);
      setError('');

      await onSave({
        weeklySchedule,
        bufferTime,
        timezone: 'Asia/Singapore'
      });

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save availability');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Manage Weekly Availability
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Templates */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Quick Templates
              </label>
              <div className="grid grid-cols-3 gap-3">
                {AVAILABILITY_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template.id)}
                    className={`p-3 text-left border rounded-lg transition-colors ${
                      selectedTemplate === template.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {template.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {template.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Buffer Time */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Buffer Time Between Interviews
              </label>
              <select
                value={bufferTime}
                onChange={(e) => setBufferTime(parseInt(e.target.value))}
                className="w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value={0}>No buffer</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            {/* Weekly Schedule */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Weekly Schedule
              </label>

              {DAYS_OF_WEEK.map(day => (
                <div key={day.key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {day.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => addTimeSlot(day.key)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add Slot
                      </button>
                      <button
                        onClick={() => clearDay(day.key)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {weeklySchedule[day.key]?.length > 0 ? (
                      weeklySchedule[day.key].map((slot, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) => updateTimeSlot(day.key, index, 'start', e.target.value)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                          <span className="text-gray-500 dark:text-gray-400">to</span>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) => updateTimeSlot(day.key, index, 'end', e.target.value)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                          <button
                            onClick={() => removeTimeSlot(day.key, index)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                        No availability set for {day.label}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <Save className="w-4 h-4" />
                Save Availability
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityManager;