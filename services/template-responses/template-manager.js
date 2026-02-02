/**
 * Template Manager for Fact-Based Responses
 *
 * Manages response templates that provide honest, accurate information
 * without making false promises about timing or processes
 */

const { db } = require('../../db/database');

class TemplateManager {
  constructor() {
    this.initializeDefaultTemplates();
  }

  initializeDefaultTemplates() {
    // Ensure template tables exist
    this.createTemplateTables();

    // Load default fact-based templates
    this.loadFactBasedTemplates();
  }

  createTemplateTables() {
    // Categories for organizing templates
    db.exec(`
      INSERT OR IGNORE INTO template_categories (name, description, priority) VALUES
      ('payment_responses', 'Payment and earnings related responses', 1),
      ('verification_responses', 'Account verification and approval responses', 2),
      ('job_responses', 'Job availability and application responses', 3),
      ('support_responses', 'General support and help responses', 4),
      ('escalation_responses', 'Escalation and admin handoff responses', 5)
    `);
  }

  loadFactBasedTemplates() {
    const templates = [
      // PAYMENT RESPONSES - NO FALSE PROMISES
      {
        category: 'payment_responses',
        name: 'payment_timing_with_amount',
        triggers: ['payment', 'when', 'receive'],
        content: `I can see you have ${{pending_earnings}} in pending earnings. Payment timing depends on {{job_completion_status}} and client approval. I'll have the admin team check your specific situation and provide accurate timing.`,
        requires_real_data: 1,
        variables: [
          { name: 'pending_earnings', source: 'payment', field: 'pending_earnings', format: 'currency' },
          { name: 'job_completion_status', source: 'calculated', field: 'job_status_summary', format: 'text' }
        ]
      },

      {
        category: 'payment_responses',
        name: 'payment_general_inquiry',
        triggers: ['payment', 'money', 'salary'],
        content: `Hi {{first_name}}! Payment timing varies by job type and client approval process. I'll flag this for the admin team to check your specific payment status and provide you with accurate information.`,
        requires_real_data: 0,
        variables: [
          { name: 'first_name', source: 'candidate', field: 'name', format: 'first_name' }
        ]
      },

      {
        category: 'payment_responses',
        name: 'withdrawal_with_balance',
        triggers: ['withdraw', 'withdrawal', 'cash out'],
        content: `You have ${{available_earnings}} available for withdrawal. The admin team handles withdrawal processing - I'll flag your request for priority review to get you the current process and timeline.`,
        requires_real_data: 1,
        variables: [
          { name: 'available_earnings', source: 'payment', field: 'available_for_withdrawal', format: 'currency' }
        ]
      },

      // VERIFICATION RESPONSES - HELPFUL BUT HONEST
      {
        category: 'verification_responses',
        name: 'pending_verification_with_interview',
        triggers: ['verify', 'verification', 'pending'],
        content: `Hi {{first_name}}! Your account is under review. I can help speed up the process by scheduling a verification interview with our recruitment consultant. This often helps with faster approval. Would you like me to check available times?`,
        requires_real_data: 0,
        variables: [
          { name: 'first_name', source: 'candidate', field: 'name', format: 'first_name' }
        ]
      },

      {
        category: 'verification_responses',
        name: 'verification_status_check',
        triggers: ['status', 'approved', 'when'],
        content: `Account verification is handled by our admin team. I'll check with them about your current status and next steps. They'll provide you with accurate timeline information.`,
        requires_real_data: 0
      },

      // JOB RESPONSES - BASED ON REAL AVAILABILITY
      {
        category: 'job_responses',
        name: 'job_inquiry_with_count',
        triggers: ['job', 'work', 'available'],
        content: `{{#if upcoming_jobs_count}}You have {{upcoming_jobs_count}} upcoming job(s) scheduled. Check your Jobs tab for details.{{else}}I'll have the admin team check for current job opportunities that match your profile and location.{{/if}}`,
        requires_real_data: 1,
        variables: [
          { name: 'upcoming_jobs_count', source: 'jobs', field: 'upcoming_jobs.length', format: 'number' }
        ]
      },

      {
        category: 'job_responses',
        name: 'application_status',
        triggers: ['application', 'applied', 'status'],
        content: `{{#if pending_applications_count}}You have {{pending_applications_count}} application(s) under review. The admin team will update you once employers make their decisions.{{else}}I don't see any pending applications. The admin team can help you find suitable opportunities.{{/if}}`,
        requires_real_data: 1,
        variables: [
          { name: 'pending_applications_count', source: 'jobs', field: 'pending_applications.length', format: 'number' }
        ]
      },

      // SUPPORT RESPONSES - HELPFUL ESCALATION
      {
        category: 'support_responses',
        name: 'technical_issue_escalation',
        triggers: ['error', 'bug', 'not working', 'problem'],
        content: `Hi {{first_name}}! I've flagged this technical issue for immediate admin attention. Please describe any additional details about what you're experiencing so they can assist you properly.`,
        requires_real_data: 0,
        variables: [
          { name: 'first_name', source: 'candidate', field: 'name', format: 'first_name' }
        ]
      },

      {
        category: 'support_responses',
        name: 'general_help_escalation',
        triggers: ['help', 'question', 'information'],
        content: `Thanks for your message! I'll make sure the right admin team member assists with your specific question. They'll get back to you with accurate information and next steps.`,
        requires_real_data: 0
      },

      // ESCALATION RESPONSES - IMMEDIATE ADMIN ATTENTION
      {
        category: 'escalation_responses',
        name: 'urgent_escalation',
        triggers: ['urgent', 'emergency', 'asap'],
        content: `Hi {{first_name}}, I understand this is urgent. I've flagged your message for immediate admin attention and they'll respond personally within the next few hours. Thank you for your patience.`,
        requires_real_data: 0,
        variables: [
          { name: 'first_name', source: 'candidate', field: 'name', format: 'first_name' }
        ]
      },

      {
        category: 'escalation_responses',
        name: 'complaint_escalation',
        triggers: ['complaint', 'angry', 'frustrated'],
        content: `Hi {{first_name}}, I understand your concern and I want to make sure this gets the attention it deserves. I've escalated this to our admin team for immediate review and they'll reach out to resolve this properly.`,
        requires_real_data: 0,
        variables: [
          { name: 'first_name', source: 'candidate', field: 'name', format: 'first_name' }
        ]
      }
    ];

    // Insert templates
    templates.forEach(template => {
      this.createTemplate(template);
    });
  }

