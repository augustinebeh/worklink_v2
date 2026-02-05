/**
 * Posting Generators - Platform-specific job posting formatters
 * Generate job postings optimized for different platforms
 * 
 * @module ai-automation/utils/posting-generators
 */

/**
 * Generate Telegram-formatted job posting
 * @param {string} title - Job title
 * @param {number} pay - Hourly pay rate
 * @param {string} location - Job location
 * @param {string} [requirements] - Job requirements (optional)
 * @param {number} slots - Number of positions available
 * @returns {string} Telegram-formatted posting
 */
function generateTelegramPosting(title, pay, location, requirements, slots) {
  return `🔥 *URGENT HIRING* 🔥

*${title}*
📍 ${location}
💰 $${pay}/hr
👥 ${slots} slots available

✅ Requirements:
${requirements || '• Singaporean/PR\n• Age 18+\n• Able to commit'}

📲 Apply now: [Your Link]
💬 Or DM us directly!

#SingaporeJobs #PartTimeJobs #Hiring`;
}

/**
 * Generate WhatsApp-formatted job posting
 * @param {string} title - Job title
 * @param {number} pay - Hourly pay rate
 * @param {string} location - Job location
 * @param {string} [requirements] - Job requirements (optional)
 * @param {number} slots - Number of positions available
 * @returns {string} WhatsApp-formatted posting
 */
function generateWhatsAppPosting(title, pay, location, requirements, slots) {
  return `*🚨 NOW HIRING 🚨*

Position: *${title}*
Location: ${location}
Pay: *$${pay}/hr*
Slots: ${slots} pax needed

Requirements:
${requirements || '• SC/PR only\n• 18 years and above\n• Committed'}

Interested? Reply "YES" with your name!`;
}

/**
 * Generate FastJobs-formatted job posting
 * @param {string} title - Job title
 * @param {number} pay - Hourly pay rate
 * @param {string} location - Job location
 * @param {string} [requirements] - Job requirements (optional)
 * @param {number} slots - Number of positions available
 * @returns {Object} FastJobs posting object
 */
function generateFastJobsPosting(title, pay, location, requirements, slots) {
  return {
    title: title,
    payRate: `$${pay}/hr`,
    location: location,
    description: `We are looking for ${slots} reliable individuals for ${title} position.\n\nRequirements:\n${requirements || '- Singapore Citizen or PR\n- Minimum 18 years old\n- Positive attitude'}\n\nWhat we offer:\n- Competitive hourly rate\n- Fast payment\n- Flexible scheduling\n- Career progression opportunities`,
    tags: ['Part-time', 'Immediate Start', 'No Experience Needed'],
  };
}

/**
 * Generate Instagram-formatted job posting
 * @param {string} title - Job title
 * @param {number} pay - Hourly pay rate
 * @param {string} location - Job location
 * @param {string} [requirements] - Job requirements (optional)
 * @param {number} slots - Number of positions available
 * @returns {Object} Instagram posting object with caption and hashtags
 */
function generateInstagramPosting(title, pay, location, requirements, slots) {
  return {
    caption: `💼 WE'RE HIRING! 💼

${title}
📍 ${location}
💵 $${pay}/hr
👥 ${slots} positions

Drop a "🙋" in the comments if interested!

DM us or click link in bio to apply ✨

#SGJobs #PartTimeWork #HiringNow #SingaporeLife #StudentJobs #FlexibleWork`,
    hashtags: '#SGJobs #PartTimeWork #HiringNow #SingaporeLife #StudentJobs #FlexibleWork #EarnExtra #WeekendJobs',
  };
}

/**
 * Generate all platform postings at once
 * @param {string} title - Job title
 * @param {number} pay - Hourly pay rate
 * @param {string} location - Job location
 * @param {string} [requirements] - Job requirements (optional)
 * @param {number} slots - Number of positions available
 * @returns {Object} All platform postings
 */
function generateAllPostings(title, pay, location, requirements, slots) {
  return {
    telegram: generateTelegramPosting(title, pay, location, requirements, slots),
    whatsapp: generateWhatsAppPosting(title, pay, location, requirements, slots),
    fastjobs: generateFastJobsPosting(title, pay, location, requirements, slots),
    instagram: generateInstagramPosting(title, pay, location, requirements, slots),
  };
}

/**
 * Validate posting parameters
 * @param {Object} params - Posting parameters
 * @returns {Object} Validation result
 */
function validatePostingParams(params) {
  const { title, pay, location, slots } = params;
  const errors = [];

  if (!title || title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (!pay || pay <= 0) {
    errors.push('Pay rate must be positive');
  }

  if (!location || location.trim().length === 0) {
    errors.push('Location is required');
  }

  if (!slots || slots <= 0) {
    errors.push('Slots must be positive');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  generateTelegramPosting,
  generateWhatsAppPosting,
  generateFastJobsPosting,
  generateInstagramPosting,
  generateAllPostings,
  validatePostingParams,
};
