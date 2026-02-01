/**
 * Push Notifications Hook
 * Manages push notification subscription and permission states
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 'Notification' in window &&
                      'serviceWorker' in navigator &&
                      'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check subscription status when user changes
  useEffect(() => {
    if (!isSupported || !user?.id) return;

    async function checkSubscription() {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error('Error checking push subscription:', err);
      }
    }

    checkSubscription();
  }, [isSupported, user?.id]);

  // Request permission and subscribe
  const subscribe = useCallback(async () => {
    if (!isSupported || !user?.id) {
      setError('Push notifications not supported or user not logged in');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setError('Notification permission denied');
        setIsLoading(false);
        return false;
      }

      // Get VAPID public key from server
      const keyResponse = await fetch('/api/v1/notifications/vapid-public-key');
      const keyData = await keyResponse.json();

      if (!keyData.success) {
        setError(keyData.error || 'Failed to get server configuration');
        setIsLoading(false);
        return false;
      }

      // Subscribe to push
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
      });

      // Send subscription to server
      const subscribeResponse = await fetch('/api/v1/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: user.id,
          subscription: subscription.toJSON()
        })
      });

      const subscribeData = await subscribeResponse.json();

      if (subscribeData.success) {
        setIsSubscribed(true);
        setIsLoading(false);
        return true;
      } else {
        setError(subscribeData.error || 'Failed to register subscription');
        setIsLoading(false);
        return false;
      }
    } catch (err) {
      console.error('Push subscription error:', err);
      setError(err.message || 'Failed to subscribe to notifications');
      setIsLoading(false);
      return false;
    }
  }, [isSupported, user?.id]);

  // Unsubscribe
  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user?.id) return false;

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Notify server
      await fetch('/api/v1/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: user.id })
      });

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Push unsubscribe error:', err);
      setError(err.message || 'Failed to unsubscribe');
      setIsLoading(false);
      return false;
    }
  }, [isSupported, user?.id]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe
  };
}

export default usePushNotifications;
