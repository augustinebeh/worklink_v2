import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Phone, Video, MapPin, Save, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const InterviewModal = ({
  isOpen,
  onClose,
  onSave,
  slotData,
  interviewData = null,
  mode = 'create', // create, edit, view
  className = ''
}) => {
  const [formData, setFormData] = useState({
    candidate_id: '',
    candidate_name: '',
    candidate_email: '',
    interview_type: 'video',
    duration: 30,
    notes: '',
    status: 'scheduled'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (interviewData) {
      setFormData({
        candidate_id: interviewData.candidate_id || '',
        candidate_name: interviewData.candidate_name || '',
        candidate_email: interviewData.candidate_email || '',
        interview_type: interviewData.type || 'video',
        duration: interviewData.duration || 30,
        notes: interviewData.notes || '',
        status: interviewData.status || 'scheduled'
      });
    } else {
      setFormData({
        candidate_id: '',
        candidate_name: '',
        candidate_email: '',
        interview_type: 'video',
        duration: 30,
        notes: '',
        status: 'scheduled'
      });
    }
    setError('');
  }, [interviewData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Enhanced validation
    if (!formData.candidate_name.trim()) {
      setError('Candidate name is required');
      return;
    }

    if (formData.candidate_email && !isValidEmail(formData.candidate_email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (formData.duration < 15 || formData.duration > 240) {
      setError('Duration must be between 15 and 240 minutes');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const interviewPayload = {
        ...formData,
        datetime: slotData.datetime,
        scheduled_date: format(new Date(slotData.datetime), 'yyyy-MM-dd'),
        scheduled_time: format(new Date(slotData.datetime), 'HH:mm'),
      };

      await onSave(interviewPayload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save interview');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const isEdit = mode === 'edit';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-900 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {mode === 'create' ? 'Schedule Interview' :
                 mode === 'edit' ? 'Edit Interview' :
                 'Interview Details'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Time Slot Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Clock className="w-4 h-4" />
              <span className="font-medium">
                {format(new Date(slotData.datetime), 'EEEE, MMMM dd, yyyy at HH:mm')}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Candidate Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Candidate Name *
                </label>
                <input
                  type="text"
                  value={formData.candidate_name}
                  onChange={(e) => handleChange('candidate_name', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500"
                  placeholder="Enter candidate name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.candidate_email}
                  onChange={(e) => handleChange('candidate_email', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500"
                  placeholder="candidate@email.com"
                />
              </div>
            </div>

            {/* Interview Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Interview Type
                </label>
                <select
                  value={formData.interview_type}
                  onChange={(e) => handleChange('interview_type', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500"
                >
                  <option value="video">📹 Video Call</option>
                  <option value="phone">📞 Phone Call</option>
                  <option value="in-person">🏢 In Person</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (minutes)
                </label>
                <select
                  value={formData.duration}
                  onChange={(e) => handleChange('duration', parseInt(e.target.value))}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>
            </div>

            {/* Status (for edit mode) */}
            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                disabled={isReadOnly}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 resize-none"
                placeholder="Additional notes about the interview..."
              />
            </div>

            {/* Actions */}
            {!isReadOnly && (
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <Save className="w-4 h-4" />
                  {mode === 'create' ? 'Schedule Interview' : 'Save Changes'}
                </button>
              </div>
            )}

            {isReadOnly && (
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default InterviewModal;