/**
 * Interview Scheduling API Routes
 * Provides data for interview scheduling UI components
 */

const express = require('express');
const { db } = require('../../../db');

const router = express.Router();

/**
 * Get interview status for a specific candidate
 * Used by both admin and worker chat interfaces
 */
router.get('/candidate/:candidateId/status', async (req, res) => {
  try {
    const { candidateId } = req.params;

    // Get current interview status
    const interviewSlot = db.prepare(`
      SELECT
        slot.*,
        ca.date as consultant_date,
        ca.start_time as consultant_start,
        ca.end_time as consultant_end
      FROM interview_slots slot
      LEFT JOIN consultant_availability ca ON slot.scheduled_date = ca.date
        AND slot.scheduled_time >= ca.start_time
        AND slot.scheduled_time < ca.end_time
      WHERE slot.candidate_id = ?
        AND slot.status IN ('scheduled', 'confirmed')
      ORDER BY slot.scheduled_date DESC, slot.scheduled_time DESC
      LIMIT 1
    `).get(candidateId);

    // Get queue status
    const queueStatus = db.prepare(`
      SELECT * FROM interview_queue
      WHERE candidate_id = ? AND queue_status IN ('waiting', 'contacted', 'scheduled')
      ORDER BY added_at DESC
      LIMIT 1
    `).get(candidateId);

    // Get conversation status
    const conversationStatus = db.prepare(`
      SELECT * FROM slm_conversations
      WHERE candidate_id = ? AND conversation_status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `).get(candidateId);

    // Get candidate info
    const candidate = db.prepare(`
      SELECT id, name, email, phone, status, created_at
      FROM candidates
      WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    const response = {
      success: true,
      data: {
        candidate,
        interview: interviewSlot,
        queueStatus,
        conversationStatus,
        isInSchedulingFlow: !!(interviewSlot || queueStatus || conversationStatus),
        schedulingStage: determineSchedulingStage(interviewSlot, queueStatus, conversationStatus)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching interview status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interview status',
      error: error.message
    });
  }
});

/**
 * Get available interview slots
 * Used for scheduling interface
 */
router.get('/slots/available', async (req, res) => {
  try {
    const { days = 7, candidateId, timePeriod } = req.query;
    const daysCount = parseInt(days);

    // Get available slots for the next N days
    const availableSlots = db.prepare(`
      SELECT
        ca.date,
        ca.start_time,
        ca.end_time,
        ca.consultant_id,
        COUNT(is.id) as booked_slots
      FROM consultant_availability ca
      LEFT JOIN interview_slots is ON ca.date = is.scheduled_date
        AND is.scheduled_time >= ca.start_time
        AND is.scheduled_time < ca.end_time
        AND is.status IN ('scheduled', 'confirmed')
      WHERE ca.date >= DATE('now')
        AND ca.date <= DATE('now', '+' || ? || ' days')
        AND ca.is_available = 1
        AND ca.slot_type = 'interview'
      GROUP BY ca.date, ca.start_time, ca.end_time, ca.consultant_id
      ORDER BY ca.date, ca.start_time
    `).all(daysCount);

    // Calculate actual available 30-minute slots
    const slots = [];

    for (const availability of availableSlots) {
      const startTime = new Date(`${availability.date}T${availability.start_time}:00`);
      const endTime = new Date(`${availability.date}T${availability.end_time}:00`);

      // Generate 30-minute slots
      let currentTime = new Date(startTime);
      while (currentTime < endTime) {
        const slotTime = currentTime.toTimeString().slice(0, 5);

        // Check if this specific slot is available
        const isBooked = db.prepare(`
          SELECT COUNT(*) as count
          FROM interview_slots
          WHERE scheduled_date = ?
            AND scheduled_time = ?
            AND status IN ('scheduled', 'confirmed')
        `).get(availability.date, slotTime).count;

        if (isBooked === 0) {
          const slotHour = currentTime.getHours();

          // Apply time period filtering if specified
          let includeSlot = true;
          if (timePeriod === 'morning' && (slotHour < 9 || slotHour >= 13)) {
            includeSlot = false; // Morning: 9AM-1PM
          } else if (timePeriod === 'afternoon' && (slotHour < 14 || slotHour >= 18)) {
            includeSlot = false; // Afternoon: 2PM-6PM
          }

          if (includeSlot) {
            slots.push({
              date: availability.date,
              time: slotTime,
              consultantId: availability.consultant_id,
              datetime: `${availability.date}T${slotTime}:00`,
              displayTime: formatDisplayTime(availability.date, slotTime),
              timePeriod: slotHour >= 9 && slotHour < 13 ? 'morning' : 'afternoon'
            });
          }
        }

        // Move to next 30-minute slot
        currentTime.setMinutes(currentTime.getMinutes() + 30);
      }
    }

    res.json({
      success: true,
      data: {
        slots: slots.slice(0, 20), // Limit to first 20 slots
        totalAvailable: slots.length,
        period: `${daysCount} days`
      }
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available slots',
      error: error.message
    });
  }
});

/**
 * Schedule an interview
 * Used by admin interface
 */
router.post('/candidate/:candidateId/schedule', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { date, time, interviewType = 'onboarding', notes } = req.body;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Date and time are required'
      });
    }

    // Verify candidate exists
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Check if slot is still available
    const isSlotAvailable = db.prepare(`
      SELECT COUNT(*) as count
      FROM interview_slots
      WHERE scheduled_date = ? AND scheduled_time = ?
        AND status IN ('scheduled', 'confirmed')
    `).get(date, time).count === 0;

    if (!isSlotAvailable) {
      return res.status(409).json({
        success: false,
        message: 'Selected time slot is no longer available'
      });
    }

    // Generate meeting link
    const meetingId = Math.random().toString(36).substring(2, 15);
    const meetingLink = `https://meet.worklink.com/interview/${meetingId}`;

    // Create interview slot
    const interviewResult = db.prepare(`
      INSERT INTO interview_slots
      (candidate_id, scheduled_date, scheduled_time, duration_minutes, interview_type, meeting_link, notes)
      VALUES (?, ?, ?, 30, ?, ?, ?)
    `).run(candidateId, date, time, interviewType, meetingLink, notes || '');

    const interviewId = interviewResult.lastInsertRowid;

    // Update interview queue if exists
    db.prepare(`
      UPDATE interview_queue
      SET queue_status = 'scheduled', scheduled_for = ?
      WHERE candidate_id = ? AND queue_status IN ('waiting', 'contacted')
    `).run(`${date} ${time}`, candidateId);

    // Log the scheduling
    db.prepare(`
      INSERT INTO lead_conversion_log
      (candidate_id, conversion_stage, previous_stage, conversion_method, notes)
      VALUES (?, 'scheduled', ?, 'admin_manual', ?)
    `).run(candidateId, candidate.status, `Interview scheduled for ${date} ${time}`);

    // Get the created interview with formatted details
    const scheduledInterview = db.prepare(`
      SELECT * FROM interview_slots WHERE id = ?
    `).get(interviewId);

    res.json({
      success: true,
      message: 'Interview scheduled successfully',
      data: {
        interviewId,
        interview: {
          ...scheduledInterview,
          displayTime: formatDisplayTime(date, time)
        },
        candidate: {
          id: candidate.id,
          name: candidate.name,
          email: candidate.email
        }
      }
    });
  } catch (error) {
    console.error('Error scheduling interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule interview',
      error: error.message
    });
  }
});

