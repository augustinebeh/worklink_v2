/**
 * Automated Follow-up Sequences System
 * WorkLink v2 - Intelligent follow-up automation
 *
 * Features:
 * - Multi-step follow-up sequences
 * - Conditional logic and branching
 * - Time-based triggers
 * - Multi-channel follow-ups
 * - Response-based automation
 * - Engagement-based optimization
 */

const { db } = require('../db');
const { generateOutreachMessage } = require('./claude');
const { createOutreachCampaign, CHANNELS } = require('./candidate-outreach');
const { trackEngagement } = require('./engagement-tracking');

/**
 * Follow-up sequence trigger types
 */
const TRIGGER_TYPES = {
  NO_RESPONSE: 'no_response',              // No response to previous message
  JOB_DECLINED: 'job_declined',            // Candidate declined a job
  JOB_COMPLETED: 'job_completed',          // Job completed successfully
  ONBOARDING_INCOMPLETE: 'onboarding_incomplete', // Incomplete onboarding
  LOW_ENGAGEMENT: 'low_engagement',        // Low engagement score
  REACTIVATION: 'reactivation',           // Reactivate inactive candidates
  SKILL_UPDATE: 'skill_update',           // New skills or certifications
  SEASONAL: 'seasonal',                   // Seasonal/holiday campaigns
};

/**
 * Follow-up action types
 */
const ACTION_TYPES = {
  SEND_MESSAGE: 'send_message',
  SEND_EMAIL: 'send_email',
  CREATE_TASK: 'create_task',
  UPDATE_CANDIDATE: 'update_candidate',
  TRIGGER_CAMPAIGN: 'trigger_campaign',
  WAIT: 'wait',
  END_SEQUENCE: 'end_sequence',
  CONDITIONAL: 'conditional',
};

/**
 * Default follow-up sequences
 */
