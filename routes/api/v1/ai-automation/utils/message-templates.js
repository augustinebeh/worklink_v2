/**
 * Message Templates - Personalized outreach message generators
 * Create contextual, personalized messages for candidate outreach
 * 
 * @module ai-automation/utils/message-templates
 */

const { formatDateSG } = require('../../../../../shared/constants');

/**
 * Generate personalized outreach message for a candidate
 * @param {Object} candidate - Candidate information
 * @param {Object} job - Job information
 * @returns {string} Personalized outreach message
 */
function generatePersonalizedOutreach(candidate, job) {
  const firstName = candidate.name.split(' ')[0];
  const jobDate = formatDateSG(job.job_date, { weekday: 'short', day: 'numeric', month: 'short' });
  
  return `Hi ${firstName}! 👋

Got a great opportunity for you:

🏢 *${job.title}*
📍 ${job.location || 'TBC'}
📅 ${jobDate}
⏰ ${job.start_time} - ${job.end_time}
💰 *$${job.pay_rate}/hr*${job.xp_bonus ? ` + ${job.xp_bonus} bonus XP!` : ''}

${candidate.total_jobs_completed > 5 ? `You've been doing great with ${candidate.total_jobs_completed} jobs completed! ⭐` : ''}

Interested? Reply "YES" to confirm!`;
}

/**
 * Generate welcome message for new candidates
 * @param {Object} candidate - Candidate information
 * @returns {string} Welcome message
 */
function generateWelcomeMessage(candidate) {
  const firstName = candidate.name.split(' ')[0];
  
  return `Welcome to WorkLink, ${firstName}! 🎉

We're excited to have you on board!

✅ Your profile is now active
📱 You'll receive job notifications via WhatsApp
⭐ Complete jobs to earn XP and level up!

Our team will be in touch with suitable opportunities soon. In the meantime, feel free to reach out if you have any questions!

Best regards,
WorkLink Team`;
}

/**
 * Generate job confirmation message
 * @param {Object} candidate - Candidate information
 * @param {Object} job - Job information
 * @returns {string} Confirmation message
 */
function generateJobConfirmation(candidate, job) {
  const firstName = candidate.name.split(' ')[0];
  const jobDate = formatDateSG(job.job_date, { weekday: 'long', day: 'numeric', month: 'long' });
  
  return `🎉 Confirmed, ${firstName}!

You're booked for:
📝 ${job.title}
📅 ${jobDate}
⏰ ${job.start_time} - ${job.end_time}
📍 ${job.location || 'TBC'}

Important reminders:
✅ Arrive 15 minutes early
✅ Dress code: ${job.dress_code || 'Smart casual'}
✅ Bring your NRIC

See you there! 👍`;
}

/**
 * Generate job reminder message
 * @param {Object} candidate - Candidate information
 * @param {Object} job - Job information
 * @param {number} hoursUntil - Hours until job start
 * @returns {string} Reminder message
 */
function generateJobReminder(candidate, job, hoursUntil) {
  const firstName = candidate.name.split(' ')[0];
  
  return `⏰ Reminder, ${firstName}!

Your job starts in ${hoursUntil} hours:
📝 ${job.title}
⏰ ${job.start_time}
📍 ${job.location || 'TBC'}

Don't forget to bring your NRIC! See you soon! 👍`;
}

/**
 * Generate follow-up message after job completion
 * @param {Object} candidate - Candidate information
 * @param {Object} job - Job information
 * @param {number} xpEarned - XP points earned
 * @returns {string} Follow-up message
 */
function generateJobCompletionFollowUp(candidate, job, xpEarned) {
  const firstName = candidate.name.split(' ')[0];
  
  return `Great work today, ${firstName}! ⭐

You've completed: ${job.title}
🎁 You earned ${xpEarned} XP!

Your feedback matters! How was your experience today? Reply with:
👍 for Great
😐 for Okay
👎 for Not Good

We'll have more opportunities for you soon!`;
}

/**
 * Generate re-engagement message for inactive candidates
 * @param {Object} candidate - Candidate information
 * @param {number} daysSinceLastJob - Days since last job
 * @returns {string} Re-engagement message
 */
function generateReEngagementMessage(candidate, daysSinceLastJob) {
  const firstName = candidate.name.split(' ')[0];
  
  return `Hey ${firstName}! 👋

We haven't seen you in ${daysSinceLastJob} days and we miss you! 😊

We have new opportunities that might interest you. Are you still looking for work?

Reply "YES" to get back on our active list!`;
}

/**
 * Generate achievement milestone message
 * @param {Object} candidate - Candidate information
 * @param {string} achievement - Achievement type
 * @param {Object} details - Achievement details
 * @returns {string} Achievement message
 */
function generateAchievementMessage(candidate, achievement, details) {
  const firstName = candidate.name.split(' ')[0];
  
  const achievementMessages = {
    'level_up': `🎉 Level Up, ${firstName}!

You've reached Level ${details.newLevel}! 🌟

Keep up the great work and unlock even better opportunities!`,
    
    'milestone_jobs': `🏆 Milestone Achieved, ${firstName}!

You've completed ${details.jobCount} jobs with WorkLink! 

${details.jobCount === 10 ? 'You\'re now a trusted member!' : ''}
${details.jobCount === 50 ? 'You\'re a WorkLink veteran!' : ''}
${details.jobCount === 100 ? 'You\'re a WorkLink legend!' : ''}

Thank you for your continued excellence! ⭐`,
    
    'perfect_rating': `⭐ Perfect Rating, ${firstName}!

You've maintained a 5-star rating across all your jobs!

Employers love working with you! Keep it up! 👏`
  };
  
  return achievementMessages[achievement] || `Congratulations, ${firstName}! 🎉`;
}

/**
 * Generate campaign message with variable substitution
 * @param {string} template - Message template with {{variables}}
 * @param {Object} variables - Variables to substitute
 * @returns {string} Processed message
 */
function processCampaignTemplate(template, variables) {
  let message = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    message = message.replace(regex, value);
  }
  
  return message;
}

module.exports = {
  generatePersonalizedOutreach,
  generateWelcomeMessage,
  generateJobConfirmation,
  generateJobReminder,
  generateJobCompletionFollowUp,
  generateReEngagementMessage,
  generateAchievementMessage,
  processCampaignTemplate,
};
