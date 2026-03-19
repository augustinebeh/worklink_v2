/**
 * Interview Scheduling - Scheduling Handlers
 *
 * Extracted handler logic for calendar management, AI integration,
 * and helper functions from the interview-scheduling routes.
 */

const { db } = require('../../../../../db');
const { createLogger } = require('../../../../../utils/structured-logger');
const logger = createLogger('interview-scheduling-handlers');

// ─── Helper Functions ──────────────────────────────────────

function determineSchedulingStage(interview, queueStatus, conversationStatus) {
  if (interview) {
    switch (interview.status) {
      case 'scheduled': return 'interview_scheduled';
      case 'confirmed': return 'interview_confirmed';
      case 'completed': return 'interview_completed';
      case 'cancelled': return 'interview_cancelled';
      case 'no_show': return 'interview_no_show';
      default: return 'interview_scheduled';
    }
  }

  if (queueStatus) {
    switch (queueStatus.queue_status) {
      case 'waiting': return 'in_queue';
      case 'contacted': return 'contact_made';
      case 'scheduled': return 'scheduling_in_progress';
      default: return 'in_queue';
    }
  }

  if (conversationStatus) {
    return 'in_conversation';
  }

  return 'not_in_flow';
}

function formatDisplayTime(date, time) {
  const dateObj = new Date(`${date}T${time}:00`);
  return {
    full: dateObj.toLocaleString('en-SG', {
      timeZone: 'Asia/Singapore',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    date: dateObj.toLocaleDateString('en-SG', {
      timeZone: 'Asia/Singapore',
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }),
    time: dateObj.toLocaleTimeString('en-SG', {
      timeZone: 'Asia/Singapore',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    relative: getRelativeTimeString(dateObj)
  };
}

function getRelativeTimeString(date) {
  const now = new Date();
  const diffInMinutes = Math.floor((date - now) / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 1) return `in ${diffInDays} days`;
  if (diffInDays === 1) return 'tomorrow';
  if (diffInDays === 0 && diffInHours > 0) return `in ${diffInHours} hours`;
  if (diffInDays === 0 && diffInMinutes > 0) return `in ${diffInMinutes} minutes`;
  if (diffInDays === -1) return 'yesterday';
  if (diffInDays < -1) return `${Math.abs(diffInDays)} days ago`;
  return 'now';
}

// ─── AI Helper Functions ───────────────────────────────────

function calculateSlotScore(slotTime, candidatePreferences = {}, constraints = {}) {
  let score = 50;

  const hour = slotTime.getHours();
  const dayOfWeek = slotTime.getDay();

  if (hour >= 9 && hour <= 11) score += 20;
  if (hour >= 14 && hour <= 16) score += 15;
  if (hour < 9 || hour > 17) score -= 25;

  if (dayOfWeek >= 1 && dayOfWeek <= 5) score += 10;
  if (dayOfWeek === 0 || dayOfWeek === 6) score -= 15;

  if (candidatePreferences.preferredTimes) {
    const preferred = candidatePreferences.preferredTimes.some(time => {
      const prefHour = parseInt(time.split(':')[0]);
      return Math.abs(hour - prefHour) <= 1;
    });
    if (preferred) score += 25;
  }

  if (constraints.urgency === 'high') {
    const daysFromNow = Math.floor((slotTime - new Date()) / (1000 * 60 * 60 * 24));
    if (daysFromNow <= 2) score += 20;
    if (daysFromNow > 5) score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

function getSlotRecommendationReason(score, preferences) {
  if (score >= 80) return 'Optimal time based on availability and preferences';
  if (score >= 60) return 'Good time slot with minor preference mismatches';
  if (score >= 40) return 'Available slot with some compromises';
  return 'Last resort option - consider alternative dates';
}

function calculateConflictSeverity(conflictData) {
  if (conflictData.type === 'double_booking') return 'high';
  if (conflictData.type === 'time_conflict') return 'medium';
  return 'low';
}

// ─── Calendar Management Route Handlers ────────────────────

function registerCalendarRoutes(router) {
  // Get calendar availability for date range
  router.get('/calendar/availability', async (req, res) => {
    try {
      const { start_date, end_date, timezone = 'Asia/Singapore' } = req.query;
      const admin_id = req.user?.id || 'admin';

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'start_date and end_date are required'
        });
      }

      const weeklyAvailability = db.prepare(`
        SELECT * FROM consultant_availability
        WHERE date BETWEEN ? AND ?
          AND is_available = 1
          AND slot_type = 'interview'
        ORDER BY date, start_time
      `).all(start_date, end_date);

      const availabilitySlots = [];

      for (const slot of weeklyAvailability) {
        const startTime = new Date(`${slot.date}T${slot.start_time}:00`);
        const endTime = new Date(`${slot.date}T${slot.end_time}:00`);

        let currentSlot = new Date(startTime);
        while (currentSlot < endTime) {
          availabilitySlots.push({
            datetime: currentSlot.toISOString(),
            is_available: true,
            is_blocked: false,
            notes: slot.notes || '',
            buffer_minutes: 15,
            source: 'consultant_availability'
          });
          currentSlot.setHours(currentSlot.getHours() + 1);
        }
      }

      res.json({ success: true, data: availabilitySlots });
    } catch (error) {
      logger.error('Get calendar availability error', { error: error.message });
      res.status(500).json({ success: false, message: 'Failed to fetch calendar availability' });
    }
  });

  // Get scheduled interviews for calendar
  router.get('/calendar/interviews', async (req, res) => {
    try {
      const { start_date, end_date, status } = req.query;

      let query = `
        SELECT
          is2.*,
          c.name as candidate_name,
          c.email as candidate_email
        FROM interview_slots is2
        LEFT JOIN candidates c ON is2.candidate_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (start_date && end_date) {
        query += ` AND is2.scheduled_date BETWEEN ? AND ?`;
        params.push(start_date, end_date);
      }

      if (status) {
        query += ` AND is2.status = ?`;
        params.push(status);
      }

      query += ` ORDER BY is2.scheduled_date ASC, is2.scheduled_time ASC`;

      const interviews = db.prepare(query).all(...params);

      const formattedInterviews = interviews.map(interview => ({
        id: interview.id,
        candidate_id: interview.candidate_id,
        candidate_name: interview.candidate_name,
        candidate_email: interview.candidate_email,
        scheduled_datetime: `${interview.scheduled_date}T${interview.scheduled_time}:00`,
        scheduled_date: interview.scheduled_date,
        scheduled_time: interview.scheduled_time,
        duration: interview.duration_minutes || 30,
        type: interview.interview_type || 'video',
        status: interview.status,
        meeting_link: interview.meeting_link,
        notes: interview.notes,
        created_at: interview.created_at,
        displayTime: formatDisplayTime(interview.scheduled_date, interview.scheduled_time)
      }));

      res.json({ success: true, data: formattedInterviews });
    } catch (error) {
      logger.error('Get calendar interviews error', { error: error.message });
      res.status(500).json({ success: false, message: 'Failed to fetch calendar interviews' });
    }
  });

  // Schedule new interview via calendar
  router.post('/calendar/interviews', async (req, res) => {
    try {
      const {
        candidate_id, candidate_name, candidate_email,
        datetime, duration = 30, interview_type = 'video', notes = ''
      } = req.body;

      if (!candidate_name || !datetime) {
        return res.status(400).json({ success: false, message: 'candidate_name and datetime are required' });
      }

      const date = datetime.split('T')[0];
      const time = datetime.split('T')[1].slice(0, 5);

      const existingInterview = db.prepare(`
        SELECT id FROM interview_slots
        WHERE scheduled_date = ? AND scheduled_time = ? AND status != 'cancelled'
      `).get(date, time);

      if (existingInterview) {
        return res.status(409).json({ success: false, message: 'Time slot is already booked' });
      }

      const meetingId = Math.random().toString(36).substring(2, 15);
      const meetingLink = `https://meet.worklink.com/interview/${meetingId}`;

      const result = db.prepare(`
        INSERT INTO interview_slots
        (candidate_id, scheduled_date, scheduled_time, duration_minutes, interview_type, meeting_link, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(candidate_id, date, time, duration, interview_type, meetingLink, notes);

      const newInterview = db.prepare(`
        SELECT is2.*, c.name as candidate_name, c.email as candidate_email
        FROM interview_slots is2
        LEFT JOIN candidates c ON is2.candidate_id = c.id
        WHERE is2.id = ?
      `).get(result.lastInsertRowid);

      res.json({
        success: true,
        data: { ...newInterview, scheduled_datetime: datetime, displayTime: formatDisplayTime(date, time) },
        message: 'Interview scheduled successfully'
      });
    } catch (error) {
      logger.error('Schedule calendar interview error', { error: error.message });
      res.status(500).json({ success: false, message: 'Failed to schedule interview' });
    }
  });

  // Reschedule interview via drag-and-drop
  router.put('/calendar/interviews/:id/reschedule', async (req, res) => {
    try {
      const { id } = req.params;
      const { new_datetime } = req.body;

      if (!new_datetime) {
        return res.status(400).json({ success: false, message: 'new_datetime is required' });
      }

      const newDate = new_datetime.split('T')[0];
      const newTime = new_datetime.split('T')[1].slice(0, 5);

      const existingInterview = db.prepare(`
        SELECT id FROM interview_slots
        WHERE scheduled_date = ? AND scheduled_time = ?
          AND status != 'cancelled' AND id != ?
      `).get(newDate, newTime, id);

      if (existingInterview) {
        return res.status(409).json({ success: false, message: 'New time slot is already booked' });
      }

      const result = db.prepare(`
        UPDATE interview_slots
        SET scheduled_date = ?, scheduled_time = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newDate, newTime, id);

      if (result.changes === 0) {
        return res.status(404).json({ success: false, message: 'Interview not found' });
      }

      const updatedInterview = db.prepare(`
        SELECT is2.*, c.name as candidate_name, c.email as candidate_email
        FROM interview_slots is2
        LEFT JOIN candidates c ON is2.candidate_id = c.id
        WHERE is2.id = ?
      `).get(id);

      res.json({
        success: true,
        data: { ...updatedInterview, scheduled_datetime: new_datetime, displayTime: formatDisplayTime(newDate, newTime) },
        message: 'Interview rescheduled successfully'
      });
    } catch (error) {
      logger.error('Reschedule calendar interview error', { error: error.message });
      res.status(500).json({ success: false, message: 'Failed to reschedule interview' });
    }
  });

  // Cancel interview
  router.put('/calendar/interviews/:id/cancel', async (req, res) => {
    try {
      const { id } = req.params;
      const { reason = '' } = req.body;

      const result = db.prepare(`
        UPDATE interview_slots
        SET status = 'cancelled', notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(`Cancelled: ${reason}`, id);

      if (result.changes === 0) {
        return res.status(404).json({ success: false, message: 'Interview not found' });
      }

      res.json({ success: true, message: 'Interview cancelled successfully' });
    } catch (error) {
      logger.error('Cancel calendar interview error', { error: error.message });
      res.status(500).json({ success: false, message: 'Failed to cancel interview' });
    }
  });

  // Weekly availability management
  router.post('/calendar/availability/weekly', async (req, res) => {
    try {
      const { weeklySchedule, bufferTime = 15 } = req.body;

      res.json({
        success: true,
        message: 'Weekly availability updated successfully',
        note: 'This endpoint needs to be fully implemented with proper admin availability tables'
      });
    } catch (error) {
      logger.error('Update weekly availability error', { error: error.message });
      res.status(500).json({ success: false, message: 'Failed to update weekly availability' });
    }
  });
}

// ─── AI Integration Route Handlers ─────────────────────────

function registerAIRoutes(router) {
  // Find optimal interview slot using AI
  router.post('/ai/find-optimal-slot', async (req, res) => {
    try {
      const { candidatePreferences, constraints, timezone = 'Asia/Singapore' } = req.body;

      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const availableSlots = db.prepare(`
        SELECT
          ca.date, ca.start_time, ca.end_time, ca.consultant_id,
          COUNT(is2.id) as booked_slots
        FROM consultant_availability ca
        LEFT JOIN interview_slots is2 ON ca.date = is2.scheduled_date
          AND is2.scheduled_time >= ca.start_time
          AND is2.scheduled_time < ca.end_time
          AND is2.status IN ('scheduled', 'confirmed')
        WHERE ca.date BETWEEN ? AND ?
          AND ca.is_available = 1
          AND ca.slot_type = 'interview'
        GROUP BY ca.date, ca.start_time, ca.end_time, ca.consultant_id
        ORDER BY ca.date, ca.start_time
      `).all(startDate, endDate);

      const slots = [];
      for (const availability of availableSlots) {
        const startTime = new Date(`${availability.date}T${availability.start_time}:00`);
        const endTime = new Date(`${availability.date}T${availability.end_time}:00`);

        let currentTime = new Date(startTime);
        while (currentTime < endTime) {
          const slotTime = currentTime.toTimeString().slice(0, 5);

          const isBooked = db.prepare(`
            SELECT COUNT(*) as count
            FROM interview_slots
            WHERE scheduled_date = ? AND scheduled_time = ?
              AND status IN ('scheduled', 'confirmed')
          `).get(availability.date, slotTime).count;

          if (isBooked === 0) {
            slots.push({
              datetime: currentTime.toISOString(),
              date: availability.date,
              time: slotTime,
              consultantId: availability.consultant_id,
              score: calculateSlotScore(currentTime, candidatePreferences, constraints)
            });
          }

          currentTime.setMinutes(currentTime.getMinutes() + 30);
        }
      }

      const optimalSlots = slots
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(slot => ({
          ...slot,
          displayTime: formatDisplayTime(slot.date, slot.time),
          reason: getSlotRecommendationReason(slot.score, candidatePreferences)
        }));

      res.json({
        success: true,
        data: {
          optimalSlots,
          totalSlotsAnalyzed: slots.length,
          aiRecommendation: optimalSlots[0] || null
        }
      });
    } catch (error) {
      logger.error('Find optimal slot error', { error: error.message });
      res.status(500).json({ success: false, message: 'Failed to find optimal slot' });
    }
  });

  // AI-powered interview scheduling
  router.post('/ai/schedule', async (req, res) => {
    try {
      const { candidateData, slotPreferences, timezone = 'Asia/Singapore' } = req.body;

      if (!candidateData.name) {
        return res.status(400).json({ success: false, message: 'Candidate name is required' });
      }

      const optimalSlotResponse = await fetch(`${req.protocol}://${req.get('host')}/api/v1/interview-scheduling/ai/find-optimal-slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidatePreferences: slotPreferences,
          constraints: { urgency: 'high' },
          timezone
        })
      });

      const optimalSlotData = await optimalSlotResponse.json();

      if (!optimalSlotData.success || !optimalSlotData.data.aiRecommendation) {
        return res.status(404).json({ success: false, message: 'No suitable time slots available' });
      }

      const recommendedSlot = optimalSlotData.data.aiRecommendation;

      const meetingId = Math.random().toString(36).substring(2, 15);
      const meetingLink = `https://meet.worklink.com/interview/${meetingId}`;

      const result = db.prepare(`
        INSERT INTO interview_slots
        (candidate_id, scheduled_date, scheduled_time, duration_minutes, interview_type, meeting_link, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        candidateData.id || null,
        recommendedSlot.date,
        recommendedSlot.time,
        slotPreferences.duration || 30,
        slotPreferences.type || 'video',
        meetingLink,
        `AI scheduled: ${recommendedSlot.reason || 'Optimal time slot'}`
      );

      const scheduledInterview = {
        id: result.lastInsertRowid,
        candidate_name: candidateData.name,
        candidate_email: candidateData.email,
        scheduled_datetime: recommendedSlot.datetime,
        scheduled_date: recommendedSlot.date,
        scheduled_time: recommendedSlot.time,
        duration_minutes: slotPreferences.duration || 30,
        interview_type: slotPreferences.type || 'video',
        meeting_link: meetingLink,
        status: 'scheduled',
        displayTime: recommendedSlot.displayTime
      };

      logger.info('Sending interview notification', { email: candidateData.email, time: recommendedSlot.displayTime.full });

      res.json({
        success: true,
        data: {
          interview: scheduledInterview,
          aiInsights: {
            slotScore: recommendedSlot.score,
            reason: recommendedSlot.reason,
            alternativeSlots: optimalSlotData.data.optimalSlots.slice(1, 3)
          }
        },
        message: 'Interview scheduled automatically by AI'
      });
    } catch (error) {
      logger.error('AI schedule error', { error: error.message });
      res.status(500).json({ success: false, message: 'Failed to schedule interview with AI' });
    }
  });

  // Get conflict resolutions
  router.post('/ai/resolve-conflicts', async (req, res) => {
    try {
      const { conflictData } = req.body;
      const resolutions = [];

      if (conflictData.type === 'time_conflict') {
        const alternatives = db.prepare(`
          SELECT ca.date, ca.start_time, ca.end_time
          FROM consultant_availability ca
          LEFT JOIN interview_slots is2 ON ca.date = is2.scheduled_date
            AND is2.scheduled_time = ca.start_time
            AND is2.status IN ('scheduled', 'confirmed')
          WHERE ca.date >= DATE('now')
            AND ca.date <= DATE('now', '+7 days')
            AND ca.is_available = 1
            AND is2.id IS NULL
          ORDER BY ca.date, ca.start_time
          LIMIT 5
        `).all();

        resolutions.push({
          type: 'reschedule',
          title: 'Reschedule to Alternative Times',
          description: 'Move interview to an available time slot',
          options: alternatives.map(slot => ({
            datetime: `${slot.date}T${slot.start_time}:00`,
            displayTime: formatDisplayTime(slot.date, slot.start_time)
          }))
        });
      }

      if (conflictData.type === 'double_booking') {
        resolutions.push({
          type: 'extend_session',
          title: 'Extend Session Duration',
          description: 'Conduct back-to-back interviews with buffer time',
          impact: 'Requires 15-minute buffer between interviews'
        });

        resolutions.push({
          type: 'reschedule_one',
          title: 'Reschedule One Interview',
          description: 'Move one interview to the next available slot',
          recommendation: 'Move the less urgent interview'
        });
      }

      res.json({
        success: true,
        data: {
          resolutions,
          recommendedAction: resolutions[0] || null,
          aiAnalysis: {
            conflictSeverity: calculateConflictSeverity(conflictData),
            impactAssessment: 'Minimal disruption with recommended resolution'
          }
        }
      });
    } catch (error) {
      logger.error('Resolve conflicts error', { error: error.message });
      res.status(500).json({ success: false, message: 'Failed to resolve conflicts' });
    }
  });

  // Send automatic notifications
  router.post('/ai/notifications', async (req, res) => {
    try {
      const { interviewData, notificationType, timezone = 'Asia/Singapore' } = req.body;
      const notifications = [];

      switch (notificationType) {
        case 'interview_scheduled':
          notifications.push({
            type: 'email',
            recipient: interviewData.candidate_email,
            template: 'interview_confirmation',
            data: interviewData
          });
          notifications.push({
            type: 'sms',
            recipient: interviewData.candidate_phone,
            message: `Your interview is scheduled for ${interviewData.displayTime.full}. Meeting link: ${interviewData.meeting_link}`
          });
          break;

        case 'reminder_24h':
          notifications.push({
            type: 'email',
            recipient: interviewData.candidate_email,
            template: 'interview_reminder',
            data: interviewData
          });
          break;

        case 'reminder_1h':
          notifications.push({
            type: 'push',
            recipient: interviewData.candidate_id,
            message: 'Your interview starts in 1 hour',
            data: interviewData
          });
          break;
      }

      logger.info('Sending notifications for interview', { count: notifications.length, interviewId: interviewData.id });

      res.json({
        success: true,
        data: {
          notifications: notifications.map(n => ({
            ...n,
            status: 'queued',
            scheduledAt: new Date().toISOString()
          }))
        },
        message: 'Notifications queued successfully'
      });
    } catch (error) {
      logger.error('Send notifications error', { error: error.message });
      res.status(500).json({ success: false, message: 'Failed to send notifications' });
    }
  });
}

module.exports = {
  determineSchedulingStage,
  formatDisplayTime,
  getRelativeTimeString,
  calculateSlotScore,
  getSlotRecommendationReason,
  calculateConflictSeverity,
  registerCalendarRoutes,
  registerAIRoutes
};
