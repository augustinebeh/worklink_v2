/**
 * Interview Calendar View
 * Page header with actions, and the main calendar grid area.
 * Accepts children (sidebar) to render beside the calendar in a flex row.
 */

import React from 'react';
import { Calendar, Settings, Plus, Bell, Users, BarChart3 } from 'lucide-react';
import WeeklyCalendar from '../calendar/WeeklyCalendar';
import CalendarAnalytics from '../calendar/CalendarAnalytics';
import InterviewPipelineTracker from '../calendar/InterviewPipelineTracker';
import { format } from 'date-fns';

const InterviewCalendar = ({
  children,
  selectedDate,
  onDateChange,
  upcomingInterviews,
  onQuickSchedule,
  onAnalyticsOpen,
  onAvailabilityOpen,
  onSpecialDatesOpen,
  onExportOpen,
  analyticsOpen,
  setAnalyticsOpen,
  showPipeline,
  setShowPipeline,
  onSlotClick,
  onSlotDrop,
  availability,
  interviews,
  loading,
}) => {
  return (
    <>
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
                onClick={onAnalyticsOpen}
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
                      onClick={onAvailabilityOpen}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      📅 Weekly Availability
                    </button>
                    <button
                      onClick={onSpecialDatesOpen}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      🗓️ Special Dates
                    </button>
                    <button
                      onClick={onExportOpen}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      📤 Export Calendar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Schedule Button */}
            <button
              onClick={onQuickSchedule}
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
                    onClick={onAvailabilityOpen}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    📅 Weekly Availability
                  </button>
                  <button
                    onClick={onSpecialDatesOpen}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    🗓️ Special Dates
                  </button>
                  <button
                    onClick={onExportOpen}
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

      {/* Main Content: Sidebar (children) + Calendar Grid */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {children}

        {/* Calendar Area */}
        <div className="flex-1 flex flex-col p-2 lg:p-4 overflow-hidden">
          {/* Inline Analytics (toggled) */}
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
                onCandidateSelect={() => {
                  setShowPipeline(false);
                }}
                className="max-h-64"
              />
            </div>
          )}

          {/* Weekly Calendar Grid */}
          <div className="flex-1 overflow-hidden">
            <WeeklyCalendar
              selectedDate={selectedDate}
              onDateChange={onDateChange}
              onSlotClick={onSlotClick}
              onSlotDrop={onSlotDrop}
              timezone="Asia/Singapore"
              availabilityData={availability}
              scheduledInterviews={interviews}
              loading={loading}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default InterviewCalendar;
