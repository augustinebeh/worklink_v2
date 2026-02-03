/**
 * Countdown Timer Component
 *
 * Displays a live countdown timer for time-sensitive opportunities
 * with urgency styling that intensifies as time runs out.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ClockIcon } from '@heroicons/react/24/solid';

const CountdownTimer = ({
  endTime,
  onComplete,
  showIcon = true,
  showLabel = true,
  size = 'md',
  urgentThreshold = 60, // minutes
  criticalThreshold = 15, // minutes
  className = '',
  format = 'auto' // 'auto', 'full', 'compact', 'minimal'
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const difference = end - now;

      if (difference <= 0) {
        setTimeLeft(0);
        setIsActive(false);
        onComplete?.();
        return 0;
      }

      setTimeLeft(difference);
      return difference;
    };

    // Calculate initial time
    calculateTimeLeft();

    const interval = setInterval(() => {
      calculateTimeLeft();
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, onComplete]);

  const timeUnits = useMemo(() => {
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  }, [timeLeft]);

  const totalMinutesLeft = useMemo(() => {
    return Math.floor(timeLeft / (1000 * 60));
  }, [timeLeft]);

  const urgencyLevel = useMemo(() => {
    if (totalMinutesLeft <= criticalThreshold) return 'critical';
    if (totalMinutesLeft <= urgentThreshold) return 'urgent';
    return 'normal';
  }, [totalMinutesLeft, criticalThreshold, urgentThreshold]);

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'text-sm',
          icon: 'h-4 w-4',
          number: 'text-lg font-bold',
          unit: 'text-xs'
        };
      case 'md':
        return {
          container: 'text-base',
          icon: 'h-5 w-5',
          number: 'text-xl font-bold',
          unit: 'text-sm'
        };
      case 'lg':
        return {
          container: 'text-lg',
          icon: 'h-6 w-6',
          number: 'text-2xl font-bold',
          unit: 'text-base'
        };
      default:
        return {
          container: 'text-base',
          icon: 'h-5 w-5',
          number: 'text-xl font-bold',
          unit: 'text-sm'
        };
    }
  };

  const getUrgencyStyles = () => {
    switch (urgencyLevel) {
      case 'critical':
        return {
          container: 'bg-red-500 text-white shadow-red-500/50',
          text: 'text-white',
          glow: 'shadow-xl',
          pulse: true
        };
      case 'urgent':
        return {
          container: 'bg-orange-500 text-white shadow-orange-500/30',
          text: 'text-white',
          glow: 'shadow-lg',
          pulse: false
        };
      default:
        return {
          container: 'bg-blue-500 text-white shadow-blue-500/20',
          text: 'text-white',
          glow: 'shadow-md',
          pulse: false
        };
    }
  };

  const formatTime = () => {
    const { days, hours, minutes, seconds } = timeUnits;

    if (format === 'minimal') {
      if (days > 0) return `${days}d`;
      if (hours > 0) return `${hours}h`;
      if (minutes > 0) return `${minutes}m`;
      return `${seconds}s`;
    }

    if (format === 'compact') {
      if (days > 0) return `${days}d ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    if (format === 'full') {
      const parts = [];
      if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
      if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
      if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
      if (parts.length === 0 && seconds > 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
      return parts.slice(0, 2).join(' ');
    }

    // Auto format
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const renderSegmented = () => {
    const { days, hours, minutes, seconds } = timeUnits;
    const sizeConfig = getSizeConfig();
    const segments = [];

    if (days > 0) {
      segments.push({ value: days, unit: 'day', shortUnit: 'd' });
    }
    if (hours > 0 || days > 0) {
      segments.push({ value: hours, unit: 'hour', shortUnit: 'h' });
    }
    if (minutes > 0 || hours > 0 || days > 0) {
      segments.push({ value: minutes, unit: 'min', shortUnit: 'm' });
    }
    if (segments.length === 0) {
      segments.push({ value: seconds, unit: 'sec', shortUnit: 's' });
    }

    return (
      <div className="flex items-center space-x-2">
        {segments.slice(0, 3).map((segment, index) => (
          <motion.div
            key={segment.unit}
            animate={urgencyLevel === 'critical' ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity, delay: index * 0.1 }}
            className="flex flex-col items-center"
          >
            <div className={`${sizeConfig.number} tabular-nums`}>
              {segment.value.toString().padStart(2, '0')}
            </div>
            <div className={`${sizeConfig.unit} opacity-80`}>
              {format === 'minimal' ? segment.shortUnit : segment.unit}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  if (!isActive && timeLeft <= 0) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showIcon && <ClockIcon className={getSizeConfig().icon + ' text-gray-400'} />}
        <span className="text-gray-500 font-medium">Expired</span>
      </div>
    );
  }

  const sizeConfig = getSizeConfig();
  const urgencyStyles = getUrgencyStyles();

  return (
    <motion.div
      animate={urgencyStyles.pulse ? {
        scale: [1, 1.05, 1],
        boxShadow: [
          `0 0 0px rgba(239, 68, 68, 0.5)`,
          `0 0 20px rgba(239, 68, 68, 0.8)`,
          `0 0 0px rgba(239, 68, 68, 0.5)`
        ]
      } : {}}
      transition={urgencyStyles.pulse ? {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      } : {}}
      className={`
        inline-flex items-center space-x-2 px-3 py-2 rounded-lg
        ${urgencyStyles.container} ${urgencyStyles.glow}
        ${sizeConfig.container} ${className}
      `}
    >
      {showIcon && (
        <motion.div
          animate={urgencyLevel === 'critical' ? { rotate: [0, 10, -10, 0] } : {}}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          <ClockIcon className={`${sizeConfig.icon} ${urgencyStyles.text}`} />
        </motion.div>
      )}

      {showLabel && format !== 'segmented' && (
        <div className={urgencyStyles.text}>
          {format === 'segmented' ? renderSegmented() : (
            <span className="font-medium tabular-nums">
              {formatTime()}
            </span>
          )}
        </div>
      )}

      {format === 'segmented' && renderSegmented()}

      {/* Urgency indicator */}
      {urgencyLevel === 'critical' && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="w-2 h-2 bg-white rounded-full"
        />
      )}
    </motion.div>
  );
};

export default CountdownTimer;