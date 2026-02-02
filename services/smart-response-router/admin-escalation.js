/**
 * Admin Escalation System
 *
 * Handles escalation of candidate queries to admin team when:
 * 1. Intent classification confidence is too low
 * 2. Complex queries requiring human judgment
 * 3. Technical issues or complaints
 * 4. Critical account matters
 * 5. Any situation where providing incorrect information could be harmful
 *
 * Features:
 * - Priority-based escalation routing
 * - Real-time admin notifications
 * - Escalation tracking and analytics
 * - Automated follow-up reminders
 * - Professional candidate communication
 */

const { createLogger } = require('../../utils/structured-logger');
const { broadcastToAdmins } = require('../../websocket');

const logger = createLogger('admin-escalation');

class AdminEscalationSystem {
  constructor() {
    this.initializeEscalationCategories();
    this.initializePriorityMatrix();
    this.initializeResponseTemplates();

    // Escalation configuration
    this.config = {
      // Response time targets for different priorities
      responseTargets: {
        urgent: 300,     // 5 minutes
        high: 1800,      // 30 minutes
        medium: 3600,    // 1 hour
        low: 14400       // 4 hours
      },

      // Auto-escalation thresholds
      autoEscalationRules: {
        unansweredTimeUrgent: 600,    // 10 minutes
        unansweredTimeHigh: 3600,     // 1 hour
        repeatEscalations: 3          // Max repeat escalations
      },

      // Admin notification preferences
      notifications: {
        urgent: ['websocket', 'email', 'sms'],
        high: ['websocket', 'email'],
        medium: ['websocket'],
        low: ['websocket']
      }
    };
  }

  /**
   * Initialize escalation categories
   */
  initializeEscalationCategories() {
    this.escalationCategories = {
      technical_issue: {
        priority: 'high',
        department: 'technical',
        autoAssign: true,
        requiresSpecialist: true
      },

      payment_dispute: {
        priority: 'urgent',
        department: 'finance',
        autoAssign: true,
        requiresSpecialist: true
      },

      complaint_feedback: {
        priority: 'high',
        department: 'customer_service',
        autoAssign: true,
        requiresSpecialist: false
      },

      account_security: {
        priority: 'urgent',
        department: 'security',
        autoAssign: true,
        requiresSpecialist: true
      },

      job_dispute: {
        priority: 'medium',
        department: 'operations',
        autoAssign: true,
        requiresSpecialist: false
      },

      general_complex: {
        priority: 'medium',
        department: 'general',
        autoAssign: false,
        requiresSpecialist: false
      },

      low_confidence: {
        priority: 'low',
        department: 'general',
        autoAssign: false,
        requiresSpecialist: false
      },

      data_request: {
        priority: 'medium',
        department: 'data',
        autoAssign: true,
        requiresSpecialist: false
      }
    };
  }

  /**
   * Initialize priority matrix based on various factors
   */
  initializePriorityMatrix() {
    this.priorityFactors = {
      // Intent-based priority
      intentPriority: {
        payment_inquiry: 'high',
        withdrawal_request: 'high',
        technical_issue: 'high',
        complaint_feedback: 'urgent',
        account_verification: 'medium',
        job_inquiry: 'low'
      },

      // Candidate status priority
      statusPriority: {
        pending: 'medium',
        active: 'high',
        suspended: 'urgent',
        vip: 'high'
      },

      // Time-based priority
      timePriority: {
        business_hours: 'normal',
        after_hours: 'reduced',
        weekend: 'reduced'
      }
    };
  }

