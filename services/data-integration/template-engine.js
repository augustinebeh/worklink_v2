/**
 * Template Engine
 *
 * Powerful template system that integrates real data into response templates,
 * with conditional logic and dynamic content generation.
 */

class TemplateEngine {
  constructor() {
    this.templates = new Map();
    this.helpers = new Map();
    this.filters = new Map();

    // Register built-in helpers
    this.registerBuiltInHelpers();
    this.registerBuiltInFilters();
    this.loadTemplates();
  }

  /**
   * Register a template
   * @param {string} name - Template name
   * @param {string} template - Template content
   */
  registerTemplate(name, template) {
    this.templates.set(name, this.compileTemplate(template));
  }

  /**
   * Register a helper function
   * @param {string} name - Helper name
   * @param {Function} fn - Helper function
   */
  registerHelper(name, fn) {
    this.helpers.set(name, fn);
  }

  /**
   * Register a filter function
   * @param {string} name - Filter name
   * @param {Function} fn - Filter function
   */
  registerFilter(name, fn) {
    this.filters.set(name, fn);
  }

  /**
   * Render a template with data
   * @param {string} templateName - Template name
   * @param {Object} data - Data to render
   * @param {Object} options - Rendering options
   * @returns {string} Rendered content
   */
  render(templateName, data = {}, options = {}) {
    try {
      const template = this.templates.get(templateName);
      if (!template) {
        throw new Error(`Template '${templateName}' not found`);
      }

      return template(data, options);
    } catch (error) {
      console.error(`Template rendering error for '${templateName}':`, error);
      return this.renderErrorTemplate(templateName, error, data);
    }
  }

  /**
   * Compile template string into executable function
   * @param {string} templateString - Template content
   * @returns {Function} Compiled template function
   */
  compileTemplate(templateString) {
    return (data, options = {}) => {
      let result = templateString;

      // Process conditionals first
      result = this.processConditionals(result, data);

      // Process loops
      result = this.processLoops(result, data);

      // Process variables
      result = this.processVariables(result, data);

      // Process helpers
      result = this.processHelpers(result, data);

      // Process filters
      result = this.processFilters(result, data);

      // Clean up any remaining template syntax
      result = this.cleanupSyntax(result);

      return result;
    };
  }

