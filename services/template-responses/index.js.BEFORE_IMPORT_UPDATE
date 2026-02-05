/**
 * Fact-Based Template Response System
 *
 * Replaces AI-generated responses with honest, accurate information
 * that never makes false promises about timing or processes.
 *
 * Core Principles:
 * - NEVER make promises about timing
 * - ALWAYS defer to admin team for specifics
 * - Use actual user data when available
 * - Provide helpful information without commitments
 */

const { db } = require('../../db/database');
const DataAccess = require('./data-access');
const IntentClassifier = require('./intent-classifier');
const TemplateManager = require('./template-manager');
const EscalationHandler = require('./escalation-handler');

class FactBasedTemplateSystem {
  constructor() {
    this.dataAccess = new DataAccess(db);
    this.intentClassifier = new IntentClassifier();
    this.templateManager = new TemplateManager();
    this.escalationHandler = new EscalationHandler(db);

    this.initializeSystem();
  }

  initializeSystem() {
    console.log('🎯 [Template System] Initializing fact-based response system...');

    // Initialize database tables for template management
    this.createTemplateTables();

    // Load default templates
    this.loadDefaultTemplates();

    console.log('✅ [Template System] Initialization complete');
  }

  createTemplateTables() {
    // Template management tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS template_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        priority INTEGER DEFAULT 1,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS response_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        trigger_patterns TEXT NOT NULL, -- JSON array of patterns
        template_content TEXT NOT NULL, -- Template with variables
        requires_real_data INTEGER DEFAULT 0,
        escalation_priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
        language TEXT DEFAULT 'en',
        active INTEGER DEFAULT 1,
        confidence_score REAL DEFAULT 0.8,
        usage_count INTEGER DEFAULT 0,
        success_rate REAL DEFAULT 0.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES template_categories(id)
      );