  /**
   * Create a new template
   */
  createTemplate(templateData) {
    try {
      // Get category ID
      const category = db.prepare(`
        SELECT id FROM template_categories WHERE name = ?
      `).get(templateData.category);

      if (!category) {
        console.error(`❌ [Template] Category not found: ${templateData.category}`);
        return null;
      }

      // Check if template already exists
      const existing = db.prepare(`
        SELECT id FROM response_templates WHERE name = ?
      `).get(templateData.name);

      if (existing) {
        console.log(`⚠️ [Template] Template already exists: ${templateData.name}`);
        return existing.id;
      }

      // Insert template
      const templateId = db.prepare(`
        INSERT INTO response_templates (
          category_id, name, trigger_patterns, template_content,
          requires_real_data, confidence_score
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        category.id,
        templateData.name,
        JSON.stringify(templateData.triggers),
        templateData.content,
        templateData.requires_real_data || 0,
        templateData.confidence || 0.8
      ).lastInsertRowid;

      // Insert variables if provided
      if (templateData.variables) {
        templateData.variables.forEach(variable => {
          db.prepare(`
            INSERT INTO template_variables (
              template_id, variable_name, data_source, field_path,
              fallback_value, format_type
            ) VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            templateId,
            variable.name,
            variable.source,
            variable.field,
            variable.fallback || '',
            variable.format || 'text'
          );
        });
      }

      console.log(`✅ [Template] Created template: ${templateData.name}`);
      return templateId;

    } catch (error) {
      console.error(`❌ [Template] Error creating template ${templateData.name}:`, error);
      return null;
    }
  }

  /**
   * Find the best matching template for an intent
   */
  async findBestTemplate(intent, language = 'en') {
    try {
      const templates = db.prepare(`
        SELECT rt.*, tc.name as category_name
        FROM response_templates rt
        JOIN template_categories tc ON rt.category_id = tc.id
        WHERE rt.active = 1 AND rt.language = ?
        ORDER BY rt.confidence_score DESC, rt.usage_count DESC
      `).all(language);

      let bestTemplate = null;
      let bestScore = 0;

      for (const template of templates) {
        const score = this.calculateTemplateScore(intent, template);
        if (score > bestScore) {
          bestScore = score;
          bestTemplate = template;
        }
      }

      if (bestTemplate && bestScore > 0.3) {
        // Get template variables
        const variables = db.prepare(`
          SELECT * FROM template_variables WHERE template_id = ?
        `).all(bestTemplate.id);

        bestTemplate.variables = variables;
        return bestTemplate;
      }

      return null;
    } catch (error) {
      console.error('❌ [Template] Error finding template:', error);
      return null;
    }
  }

  /**
   * Calculate how well a template matches an intent
   */
  calculateTemplateScore(intent, template) {
    try {
      const triggerPatterns = JSON.parse(template.trigger_patterns);
      const intentCategory = intent.category.toLowerCase();
      const templateCategory = template.category_name.toLowerCase();

      let score = 0;

      // Category match bonus
      if (templateCategory.includes(intentCategory.split('_')[0])) {
        score += 0.5;
      }

      // Pattern matching
      const patternMatches = triggerPatterns.filter(pattern =>
        intentCategory.includes(pattern) || intent.subcategory === pattern
      ).length;

      score += (patternMatches / triggerPatterns.length) * 0.4;

      // Confidence bonus
      score += template.confidence_score * 0.1;

      return score;
    } catch (error) {
      console.error('❌ [Template] Error calculating score:', error);
      return 0;
    }
  }

  /**
   * Generate response using template and real data
   */
  async generateResponse(template, context) {
    try {
      let content = template.template_content;
      const metadata = {
        template_id: template.id,
        template_name: template.name,
        variables_used: []
      };

      // Process template variables
      if (template.variables) {
        for (const variable of template.variables) {
          const value = this.extractVariableValue(variable, context);
          const formattedValue = this.formatValue(value, variable.format_type);

          // Replace in template
          const variablePattern = new RegExp(`{{${variable.variable_name}}}`, 'g');
          content = content.replace(variablePattern, formattedValue);

          metadata.variables_used.push({
            name: variable.variable_name,
            value: formattedValue,
            source: variable.data_source
          });
        }
      }

      // Process conditional statements (simple Handlebars-like syntax)
      content = this.processConditionals(content, context);

      // Clean up any remaining unfilled variables
      content = content.replace(/{{[^}]*}}/g, '');

      return {
        content: content.trim(),
        metadata
      };

    } catch (error) {
      console.error('❌ [Template] Error generating response:', error);
      return {
        content: "I'll have the admin team assist with your specific question and provide accurate information.",
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Extract variable value from context data
   */
  extractVariableValue(variable, context) {
    try {
      switch (variable.data_source) {
        case 'candidate':
          return this.getNestedValue(context.candidate, variable.field_path);

        case 'payment':
          return this.getNestedValue(context.realData?.payment, variable.field_path);

        case 'jobs':
          return this.getNestedValue(context.realData?.jobs, variable.field_path);

        case 'verification':
          return this.getNestedValue(context.realData?.verification, variable.field_path);

        case 'calculated':
          return this.calculateDynamicValue(variable.field_path, context);

        default:
          return variable.fallback_value || '';
      }
    } catch (error) {
      console.error(`❌ [Template] Error extracting variable ${variable.variable_name}:`, error);
      return variable.fallback_value || '';
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    if (!obj || !path) return '';

    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : '';
    }, obj);
  }

  /**
   * Calculate dynamic values
   */
  calculateDynamicValue(fieldPath, context) {
    switch (fieldPath) {
      case 'job_status_summary':
        const jobs = context.realData?.jobs;
        if (jobs?.upcoming_jobs?.length > 0) {
          return `${jobs.upcoming_jobs.length} job completion(s)`;
        }
        return 'job completion';

      default:
        return '';
    }
  }

  /**
   * Format values based on type
   */
  formatValue(value, formatType) {
    if (!value && value !== 0) return '';

    switch (formatType) {
      case 'currency':
        return `$${parseFloat(value).toFixed(2)}`;

      case 'number':
        return parseInt(value).toString();

      case 'date':
        return new Date(value).toLocaleDateString();

      case 'first_name':
        return value.split(' ')[0];

      case 'text':
      default:
        return value.toString();
    }
  }

  /**
   * Process simple conditional statements
   */
  processConditionals(content, context) {
    // Handle {{#if variable}} content {{else}} alternative {{/if}}
    const ifPattern = /{{#if\s+(\w+)}}(.*?)(?:{{else}}(.*?))?{{\/if}}/gs;

    return content.replace(ifPattern, (match, variable, ifContent, elseContent = '') => {
      const value = this.getNestedValue(context, variable);

      if (value && value !== 0 && value !== '0' && value !== false) {
        return ifContent.trim();
      } else {
        return elseContent.trim();
      }
    });
  }

  /**
   * Update template performance metrics
   */
  updateTemplateMetrics(templateId, effectiveness) {
    try {
      db.prepare(`
        UPDATE response_templates
        SET usage_count = usage_count + 1,
            success_rate = (
              SELECT AVG(effectiveness_score)
              FROM template_usage_logs
              WHERE template_id = ? AND effectiveness_score IS NOT NULL
            ),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(templateId, templateId);
    } catch (error) {
      console.error('❌ [Template] Error updating metrics:', error);
    }
  }

  /**
   * Get template analytics
   */
  getTemplateAnalytics(days = 30) {
    return db.prepare(`
      SELECT
        rt.name,
        rt.usage_count,
        rt.success_rate,
        rt.confidence_score,
        tc.name as category,
        COUNT(tul.id) as recent_usage,
        AVG(tul.effectiveness_score) as recent_effectiveness
      FROM response_templates rt
      JOIN template_categories tc ON rt.category_id = tc.id
      LEFT JOIN template_usage_logs tul ON rt.id = tul.template_id
        AND tul.created_at > datetime('now', '-' || ? || ' days')
      WHERE rt.active = 1
      GROUP BY rt.id
      ORDER BY rt.usage_count DESC, rt.success_rate DESC
    `).all(days);
  }
}

module.exports = TemplateManager;