  /**
   * Initialize response templates for escalations
   */
  initializeResponseTemplates() {
    this.escalationTemplates = {
      general: (candidateContext, escalationInfo) => {
        const firstName = candidateContext.name.split(' ')[0];
        return `Hi ${firstName}! I want to make sure you get the best possible help with your question. I've flagged this for our admin team's attention and they'll get back to you personally within the next few hours. Thank you for your patience!`;
      },

      urgent: (candidateContext, escalationInfo) => {
        const firstName = candidateContext.name.split(' ')[0];
        return `Hi ${firstName}! I've flagged your message as urgent and our admin team has been notified immediately. They'll reach out to you very soon to address your concern. Thank you for bringing this to our attention.`;
      },

      technical: (candidateContext, escalationInfo) => {
        const firstName = candidateContext.name.split(' ')[0];
        return `Hi ${firstName}! I've reported the technical issue you're experiencing to our technical support team. They'll investigate this promptly and get back to you with a solution. In the meantime, please feel free to reach out if you encounter any other problems.`;
      },

      payment: (candidateContext, escalationInfo) => {
        const firstName = candidateContext.name.split(' ')[0];
        return `Hi ${firstName}! I've escalated your payment-related question to our finance team who can provide you with accurate and detailed information about your account. They'll review your specific situation and respond with precise details soon.`;
      },

      complaint: (candidateContext, escalationInfo) => {
        const firstName = candidateContext.name.split(' ')[0];
        return `Hi ${firstName}! Thank you for sharing your feedback with us. I've escalated this to our management team immediately to ensure your concern is addressed properly. We take all feedback seriously and someone will respond to you personally very soon.`;
      },

      complex: (candidateContext, escalationInfo) => {
        const firstName = candidateContext.name.split(' ')[0];
        return `Hi ${firstName}! Your question requires detailed attention to ensure I give you completely accurate information. I've connected you with our admin team who can provide thorough, personalized assistance. They'll be in touch shortly!`;
      }
    };
  }

  /**
   * Create escalation for candidate query
   */
  async createEscalation(candidateContext, originalMessage, intentAnalysis) {
    try {
      logger.info('Creating escalation', {
        candidateId: candidateContext.id,
        intent: intentAnalysis.primary,
        reason: intentAnalysis.escalationReason,
        confidence: intentAnalysis.confidence
      });

      // Determine escalation details
      const escalationDetails = await this.analyzeEscalationRequirements(
        candidateContext,
        originalMessage,
        intentAnalysis
      );

      // Create escalation record
      const escalationId = await this.createEscalationRecord(
        candidateContext,
        originalMessage,
        intentAnalysis,
        escalationDetails
      );

      // Notify admin team
      await this.notifyAdminTeam(escalationId, escalationDetails);

      // Generate candidate response
      const candidateResponse = await this.generateEscalationResponse(
        candidateContext,
        escalationDetails
      );

      logger.info('Escalation created successfully', {
        candidateId: candidateContext.id,
        escalationId,
        priority: escalationDetails.priority,
        department: escalationDetails.department
      });

      return {
        ...candidateResponse,
        escalationId,
        escalated: true,
        requiresAdminAttention: true,
        escalationDetails
      };

    } catch (error) {
      logger.error('Failed to create escalation', {
        candidateId: candidateContext?.id,
        error: error.message
      });

      // Return safe fallback response
      return this.generateFailsafeResponse(candidateContext);
    }
  }

  /**
   * Analyze escalation requirements
   */
  async analyzeEscalationRequirements(candidateContext, originalMessage, intentAnalysis) {
    // Determine base category
    let category = 'general_complex';

    if (intentAnalysis.escalationReason) {
      const reasons = intentAnalysis.escalationReason.split(', ');

      if (reasons.includes('technical_issue')) category = 'technical_issue';
      else if (reasons.includes('complaint')) category = 'complaint_feedback';
      else if (reasons.includes('payment')) category = 'payment_dispute';
      else if (reasons.includes('low_confidence')) category = 'low_confidence';
      else if (reasons.includes('missing_real_data')) category = 'data_request';
    }

    // Get category configuration
    const categoryConfig = this.escalationCategories[category];

    // Calculate final priority
    const calculatedPriority = this.calculateEscalationPriority(
      candidateContext,
      intentAnalysis,
      categoryConfig
    );

    // Determine response template type
    const templateType = this.determineResponseTemplate(category, calculatedPriority);

    // Check for auto-assignment
    const assignedAdmin = categoryConfig.autoAssign ?
      await this.findAvailableSpecialist(categoryConfig.department) :
      null;

    return {
      category,
      priority: calculatedPriority,
      department: categoryConfig.department,
      templateType,
      assignedAdmin,
      requiresSpecialist: categoryConfig.requiresSpecialist,
      escalationReason: intentAnalysis.escalationReason,
      originalIntent: intentAnalysis.primary,
      responseTarget: this.config.responseTargets[calculatedPriority],
      notificationMethods: this.config.notifications[calculatedPriority]
    };
  }

