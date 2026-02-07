/**
 * Candidate Engagement Automation Handler
 */

const { logger } = require('../../utils/structured-logger');
const { db } = require('../../db');

async function runCandidateEngagement() {
  logger.info('Starting candidate engagement automation', { module: 'job-scheduler' });

  try {
    const candidatesNeedingEngagement = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM messages WHERE sender_id = c.user_id AND created_at > datetime('now', '-7 days')) as recent_messages,
        (SELECT COUNT(*) FROM job_applications WHERE candidate_id = c.id AND created_at > datetime('now', '-30 days')) as recent_applications
      FROM candidates c
      WHERE c.status = 'active'
      AND c.last_login < datetime('now', '-7 days')
      AND c.created_at < datetime('now', '-3 days')
    `).all();

    let engagementsCreated = 0;
    let notificationsSent = 0;
    let personalizedMessages = 0;

    for (const candidate of candidatesNeedingEngagement) {
      try {
        const engagementPlan = await createEngagementPlan(candidate);

        if (engagementPlan.sendNotification) {
          await sendEngagementNotification(candidate);
          notificationsSent++;
        }

        if (engagementPlan.personalizedMessage) {
          await createPersonalizedMessage(candidate, engagementPlan.personalizedMessage);
          personalizedMessages++;
        }

        db.prepare(`
          UPDATE candidates SET last_engagement_attempt = CURRENT_TIMESTAMP WHERE id = ?
        `).run(candidate.id);

        engagementsCreated++;
      } catch (error) {
        logger.error('Failed to engage candidate', {
          module: 'job-scheduler', candidate_id: candidate.id, error: error.message
        });
      }
    }

    return {
      type: 'candidate_engagement', status: 'completed',
      candidates_processed: candidatesNeedingEngagement.length,
      engagements_created: engagementsCreated,
      notifications_sent: notificationsSent,
      personalized_messages: personalizedMessages,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { type: 'candidate_engagement', status: 'error', error: error.message, timestamp: new Date().toISOString() };
  }
}

async function createEngagementPlan(candidate) {
  const daysSinceLogin = Math.floor((Date.now() - new Date(candidate.last_login).getTime()) / (1000 * 60 * 60 * 24));
  const hasRecentApplications = candidate.recent_applications > 0;
  const hasRecentMessages = candidate.recent_messages > 0;

  let engagementScore = 0;
  if (daysSinceLogin <= 7) engagementScore += 40;
  else if (daysSinceLogin <= 30) engagementScore += 20;
  if (hasRecentApplications) engagementScore += 30;
  if (hasRecentMessages) engagementScore += 20;
  if (candidate.rating && candidate.rating >= 4) engagementScore += 10;

  let strategy = 'basic';
  let personalizedMessage = null;
  let sendNotification = false;
  let offerIncentive = false;

  if (engagementScore < 30) {
    strategy = 'intensive';
    sendNotification = true;
    offerIncentive = true;
    personalizedMessage = await generatePersonalizedMessage(candidate, 'high_risk');
  } else if (engagementScore < 60) {
    strategy = 'moderate';
    sendNotification = daysSinceLogin > 14;
    personalizedMessage = await generatePersonalizedMessage(candidate, 'moderate');
  } else {
    strategy = 'maintain';
    sendNotification = daysSinceLogin > 30;
    personalizedMessage = await generatePersonalizedMessage(candidate, 'maintain');
  }

  return {
    strategy, engagementScore, sendNotification, personalizedMessage,
    offerIncentive, daysSinceLogin,
    recommendedActions: getRecommendedActions(candidate, engagementScore)
  };
}

async function generatePersonalizedMessage(candidate, riskLevel) {
  try {
    const preferences = await getCandidatePreferences(candidate);
    let baseMessage = '';
    const firstName = candidate.name ? candidate.name.split(' ')[0] : 'there';

    switch (riskLevel) {
      case 'high_risk':
        baseMessage = `Hi ${firstName}! We miss you on WorkLink. `;
        if (preferences.preferredJobTypes.length > 0) {
          baseMessage += `We have exciting new ${preferences.preferredJobTypes[0]} opportunities that match your skills. `;
        }
        baseMessage += `Check out the latest jobs and boost your profile to get noticed by top employers!`;
        break;
      case 'moderate':
        baseMessage = `Hello ${firstName}! `;
        if (preferences.recentlyViewedJobs.length > 0) {
          baseMessage += `Don't miss out on opportunities similar to the ${preferences.recentlyViewedJobs[0]} roles you've been looking at. `;
        }
        baseMessage += `New jobs are posted daily - take a look and apply to stay ahead of the competition!`;
        break;
      case 'maintain':
        baseMessage = `Hi ${firstName}! `;
        if (preferences.applicationSuccessRate > 0.7) {
          baseMessage += `You're doing great with your applications! `;
        }
        baseMessage += `Keep up the momentum - check out this week's featured opportunities.`;
        break;
      default:
        baseMessage = `Hi ${firstName}! New opportunities await you on WorkLink. Check them out today!`;
    }
    return baseMessage;
  } catch (error) {
    logger.error('Failed to generate personalized message', {
      module: 'job-scheduler', candidate_id: candidate.id, error: error.message
    });
    const firstName = candidate.name ? candidate.name.split(' ')[0] : 'there';
    return `Hi ${firstName}! We have new job opportunities that might interest you. Check them out on WorkLink!`;
  }
}

