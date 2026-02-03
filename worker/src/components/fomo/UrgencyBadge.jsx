/**
 * Urgency Badge Component
 *
 * Displays urgency indicators for jobs and opportunities with animated
 * visual cues and different urgency levels.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  FireIcon,
  ClockIcon,
  BoltIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';

const UrgencyBadge = ({
  urgencyLevel = 'medium',
  urgencyScore = 0.5,
  showIcon = true,
  showText = true,
  size = 'sm',
  animated = true,
  className = ''
}) => {
  const getUrgencyConfig = () => {
    const score = typeof urgencyScore === 'number' ? urgencyScore : 0.5;

    if (score >= 0.9 || urgencyLevel === 'critical') {
      return {
        level: 'critical',
        icon: FireIcon,
        text: 'CRITICAL',
        shortText: 'URGENT',
        colors: 'bg-red-600 text-white border-red-700',
        glowColor: 'shadow-red-500/50',
        pulseColor: 'bg-red-500'
      };
    } else if (score >= 0.7 || urgencyLevel === 'high') {
      return {
        level: 'high',
        icon: ExclamationTriangleIcon,
        text: 'HIGH',
        shortText: 'HIGH',
        colors: 'bg-orange-500 text-white border-orange-600',
        glowColor: 'shadow-orange-500/40',
        pulseColor: 'bg-orange-400'
      };
    } else if (score >= 0.4 || urgencyLevel === 'medium') {
      return {
        level: 'medium',
        icon: BoltIcon,
        text: 'MEDIUM',
        shortText: 'MED',
        colors: 'bg-yellow-500 text-white border-yellow-600',
        glowColor: 'shadow-yellow-500/30',
        pulseColor: 'bg-yellow-400'
      };
    } else {
      return {
        level: 'low',
        icon: ClockIcon,
        text: 'LOW',
        shortText: 'LOW',
        colors: 'bg-blue-500 text-white border-blue-600',
        glowColor: 'shadow-blue-500/20',
        pulseColor: 'bg-blue-400'
      };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'xs':
        return {
          container: 'px-1.5 py-0.5 text-xs',
          icon: 'h-3 w-3',
          gap: 'space-x-1'
        };
      case 'sm':
        return {
          container: 'px-2 py-1 text-xs',
          icon: 'h-4 w-4',
          gap: 'space-x-1.5'
        };
      case 'md':
        return {
          container: 'px-3 py-1.5 text-sm',
          icon: 'h-5 w-5',
          gap: 'space-x-2'
        };
      case 'lg':
        return {
          container: 'px-4 py-2 text-base',
          icon: 'h-6 w-6',
          gap: 'space-x-2'
        };
      default:
        return {
          container: 'px-2 py-1 text-xs',
          icon: 'h-4 w-4',
          gap: 'space-x-1.5'
        };
    }
  };

  const urgencyConfig = getUrgencyConfig();
  const sizeConfig = getSizeConfig();
  const IconComponent = urgencyConfig.icon;

  const baseClasses = `
    inline-flex items-center justify-center
    ${sizeConfig.container} ${sizeConfig.gap}
    rounded-full font-bold uppercase tracking-wider
    border-2 transition-all duration-200
    ${urgencyConfig.colors}
  `;

  const animationProps = animated ? {
    animate: urgencyConfig.level === 'critical' ? {
      scale: [1, 1.1, 1],
      boxShadow: [
        `0 0 10px ${urgencyConfig.glowColor}`,
        `0 0 20px ${urgencyConfig.glowColor}`,
        `0 0 10px ${urgencyConfig.glowColor}`
      ]
    } : undefined,
    transition: urgencyConfig.level === 'critical' ? {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    } : undefined,
    whileHover: { scale: 1.05 }
  } : {};

  const textToShow = showText ? (size === 'xs' ? urgencyConfig.shortText : urgencyConfig.text) : null;

  return (
    <div className={`relative ${className}`}>
      {/* Pulsing background for critical urgency */}
      {animated && urgencyConfig.level === 'critical' && (
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.5, 0, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`
            absolute inset-0 rounded-full
            ${urgencyConfig.pulseColor}
          `}
        />
      )}

      <motion.div
        {...animationProps}
        className={`${baseClasses} relative z-10`}
        style={{
          boxShadow: urgencyConfig.level === 'critical' ? `0 0 15px ${urgencyConfig.glowColor}` : undefined
        }}
      >
        {showIcon && <IconComponent className={sizeConfig.icon} />}
        {textToShow && <span>{textToShow}</span>}

        {/* Additional urgent indicator */}
        {urgencyConfig.level === 'critical' && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1 -right-1"
          >
            <div className="w-2 h-2 bg-white rounded-full" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

// Preset urgency badges for common use cases
export const CriticalUrgencyBadge = (props) => (
  <UrgencyBadge urgencyLevel="critical" {...props} />
);

export const HighUrgencyBadge = (props) => (
  <UrgencyBadge urgencyLevel="high" {...props} />
);

export const MediumUrgencyBadge = (props) => (
  <UrgencyBadge urgencyLevel="medium" {...props} />
);

export const LowUrgencyBadge = (props) => (
  <UrgencyBadge urgencyLevel="low" {...props} />
);

export default UrgencyBadge;