/**
 * Update interview status (confirm, cancel, complete, etc.)
 */
router.patch('/interview/:interviewId/status', async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { status, notes, completedAt } = req.body;

    const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    // Get current interview
    const currentInterview = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(interviewId);
    if (!currentInterview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    // Update interview status
    const updateQuery = `
      UPDATE interview_slots
      SET status = ?, notes = COALESCE(?, notes), completed_at = ?
      WHERE id = ?
    `;

    db.prepare(updateQuery).run(
      status,
      notes,
      status === 'completed' ? (completedAt || new Date().toISOString()) : null,
      interviewId
    );

    // If interview is completed, potentially update candidate status
    if (status === 'completed') {
      const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(currentInterview.candidate_id);

      // If candidate is still pending, consider moving them to active
      if (candidate && candidate.status === 'pending') {
        // This could be automated based on business rules
        console.log(`Interview completed for pending candidate ${candidate.id}, consider status update`);
      }

      // Log conversion
      db.prepare(`
        INSERT INTO lead_conversion_log
        (candidate_id, conversion_stage, previous_stage, conversion_method, notes)
        VALUES (?, 'interviewed', ?, 'interview_completed', ?)
      `).run(
        currentInterview.candidate_id,
        candidate?.status || 'unknown',
        `Interview completed: ${notes || 'No additional notes'}`
      );
    }

    // Get updated interview
    const updatedInterview = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(interviewId);

    res.json({
      success: true,
      message: 'Interview status updated successfully',
      data: {
        interview: updatedInterview,
        previousStatus: currentInterview.status
      }
    });
  } catch (error) {
    console.error('Error updating interview status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update interview status',
      error: error.message
    });
  }
});

