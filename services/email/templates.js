/**
 * Email Templates System
 * Handles HTML email template rendering with dynamic data
 */

const fs = require('fs').promises;
const path = require('path');

class EmailTemplates {
  constructor() {
    this.templateCache = new Map();
    this.templateDir = path.join(__dirname, 'templates');
  }

  /**
   * Render email template with data
   */
  async render(templateName, data = {}) {
    const template = await this.getTemplate(templateName);

    // Process template with data
    const processedHtml = this.processTemplate(template.html, data);
    const processedText = this.processTemplate(template.text, data);

    return {
      html: processedHtml,
      text: processedText,
      subject: this.processTemplate(template.subject, data)
    };
  }

  /**
   * Get template from cache or file system
   */
  async getTemplate(templateName) {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    // Load from inline templates
    const template = this.getInlineTemplate(templateName);
    if (template) {
      this.templateCache.set(templateName, template);
      return template;
    }

    throw new Error(`Email template not found: ${templateName}`);
  }

  /**
   * Process template string with data
   */
  processTemplate(template, data) {
    if (!template) return '';

    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
      return this.getNestedValue(data, key) || match;
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, key) {
    return key.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
  }

  /**
   * Inline email templates
   */
  getInlineTemplate(templateName) {
    const templates = {
      'tender-alert': {
        subject: 'New Tender Alert: {{alert.keyword}} - {{tender.title}}',
        html: this.getTenderAlertHtml(),
        text: this.getTenderAlertText()
      },

      'candidate-update': {
        subject: 'Candidate Update: {{candidate.name}} - {{updateType}}',
        html: this.getCandidateUpdateHtml(),
        text: this.getCandidateUpdateText()
      },

      'report-daily': {
        subject: 'WorkLink Daily Report - {{reportData.date}}',
        html: this.getDailyReportHtml(),
        text: this.getDailyReportText()
      },

      'report-weekly': {
        subject: 'WorkLink Weekly Report - {{reportData.weekOf}}',
        html: this.getWeeklyReportHtml(),
        text: this.getWeeklyReportText()
      },

      'job-alert': {
        subject: 'New Job Match: {{job.title}} at {{job.client}}',
        html: this.getJobAlertHtml(),
        text: this.getJobAlertText()
      },

      'welcome': {
        subject: 'Welcome to WorkLink - {{recipientName}}',
        html: this.getWelcomeHtml(),
        text: this.getWelcomeText()
      }
    };

    return templates[templateName];
  }