const DEFAULT_SEQUENCES = {
  NO_RESPONSE_JOB: {
    id: 'NO_RESPONSE_JOB',
    name: 'Job Application No Response Follow-up',
    description: 'Follow up with candidates who haven\'t responded to job invitations',
    triggerType: TRIGGER_TYPES.NO_RESPONSE,
    triggerConditions: {
      noResponseHours: 24,
      maxAttempts: 3,
      jobSpecific: true,
    },
    steps: [
      {
        id: 'step_1',
        type: ACTION_TYPES.WAIT,
        delay: { hours: 24 },
        description: 'Wait 24 hours after initial contact',
      },
      {
        id: 'step_2',
        type: ACTION_TYPES.SEND_MESSAGE,
        channel: CHANNELS.WHATSAPP,
        template: 'follow_up_reminder',
        personalizedMessage: true,
        description: 'Send gentle reminder about job opportunity',
      },
      {
        id: 'step_3',
        type: ACTION_TYPES.WAIT,
        delay: { hours: 48 },
        description: 'Wait 48 hours for response',
      },
      {
        id: 'step_4',
        type: ACTION_TYPES.CONDITIONAL,
        condition: 'no_response',
        trueAction: {
          type: ACTION_TYPES.SEND_MESSAGE,
          channel: CHANNELS.WHATSAPP,
          template: 'final_opportunity',
          description: 'Send final opportunity message',
        },
        falseAction: {
          type: ACTION_TYPES.END_SEQUENCE,
          reason: 'candidate_responded',
        },
      },
      {
        id: 'step_5',
        type: ACTION_TYPES.WAIT,
        delay: { hours: 72 },
        description: 'Wait 72 hours for final response',
      },
      {
        id: 'step_6',
        type: ACTION_TYPES.END_SEQUENCE,
        reason: 'max_attempts_reached',
        updateCandidate: {
          tags: ['needs_manual_follow_up'],
          notes: 'Did not respond to 3 follow-up attempts',
        },
      },
    ],
  },

  RE_ENGAGEMENT: {
    id: 'RE_ENGAGEMENT',
    name: 'Candidate Re-engagement Sequence',
    description: 'Re-engage inactive candidates with new opportunities',
    triggerType: TRIGGER_TYPES.LOW_ENGAGEMENT,
    triggerConditions: {
      inactiveDays: 30,
      minPreviousJobs: 1,
      maxEngagementScore: 20,
    },
    steps: [
      {
        id: 'step_1',
        type: ACTION_TYPES.SEND_MESSAGE,
        channel: CHANNELS.WHATSAPP,
        template: 'we_miss_you',
        personalizedMessage: true,
        description: 'Send re-engagement message',
      },
      {
        id: 'step_2',
        type: ACTION_TYPES.WAIT,
        delay: { days: 3 },
        description: 'Wait 3 days for response',
      },
      {
        id: 'step_3',
        type: ACTION_TYPES.CONDITIONAL,
        condition: 'has_response',
        trueAction: {
          type: ACTION_TYPES.TRIGGER_CAMPAIGN,
          campaignType: 'skill_match',
          description: 'Start skill-based opportunity campaign',
        },
        falseAction: {
          type: ACTION_TYPES.SEND_EMAIL,
          template: 'alternative_opportunities',
          description: 'Send email with broader opportunities',
        },
      },
      {
        id: 'step_4',
        type: ACTION_TYPES.WAIT,
        delay: { weeks: 2 },
        description: 'Wait 2 weeks before final attempt',
      },
      {
        id: 'step_5',
        type: ACTION_TYPES.SEND_MESSAGE,
        channel: CHANNELS.WHATSAPP,
        template: 'final_check_in',
        description: 'Final check-in message',
      },
      {
        id: 'step_6',
        type: ACTION_TYPES.END_SEQUENCE,
        reason: 'reengagement_complete',
        updateCandidate: {
          tags: ['reengagement_attempted'],
          lastContactAttempt: new Date().toISOString(),
        },
      },
    ],
  },

  POST_JOB_COMPLETION: {
    id: 'POST_JOB_COMPLETION',
    name: 'Post-Job Completion Follow-up',
    description: 'Follow up after successful job completion for feedback and new opportunities',
    triggerType: TRIGGER_TYPES.JOB_COMPLETED,
    triggerConditions: {
      jobCompleted: true,
      rating: { min: 4 },
      immediately: true,
    },
    steps: [
      {
        id: 'step_1',
        type: ACTION_TYPES.WAIT,
        delay: { hours: 2 },
        description: 'Wait 2 hours after job completion',
      },
      {
        id: 'step_2',
        type: ACTION_TYPES.SEND_MESSAGE,
        channel: CHANNELS.WHATSAPP,
        template: 'job_completion_thanks',
        personalizedMessage: true,
        description: 'Thank candidate for completing job',
      },
      {
        id: 'step_3',
        type: ACTION_TYPES.WAIT,
        delay: { days: 1 },
        description: 'Wait 1 day',
      },
      {
        id: 'step_4',
        type: ACTION_TYPES.SEND_MESSAGE,
        channel: CHANNELS.WHATSAPP,
        template: 'new_opportunities',
        description: 'Share new relevant opportunities',
      },
      {
        id: 'step_5',
        type: ACTION_TYPES.WAIT,
        delay: { days: 7 },
        description: 'Wait 1 week',
      },
      {
        id: 'step_6',
        type: ACTION_TYPES.CONDITIONAL,
        condition: 'applied_to_new_job',
        trueAction: {
          type: ACTION_TYPES.END_SEQUENCE,
          reason: 'candidate_active',
        },
        falseAction: {
          type: ACTION_TYPES.SEND_MESSAGE,
          channel: CHANNELS.WHATSAPP,
          template: 'availability_check',
          description: 'Check availability for upcoming weeks',
        },
      },
      {
        id: 'step_7',
        type: ACTION_TYPES.END_SEQUENCE,
        reason: 'sequence_complete',
      },
    ],
  },
};

/**
 * Create a new follow-up sequence
 */
