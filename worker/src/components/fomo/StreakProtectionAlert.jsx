/**
 * Streak Protection Alert Component
 *
 * Displays FOMO-enhanced streak protection alerts with urgency styling,
 * protection options, and compelling motivational messaging.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FireIcon,
  ShieldCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  HeartIcon,
  TrophyIcon
} from '@heroicons/react/24/solid';

const StreakProtectionAlert = ({
  streakData,
  onProtect,
  onCheckIn,
  onDismiss,
  className = ''
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (streakData?.hoursRemaining) {
      const totalMs = streakData.hoursRemaining * 60 * 60 * 1000;
      setTimeLeft(totalMs);

      const interval = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1000;
          return newTime <= 0 ? 0 : newTime;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [streakData?.hoursRemaining]);

  useEffect(() => {
    // Trigger entrance animation
    setShowAnimation(true);
  }, []);

  const formatTimeLeft = () => {
    if (timeLeft <= 0) return "EXPIRED";

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getRiskLevelConfig = () => {
    const riskLevel = streakData?.riskLevel || 'medium';
    const hoursLeft = timeLeft / (1000 * 60 * 60);

    switch (riskLevel) {
      case 'critical':
        return {
          bgColor: 'bg-gradient-to-r from-red-600 to-red-700',
          borderColor: 'border-red-500',
          textColor: 'text-white',
          glowColor: 'shadow-red-500/50',
          urgencyText: 'CRITICAL ALERT',
          icon: ExclamationTriangleIcon,
          pulse: true
        };
      case 'high':
        return {
          bgColor: 'bg-gradient-to-r from-orange-500 to-red-500',
          borderColor: 'border-orange-400',
          textColor: 'text-white',
          glowColor: 'shadow-orange-500/40',
          urgencyText: 'HIGH RISK',
          icon: FireIcon,
          pulse: hoursLeft <= 2
        };
      default:
        return {
          bgColor: 'bg-gradient-to-r from-yellow-500 to-orange-500',
          borderColor: 'border-yellow-400',
          textColor: 'text-white',
          glowColor: 'shadow-yellow-500/30',
          urgencyText: 'STREAK ALERT',
          icon: ClockIcon,
          pulse: false
        };
    }
  };

  const getStreakValue = () => {
    const days = streakData?.streakDays || 0;
    if (days >= 100) return "🔥 LEGENDARY";
    if (days >= 50) return "💎 EPIC";
    if (days >= 30) return "⭐ RARE";
    if (days >= 14) return "🌟 SOLID";
    if (days >= 7) return "💪 STRONG";
    return "🔹 GROWING";
  };

  const config = getRiskLevelConfig();
  const IconComponent = config.icon;

  const handleProtectionAccept = () => {
    onProtect?.(streakData?.protectionOffer);
  };

  const handleQuickCheckIn = () => {
    onCheckIn?.();
  };

  const handleDismissAlert = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(), 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{
            opacity: 1,
            scale: showAnimation ? [0.9, 1.05, 1] : 1,
            y: 0,
            boxShadow: config.pulse ? [
              `0 0 20px ${config.glowColor}`,
              `0 0 40px ${config.glowColor}`,
              `0 0 20px ${config.glowColor}`
            ] : `0 0 25px ${config.glowColor}`
          }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{
            duration: 0.6,
            ease: "easeOut",
            boxShadow: config.pulse ? { duration: 2, repeat: Infinity } : {}
          }}
          className={`
            relative overflow-hidden rounded-xl border-2
            ${config.bgColor} ${config.borderColor} ${config.glowColor}
            shadow-xl backdrop-blur-sm ${className}
          `}
        >
          {/* Animated background pattern */}
          <div className="absolute inset-0 overflow-hidden">
            {config.pulse && (
              <>
                <motion.div
                  animate={{
                    x: [0, 200, 0],
                    y: [0, -100, 0],
                    opacity: [0.1, 0.3, 0.1]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute -top-10 -left-10 w-20 h-20 bg-white/20 rounded-full blur-xl"
                />
                <motion.div
                  animate={{
                    x: [0, -150, 0],
                    y: [0, 80, 0],
                    opacity: [0.1, 0.2, 0.1]
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute -bottom-10 -right-10 w-16 h-16 bg-white/20 rounded-full blur-xl"
                />
              </>
            )}
          </div>

          <div className="relative p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <motion.div
                  animate={config.pulse ? {
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="p-2 bg-white/20 rounded-lg"
                >
                  <IconComponent className="h-6 w-6 text-white" />
                </motion.div>
                <div>
                  <motion.h3
                    animate={config.pulse ? { opacity: [1, 0.8, 1] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className={`font-bold text-lg ${config.textColor}`}
                  >
                    {config.urgencyText}
                  </motion.h3>
                  <p className="text-white/90 text-sm">
                    Your streak is at risk!
                  </p>
                </div>
              </div>

              <button
                onClick={handleDismissAlert}
                className="text-white/60 hover:text-white transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Streak Information */}
            <div className="bg-white/10 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <FireIcon className="h-8 w-8 text-orange-300" />
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {streakData?.streakDays || 0} Days
                    </div>
                    <div className="text-sm text-white/80">
                      {getStreakValue()}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className={`text-lg font-bold ${
                      timeLeft <= 60 * 60 * 1000 ? 'text-red-200' : 'text-white'
                    }`}
                  >
                    {formatTimeLeft()}
                  </motion.div>
                  <div className="text-xs text-white/70">
                    remaining
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-white/80 text-sm">
                <TrophyIcon className="h-4 w-4" />
                <span>
                  Don't lose {streakData?.streakDays || 0} days of progress!
                </span>
              </div>
            </div>

            {/* Protection Options */}
            <div className="space-y-3">
              {streakData?.protectionOffer && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleProtectionAccept}
                  className="w-full p-4 bg-white text-gray-900 rounded-lg font-semibold
                           hover:bg-gray-100 transition-all duration-200
                           flex items-center justify-center space-x-2 shadow-lg"
                >
                  <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                  <span>Activate Streak Protection</span>
                  <span className="text-green-600 font-bold">FREE</span>
                </motion.button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleQuickCheckIn}
                  className="p-3 bg-white/20 text-white rounded-lg font-medium
                           hover:bg-white/30 transition-all duration-200
                           flex items-center justify-center space-x-2"
                >
                  <BoltIcon className="h-4 w-4" />
                  <span>Quick Check-In</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {/* Navigate to achievements */}}
                  className="p-3 bg-white/20 text-white rounded-lg font-medium
                           hover:bg-white/30 transition-all duration-200
                           flex items-center justify-center space-x-2"
                >
                  <HeartIcon className="h-4 w-4" />
                  <span>View Progress</span>
                </motion.button>
              </div>
            </div>

            {/* Social Proof */}
            {streakData?.socialProof && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-4 p-3 bg-black/20 rounded-lg text-center"
              >
                <p className="text-white/90 text-sm">
                  {streakData.socialProof}
                </p>
              </motion.div>
            )}

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{
                  duration: timeLeft / 1000,
                  ease: "linear"
                }}
                className="h-full bg-white/40"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StreakProtectionAlert;