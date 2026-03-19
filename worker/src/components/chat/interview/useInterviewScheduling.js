import { useState, useEffect } from 'react';

/**
 * Hook to manage interview scheduling state
 */
export function useInterviewScheduling(candidateId) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    if (!candidateId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/v1/interview-scheduling/candidate/${candidateId}/status`);
      const data = await response.json();

      if (data.success) {
        setStatus(data.data);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch interview status');
      }
    } catch (err) {
      setError('Failed to fetch interview status');
      console.error('Interview status fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async (days = 7) => {
    try {
      const response = await fetch(`/api/v1/interview-scheduling/slots/available?days=${days}&candidateId=${candidateId}`);
      const data = await response.json();

      if (data.success) {
        return data.data.slots || [];
      } else {
        throw new Error(data.message || 'Failed to fetch available slots');
      }
    } catch (err) {
      console.error('Available slots fetch error:', err);
      throw err;
    }
  };

  const scheduleInterview = async (date, time, notes = '') => {
    try {
      const response = await fetch(`/api/v1/interview-scheduling/candidate/${candidateId}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date, time, notes }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchStatus(); // Refresh status
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to schedule interview');
      }
    } catch (err) {
      console.error('Schedule interview error:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [candidateId]);

  return {
    status,
    loading,
    error,
    refetch: fetchStatus,
    fetchAvailableSlots,
    scheduleInterview,
  };
}