/**
 * Reschedule an interview
 */
router.patch('/interview/:interviewId/reschedule', async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { date, time, reason } = req.body;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: 'New date and time are required'
      });
    }

    // Get current interview
    const currentInterview = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(interviewId);
    if (!currentInterview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    // Check 24-hour reschedule restriction
    const now = new Date();
    const interviewDateTime = new Date(`${currentInterview.scheduled_date}T${currentInterview.scheduled_time}`);
    const hoursUntilInterview = (interviewDateTime - now) / (1000 * 60 * 60);

    if (hoursUntilInterview <= 24) {
      return res.status(403).json({
        success: false,
        message: 'Interviews cannot be rescheduled within 24 hours of the scheduled time',
        data: {
          hoursUntilInterview: Math.ceil(hoursUntilInterview),
          scheduledTime: currentInterview.scheduled_date + ' ' + currentInterview.scheduled_time
        }
      });
    }

    // Check if new slot is available
    const isNewSlotAvailable = db.prepare(`
      SELECT COUNT(*) as count
      FROM interview_slots
      WHERE scheduled_date = ? AND scheduled_time = ?
        AND status IN ('scheduled', 'confirmed')
        AND id != ?
    `).get(date, time, interviewId).count === 0;

    if (!isNewSlotAvailable) {
      return res.status(409).json({
        success: false,
        message: 'New time slot is not available'
      });
    }

    // Update interview with new time
    db.prepare(`
      UPDATE interview_slots
      SET scheduled_date = ?, scheduled_time = ?,
          notes = COALESCE(notes || ' | ', '') || 'Rescheduled: ' || ?
      WHERE id = ?
    `).run(date, time, reason || 'No reason provided', interviewId);

    // Update queue if needed
    db.prepare(`
      UPDATE interview_queue
      SET scheduled_for = ?
      WHERE candidate_id = ? AND queue_status = 'scheduled'
    `).run(`${date} ${time}`, currentInterview.candidate_id);

    // Get updated interview
    const updatedInterview = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(interviewId);

    res.json({
      success: true,
      message: 'Interview rescheduled successfully',
      data: {
        interview: {
          ...updatedInterview,
          displayTime: formatDisplayTime(date, time)
        },
        previousTime: {
          date: currentInterview.scheduled_date,
          time: currentInterview.scheduled_time,
          displayTime: formatDisplayTime(currentInterview.scheduled_date, currentInterview.scheduled_time)
        }
      }
    });
  } catch (error) {
    console.error('Error rescheduling interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reschedule interview',
      error: error.message
    });
  }
});

/**
 * Get candidate's interview history
 */
router.get('/candidate/:candidateId/history', async (req, res) => {
  try {
    const { candidateId } = req.params;

    const interviews = db.prepare(`
      SELECT
        is.*,
        c.name as candidate_name,
        c.email as candidate_email
      FROM interview_slots is
      JOIN candidates c ON is.candidate_id = c.id
      WHERE is.candidate_id = ?
      ORDER BY is.scheduled_date DESC, is.scheduled_time DESC
    `).all(candidateId);

    const conversationHistory = db.prepare(`
      SELECT * FROM slm_conversations
      WHERE candidate_id = ?
      ORDER BY created_at DESC
    `).all(candidateId);

    const conversionHistory = db.prepare(`
      SELECT * FROM lead_conversion_log
      WHERE candidate_id = ?
      ORDER BY created_at DESC
    `).all(candidateId);

    res.json({
      success: true,
      data: {
        interviews: interviews.map(interview => ({
          ...interview,
          displayTime: formatDisplayTime(interview.scheduled_date, interview.scheduled_time)
        })),
        conversations: conversationHistory,
        conversions: conversionHistory
      }
    });
  } catch (error) {
    console.error('Error fetching interview history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interview history',
      error: error.message
    });
  }
});

/**
 * Get scheduling analytics (for admin dashboard)
 */
