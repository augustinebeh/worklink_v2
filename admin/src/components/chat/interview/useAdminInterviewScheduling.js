import { useState } from 'react';

/**
 * Hook to manage interview scheduling state for admin interface
 */
export function useAdminInterviewScheduling() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCandidateStatus = async (candidateId) => {
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
      // Interview status fetch error
    } finally {
      setLoading(false);
    }
  };

  const scheduleInterview = async (candidateId, date, time, notes = '') => {
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
        await fetchCandidateStatus(candidateId); // Refresh status
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to schedule interview');
      }
    } catch (err) {
      // Schedule interview error
      throw err;
    }
  };

  const updateInterviewStatus = async (interviewId, status, notes = '') => {
    try {
      const response = await fetch(`/api/v1/interview-scheduling/interview/${interviewId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          notes,
          completedAt: status === 'completed' ? new Date().toISOString() : undefined
        }),
      });

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to update interview status');
      }
    } catch (err) {
      // Update interview status error
      throw err;
    }
  };

  const rescheduleInterview = async (interviewId, date, time, reason = '') => {
    try {
      const response = await fetch(`/api/v1/interview-scheduling/interview/${interviewId}/reschedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date, time, reason }),
      });

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to reschedule interview');
      }
    } catch (err) {
      // Reschedule interview error
      throw err;
    }
  };

  const fetchAnalytics = async (days = 7) => {
    try {
      const response = await fetch(`/api/v1/interview-scheduling/analytics?days=${days}`);
      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to fetch analytics');
      }
    } catch (err) {
      // Fetch analytics error
      throw err;
    }
  };

  return {
    status,
    loading,
    error,
    fetchCandidateStatus,
    scheduleInterview,
    updateInterviewStatus,
    rescheduleInterview,
    fetchAnalytics,
  };
}
