/**
 * FOMONotificationManager
 *
 * Handles FOMO notification effects (sound, vibration) and
 * provides tracking hooks for FOMO activities.
 */

import { useCallback } from 'react';
import { useFOMO } from './FOMOProvider';
import logger from '../../utils/logger';

/**
 * Trigger notification effects (sound, vibration) for a FOMO event
 * @param {Object} event - The FOMO event
 * @param {Object} settings - FOMO settings (enableSounds, enableVibration)
 */
export function triggerNotificationEffects(event, settings) {
  if (!event) return;

  // Sound notification
  if (settings.enableSounds && event.urgency !== 'low') {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = event.urgency === 'critical' ? 0.8 : 0.5;
      audio.play().catch(() => {}); // Ignore if audio fails
    } catch (error) {
      logger.log('Audio notification failed:', error);
    }
  }

  // Vibration
  if (settings.enableVibration && 'vibrate' in navigator && event.urgency !== 'low') {
    const pattern = event.urgency === 'critical' ? [200, 100, 200] : [100];
    navigator.vibrate(pattern);
  }
}

/**
 * Hook for tracking FOMO activities - wraps common tracking patterns
 */
export const useFOMOTracking = () => {
  const { trackActivity, trackJobView } = useFOMO();

  const trackJobApplication = useCallback((jobId, metadata = {}) => {
    trackActivity('job_application', { jobId, ...metadata });
  }, [trackActivity]);

  const trackLevelUp = useCallback((newLevel, metadata = {}) => {
    trackActivity('level_up', { newLevel, ...metadata });
  }, [trackActivity]);

  const trackAchievementUnlock = useCallback((achievementId, metadata = {}) => {
    trackActivity('achievement_unlocked', { achievementId, ...metadata });
  }, [trackActivity]);

  const trackStreakMilestone = useCallback((streakDays, metadata = {}) => {
    trackActivity('streak_milestone', { streakDays, ...metadata });
  }, [trackActivity]);

  return {
    trackJobApplication,
    trackLevelUp,
    trackAchievementUnlock,
    trackStreakMilestone,
    trackJobView,
    trackActivity
  };
};

export default useFOMOTracking;