router.get('/analytics', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysCount = parseInt(days);
    const since = new Date(Date.now() - daysCount * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get scheduling metrics
    const metrics = db.prepare(`
      SELECT
        COUNT(*) as total_interviews,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        AVG(duration_minutes) as avg_duration
      FROM interview_slots
      WHERE scheduled_date >= ?
    `).get(since);

    // Get queue statistics
    const queueStats = db.prepare(`
      SELECT
        COUNT(*) as total_in_queue,
        SUM(CASE WHEN queue_status = 'waiting' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN queue_status = 'contacted' THEN 1 ELSE 0 END) as contacted,
        SUM(CASE WHEN queue_status = 'scheduled' THEN 1 ELSE 0 END) as queue_scheduled,
        SUM(CASE WHEN urgency_level = 'high' THEN 1 ELSE 0 END) as high_priority
      FROM interview_queue
    `).get();

    // Get conversion statistics
    const conversions = db.prepare(`
      SELECT
        COUNT(*) as total_conversions,
        SUM(CASE WHEN conversion_method LIKE '%interview%' THEN 1 ELSE 0 END) as interview_conversions
      FROM lead_conversion_log
      WHERE created_at >= ? AND conversion_stage = 'active'
    `).get(since).total_conversions;

    // Calculate rates
    const completionRate = metrics.total_interviews > 0 ? metrics.completed / metrics.total_interviews : 0;
    const noShowRate = metrics.total_interviews > 0 ? metrics.no_shows / metrics.total_interviews : 0;
    const conversionRate = metrics.completed > 0 ? conversions / metrics.completed : 0;

    // Get daily breakdown
    const dailyBreakdown = db.prepare(`
      SELECT
        DATE(scheduled_date) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows
      FROM interview_slots
      WHERE scheduled_date >= ?
      GROUP BY DATE(scheduled_date)
      ORDER BY date DESC
    `).all(since);

    res.json({
      success: true,
      data: {
        period: `${daysCount} days`,
        summary: {
          ...metrics,
          completionRate: Math.round(completionRate * 100) / 100,
          noShowRate: Math.round(noShowRate * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100,
          totalConversions: conversions
        },
        queue: queueStats,
        dailyBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching scheduling analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduling analytics',
      error: error.message
    });
  }
});

/**
 * Helper functions
 */

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

/**
 * Calendar Management Endpoints
 * Professional calendar interface support
 */

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

    // Get weekly availability patterns from consultant_availability
    const weeklyAvailability = db.prepare(`
      SELECT * FROM consultant_availability
      WHERE date BETWEEN ? AND ?
        AND is_available = 1
        AND slot_type = 'interview'
      ORDER BY date, start_time
    `).all(start_date, end_date);

    // Generate availability slots
    const availabilitySlots = [];

    for (const slot of weeklyAvailability) {
      const startTime = new Date(`${slot.date}T${slot.start_time}:00`);
      const endTime = new Date(`${slot.date}T${slot.end_time}:00`);

      // Generate hourly slots within the availability window
      let currentSlot = new Date(startTime);
      while (currentSlot < endTime) {
        availabilitySlots.push({
          datetime: currentSlot.toISOString(),
          is_available: true,
          is_blocked: false,
          notes: slot.notes || '',
          buffer_minutes: 15, // Default buffer
          source: 'consultant_availability'
        });
        currentSlot.setHours(currentSlot.getHours() + 1);
      }
    }

    res.json({
      success: true,
      data: availabilitySlots
    });
  } catch (error) {
    console.error('Get calendar availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar availability'
    });
  }
});

// Get scheduled interviews for calendar
router.get('/calendar/interviews', async (req, res) => {
  try {
    const { start_date, end_date, status } = req.query;
    const admin_id = req.user?.id || 'admin';

    let query = `
      SELECT
        is.*,
        c.name as candidate_name,
        c.email as candidate_email
      FROM interview_slots is
      LEFT JOIN candidates c ON is.candidate_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date && end_date) {
      query += ` AND is.scheduled_date BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    }

    if (status) {
      query += ` AND is.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY is.scheduled_date ASC, is.scheduled_time ASC`;

    const interviews = db.prepare(query).all(...params);

    // Format interviews for calendar
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

    res.json({
      success: true,
      data: formattedInterviews
    });
  } catch (error) {
    console.error('Get calendar interviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar interviews'
    });
  }
});