      CREATE TABLE IF NOT EXISTS template_variables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        variable_name TEXT NOT NULL,
        data_source TEXT NOT NULL, -- 'candidate', 'payment', 'job', 'calculated'
        field_path TEXT NOT NULL, -- JSON path to data
        fallback_value TEXT,
        format_type TEXT DEFAULT 'text', -- 'text', 'currency', 'date', 'number'
        FOREIGN KEY (template_id) REFERENCES response_templates(id)
      );

      CREATE TABLE IF NOT EXISTS template_usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        candidate_id TEXT NOT NULL,
        message TEXT NOT NULL,
        response TEXT NOT NULL,
        confidence REAL,
        admin_feedback TEXT,
        effectiveness_score REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES response_templates(id)
      );

      CREATE TABLE IF NOT EXISTS escalation_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_id TEXT NOT NULL,
        message TEXT NOT NULL,
        priority TEXT DEFAULT 'normal',
        category TEXT,
        auto_response TEXT,
        admin_assigned TEXT,
        status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'resolved'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        resolution_notes TEXT
      );
    `);
  }

  /**
   * Main entry point - process incoming message and generate appropriate response
   */
  async processMessage(candidateId, message, options = {}) {
    const { channel = 'app', adminMode = 'auto' } = options;

    try {
      console.log(`🎯 [Template System] Processing message for ${candidateId}: "${message.substring(0, 50)}..."`);

      // 1. Get candidate data
      const candidate = await this.dataAccess.getCandidateProfile(candidateId);
      if (!candidate) {
        return this.generateErrorResponse('candidate_not_found');
      }

      // 2. Classify intent
      const intent = await this.intentClassifier.classifyMessage(message);
      console.log(`🎯 [Intent] Classified as: ${intent.category} (confidence: ${intent.confidence})`);

      // 3. Handle pending candidates specially
      if (candidate.status === 'pending') {
        return await this.handlePendingCandidate(candidateId, message, candidate, intent);
      }

      // 4. Check for escalation triggers
      const escalationCheck = this.escalationHandler.checkEscalation(message, intent, candidate);
      if (escalationCheck.shouldEscalate) {
        return await this.handleEscalation(candidateId, message, candidate, escalationCheck);
      }

      // 5. Get real-time data if needed
      const realData = await this.dataAccess.getRealTimeData(candidateId, intent);

      // 6. Generate fact-based response
      const response = await this.generateFactBasedResponse(
        candidateId,
        message,
        candidate,
        intent,
        realData
      );

      // 7. Log usage for analytics
      await this.logTemplateUsage(response, candidateId, message);

      return response;

    } catch (error) {
      console.error('❌ [Template System] Processing error:', error);
      return this.generateErrorResponse('processing_error');
    }
  }

  /**
   * Handle pending candidates with verification assistance
   */
  async handlePendingCandidate(candidateId, message, candidate, intent) {
    const firstName = candidate.name.split(' ')[0];

    const templates = {
      job_inquiry: {
        content: `Hi ${firstName}! Your account is being reviewed by our team. Once verified, you'll be able to browse and apply for jobs. I'll have the admin team check your verification status and reach out with next steps. 📝`,
        escalation: 'verification_inquiry'
      },

      verification_status: {
        content: `Hi ${firstName}! Your account verification is under review. I can schedule a verification interview which often speeds up the process. I'll flag this for admin review to get you accurate timing and next steps. 📅`,
        escalation: 'verification_status_check'
      },

      payment_inquiry: {
        content: `Hi ${firstName}! Payment information will be available once your account is verified. I'll have the admin team check your verification timeline and provide you with accurate next steps. 💰`,
        escalation: 'pending_payment_inquiry'
      },

      greeting: {
        content: `Hi ${firstName}! Welcome to WorkLink! 👋 Your account is being reviewed by our team. I'll make sure the right admin team member assists with your verification process.`,
        escalation: 'pending_candidate_greeting'
      },

      general: {
        content: `Hi ${firstName}! Thanks for reaching out. Your account is currently pending verification. I've flagged your message for the admin team to provide you with accurate information and timeline. 🙏`,
        escalation: 'pending_general_inquiry'
      }
    };

    const template = templates[intent.subcategory] || templates.general;

    // Always escalate pending candidate messages for personal attention
    await this.escalationHandler.createEscalation(
      candidateId,
      message,
      template.escalation,
      'normal',
      `Pending candidate inquiry: ${intent.category}`
    );

    return {
      content: template.content,
      source: 'pending_candidate_template',
      confidence: 0.9,
      intent: intent.category,
      isPendingUser: true,
      requiresAdminAttention: true,
      escalated: true,
      metadata: {
        subcategory: intent.subcategory,
        escalation_type: template.escalation
      }
    };
  }

  /**
   * Generate fact-based response using real data
   */
  async generateFactBasedResponse(candidateId, message, candidate, intent, realData) {
    const template = await this.templateManager.findBestTemplate(intent, candidate.language || 'en');

    if (!template) {
      // No template found - escalate to admin
      await this.escalationHandler.createEscalation(
        candidateId,
        message,
        'no_template_match',
        'normal',
        `No template found for intent: ${intent.category}`
      );

      return {
        content: `Thanks for your message! I'll make sure the right admin team member assists with your specific question. They'll get back to you with accurate information.`,
        source: 'no_template_escalation',
        confidence: 0.7,
        intent: intent.category,
        requiresAdminAttention: true,
        escalated: true
      };
    }

    // Generate response using template and real data
    const response = await this.templateManager.generateResponse(
      template,
      {
        candidate,
        realData,
        firstName: candidate.name.split(' ')[0],
        message
      }
    );

    return {
      content: response.content,
      source: `template_${template.category}`,
      confidence: template.confidence_score || 0.8,
      intent: intent.category,
      templateId: template.id,
      usesRealData: template.requires_real_data,
      requiresAdminAttention: false,
      metadata: response.metadata
    };
  }

  /**
   * Handle escalation scenarios
   */
  async handleEscalation(candidateId, message, candidate, escalationCheck) {
    await this.escalationHandler.createEscalation(
      candidateId,
      message,
      escalationCheck.category,
      escalationCheck.priority,
      escalationCheck.reason
    );

    const firstName = candidate.name.split(' ')[0];
    const responses = {
      urgent: `Hi ${firstName}, I understand this is urgent. I've flagged your message for immediate admin attention and they'll respond personally within the next few hours.`,
      complaint: `Hi ${firstName}, I understand your concern. I've escalated this to our admin team for immediate review and they'll reach out to resolve this properly.`,
      payment_issue: `Hi ${firstName}, I've flagged your payment inquiry for priority admin review. They'll check your specific situation and provide accurate timing.`,
      technical_issue: `Hi ${firstName}, I've reported this technical issue for immediate admin attention. Please describe any additional details so they can assist you properly.`
    };

    return {
      content: responses[escalationCheck.category] || responses.urgent,
      source: 'escalation_response',
      confidence: 1.0,
      intent: 'escalation',
      requiresAdminAttention: true,
      escalated: true,
      escalationPriority: escalationCheck.priority,
      metadata: {
        escalationType: escalationCheck.category,
        reason: escalationCheck.reason
      }
    };
  }

  /**
   * Log template usage for analytics and improvement
   */
  async logTemplateUsage(response, candidateId, message) {
    if (!response.templateId) return;

    try {
      db.prepare(`
        INSERT INTO template_usage_logs (
          template_id, candidate_id, message, response, confidence, created_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(
        response.templateId,
        candidateId,
        message,
        response.content,
        response.confidence
      );

      // Update usage count
      db.prepare(`
        UPDATE response_templates
        SET usage_count = usage_count + 1, updated_at = datetime('now')
        WHERE id = ?
      `).run(response.templateId);

    } catch (error) {
      console.error('❌ [Template System] Failed to log usage:', error);
    }
  }

  /**
   * Record admin feedback on template effectiveness
   */
  async recordAdminFeedback(usageLogId, feedback, effectivenessScore) {
    try {
      db.prepare(`
        UPDATE template_usage_logs
        SET admin_feedback = ?, effectiveness_score = ?
        WHERE id = ?
      `).run(feedback, effectivenessScore, usageLogId);

      // Update template success rate
      const template = db.prepare(`
        SELECT AVG(effectiveness_score) as avg_score
        FROM template_usage_logs
        WHERE template_id = (SELECT template_id FROM template_usage_logs WHERE id = ?)
        AND effectiveness_score IS NOT NULL
      `).get(usageLogId);

      if (template && template.avg_score !== null) {
        db.prepare(`
          UPDATE response_templates
          SET success_rate = ?, updated_at = datetime('now')
          WHERE id = (SELECT template_id FROM template_usage_logs WHERE id = ?)
        `).run(template.avg_score, usageLogId);
      }

    } catch (error) {
      console.error('❌ [Template System] Failed to record feedback:', error);
    }
  }

  /**
   * Generate error response
   */
  generateErrorResponse(errorType) {
    const errorMessages = {
      candidate_not_found: "I'm sorry, I couldn't find your profile. I'll have the admin team check your account status.",
      processing_error: "I'm experiencing technical difficulties. I've flagged this for admin attention and they'll assist you shortly."
    };

    return {
      content: errorMessages[errorType] || errorMessages.processing_error,
      source: 'error_response',
      confidence: 1.0,
      intent: 'error',
      requiresAdminAttention: true,
      error: true
    };
  }

  loadDefaultTemplates() {
    // This will be implemented to load initial templates
    // Left for the template manager implementation
  }

  /**
   * Admin interface methods
   */

  async getEscalationQueue(status = 'pending', limit = 50) {
    return db.prepare(`
      SELECT e.*, c.name as candidate_name, c.phone, c.email
      FROM escalation_queue e
      JOIN candidates c ON e.candidate_id = c.id
      WHERE e.status = ?
      ORDER BY
        CASE e.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          ELSE 4
        END,
        e.created_at ASC
      LIMIT ?
    `).all(status, limit);
  }

  async assignEscalation(escalationId, adminId) {
    return db.prepare(`
      UPDATE escalation_queue
      SET admin_assigned = ?, status = 'in_progress', updated_at = datetime('now')
      WHERE id = ?
    `).run(adminId, escalationId);
  }

  async resolveEscalation(escalationId, resolutionNotes) {
    return db.prepare(`
      UPDATE escalation_queue
      SET status = 'resolved', resolved_at = datetime('now'), resolution_notes = ?
      WHERE id = ?
    `).run(resolutionNotes, escalationId);
  }

  async getTemplateAnalytics(days = 30) {
    return db.prepare(`
      SELECT
        rt.name,
        rt.usage_count,
        rt.success_rate,
        COUNT(tul.id) as recent_uses,
        AVG(tul.effectiveness_score) as recent_effectiveness
      FROM response_templates rt
      LEFT JOIN template_usage_logs tul ON rt.id = tul.template_id
        AND tul.created_at > datetime('now', '-' || ? || ' days')
      WHERE rt.active = 1
      GROUP BY rt.id, rt.name, rt.usage_count, rt.success_rate
      ORDER BY rt.usage_count DESC
    `).all(days);
  }
}

module.exports = FactBasedTemplateSystem;