/**
 * AI-Powered Interview Scheduling & Onboarding Engine
 * Solves pain point: "Onboarding candidates at scale"
 *
 * This system automatically:
 * - Schedules interviews based on consultant availability
 * - Manages pending → active lead conversion
 * - Uses SLM for intelligent conversation handling
 * - Optimizes interview queue for maximum efficiency
 * - Prevents consultant overwhelm with smart capacity management
 */

const Database = require('better-sqlite3');
const path = require('path');

class InterviewSchedulingEngine {
  constructor() {
    const dbPath = path.resolve(__dirname, '../db/database.db');
    this.db = new Database(dbPath);

    // Scheduling configuration
    this.config = {
      // Working hours (24-hour format)
      workingHours: {
        start: 9,  // 9 AM
        end: 18,   // 6 PM
        timezone: 'Asia/Singapore'
      },

      // Working days (0 = Sunday, 1 = Monday, etc.)
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday

      // Interview slots
      slotDuration: 30, // minutes
      bufferTime: 15,   // minutes between interviews
      maxDailyInterviews: 20, // Maximum interviews per day
      maxWeeklyInterviews: 100, // Maximum interviews per week

      // Conversion targets
      pendingToActiveConversion: {
        targetRate: 0.70, // 70% conversion rate target
        maxPendingDays: 3, // Convert pending leads within 3 days
        followUpInterval: 24, // Hours between follow-ups
        maxFollowUps: 3 // Maximum follow-up attempts
      },

      // SLM (Small Language Model) integration
      slmConfig: {
        model: 'gpt-4o-mini', // Cost-effective model for lead conversion
        temperature: 0.7,
        maxTokens: 500,
        conversationContext: 3 // Remember last 3 messages
      }
    };

    // Initialize database tables
    this.initializeSchedulingTables();
  }

