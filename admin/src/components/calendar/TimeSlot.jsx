import React, { useState } from 'react';
import { Clock, User, CheckCircle, AlertTriangle, Calendar, Phone, Video, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useDrag, useDrop } from 'react-dnd';
import clsx from 'clsx';

const TimeSlot = ({
  slotData,
  day,
  hour,
  isToday = false,
  onClick,
  onDrop,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Drag and drop functionality
  const [{ isDragging }, drag] = useDrag({
    type: 'interview',
    item: { slotData, day, hour },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: () => slotData.interviews.length > 0
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'interview',
    drop: (item) => {
      if (onDrop) {
        onDrop(item, { slotData, day, hour });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop() && !slotData.isBlocked
    })
  });

  // Combine drag and drop refs
  const ref = (node) => {
    drag(node);
    drop(node);
  };

  const hasInterviews = slotData.interviews.length > 0;
  const isAvailable = slotData.isAvailable && !slotData.isBlocked;
  const isBlocked = slotData.isBlocked;

  // Determine slot status and styling
  const getSlotStatus = () => {
    if (isBlocked) return 'blocked';
    if (hasInterviews) return 'scheduled';
    if (isAvailable) return 'available';
    return 'unavailable';
  };

  const status = getSlotStatus();

  const getStatusStyles = () => {
    const baseStyles = 'transition-all duration-200 cursor-pointer relative';

    switch (status) {
      case 'scheduled':
        return `${baseStyles} bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30`;
      case 'available':
        return `${baseStyles} bg-green-50 dark:bg-green-900/20 border-l-2 border-green-300 hover:bg-green-100 dark:hover:bg-green-900/30`;
      case 'blocked':
        return `${baseStyles} bg-red-50 dark:bg-red-900/20 border-l-2 border-red-300 cursor-not-allowed`;
      default:
        return `${baseStyles} bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800`;
    }
  };

  const getInterviewTypeIcon = (type) => {
    switch (type) {
      case 'video':
        return Video;
      case 'phone':
        return Phone;
      default:
        return Calendar;
    }
  };

  return (
    <div
      ref={ref}
      className={clsx(
        getStatusStyles(),
        className,
        {
          'opacity-50': isDragging,
          'ring-2 ring-blue-500 ring-opacity-50': isOver && canDrop,
          'ring-2 ring-red-500 ring-opacity-50': isOver && !canDrop,
          'border-l-blue-500': isToday && status === 'available',
        }
      )}
      onClick={() => !isBlocked && onClick?.()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setTimeout(() => setIsHovered(false), 1000)}
    >
      <div className="p-1 lg:p-2 h-full flex flex-col justify-between">
        {/* Slot Content */}
        {hasInterviews ? (
          <div className="space-y-1">
            {slotData.interviews.slice(0, 2).map((interview, index) => {
              const InterviewIcon = getInterviewTypeIcon(interview.type);
              return (
                <div
                  key={interview.id || index}
                  className="flex items-center gap-1 lg:gap-2 p-0.5 lg:p-1 bg-white dark:bg-gray-800 rounded text-xs"
                >
                  <InterviewIcon className="w-2 h-2 lg:w-3 lg:h-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate text-xs">
                      <span className="sm:hidden">
                        {(interview.candidate_name || 'Interview').split(' ')[0]}
                      </span>
                      <span className="hidden sm:inline">
                        {interview.candidate_name || 'Interview'}
                      </span>
                    </div>
                    {interview.duration && (
                      <div className="hidden lg:block text-gray-500 dark:text-gray-400 text-xs">
                        {interview.duration}min
                      </div>
                    )}
                  </div>
                  <div className={clsx(
                    'w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full flex-shrink-0',
                    interview.status === 'confirmed' ? 'bg-green-500' :
                    interview.status === 'scheduled' ? 'bg-blue-500' :
                    interview.status === 'cancelled' ? 'bg-red-500' :
                    'bg-yellow-500'
                  )} />
                </div>
              );
            })}
            {slotData.interviews.length > 2 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                +{slotData.interviews.length - 2} more
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            {status === 'available' && isHovered && (
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Plus className="w-2 h-2 lg:w-3 lg:h-3" />
                <span className="hidden lg:inline">Add</span>
              </div>
            )}
            {status === 'blocked' && (
              <AlertTriangle className="w-3 h-3 lg:w-4 lg:h-4 text-red-500" />
            )}
          </div>
        )}

        {/* Status Indicators */}
        <div className="flex items-center justify-between">
          {/* Buffer Time Indicator */}
          {slotData.bufferTime > 0 && (
            <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
              <Clock className="w-2 h-2 lg:w-3 lg:h-3" />
              <span className="hidden lg:inline">{slotData.bufferTime}m</span>
              <span className="lg:hidden">{slotData.bufferTime}</span>
            </div>
          )}

          {/* Available Indicator */}
          {status === 'available' && (
            <CheckCircle className="w-2 h-2 lg:w-3 lg:h-3 text-green-500 ml-auto" />
          )}

          {/* Interview Count */}
          {hasInterviews && slotData.interviews.length > 1 && (
            <div className="ml-auto bg-blue-600 text-white text-xs px-1 lg:px-1.5 py-0.5 rounded-full">
              <span className="lg:hidden">+{slotData.interviews.length - 1}</span>
              <span className="hidden lg:inline">+{slotData.interviews.length - 1}</span>
            </div>
          )}
        </div>

        {/* Hover Tooltip */}
        {isHovered && (
          <div className="absolute z-20 top-full left-0 mt-1 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg min-w-[180px] sm:min-w-[200px] max-w-[280px]">
            <div className="font-medium mb-1">
              {format(new Date(slotData.datetime), 'MMM dd, HH:mm')}
            </div>
            <div className="space-y-1 text-gray-300 dark:text-gray-300">
              <div>Status: <span className="capitalize">{status}</span></div>
              {slotData.bufferTime > 0 && (
                <div>Buffer: {slotData.bufferTime} minutes</div>
              )}
              {hasInterviews && (
                <div>{slotData.interviews.length} interview(s) scheduled</div>
              )}
              {slotData.notes && (
                <div className="border-t border-gray-600 pt-1 mt-1">
                  {slotData.notes}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeSlot;