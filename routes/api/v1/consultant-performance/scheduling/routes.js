/**
 * Scheduling Routes
 * Endpoints for interview scheduling automation
 * 
 * @module consultant-performance/scheduling/routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const InterviewSchedulingEngine = require('../../../../../utils/interview-scheduling-engine');

const schedulingEngine = new InterviewSchedulingEngine();

/**
 * POST /scheduling/run-engine
 * Execute scheduling engine cycle
 */
router.post('/run-engine', async (req, res) => {
  try {
    const result = await schedulingEngine.runSchedulingEngine();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /scheduling/status
 * Get current scheduling system status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await schedulingEngine.getCurrentSchedulingStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /scheduling/analytics
 * Get interview scheduling analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const analytics = await schedulingEngine.getSchedulingAnalytics(parseInt(days));
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /scheduling/calendar
 * Get calendar view of scheduled interviews
 */
router.get('/calendar', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const startDate = start_date || new Date().toISOString().split('T')[0];
    const endDate = end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const interviews = db.prepare(`
      SELECT
        is.id,
        is.scheduled_date,
        is.scheduled_time,
        is.duration_minutes,
        is.status,
        is.interview_type,
        c.name as candidate_name,
        c.email as candidate_email,
        c.phone as candidate_phone
      FROM interview_slots is
      JOIN candidates c ON is.candidate_id = c.id
      WHERE is.scheduled_date BETWEEN ? AND ?
      ORDER BY is.scheduled_date, is.scheduled_time
    `).all(startDate, endDate);

    const availability = db.prepare(`
      SELECT date, start_time, end_time, is_available, slot_type
      FROM consultant_availability
      WHERE date BETWEEN ? AND ?
      ORDER BY date, start_time
    `).all(startDate, endDate);

    res.json({
      success: true,
      data: {
        interviews,
        availability,
        period: { start: startDate, end: endDate }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /scheduling/queue
 * Get interview queue status
 */
router.get('/queue', async (req, res) => {
  try {
    const queue = db.prepare(`
      SELECT
        iq.id,
        iq.priority_score,
        iq.queue_status,
        iq.urgency_level,
        iq.contact_attempts,
        iq.added_at,
        c.name as candidate_name,
        c.email as candidate_email,
        c.status as candidate_status
      FROM interview_queue iq
      JOIN candidates c ON iq.candidate_id = c.id
      WHERE iq.queue_status IN ('waiting', 'contacted')
      ORDER BY iq.priority_score DESC, iq.added_at ASC
    `).all();

    const queueStats = db.prepare(`
      SELECT
        queue_status,
        urgency_level,
        COUNT(*) as count
      FROM interview_queue
      GROUP BY queue_status, urgency_level
    `).all();

    res.json({
      success: true,
      data: {
        queue,
        stats: queueStats,
        totalInQueue: queue.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /scheduling/add-to-queue
 * Add candidate to interview queue
 */
router.post('/add-to-queue', async (req, res) => {
  try {
    const { candidateId, priority = 0.5, urgencyLevel = 'normal' } = req.body;

    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);

    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    const queueId = await schedulingEngine.addToInterviewQueue(candidate, priority);

    res.json({
      success: true,
      data: {
        queueId,
        candidateId,
        message: 'Candidate added to interview queue'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /scheduling/emergency-stop
 * Emergency stop all scheduling activities
 */
router.post('/emergency-stop', async (req, res) => {
  try {
    const result = await schedulingEngine.emergencyStopScheduling();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /scheduling/resume
 * Resume scheduling activities
 */
router.post('/resume', async (req, res) => {
  try {
    const result = await schedulingEngine.resumeScheduling();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /scheduling/availability
 * Update consultant availability
 */
router.put('/availability', async (req, res) => {
  try {
    const { date, startTime, endTime, isAvailable = true, slotType = 'interview' } = req.body;

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO consultant_availability
      (date, start_time, end_time, is_available, slot_type)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(date, startTime, endTime, isAvailable ? 1 : 0, slotType);

    res.json({
      success: true,
      data: {
        message: 'Availability updated successfully',
        date,
        timeSlot: `${startTime} - ${endTime}`,
        available: isAvailable
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
