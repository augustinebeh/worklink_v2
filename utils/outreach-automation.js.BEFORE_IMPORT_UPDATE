/**
 * Automated Candidate Outreach System
 * WorkLink v2 - Intelligent candidate communication workflows
 *
 * Features:
 * - Automated job matching and outreach
 * - Personalized messaging templates
 * - Multi-channel communication (WhatsApp, Email, SMS, Push)
 * - Follow-up scheduling and tracking
 * - Engagement scoring and optimization
 * - Campaign analytics and performance tracking
 */

const { db } = require('../db/database');
const { generateOutreachMessage } = require('./claude');
const { enhancedMatchCandidates } = require('./candidate-matching');

/**
 * Outreach campaign types
 */
const CAMPAIGN_TYPES = {
  JOB_INVITATION: 'job_invitation',        // Direct job invitation
  BULK_OPPORTUNITY: 'bulk_opportunity',     // Mass opportunity sharing
  FOLLOW_UP: 'follow_up',                   // Follow-up on previous outreach
  RE_ENGAGEMENT: 're_engagement',           // Re-engage inactive candidates
  SKILL_MATCH: 'skill_match',              // Skills-based targeting
  URGENT_FILL: 'urgent_fill',              // Urgent job filling
};

/**
 * Communication channels
 */
const CHANNELS = {
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push_notification',
  IN_APP: 'in_app_message',
};

/**
 * Campaign priority levels
 */
const PRIORITIES = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
};

/**
 * Create a new outreach campaign
 */
