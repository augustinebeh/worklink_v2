import { useState, useEffect, useRef } from 'react';
import { format, addDays, addHours, setHours, setMinutes } from 'date-fns';

// Mock data generator for frontend development
const generateMockAvailability = (startDate, endDate) => {
  const availability = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Generate availability for each day (9 AM to 6 PM)
    for (let hour = 9; hour < 18; hour++) {
      const slotDate = setMinutes(setHours(new Date(currentDate), hour), 0);
      availability.push({
        id: `avail-${format(slotDate, 'yyyy-MM-dd-HH-mm')}`,
        datetime: slotDate.toISOString(),
        is_available: Math.random() > 0.3, // 70% available
        duration_minutes: 60,
        buffer_minutes: 15,
        notes: Math.random() > 0.8 ? 'Limited availability' : null
      });
    }
    currentDate = addDays(currentDate, 1);
  }

  return availability;
};

const generateMockInterviews = (startDate, endDate) => {
  const interviews = [];
  const candidates = [
    'Sarah Johnson', 'Mike Chen', 'Emily Rodriguez', 'David Kim',
    'Anna Kowalski', 'James Wilson', 'Maria Garcia', 'Alex Thompson'
  ];
  const roles = [
    'Senior Frontend Developer', 'Backend Engineer', 'Full Stack Developer',
    'DevOps Engineer', 'Product Manager', 'UX Designer'
  ];

  // Generate some random interviews
  for (let i = 0; i < 8; i++) {
    const randomDays = Math.floor(Math.random() * 7) - 2; // -2 to +5 days from startDate
    const randomHour = 9 + Math.floor(Math.random() * 8); // 9 AM to 5 PM
    const interviewDate = addHours(addDays(startDate, randomDays), randomHour - 9);

    if (interviewDate >= startDate && interviewDate <= endDate) {
      interviews.push({
        id: `interview-${i + 1}`,
        candidate_name: candidates[Math.floor(Math.random() * candidates.length)],
        role: roles[Math.floor(Math.random() * roles.length)],
        scheduled_datetime: interviewDate.toISOString(),
        duration_minutes: 60,
        status: Math.random() > 0.8 ? 'rescheduled' : 'scheduled',
        interview_type: Math.random() > 0.5 ? 'technical' : 'behavioral',
        interviewer: 'Admin User',
        notes: Math.random() > 0.7 ? 'Follow-up interview' : null,
        candidate_email: `${candidates[Math.floor(Math.random() * candidates.length)].toLowerCase().replace(' ', '.')}@email.com`
      });
    }
  }

  return interviews;
};

export const useCalendarData = ({ startDate, endDate, timezone = 'Asia/Singapore' }) => {
  const [availability, setAvailability] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const wsRef = useRef(null);

  const fetchCalendarData = async (isRetry = false) => {
    try {
      setLoading(true);
      if (!isRetry) {
        setError(null);
        setRetryCount(0);
      }

      // Simulate API loading time
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate mock data for UI testing
      const mockAvailability = generateMockAvailability(startDate, endDate);
      const mockInterviews = generateMockInterviews(startDate, endDate);

      setAvailability(mockAvailability);
      setInterviews(mockInterviews);

      console.log('Frontend-only calendar data loaded:', {
        availability: mockAvailability.length,
        interviews: mockInterviews.length,
        dateRange: `${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`
      });

    } catch (err) {
      console.error('Calendar data fetch error:', err);
      setError({
        message: err.message,
        canRetry: retryCount < 3,
        retryCount,
        timestamp: new Date().toISOString()
      });
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const retryFetch = () => {
    if (retryCount < 3) {
      fetchCalendarData(true);
    }
  };

  const updateAvailability = async (slotData) => {
    try {
      setLoading(true);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));

      // Update local state for UI feedback
      setAvailability(prev => prev.map(slot =>
        slot.datetime === slotData.datetime
          ? { ...slot, is_available: slotData.isAvailable, notes: slotData.notes }
          : slot
      ));

      console.log('Availability updated (frontend-only):', slotData);
      return slotData;
    } catch (err) {
      console.error('Update availability error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const scheduleInterview = async (interviewData) => {
    try {
      setLoading(true);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 400));

      const newInterview = {
        id: `interview-${Date.now()}`,
        candidate_name: interviewData.candidate_name || 'New Candidate',
        role: interviewData.role || 'Software Engineer',
        scheduled_datetime: interviewData.scheduled_datetime,
        duration_minutes: interviewData.duration_minutes || 60,
        status: 'scheduled',
        interview_type: interviewData.interview_type || 'technical',
        interviewer: 'Admin User',
        notes: interviewData.notes || null,
        candidate_email: interviewData.candidate_email || 'candidate@example.com'
      };

      // Add to local state
      setInterviews(prev => [...prev, newInterview]);

      console.log('Interview scheduled (frontend-only):', newInterview);
      return newInterview;
    } catch (err) {
      console.error('Schedule interview error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const moveInterview = async (interviewId, newDatetime) => {
    try {
      setLoading(true);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));

      // Update local state
      setInterviews(prev => prev.map(interview =>
        interview.id === interviewId
          ? { ...interview, scheduled_datetime: newDatetime, status: 'rescheduled' }
          : interview
      ));

      console.log('Interview rescheduled (frontend-only):', { interviewId, newDatetime });
      return { id: interviewId, scheduled_datetime: newDatetime };
    } catch (err) {
      console.error('Reschedule interview error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelInterview = async (interviewId, reason = '') => {
    try {
      setLoading(true);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));

      // Remove from local state
      setInterviews(prev => prev.filter(interview => interview.id !== interviewId));

      console.log('Interview cancelled (frontend-only):', { interviewId, reason });
      return { id: interviewId, status: 'cancelled', reason };
    } catch (err) {
      console.error('Cancel interview error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    fetchCalendarData();
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchCalendarData();

      // Note: WebSocket connections disabled for frontend-only development
      console.log('Calendar data hook initialized (frontend-only mode)');
    }

    // Cleanup function (no WebSocket to clean up in frontend-only mode)
    return () => {
      console.log('Calendar data hook cleanup');
    };
  }, [startDate, endDate, timezone]);

  return {
    availability,
    interviews,
    loading,
    error,
    refreshData,
    retryFetch,
    updateAvailability,
    scheduleInterview,
    moveInterview,
    cancelInterview
  };
};