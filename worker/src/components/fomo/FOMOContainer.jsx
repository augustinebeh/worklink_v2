/**
 * FOMO Container Component
 *
 * Main container that displays and manages all FOMO-related components
 * including notifications, urgency badges, countdown timers, and social proof indicators.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFOMO } from './FOMOProvider';
import FOMONotification from './FOMONotification';
import UrgencyBadge from './UrgencyBadge';
import CountdownTimer from './CountdownTimer';
import SocialProofIndicator from './SocialProofIndicator';
import StreakProtectionAlert from './StreakProtectionAlert';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/solid';

const FOMOContainer = ({
  position = 'top-right',
  maxVisible = 3,
  autoHide = true,
  showToggle = true,
  className = ''
}) => {
  const {
    triggers,
    urgencyAlerts,
    streakRisk,
    socialProof,
    hasCriticalAlerts,
    dismissFOMOEvent,
    handleFOMOAction,
    acceptStreakProtection,
    trackActivity
  } = useFOMO();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [notificationQueue, setNotificationQueue] = useState([]);

  // Manage notification queue
  useEffect(() => {
    const allNotifications = [
      ...triggers.map(t => ({ ...t, source: 'trigger' })),
      ...urgencyAlerts.map(a => ({ ...a, source: 'urgency' })),
      ...(streakRisk ? [{ ...streakRisk, source: 'streak', type: 'streak_protection' }] : [])
    ];

    // Sort by urgency and timestamp
    const sortedNotifications = allNotifications.sort((a, b) => {
      const urgencyA = a.urgency || a.riskScore || 0;
      const urgencyB = b.urgency || b.riskScore || 0;
      return urgencyB - urgencyA;
    });

    setNotificationQueue(sortedNotifications.slice(0, maxVisible * 2));
  }, [triggers, urgencyAlerts, streakRisk, maxVisible]);

  // Auto-expand for critical alerts
  useEffect(() => {
    if (hasCriticalAlerts() && !isMinimized) {
      setIsExpanded(true);
    }
  }, [hasCriticalAlerts, isMinimized]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  const handleNotificationAction = (action, notification) => {
    handleFOMOAction(action, notification);
    trackActivity('fomo_notification_action', {
      actionType: action.type,
      notificationType: notification.type,
      notificationId: notification.id
    });
  };

  const handleNotificationDismiss = (notificationId) => {
    dismissFOMOEvent(notificationId);
    trackActivity('fomo_notification_dismissed', { notificationId });
  };

  const handleStreakProtection = (protectionOffer) => {
    if (protectionOffer?.id) {
      acceptStreakProtection(protectionOffer.id);
      trackActivity('streak_protection_accepted', {
        protectionId: protectionOffer.id,
        streakDays: streakRisk?.streakDays
      });
    }
  };

  const handleQuickCheckIn = () => {
    trackActivity('quick_checkin', { source: 'streak_protection' });
    // Trigger check-in logic
  };

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
    if (isMinimized) {
      setIsExpanded(false);
    }
  };

  const toggleExpanded = () => {
    if (!isMinimized) {
      setIsExpanded(!isExpanded);
    }
  };

  const activeNotifications = notificationQueue.slice(0, isExpanded ? maxVisible * 2 : maxVisible);

  if (isMinimized) {
    return (
      <div className={`fixed ${getPositionClasses()} z-50 ${className}`}>
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleMinimized}
          className={`
            p-3 rounded-full shadow-lg backdrop-blur-sm border
            ${hasCriticalAlerts()
              ? 'bg-red-500 text-white border-red-400 shadow-red-500/30'
              : 'bg-blue-500 text-white border-blue-400 shadow-blue-500/20'
            }
          `}
        >
          <BellIcon className="h-5 w-5" />
          {notificationQueue.length > 0 && (
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute -top-1 -right-1 h-3 w-3 bg-red-400 rounded-full"
            />
          )}
        </motion.button>
      </div>
    );
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50 max-w-sm ${className}`}>
      {showToggle && (
        <div className="flex justify-end mb-2">
          <div className="flex items-center space-x-2">
            {notificationQueue.length > maxVisible && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleExpanded}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                {isExpanded ? 'Show Less' : `+${notificationQueue.length - maxVisible} more`}
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleMinimized}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {activeNotifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              layout
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                zIndex: activeNotifications.length - index
              }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: "spring", duration: 0.5, delay: index * 0.1 }}
            >
              {notification.source === 'streak' ? (
                <StreakProtectionAlert
                  streakData={notification}
                  onProtect={handleStreakProtection}
                  onCheckIn={handleQuickCheckIn}
                  onDismiss={() => handleNotificationDismiss(notification.id)}
                />
              ) : (
                <FOMONotification
                  notification={notification}
                  onAction={handleNotificationAction}
                  onDismiss={handleNotificationDismiss}
                  autoHide={autoHide && notification.urgency < 0.7}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Social Proof Indicators */}
        <AnimatePresence>
          {Object.entries(socialProof).map(([key, proof]) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex justify-end"
            >
              <SocialProofIndicator
                type={proof.socialProofType || 'viewers'}
                count={proof.count || 0}
                timeWindow={proof.timeWindow}
                context={proof.context}
                style="subtle"
                size="sm"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Summary indicator when minimizing */}
      {notificationQueue.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 flex justify-center"
        >
          <div className={`
            px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm
            ${hasCriticalAlerts()
              ? 'bg-red-500/90 text-white'
              : 'bg-blue-500/90 text-white'
            }
          `}>
            {notificationQueue.length} active alert{notificationQueue.length !== 1 ? 's' : ''}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default FOMOContainer;