// Schedule new interview via calendar
router.post('/calendar/interviews', async (req, res) => {
  try {
    const {
      candidate_id,
      candidate_name,
      candidate_email,
      datetime,
      duration = 30,
      interview_type = 'video',
      notes = ''
    } = req.body;

    if (!candidate_name || !datetime) {
      return res.status(400).json({
        success: false,
        message: 'candidate_name and datetime are required'
      });
    }

    const date = datetime.split('T')[0];
    const time = datetime.split('T')[1].slice(0, 5);

    // Check for conflicts
    const existingInterview = db.prepare(`
      SELECT id FROM interview_slots
      WHERE scheduled_date = ? AND scheduled_time = ? AND status != 'cancelled'
    `).get(date, time);

    if (existingInterview) {
      return res.status(409).json({
        success: false,
        message: 'Time slot is already booked'
      });
    }

    // Generate meeting link
    const meetingId = Math.random().toString(36).substring(2, 15);
    const meetingLink = `https://meet.worklink.com/interview/${meetingId}`;

    // Create interview
    const result = db.prepare(`
      INSERT INTO interview_slots
      (candidate_id, scheduled_date, scheduled_time, duration_minutes, interview_type, meeting_link, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      candidate_id,
      date,
      time,
      duration,
      interview_type,
      meetingLink,
      notes
    );

    const newInterview = db.prepare(`
      SELECT is.*, c.name as candidate_name, c.email as candidate_email
      FROM interview_slots is
      LEFT JOIN candidates c ON is.candidate_id = c.id
      WHERE is.id = ?
    `).get(result.lastInsertRowid);

    res.json({
      success: true,
      data: {
        ...newInterview,
        scheduled_datetime: datetime,
        displayTime: formatDisplayTime(date, time)
      },
      message: 'Interview scheduled successfully'
    });
  } catch (error) {
    console.error('Schedule calendar interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule interview'
    });
  }
});

// Reschedule interview via drag-and-drop
router.put('/calendar/interviews/:id/reschedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { new_datetime } = req.body;

    if (!new_datetime) {
      return res.status(400).json({
        success: false,
        message: 'new_datetime is required'
      });
    }

    const newDate = new_datetime.split('T')[0];
    const newTime = new_datetime.split('T')[1].slice(0, 5);

    // Check for conflicts (excluding current interview)
    const existingInterview = db.prepare(`
      SELECT id FROM interview_slots
      WHERE scheduled_date = ? AND scheduled_time = ?
        AND status != 'cancelled' AND id != ?
    `).get(newDate, newTime, id);

    if (existingInterview) {
      return res.status(409).json({
        success: false,
        message: 'New time slot is already booked'
      });
    }

    const result = db.prepare(`
      UPDATE interview_slots
      SET scheduled_date = ?, scheduled_time = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newDate, newTime, id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    const updatedInterview = db.prepare(`
      SELECT is.*, c.name as candidate_name, c.email as candidate_email
      FROM interview_slots is
      LEFT JOIN candidates c ON is.candidate_id = c.id
      WHERE is.id = ?
    `).get(id);

    res.json({
      success: true,
      data: {
        ...updatedInterview,
        scheduled_datetime: new_datetime,
        displayTime: formatDisplayTime(newDate, newTime)
      },
      message: 'Interview rescheduled successfully'
    });
  } catch (error) {
    console.error('Reschedule calendar interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reschedule interview'
    });
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
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    res.json({
      success: true,
      message: 'Interview cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel calendar interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel interview'
    });
  }
});

// Weekly availability management
router.post('/calendar/availability/weekly', async (req, res) => {
  try {
    const { weeklySchedule, bufferTime = 15 } = req.body;

    // For this implementation, we'll use the consultant_availability table
    // In a production system, you might want a dedicated admin availability table

    // This is a simplified version - in practice you'd want more sophisticated
    // availability management with proper admin user support

    res.json({
      success: true,
      message: 'Weekly availability updated successfully',
      note: 'This endpoint needs to be fully implemented with proper admin availability tables'
    });
  } catch (error) {
    console.error('Update weekly availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update weekly availability'
    });
  }
});

/**
 * AI Integration Endpoints
 * Support for SLM automatic scheduling
 */

