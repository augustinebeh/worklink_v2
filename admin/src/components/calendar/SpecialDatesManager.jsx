import React, { useState, useEffect } from 'react';
import { Calendar, X, AlertTriangle, Save } from 'lucide-react';
import SpecialDateForm from './SpecialDateForm';
import SpecialDateList from './SpecialDateList';

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
    resetForm();
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
    resetForm();
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

  const resetForm = () => {
    setNewDate({
      date: '',
      type: 'holiday',
      title: '',
      description: '',
      customHours: []
    });
  };

  const handleCancelEdit = () => {
    setEditingDate(null);
    resetForm();
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

            <SpecialDateForm
              newDate={newDate}
              setNewDate={setNewDate}
              editingDate={editingDate}
              onAdd={handleAddDate}
              onUpdate={handleUpdateDate}
              onCancelEdit={handleCancelEdit}
            />

            <SpecialDateList
              dates={dates}
              onEdit={handleEditDate}
              onDelete={handleDeleteDate}
            />

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