  initializeSchedulingTables() {
    // Create consultant availability table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS consultant_availability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        consultant_id TEXT DEFAULT 'primary',
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_available BOOLEAN DEFAULT 1,
        slot_type TEXT DEFAULT 'interview', -- 'interview', 'break', 'blocked'
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create interview slots table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS interview_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_id INTEGER NOT NULL,
        consultant_id TEXT DEFAULT 'primary',
        scheduled_date DATE NOT NULL,
        scheduled_time TIME NOT NULL,
        duration_minutes INTEGER DEFAULT 30,
        status TEXT DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
        interview_type TEXT DEFAULT 'onboarding', -- 'onboarding', 'screening', 'follow_up'
        meeting_link TEXT,
        reminder_sent BOOLEAN DEFAULT 0,
        confirmation_sent BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        notes TEXT
      )
    `);

    // Create lead conversion tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS lead_conversion_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_id INTEGER NOT NULL,
        conversion_stage TEXT NOT NULL, -- 'pending', 'contacted', 'scheduled', 'interviewed', 'active', 'rejected'
        previous_stage TEXT,
        conversion_method TEXT, -- 'manual', 'slm_auto', 'slm_followup', 'scheduled_interview'
        slm_conversation_id TEXT,
        success_factors TEXT, -- JSON array of factors that led to conversion
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create SLM conversation logs
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS slm_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT UNIQUE NOT NULL,
        candidate_id INTEGER NOT NULL,
        message_count INTEGER DEFAULT 0,
        conversation_status TEXT DEFAULT 'active', -- 'active', 'converted', 'abandoned', 'escalated'
        conversion_intent_score REAL DEFAULT 0, -- 0-1 score of conversion likelihood
        last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        scheduled_interview_id INTEGER,
        conversation_summary TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scheduled_interview_id) REFERENCES interview_slots(id)
      )
    `);

    // Create interview queue management
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS interview_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_id INTEGER NOT NULL,
        priority_score REAL DEFAULT 0.5, -- 0-1 priority based on candidate quality + urgency
        queue_status TEXT DEFAULT 'waiting', -- 'waiting', 'contacted', 'scheduled', 'processed'
        preferred_times TEXT, -- JSON array of candidate preferred time slots
        contact_attempts INTEGER DEFAULT 0,
        last_contact_at DATETIME,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        scheduled_for DATETIME,
        urgency_level TEXT DEFAULT 'normal' -- 'low', 'normal', 'high', 'urgent'
      )
    `);

    // Create interview performance tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS interview_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL,
        total_scheduled INTEGER DEFAULT 0,
        total_completed INTEGER DEFAULT 0,
        total_no_shows INTEGER DEFAULT 0,
        total_conversions INTEGER DEFAULT 0, -- pending → active
        avg_interview_duration REAL DEFAULT 30,
        consultant_satisfaction_score REAL DEFAULT 0, -- 1-10 scale
        candidate_satisfaction_score REAL DEFAULT 0, -- 1-10 scale
        efficiency_score REAL DEFAULT 0, -- interviews per hour
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Initialize default availability (Monday to Friday, 9 AM - 6 PM)
    this.initializeDefaultAvailability();
  }

  initializeDefaultAvailability() {
    // Check if availability already exists
    const hasAvailability = this.db.prepare(`
      SELECT COUNT(*) as count FROM consultant_availability
      WHERE date >= DATE('now')
    `).get().count;

    if (hasAvailability === 0) {
      console.log('📅 Initializing default consultant availability...');

      // Create availability for next 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);

        const dayOfWeek = date.getDay();

        // Only create availability for working days
        if (this.config.workingDays.includes(dayOfWeek)) {
          const dateStr = date.toISOString().split('T')[0];

          // Create morning slot (9 AM - 1 PM)
          this.db.prepare(`
            INSERT INTO consultant_availability (date, start_time, end_time, slot_type)
            VALUES (?, '09:00', '13:00', 'interview')
          `).run(dateStr);

          // Create afternoon slot (2 PM - 6 PM)
          this.db.prepare(`
            INSERT INTO consultant_availability (date, start_time, end_time, slot_type)
            VALUES (?, '14:00', '18:00', 'interview')
          `).run(dateStr);
        }
      }
    }
  }

  /**
   * Main scheduling orchestration - runs continuously to manage interview pipeline
   */
  async runSchedulingEngine() {
    try {
      console.log('🎯 Starting interview scheduling engine...');

      const results = await Promise.all([
        this.processInterviewQueue(),
        this.managePendingLeadConversions(),
        this.optimizeScheduling(),
        this.sendReminders(),
        this.updatePerformanceMetrics()
      ]);

      const summary = {
        queueProcessed: results[0],
        conversionsManaged: results[1],
        optimizationResults: results[2],
        remindersSent: results[3],
        performanceUpdated: results[4]
      };

      console.log('✅ Scheduling engine cycle complete:', summary);
      return { success: true, results: summary };

    } catch (error) {
      console.error('❌ Scheduling engine failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process candidates in interview queue and schedule interviews
   */
  async processInterviewQueue() {
    console.log('📋 Processing interview queue...');

    // Get candidates waiting for interview scheduling
    const queuedCandidates = this.db.prepare(`
      SELECT iq.*, c.name, c.email, c.phone, c.status as candidate_status
      FROM interview_queue iq
      JOIN candidates c ON iq.candidate_id = c.id
      WHERE iq.queue_status = 'waiting'
      ORDER BY iq.priority_score DESC, iq.added_at ASC
      LIMIT 50
    `).all();

    console.log(`📊 Found ${queuedCandidates.length} candidates in queue`);

    const scheduled = [];
    const failed = [];

    for (const candidate of queuedCandidates) {
      try {
        // Check if we can schedule more interviews today/this week
        const capacityCheck = await this.checkInterviewCapacity();

        if (!capacityCheck.canSchedule) {
          console.log(`⏰ Capacity limit reached: ${capacityCheck.reason}`);
          break;
        }

        // Find optimal time slot for this candidate
        const optimalSlot = await this.findOptimalTimeSlot(candidate);

        if (optimalSlot) {
          // Schedule the interview
          const interviewId = await this.scheduleInterview(candidate, optimalSlot);

          // Initiate SLM conversation to confirm
          await this.initiateSLMConversation(candidate, interviewId);

          scheduled.push({ candidateId: candidate.candidate_id, interviewId, slot: optimalSlot });

          // Update queue status
          this.db.prepare(`
            UPDATE interview_queue
            SET queue_status = 'scheduled', scheduled_for = ?
            WHERE id = ?
          `).run(`${optimalSlot.date} ${optimalSlot.time}`, candidate.id);

        } else {
          // No available slots, mark for follow-up
          failed.push({ candidateId: candidate.candidate_id, reason: 'no_slots_available' });

          this.db.prepare(`
            UPDATE interview_queue
            SET contact_attempts = contact_attempts + 1, last_contact_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(candidate.id);
        }

        // Add small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Failed to schedule candidate ${candidate.candidate_id}:`, error);
        failed.push({ candidateId: candidate.candidate_id, reason: error.message });
      }
    }

    return {
      processed: queuedCandidates.length,
      scheduled: scheduled.length,
      failed: failed.length,
      scheduledInterviews: scheduled,
      failures: failed
    };
  }

  /**
   * Manage pending lead conversions using SLM
   */
  async managePendingLeadConversions() {
    console.log('🤖 Managing pending lead conversions with SLM...');

    // Get pending leads that need conversion
    const pendingLeads = this.db.prepare(`
      SELECT c.*,
             JULIANDAY('now') - JULIANDAY(c.created_at) as days_pending
      FROM candidates c
      LEFT JOIN lead_conversion_log lcl ON c.id = lcl.candidate_id
      WHERE c.status = 'pending'
        AND (lcl.conversion_stage IS NULL OR lcl.conversion_stage = 'pending')
        AND JULIANDAY('now') - JULIANDAY(c.created_at) <= ?
      ORDER BY c.created_at ASC
      LIMIT 30
    `).all(this.config.pendingToActiveConversion.maxPendingDays);

    console.log(`🎯 Found ${pendingLeads.length} pending leads for conversion`);

    const conversions = { contacted: 0, scheduled: 0, converted: 0, failed: 0 };

    for (const lead of pendingLeads) {
      try {
        const conversionResult = await this.attemptSLMConversion(lead);

        if (conversionResult.success) {
          conversions[conversionResult.action]++;

          // Log conversion attempt
          this.db.prepare(`
            INSERT INTO lead_conversion_log
            (candidate_id, conversion_stage, previous_stage, conversion_method, slm_conversation_id, notes)
            VALUES (?, ?, 'pending', 'slm_auto', ?, ?)
          `).run(
            lead.id,
            conversionResult.action,
            conversionResult.conversationId,
            conversionResult.notes || ''
          );
        } else {
          conversions.failed++;
        }

      } catch (error) {
        console.error(`❌ SLM conversion failed for lead ${lead.id}:`, error);
        conversions.failed++;
      }
    }

    return {
      totalProcessed: pendingLeads.length,
      conversions
    };
  }

  /**
   * Find optimal time slot for candidate interview
   */
  async findOptimalTimeSlot(candidate) {
    console.log(`🔍 Finding optimal slot for candidate ${candidate.candidate_id}`);

    // Get available slots for next 7 days
    const availableSlots = this.db.prepare(`
      SELECT ca.date, ca.start_time, ca.end_time
      FROM consultant_availability ca
      WHERE ca.date >= DATE('now')
        AND ca.date <= DATE('now', '+7 days')
        AND ca.is_available = 1
        AND ca.slot_type = 'interview'
      ORDER BY ca.date, ca.start_time
    `).all();

    // Check each slot for conflicts
    for (const slot of availableSlots) {
      const slotsNeeded = Math.ceil(this.config.slotDuration / 30); // 30-min base slots

      if (await this.isSlotAvailable(slot.date, slot.start_time, slotsNeeded)) {
        // Found available slot
        const timeSlot = this.generateTimeSlot(slot.date, slot.start_time);

        console.log(`✅ Found optimal slot: ${timeSlot.date} ${timeSlot.time}`);
        return timeSlot;
      }
    }

    console.log('❌ No available slots found');
    return null;
  }

  /**
   * Check if specific time slot is available
   */
  async isSlotAvailable(date, startTime, slotsNeeded = 1) {
    // Check for existing interviews at this time
    const conflicts = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM interview_slots
      WHERE scheduled_date = ?
        AND scheduled_time >= ?
        AND scheduled_time < TIME(?, '+' || (? * 30) || ' minutes')
        AND status IN ('scheduled', 'confirmed')
    `).get(date, startTime, startTime, slotsNeeded).count;

    // Check daily interview limit
    const dailyCount = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM interview_slots
      WHERE scheduled_date = ?
        AND status IN ('scheduled', 'confirmed')
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
   * Schedule interview for candidate
   */
  async scheduleInterview(candidate, timeSlot) {
    console.log(`📅 Scheduling interview for candidate ${candidate.candidate_id}`);

    const meetingLink = this.generateMeetingLink();

    const stmt = this.db.prepare(`
      INSERT INTO interview_slots
      (candidate_id, scheduled_date, scheduled_time, duration_minutes, interview_type, meeting_link)
      VALUES (?, ?, ?, ?, 'onboarding', ?)
    `);

    const result = stmt.run(
      candidate.candidate_id,
      timeSlot.date,
      timeSlot.time,
      timeSlot.duration,
      meetingLink
    );

    console.log(`✅ Interview scheduled with ID: ${result.lastInsertRowid}`);
    return result.lastInsertRowid;
  }

  /**
   * Initiate SLM conversation for interview confirmation
   */
  async initiateSLMConversation(candidate, interviewId) {
    console.log(`🤖 Initiating SLM conversation for candidate ${candidate.candidate_id}`);

    const conversationId = `conv_${candidate.candidate_id}_${Date.now()}`;

    // Create conversation record
    this.db.prepare(`
      INSERT INTO slm_conversations
      (conversation_id, candidate_id, scheduled_interview_id, conversation_status)
      VALUES (?, ?, ?, 'active')
    `).run(conversationId, candidate.candidate_id, interviewId);

    // Generate initial message
    const initialMessage = this.generateInitialSLMMessage(candidate, interviewId);

    // Send initial message (simulated - would integrate with actual messaging platform)
    await this.sendSLMMessage(conversationId, initialMessage);

    return conversationId;
  }

  /**
   * Generate initial SLM message for candidate
   */
  generateInitialSLMMessage(candidate, interviewId) {
    const interview = this.db.prepare(`
      SELECT * FROM interview_slots WHERE id = ?
    `).get(interviewId);

    const dateTime = `${interview.scheduled_date} ${interview.scheduled_time}`;
    const formattedDateTime = this.formatDateTime(dateTime);

    return {
      type: 'interview_confirmation',
      content: `Hi ${candidate.name}! 👋

Great news! I've scheduled your onboarding interview for ${formattedDateTime}.

📅 Interview Details:
• Date & Time: ${formattedDateTime}
• Duration: 30 minutes
• Meeting Link: ${interview.meeting_link}
• Type: Onboarding Interview

Please reply with:
1. "CONFIRM" to confirm your attendance
2. "RESCHEDULE" if you need a different time
3. Any questions you might have

Looking forward to meeting you!

Best regards,
WorkLink Recruitment Team`,
      metadata: {
        interviewId,
        candidateId: candidate.candidate_id,
        scheduledTime: dateTime
      }
    };
  }

  /**
   * Attempt SLM conversion for pending lead
   */
  async attemptSLMConversion(lead) {
    console.log(`🎯 Attempting SLM conversion for lead ${lead.id}`);

    const conversationId = `conv_${lead.id}_${Date.now()}`;

    // Analyze lead for conversion approach
    const conversionApproach = this.analyzeLeadForConversion(lead);

    // Generate personalized conversion message
    const message = this.generateConversionMessage(lead, conversionApproach);

    // Send message and track response
    const messageSent = await this.sendSLMMessage(conversationId, message);

    if (messageSent) {
      // Add to interview queue if high conversion probability
      if (conversionApproach.conversionProbability > 0.7) {
        await this.addToInterviewQueue(lead, conversionApproach.priority);
      }

      return {
        success: true,
        action: 'contacted',
        conversationId,
        notes: `Conversion approach: ${conversionApproach.strategy}`
      };
    }

    return { success: false, reason: 'Message delivery failed' };
  }

  /**
   * Add candidate to interview queue
   */
  async addToInterviewQueue(candidate, priority = 0.5) {
    console.log(`📋 Adding candidate ${candidate.id} to interview queue`);

    // Check if already in queue
    const existing = this.db.prepare(`
      SELECT id FROM interview_queue WHERE candidate_id = ? AND queue_status IN ('waiting', 'contacted')
    `).get(candidate.id);

    if (existing) {
      console.log('Candidate already in queue');
      return existing.id;
    }

    const stmt = this.db.prepare(`
      INSERT INTO interview_queue
      (candidate_id, priority_score, urgency_level)
      VALUES (?, ?, ?)
    `);

    const urgencyLevel = priority > 0.8 ? 'high' : priority > 0.6 ? 'normal' : 'low';

    const result = stmt.run(candidate.id, priority, urgencyLevel);
    return result.lastInsertRowid;
  }

  /**
   * Check interview capacity constraints
   */
  async checkInterviewCapacity() {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = this.getWeekStart(new Date()).toISOString().split('T')[0];
    const weekEnd = this.getWeekEnd(new Date()).toISOString().split('T')[0];

    // Check daily capacity
    const dailyCount = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM interview_slots
      WHERE scheduled_date = ? AND status IN ('scheduled', 'confirmed')
    `).get(today).count;

    // Check weekly capacity
    const weeklyCount = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM interview_slots
      WHERE scheduled_date BETWEEN ? AND ? AND status IN ('scheduled', 'confirmed')
    `).get(weekStart, weekEnd).count;

    if (dailyCount >= this.config.maxDailyInterviews) {
      return { canSchedule: false, reason: 'Daily interview limit reached' };
    }

    if (weeklyCount >= this.config.maxWeeklyInterviews) {
      return { canSchedule: false, reason: 'Weekly interview limit reached' };
    }

    return {
      canSchedule: true,
      dailyRemaining: this.config.maxDailyInterviews - dailyCount,
      weeklyRemaining: this.config.maxWeeklyInterviews - weeklyCount
    };
  }

  /**
   * Optimize scheduling based on performance data
   */
  async optimizeScheduling() {
    console.log('📊 Optimizing scheduling based on performance...');

    // Analyze no-show patterns
    const noShowAnalysis = this.db.prepare(`
      SELECT
        strftime('%H', scheduled_time) as hour,
        strftime('%w', scheduled_date) as day_of_week,
        COUNT(*) as total_interviews,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
        ROUND(
          CAST(SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) AS FLOAT) /
          COUNT(*) * 100, 2
        ) as no_show_rate
      FROM interview_slots
      WHERE created_at > DATE('now', '-30 days')
      GROUP BY hour, day_of_week
      HAVING total_interviews >= 5
      ORDER BY no_show_rate DESC
    `).all();

    // Identify high-risk time slots
    const highRiskSlots = noShowAnalysis.filter(slot => slot.no_show_rate > 20);

    // Update availability to reduce scheduling during high-risk times
    for (const riskSlot of highRiskSlots) {
      console.log(`⚠️ High no-show rate detected: ${riskSlot.day_of_week} ${riskSlot.hour}:00 (${riskSlot.no_show_rate}%)`);
      // Could implement automatic slot blocking or priority reduction
    }

    return {
      analyzedSlots: noShowAnalysis.length,
      highRiskSlots: highRiskSlots.length,
      optimizationActions: highRiskSlots.length
    };
  }

  /**
   * Send automated reminders
   */
  async sendReminders() {
    console.log('🔔 Sending automated reminders...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get interviews scheduled for tomorrow that need reminders
    const upcomingInterviews = this.db.prepare(`
      SELECT is.*, c.name, c.email, c.phone
      FROM interview_slots is
      JOIN candidates c ON is.candidate_id = c.id
      WHERE is.scheduled_date = ?
        AND is.status IN ('scheduled', 'confirmed')
        AND is.reminder_sent = 0
    `).all(tomorrowStr);

    let remindersSent = 0;

    for (const interview of upcomingInterviews) {
      try {
        await this.sendInterviewReminder(interview);

        // Mark reminder as sent
        this.db.prepare(`
          UPDATE interview_slots
          SET reminder_sent = 1
          WHERE id = ?
        `).run(interview.id);

        remindersSent++;

      } catch (error) {
        console.error(`Failed to send reminder for interview ${interview.id}:`, error);
      }
    }

    return {
      upcomingInterviews: upcomingInterviews.length,
      remindersSent
    };
  }

  /**
   * Update performance metrics
   */
  async updatePerformanceMetrics() {
    console.log('📈 Updating performance metrics...');

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Calculate yesterday's performance
    const performance = this.db.prepare(`
      SELECT
        COUNT(*) as total_scheduled,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as total_completed,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as total_no_shows,
        AVG(duration_minutes) as avg_duration
      FROM interview_slots
      WHERE scheduled_date = ?
    `).get(yesterdayStr);

    // Calculate conversion rate (interviews → active candidates)
    const conversions = this.db.prepare(`
      SELECT COUNT(*) as total_conversions
      FROM lead_conversion_log
      WHERE DATE(created_at) = ?
        AND conversion_stage = 'active'
        AND conversion_method LIKE '%interview%'
    `).get(yesterdayStr).total_conversions;

    // Calculate efficiency (interviews per hour worked)
    const totalHours = performance.total_completed * (performance.avg_duration / 60);
    const efficiency = totalHours > 0 ? performance.total_completed / totalHours : 0;

    // Insert performance record
    this.db.prepare(`
      INSERT OR REPLACE INTO interview_performance
      (date, total_scheduled, total_completed, total_no_shows, total_conversions, avg_interview_duration, efficiency_score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      yesterdayStr,
      performance.total_scheduled,
      performance.total_completed,
      performance.total_no_shows,
      conversions,
      performance.avg_duration || 30,
      efficiency
    );

    return {
      date: yesterdayStr,
      performance: {
        ...performance,
        total_conversions: conversions,
        efficiency_score: Math.round(efficiency * 100) / 100
      }
    };
  }

  /**
   * Helper methods
   */

  analyzeLeadForConversion(lead) {
    // Simple scoring algorithm - could be enhanced with ML
    let score = 0.5; // Base score
    let strategy = 'standard';

    // Age of lead (urgency)
    if (lead.days_pending > 2) score += 0.2;
    if (lead.days_pending < 1) score += 0.1;

    // Contact information completeness
    if (lead.email && lead.phone) score += 0.1;
    if (!lead.email && !lead.phone) score -= 0.3;

    // Set strategy based on score
    if (score > 0.7) strategy = 'high_priority';
    else if (score < 0.3) strategy = 'gentle_approach';

    return {
      conversionProbability: Math.min(1, Math.max(0, score)),
      strategy,
      priority: score
    };
  }

  generateConversionMessage(lead, approach) {
    const messages = {
      high_priority: `Hi ${lead.name}! 👋 Ready to get started with some exciting opportunities? I have several positions that match your profile perfectly. When would be a good time for a quick 15-minute chat to discuss your career goals?`,

      standard: `Hello ${lead.name}, thank you for your interest in our opportunities. I'd love to learn more about your career aspirations and share some positions that might be a great fit. Are you available for a brief conversation this week?`,

      gentle_approach: `Hi ${lead.name}, I hope you're doing well! I wanted to follow up on your inquiry about job opportunities. No pressure at all - just wondering if you're still exploring new career options? If so, I'm here to help!`
    };

    return {
      type: 'lead_conversion',
      content: messages[approach.strategy] || messages.standard,
      metadata: {
        leadId: lead.id,
        strategy: approach.strategy,
        probability: approach.conversionProbability
      }
    };
  }

  async sendSLMMessage(conversationId, message) {
    // Simulate message sending - would integrate with actual messaging platform
    console.log(`📤 Sending SLM message for conversation ${conversationId}`);
    console.log(`Message: ${message.content.substring(0, 100)}...`);

    // Update conversation log
    this.db.prepare(`
      UPDATE slm_conversations
      SET message_count = message_count + 1, last_message_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ?
    `).run(conversationId);

    return true; // Simulate successful delivery
  }

  async sendInterviewReminder(interview) {
    const reminderMessage = `🔔 Interview Reminder

Hi ${interview.name},

This is a friendly reminder about your interview tomorrow:

📅 Date: ${this.formatDate(interview.scheduled_date)}
⏰ Time: ${this.formatTime(interview.scheduled_time)}
🔗 Meeting Link: ${interview.meeting_link}
⏱️ Duration: ${interview.duration_minutes} minutes

Please ensure you have:
✅ Stable internet connection
✅ Quiet environment
✅ Your resume/documents ready
✅ Questions about the role

If you need to reschedule, please contact us ASAP.

Looking forward to meeting you!

WorkLink Team`;

    console.log(`📤 Sending reminder to ${interview.name} (${interview.email})`);
    // Would integrate with email/SMS service
    return true;
  }

  generateMeetingLink() {
    // Generate meeting link (could integrate with Zoom, Teams, etc.)
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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-SG', {
      timeZone: this.config.workingHours.timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-SG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    return new Date(d.setDate(diff));
  }

  getWeekEnd(date) {
    const weekStart = this.getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd;
  }

  /**
   * Public API methods
   */

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
      SELECT
        COUNT(*) as scheduled_today,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_today
      FROM interview_slots
      WHERE scheduled_date = ?
    `).get(today);

    const queueStatus = this.db.prepare(`
      SELECT
        COUNT(*) as total_in_queue,
        SUM(CASE WHEN urgency_level = 'high' THEN 1 ELSE 0 END) as high_priority
      FROM interview_queue
      WHERE queue_status = 'waiting'
    `).get();

    const capacityCheck = await this.checkInterviewCapacity();

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
    console.log('🛑 Emergency stop activated - Pausing all scheduling');

    // Pause all pending interviews
    this.db.prepare(`
      UPDATE interview_queue
      SET queue_status = 'paused'
      WHERE queue_status = 'waiting'
    `).run();

    // Mark availability as unavailable for today
    const today = new Date().toISOString().split('T')[0];
    this.db.prepare(`
      UPDATE consultant_availability
      SET is_available = 0, notes = 'Emergency pause activated'
      WHERE date = ?
    `).run(today);

    return { success: true, message: 'All scheduling paused immediately' };
  }

  async resumeScheduling() {
    console.log('▶️ Resuming scheduling activities');

    // Resume queue processing
    this.db.prepare(`
      UPDATE interview_queue
      SET queue_status = 'waiting'
      WHERE queue_status = 'paused'
    `).run();

    // Restore availability
    const today = new Date().toISOString().split('T')[0];
    this.db.prepare(`
      UPDATE consultant_availability
      SET is_available = 1, notes = NULL
      WHERE date >= ? AND slot_type = 'interview'
    `).run(today);

    return { success: true, message: 'Scheduling activities resumed' };
  }

  /**
   * Health check method for SLM bridge verification
   */
  async isHealthy() {
    try {
      // Test database connectivity
      const testQuery = this.db.prepare('SELECT COUNT(*) as count FROM interview_queue LIMIT 1').get();

      // Test basic scheduling operations
      const today = new Date().toISOString().split('T')[0];
      const availabilityCheck = this.db.prepare(`
        SELECT COUNT(*) as available_slots
        FROM consultant_availability
        WHERE date >= ? AND is_available = 1
        LIMIT 5
      `).get(today);

      // Test slot availability function
      const testSlot = await this.isSlotAvailable(today, '10:00');

      return !!(testQuery && availabilityCheck && typeof testSlot === 'boolean');

    } catch (error) {
      console.error('Interview Scheduling Engine health check failed:', error);
      return false;
    }
  }
}

module.exports = InterviewSchedulingEngine;