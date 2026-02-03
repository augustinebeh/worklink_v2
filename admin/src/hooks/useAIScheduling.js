import { useState, useCallback } from 'react';

export const useAIScheduling = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const findOptimalSlot = useCallback(async (candidatePreferences, constraints = {}) => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch('/api/v1/interview-scheduling/ai/find-optimal-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidatePreferences,
          constraints,
          timezone: 'Asia/Singapore'
        })
      });

      if (!response.ok) throw new Error('Failed to find optimal slot');
      const result = await response.json();

      return result.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const scheduleInterviewByAI = useCallback(async (candidateData, slotPreferences) => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch('/api/v1/interview-scheduling/ai/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateData,
          slotPreferences,
          timezone: 'Asia/Singapore'
        })
      });

      if (!response.ok) throw new Error('Failed to schedule interview');
      const result = await response.json();

      return result.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const getConflictResolutions = useCallback(async (conflictData) => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch('/api/v1/interview-scheduling/ai/resolve-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conflictData)
      });

      if (!response.ok) throw new Error('Failed to get conflict resolutions');
      const result = await response.json();

      return result.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const sendAutomaticNotifications = useCallback(async (interviewData, notificationType) => {
    try {
      const response = await fetch('/api/v1/interview-scheduling/ai/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewData,
          notificationType,
          timezone: 'Asia/Singapore'
        })
      });

      if (!response.ok) throw new Error('Failed to send notifications');
      const result = await response.json();

      return result.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    isProcessing,
    error,
    findOptimalSlot,
    scheduleInterviewByAI,
    getConflictResolutions,
    sendAutomaticNotifications
  };
};