  /**
   * Process conditional statements in template
   * @param {string} template - Template content
   * @param {Object} data - Data context
   * @returns {string} Processed template
   */
  processConditionals(template, data) {
    // Handle {{#if condition}}...{{/if}}
    const ifPattern = /\{\{\#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    template = template.replace(ifPattern, (match, condition, content) => {
      const result = this.evaluateCondition(condition, data);
      return result ? content : '';
    });

    // Handle {{#if condition}}...{{else}}...{{/if}}
    const ifElsePattern = /\{\{\#if\s+([^}]+)\}\}([\s\S]*?)\{\{\#else\}\}([\s\S]*?)\{\{\/if\}\}/g;
    template = template.replace(ifElsePattern, (match, condition, ifContent, elseContent) => {
      const result = this.evaluateCondition(condition, data);
      return result ? ifContent : elseContent;
    });

    // Handle {{#unless condition}}...{{/unless}}
    const unlessPattern = /\{\{\#unless\s+([^}]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g;
    template = template.replace(unlessPattern, (match, condition, content) => {
      const result = this.evaluateCondition(condition, data);
      return !result ? content : '';
    });

    return template;
  }

  /**
   * Process loop statements in template
   * @param {string} template - Template content
   * @param {Object} data - Data context
   * @returns {string} Processed template
   */
  processLoops(template, data) {
    // Handle {{#each array}}...{{/each}}
    const eachPattern = /\{\{\#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    template = template.replace(eachPattern, (match, arrayPath, content) => {
      const array = this.getNestedValue(data, arrayPath);
      if (!Array.isArray(array) || array.length === 0) {
        return '';
      }

      return array.map((item, index) => {
        let itemContent = content;

        // Replace {{this}} with current item
        itemContent = itemContent.replace(/\{\{this\}\}/g, this.formatValue(item));

        // Replace {{@index}} with current index
        itemContent = itemContent.replace(/\{\{@index\}\}/g, index);

        // Replace {{@first}} and {{@last}}
        itemContent = itemContent.replace(/\{\{@first\}\}/g, index === 0);
        itemContent = itemContent.replace(/\{\{@last\}\}/g, index === array.length - 1);

        // Process nested properties if item is object
        if (typeof item === 'object' && item !== null) {
          itemContent = this.processVariables(itemContent, item);
        }

        return itemContent;
      }).join('');
    });

    return template;
  }

  /**
   * Process variable substitutions in template
   * @param {string} template - Template content
   * @param {Object} data - Data context
   * @returns {string} Processed template
   */
  processVariables(template, data) {
    // Handle simple variables {{variable}}
    const variablePattern = /\{\{([^#/][^}]*)\}\}/g;
    template = template.replace(variablePattern, (match, variable) => {
      const cleanVariable = variable.trim();

      // Skip if it's a helper or already processed
      if (cleanVariable.includes('(') || cleanVariable.includes('|')) {
        return match;
      }

      const value = this.getNestedValue(data, cleanVariable);
      return this.formatValue(value);
    });

    return template;
  }

  /**
   * Process helper functions in template
   * @param {string} template - Template content
   * @param {Object} data - Data context
   * @returns {string} Processed template
   */
  processHelpers(template, data) {
    // Handle helper functions {{helperName arg1 arg2}}
    const helperPattern = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\s+([^}]*)\}\}/g;
    template = template.replace(helperPattern, (match, helperName, args) => {
      const helper = this.helpers.get(helperName);
      if (!helper) {
        return match; // Return original if helper not found
      }

      try {
        const parsedArgs = this.parseHelperArgs(args, data);
        return helper(...parsedArgs);
      } catch (error) {
        console.error(`Helper '${helperName}' error:`, error);
        return match;
      }
    });

    return template;
  }

  /**
   * Process filter functions in template
   * @param {string} template - Template content
   * @param {Object} data - Data context
   * @returns {string} Processed template
   */
  processFilters(template, data) {
    // Handle filters {{variable | filterName arg1 arg2}}
    const filterPattern = /\{\{([^|{}]*)\|([^}]*)\}\}/g;
    template = template.replace(filterPattern, (match, variable, filters) => {
      let value = this.getNestedValue(data, variable.trim());

      // Split and process multiple filters
      const filterChain = filters.split('|');

      filterChain.forEach(filterExpr => {
        const parts = filterExpr.trim().split(/\s+/);
        const filterName = parts[0];
        const filterArgs = parts.slice(1);

        const filter = this.filters.get(filterName);
        if (filter) {
          try {
            const parsedArgs = filterArgs.map(arg => this.parseValue(arg, data));
            value = filter(value, ...parsedArgs);
          } catch (error) {
            console.error(`Filter '${filterName}' error:`, error);
          }
        }
      });

      return this.formatValue(value);
    });

    return template;
  }

  /**
   * Clean up any remaining template syntax
   * @param {string} template - Template content
   * @returns {string} Cleaned template
   */
  cleanupSyntax(template) {
    // Remove any unprocessed template tags
    template = template.replace(/\{\{[^}]*\}\}/g, '');

    // Clean up multiple consecutive line breaks
    template = template.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Trim whitespace
    template = template.trim();

    return template;
  }

  /**
   * Evaluate conditional expression
   * @param {string} condition - Condition to evaluate
   * @param {Object} data - Data context
   * @returns {boolean} Evaluation result
   */
  evaluateCondition(condition, data) {
    try {
      const cleanCondition = condition.trim();

      // Handle comparison operators
      if (cleanCondition.includes('==')) {
        const [left, right] = cleanCondition.split('==').map(s => s.trim());
        return this.getNestedValue(data, left) == this.parseValue(right, data);
      }

      if (cleanCondition.includes('!=')) {
        const [left, right] = cleanCondition.split('!=').map(s => s.trim());
        return this.getNestedValue(data, left) != this.parseValue(right, data);
      }

      if (cleanCondition.includes('>=')) {
        const [left, right] = cleanCondition.split('>=').map(s => s.trim());
        return this.getNestedValue(data, left) >= this.parseValue(right, data);
      }

      if (cleanCondition.includes('<=')) {
        const [left, right] = cleanCondition.split('<=').map(s => s.trim());
        return this.getNestedValue(data, left) <= this.parseValue(right, data);
      }

      if (cleanCondition.includes('>')) {
        const [left, right] = cleanCondition.split('>').map(s => s.trim());
        return this.getNestedValue(data, left) > this.parseValue(right, data);
      }

      if (cleanCondition.includes('<')) {
        const [left, right] = cleanCondition.split('<').map(s => s.trim());
        return this.getNestedValue(data, left) < this.parseValue(right, data);
      }

      // Simple truthiness check
      const value = this.getNestedValue(data, cleanCondition);
      return this.isTruthy(value);
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }

  /**
   * Check if value is truthy in template context
   * @param {any} value - Value to check
   * @returns {boolean} Truthiness
   */
  isTruthy(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }

  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Object to traverse
   * @param {string} path - Dot-separated path
   * @returns {any} Value at path
   */
  getNestedValue(obj, path) {
    if (!obj || !path) return undefined;

    try {
      return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : undefined;
      }, obj);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Parse value with context
   * @param {string} value - Value to parse
   * @param {Object} data - Data context
   * @returns {any} Parsed value
   */
  parseValue(value, data) {
    const cleanValue = value.trim();

    // String literals
    if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) ||
        (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
      return cleanValue.slice(1, -1);
    }

    // Numbers
    if (/^\d+(\.\d+)?$/.test(cleanValue)) {
      return parseFloat(cleanValue);
    }

    // Booleans
    if (cleanValue === 'true') return true;
    if (cleanValue === 'false') return false;
    if (cleanValue === 'null') return null;

    // Variables
    return this.getNestedValue(data, cleanValue);
  }

  /**
   * Parse helper arguments
   * @param {string} argsString - Arguments string
   * @param {Object} data - Data context
   * @returns {Array} Parsed arguments
   */
  parseHelperArgs(argsString, data) {
    if (!argsString.trim()) return [];

    const args = [];
    const parts = argsString.trim().split(/\s+/);

    parts.forEach(part => {
      args.push(this.parseValue(part, data));
    });

    return args;
  }

  /**
   * Format value for output
   * @param {any} value - Value to format
   * @returns {string} Formatted value
   */
  formatValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /**
   * Register built-in helper functions
   */
  registerBuiltInHelpers() {
    // Currency formatter
    this.registerHelper('currency', (amount) => {
      if (typeof amount !== 'number') return '0.00';
      return new Intl.NumberFormat('en-SG', {
        style: 'currency',
        currency: 'SGD'
      }).format(amount);
    });

    // Date formatter
    this.registerHelper('date', (date, format = 'short') => {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d)) return '';

      const formatters = {
        short: new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }),
        long: new Intl.DateTimeFormat('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        time: new Intl.DateTimeFormat('en-SG', { hour: 'numeric', minute: '2-digit', hour12: true })
      };

      return formatters[format] ? formatters[format].format(d) : d.toLocaleDateString();
    });

    // Pluralize helper
    this.registerHelper('pluralize', (count, singular, plural) => {
      return count === 1 ? singular : (plural || singular + 's');
    });

    // Conditional helper
    this.registerHelper('if', (condition, trueValue, falseValue = '') => {
      return condition ? trueValue : falseValue;
    });

    // Math helpers
    this.registerHelper('add', (a, b) => (a || 0) + (b || 0));
    this.registerHelper('subtract', (a, b) => (a || 0) - (b || 0));
    this.registerHelper('multiply', (a, b) => (a || 0) * (b || 0));
    this.registerHelper('divide', (a, b) => b !== 0 ? (a || 0) / b : 0);

    // Comparison helpers
    this.registerHelper('eq', (a, b) => a === b);
    this.registerHelper('ne', (a, b) => a !== b);
    this.registerHelper('gt', (a, b) => a > b);
    this.registerHelper('lt', (a, b) => a < b);
    this.registerHelper('gte', (a, b) => a >= b);
    this.registerHelper('lte', (a, b) => a <= b);

    // String helpers
    this.registerHelper('uppercase', (str) => String(str || '').toUpperCase());
    this.registerHelper('lowercase', (str) => String(str || '').toLowerCase());
    this.registerHelper('capitalize', (str) => {
      const s = String(str || '');
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    });

    // Array helpers
    this.registerHelper('length', (arr) => Array.isArray(arr) ? arr.length : 0);
    this.registerHelper('first', (arr) => Array.isArray(arr) && arr.length > 0 ? arr[0] : '');
    this.registerHelper('last', (arr) => Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : '');

    // Default value helper
    this.registerHelper('default', (value, defaultValue) => {
      return (value !== null && value !== undefined && value !== '') ? value : defaultValue;
    });
  }

  /**
   * Register built-in filter functions
   */
  registerBuiltInFilters() {
    // Uppercase filter
    this.registerFilter('upper', (str) => String(str || '').toUpperCase());

    // Lowercase filter
    this.registerFilter('lower', (str) => String(str || '').toLowerCase());

    // Capitalize filter
    this.registerFilter('capitalize', (str) => {
      const s = String(str || '');
      return s.charAt(0).toUpperCase() + s.slice(1);
    });

    // Truncate filter
    this.registerFilter('truncate', (str, length = 50) => {
      const s = String(str || '');
      return s.length > length ? s.substring(0, length) + '...' : s;
    });

    // Currency filter
    this.registerFilter('currency', (amount) => {
      if (typeof amount !== 'number') return '0.00';
      return new Intl.NumberFormat('en-SG', {
        style: 'currency',
        currency: 'SGD'
      }).format(amount);
    });

    // Date filter
    this.registerFilter('date', (date, format = 'short') => {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d)) return '';

      switch (format) {
        case 'short':
          return d.toLocaleDateString('en-SG');
        case 'long':
          return d.toLocaleDateString('en-SG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        case 'time':
          return d.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', hour12: true });
        default:
          return d.toLocaleDateString('en-SG');
      }
    });

    // Default filter
    this.registerFilter('default', (value, defaultValue) => {
      return (value !== null && value !== undefined && value !== '') ? value : defaultValue;
    });

