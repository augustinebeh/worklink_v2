/**
 * Interview Scheduling & Calendar Management
 * Professional calendar interface for admin portal
 */

import React, { useState, useMemo } from 'react';
import CalendarDndProvider from '../components/calendar/CalendarDndProvider';
import InterviewModal from '../components/calendar/InterviewModal';
import AvailabilityManager from '../components/calendar/AvailabilityManager';
import SpecialDatesManager from '../components/calendar/SpecialDatesManager';
import CalendarExport from '../components/calendar/CalendarExport';
import InterviewCalendar from '../components/interview/InterviewCalendar';
import InterviewSlotList from '../components/interview/InterviewSlotList';
import { useCalendarData } from '../hooks/useCalendarData';
import { startOfWeek, endOfWeek } from 'date-fns';

const InterviewScheduling = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'create',
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

  // --- Handlers ---

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
      await new Promise(resolve => setTimeout(resolve, 300));
      await refreshData();
    } catch (err) {
      throw new Error('Failed to save special dates');
    }
  };

  const handleSlotClick = (slotData) => {
    if (slotData.interviews.length > 0) {
      setModalState({
        isOpen: true,
        mode: 'view',
        slotData,
        interviewData: slotData.interviews[0]
      });
    } else if (slotData.isAvailable) {
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
        // Failed to move interview
      }
    }
  };

  const handleSaveInterview = async (interviewData) => {
    try {
      if (modalState.mode === 'create') {
        await scheduleInterview(interviewData);
        setSuccessMessage('Interview scheduled successfully!');
      } else if (modalState.mode === 'edit') {
        await scheduleInterview({ ...interviewData, id: modalState.interviewData.id });
        setSuccessMessage('Interview updated successfully!');
      }
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      throw new Error('Failed to save interview');
    }
  };

  const handleQuickSchedule = () => {
    setModalState({
      isOpen: true,
      mode: 'create',
      slotData: { datetime: new Date().toISOString() },
      interviewData: null
    });
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
        {/* Calendar header + grid, with sidebar slotted as children */}
        <InterviewCalendar
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          upcomingInterviews={upcomingInterviews}
          onQuickSchedule={handleQuickSchedule}
          onAnalyticsOpen={() => setAnalyticsOpen(true)}
          onAvailabilityOpen={() => setAvailabilityManagerOpen(true)}
          onSpecialDatesOpen={() => setSpecialDatesManagerOpen(true)}
          onExportOpen={() => setExportOpen(true)}
          analyticsOpen={analyticsOpen}
          setAnalyticsOpen={setAnalyticsOpen}
          showPipeline={showPipeline}
          setShowPipeline={setShowPipeline}
          onSlotClick={handleSlotClick}
          onSlotDrop={handleSlotDrop}
          availability={availability}
          interviews={interviews}
          loading={loading}
        >
          <InterviewSlotList
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            upcomingInterviews={upcomingInterviews}
            showPipeline={showPipeline}
            setShowPipeline={setShowPipeline}
            analyticsOpen={analyticsOpen}
            setAnalyticsOpen={setAnalyticsOpen}
            onAvailabilityOpen={() => setAvailabilityManagerOpen(true)}
            onExportOpen={() => setExportOpen(true)}
          />
        </InterviewCalendar>

        {/* Modals */}
        <InterviewModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onSave={handleSaveInterview}
          slotData={modalState.slotData}
          interviewData={modalState.interviewData}
          mode={modalState.mode}
        />

        <AvailabilityManager
          isOpen={availabilityManagerOpen}
          onClose={() => setAvailabilityManagerOpen(false)}
          onSave={handleSaveAvailability}
          currentAvailability={{}}
        />

        <SpecialDatesManager
          isOpen={specialDatesManagerOpen}
          onClose={() => setSpecialDatesManagerOpen(false)}
          onSave={handleSaveSpecialDates}
          specialDates={[]}
        />

        <CalendarExport
          isOpen={exportOpen}
          onClose={() => setExportOpen(false)}
          interviews={interviews}
          availability={availability}
        />

        {/* Toast Notifications */}
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

        {loading && (
          <div className="fixed bottom-4 left-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </div>
        )}

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
