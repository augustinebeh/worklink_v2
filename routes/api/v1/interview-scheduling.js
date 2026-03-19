/**
 * Interview Scheduling API Routes
 * Provides data for interview scheduling UI components
 */

const express = require('express');
const { db } = require('../../../db');
const { createLogger } = require('../../../utils/structured-logger');
const logger = createLogger('interview-scheduling');

const {
  determineSchedulingStage,
  formatDisplayTime,
  registerCalendarRoutes,
  registerAIRoutes
} = require('./interview-scheduling/helpers/scheduling-handlers');

const router = express.Router();

/**
 * Get interview status for a specific candidate
 * Used by both admin and worker chat interfaces
 */
router.get('/candidate/:candidateId/status', async (req, res) => {
  try {
    const { candidateId } = req.params;

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

    const queueStatus = db.prepare(`
      SELECT * FROM interview_queue
      WHERE candidate_id = ? AND queue_status IN ('waiting', 'contacted', 'scheduled')
      ORDER BY added_at DESC
      LIMIT 1
    `).get(candidateId);

    const conversationStatus = db.prepare(`
      SELECT * FROM slm_conversations
      WHERE candidate_id = ? AND conversation_status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `).get(candidateId);

    const candidate = db.prepare(`
      SELECT id, name, email, phone, status, created_at
      FROM candidates
      WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    res.json({
      success: true,
      data: {
        candidate,
        interview: interviewSlot,
        queueStatus,
        conversationStatus,
        isInSchedulingFlow: !!(interviewSlot || queueStatus || conversationStatus),
        schedulingStage: determineSchedulingStage(interviewSlot, queueStatus, conversationStatus)
      }
    });
  } catch (error) {
    logger.error('Error fetching interview status', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch interview status', error: 'Internal server error' });
  }
});

/**
 * Get available interview slots
 */
router.get('/slots/available', async (req, res) => {
  try {
    const { days = 7, candidateId, timePeriod } = req.query;
    const daysCount = parseInt(days);

    const availableSlots = db.prepare(`
      SELECT
        ca.date, ca.start_time, ca.end_time, ca.consultant_id,
        COUNT(is2.id) as booked_slots
      FROM consultant_availability ca
      LEFT JOIN interview_slots is2 ON ca.date = is2.scheduled_date
        AND is2.scheduled_time >= ca.start_time
        AND is2.scheduled_time < ca.end_time
        AND is2.status IN ('scheduled', 'confirmed')
      WHERE ca.date >= DATE('now')
        AND ca.date <= DATE('now', '+' || ? || ' days')
        AND ca.is_available = 1
        AND ca.slot_type = 'interview'
      GROUP BY ca.date, ca.start_time, ca.end_time, ca.consultant_id
      ORDER BY ca.date, ca.start_time
    `).all(daysCount);

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
          const slotHour = currentTime.getHours();

          let includeSlot = true;
          if (timePeriod === 'morning' && (slotHour < 9 || slotHour >= 13)) {
            includeSlot = false;
          } else if (timePeriod === 'afternoon' && (slotHour < 14 || slotHour >= 18)) {
            includeSlot = false;
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

        currentTime.setMinutes(currentTime.getMinutes() + 30);
      }
    }

    res.json({
      success: true,
      data: { slots: slots.slice(0, 20), totalAvailable: slots.length, period: `${daysCount} days` }
    });
  } catch (error) {
    logger.error('Error fetching available slots', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch available slots', error: 'Internal server error' });
  }
});

/**
 * Schedule an interview (admin interface)
 */
router.post('/candidate/:candidateId/schedule', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { date, time, interviewType = 'onboarding', notes } = req.body;

    if (!date || !time) {
      return res.status(400).json({ success: false, message: 'Date and time are required' });
    }

    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const isSlotAvailable = db.prepare(`
      SELECT COUNT(*) as count
      FROM interview_slots
      WHERE scheduled_date = ? AND scheduled_time = ?
        AND status IN ('scheduled', 'confirmed')
    `).get(date, time).count === 0;

    if (!isSlotAvailable) {
      return res.status(409).json({ success: false, message: 'Selected time slot is no longer available' });
    }

    const meetingId = Math.random().toString(36).substring(2, 15);
    const meetingLink = `https://meet.worklink.com/interview/${meetingId}`;

    const interviewResult = db.prepare(`
      INSERT INTO interview_slots
      (candidate_id, scheduled_date, scheduled_time, duration_minutes, interview_type, meeting_link, notes)
      VALUES (?, ?, ?, 30, ?, ?, ?)
    `).run(candidateId, date, time, interviewType, meetingLink, notes || '');

    const interviewId = interviewResult.lastInsertRowid;

    db.prepare(`
      UPDATE interview_queue
      SET queue_status = 'scheduled', scheduled_for = ?
      WHERE candidate_id = ? AND queue_status IN ('waiting', 'contacted')
    `).run(`${date} ${time}`, candidateId);

    db.prepare(`
      INSERT INTO lead_conversion_log
      (candidate_id, conversion_stage, previous_stage, conversion_method, notes)
      VALUES (?, 'scheduled', ?, 'admin_manual', ?)
    `).run(candidateId, candidate.status, `Interview scheduled for ${date} ${time}`);

    const scheduledInterview = db.prepare(`SELECT * FROM interview_slots WHERE id = ?`).get(interviewId);

    res.json({
      success: true,
      message: 'Interview scheduled successfully',
      data: {
        interviewId,
        interview: { ...scheduledInterview, displayTime: formatDisplayTime(date, time) },
        candidate: { id: candidate.id, name: candidate.name, email: candidate.email }
      }
    });
  } catch (error) {
    logger.error('Error scheduling interview', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to schedule interview', error: 'Internal server error' });
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
      return res.status(400).json({ success: false, message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
    }

    const currentInterview = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(interviewId);
    if (!currentInterview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    db.prepare(`
      UPDATE interview_slots
      SET status = ?, notes = COALESCE(?, notes), completed_at = ?
      WHERE id = ?
    `).run(status, notes, status === 'completed' ? (completedAt || new Date().toISOString()) : null, interviewId);

    if (status === 'completed') {
      const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(currentInterview.candidate_id);
      if (candidate && candidate.status === 'pending') {
        logger.info('Interview completed for pending candidate, consider status update', { candidateId: candidate.id });
      }

      db.prepare(`
        INSERT INTO lead_conversion_log
        (candidate_id, conversion_stage, previous_stage, conversion_method, notes)
        VALUES (?, 'interviewed', ?, 'interview_completed', ?)
      `).run(currentInterview.candidate_id, candidate?.status || 'unknown', `Interview completed: ${notes || 'No additional notes'}`);
    }

    const updatedInterview = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(interviewId);

    res.json({
      success: true,
      message: 'Interview status updated successfully',
      data: { interview: updatedInterview, previousStatus: currentInterview.status }
    });
  } catch (error) {
    logger.error('Error updating interview status', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update interview status', error: 'Internal server error' });
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
      return res.status(400).json({ success: false, message: 'New date and time are required' });
    }

    const currentInterview = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(interviewId);
    if (!currentInterview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    const now = new Date();
    const interviewDateTime = new Date(`${currentInterview.scheduled_date}T${currentInterview.scheduled_time}`);
    const hoursUntilInterview = (interviewDateTime - now) / (1000 * 60 * 60);

    if (hoursUntilInterview <= 24) {
      return res.status(403).json({
        success: false,
        message: 'Interviews cannot be rescheduled within 24 hours of the scheduled time',
        data: { hoursUntilInterview: Math.ceil(hoursUntilInterview), scheduledTime: currentInterview.scheduled_date + ' ' + currentInterview.scheduled_time }
      });
    }

    const isNewSlotAvailable = db.prepare(`
      SELECT COUNT(*) as count
      FROM interview_slots
      WHERE scheduled_date = ? AND scheduled_time = ?
        AND status IN ('scheduled', 'confirmed')
        AND id != ?
    `).get(date, time, interviewId).count === 0;

    if (!isNewSlotAvailable) {
      return res.status(409).json({ success: false, message: 'New time slot is not available' });
    }

    db.prepare(`
      UPDATE interview_slots
      SET scheduled_date = ?, scheduled_time = ?,
          notes = COALESCE(notes || ' | ', '') || 'Rescheduled: ' || ?
      WHERE id = ?
    `).run(date, time, reason || 'No reason provided', interviewId);

    db.prepare(`
      UPDATE interview_queue
      SET scheduled_for = ?
      WHERE candidate_id = ? AND queue_status = 'scheduled'
    `).run(`${date} ${time}`, currentInterview.candidate_id);

    const updatedInterview = db.prepare('SELECT * FROM interview_slots WHERE id = ?').get(interviewId);

    res.json({
      success: true,
      message: 'Interview rescheduled successfully',
      data: {
        interview: { ...updatedInterview, displayTime: formatDisplayTime(date, time) },
        previousTime: {
          date: currentInterview.scheduled_date,
          time: currentInterview.scheduled_time,
          displayTime: formatDisplayTime(currentInterview.scheduled_date, currentInterview.scheduled_time)
        }
      }
    });
  } catch (error) {
    logger.error('Error rescheduling interview', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to reschedule interview', error: 'Internal server error' });
  }
});

/**
 * Get candidate's interview history
 */
router.get('/candidate/:candidateId/history', async (req, res) => {
  try {
    const { candidateId } = req.params;

    const interviews = db.prepare(`
      SELECT is2.*, c.name as candidate_name, c.email as candidate_email
      FROM interview_slots is2
      JOIN candidates c ON is2.candidate_id = c.id
      WHERE is2.candidate_id = ?
      ORDER BY is2.scheduled_date DESC, is2.scheduled_time DESC
    `).all(candidateId);

    const conversationHistory = db.prepare(`
      SELECT * FROM slm_conversations WHERE candidate_id = ? ORDER BY created_at DESC
    `).all(candidateId);

    const conversionHistory = db.prepare(`
      SELECT * FROM lead_conversion_log WHERE candidate_id = ? ORDER BY created_at DESC
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
    logger.error('Error fetching interview history', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch interview history', error: 'Internal server error' });
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

    const queueStats = db.prepare(`
      SELECT
        COUNT(*) as total_in_queue,
        SUM(CASE WHEN queue_status = 'waiting' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN queue_status = 'contacted' THEN 1 ELSE 0 END) as contacted,
        SUM(CASE WHEN queue_status = 'scheduled' THEN 1 ELSE 0 END) as queue_scheduled,
        SUM(CASE WHEN urgency_level = 'high' THEN 1 ELSE 0 END) as high_priority
      FROM interview_queue
    `).get();

    const conversions = db.prepare(`
      SELECT
        COUNT(*) as total_conversions,
        SUM(CASE WHEN conversion_method LIKE '%interview%' THEN 1 ELSE 0 END) as interview_conversions
      FROM lead_conversion_log
      WHERE created_at >= ? AND conversion_stage = 'active'
    `).get(since).total_conversions;

    const completionRate = metrics.total_interviews > 0 ? metrics.completed / metrics.total_interviews : 0;
    const noShowRate = metrics.total_interviews > 0 ? metrics.no_shows / metrics.total_interviews : 0;
    const conversionRate = metrics.completed > 0 ? conversions / metrics.completed : 0;

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
    logger.error('Error fetching scheduling analytics', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch scheduling analytics', error: 'Internal server error' });
  }
});

// Register calendar management routes
registerCalendarRoutes(router);

// Register AI integration routes
registerAIRoutes(router);

module.exports = router;