async function createOutreachCampaign(campaignData) {
  const {
    name,
    type = CAMPAIGN_TYPES.JOB_INVITATION,
    jobId = null,
    targetCriteria = {},
    channels = [CHANNELS.WHATSAPP],
    priority = PRIORITIES.MEDIUM,
    scheduledAt = null,
    template = null,
    autoStart = false,
  } = campaignData;

  const campaignId = `CAMP${Date.now()}`;

  // Create campaign record
  const createCampaignStmt = db.prepare(`
    INSERT INTO outreach_campaigns
    (id, name, type, job_id, target_criteria, channels, priority, status,
     scheduled_at, template_data, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  try {
    createCampaignStmt.run(
      campaignId,
      name,
      type,
      jobId,
      JSON.stringify(targetCriteria),
      JSON.stringify(channels),
      priority,
      autoStart ? 'active' : 'draft',
      scheduledAt,
      JSON.stringify(template || {})
    );

    console.log(`📢 [Outreach] Created campaign: ${name} (${campaignId})`);

    if (autoStart) {
      await executeCampaign(campaignId);
    }

    return { campaignId, status: autoStart ? 'started' : 'created' };
  } catch (error) {
    console.error('Failed to create outreach campaign:', error);
    throw error;
  }
}

/**
 * Execute an outreach campaign
 */
async function executeCampaign(campaignId) {
  try {
    const campaign = getCampaign(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    console.log(`📢 [Outreach] Executing campaign: ${campaign.name}`);

    // Mark campaign as active
    updateCampaignStatus(campaignId, 'active');

    // Find target candidates
    const targetCandidates = await findTargetCandidates(campaign);
    console.log(`📢 [Outreach] Found ${targetCandidates.length} target candidates`);

    if (targetCandidates.length === 0) {
      updateCampaignStatus(campaignId, 'completed');
      return { success: true, message: 'No candidates found matching criteria', candidatesReached: 0 };
    }

    // Generate and send messages
    const results = await sendCampaignMessages(campaign, targetCandidates);

    // Update campaign with results
    const updateStmt = db.prepare(`
      UPDATE outreach_campaigns
      SET status = ?, candidates_targeted = ?, messages_sent = ?, completed_at = datetime('now')
      WHERE id = ?
    `);

    updateStmt.run(
      'completed',
      targetCandidates.length,
      results.sent,
      campaignId
    );

    console.log(`📢 [Outreach] Campaign completed: ${results.sent}/${targetCandidates.length} messages sent`);

    return {
      success: true,
      campaignId,
      candidatesTargeted: targetCandidates.length,
      messagesSent: results.sent,
      errors: results.errors,
    };
  } catch (error) {
    console.error(`Failed to execute campaign ${campaignId}:`, error);
    updateCampaignStatus(campaignId, 'failed', error.message);
    throw error;
  }
}

/**
 * Find target candidates based on campaign criteria
 */
async function findTargetCandidates(campaign) {
  const criteria = JSON.parse(campaign.target_criteria || '{}');

  let whereConditions = ['c.status = "active"'];
  let params = [];

  // Basic filters
  if (criteria.minLevel) {
    whereConditions.push('c.level >= ?');
    params.push(criteria.minLevel);
  }

  if (criteria.minRating) {
    whereConditions.push('c.rating >= ?');
    params.push(criteria.minRating);
  }

  if (criteria.minJobsCompleted) {
    whereConditions.push('c.total_jobs_completed >= ?');
    params.push(criteria.minJobsCompleted);
  }

  if (criteria.locations && criteria.locations.length > 0) {
    const locationPlaceholders = criteria.locations.map(() => '?').join(',');
    whereConditions.push(`EXISTS (
      SELECT 1 FROM json_each(c.preferred_locations)
      WHERE value IN (${locationPlaceholders})
    )`);
    params.push(...criteria.locations);
  }

  if (criteria.skills && criteria.skills.length > 0) {
    const skillPlaceholders = criteria.skills.map(() => '?').join(',');
    whereConditions.push(`EXISTS (
      SELECT 1 FROM json_each(c.skills)
      WHERE value IN (${skillPlaceholders})
    )`);
    params.push(...criteria.skills);
  }

  if (criteria.certifications && criteria.certifications.length > 0) {
    const certPlaceholders = criteria.certifications.map(() => '?').join(',');
    whereConditions.push(`EXISTS (
      SELECT 1 FROM json_each(c.certifications)
      WHERE value IN (${certPlaceholders})
    )`);
    params.push(...criteria.certifications);
  }

  // Availability filters
  if (criteria.onlineStatus) {
    whereConditions.push('c.online_status = ?');
    params.push(criteria.onlineStatus);
  }

  if (criteria.lastSeenDays) {
    whereConditions.push('date(c.last_seen) >= date("now", "-" || ? || " days")');
    params.push(criteria.lastSeenDays);
  }

  // Communication preferences
  const channels = JSON.parse(campaign.channels);
  const channelConditions = [];

  if (channels.includes(CHANNELS.WHATSAPP)) {
    channelConditions.push('c.phone IS NOT NULL');
  }
  if (channels.includes(CHANNELS.EMAIL)) {
    channelConditions.push('c.email IS NOT NULL');
  }
  if (channels.includes(CHANNELS.PUSH)) {
    channelConditions.push('c.push_token IS NOT NULL');
  }

  if (channelConditions.length > 0) {
    whereConditions.push(`(${channelConditions.join(' OR ')})`);
  }

  // Exclude recently contacted candidates (within 24 hours for same campaign type)
  if (campaign.type !== CAMPAIGN_TYPES.URGENT_FILL) {
    whereConditions.push(`NOT EXISTS (
      SELECT 1 FROM outreach_messages om
      WHERE om.candidate_id = c.id
      AND om.campaign_type = ?
      AND om.created_at >= datetime('now', '-24 hours')
    )`);
    params.push(campaign.type);
  }

  // Build final query
  const query = `
    SELECT c.*,
      (SELECT COUNT(*) FROM deployments d WHERE d.candidate_id = c.id AND d.status = 'completed') as completed_jobs
    FROM candidates c
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY
      CASE
        WHEN c.online_status = 'online' THEN 1
        WHEN c.online_status = 'away' THEN 2
        WHEN c.online_status = 'busy' THEN 3
        ELSE 4
      END,
      c.rating DESC,
      c.last_seen DESC
    LIMIT ?
  `;

  params.push(criteria.maxCandidates || 100);

  const candidates = db.prepare(query).all(...params);

  // If this is a job-specific campaign, use enhanced matching
  if (campaign.job_id) {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(campaign.job_id);
    if (job) {
      const matchResults = await enhancedMatchCandidates(job, candidates, {
        useAI: false,  // Skip AI for bulk operations
        minScore: criteria.minMatchScore || 40,
        maxResults: criteria.maxCandidates || 100,
        includeReasons: false
      });

      return matchResults.matches.map(match => {
        const candidate = candidates.find(c => c.id === match.id);
        return { ...candidate, matchScore: match.score };
      });
    }
  }

  return candidates;
}

/**
 * Send messages to target candidates
 */
async function sendCampaignMessages(campaign, candidates) {
  const channels = JSON.parse(campaign.channels);
  const template = JSON.parse(campaign.template_data || '{}');

  let sent = 0;
  const errors = [];

  for (const candidate of candidates) {
    try {
      // Generate personalized message
      const message = await generateCampaignMessage(campaign, candidate, template);

      // Send through each channel
      for (const channel of channels) {
        try {
          await sendMessage(candidate, channel, message, campaign);

          // Log the message
          logOutreachMessage(campaign, candidate, channel, message, 'sent');
          sent++;
        } catch (sendError) {
          console.error(`Failed to send ${channel} message to ${candidate.name}:`, sendError);
          logOutreachMessage(campaign, candidate, channel, message, 'failed', sendError.message);
          errors.push({ candidateId: candidate.id, channel, error: sendError.message });
        }
      }

      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (messageError) {
      console.error(`Failed to generate message for ${candidate.name}:`, messageError);
      errors.push({ candidateId: candidate.id, error: messageError.message });
    }
  }

  return { sent, errors };
}

/**
 * Generate personalized campaign message
 */
async function generateCampaignMessage(campaign, candidate, template) {
  if (campaign.job_id) {
    // Job-specific message
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(campaign.job_id);
    if (job) {
      return await generateOutreachMessage(candidate, job);
    }
  }

  // Use template or generate generic message
  if (template.content) {
    return personalizeTemplate(template.content, candidate, campaign);
  }

  // Fallback generic message
  return generateGenericOutreachMessage(candidate, campaign);
}

/**
 * Personalize message template with candidate data
 */
function personalizeTemplate(template, candidate, campaign) {
  const firstName = candidate.name.split(' ')[0];
  const replacements = {
    '{{firstName}}': firstName,
    '{{candidateName}}': candidate.name,
    '{{candidateLevel}}': candidate.level || 1,
    '{{jobsCompleted}}': candidate.total_jobs_completed || 0,
    '{{rating}}': candidate.rating ? `${candidate.rating}/5 stars` : 'New worker',
    '{{campaignName}}': campaign.name,
  };

  let personalized = template;
  for (const [placeholder, value] of Object.entries(replacements)) {
    personalized = personalized.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  }

  return personalized;
}

/**
 * Generate generic outreach message
 */
function generateGenericOutreachMessage(candidate, campaign) {
  const firstName = candidate.name.split(' ')[0];

  switch (campaign.type) {
    case CAMPAIGN_TYPES.RE_ENGAGEMENT:
      return `Hi ${firstName}! 👋 We miss you at WorkLink! We have some exciting new opportunities that match your skills. Ready to get back into action? Reply "YES" to see what's available! 💪`;

    case CAMPAIGN_TYPES.SKILL_MATCH:
      return `Hi ${firstName}! 🎯 Your skills are in high demand! We have several opportunities that are perfect for someone with your experience. Interested in hearing more? Reply "INTERESTED" 👍`;

    case CAMPAIGN_TYPES.BULK_OPPORTUNITY:
      return `Hi ${firstName}! 📢 We have multiple job opportunities this week with great pay rates. Want to see what's available for you? Reply "SHOW JOBS" and we'll send you the details! ⭐`;

    default:
      return `Hi ${firstName}! 👋 WorkLink here with new opportunities for you! We have jobs that match your profile. Interested? Reply "YES" to learn more! 💼`;
  }
}

