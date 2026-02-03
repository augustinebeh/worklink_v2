import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, User, ChevronLeft, ChevronRight, Plus, Settings, Filter } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO, isToday, isWithinInterval } from 'date-fns';
import TimeSlot from './TimeSlot';
// Removed useCalendarData import as data is passed from parent

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const WeeklyCalendar = ({
  selectedDate = new Date(),
  onDateChange,
  onSlotClick,
  onSlotDrop,
  timezone = 'Asia/Singapore',
  availabilityData = [],
  scheduledInterviews = [],
  loading = false,
  className = ''
}) => {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(selectedDate));
  const [viewMode, setViewMode] = useState('week'); // week, workweek
  const [showAvailabilityOnly, setShowAvailabilityOnly] = useState(false);

  // Data is now passed from parent component via props

  const weekDays = useMemo(() => {
    const days = [];
    const start = viewMode === 'workweek' ? addDays(currentWeek, 1) : currentWeek; // Skip Sunday for workweek
    const count = viewMode === 'workweek' ? 5 : 7;

    for (let i = 0; i < count; i++) {
      days.push(addDays(start, i));
    }
    return days;
  }, [currentWeek, viewMode]);

  const navigateWeek = (direction) => {
    const newWeek = direction === 'next' ? addWeeks(currentWeek, 1) : subWeeks(currentWeek, 1);
    setCurrentWeek(newWeek);
    onDateChange?.(newWeek);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentWeek(startOfWeek(today));
    onDateChange?.(today);
  };

  const getSlotData = (day, hour) => {
    const slotDate = new Date(day);
    slotDate.setHours(hour, 0, 0, 0);

    // Find scheduled interviews for this slot
    const interviews = scheduledInterviews.filter(interview => {
      const interviewDate = parseISO(interview.scheduled_datetime);
      return isSameDay(interviewDate, slotDate) && interviewDate.getHours() === hour;
    });

    // Find availability for this slot
    const availabilitySlot = availabilityData.find(slot => {
      const slotDateTime = parseISO(slot.datetime);
      return isSameDay(slotDateTime, slotDate) && slotDateTime.getHours() === hour;
    });

    return {
      datetime: slotDate.toISOString(),
      isAvailable: availabilitySlot?.is_available || false,
      interviews,
      isBlocked: availabilitySlot?.is_blocked || false,
      notes: availabilitySlot?.notes || '',
      bufferTime: availabilitySlot?.buffer_minutes || 0
    };
  };

  const handleSlotClick = (slotData, day, hour) => {
    onSlotClick?.({
      ...slotData,
      day,
      hour,
      formattedTime: format(slotData.datetime, 'HH:mm'),
      formattedDate: format(day, 'yyyy-MM-dd')
    });
  };

  const handleSlotDrop = (dragData, dropData) => {
    onSlotDrop?.(dragData, dropData);
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 lg:p-4 border-b border-gray-200 dark:border-gray-700 gap-3 sm:gap-4">
        <div className="flex items-center gap-3 lg:gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
              Calendar
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('week')}
              className={`px-2 lg:px-3 py-1 text-xs lg:text-sm rounded-md transition-colors ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">7 Day</span>
              <span className="sm:hidden">7D</span>
            </button>
            <button
              onClick={() => setViewMode('workweek')}
              className={`px-2 lg:px-3 py-1 text-xs lg:text-sm rounded-md transition-colors ${
                viewMode === 'workweek'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">5 Day</span>
              <span className="sm:hidden">5D</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between sm:gap-3">
          {/* Mobile-first controls */}
          <div className="flex items-center gap-2">
            {/* Week Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-2 lg:px-4 py-2 text-xs lg:text-sm font-medium text-gray-900 dark:text-white min-w-[120px] lg:min-w-[160px] text-center">
                <span className="lg:hidden">
                  {format(currentWeek, 'MMM dd')} - {format(endOfWeek(currentWeek), 'MMM dd')}
                </span>
                <span className="hidden lg:inline">
                  {format(currentWeek, 'MMM dd')} - {format(endOfWeek(currentWeek), 'MMM dd, yyyy')}
                </span>
              </div>

              <button
                onClick={() => navigateWeek('next')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Today Button */}
            <button
              onClick={goToToday}
              className="px-2 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              Today
            </button>
          </div>

          {/* Desktop controls */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowAvailabilityOnly(!showAvailabilityOnly)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showAvailabilityOnly
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              Available Only
            </button>

            {/* Settings Button */}
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Mobile settings */}
          <button
            onClick={() => setShowAvailabilityOnly(!showAvailabilityOnly)}
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              showAvailabilityOnly
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex flex-col h-[calc(100vh-180px)] sm:h-[calc(100vh-160px)] lg:h-[calc(100vh-200px)] overflow-hidden">
        {/* Day Headers */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="w-10 sm:w-12 lg:w-20 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 p-1 sm:p-2 lg:p-3">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:inline">Time</span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 sm:hidden">T</span>
          </div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className="flex-1 min-w-0 border-r border-gray-200 dark:border-gray-700 last:border-r-0 p-1 sm:p-2 lg:p-3"
            >
              <div className="text-center">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <span className="hidden sm:inline">{format(day, 'EEE')}</span>
                  <span className="sm:hidden">{format(day, 'EEEEE')}</span>
                </div>
                <div className={`text-sm lg:text-lg font-semibold mt-0.5 sm:mt-1 ${
                  isToday(day)
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {format(day, 'd')}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Time Slots */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            {/* Time Labels */}
            <div className="w-10 sm:w-12 lg:w-20 flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-10 sm:h-12 lg:h-16 flex items-start justify-end pr-0.5 sm:pr-1 lg:pr-3 pt-1 lg:pt-2 border-b border-gray-100 dark:border-gray-800"
                >
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="lg:hidden">
                      {format(new Date().setHours(hour, 0, 0, 0), 'H')}
                    </span>
                    <span className="hidden lg:inline">
                      {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            {/* Calendar Body */}
            <div className="flex flex-1">
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className="flex-1 min-w-0 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                >
                  {HOURS.map((hour) => {
                    const slotData = getSlotData(day, hour);

                    // Filter based on availability if enabled
                    if (showAvailabilityOnly && !slotData.isAvailable) {
                      return (
                        <div
                          key={hour}
                          className="h-10 sm:h-12 lg:h-16 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
                        />
                      );
                    }

                    return (
                      <TimeSlot
                        key={hour}
                        slotData={slotData}
                        day={day}
                        hour={hour}
                        isToday={isToday(day)}
                        onClick={() => handleSlotClick(slotData, day, hour)}
                        onDrop={(dragData) => handleSlotDrop(dragData, slotData)}
                        className="h-10 sm:h-12 lg:h-16 border-b border-gray-100 dark:border-gray-800"
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading calendar...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyCalendar;