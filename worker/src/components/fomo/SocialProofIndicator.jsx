/**
 * Social Proof Indicator Component
 *
 * Displays real-time social proof information like "X people viewing this job"
 * or "Y people applied in the last hour" to create FOMO through social validation.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserGroupIcon,
  EyeIcon,
  TrophyIcon,
  BoltIcon,
  HeartIcon,
  StarIcon
} from '@heroicons/react/24/solid';

const SocialProofIndicator = ({
  type = 'viewers', // 'viewers', 'applicants', 'achievements', 'ratings', 'activity'
  count = 0,
  timeWindow = '',
  context = '',
  animated = true,
  showIcon = true,
  size = 'md',
  style = 'subtle', // 'subtle', 'prominent', 'urgent'
  className = ''
}) => {
  const [displayCount, setDisplayCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (count > 0) {
      setIsVisible(true);
      // Animate count up
      const duration = 1000;
      const steps = 20;
      const increment = count / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= count) {
          setDisplayCount(count);
          clearInterval(timer);
        } else {
          setDisplayCount(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    } else {
      setIsVisible(false);
    }
  }, [count]);

  const getTypeConfig = () => {
    switch (type) {
      case 'viewers':
        return {
          icon: EyeIcon,
          label: 'viewing',
          color: 'blue',
          urgencyMultiplier: 1.2
        };
      case 'applicants':
        return {
          icon: UserGroupIcon,
          label: 'applied',
          color: 'green',
          urgencyMultiplier: 1.5
        };
      case 'achievements':
        return {
          icon: TrophyIcon,
          label: 'achieved',
          color: 'yellow',
          urgencyMultiplier: 1.0
        };
      case 'ratings':
        return {
          icon: StarIcon,
          label: 'rated',
          color: 'purple',
          urgencyMultiplier: 1.0
        };
      case 'activity':
        return {
          icon: BoltIcon,
          label: 'active',
          color: 'orange',
          urgencyMultiplier: 1.3
        };
      default:
        return {
          icon: UserGroupIcon,
          label: 'people',
          color: 'gray',
          urgencyMultiplier: 1.0
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1 text-xs',
          icon: 'h-3 w-3',
          text: 'text-xs'
        };
      case 'md':
        return {
          container: 'px-3 py-1.5 text-sm',
          icon: 'h-4 w-4',
          text: 'text-sm'
        };
      case 'lg':
        return {
          container: 'px-4 py-2 text-base',
          icon: 'h-5 w-5',
          text: 'text-base'
        };
      default:
        return {
          container: 'px-3 py-1.5 text-sm',
          icon: 'h-4 w-4',
          text: 'text-sm'
        };
    }
  };

  const getStyleConfig = () => {
    const typeConfig = getTypeConfig();
    const urgencyLevel = Math.min(count * typeConfig.urgencyMultiplier / 10, 1);

    switch (style) {
      case 'prominent':
        return {
          container: `bg-${typeConfig.color}-500 text-white shadow-${typeConfig.color}-500/30`,
          text: 'text-white font-semibold',
          border: `border-${typeConfig.color}-400`,
          glow: 'shadow-lg'
        };
      case 'urgent':
        return {
          container: urgencyLevel > 0.7 ?
            'bg-red-500 text-white shadow-red-500/50' :
            `bg-orange-500 text-white shadow-orange-500/30`,
          text: 'text-white font-bold',
          border: 'border-red-400',
          glow: 'shadow-xl'
        };
      default: // subtle
        return {
          container: `bg-gray-100 text-gray-700 hover:bg-${typeConfig.color}-50`,
          text: 'text-gray-600 font-medium',
          border: 'border-gray-200',
          glow: ''
        };
    }
  };

  const generateMessage = () => {
    const typeConfig = getTypeConfig();
    const contextText = context ? ` ${context}` : '';
    const timeText = timeWindow ? ` in the last ${timeWindow}` : '';

    if (displayCount === 1) {
      return `1 person ${typeConfig.label}${contextText}${timeText}`;
    }

    return `${displayCount} people ${typeConfig.label}${contextText}${timeText}`;
  };

  const typeConfig = getTypeConfig();
  const sizeConfig = getSizeConfig();
  const styleConfig = getStyleConfig();
  const IconComponent = typeConfig.icon;

  if (!isVisible || displayCount === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -10 }}
        transition={{ type: "spring", duration: 0.5 }}
        className={`
          inline-flex items-center space-x-2 rounded-full border
          ${sizeConfig.container} ${styleConfig.container}
          ${styleConfig.border} ${styleConfig.glow}
          transition-all duration-200 ${className}
        `}
      >
        {/* Animated background for urgent style */}
        {animated && style === 'urgent' && displayCount > 5 && (
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <motion.div
              animate={{
                x: [0, 100, -100, 0],
                opacity: [0.1, 0.3, 0.1]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
            />
          </div>
        )}

        <div className="relative flex items-center space-x-2">
          {showIcon && (
            <motion.div
              animate={animated && displayCount > 10 ? {
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0]
              } : {}}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <IconComponent className={`${sizeConfig.icon} ${styleConfig.text}`} />
            </motion.div>
          )}

          <span className={`${sizeConfig.text} ${styleConfig.text}`}>
            {generateMessage()}
          </span>

          {/* Activity pulse indicator for high activity */}
          {animated && displayCount > 15 && (
            <motion.div
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className={`w-2 h-2 rounded-full ${
                style === 'urgent' ? 'bg-white' : `bg-${typeConfig.color}-500`
              }`}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Preset components for common use cases
export const ViewersIndicator = ({ count, ...props }) => (
  <SocialProofIndicator
    type="viewers"
    count={count}
    context="this job"
    {...props}
  />
);

export const ApplicantsIndicator = ({ count, timeWindow = "hour", ...props }) => (
  <SocialProofIndicator
    type="applicants"
    count={count}
    timeWindow={timeWindow}
    style={count > 5 ? "urgent" : "prominent"}
    {...props}
  />
);

export const ActivityIndicator = ({ count, location, ...props }) => (
  <SocialProofIndicator
    type="activity"
    count={count}
    context={location ? `near ${location}` : "in your area"}
    timeWindow="hour"
    {...props}
  />
);

export const AchievementsIndicator = ({ count, ...props }) => (
  <SocialProofIndicator
    type="achievements"
    count={count}
    context="today"
    style="prominent"
    {...props}
  />
);

// Animated counter for numbers that change frequently
export const LiveCounter = ({ value, label, icon: Icon, ...props }) => {
  const [animatedValue, setAnimatedValue] = useState(value);

  useEffect(() => {
    const duration = 800;
    const steps = 15;
    const start = animatedValue;
    const end = value;
    const stepValue = (end - start) / steps;

    let current = start;
    const timer = setInterval(() => {
      current += stepValue;
      if ((stepValue > 0 && current >= end) || (stepValue < 0 && current <= end)) {
        setAnimatedValue(end);
        clearInterval(timer);
      } else {
        setAnimatedValue(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, animatedValue]);

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg"
    >
      {Icon && <Icon className="h-4 w-4 text-blue-600" />}
      <motion.span
        key={animatedValue}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="font-semibold text-blue-900 tabular-nums"
      >
        {animatedValue.toLocaleString()}
      </motion.span>
      <span className="text-blue-700 text-sm">{label}</span>
    </motion.div>
  );
};

export default SocialProofIndicator;