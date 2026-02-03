/**
 * FOMO Notification Component
 *
 * Displays FOMO-based notifications with urgency styling, social proof elements,
 * and compelling call-to-action buttons. Supports different urgency levels and types.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  UserGroupIcon,
  FireIcon,
  TrophyIcon,
  BoltIcon
} from '@heroicons/react/24/solid';

const FOMONotification = ({
  notification,
  onAction,
  onDismiss,
  autoHide = false,
  hideDelay = 8000
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss?.(notification.id), 300);
      }, hideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, hideDelay, onDismiss, notification.id]);

  useEffect(() => {
    if (notification.expiresAt) {
      const updateTimer = () => {
        const now = new Date();
        const expires = new Date(notification.expiresAt);
        const diff = expires - now;

        if (diff <= 0) {
          setTimeLeft(null);
          setIsVisible(false);
          return;
        }

        if (diff < 60 * 60 * 1000) { // Less than 1 hour
          const minutes = Math.floor(diff / (60 * 1000));
          setTimeLeft(`${minutes}m`);
        } else {
          const hours = Math.floor(diff / (60 * 60 * 1000));
          setTimeLeft(`${hours}h`);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [notification.expiresAt]);

  const getIcon = () => {
    switch (notification.type) {
      case 'job_urgency':
        return <BoltIcon className="h-5 w-5" />;
      case 'peer_activity':
        return <UserGroupIcon className="h-5 w-5" />;
      case 'tier_competition':
        return <TrophyIcon className="h-5 w-5" />;
      case 'streak_protection':
        return <FireIcon className="h-5 w-5" />;
      case 'time_limited':
        return <ClockIcon className="h-5 w-5" />;
      case 'competitive_pressure':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      default:
        return <BoltIcon className="h-5 w-5" />;
    }
  };

  const getUrgencyStyles = () => {
    const urgencyLevel = notification.urgency || 0.5;

    if (urgencyLevel >= 0.8) {
      return {
        container: 'bg-gradient-to-r from-red-500 to-pink-500 shadow-red-200',
        text: 'text-white',
        accent: 'bg-white/20',
        border: 'border-red-300',
        glow: 'shadow-2xl shadow-red-500/50'
      };
    } else if (urgencyLevel >= 0.6) {
      return {
        container: 'bg-gradient-to-r from-orange-500 to-red-500 shadow-orange-200',
        text: 'text-white',
        accent: 'bg-white/20',
        border: 'border-orange-300',
        glow: 'shadow-xl shadow-orange-500/30'
      };
    } else if (urgencyLevel >= 0.4) {
      return {
        container: 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-yellow-200',
        text: 'text-white',
        accent: 'bg-white/20',
        border: 'border-yellow-300',
        glow: 'shadow-lg shadow-yellow-500/20'
      };
    } else {
      return {
        container: 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-blue-200',
        text: 'text-white',
        accent: 'bg-white/20',
        border: 'border-blue-300',
        glow: 'shadow-lg shadow-blue-500/20'
      };
    }
  };

  const styles = getUrgencyStyles();

  const handleAction = () => {
    onAction?.(notification.action, notification);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(notification.id), 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", duration: 0.5 }}
          className={`
            relative overflow-hidden rounded-xl p-4 m-3
            ${styles.container} ${styles.glow}
            border ${styles.border}
            backdrop-blur-sm
          `}
        >
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{
                x: [0, 100, 0],
                y: [0, -50, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute -top-4 -left-4 w-8 h-8 bg-white/10 rounded-full blur-sm"
            />
            <motion.div
              animate={{
                x: [0, -80, 0],
                y: [0, 60, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute -bottom-4 -right-4 w-6 h-6 bg-white/10 rounded-full blur-sm"
            />
          </div>

          {/* Header */}
          <div className="relative flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-lg ${styles.accent}`}>
                {getIcon()}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`font-semibold text-sm uppercase tracking-wide ${styles.text}`}>
                    {notification.type.replace('_', ' ')}
                  </span>
                  {timeLeft && (
                    <motion.span
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className={`px-2 py-1 rounded-full text-xs font-bold ${styles.accent} ${styles.text}`}
                    >
                      {timeLeft} left
                    </motion.span>
                  )}
                </div>
                {notification.urgency >= 0.8 && (
                  <motion.div
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="flex items-center space-x-1 mt-1"
                  >
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                    <span className="text-xs text-white/90 uppercase tracking-wider font-medium">
                      URGENT
                    </span>
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                  </motion.div>
                )}
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Message */}
          <div className="relative mb-4">
            <p className={`${styles.text} text-sm leading-relaxed`}>
              {notification.message}
            </p>

            {/* Social proof indicator */}
            {notification.socialProof > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center space-x-1 mt-2"
              >
                <UserGroupIcon className="h-3 w-3 text-white/80" />
                <span className="text-xs text-white/80">
                  {Math.round(notification.socialProof * 100)}% peer activity level
                </span>
              </motion.div>
            )}

            {/* Scarcity indicator */}
            {notification.scarcity > 0.5 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center space-x-1 mt-1"
              >
                <ExclamationTriangleIcon className="h-3 w-3 text-yellow-200" />
                <span className="text-xs text-yellow-200">
                  Limited availability - Act fast!
                </span>
              </motion.div>
            )}
          </div>

          {/* Action button */}
          {notification.action && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAction}
              className={`
                w-full py-3 px-4 rounded-lg font-semibold text-sm
                bg-white text-gray-900 hover:bg-gray-100
                transition-all duration-200
                transform hover:shadow-lg
                flex items-center justify-center space-x-2
              `}
            >
              <span>
                {notification.action.type === 'view_job' && 'View Job'}
                {notification.action.type === 'browse_jobs' && 'Browse Jobs'}
                {notification.action.type === 'quick_checkin' && 'Check In Now'}
                {!['view_job', 'browse_jobs', 'quick_checkin'].includes(notification.action.type) && 'Take Action'}
              </span>
              <BoltIcon className="h-4 w-4" />
            </motion.button>
          )}

          {/* Progress bar for time-sensitive notifications */}
          {notification.expiresAt && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{
                  duration: (new Date(notification.expiresAt) - new Date()) / 1000,
                  ease: "linear"
                }}
                className="h-full bg-white"
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FOMONotification;