import React, { useState, useEffect } from 'react';
import { Calendar, Plus, X, Edit, Trash2, AlertTriangle, Save } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';

const OVERRIDE_TYPES = [
  { value: 'holiday', label: 'Holiday', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { value: 'blocked', label: 'Blocked', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  { value: 'custom', label: 'Custom Hours', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'vacation', label: 'Vacation', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' }
];

const SpecialDatesManager = ({
  isOpen,
  onClose,
  onSave,
  specialDates = [],
  className = ''
}) => {
  const [dates, setDates] = useState([]);
  const [editingDate, setEditingDate] = useState(null);
  const [newDate, setNewDate] = useState({
    date: '',
    type: 'holiday',
    title: '',
    description: '',
    customHours: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDates(specialDates || []);
  }, [specialDates, isOpen]);

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

  const handleAddDate = () => {
    if (!newDate.date || !newDate.title) {
      setError('Date and title are required');
      return;
    }

    const dateObj = {
      id: Date.now().toString(),
      date: newDate.date,
      type: newDate.type,
      title: newDate.title,
      description: newDate.description,
      customHours: newDate.type === 'custom' ? newDate.customHours : []
    };

    setDates(prev => [...prev, dateObj]);
    setNewDate({
      date: '',
      type: 'holiday',
      title: '',
      description: '',
      customHours: []
    });
    setError('');
  };

  const handleEditDate = (dateItem) => {
    setEditingDate(dateItem.id);
    setNewDate({
      date: dateItem.date,
      type: dateItem.type,
      title: dateItem.title,
      description: dateItem.description,
      customHours: dateItem.customHours || []
    });
  };

  const handleUpdateDate = () => {
    if (!newDate.date || !newDate.title) {
      setError('Date and title are required');
      return;
    }

    setDates(prev => prev.map(date =>
      date.id === editingDate
        ? {
            ...date,
            date: newDate.date,
            type: newDate.type,
            title: newDate.title,
            description: newDate.description,
            customHours: newDate.type === 'custom' ? newDate.customHours : []
          }
        : date
    ));

    setEditingDate(null);
    setNewDate({
      date: '',
      type: 'holiday',
      title: '',
      description: '',
      customHours: []
    });
    setError('');
  };

  const handleDeleteDate = (id) => {
    setDates(prev => prev.filter(date => date.id !== id));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      await onSave(dates);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save special dates');
    } finally {
      setLoading(false);
    }
  };

  const getTypeConfig = (type) => {
    return OVERRIDE_TYPES.find(t => t.value === type) || OVERRIDE_TYPES[0];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Special Dates & Overrides
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
            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            {/* Add/Edit Form */}
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
                    onClick={() => {
                      setEditingDate(null);
                      setNewDate({
                        date: '',
                        type: 'holiday',
                        title: '',
                        description: '',
                        customHours: []
                      });
                    }}
                    className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={editingDate ? handleUpdateDate : handleAddDate}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingDate ? 'Update' : 'Add'} Date
                </button>
              </div>
            </div>

            {/* Existing Dates List */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                Special Dates ({dates.length})
              </h4>

              {dates.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {dates
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map(dateItem => {
                      const typeConfig = getTypeConfig(dateItem.type);
                      return (
                        <div
                          key={dateItem.id}
                          className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {dateItem.title}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeConfig.color}`}>
                                {typeConfig.label}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {format(parseISO(dateItem.date), 'EEEE, MMMM dd, yyyy')}
                            </div>
                            {dateItem.description && (
                              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                {dateItem.description}
                              </div>
                            )}
                            {dateItem.customHours?.length > 0 && (
                              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                Custom hours: {dateItem.customHours.map(h => `${h.start}-${h.end}`).join(', ')}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditDate(dateItem)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDate(dateItem.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No special dates configured
                </div>
              )}
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
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpecialDatesManager;