/**
 * Interview Scheduling API Routes
 * Provides data for interview scheduling UI components
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();

// Database connection
const dbPath = path.resolve(__dirname, '../../../db/database.db');
let db;

try {
  db = new Database(dbPath);
} catch (error) {
  console.error('Failed to connect to database:', error);
}

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
        is.*,
        ca.date as consultant_date,
        ca.start_time as consultant_start,
        ca.end_time as consultant_end
      FROM interview_slots is
      LEFT JOIN consultant_availability ca ON is.scheduled_date = ca.date
        AND is.scheduled_time >= ca.start_time
        AND is.scheduled_time < ca.end_time
      WHERE is.candidate_id = ?
        AND is.status IN ('scheduled', 'confirmed')
      ORDER BY is.scheduled_date DESC, is.scheduled_time DESC
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
    const { days = 7, candidateId } = req.query;
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
          slots.push({
            date: availability.date,
            time: slotTime,
            consultantId: availability.consultant_id,
            datetime: `${availability.date}T${slotTime}:00`,
            displayTime: formatDisplayTime(availability.date, slotTime)
          });
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

module.exports = router;