async function getCandidatePreferences(candidate) {
  try {
    const applications = db.prepare(`
      SELECT j.title, j.location, j.required_skills
      FROM job_applications ja JOIN jobs j ON ja.job_id = j.id
      WHERE ja.candidate_id = ? ORDER BY ja.created_at DESC LIMIT 10
    `).all(candidate.id);

    const viewedJobs = db.prepare(`
      SELECT j.title, j.location
      FROM job_views jv JOIN jobs j ON jv.job_id = j.id
      WHERE jv.candidate_id = ? ORDER BY jv.created_at DESC LIMIT 5
    `).all(candidate.id);

    const jobTitles = applications.map(app => app.title);
    const locations = applications.map(app => app.location).filter(Boolean);
    const preferredJobTypes = extractJobTypes(jobTitles);

    const successfulApplications = db.prepare(`
      SELECT COUNT(*) as count
      FROM job_applications ja
      JOIN deployments d ON ja.job_id = d.job_id AND ja.candidate_id = d.candidate_id
      WHERE ja.candidate_id = ? AND d.status IN ('completed', 'in_progress')
    `).get(candidate.id);

    const totalApplications = applications.length || 1;
    const applicationSuccessRate = successfulApplications.count / totalApplications;

    return {
      preferredJobTypes: preferredJobTypes.slice(0, 3),
      preferredLocations: [...new Set(locations)].slice(0, 3),
      recentlyViewedJobs: viewedJobs.map(job => job.title).slice(0, 3),
      applicationSuccessRate, totalApplications
    };
  } catch (error) {
    logger.error('Failed to get candidate preferences', {
      module: 'job-scheduler', candidate_id: candidate.id, error: error.message
    });
    return { preferredJobTypes: [], preferredLocations: [], recentlyViewedJobs: [], applicationSuccessRate: 0, totalApplications: 0 };
  }
}

function extractJobTypes(jobTitles) {
  const types = [];
  jobTitles.forEach(title => {
    const t = title.toLowerCase();
    if (t.includes('customer service') || t.includes('customer support')) types.push('Customer Service');
    else if (t.includes('admin') || t.includes('clerk') || t.includes('assistant')) types.push('Administrative');
    else if (t.includes('sales') || t.includes('marketing')) types.push('Sales & Marketing');
    else if (t.includes('event') || t.includes('promotion')) types.push('Events & Promotions');
    else if (t.includes('data entry') || t.includes('data')) types.push('Data Entry');
    else if (t.includes('security') || t.includes('guard')) types.push('Security');
    else if (t.includes('cleaning') || t.includes('housekeeping')) types.push('Cleaning & Maintenance');
    else types.push('General Labor');
  });

  const typeCounts = {};
  types.forEach(type => { typeCounts[type] = (typeCounts[type] || 0) + 1; });
  return Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a]);
}

function getRecommendedActions(candidate, engagementScore) {
  const actions = [];
  if (engagementScore < 30) {
    actions.push('Send push notification', 'Offer profile boost incentive', 'Suggest skills training');
    if (candidate.rating < 4) actions.push('Provide profile improvement tips');
  } else if (engagementScore < 60) {
    actions.push('Send personalized job recommendations', 'Highlight trending opportunities');
    if (!candidate.profile_picture) actions.push('Encourage profile photo upload');
  } else {
    actions.push('Send weekly job digest', 'Invite to refer friends');
    if (candidate.rating >= 4) actions.push('Offer premium features trial');
  }
  return actions;
}

async function sendEngagementNotification(candidate) {
  try {
    const notificationService = require('../smart-notifications');
    if (notificationService) {
      await notificationService.sendToUser(candidate.user_id, {
        title: 'New Opportunities Waiting!',
        body: 'Check out the latest jobs that match your profile',
        type: 'engagement', priority: 'normal',
        data: { action: 'view_jobs', candidate_id: candidate.id }
      });
      logger.info('Engagement push notification sent', {
        module: 'job-scheduler', candidate_id: candidate.id, user_id: candidate.user_id
      });
    }
  } catch (error) {
    logger.error('Failed to send engagement notification', {
      module: 'job-scheduler', candidate_id: candidate.id, error: error.message
    });
  }
}

async function createPersonalizedMessage(candidate, message) {
  try {
    let conversationId = db.prepare(`
      SELECT id FROM conversations WHERE candidate_id = ? AND type = 'system'
      ORDER BY created_at DESC LIMIT 1
    `).get(candidate.id)?.id;

    if (!conversationId) {
      conversationId = 'CONV' + Date.now().toString(36).toUpperCase();
      db.prepare(`
        INSERT INTO conversations (id, candidate_id, type, status) VALUES (?, ?, 'system', 'active')
      `).run(conversationId, candidate.id);
    }

    const messageId = 'MSG' + Date.now().toString(36).toUpperCase();
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_id, content, type) VALUES (?, ?, 'system', ?, 'engagement')
    `).run(messageId, conversationId, message);

    db.prepare(`
      UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP, last_message = ? WHERE id = ?
    `).run(message.substring(0, 100) + '...', conversationId);

    logger.info('Personalized engagement message created', {
      module: 'job-scheduler', candidate_id: candidate.id, conversation_id: conversationId, message_length: message.length
    });
  } catch (error) {
    logger.error('Failed to create personalized message', {
      module: 'job-scheduler', candidate_id: candidate.id, error: error.message
    });
  }
}

module.exports = { runCandidateEngagement };
