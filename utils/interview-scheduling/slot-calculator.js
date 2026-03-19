/**
 * Interview Scheduling Engine - Slot Calculator
 *
 * Extracted slot finding, queue processing, lead conversion,
 * optimization, reminders, and performance metrics logic.
 */

const { createLogger } = require('../structured-logger');
const logger = createLogger('slot-calculator');

/**
 * Process candidates in interview queue and schedule interviews
 */
async function processInterviewQueue(engine) {
  logger.info('Processing interview queue...');

  const queuedCandidates = engine.db.prepare(`
    SELECT iq.*, c.name, c.email, c.phone, c.status as candidate_status
    FROM interview_queue iq
    JOIN candidates c ON iq.candidate_id = c.id
    WHERE iq.queue_status = 'waiting'
    ORDER BY iq.priority_score DESC, iq.added_at ASC
    LIMIT 50
  `).all();

  logger.info('Found ${queuedCandidates.length} candidates in queue');

  const scheduled = [];
  const failed = [];

  for (const candidate of queuedCandidates) {
    try {
      const capacityCheck = await checkInterviewCapacity(engine);

      if (!capacityCheck.canSchedule) {
        logger.info('Capacity limit reached: ${capacityCheck.reason}');
        break;
      }

      const optimalSlot = await findOptimalTimeSlot(engine, candidate);

      if (optimalSlot) {
        const interviewId = await scheduleInterview(engine, candidate, optimalSlot);
        await initiateSLMConversation(engine, candidate, interviewId);

        scheduled.push({ candidateId: candidate.candidate_id, interviewId, slot: optimalSlot });

        engine.db.prepare(`
          UPDATE interview_queue
          SET queue_status = 'scheduled', scheduled_for = ?
          WHERE id = ?
        `).run(`${optimalSlot.date} ${optimalSlot.time}`, candidate.id);

      } else {
        failed.push({ candidateId: candidate.candidate_id, reason: 'no_slots_available' });

        engine.db.prepare(`
          UPDATE interview_queue
          SET contact_attempts = contact_attempts + 1, last_contact_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(candidate.id);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      logger.error('Failed to schedule candidate ${candidate.candidate_id}:', { error: error });
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
async function managePendingLeadConversions(engine) {
  logger.info('Managing pending lead conversions with SLM...');

  const pendingLeads = engine.db.prepare(`
    SELECT c.*,
           JULIANDAY('now') - JULIANDAY(c.created_at) as days_pending
    FROM candidates c
    LEFT JOIN lead_conversion_log lcl ON c.id = lcl.candidate_id
    WHERE c.status = 'pending'
      AND (lcl.conversion_stage IS NULL OR lcl.conversion_stage = 'pending')
      AND JULIANDAY('now') - JULIANDAY(c.created_at) <= ?
    ORDER BY c.created_at ASC
    LIMIT 30
  `).all(engine.config.pendingToActiveConversion.maxPendingDays);

  logger.info('Found ${pendingLeads.length} pending leads for conversion');

  const conversions = { contacted: 0, scheduled: 0, converted: 0, failed: 0 };

  for (const lead of pendingLeads) {
    try {
      const conversionResult = await attemptSLMConversion(engine, lead);

      if (conversionResult.success) {
        conversions[conversionResult.action]++;

        engine.db.prepare(`
          INSERT INTO lead_conversion_log
          (candidate_id, conversion_stage, previous_stage, conversion_method, slm_conversation_id, notes)
          VALUES (?, ?, 'pending', 'slm_auto', ?, ?)
        `).run(lead.id, conversionResult.action, conversionResult.conversationId, conversionResult.notes || '');
      } else {
        conversions.failed++;
      }

    } catch (error) {
      logger.error('SLM conversion failed for lead ${lead.id}:', { error: error });
      conversions.failed++;
    }
  }

  return { totalProcessed: pendingLeads.length, conversions };
}

/**
 * Find optimal time slot for candidate interview
 */
async function findOptimalTimeSlot(engine, candidate) {
  logger.info('Finding optimal slot for candidate ${candidate.candidate_id}');

  const availableSlots = engine.db.prepare(`
    SELECT ca.date, ca.start_time, ca.end_time
    FROM consultant_availability ca
    WHERE ca.date >= DATE('now')
      AND ca.date <= DATE('now', '+7 days')
      AND ca.is_available = 1
      AND ca.slot_type = 'interview'
    ORDER BY ca.date, ca.start_time
  `).all();

  for (const slot of availableSlots) {
    const slotsNeeded = Math.ceil(engine.config.slotDuration / 30);

    if (await engine.isSlotAvailable(slot.date, slot.start_time, slotsNeeded)) {
      const timeSlot = engine.generateTimeSlot(slot.date, slot.start_time);
      logger.info('Found optimal slot: ${timeSlot.date} ${timeSlot.time}');
      return timeSlot;
    }
  }

  logger.info('No available slots found');
  return null;
}

/**
 * Schedule interview for candidate
 */
async function scheduleInterview(engine, candidate, timeSlot) {
  logger.info('Scheduling interview for candidate ${candidate.candidate_id}');

  const meetingLink = engine.generateMeetingLink();

  const stmt = engine.db.prepare(`
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

  logger.info('Interview scheduled with ID: ${result.lastInsertRowid}');
  return result.lastInsertRowid;
}

/**
 * Check interview capacity constraints
 */
async function checkInterviewCapacity(engine) {
  const today = new Date().toISOString().split('T')[0];
  const weekStart = engine.getWeekStart(new Date()).toISOString().split('T')[0];
  const weekEnd = engine.getWeekEnd(new Date()).toISOString().split('T')[0];

  const dailyCount = engine.db.prepare(`
    SELECT COUNT(*) as count FROM interview_slots
    WHERE scheduled_date = ? AND status IN ('scheduled', 'confirmed')
  `).get(today).count;

  const weeklyCount = engine.db.prepare(`
    SELECT COUNT(*) as count FROM interview_slots
    WHERE scheduled_date BETWEEN ? AND ? AND status IN ('scheduled', 'confirmed')
  `).get(weekStart, weekEnd).count;

  if (dailyCount >= engine.config.maxDailyInterviews) {
    return { canSchedule: false, reason: 'Daily interview limit reached' };
  }

  if (weeklyCount >= engine.config.maxWeeklyInterviews) {
    return { canSchedule: false, reason: 'Weekly interview limit reached' };
  }

  return {
    canSchedule: true,
    dailyRemaining: engine.config.maxDailyInterviews - dailyCount,
    weeklyRemaining: engine.config.maxWeeklyInterviews - weeklyCount
  };
}

/**
 * Optimize scheduling based on performance data
 */
async function optimizeScheduling(engine) {
  logger.info('Optimizing scheduling based on performance...');

  const noShowAnalysis = engine.db.prepare(`
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

  const highRiskSlots = noShowAnalysis.filter(slot => slot.no_show_rate > 20);

  for (const riskSlot of highRiskSlots) {
    logger.info('High no-show rate detected: ${riskSlot.day_of_week} ${riskSlot.hour}:00 (${riskSlot.no_show_rate}%)');
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
async function sendReminders(engine) {
  logger.info('Sending automated reminders...');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const upcomingInterviews = engine.db.prepare(`
    SELECT is2.*, c.name, c.email, c.phone
    FROM interview_slots is2
    JOIN candidates c ON is2.candidate_id = c.id
    WHERE is2.scheduled_date = ?
      AND is2.status IN ('scheduled', 'confirmed')
      AND is2.reminder_sent = 0
  `).all(tomorrowStr);

  let remindersSent = 0;

  for (const interview of upcomingInterviews) {
    try {
      await sendInterviewReminder(engine, interview);

      engine.db.prepare(`
        UPDATE interview_slots SET reminder_sent = 1 WHERE id = ?
      `).run(interview.id);

      remindersSent++;
    } catch (error) {
      logger.error('Failed to send reminder for interview ${interview.id}:', { error: error });
    }
  }

  return { upcomingInterviews: upcomingInterviews.length, remindersSent };
}

/**
 * Update performance metrics
 */
async function updatePerformanceMetrics(engine) {
  logger.info('Updating performance metrics...');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const performance = engine.db.prepare(`
    SELECT
      COUNT(*) as total_scheduled,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as total_completed,
      SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as total_no_shows,
      AVG(duration_minutes) as avg_duration
    FROM interview_slots
    WHERE scheduled_date = ?
  `).get(yesterdayStr);

  const conversions = engine.db.prepare(`
    SELECT COUNT(*) as total_conversions
    FROM lead_conversion_log
    WHERE DATE(created_at) = ? AND conversion_stage = 'active' AND conversion_method LIKE '%interview%'
  `).get(yesterdayStr).total_conversions;

  const totalHours = performance.total_completed * (performance.avg_duration / 60);
  const efficiency = totalHours > 0 ? performance.total_completed / totalHours : 0;

  engine.db.prepare(`
    INSERT OR REPLACE INTO interview_performance
    (date, total_scheduled, total_completed, total_no_shows, total_conversions, avg_interview_duration, efficiency_score)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(yesterdayStr, performance.total_scheduled, performance.total_completed,
    performance.total_no_shows, conversions, performance.avg_duration || 30, efficiency);

  return {
    date: yesterdayStr,
    performance: { ...performance, total_conversions: conversions, efficiency_score: Math.round(efficiency * 100) / 100 }
  };
}

/**
 * Initiate SLM conversation for interview confirmation
 */
async function initiateSLMConversation(engine, candidate, interviewId) {
  logger.info('Initiating SLM conversation for candidate ${candidate.candidate_id}');

  const conversationId = `conv_${candidate.candidate_id}_${Date.now()}`;

  engine.db.prepare(`
    INSERT INTO slm_conversations
    (conversation_id, candidate_id, scheduled_interview_id, conversation_status)
    VALUES (?, ?, ?, 'active')
  `).run(conversationId, candidate.candidate_id, interviewId);

  const initialMessage = generateInitialSLMMessage(engine, candidate, interviewId);
  await sendSLMMessage(engine, conversationId, initialMessage);

  return conversationId;
}

/**
 * Generate initial SLM message for candidate
 */
function generateInitialSLMMessage(engine, candidate, interviewId) {
  const interview = engine.db.prepare(`SELECT * FROM interview_slots WHERE id = ?`).get(interviewId);

  const dateTime = `${interview.scheduled_date} ${interview.scheduled_time}`;
  const formattedDateTime = engine.formatDateTime(dateTime);

  return {
    type: 'interview_confirmation',
    content: `Hi ${candidate.name}!

Great news! I've scheduled your onboarding interview for ${formattedDateTime}.

Interview Details:
- Date & Time: ${formattedDateTime}
- Duration: 30 minutes
- Meeting Link: ${interview.meeting_link}
- Type: Onboarding Interview

Please reply with:
1. "CONFIRM" to confirm your attendance
2. "RESCHEDULE" if you need a different time
3. Any questions you might have

Looking forward to meeting you!

Best regards,
WorkLink Recruitment Team`,
    metadata: { interviewId, candidateId: candidate.candidate_id, scheduledTime: dateTime }
  };
}

/**
 * Attempt SLM conversion for pending lead
 */
async function attemptSLMConversion(engine, lead) {
  logger.info('Attempting SLM conversion for lead ${lead.id}');

  const conversationId = `conv_${lead.id}_${Date.now()}`;
  const conversionApproach = analyzeLeadForConversion(lead);
  const message = generateConversionMessage(lead, conversionApproach);
  const messageSent = await sendSLMMessage(engine, conversationId, message);

  if (messageSent) {
    if (conversionApproach.conversionProbability > 0.7) {
      await engine.addToInterviewQueue(lead, conversionApproach.priority);
    }

    return { success: true, action: 'contacted', conversationId, notes: `Conversion approach: ${conversionApproach.strategy}` };
  }

  return { success: false, reason: 'Message delivery failed' };
}

/**
 * Analyze lead for conversion
 */
function analyzeLeadForConversion(lead) {
  let score = 0.5;
  let strategy = 'standard';

  if (lead.days_pending > 2) score += 0.2;
  if (lead.days_pending < 1) score += 0.1;
  if (lead.email && lead.phone) score += 0.1;
  if (!lead.email && !lead.phone) score -= 0.3;

  if (score > 0.7) strategy = 'high_priority';
  else if (score < 0.3) strategy = 'gentle_approach';

  return { conversionProbability: Math.min(1, Math.max(0, score)), strategy, priority: score };
}

/**
 * Generate conversion message
 */
function generateConversionMessage(lead, approach) {
  const messages = {
    high_priority: `Hi ${lead.name}! Ready to get started with some exciting opportunities? I have several positions that match your profile perfectly. When would be a good time for a quick 15-minute chat to discuss your career goals?`,
    standard: `Hello ${lead.name}, thank you for your interest in our opportunities. I'd love to learn more about your career aspirations and share some positions that might be a great fit. Are you available for a brief conversation this week?`,
    gentle_approach: `Hi ${lead.name}, I hope you're doing well! I wanted to follow up on your inquiry about job opportunities. No pressure at all - just wondering if you're still exploring new career options? If so, I'm here to help!`
  };

  return {
    type: 'lead_conversion',
    content: messages[approach.strategy] || messages.standard,
    metadata: { leadId: lead.id, strategy: approach.strategy, probability: approach.conversionProbability }
  };
}

/**
 * Send SLM message (simulated)
 */
async function sendSLMMessage(engine, conversationId, message) {
  logger.info('Sending SLM message for conversation ${conversationId}');
  logger.info('Message: ${message.content.substring(0, 100)}...');

  engine.db.prepare(`
    UPDATE slm_conversations SET message_count = message_count + 1, last_message_at = CURRENT_TIMESTAMP
    WHERE conversation_id = ?
  `).run(conversationId);

  return true;
}

/**
 * Send interview reminder
 */
async function sendInterviewReminder(engine, interview) {
  const reminderMessage = `Interview Reminder

Hi ${interview.name},

This is a friendly reminder about your interview tomorrow:

Date: ${engine.formatDate(interview.scheduled_date)}
Time: ${engine.formatTime(interview.scheduled_time)}
Meeting Link: ${interview.meeting_link}
Duration: ${interview.duration_minutes} minutes

Please ensure you have:
- Stable internet connection
- Quiet environment
- Your resume/documents ready
- Questions about the role

If you need to reschedule, please contact us ASAP.

Looking forward to meeting you!

WorkLink Team`;

  logger.info('Sending reminder to ${interview.name} (${interview.email})');
  return true;
}

module.exports = {
  processInterviewQueue,
  managePendingLeadConversions,
  findOptimalTimeSlot,
  scheduleInterview,
  checkInterviewCapacity,
  optimizeScheduling,
  sendReminders,
  updatePerformanceMetrics,
  initiateSLMConversation,
  attemptSLMConversion,
  analyzeLeadForConversion,
  generateConversionMessage
};