/**
 * Send message through specific channel
 */
async function sendMessage(candidate, channel, message, campaign) {
  switch (channel) {
    case CHANNELS.WHATSAPP:
      return await sendWhatsAppMessage(candidate, message, campaign);

    case CHANNELS.EMAIL:
      return await sendEmailMessage(candidate, message, campaign);

    case CHANNELS.SMS:
      return await sendSMSMessage(candidate, message, campaign);

    case CHANNELS.PUSH:
      return await sendPushNotification(candidate, message, campaign);

    case CHANNELS.IN_APP:
      return await sendInAppMessage(candidate, message, campaign);

    default:
      throw new Error(`Unknown channel: ${channel}`);
  }
}

/**
 * Send WhatsApp message (placeholder - integrate with WhatsApp Business API)
 */
async function sendWhatsAppMessage(candidate, message, campaign) {
  if (!candidate.phone) {
    throw new Error('No phone number available');
  }

  // TODO: Integrate with WhatsApp Business API
  console.log(`📱 [WhatsApp] Sending to ${candidate.name} (${candidate.phone}): ${message.substring(0, 50)}...`);

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 100));

  return { success: true, messageId: `wa_${Date.now()}` };
}

/**
 * Send email message
 */
async function sendEmailMessage(candidate, message, campaign) {
  if (!candidate.email) {
    throw new Error('No email address available');
  }

  // TODO: Use email service
  console.log(`📧 [Email] Sending to ${candidate.name} (${candidate.email}): ${message.substring(0, 50)}...`);

  return { success: true, messageId: `email_${Date.now()}` };
}

