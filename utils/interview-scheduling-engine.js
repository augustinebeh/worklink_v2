/**
 * AI-Powered Interview Scheduling & Onboarding Engine
 * Solves pain point: "Onboarding candidates at scale"
 *
 * This system automatically:
 * - Schedules interviews based on consultant availability
 * - Manages pending -> active lead conversion
 * - Uses SLM for intelligent conversation handling
 * - Optimizes interview queue for maximum efficiency
 * - Prevents consultant overwhelm with smart capacity management
 */

const { createLogger } = require('./structured-logger');
const logger = createLogger('interview-scheduling-engine');

const slotCalc = require('./interview-scheduling/slot-calculator');

class InterviewSchedulingEngine {
  constructor() {
    const { db } = require('../db');
    this.db = db;

    // Scheduling configuration
    this.config = {
      workingHours: { start: 9, end: 18, timezone: 'Asia/Singapore' },
      workingDays: [1, 2, 3, 4, 5],
      slotDuration: 30,
      bufferTime: 15,
      maxDailyInterviews: 20,
      maxWeeklyInterviews: 100,
      pendingToActiveConversion: {
        targetRate: 0.70,
        maxPendingDays: 3,
        followUpInterval: 24,
        maxFollowUps: 3
      },
      slmConfig: {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 500,
        conversationContext: 3
      }
    };

    this.initializeSchedulingTables();
  }

  initializeSchedulingTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS consultant_availability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        consultant_id TEXT DEFAULT 'primary',
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_available BOOLEAN DEFAULT 1,
        slot_type TEXT DEFAULT 'interview',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS interview_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_id INTEGER NOT NULL,
        consultant_id TEXT DEFAULT 'primary',
        scheduled_date DATE NOT NULL,
        scheduled_time TIME NOT NULL,
        duration_minutes INTEGER DEFAULT 30,
        status TEXT DEFAULT 'scheduled',
        interview_type TEXT DEFAULT 'onboarding',
        meeting_link TEXT,
        reminder_sent BOOLEAN DEFAULT 0,
        confirmation_sent BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        notes TEXT
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS lead_conversion_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_id INTEGER NOT NULL,
        conversion_stage TEXT NOT NULL,
        previous_stage TEXT,
        conversion_method TEXT,
        slm_conversation_id TEXT,
        success_factors TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS slm_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT UNIQUE NOT NULL,
        candidate_id INTEGER NOT NULL,
        message_count INTEGER DEFAULT 0,
        conversation_status TEXT DEFAULT 'active',
        conversion_intent_score REAL DEFAULT 0,
        last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        scheduled_interview_id INTEGER,
        conversation_summary TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scheduled_interview_id) REFERENCES interview_slots(id)
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS interview_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_id INTEGER NOT NULL,
        priority_score REAL DEFAULT 0.5,
        queue_status TEXT DEFAULT 'waiting',
        preferred_times TEXT,
        contact_attempts INTEGER DEFAULT 0,
        last_contact_at DATETIME,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        scheduled_for DATETIME,
        urgency_level TEXT DEFAULT 'normal'
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS interview_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL,
        total_scheduled INTEGER DEFAULT 0,
        total_completed INTEGER DEFAULT 0,
        total_no_shows INTEGER DEFAULT 0,
        total_conversions INTEGER DEFAULT 0,
        avg_interview_duration REAL DEFAULT 30,
        consultant_satisfaction_score REAL DEFAULT 0,
        candidate_satisfaction_score REAL DEFAULT 0,
        efficiency_score REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.initializeDefaultAvailability();
  }

  initializeDefaultAvailability() {
    const hasAvailability = this.db.prepare(`
      SELECT COUNT(*) as count FROM consultant_availability WHERE date >= DATE('now')
    `).get().count;

    if (hasAvailability === 0) {
      logger.info('Initializing default consultant availability');

      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dayOfWeek = date.getDay();

        if (this.config.workingDays.includes(dayOfWeek)) {
          const dateStr = date.toISOString().split('T')[0];

          this.db.prepare(`
            INSERT INTO consultant_availability (date, start_time, end_time, slot_type)
            VALUES (?, '09:00', '13:00', 'interview')
          `).run(dateStr);

          this.db.prepare(`
            INSERT INTO consultant_availability (date, start_time, end_time, slot_type)
            VALUES (?, '14:00', '18:00', 'interview')
          `).run(dateStr);
        }
      }
    }
  }

  /**
   * Main scheduling orchestration
   */
  async runSchedulingEngine() {
    try {
      logger.info('Starting interview scheduling engine');

      const results = await Promise.all([
        slotCalc.processInterviewQueue(this),
        slotCalc.managePendingLeadConversions(this),
        slotCalc.optimizeScheduling(this),
        slotCalc.sendReminders(this),
        slotCalc.updatePerformanceMetrics(this)
      ]);

      const summary = {
        queueProcessed: results[0],
        conversionsManaged: results[1],
        optimizationResults: results[2],
        remindersSent: results[3],
        performanceUpdated: results[4]
      };

      logger.info('Scheduling engine cycle complete', summary);
      return { success: true, results: summary };

    } catch (error) {
      logger.error('Scheduling engine failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if specific time slot is available
   */
  async isSlotAvailable(date, startTime, slotsNeeded = 1) {
    const conflicts = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM interview_slots
      WHERE scheduled_date = ?
        AND scheduled_time >= ?
        AND scheduled_time < TIME(?, '+' || (? * 30) || ' minutes')
        AND status IN ('scheduled', 'confirmed')
    `).get(date, startTime, startTime, slotsNeeded).count;

    const dailyCount = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM interview_slots
      WHERE scheduled_date = ? AND status IN ('scheduled', 'confirmed')
    `).get(date).count;

    return conflicts === 0 && dailyCount < this.config.maxDailyInterviews;
  }

  /**
   * Generate formatted time slot
   */
  generateTimeSlot(date, startTime) {
    return {
      date,
      time: startTime,
      endTime: this.addMinutesToTime(startTime, this.config.slotDuration),
      duration: this.config.slotDuration
    };
  }

  /**
   * Schedule interview for candidate (public API - delegates to slot calculator)
   */
  async scheduleInterview(candidate, timeSlot) {
    return slotCalc.scheduleInterview(this, candidate, timeSlot);
  }

  /**
   * Add candidate to interview queue
   */
  async addToInterviewQueue(candidate, priority = 0.5) {
    logger.info('Adding candidate ${candidate.id} to interview queue');

    const existing = this.db.prepare(`
      SELECT id FROM interview_queue WHERE candidate_id = ? AND queue_status IN ('waiting', 'contacted')
    `).get(candidate.id);

    if (existing) {
      logger.info('Candidate already in queue');
      return existing.id;
    }

    const urgencyLevel = priority > 0.8 ? 'high' : priority > 0.6 ? 'normal' : 'low';

    const result = this.db.prepare(`
      INSERT INTO interview_queue (candidate_id, priority_score, urgency_level)
      VALUES (?, ?, ?)
    `).run(candidate.id, priority, urgencyLevel);

    return result.lastInsertRowid;
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  generateMeetingLink() {
    const meetingId = Math.random().toString(36).substring(2, 15);
    return `https://meet.worklink.com/interview/${meetingId}`;
  }

  addMinutesToTime(timeStr, minutes) {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  }

  formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-SG', {
      timeZone: this.config.workingHours.timezone,
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-SG', {
      timeZone: this.config.workingHours.timezone,
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  getWeekEnd(date) {
    const weekStart = this.getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd;
  }

  // =====================================================
  // PUBLIC API METHODS
  // =====================================================

  async getSchedulingAnalytics(days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const analytics = this.db.prepare(`
      SELECT
        DATE(scheduled_date) as date,
        COUNT(*) as total_scheduled,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
        AVG(duration_minutes) as avg_duration
      FROM interview_slots
      WHERE scheduled_date >= ?
      GROUP BY DATE(scheduled_date)
      ORDER BY date DESC
    `).all(since);

    const summary = analytics.reduce((acc, day) => ({
      totalScheduled: acc.totalScheduled + day.total_scheduled,
      totalCompleted: acc.totalCompleted + day.completed,
      totalNoShows: acc.totalNoShows + day.no_shows,
      avgDuration: (acc.avgDuration + day.avg_duration) / 2
    }), { totalScheduled: 0, totalCompleted: 0, totalNoShows: 0, avgDuration: 0 });

    const conversionRate = this.db.prepare(`
      SELECT COUNT(*) as conversions
      FROM lead_conversion_log
      WHERE created_at >= ? AND conversion_stage = 'active'
    `).get(since).conversions;

    return {
      period: `${days} days`,
      summary: {
        ...summary,
        completionRate: summary.totalScheduled > 0 ? summary.totalCompleted / summary.totalScheduled : 0,
        noShowRate: summary.totalScheduled > 0 ? summary.totalNoShows / summary.totalScheduled : 0,
        conversionRate: summary.totalCompleted > 0 ? conversionRate / summary.totalCompleted : 0
      },
      dailyBreakdown: analytics
    };
  }

  async getCurrentSchedulingStatus() {
    const today = new Date().toISOString().split('T')[0];

    const todayStats = this.db.prepare(`
      SELECT COUNT(*) as scheduled_today,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_today
      FROM interview_slots WHERE scheduled_date = ?
    `).get(today);

    const queueStatus = this.db.prepare(`
      SELECT COUNT(*) as total_in_queue,
        SUM(CASE WHEN urgency_level = 'high' THEN 1 ELSE 0 END) as high_priority
      FROM interview_queue WHERE queue_status = 'waiting'
    `).get();

    const capacityCheck = await slotCalc.checkInterviewCapacity(this);

    return {
      todayScheduled: todayStats.scheduled_today,
      todayCompleted: todayStats.completed_today,
      queueLength: queueStatus.total_in_queue,
      highPriorityQueue: queueStatus.high_priority,
      capacity: capacityCheck,
      lastUpdate: new Date().toISOString()
    };
  }

  async emergencyStopScheduling() {
    logger.info('Emergency stop activated - Pausing all scheduling');
    this.db.prepare(`UPDATE interview_queue SET queue_status = 'paused' WHERE queue_status = 'waiting'`).run();
    const today = new Date().toISOString().split('T')[0];
    this.db.prepare(`UPDATE consultant_availability SET is_available = 0, notes = 'Emergency pause activated' WHERE date = ?`).run(today);
    return { success: true, message: 'All scheduling paused immediately' };
  }

  async resumeScheduling() {
    logger.info('Resuming scheduling activities');
    this.db.prepare(`UPDATE interview_queue SET queue_status = 'waiting' WHERE queue_status = 'paused'`).run();
    const today = new Date().toISOString().split('T')[0];
    this.db.prepare(`UPDATE consultant_availability SET is_available = 1, notes = NULL WHERE date >= ? AND slot_type = 'interview'`).run(today);
    return { success: true, message: 'Scheduling activities resumed' };
  }

  /**
   * Health check method for SLM bridge verification
   */
  async isHealthy() {
    try {
      const testQuery = this.db.prepare('SELECT COUNT(*) as count FROM interview_queue LIMIT 1').get();
      const today = new Date().toISOString().split('T')[0];
      const availabilityCheck = this.db.prepare(`
        SELECT COUNT(*) as available_slots FROM consultant_availability
        WHERE date >= ? AND is_available = 1 LIMIT 5
      `).get(today);
      const testSlot = await this.isSlotAvailable(today, '10:00');
      return !!(testQuery && availabilityCheck && typeof testSlot === 'boolean');
    } catch (error) {
      logger.error('Interview Scheduling Engine health check failed:', { error: error });
      return false;
    }
  }
}

module.exports = InterviewSchedulingEngine;
