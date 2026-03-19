/**
 * Interview Slot List
 * Sidebar with calendar date picker, upcoming interviews, and pipeline tracker.
 * Includes mobile toggle controls.
 */

import React from 'react';
import CalendarSidebar from '../calendar/CalendarSidebar';
import InterviewPipelineTracker from '../calendar/InterviewPipelineTracker';

const InterviewSlotList = ({
  selectedDate,
  onDateChange,
  upcomingInterviews,
  showPipeline,
  setShowPipeline,
  analyticsOpen,
  setAnalyticsOpen,
  onAvailabilityOpen,
  onExportOpen,
}) => {
  return (
    <>
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
            onClick={onAvailabilityOpen}
            className="flex-shrink-0 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg"
          >
            Availability
          </button>
          <button
            onClick={onExportOpen}
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
          onDateChange={onDateChange}
          upcomingInterviews={upcomingInterviews}
          filters={{}}
          onFiltersChange={() => {}}
          className="flex-shrink-0"
        />

        {showPipeline && (
          <InterviewPipelineTracker
            onCandidateSelect={() => {}}
            className="flex-1 min-h-0"
          />
        )}
      </div>
    </>
  );
};

export default InterviewSlotList;