/**
 * Send SMS message
 */
async function sendSMSMessage(candidate, message, campaign) {
  if (!candidate.phone) {
    throw new Error('No phone number available');
  }

  // TODO: Integrate with SMS service
  console.log(`📱 [SMS] Sending to ${candidate.name} (${candidate.phone}): ${message.substring(0, 50)}...`);

  return { success: true, messageId: `sms_${Date.now()}` };
}

/**
 * Send push notification
 */
async function sendPushNotification(candidate, message, campaign) {
  if (!candidate.push_token) {
    throw new Error('No push token available');
  }

  // Add to push queue
  const insertPushStmt = db.prepare(`
    INSERT INTO push_queue (candidate_id, title, body, data, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);

  const title = campaign.type === CAMPAIGN_TYPES.JOB_INVITATION ? 'New Job Opportunity!' : 'WorkLink Update';

  insertPushStmt.run(
    candidate.id,
    title,
    message,
    JSON.stringify({ campaignId: campaign.id, type: 'outreach' })
  );

  return { success: true, messageId: `push_${Date.now()}` };
}

/**
 * Send in-app message
 */
async function sendInAppMessage(candidate, message, campaign) {
  const insertMessageStmt = db.prepare(`
    INSERT INTO messages (candidate_id, sender, content, channel, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);

  insertMessageStmt.run(
    candidate.id,
    'system',
    message,
    'in_app'
  );

  return { success: true, messageId: `inapp_${Date.now()}` };
}

/**
 * Log outreach message
 */
function logOutreachMessage(campaign, candidate, channel, message, status, error = null) {
  const insertLogStmt = db.prepare(`
    INSERT INTO outreach_messages
    (campaign_id, candidate_id, channel, message, status, error, campaign_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  insertLogStmt.run(
    campaign.id,
    candidate.id,
    channel,
    message,
    status,
    error,
    campaign.type
  );
}

/**
 * Get campaign by ID
 */
function getCampaign(campaignId) {
  return db.prepare('SELECT * FROM outreach_campaigns WHERE id = ?').get(campaignId);
}

/**
 * Update campaign status
 */
function updateCampaignStatus(campaignId, status, error = null) {
  const updateStmt = db.prepare(`
    UPDATE outreach_campaigns
    SET status = ?, error = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  updateStmt.run(status, error, campaignId);
}

/**
 * Get campaign statistics
 */
function getCampaignStats(campaignId) {
  const campaign = getCampaign(campaignId);
  if (!campaign) return null;

  const messageStats = db.prepare(`
    SELECT
      channel,
      status,
      COUNT(*) as count
    FROM outreach_messages
    WHERE campaign_id = ?
    GROUP BY channel, status
  `).all(campaignId);

  const responseStats = db.prepare(`
    SELECT COUNT(*) as responses
    FROM messages m
    JOIN outreach_messages om ON om.candidate_id = m.candidate_id
    WHERE om.campaign_id = ?
    AND m.created_at >= om.created_at
    AND m.sender != 'system'
    AND datetime(m.created_at) <= datetime(om.created_at, '+24 hours')
  `).get(campaignId);

  return {
    campaign,
    messageStats,
    responses: responseStats.responses || 0,
    responseRate: campaign.messages_sent > 0 ?
      ((responseStats.responses || 0) / campaign.messages_sent * 100).toFixed(1) : '0.0'
  };
}

module.exports = {
  createOutreachCampaign,
  executeCampaign,
  findTargetCandidates,
  getCampaignStats,
  CAMPAIGN_TYPES,
  CHANNELS,
  PRIORITIES,
};