  /**
   * Tender Alert Email Templates
   */
  getTenderAlertHtml() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tender Alert</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
        .alert-badge { background: #ef4444; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .tender-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; background: #f9fafb; }
        .tender-title { font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }
        .tender-agency { color: #6b7280; font-size: 14px; margin-bottom: 15px; }
        .tender-details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
        .detail-item { }
        .detail-label { font-weight: bold; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .detail-value { color: #1f2937; margin-top: 5px; }
        .cta-section { text-align: center; margin: 30px 0; }
        .cta-button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        .cta-button:hover { background: #1d4ed8; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
        .matched-keyword { background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Tender Alert</h1>
            <span class="alert-badge">KEYWORD MATCH</span>
        </div>

        <p>Hi {{recipientName}},</p>

        <p>A new tender has been found matching your alert for "<span class="matched-keyword">{{alert.keyword}}</span>":</p>

        <div class="tender-card">
            <div class="tender-title">{{tender.title}}</div>
            <div class="tender-agency">{{tender.agency}}</div>

            <div class="tender-details">
                <div class="detail-item">
                    <div class="detail-label">Category</div>
                    <div class="detail-value">{{tender.category}}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Estimated Value</div>
                    <div class="detail-value">
                        {{#if tender.estimated_value}}
                            ${{tender.estimated_value}}
                        {{else}}
                            Not specified
                        {{/if}}
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Closing Date</div>
                    <div class="detail-value">
                        {{#if tender.closing_date}}
                            {{tender.closing_date}}
                        {{else}}
                            TBD
                        {{/if}}
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Location</div>
                    <div class="detail-value">{{tender.location}}</div>
                </div>
            </div>
        </div>

        <div class="cta-section">
            <a href="{{tenderUrl}}" class="cta-button">View Tender Details</a>
        </div>

        <p><strong>Next Steps:</strong></p>
        <ol>
            <li>Review the tender requirements carefully</li>
            <li>Assess your capability to fulfill the contract</li>
            <li>Prepare your proposal before the closing date</li>
            <li>Submit through the appropriate channel</li>
        </ol>

        <p>You can manage your tender alerts <a href="{{alertUrl}}">here</a>.</p>

        <div class="footer">
            <p>This alert was sent because you have an active tender alert for "{{alert.keyword}}".</p>
            <p>WorkLink Tender Monitoring System</p>
        </div>
    </div>
</body>
</html>`;
  }

  getTenderAlertText() {
    return `
TENDER ALERT: {{alert.keyword}}

Hi {{recipientName}},

A new tender has been found matching your alert for "{{alert.keyword}}":

TENDER DETAILS:
Title: {{tender.title}}
Agency: {{tender.agency}}
Category: {{tender.category}}
Estimated Value: {{tender.estimated_value}}
Closing Date: {{tender.closing_date}}
Location: {{tender.location}}

View full tender details: {{tenderUrl}}

NEXT STEPS:
1. Review the tender requirements carefully
2. Assess your capability to fulfill the contract
3. Prepare your proposal before the closing date
4. Submit through the appropriate channel

Manage your alerts: {{alertUrl}}

---
WorkLink Tender Monitoring System
This alert was sent because you have an active tender alert for "{{alert.keyword}}".
`;
  }

  /**
   * Candidate Update Email Templates
   */
  getCandidateUpdateHtml() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Candidate Update</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
        .update-badge { background: #3b82f6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .candidate-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; background: #f9fafb; }
        .candidate-name { font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 5px; }
        .candidate-details { color: #6b7280; font-size: 14px; }
        .update-section { margin: 20px 0; }
        .update-type { font-weight: bold; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; }
        .cta-button { display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>👤 Candidate Update</h1>
            <span class="update-badge">{{updateType}}</span>
        </div>

        <p>Hi {{adminName}},</p>

        <p>There's been an update for one of your candidates:</p>

        <div class="candidate-card">
            <div class="candidate-name">{{candidate.name}}</div>
            <div class="candidate-details">
                {{candidate.email}} • {{candidate.phone}} • Status: {{candidate.status}}
            </div>
        </div>

        <div class="update-section">
            <div class="update-type">{{updateType}}</div>
            <p>{{data.description}}</p>
        </div>

        <a href="{{candidateUrl}}" class="cta-button">View Candidate Profile</a>

        <div class="footer">
            <p>WorkLink Admin Portal</p>
        </div>
    </div>
</body>
</html>`;
  }

  getCandidateUpdateText() {
    return `
CANDIDATE UPDATE: {{updateType}}

Hi {{adminName}},

There's been an update for candidate: {{candidate.name}}

Details:
Email: {{candidate.email}}
Phone: {{candidate.phone}}
Status: {{candidate.status}}

Update Type: {{updateType}}
Description: {{data.description}}

View candidate profile: {{candidateUrl}}

---
WorkLink Admin Portal
`;
  }

  /**
   * Report Email Templates
   */
  getDailyReportHtml() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Report</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; }
        .stat-number { font-size: 32px; font-weight: bold; color: #1e40af; }
        .stat-label { color: #64748b; font-size: 14px; margin-top: 5px; }
        .section { margin: 30px 0; }
        .section-title { font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Daily Report</h1>
            <p>{{reportData.date}}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">{{reportData.candidates.new}}</div>
                <div class="stat-label">New Candidates</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{reportData.jobs.posted}}</div>
                <div class="stat-label">Jobs Posted</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{reportData.jobs.filled}}</div>
                <div class="stat-label">Jobs Filled</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{reportData.revenue}}</div>
                <div class="stat-label">Revenue</div>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Today's Highlights</h3>
            <ul>
                <li>{{reportData.highlights.item1}}</li>
                <li>{{reportData.highlights.item2}}</li>
                <li>{{reportData.highlights.item3}}</li>
            </ul>
        </div>

        <div class="footer">
            <p>WorkLink Daily Report • Generated at {{generatedAt}}</p>
        </div>
    </div>
</body>
</html>`;
  }

  getDailyReportText() {
    return `
WORKLINK DAILY REPORT
{{reportData.date}}

KEY METRICS:
- New Candidates: {{reportData.candidates.new}}
- Jobs Posted: {{reportData.jobs.posted}}
- Jobs Filled: {{reportData.jobs.filled}}
- Revenue: {{reportData.revenue}}

TODAY'S HIGHLIGHTS:
- {{reportData.highlights.item1}}
- {{reportData.highlights.item2}}
- {{reportData.highlights.item3}}

Generated at: {{generatedAt}}
`;
  }

  getWeeklyReportHtml() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Report</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
        /* Similar styles to daily report but with red theme */
    </style>
</head>
<body>
    <!-- Similar structure to daily report -->
</body>
</html>`;
  }

  getWeeklyReportText() {
    return `
WORKLINK WEEKLY REPORT
Week of {{reportData.weekOf}}

WEEKLY SUMMARY:
- Total Candidates Added: {{reportData.candidates.total}}
- Total Jobs Posted: {{reportData.jobs.posted}}
- Total Jobs Completed: {{reportData.jobs.completed}}
- Weekly Revenue: {{reportData.revenue}}

Generated at: {{generatedAt}}
`;
  }

  /**
   * Job Alert Templates
   */
  getJobAlertHtml() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Job Alert</title>
    <style>
        /* Similar styles to tender alert but with green theme */
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💼 New Job Match</h1>
        </div>
        <p>Hi {{candidateName}},</p>
        <p>We found a job that matches your profile!</p>
        <!-- Job details -->
    </div>
</body>
</html>`;
  }

  getJobAlertText() {
    return `
NEW JOB MATCH

Hi {{candidateName}},

We found a job that matches your profile:

Job: {{job.title}}
Client: {{job.client}}
Location: {{job.location}}
Pay: {{job.payRate}}

View job details: {{jobUrl}}
`;
  }

  /**
   * Welcome Email Templates
   */
  getWelcomeHtml() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to WorkLink</title>
    <style>
        body { font-family: Arial, sans-serif; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px; }
        .welcome-title { margin: 20px 0; font-size: 24px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to WorkLink!</h1>
        </div>
        <div class="welcome-title">Hi {{recipientName}}! 👋</div>
        <p>Thank you for joining WorkLink. We're excited to have you on board!</p>
        <!-- Welcome content -->
    </div>
</body>
</html>`;
  }

  getWelcomeText() {
    return `
Welcome to WorkLink!

Hi {{recipientName}},

Thank you for joining WorkLink. We're excited to have you on board!

Get started by completing your profile and exploring opportunities.
`;
  }
}

module.exports = EmailTemplates;