  /**
   * Calculate escalation priority based on multiple factors
   */
  calculateEscalationPriority(candidateContext, intentAnalysis, categoryConfig) {
    let basePriority = categoryConfig.priority;

    // Intent-based adjustments
    const intentPriority = this.priorityFactors.intentPriority[intentAnalysis.primary];
    if (intentPriority === 'urgent') basePriority = 'urgent';
    else if (intentPriority === 'high' && basePriority !== 'urgent') basePriority = 'high';

    // Candidate status adjustments
    const statusPriority = this.priorityFactors.statusPriority[candidateContext.status];
    if (statusPriority === 'urgent') basePriority = 'urgent';
    else if (statusPriority === 'high' && basePriority === 'medium') basePriority = 'high';

    // Escalation triggers adjustments
    if (intentAnalysis.escalationUrgency === 'high') {
      basePriority = 'urgent';
    }

    // Time-based adjustments
    const hour = new Date().getHours();
    const isBusinessHours = hour >= 9 && hour <= 17;
    if (!isBusinessHours && basePriority === 'low') {
      basePriority = 'low'; // Keep low priority items low after hours
    }

    return basePriority;
  }

  /**
   * Determine response template type
   */
  determineResponseTemplate(category, priority) {
    if (priority === 'urgent') return 'urgent';
    if (category === 'technical_issue') return 'technical';
    if (category === 'payment_dispute') return 'payment';
    if (category === 'complaint_feedback') return 'complaint';
    if (category === 'general_complex') return 'complex';
    return 'general';
  }

