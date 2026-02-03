/**
 * Email Configuration API
 * Manages email service configuration and settings
 */

const express = require('express');
const router = express.Router();
const { getEmailConfig, updateEmailConfig, testEmailConfig, validateEmailConfig } = require('../../../config/email');

// Get current email configuration
router.get('/', (req, res) => {
  try {
    const config = getEmailConfig();

    // Remove sensitive information before sending
    const safeConfig = {
      provider: config.provider,
      from: config.from,
      rateLimit: config.rateLimit,
      retry: config.retry,
      templates: config.templates,
      smtp: {
        host: config.smtp?.host,
        port: config.smtp?.port,
        secure: config.smtp?.secure,
        auth: {
          user: config.smtp?.auth?.user,
          pass: config.smtp?.auth?.pass ? '***HIDDEN***' : null
        }
      },
      sendgrid: {
        from: config.sendgrid?.from,
        apiKey: config.sendgrid?.apiKey ? '***HIDDEN***' : null
      },
      mailgun: {
        domain: config.mailgun?.domain,
        from: config.mailgun?.from,
        apiKey: config.mailgun?.apiKey ? '***HIDDEN***' : null
      },
      ses: {
        region: config.ses?.region,
        from: config.ses?.from,
        accessKeyId: config.ses?.accessKeyId ? '***HIDDEN***' : null,
        secretAccessKey: config.ses?.secretAccessKey ? '***HIDDEN***' : null
      }
    };

    res.json({
      success: true,
      data: safeConfig
    });
  } catch (error) {
    console.error('Error getting email configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update email configuration
router.patch('/', (req, res) => {
  try {
    const newConfig = req.body;

    // Validate the configuration
    validateEmailConfig(newConfig);

    // Update configuration
    const updatedConfig = updateEmailConfig(newConfig);

    // Return safe config (without sensitive data)
    const safeConfig = {
      ...updatedConfig,
      smtp: {
        ...updatedConfig.smtp,
        auth: {
          user: updatedConfig.smtp?.auth?.user,
          pass: updatedConfig.smtp?.auth?.pass ? '***HIDDEN***' : null
        }
      },
      sendgrid: {
        ...updatedConfig.sendgrid,
        apiKey: updatedConfig.sendgrid?.apiKey ? '***HIDDEN***' : null
      },
      mailgun: {
        ...updatedConfig.mailgun,
        apiKey: updatedConfig.mailgun?.apiKey ? '***HIDDEN***' : null
      },
      ses: {
        ...updatedConfig.ses,
        accessKeyId: updatedConfig.ses?.accessKeyId ? '***HIDDEN***' : null,
        secretAccessKey: updatedConfig.ses?.secretAccessKey ? '***HIDDEN***' : null
      }
    };

    res.json({
      success: true,
      data: safeConfig,
      message: 'Email configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating email configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test email configuration
router.post('/test', async (req, res) => {
  try {
    const { config, testEmail } = req.body;

    let testConfig = config;
    if (!testConfig) {
      testConfig = getEmailConfig();
    }

    // Override test email if provided
    if (testEmail) {
      testConfig.testEmail = testEmail;
    }

    const result = await testEmailConfig(testConfig);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error testing email configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send test email with current configuration
router.post('/send-test', async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email (to) is required'
      });
    }

    const emailService = require('../../../services/email');

    const result = await emailService.sendTestEmail({
      to,
      subject: subject || 'WorkLink Email Configuration Test',
      text: message || 'This is a test email from WorkLink to verify your email configuration.',
      html: `<p>${message || 'This is a test email from WorkLink to verify your email configuration.'}</p>`
    });

    res.json({
      success: true,
      data: result,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get email service status and health
router.get('/health', async (req, res) => {
  try {
    const config = getEmailConfig();
    const emailService = require('../../../services/email');

    let serviceStatus = 'unknown';
    let details = {};

    try {
      // Try to initialize the email service
      if (!emailService.isInitialized) {
        await emailService.initialize();
      }
      serviceStatus = 'healthy';
      details.message = 'Email service is ready';
    } catch (error) {
      serviceStatus = 'unhealthy';
      details.error = error.message;
    }

    // Get recent delivery statistics (lazy loaded)
    const EmailDeliveryTracker = require('../../../services/email/delivery-tracker');
    const deliveryTracker = new EmailDeliveryTracker();
    const recentStats = deliveryTracker.getDeliveryAnalytics('1h');

    res.json({
      success: true,
      data: {
        status: serviceStatus,
        provider: config.provider,
        details,
        recentStats: {
          totalEmails: recentStats?.overall?.total_emails || 0,
          delivered: recentStats?.overall?.delivered || 0,
          failed: recentStats?.overall?.failed || 0,
          pending: recentStats?.overall?.pending || 0
        }
      }
    });
  } catch (error) {
    console.error('Error checking email service health:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available email templates
router.get('/templates', (req, res) => {
  try {
    const EmailTemplates = require('../../../services/email/templates');
    const templates = new EmailTemplates();

    // Get list of available templates
    const availableTemplates = [
      {
        name: 'tender-alert',
        description: 'Notification for new tender matches',
        category: 'alerts'
      },
      {
        name: 'candidate-update',
        description: 'Updates about candidate status changes',
        category: 'updates'
      },
      {
        name: 'report-daily',
        description: 'Daily activity and metrics report',
        category: 'reports'
      },
      {
        name: 'report-weekly',
        description: 'Weekly summary and analytics report',
        category: 'reports'
      },
      {
        name: 'job-alert',
        description: 'Job matching notifications for candidates',
        category: 'alerts'
      },
      {
        name: 'welcome',
        description: 'Welcome email for new users',
        category: 'onboarding'
      }
    ];

    res.json({
      success: true,
      data: availableTemplates
    });
  } catch (error) {
    console.error('Error getting email templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Preview email template
router.post('/templates/:templateName/preview', async (req, res) => {
  try {
    const { templateName } = req.params;
    const { data = {} } = req.body;

    const EmailTemplates = require('../../../services/email/templates');
    const templates = new EmailTemplates();

    // Sample data for template preview
    const sampleData = {
      'tender-alert': {
        recipientName: 'Admin User',
        alert: {
          keyword: 'Supply of Manpower Services',
          id: 'alert123'
        },
        tender: {
          title: 'Provision of Manpower Services for Event Support',
          agency: 'Singapore Tourism Board',
          category: 'Manpower Services',
          estimated_value: 50000,
          closing_date: '2024-03-15',
          location: 'Singapore',
          external_url: 'https://example.com/tender'
        },
        alertUrl: 'https://worklink.sg/admin/alerts/alert123',
        tenderUrl: 'https://example.com/tender'
      },
      'candidate-update': {
        adminName: 'Admin User',
        candidate: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+65 9123 4567',
          status: 'active',
          id: 'cand123'
        },
        updateType: 'Profile Updated',
        data: {
          description: 'Candidate updated their skills and availability'
        },
        candidateUrl: 'https://worklink.sg/admin/candidates/cand123'
      },
      'report-daily': {
        reportData: {
          date: new Date().toLocaleDateString(),
          candidates: { new: 5 },
          jobs: { posted: 8, filled: 6 },
          revenue: '$12,500',
          highlights: {
            item1: 'Successfully filled all event support positions',
            item2: 'New partnership with major hospitality client',
            item3: 'Achieved 98% on-time deployment rate'
          }
        },
        generatedAt: new Date().toISOString()
      }
    };

    // Merge sample data with provided data
    const templateData = {
      ...sampleData[templateName],
      ...data
    };

    const rendered = await templates.render(templateName, templateData);

    res.json({
      success: true,
      data: {
        templateName,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        sampleData: templateData
      }
    });
  } catch (error) {
    console.error('Error previewing email template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reset email configuration to defaults
router.post('/reset', (req, res) => {
  try {
    const { DEFAULT_CONFIG } = require('../../../config/email');

    const resetConfig = updateEmailConfig(DEFAULT_CONFIG);

    // Return safe config (without sensitive data)
    const safeConfig = {
      ...resetConfig,
      smtp: {
        ...resetConfig.smtp,
        auth: {
          user: resetConfig.smtp?.auth?.user,
          pass: resetConfig.smtp?.auth?.pass ? '***HIDDEN***' : null
        }
      }
    };

    res.json({
      success: true,
      data: safeConfig,
      message: 'Email configuration reset to defaults'
    });
  } catch (error) {
    console.error('Error resetting email configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;