// Find optimal interview slot using AI
router.post('/ai/find-optimal-slot', async (req, res) => {
  try {
    const { candidatePreferences, constraints, timezone = 'Asia/Singapore' } = req.body;

    // Get available slots for the next 14 days
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const availableSlots = db.prepare(`
      SELECT
        ca.date,
        ca.start_time,
        ca.end_time,
        ca.consultant_id,
        COUNT(is.id) as booked_slots
      FROM consultant_availability ca
      LEFT JOIN interview_slots is ON ca.date = is.scheduled_date
        AND is.scheduled_time >= ca.start_time
        AND is.scheduled_time < ca.end_time
        AND is.status IN ('scheduled', 'confirmed')
      WHERE ca.date BETWEEN ? AND ?
        AND ca.is_available = 1
        AND ca.slot_type = 'interview'
      GROUP BY ca.date, ca.start_time, ca.end_time, ca.consultant_id
      ORDER BY ca.date, ca.start_time
    `).all(startDate, endDate);

    // Generate time slots
    const slots = [];
    for (const availability of availableSlots) {
      const startTime = new Date(`${availability.date}T${availability.start_time}:00`);
      const endTime = new Date(`${availability.date}T${availability.end_time}:00`);

      let currentTime = new Date(startTime);
      while (currentTime < endTime) {
        const slotTime = currentTime.toTimeString().slice(0, 5);

        // Check if slot is free
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

    // Sort by AI score and return top 5
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
    console.error('Find optimal slot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find optimal slot'
    });
  }
});

// AI-powered interview scheduling
router.post('/ai/schedule', async (req, res) => {
  try {
    const { candidateData, slotPreferences, timezone = 'Asia/Singapore' } = req.body;

    if (!candidateData.name) {
      return res.status(400).json({
        success: false,
        message: 'Candidate name is required'
      });
    }

    // Find optimal slot using AI
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
      return res.status(404).json({
        success: false,
        message: 'No suitable time slots available'
      });
    }

    const recommendedSlot = optimalSlotData.data.aiRecommendation;

    // Schedule the interview
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

    // Send automatic notification (placeholder)
    console.log(`Sending interview notification to ${candidateData.email} for ${recommendedSlot.displayTime.full}`);

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
    console.error('AI schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule interview with AI'
    });
  }
});

// Get conflict resolutions
router.post('/ai/resolve-conflicts', async (req, res) => {
  try {
    const { conflictData } = req.body;

    // Analyze conflicts and provide resolutions
    const resolutions = [];

    if (conflictData.type === 'time_conflict') {
      // Find alternative time slots
      const alternatives = db.prepare(`
        SELECT
          ca.date,
          ca.start_time,
          ca.end_time
        FROM consultant_availability ca
        LEFT JOIN interview_slots is ON ca.date = is.scheduled_date
          AND is.scheduled_time = ca.start_time
          AND is.status IN ('scheduled', 'confirmed')
        WHERE ca.date >= DATE('now')
          AND ca.date <= DATE('now', '+7 days')
          AND ca.is_available = 1
          AND is.id IS NULL
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
    console.error('Resolve conflicts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve conflicts'
    });
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

    // In a real implementation, you'd send these notifications
    console.log(`Sending ${notifications.length} notifications for interview ${interviewData.id}`);

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
    console.error('Send notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notifications'
    });
  }
});

/**
 * AI Helper Functions
 */

function calculateSlotScore(slotTime, candidatePreferences = {}, constraints = {}) {
  let score = 50; // Base score

  const hour = slotTime.getHours();
  const dayOfWeek = slotTime.getDay();

  // Time of day preferences
  if (hour >= 9 && hour <= 11) score += 20; // Morning preference
  if (hour >= 14 && hour <= 16) score += 15; // Afternoon preference
  if (hour < 9 || hour > 17) score -= 25; // Penalize early/late

  // Day of week preferences
  if (dayOfWeek >= 1 && dayOfWeek <= 5) score += 10; // Weekdays
  if (dayOfWeek === 0 || dayOfWeek === 6) score -= 15; // Weekends

  // Candidate preferences
  if (candidatePreferences.preferredTimes) {
    const preferred = candidatePreferences.preferredTimes.some(time => {
      const prefHour = parseInt(time.split(':')[0]);
      return Math.abs(hour - prefHour) <= 1;
    });
    if (preferred) score += 25;
  }

  // Urgency constraints
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

module.exports = router;