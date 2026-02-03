/**
 * Interview Scheduling & Calendar Management
 * Professional calendar interface for admin portal
 */

import React, { useState, useMemo } from 'react';
import { Calendar, Settings, Plus, Bell, Users, BarChart3 } from 'lucide-react';
import WeeklyCalendar from '../components/calendar/WeeklyCalendar';
import CalendarSidebar from '../components/calendar/CalendarSidebar';
import CalendarDndProvider from '../components/calendar/CalendarDndProvider';
import InterviewModal from '../components/calendar/InterviewModal';
import AvailabilityManager from '../components/calendar/AvailabilityManager';
import SpecialDatesManager from '../components/calendar/SpecialDatesManager';
import CalendarAnalytics from '../components/calendar/CalendarAnalytics';
import InterviewPipelineTracker from '../components/calendar/InterviewPipelineTracker';
import CalendarExport from '../components/calendar/CalendarExport';
import { useCalendarData } from '../hooks/useCalendarData';
import { format, startOfWeek, endOfWeek } from 'date-fns';

const InterviewScheduling = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'create', // create, edit, view
    slotData: null,
    interviewData: null
  });

  const [availabilityManagerOpen, setAvailabilityManagerOpen] = useState(false);
  const [specialDatesManagerOpen, setSpecialDatesManagerOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [showPipeline, setShowPipeline] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);

  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => endOfWeek(selectedDate), [selectedDate]);

  const {
    availability,
    interviews,
    loading,
    error,
    scheduleInterview,
    moveInterview,
    updateAvailability,
    refreshData,
    retryFetch
  } = useCalendarData({
    startDate: weekStart,
    endDate: weekEnd,
    timezone: 'Asia/Singapore'
  });

  const handleSaveAvailability = async (availabilityData) => {
    try {
      await updateAvailability(availabilityData);
      await refreshData();
    } catch (err) {
      throw new Error('Failed to update availability');
    }
  };

  const handleSaveSpecialDates = async (specialDates) => {
    try {
      // Frontend-only mock for special dates
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log('Special dates saved (frontend-only):', specialDates);
      await refreshData();
    } catch (err) {
      throw new Error('Failed to save special dates');
    }
  };

  const handleSlotClick = (slotData) => {
    if (slotData.interviews.length > 0) {
      // View existing interview
      setModalState({
        isOpen: true,
        mode: 'view',
        slotData,
        interviewData: slotData.interviews[0]
      });
    } else if (slotData.isAvailable) {
      // Create new interview
      setModalState({
        isOpen: true,
        mode: 'create',
        slotData,
        interviewData: null
      });
    }
  };

  const handleSlotDrop = async (dragData, dropData) => {
    if (dragData.slotData.interviews.length > 0 && dropData.slotData.isAvailable) {
      try {
        const interview = dragData.slotData.interviews[0];
        await moveInterview(interview.id, dropData.slotData.datetime);
      } catch (err) {
        console.error('Failed to move interview:', err);
        // Show error toast
      }
    }
  };

  const handleSaveInterview = async (interviewData) => {
    try {
      if (modalState.mode === 'create') {
        await scheduleInterview(interviewData);
        setSuccessMessage('Interview scheduled successfully!');
      } else if (modalState.mode === 'edit') {
        // Update interview logic here
        await scheduleInterview({ ...interviewData, id: modalState.interviewData.id });
        setSuccessMessage('Interview updated successfully!');
      }

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      throw new Error('Failed to save interview');
    }
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      mode: 'create',
      slotData: null,
      interviewData: null
    });
  };

  const upcomingInterviews = interviews.filter(interview =>
    new Date(interview.scheduled_datetime) >= new Date()
  );

  return (
    <CalendarDndProvider>
      <div className="flex flex-col h-[95vh] bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
                <span className="truncate">Interview Calendar</span>
              </h1>
              <p className="hidden sm:block text-gray-600 dark:text-gray-400 mt-1 text-sm lg:text-base">
                Professional calendar management for interview scheduling
              </p>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 lg:gap-3 ml-4">
              {/* Stats - Hidden on Mobile */}
              <div className="hidden md:flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mr-2">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{upcomingInterviews.length} upcoming</span>
                </div>
                <div className="hidden lg:flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{format(selectedDate, 'MMM dd, yyyy')}</span>
                </div>
              </div>

              {/* Desktop Action Buttons */}
              <div className="hidden lg:flex items-center gap-3">
                <button
                  onClick={() => setAnalyticsOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </button>

                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <Bell className="w-4 h-4" />
                  Notifications
                </button>

                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="py-1">
                      <button
                        onClick={() => setAvailabilityManagerOpen(true)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        📅 Weekly Availability
                      </button>
                      <button
                        onClick={() => setSpecialDatesManagerOpen(true)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        🗓️ Special Dates
                      </button>
                      <button
                        onClick={() => setExportOpen(true)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        📤 Export Calendar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Quick Schedule Button */}
              <button
                onClick={() => setModalState({ isOpen: true, mode: 'create', slotData: { datetime: new Date().toISOString() }, interviewData: null })}
                className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Quick Schedule</span>
              </button>

              {/* Mobile Settings Menu */}
              <div className="lg:hidden relative group">
                <button className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <Settings className="w-4 h-4" />
                </button>

                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => setAvailabilityManagerOpen(true)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      📅 Weekly Availability
                    </button>
                    <button
                      onClick={() => setSpecialDatesManagerOpen(true)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      🗓️ Special Dates
                    </button>
                    <button
                      onClick={() => setExportOpen(true)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      📤 Export Calendar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Mobile Header Controls */}
          <div className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setShowPipeline(!showPipeline)}
                className={`flex-shrink-0 px-3 py-2 text-sm rounded-lg transition-colors ${
                  showPipeline
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Pipeline
              </button>
              <button
                onClick={() => setAnalyticsOpen(!analyticsOpen)}
                className={`flex-shrink-0 px-3 py-2 text-sm rounded-lg transition-colors ${
                  analyticsOpen
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setAvailabilityManagerOpen(true)}
                className="flex-shrink-0 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg"
              >
                Availability
              </button>
              <button
                onClick={() => setExportOpen(true)}
                className="flex-shrink-0 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg"
              >
                Export
              </button>
            </div>
          </div>

          {/* Sidebar - Desktop */}
          <div className="hidden lg:flex flex-col flex-shrink-0 w-96 p-4 h-full overflow-y-auto space-y-4">
            <CalendarSidebar
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              upcomingInterviews={upcomingInterviews}
              filters={{}}
              onFiltersChange={() => {}}
              className="flex-shrink-0"
            />

            {showPipeline && (
              <InterviewPipelineTracker
                onCandidateSelect={(candidate) => {
                  console.log('Selected candidate:', candidate);
                  // Could open candidate modal or navigate to candidate detail
                }}
                className="flex-1 min-h-0"
              />
            )}
          </div>

          {/* Main Calendar Area */}
          <div className="flex-1 flex flex-col p-2 lg:p-4 overflow-hidden">
            {/* Mobile Analytics */}
            {analyticsOpen && (
              <div className="mb-4">
                <CalendarAnalytics
                  dateRange={30}
                  className="h-64 lg:h-96"
                />
                <button
                  onClick={() => setAnalyticsOpen(false)}
                  className="mt-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Hide Analytics
                </button>
              </div>
            )}

            {/* Mobile Pipeline */}
            {showPipeline && (
              <div className="lg:hidden mb-4">
                <InterviewPipelineTracker
                  onCandidateSelect={(candidate) => {
                    console.log('Selected candidate:', candidate);
                    setShowPipeline(false); // Auto-hide on mobile after selection
                  }}
                  className="max-h-64"
                />
              </div>
            )}

            {/* Calendar */}
            <div className="flex-1 overflow-hidden">
              <WeeklyCalendar
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onSlotClick={handleSlotClick}
                onSlotDrop={handleSlotDrop}
                timezone="Asia/Singapore"
                availabilityData={availability}
                scheduledInterviews={interviews}
                loading={loading}
                className="h-full"
              />
            </div>
          </div>
        </div>

        {/* Interview Modal */}
        <InterviewModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onSave={handleSaveInterview}
          slotData={modalState.slotData}
          interviewData={modalState.interviewData}
          mode={modalState.mode}
        />

        {/* Availability Manager */}
        <AvailabilityManager
          isOpen={availabilityManagerOpen}
          onClose={() => setAvailabilityManagerOpen(false)}
          onSave={handleSaveAvailability}
          currentAvailability={{}}
        />

        {/* Special Dates Manager */}
        <SpecialDatesManager
          isOpen={specialDatesManagerOpen}
          onClose={() => setSpecialDatesManagerOpen(false)}
          onSave={handleSaveSpecialDates}
          specialDates={[]}
        />

        {/* Calendar Export */}
        <CalendarExport
          isOpen={exportOpen}
          onClose={() => setExportOpen(false)}
          interviews={interviews}
          availability={availability}
        />

        {/* Error Display */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-medium text-sm">Error Loading Calendar</p>
                <p className="text-xs opacity-90 mt-1">
                  {typeof error === 'string' ? error : error.message}
                </p>
                {typeof error === 'object' && error.canRetry && (
                  <button
                    onClick={retryFetch}
                    className="mt-2 text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition-colors"
                  >
                    Retry ({3 - (error.retryCount || 0)} attempts left)
                  </button>
                )}
              </div>
              <button
                onClick={() => window.location.reload()}
                className="text-white hover:opacity-75 transition-opacity"
                title="Reload page"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="fixed bottom-4 left-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <div className="w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
              ✓
            </div>
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-2 text-green-200 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </CalendarDndProvider>
  );
};

export default InterviewScheduling;