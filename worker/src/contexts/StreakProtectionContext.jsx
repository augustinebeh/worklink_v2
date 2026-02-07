import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '../components/ui/Toast';
import logger from '../utils/logger';

const StreakProtectionContext = createContext();

export function useStreakProtection() {
  const context = useContext(StreakProtectionContext);
  if (!context) {
    throw new Error('useStreakProtection must be used within a StreakProtectionProvider');
  }
  return context;
}

export function StreakProtectionProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();

  const [streakStatus, setStreakStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch streak protection status
  const fetchStreakStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/v1/notifications/status/${user.id}`);
      const data = await response.json();

      if (data.success) {
        setStreakStatus(data.data);
      } else {
        console.error('Failed to fetch streak status:', data.error);
      }
    } catch (error) {
      console.error('Error fetching streak status:', error);
    }
  }, [user?.id]);

  // Initialize streak protection status
  useEffect(() => {
    if (user?.id) {
      fetchStreakStatus();

      // Check streak status every 30 minutes
      const interval = setInterval(fetchStreakStatus, 30 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user?.id, fetchStreakStatus]);

  // Protect streak using freeze token
  const protectStreak = useCallback(async () => {
    if (!user?.id || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/notifications/protect-streak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateId: user.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh streak status
        await fetchStreakStatus();

        // Show success notification
        toast.success(
          'Streak Protected! 🛡️',
          `Your ${streakStatus?.streak_days}-day streak is safe for 24 hours`
        );

        return data;
      } else {
        throw new Error(data.error || 'Failed to protect streak');
      }
    } catch (error) {
      console.error('Error protecting streak:', error);
      toast.error('Protection Failed', error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isLoading, streakStatus?.streak_days, fetchStreakStatus, toast]);

  // Recover broken streak using recovery token
  const recoverStreak = useCallback(async () => {
    if (!user?.id || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/notifications/recover-streak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateId: user.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh streak status
        await fetchStreakStatus();

        // Show success notification
        toast.success(
          'Streak Recovered! 🎉',
          `Your ${data.streakDays}-day streak is back!`
        );

        return data;
      } else {
        throw new Error(data.error || 'Failed to recover streak');
      }
    } catch (error) {
      console.error('Error recovering streak:', error);
      toast.error('Recovery Failed', error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isLoading, fetchStreakStatus, toast]);

  // Quick check-in to maintain streak
  const quickCheckin = useCallback(async () => {
    if (!user?.id || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/notifications/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateId: user.id,
          notificationType: 'streak_risk',
          action: 'checkin',
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh streak status
        await fetchStreakStatus();

        // Show success notification
        toast.success(
          'Checked In! ✅',
          'Your streak is maintained for another day'
        );

        return data;
      } else {
        throw new Error(data.error || 'Failed to check in');
      }
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Check-in Failed', error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isLoading, fetchStreakStatus, toast]);

  // Register for push notifications (enhanced)
  const registerPushNotifications = useCallback(async () => {
    if (!user?.id || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      // Get existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Get VAPID public key
        const vapidResponse = await fetch('/api/v1/notifications/vapid-public-key');
        const vapidData = await vapidResponse.json();

        if (!vapidData.success) {
          console.error('VAPID key not available');
          return false;
        }

        // Create new subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidData.publicKey,
        });
      }

      // Register enhanced subscription
      const response = await fetch('/api/v1/notifications/subscribe-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateId: user.id,
          subscription: subscription.toJSON(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        logger.log('✅ Enhanced push notifications registered');
        return true;
      } else {
        console.error('Failed to register enhanced push notifications:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Error registering enhanced push notifications:', error);
      return false;
    }
  }, [user?.id]);

  // Calculate streak urgency level
  const getStreakUrgency = useCallback(() => {
    if (!streakStatus) return 'none';

    if (streakStatus.streakBroken) return 'critical';
    if (streakStatus.streakAtRisk) return 'high';
    if (streakStatus.hours_since_checkin > 12) return 'medium';
    return 'none';
  }, [streakStatus]);

  // Get recommended action for current streak status
  const getRecommendedAction = useCallback(() => {
    if (!streakStatus) return null;

    if (streakStatus.streakBroken && streakStatus.canRecoverStreak) {
      return {
        type: 'recover',
        title: 'Recover Your Streak',
        description: 'Use a recovery token to restore your streak',
        urgency: 'critical',
      };
    }

    if (streakStatus.streakAtRisk) {
      if (streakStatus.canProtectStreak) {
        return {
          type: 'protect',
          title: 'Protect Your Streak',
          description: 'Use a freeze token or check in now',
          urgency: 'high',
        };
      } else {
        return {
          type: 'checkin',
          title: 'Check In Now',
          description: 'Maintain your streak by checking in',
          urgency: 'high',
        };
      }
    }

    return null;
  }, [streakStatus]);

  const contextValue = {
    // State
    streakStatus,
    isLoading,

    // Actions
    protectStreak,
    recoverStreak,
    quickCheckin,
    fetchStreakStatus,
    registerPushNotifications,

    // Helpers
    getStreakUrgency,
    getRecommendedAction,
  };

  return (
    <StreakProtectionContext.Provider value={contextValue}>
      {children}
    </StreakProtectionContext.Provider>
  );
}