/**
 * Email Configuration Management
 * Handles SMTP settings, email service providers, and configuration
 */

const { db } = require('../db');

/**
 * Default email configuration
 */
const DEFAULT_CONFIG = {
  // Email service provider
  provider: 'smtp', // 'smtp', 'sendgrid', 'mailgun', 'ses'

  // SMTP Configuration
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  },

  // SendGrid Configuration
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@worklink.sg'
  },

  // Mailgun Configuration
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
    from: process.env.MAILGUN_FROM_EMAIL
  },

  // AWS SES Configuration
  ses: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-southeast-1',
    from: process.env.SES_FROM_EMAIL
  },

  // General settings
  from: {
    name: 'WorkLink',
    email: process.env.FROM_EMAIL || 'noreply@worklink.sg'
  },

  // Rate limiting
  rateLimit: {
    maxPerHour: parseInt(process.env.EMAIL_RATE_LIMIT_HOUR) || 100,
    maxPerDay: parseInt(process.env.EMAIL_RATE_LIMIT_DAY) || 1000
  },

  // Retry settings
  retry: {
    attempts: parseInt(process.env.EMAIL_RETRY_ATTEMPTS) || 3,
    delay: parseInt(process.env.EMAIL_RETRY_DELAY) || 5000, // milliseconds
    backoff: process.env.EMAIL_RETRY_BACKOFF || 'exponential' // 'linear' or 'exponential'
  },

  // Template settings
  templates: {
    basePath: process.env.EMAIL_TEMPLATE_PATH || './services/email/templates',
    defaultLanguage: 'en'
  }
};

/**
 * Get email configuration from database or defaults
 */
function getEmailConfig() {
  try {
    // Try to get config from database
    const configRow = db.prepare('SELECT * FROM email_config WHERE active = 1 ORDER BY created_at DESC LIMIT 1').get();

    if (configRow) {
      return {
        ...DEFAULT_CONFIG,
        ...JSON.parse(configRow.config_json)
      };
    }
  } catch (error) {
    console.warn('Error loading email config from database, using defaults:', error.message);
  }

  return DEFAULT_CONFIG;
}

/**
 * Update email configuration in database
 */
function updateEmailConfig(newConfig) {
  const config = {
    ...getEmailConfig(),
    ...newConfig
  };

  // Validate configuration
  validateEmailConfig(config);

  // Deactivate old configs
  db.prepare('UPDATE email_config SET active = 0').run();

  // Insert new config
  const result = db.prepare(`
    INSERT INTO email_config (config_json, active, created_at)
    VALUES (?, 1, datetime('now'))
  `).run(JSON.stringify(config));

  return config;
}

/**
 * Validate email configuration
 */
function validateEmailConfig(config) {
  const errors = [];

  // Validate provider
  const validProviders = ['smtp', 'sendgrid', 'mailgun', 'ses'];
  if (!validProviders.includes(config.provider)) {
    errors.push(`Invalid provider: ${config.provider}`);
  }

  // Validate based on provider
  switch (config.provider) {
    case 'smtp':
      if (!config.smtp?.host) errors.push('SMTP host is required');
      if (!config.smtp?.auth?.user) errors.push('SMTP user is required');
      if (!config.smtp?.auth?.pass) errors.push('SMTP password is required');
      break;

    case 'sendgrid':
      if (!config.sendgrid?.apiKey) errors.push('SendGrid API key is required');
      if (!config.sendgrid?.from) errors.push('SendGrid from email is required');
      break;

    case 'mailgun':
      if (!config.mailgun?.apiKey) errors.push('Mailgun API key is required');
      if (!config.mailgun?.domain) errors.push('Mailgun domain is required');
      break;

    case 'ses':
      if (!config.ses?.accessKeyId) errors.push('AWS Access Key ID is required');
      if (!config.ses?.secretAccessKey) errors.push('AWS Secret Access Key is required');
      break;
  }

  // Validate from email
  if (!config.from?.email) {
    errors.push('From email is required');
  } else if (!isValidEmail(config.from.email)) {
    errors.push('From email is invalid');
  }

  if (errors.length > 0) {
    throw new Error(`Email configuration validation failed: ${errors.join(', ')}`);
  }
}

/**
 * Simple email validation
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Test email configuration
 */
async function testEmailConfig(config = null) {
  const testConfig = config || getEmailConfig();

  try {
    const emailService = require('../services/email');

    // Try to send a test email
    const result = await emailService.sendTestEmail({
      to: testConfig.from.email,
      subject: 'WorkLink Email Configuration Test',
      text: 'This is a test email to verify your email configuration is working correctly.'
    });

    return {
      success: true,
      message: 'Email configuration test successful',
      messageId: result.messageId
    };
  } catch (error) {
    return {
      success: false,
      message: `Email configuration test failed: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Get email usage statistics
 */
function getEmailUsageStats(timeframe = '24h') {
  const timeCondition = getTimeCondition(timeframe);

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_sent,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      AVG(CASE WHEN delivered_at IS NOT NULL THEN
        (julianday(delivered_at) - julianday(created_at)) * 24 * 60
      END) as avg_delivery_time_minutes
    FROM email_delivery_log
    WHERE created_at >= datetime('now', '${timeCondition}')
  `).get();

  // Get hourly breakdown for the last 24 hours
  const hourlyBreakdown = db.prepare(`
    SELECT
      strftime('%H', created_at) as hour,
      COUNT(*) as count
    FROM email_delivery_log
    WHERE created_at >= datetime('now', '-24 hours')
    GROUP BY strftime('%H', created_at)
    ORDER BY hour
  `).all();

  return {
    ...stats,
    hourlyBreakdown,
    timeframe
  };
}

/**
 * Helper to convert timeframe to SQL condition
 */
function getTimeCondition(timeframe) {
  const timeframeMap = {
    '1h': '-1 hour',
    '24h': '-24 hours',
    '7d': '-7 days',
    '30d': '-30 days'
  };

  return timeframeMap[timeframe] || '-24 hours';
}

module.exports = {
  getEmailConfig,
  updateEmailConfig,
  validateEmailConfig,
  testEmailConfig,
  getEmailUsageStats,
  DEFAULT_CONFIG
};