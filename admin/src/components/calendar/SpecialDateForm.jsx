import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const OVERRIDE_TYPES = [
  { value: 'holiday', label: 'Holiday', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { value: 'blocked', label: 'Blocked', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  { value: 'custom', label: 'Custom Hours', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'vacation', label: 'Vacation', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' }
];

export { OVERRIDE_TYPES };

/**
 * SpecialDateForm - Form for adding/editing special dates with custom hours support
 */
const SpecialDateForm = ({
  newDate,
  setNewDate,
  editingDate,
  onAdd,
  onUpdate,
  onCancelEdit
}) => {
  const addCustomHour = () => {
    setNewDate(prev => ({
      ...prev,
      customHours: [...prev.customHours, { start: '09:00', end: '17:00' }]
    }));
  };

  const removeCustomHour = (index) => {
    setNewDate(prev => ({
      ...prev,
      customHours: prev.customHours.filter((_, i) => i !== index)
    }));
  };

  const updateCustomHour = (index, field, value) => {
    setNewDate(prev => ({
      ...prev,
      customHours: prev.customHours.map((hour, i) =>
        i === index ? { ...hour, [field]: value } : hour
      )
    }));
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">
        {editingDate ? 'Edit Special Date' : 'Add Special Date'}
      </h4>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date *
          </label>
          <input
            type="date"
            value={newDate.date}
            onChange={(e) => setNewDate(prev => ({ ...prev, date: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Type *
          </label>
          <select
            value={newDate.type}
            onChange={(e) => setNewDate(prev => ({ ...prev, type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {OVERRIDE_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Title *
        </label>
        <input
          type="text"
          value={newDate.title}
          onChange={(e) => setNewDate(prev => ({ ...prev, title: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="e.g., Christmas Holiday, Team Meeting"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          value={newDate.description}
          onChange={(e) => setNewDate(prev => ({ ...prev, description: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
          placeholder="Optional description"
        />
      </div>

      {/* Custom Hours for 'custom' type */}
      {newDate.type === 'custom' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Custom Hours
            </label>
            <button
              onClick={addCustomHour}
              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Slot
            </button>
          </div>

          <div className="space-y-2">
            {newDate.customHours.map((hour, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="time"
                  value={hour.start}
                  onChange={(e) => updateCustomHour(index, 'start', e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <span className="text-gray-500 dark:text-gray-400">to</span>
                <input
                  type="time"
                  value={hour.end}
                  onChange={(e) => updateCustomHour(index, 'end', e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => removeCustomHour(index)}
                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {editingDate && (
          <button
            onClick={onCancelEdit}
            className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={editingDate ? onUpdate : onAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          {editingDate ? 'Update' : 'Add'} Date
        </button>
      </div>
    </div>
  );
};

export default SpecialDateForm;