function createFollowUpSequence(sequenceData) {
  const {
    id = `SEQ${Date.now()}`,
    name,
    description = '',
    triggerType,
    triggerConditions = {},
    steps = [],
    active = true,
  } = sequenceData;

  try {
    const insertSequenceStmt = db.prepare(`
      INSERT INTO follow_up_sequences
      (id, name, description, trigger_type, trigger_conditions, sequence_data, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    insertSequenceStmt.run(
      id,
      name,
      description,
      triggerType,
      JSON.stringify(triggerConditions),
      JSON.stringify(steps),
      active ? 1 : 0
    );

    console.log(`🔄 [Follow-up] Created sequence: ${name} (${id})`);

    return { sequenceId: id, success: true };
  } catch (error) {
    console.error('Error creating follow-up sequence:', error);
    throw error;
  }
}

/**
 * Trigger a follow-up sequence for a candidate
 */
function triggerFollowUpSequence(candidateId, sequenceId, triggerEvent, triggerData = {}) {
  try {
    const sequence = db.prepare('SELECT * FROM follow_up_sequences WHERE id = ? AND active = 1').get(sequenceId);
    if (!sequence) {
      throw new Error('Sequence not found or inactive');
    }

    // Check if candidate already has an active instance of this sequence
    const existingInstance = db.prepare(`
      SELECT id FROM follow_up_instances
      WHERE candidate_id = ? AND sequence_id = ? AND status = 'active'
    `).get(candidateId, sequenceId);

    if (existingInstance) {
      console.log(`🔄 [Follow-up] Candidate ${candidateId} already has active instance of sequence ${sequenceId}`);
      return { instanceId: existingInstance.id, status: 'already_active' };
    }

    const instanceId = `INST${Date.now()}_${candidateId}`;

    // Create follow-up instance
    const insertInstanceStmt = db.prepare(`
      INSERT INTO follow_up_instances
      (id, sequence_id, candidate_id, trigger_event, trigger_data, current_step, status, next_action_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    // Calculate first action time
    const steps = JSON.parse(sequence.sequence_data);
    const firstStep = steps[0];
    const nextActionAt = calculateNextActionTime(firstStep);

    insertInstanceStmt.run(
      instanceId,
      sequenceId,
      candidateId,
      triggerEvent,
      JSON.stringify(triggerData),
      0,
      'active',
      nextActionAt
    );

    console.log(`🔄 [Follow-up] Triggered sequence "${sequence.name}" for candidate ${candidateId} (${instanceId})`);

    return { instanceId, success: true, nextActionAt };
  } catch (error) {
    console.error('Error triggering follow-up sequence:', error);
    throw error;
  }
}

/**
 * Process pending follow-up actions
 */
async function processFollowUpActions() {
  try {
    // Get all instances that need action
    const pendingInstances = db.prepare(`
      SELECT fi.*, fs.sequence_data, fs.name as sequence_name, c.name as candidate_name
      FROM follow_up_instances fi
      JOIN follow_up_sequences fs ON fi.sequence_id = fs.id
      JOIN candidates c ON fi.candidate_id = c.id
      WHERE fi.status = 'active'
        AND fi.next_action_at <= datetime('now')
      ORDER BY fi.next_action_at ASC
    `).all();

    console.log(`🔄 [Follow-up] Processing ${pendingInstances.length} pending actions`);

    let processed = 0;
    let errors = 0;

    for (const instance of pendingInstances) {
      try {
        await processFollowUpInstance(instance);
        processed++;
      } catch (error) {
        console.error(`Failed to process instance ${instance.id}:`, error);
        errors++;

        // Mark instance as failed if too many errors
        if (errors > 5) {
          updateFollowUpInstance(instance.id, {
            status: 'failed',
            error: 'Too many processing errors',
          });
        }
      }

      // Small delay between processing instances
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`🔄 [Follow-up] Processed ${processed} instances, ${errors} errors`);

    return { processed, errors };
  } catch (error) {
    console.error('Error processing follow-up actions:', error);
    throw error;
  }
}

/**
 * Process a single follow-up instance
 */
async function processFollowUpInstance(instance) {
  const steps = JSON.parse(instance.sequence_data);
  const currentStepIndex = instance.current_step;
  const currentStep = steps[currentStepIndex];

  if (!currentStep) {
    // Sequence complete
    updateFollowUpInstance(instance.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
    return;
  }

  console.log(`🔄 [Follow-up] Processing step ${currentStepIndex + 1} for instance ${instance.id}: ${currentStep.type}`);

  let nextStepIndex = currentStepIndex + 1;
  let nextActionAt = null;
  let sequenceComplete = false;

  switch (currentStep.type) {
    case ACTION_TYPES.SEND_MESSAGE:
      await executeSendMessage(instance, currentStep);
      break;

    case ACTION_TYPES.SEND_EMAIL:
      await executeSendEmail(instance, currentStep);
      break;

    case ACTION_TYPES.WAIT:
      // Wait step - calculate next action time
      nextActionAt = calculateNextActionTime(currentStep);
      break;

    case ACTION_TYPES.CONDITIONAL:
      const conditionResult = await evaluateCondition(instance, currentStep.condition);
      const nextAction = conditionResult ? currentStep.trueAction : currentStep.falseAction;

      if (nextAction.type === ACTION_TYPES.END_SEQUENCE) {
        sequenceComplete = true;
      } else {
        await executeAction(instance, nextAction);
      }
      break;

    case ACTION_TYPES.END_SEQUENCE:
      sequenceComplete = true;
      await executeEndSequence(instance, currentStep);
      break;

    case ACTION_TYPES.TRIGGER_CAMPAIGN:
      await executeTriggerCampaign(instance, currentStep);
      break;

    case ACTION_TYPES.UPDATE_CANDIDATE:
      await executeUpdateCandidate(instance, currentStep);
      break;

    default:
      console.warn(`Unknown action type: ${currentStep.type}`);
  }

  // Update instance
  if (sequenceComplete) {
    updateFollowUpInstance(instance.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  } else {
    const updateData = {
      current_step: nextStepIndex,
      updated_at: new Date().toISOString(),
    };

    if (nextActionAt) {
      updateData.next_action_at = nextActionAt;
    } else if (nextStepIndex < steps.length) {
      // Calculate next action time based on next step
      updateData.next_action_at = calculateNextActionTime(steps[nextStepIndex]);
    }

    updateFollowUpInstance(instance.id, updateData);

    // Update completed steps
    const completedSteps = JSON.parse(instance.completed_steps || '[]');
    completedSteps.push(currentStep.id);

    db.prepare(`
      UPDATE follow_up_instances
      SET completed_steps = ?
      WHERE id = ?
    `).run(JSON.stringify(completedSteps), instance.id);
  }
}

/**
 * Execute send message action
 */
async function executeSendMessage(instance, step) {
  try {
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(instance.candidate_id);
    const triggerData = JSON.parse(instance.trigger_data || '{}');

    let message;

    if (step.personalizedMessage && triggerData.jobId) {
      // Generate personalized message for job
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(triggerData.jobId);
      if (job) {
        message = await generateOutreachMessage(candidate, job);
      }
    }

    if (!message) {
      // Use template or default message
      message = generateTemplateMessage(step.template, candidate, instance);
    }

    // Log the message (would integrate with actual messaging service)
    console.log(`💬 [Follow-up] Sending ${step.channel} message to ${candidate.name}: ${message.substring(0, 100)}...`);

    // Track engagement
    trackEngagement(candidate.id, 'MESSAGE_SENT', {
      source: 'follow_up_sequence',
      sequenceId: instance.sequence_id,
      instanceId: instance.id,
      step: step.id,
    });

    // TODO: Integrate with actual messaging service
    return { success: true, messageId: `msg_${Date.now()}` };
  } catch (error) {
    console.error('Error executing send message:', error);
    throw error;
  }
}

/**
 * Execute send email action
 */
async function executeSendEmail(instance, step) {
  try {
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(instance.candidate_id);

    if (!candidate.email) {
      console.warn(`No email address for candidate ${candidate.id}`);
      return { success: false, reason: 'no_email' };
    }

    const message = generateTemplateMessage(step.template, candidate, instance);

    console.log(`📧 [Follow-up] Sending email to ${candidate.name} (${candidate.email})`);

    // TODO: Integrate with email service

    return { success: true, messageId: `email_${Date.now()}` };
  } catch (error) {
    console.error('Error executing send email:', error);
    throw error;
  }
}

/**
 * Execute trigger campaign action
 */
async function executeTriggerCampaign(instance, step) {
  try {
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(instance.candidate_id);

    const campaignResult = await createOutreachCampaign({
      name: `Follow-up Campaign: ${step.campaignType}`,
      type: step.campaignType,
      targetCriteria: {
        candidateIds: [candidate.id],
        maxCandidates: 1,
      },
      channels: [CHANNELS.WHATSAPP],
      autoStart: true,
    });

    console.log(`🚀 [Follow-up] Triggered campaign for candidate ${candidate.id}: ${campaignResult.campaignId}`);

    return campaignResult;
  } catch (error) {
    console.error('Error triggering campaign:', error);
    throw error;
  }
}

/**
 * Execute update candidate action
 */
async function executeUpdateCandidate(instance, step) {
  try {
    const updates = step.updateCandidate || step.updateData || {};

    if (updates.tags) {
      // Add tags
      const candidate = db.prepare('SELECT tags FROM candidates WHERE id = ?').get(instance.candidate_id);
      const existingTags = JSON.parse(candidate.tags || '[]');
      const newTags = [...new Set([...existingTags, ...updates.tags])];

      db.prepare('UPDATE candidates SET tags = ? WHERE id = ?').run(
        JSON.stringify(newTags),
        instance.candidate_id
      );
    }

    if (updates.notes) {
      // Add note
      db.prepare('UPDATE candidates SET notes = notes || ? WHERE id = ?').run(
        `\n[Follow-up ${new Date().toISOString()}] ${updates.notes}`,
        instance.candidate_id
      );
    }

    console.log(`📝 [Follow-up] Updated candidate ${instance.candidate_id}`);

    return { success: true };
  } catch (error) {
    console.error('Error updating candidate:', error);
    throw error;
  }
}

/**
 * Execute end sequence action
 */
async function executeEndSequence(instance, step) {
  console.log(`🏁 [Follow-up] Ending sequence for instance ${instance.id}: ${step.reason || 'sequence_complete'}`);

  if (step.updateCandidate) {
    await executeUpdateCandidate(instance, step);
  }

  return { success: true, reason: step.reason };
}

/**
 * Evaluate conditional logic
 */
async function evaluateCondition(instance, condition) {
  const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(instance.candidate_id);

  switch (condition) {
    case 'no_response':
      // Check if candidate has responded in the last 24 hours
      const recentResponse = db.prepare(`
        SELECT COUNT(*) as count
        FROM candidate_engagement
        WHERE candidate_id = ?
          AND engagement_type IN ('MESSAGE_REPLY', 'JOB_APPLY', 'JOB_ACCEPT')
          AND created_at >= datetime('now', '-24 hours')
      `).get(instance.candidate_id);
      return recentResponse.count === 0;

    case 'has_response':
      return !await evaluateCondition(instance, 'no_response');

    case 'applied_to_new_job':
      const recentApplication = db.prepare(`
        SELECT COUNT(*) as count
        FROM candidate_engagement
        WHERE candidate_id = ?
          AND engagement_type = 'JOB_APPLY'
          AND created_at >= ?
      `).get(instance.candidate_id, instance.created_at);
      return recentApplication.count > 0;

    case 'high_engagement':
      return (candidate.engagement_score || 0) >= 70;

    default:
      console.warn(`Unknown condition: ${condition}`);
      return false;
  }
}

/**
 * Calculate next action time based on step delay
 */
function calculateNextActionTime(step) {
  if (!step.delay) return new Date().toISOString();

  const now = new Date();
  const delay = step.delay;

  if (delay.minutes) now.setMinutes(now.getMinutes() + delay.minutes);
  if (delay.hours) now.setHours(now.getHours() + delay.hours);
  if (delay.days) now.setDate(now.getDate() + delay.days);
  if (delay.weeks) now.setDate(now.getDate() + (delay.weeks * 7));

  return now.toISOString();
}

/**
 * Generate template message
 */
function generateTemplateMessage(template, candidate, instance) {
  const templates = {
    follow_up_reminder: `Hi ${candidate.name.split(' ')[0]}! 👋 Just wanted to follow up on the job opportunity I shared yesterday. Still interested? Let me know!`,
    final_opportunity: `Hi ${candidate.name.split(' ')[0]}! This is the last chance for this great opportunity. Reply "YES" if you're interested, or "NO" if you'd prefer not to hear about similar roles. Thanks!`,
    we_miss_you: `Hi ${candidate.name.split(' ')[0]}! 😊 We miss you at WorkLink! We have some exciting new opportunities that match your skills. Ready to get back into action?`,
    job_completion_thanks: `Thank you for the excellent work, ${candidate.name.split(' ')[0]}! 👏 Your professionalism really stood out. We'll have more great opportunities for you soon!`,
    new_opportunities: `Hi ${candidate.name.split(' ')[0]}! 💼 We have some new opportunities that would be perfect for someone with your experience. Want to hear about them?`,
    availability_check: `Hi ${candidate.name.split(' ')[0]}! Hope you're doing well! 😊 Are you available for work in the coming weeks? We have some great opportunities lined up!`,
    final_check_in: `Hi ${candidate.name.split(' ')[0]}! Just checking in one last time. If you ever want to return to WorkLink, just reply "BACK" and we'll get you set up! 🙂`,
  };

  return templates[template] || `Hi ${candidate.name.split(' ')[0]}! We have an update for you from WorkLink.`;
}

/**
 * Update follow-up instance
 */
function updateFollowUpInstance(instanceId, updateData) {
  const updateFields = [];
  const params = [];

  for (const [key, value] of Object.entries(updateData)) {
    updateFields.push(`${key} = ?`);
    params.push(value);
  }

  params.push(instanceId);

  const updateStmt = db.prepare(`
    UPDATE follow_up_instances
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `);

  updateStmt.run(...params);
}

/**
 * Initialize default follow-up sequences
 */
function initializeDefaultSequences() {
  console.log('🔄 [Follow-up] Initializing default sequences...');

  for (const [key, sequence] of Object.entries(DEFAULT_SEQUENCES)) {
    try {
      const existing = db.prepare('SELECT id FROM follow_up_sequences WHERE id = ?').get(sequence.id);
      if (!existing) {
        createFollowUpSequence(sequence);
      }
    } catch (error) {
      console.warn(`Failed to create default sequence ${key}:`, error.message);
    }
  }
}

/**
 * Get follow-up sequence statistics
 */
function getFollowUpStats(days = 30) {
  try {
    const stats = db.prepare(`
      SELECT
        fs.name,
        fs.trigger_type,
        COUNT(fi.id) as total_instances,
        COUNT(CASE WHEN fi.status = 'active' THEN 1 END) as active_instances,
        COUNT(CASE WHEN fi.status = 'completed' THEN 1 END) as completed_instances,
        COUNT(CASE WHEN fi.status = 'failed' THEN 1 END) as failed_instances,
        AVG(
          CASE
            WHEN fi.completed_at IS NOT NULL
            THEN (julianday(fi.completed_at) - julianday(fi.created_at)) * 24 * 60 * 60
            ELSE NULL
          END
        ) as avg_completion_time_seconds
      FROM follow_up_sequences fs
      LEFT JOIN follow_up_instances fi ON fs.id = fi.sequence_id
        AND fi.created_at >= datetime('now', '-' || ? || ' days')
      WHERE fs.active = 1
      GROUP BY fs.id
      ORDER BY total_instances DESC
    `).all(days);

    return {
      sequences: stats,
      period: `${days} days`,
    };
  } catch (error) {
    console.error('Error getting follow-up stats:', error);
    return { sequences: [], period: `${days} days` };
  }
}

module.exports = {
  createFollowUpSequence,
  triggerFollowUpSequence,
  processFollowUpActions,
  initializeDefaultSequences,
  getFollowUpStats,
  TRIGGER_TYPES,
  ACTION_TYPES,
  DEFAULT_SEQUENCES,
};