  /**
   * Create escalation record in database
   */
  async createEscalationRecord(candidateContext, originalMessage, intentAnalysis, escalationDetails) {
    try {
      const { db } = require('../../db');

      // Ensure escalations table exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS escalations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          candidate_id TEXT NOT NULL,
          message_content TEXT NOT NULL,
          original_intent TEXT,
          escalation_reason TEXT,
          category TEXT NOT NULL,
          priority TEXT NOT NULL,
          department TEXT,
          assigned_admin TEXT,
          status TEXT DEFAULT 'open',
          response_target_time DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          resolved_at DATETIME,
          admin_response TEXT,
          resolution_notes TEXT
        )
      `);

      const targetTime = new Date(Date.now() + (escalationDetails.responseTarget * 1000));

      const result = db.prepare(`
        INSERT INTO escalations (
          candidate_id, message_content, original_intent, escalation_reason,
          category, priority, department, assigned_admin, response_target_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        candidateContext.id,
        originalMessage,
        intentAnalysis.primary,
        escalationDetails.escalationReason,
        escalationDetails.category,
        escalationDetails.priority,
        escalationDetails.department,
        escalationDetails.assignedAdmin,
        targetTime.toISOString()
      );

      return result.lastInsertRowid;

    } catch (error) {
      logger.error('Failed to create escalation record', {
        candidateId: candidateContext.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Notify admin team about escalation
   */
  async notifyAdminTeam(escalationId, escalationDetails) {
    try {
      // Prepare notification data
      const notification = {
        type: 'escalation_created',
        escalationId,
        priority: escalationDetails.priority,
        category: escalationDetails.category,
        department: escalationDetails.department,
        assignedAdmin: escalationDetails.assignedAdmin,
        responseTarget: escalationDetails.responseTarget,
        timestamp: new Date().toISOString()
      };

      // Send WebSocket notification to all admin clients
      broadcastToAdmins(notification);

      // Log notification
      logger.info('Admin team notified of escalation', {
        escalationId,
        priority: escalationDetails.priority,
        notificationMethods: escalationDetails.notificationMethods
      });

      // TODO: Implement additional notification methods (email, SMS) for urgent items
      if (escalationDetails.priority === 'urgent') {
        await this.sendUrgentNotification(escalationId, escalationDetails);
      }

    } catch (error) {
      logger.error('Failed to notify admin team', {
        escalationId,
        error: error.message
      });
    }
  }

  /**
   * Send urgent notification via multiple channels
   */
  async sendUrgentNotification(escalationId, escalationDetails) {
    try {
      // TODO: Implement email and SMS notifications for urgent escalations
      logger.warn('Urgent escalation created - additional notifications should be implemented', {
        escalationId,
        department: escalationDetails.department
      });

    } catch (error) {
      logger.error('Failed to send urgent notification', {
        escalationId,
        error: error.message
      });
    }
  }

  /**
   * Find available specialist for department
   */
  async findAvailableSpecialist(department) {
    try {
      // TODO: Implement admin availability and specialization tracking
      // For now, return null (no auto-assignment)
      return null;

    } catch (error) {
      logger.error('Failed to find available specialist', {
        department,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Generate escalation response for candidate
   */
  async generateEscalationResponse(candidateContext, escalationDetails) {
    try {
      const templateFunction = this.escalationTemplates[escalationDetails.templateType] ||
                              this.escalationTemplates.general;

      const content = templateFunction(candidateContext, escalationDetails);

      // Add response time estimate
      let timeEstimate = '';
      switch (escalationDetails.priority) {
        case 'urgent':
          timeEstimate = 'within the next 30 minutes';
          break;
        case 'high':
          timeEstimate = 'within the next hour';
          break;
        case 'medium':
          timeEstimate = 'within the next few hours';
          break;
        default:
          timeEstimate = 'soon';
      }

      const enhancedContent = content + ` Our team aims to respond ${timeEstimate}.`;

      return {
        content: enhancedContent,
        source: 'admin_escalation',
        confidence: 1.0,
        intent: 'escalated',
        priority: escalationDetails.priority,
        estimatedResponseTime: timeEstimate
      };

    } catch (error) {
      logger.error('Failed to generate escalation response', {
        candidateId: candidateContext.id,
        error: error.message
      });

      return this.generateFailsafeResponse(candidateContext);
    }
  }

  /**
   * Generate failsafe response for critical failures
   */
  generateFailsafeResponse(candidateContext) {
    const firstName = candidateContext?.name?.split(' ')[0] || '';

    return {
      content: `Hi${firstName ? ' ' + firstName : ''}! I'm experiencing some technical difficulties, but I've made sure our admin team is aware of your message. They'll get back to you directly to help with your question. Thank you for your patience!`,
      source: 'failsafe_escalation',
      confidence: 1.0,
      intent: 'failsafe',
      escalated: true,
      requiresAdminAttention: true,
      priority: 'high'
    };
  }

  /**
   * Mark escalation as resolved
   */
  async resolveEscalation(escalationId, adminResponse, resolutionNotes) {
    try {
      const { db } = require('../../db');

      db.prepare(`
        UPDATE escalations
        SET status = 'resolved',
            resolved_at = CURRENT_TIMESTAMP,
            admin_response = ?,
            resolution_notes = ?
        WHERE id = ?
      `).run(adminResponse, resolutionNotes, escalationId);

      logger.info('Escalation resolved', {
        escalationId,
        hasResponse: !!adminResponse,
        hasNotes: !!resolutionNotes
      });

      return true;

    } catch (error) {
      logger.error('Failed to resolve escalation', {
        escalationId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get escalation statistics
   */
  async getEscalationStats(period = '7 days') {
    try {
      const { db } = require('../../db');

      const stats = db.prepare(`
        SELECT
          priority,
          category,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
          AVG(
            CASE WHEN resolved_at IS NOT NULL
            THEN (julianday(resolved_at) - julianday(created_at)) * 24 * 60
            ELSE NULL END
          ) as avg_resolution_minutes
        FROM escalations
        WHERE created_at > datetime('now', '-7 days')
        GROUP BY priority, category
        ORDER BY priority, category
      `).all();

      const summary = {
        totalEscalations: stats.reduce((sum, s) => sum + s.total, 0),
        resolvedEscalations: stats.reduce((sum, s) => sum + s.resolved, 0),
        avgResolutionTime: stats.reduce((sum, s) => sum + (s.avg_resolution_minutes || 0), 0) / stats.length,
        byPriority: {},
        byCategory: {}
      };

      stats.forEach(stat => {
        if (!summary.byPriority[stat.priority]) {
          summary.byPriority[stat.priority] = { total: 0, resolved: 0 };
        }
        if (!summary.byCategory[stat.category]) {
          summary.byCategory[stat.category] = { total: 0, resolved: 0 };
        }

        summary.byPriority[stat.priority].total += stat.total;
        summary.byPriority[stat.priority].resolved += stat.resolved;
        summary.byCategory[stat.category].total += stat.total;
        summary.byCategory[stat.category].resolved += stat.resolved;
      });

      return {
        period,
        summary,
        detailed: stats
      };

    } catch (error) {
      logger.error('Failed to get escalation stats', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get pending escalations
   */
  async getPendingEscalations(priority = null, department = null) {
    try {
      const { db } = require('../../db');

      let query = `
        SELECT e.*, c.name as candidate_name, c.email as candidate_email
        FROM escalations e
        JOIN candidates c ON e.candidate_id = c.id
        WHERE e.status = 'open'
      `;

      const params = [];

      if (priority) {
        query += ` AND e.priority = ?`;
        params.push(priority);
      }

      if (department) {
        query += ` AND e.department = ?`;
        params.push(department);
      }

      query += ` ORDER BY
        CASE e.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        e.created_at ASC
      `;

      const escalations = db.prepare(query).all(...params);

      return escalations;

    } catch (error) {
      logger.error('Failed to get pending escalations', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Check for overdue escalations and send reminders
   */
  async checkOverdueEscalations() {
    try {
      const { db } = require('../../db');

      const overdueEscalations = db.prepare(`
        SELECT * FROM escalations
        WHERE status = 'open'
          AND response_target_time < CURRENT_TIMESTAMP
        ORDER BY priority, created_at
      `).all();

      for (const escalation of overdueEscalations) {
        await this.sendOverdueReminder(escalation);
      }

      logger.info('Checked overdue escalations', {
        overdueCount: overdueEscalations.length
      });

      return overdueEscalations.length;

    } catch (error) {
      logger.error('Failed to check overdue escalations', {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Send overdue escalation reminder
   */
  async sendOverdueReminder(escalation) {
    try {
      // Send WebSocket notification
      broadcastToAdmins({
        type: 'escalation_overdue',
        escalationId: escalation.id,
        priority: escalation.priority,
        candidateId: escalation.candidate_id,
        hoursOverdue: (Date.now() - new Date(escalation.response_target_time).getTime()) / (1000 * 60 * 60),
        timestamp: new Date().toISOString()
      });

      logger.warn('Overdue escalation reminder sent', {
        escalationId: escalation.id,
        priority: escalation.priority
      });

    } catch (error) {
      logger.error('Failed to send overdue reminder', {
        escalationId: escalation.id,
        error: error.message
      });
    }
  }
}

module.exports = AdminEscalationSystem;