    // Join filter
    this.registerFilter('join', (arr, separator = ', ') => {
      if (!Array.isArray(arr)) return '';
      return arr.join(separator);
    });
  }

  /**
   * Load predefined templates
   */
  loadTemplates() {
    // Payment status template
    this.registerTemplate('payment_status', `
💰 **Your Payment Status**

{{#if summary.totalEarnings}}
• **Total Earnings**: {{currency summary.totalEarnings}}
{{/if}}

{{#if summary.pendingAmount}}
• **Pending Approval**: {{currency summary.pendingAmount}}
{{/if}}

{{#if summary.approvedAmount}}
• **Approved (Next Payment)**: {{currency summary.approvedAmount}}
{{/if}}

{{#if currentStatus.nextPaymentDate}}
📅 **Next Payment**: {{date currentStatus.nextPaymentDate}} (Friday)
{{/if}}

{{#if timeline.pendingPayments}}
⏳ **Pending Payments:**
{{#each timeline.pendingPayments}}
• {{title}} ({{date jobDate}}) - {{currency amount}}
{{#if daysUntilPayment}}
  Expected in {{daysUntilPayment}} {{pluralize daysUntilPayment "day"}}
{{/if}}
{{/each}}
{{/if}}

{{#if bankDetails.isValid}}
🏦 **Bank**: {{bankDetails.bankName}} (...{{bankDetails.accountNumber}})
{{else}}
⚠️ **Action Needed**: Please update your bank details
{{/if}}
    `.trim());

    // Job opportunities template
    this.registerTemplate('job_opportunities', `
🎯 **Available Job Opportunities**

{{#if opportunities.totalAvailable}}
📊 **{{opportunities.totalAvailable}} jobs match your profile!**

{{#if opportunities.matchingJobs}}
🔝 **Top Matches:**
{{#each opportunities.matchingJobs}}
• **{{title}}**
  📅 {{date date}} at {{time startTime}} | 📍 {{location}}
  💰 {{currency estimatedEarnings}} | 🎯 {{matchScore}}% match
  {{#if isUrgent}}🔥 **Urgent** - Apply quickly!{{/if}}
  {{#if isFeatured}}⭐ **Featured opportunity**{{/if}}
{{/each}}
{{/if}}

📱 **Open the Jobs tab** to view all opportunities and apply!
{{else}}
No jobs are currently available that match your profile. New opportunities are posted regularly, so check back soon!

{{#if summary.completedJobs}}
{{#if lt summary.completedJobs 3}}
💡 **Tip**: Complete more jobs to unlock better opportunities!
{{/if}}
{{/if}}
{{/if}}
    `.trim());

    // Account verification template
    this.registerTemplate('account_verification', `
🔐 **Account Verification Status**

{{#if verification.overallStatus}}
{{#if eq verification.overallStatus "verified"}}✅{{/if}}
{{#if eq verification.overallStatus "mostly_verified"}}🟡{{/if}}
{{#if eq verification.overallStatus "pending"}}🟠{{/if}}
**Status**: {{verification.overallMessage}}
{{/if}}

📊 **Completion**: {{verification.completionPercentage}}%

**Verification Checklist:**
{{if checks.personalInfo.isValid "✅" "❌"}} Personal Information
{{if checks.bankDetails.isValid "✅" "❌"}} Bank Details
{{if checks.documents.isValid "✅" "❌"}} Documents
{{if checks.skillsAndCertifications.isValid "✅" "❌"}} Skills & Certifications
{{#unless checks.profilePhoto.required}}📷{{else}}{{if checks.profilePhoto.isValid "✅" "❌"}}{{/unless}} Profile Photo

{{#if requirements.nextSteps}}
📝 **Next Steps:**
{{#each requirements.nextSteps}}
{{#if eq priority "high"}}🔥{{/if}}
{{#if eq priority "medium"}}🟡{{/if}}
{{#if eq priority "low"}}🔵{{/if}}
{{action}} - {{description}}
{{/each}}
{{/if}}

{{#if accountSettings}}
**Current Capabilities:**
{{if accountSettings.canApplyForJobs "✅" "❌"}} Apply for jobs
{{if accountSettings.canReceivePayments "✅" "❌"}} Receive payments
{{/if}}
    `.trim());

    // Withdrawal status template
    this.registerTemplate('withdrawal_status', `
💸 **Withdrawal Status**

💰 **Available Balance**: {{currency balance.availableBalance}}
{{#if balance.pendingBalance}}
⏳ **Pending**: {{currency balance.pendingBalance}}
{{/if}}

{{#if eligibility.canWithdraw}}
✅ **You can withdraw now!**

**Withdrawal Limits:**
• Minimum: {{currency limits.minimumWithdrawal}}
• Maximum: {{currency limits.maximumWithdrawal}}
{{#if limits.withdrawalFee}}
• Fee: {{currency limits.withdrawalFee}}
{{/if}}
{{else}}
❌ **Withdrawal not available**

{{#if eligibility.reasons}}
**Reasons:**
{{#each eligibility.reasons}}
• {{this}}
{{/each}}
{{/if}}

{{#if eligibility.requirements}}
**Requirements:**
{{#each eligibility.requirements}}
• {{this}}
{{/each}}
{{/if}}

{{#if eligibility.nextEligibilityDate}}
📅 **Next eligible**: {{date eligibility.nextEligibilityDate}}
{{/if}}
{{/if}}

{{#if bankDetails.isValid}}
🏦 **Bank**: {{bankDetails.bankName}} (...{{bankDetails.accountNumber}})
{{else}}
⚠️ **Action Required**: Update bank details for withdrawals
{{/if}}
    `.trim());

    // Interview schedule template
    this.registerTemplate('interview_schedule', `
🎤 **Interview Status**

{{#if eq status.currentStatus "scheduled"}}📅{{/if}}
{{#if eq status.currentStatus "required"}}📝{{/if}}
{{#if eq status.currentStatus "completed"}}✅{{/if}}
{{#if eq status.currentStatus "pending"}}⏳{{/if}}
**Status**: {{status.nextAction}}

{{#if schedule.upcoming}}
📅 **Upcoming Interviews:**
{{#each schedule.upcoming}}
• **{{title}}**
  📅 {{date date}} at {{date time "time"}}
  👤 {{interviewer}}
  📍 {{location}}
  {{#if meetingLink}}🔗 [Join Meeting]({{meetingLink}}){{/if}}
  {{#if eq daysUntilInterview 0}}🔥 **Today!** Join 5 minutes early{{/if}}
  {{#if eq daysUntilInterview 1}}📱 **Tomorrow** - Prepare your documents{{/if}}
  {{#if gt daysUntilInterview 1}}📆 In {{daysUntilInterview}} days{{/if}}
{{/each}}
{{/if}}

{{#if requirements.isRequired}}
{{#unless schedule.upcoming}}
📋 **Interview Required:**
• **Reason**: {{requirements.reason}}
• **Priority**: {{requirements.priority}}
{{#if requirements.deadline}}
• **Deadline**: {{date requirements.deadline}}
{{/if}}
{{/unless}}
{{/if}}

{{#if schedule.availableSlots}}
🗓️ **Available Times** (first 3):
{{#each schedule.availableSlots}}
{{#if lt @index 3}}
• {{date date}} at {{date time "time"}}
{{/if}}
{{/each}}
{{/if}}

{{#if actions.canSchedule}}
📞 **To Schedule**: Contact support via chat or WhatsApp
{{/if}}
    `.trim());

    // General summary template
    this.registerTemplate('general_summary', `
📋 **Your WorkLink Summary**

{{#if account.verification}}
🔐 **Account**: {{account.verification.completionPercentage}}% verified
{{/if}}

{{#if jobs.summary}}
💼 **Jobs**: {{jobs.summary.completedJobs}} completed
{{#if jobs.summary.totalEarnings}}
| {{currency jobs.summary.totalEarnings}} earned
{{/if}}
{{/if}}

{{#if payments.summary}}
{{#if payments.summary.pendingAmount}}
💰 **Pending**: {{currency payments.summary.pendingAmount}}
{{/if}}
{{#if payments.summary.availableBalance}}
💸 **Available**: {{currency payments.summary.availableBalance}}
{{/if}}
{{/if}}

🎯 **Quick Actions:**
{{#if jobs.opportunities.totalAvailable}}
• Browse {{jobs.opportunities.totalAvailable}} available jobs
{{/if}}

{{#if account.verification}}
{{#if lt account.verification.completionPercentage 100}}
• Complete account verification ({{subtract 100 account.verification.completionPercentage}}% remaining)
{{/if}}
{{/if}}

{{#if withdrawals.eligibility.canWithdraw}}
• Withdraw {{currency withdrawals.balance.availableBalance}}
{{/if}}

{{#if interviews.requirements.isRequired}}
• Schedule required interview
{{/if}}
    `.trim());
  }

  /**
   * Render error template when main template fails
   * @param {string} templateName - Template name that failed
   * @param {Error} error - Error that occurred
   * @param {Object} data - Data context
   * @returns {string} Error message
   */
  renderErrorTemplate(templateName, error, data) {
    return `I'm having trouble formatting that information right now. Please try again in a moment or contact support if the issue persists.

Error: Template '${templateName}' failed to render.`;
  }

  /**
   * Check if template exists
   * @param {string} templateName - Template name
   * @returns {boolean} Whether template exists
   */
  hasTemplate(templateName) {
    return this.templates.has(templateName);
  }

  /**
   * Get list of available templates
   * @returns {Array<string>} Template names
   */
  getTemplateNames() {
    return Array.from(this.templates.keys());
  }
}

module.exports = TemplateEngine;