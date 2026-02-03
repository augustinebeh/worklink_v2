import React, { useState } from 'react';
import { Calendar, Clock, User, Settings, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { format, isToday, isSameWeek } from 'date-fns';

const CalendarSidebar = ({
  selectedDate,
  onDateChange,
  upcomingInterviews = [],
  filters,
  onFiltersChange,
  className = ''
}) => {
  const [expandedSections, setExpandedSections] = useState({
    upcoming: true,
    thisWeek: true,
    filters: true,
    quickActions: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const todayInterviews = upcomingInterviews.filter(interview =>
    isToday(new Date(interview.scheduled_datetime))
  );

  const thisWeekInterviews = upcomingInterviews.filter(interview =>
    isSameWeek(new Date(interview.scheduled_datetime), new Date()) &&
    !isToday(new Date(interview.scheduled_datetime))
  );

  const SectionHeader = ({ title, section, count }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900 dark:text-white">{title}</span>
        {count !== undefined && (
          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
            {count}
          </span>
        )}
      </div>
      {expandedSections[section] ? (
        <ChevronDown className="w-4 h-4 text-gray-500" />
      ) : (
        <ChevronRight className="w-4 h-4 text-gray-500" />
      )}
    </button>
  );

  const InterviewItem = ({ interview }) => (
    <div className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {interview.candidate_name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {format(new Date(interview.scheduled_datetime), 'HH:mm')} • {interview.duration || 30}min
        </div>
      </div>
      <div className={`w-2 h-2 rounded-full ${
        interview.status === 'confirmed' ? 'bg-green-500' :
        interview.status === 'scheduled' ? 'bg-blue-500' :
        'bg-yellow-500'
      }`} />
    </div>
  );

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      {/* Mini Calendar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-gray-900 dark:text-white">Quick Navigate</span>
        </div>
        {/* Add a mini calendar component here */}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {format(selectedDate, 'MMMM yyyy')}
        </div>
      </div>

      {/* Today's Interviews */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <SectionHeader title="Today's Interviews" section="upcoming" count={todayInterviews.length} />
        {expandedSections.upcoming && (
          <div className="px-3 pb-3 space-y-2">
            {todayInterviews.length > 0 ? (
              todayInterviews.map(interview => (
                <InterviewItem key={interview.id} interview={interview} />
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                No interviews scheduled for today
              </div>
            )}
          </div>
        )}
      </div>

      {/* This Week's Interviews */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <SectionHeader title="This Week" section="thisWeek" count={thisWeekInterviews.length} />
        {expandedSections.thisWeek && (
          <div className="px-3 pb-3 space-y-2">
            {thisWeekInterviews.length > 0 ? (
              thisWeekInterviews.slice(0, 5).map(interview => (
                <InterviewItem key={interview.id} interview={interview} />
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                No upcoming interviews this week
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <SectionHeader title="Filters" section="filters" />
        {expandedSections.filters && (
          <div className="p-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Interview Status
              </label>
              <select className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Interview Type
              </label>
              <select className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="all">All Types</option>
                <option value="video">Video Call</option>
                <option value="phone">Phone Call</option>
                <option value="in-person">In Person</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="show-availability"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="show-availability" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Show only available slots
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="show-conflicts"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="show-conflicts" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Highlight conflicts
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <SectionHeader title="Quick Actions" section="quickActions" />
        {expandedSections.quickActions && (
          <div className="p-3 space-y-2">
            <button className="w-full text-left text-sm p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
              📅 Set Weekly Availability
            </button>
            <button className="w-full text-left text-sm p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
              ⏰ Add Buffer Time
            </button>
            <button className="w-full text-left text-sm p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
              🚫 Block Time Slot
            </button>
            <button className="w-full text-left text-sm p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
              📊 View Analytics
            </button>
            <button className="w-full text-left text-sm p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
              📤 Export Calendar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarSidebar;