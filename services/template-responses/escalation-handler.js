/**
 * Escalation Handler for Template Response System
 *
 * Manages escalation to admin team when AI cannot provide adequate support
 * Ensures critical issues get immediate human attention
 */

class EscalationHandler {
  constructor(db) {
    this.db = db;
    this.initializeEscalationSystem();
  }

  initializeEscalationSystem() {
    // Priority levels
    this.priorityLevels = {
      critical: { weight: 1, responseTime: '1 hour', adminNotification: true },
      high: { weight: 2, responseTime: '4 hours', adminNotification: true },
      normal: { weight: 3, responseTime: '24 hours', adminNotification: false },
      low: { weight: 4, responseTime: '72 hours', adminNotification: false }
    };

    // Escalation triggers
    this.escalationTriggers = {
      urgent_keywords: {
        keywords: ['urgent', 'emergency', 'asap', 'immediately', 'critical', 'serious'],
        priority: 'high',
        category: 'urgent'
      },
      complaint_keywords: {
        keywords: ['complaint', 'angry', 'frustrated', 'unhappy', 'disappointed'],
        priority: 'high',
        category: 'complaint'
      },
      dispute_keywords: {
        keywords: ['wrong', 'mistake', 'error', 'dispute', 'unfair', 'incorrect'],
        priority: 'normal',
        category: 'dispute'
      },
      payment_issues: {
        keywords: ['payment missing', 'not paid', 'payment error', 'money problem'],
        priority: 'high',
        category: 'payment_issue'
      },
      technical_issues: {
        keywords: ['bug', 'error', 'crash', 'broken', 'not working'],
        priority: 'normal',
        category: 'technical_issue'
      }
    };

    console.log('🚨 [Escalation] Handler initialized');
  }

  /**
   * Check if message needs escalation
   */
  checkEscalation(message, intent, candidate) {
    const messageLower = message.toLowerCase();
    let shouldEscalate = false;
    let escalationData = {
      category: 'general',
      priority: 'normal',
      reason: 'General inquiry requiring admin attention'
    };

    // Check for explicit escalation triggers
    for (const [triggerName, triggerData] of Object.entries(this.escalationTriggers)) {
      if (triggerData.keywords.some(keyword => messageLower.includes(keyword))) {
        shouldEscalate = true;
        escalationData = {
          category: triggerData.category,
          priority: triggerData.priority,
          reason: `Triggered by ${triggerName}: ${triggerData.keywords.find(k => messageLower.includes(k))}`
        };
        break;
      }
    }

    // Special escalation rules
    if (intent.category === 'escalation_urgent') {
      shouldEscalate = true;
      escalationData.priority = 'critical';
    }

    // Pending candidates with payment inquiries
    if (candidate.status === 'pending' && intent.category === 'payment_inquiry') {
      shouldEscalate = true;
      escalationData.category = 'pending_payment_inquiry';
      escalationData.priority = 'normal';
    }

    // Multiple question marks or caps (frustration indicators)
    if ((message.match(/\?/g) || []).length > 2 || message === message.toUpperCase()) {
      escalationData.priority = this.increasePriority(escalationData.priority);
      escalationData.reason += ' (Possible frustration detected)';
    }

    return {
      shouldEscalate,
      ...escalationData
    };
  }

  /**
   * Create an escalation in the queue
   */
  async createEscalation(candidateId, message, category, priority, reason) {
    try {
      const escalationId = this.db.prepare(`
        INSERT INTO escalation_queue (
          candidate_id, message, priority, category, auto_response,
          status, created_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
      `).run(
        candidateId,
        message,
        priority,
        category,
        this.generateAutoResponse(category, priority)
      ).lastInsertRowid;

      console.log(`🚨 [Escalation] Created escalation #${escalationId} for ${candidateId} (${priority} priority)`);

      // Send notifications if required
      if (this.priorityLevels[priority].adminNotification) {
        await this.notifyAdmins(escalationId, candidateId, priority, category);
      }

      return escalationId;

    } catch (error) {
      console.error('❌ [Escalation] Error creating escalation:', error);
      return null;
    }
  }

  /**
   * Generate appropriate auto-response for escalation
   */
  generateAutoResponse(category, priority) {
    const responses = {
      urgent: {
        critical: "I understand this is critical. I've flagged your message for immediate admin attention.",
        high: "I understand this is urgent. I've escalated this for priority admin review.",
        normal: "I've flagged this for admin attention and they'll respond soon."
      },
      complaint: {
        critical: "I understand your concern and I want to make sure this gets immediate attention. Our admin team will reach out personally.",
        high: "I understand your concern. I've escalated this to our admin team for immediate review.",
        normal: "I've flagged your concern for admin review and they'll reach out to resolve this."
      },
      payment_issue: {
        high: "I've flagged your payment inquiry for priority admin review. They'll check your specific situation.",
        normal: "I'll have the admin team check your payment status and provide accurate information."
      },
      technical_issue: {
        normal: "I've reported this technical issue for admin attention. Please include any additional details.",
        low: "I've logged this technical issue for admin review."
      },
      pending_payment_inquiry: {
        normal: "As your account is pending verification, I'll have the admin team check your verification timeline and payment information."
      },
      verification_inquiry: {
        normal: "I'll have the admin team check your verification status and provide accurate next steps."
      },
      no_template_match: {
        normal: "Thanks for your message! I'll make sure the right admin team member assists with your specific question."
      }
    };

    return responses[category]?.[priority] || responses[category]?.normal ||
           "I'll make sure the admin team assists with your inquiry and provides accurate information.";
  }

  /**
   * Notify admins about high-priority escalations
   */
  async notifyAdmins(escalationId, candidateId, priority, category) {
    try {
      const { broadcastToAdmins } = require('../../websocket');

      // Get candidate info for notification
      const candidate = this.db.prepare(`
        SELECT name, email, phone FROM candidates WHERE id = ?
      `).get(candidateId);

      broadcastToAdmins({
        type: 'escalation_alert',
        escalationId,
        candidateId,
        candidateName: candidate?.name,
        priority,
        category,
        expectedResponse: this.priorityLevels[priority].responseTime,
        timestamp: new Date().toISOString()
      });

      console.log(`📢 [Escalation] Notified admins about escalation #${escalationId}`);

    } catch (error) {
      console.error('❌ [Escalation] Error notifying admins:', error);
    }
  }

  /**
   * Increase priority level
   */
  increasePriority(currentPriority) {
    const priorityOrder = ['low', 'normal', 'high', 'critical'];
    const currentIndex = priorityOrder.indexOf(currentPriority);
    if (currentIndex < priorityOrder.length - 1) {
      return priorityOrder[currentIndex + 1];
    }
    return currentPriority;
  }

  /**
   * Get escalation queue for admin dashboard
   */
  getEscalationQueue(filters = {}) {
    const { status = 'pending', priority, category, adminId, limit = 50 } = filters;

    let query = `
      SELECT
        eq.*,
        c.name as candidate_name,
        c.email,
        c.phone,
        c.status as candidate_status
      FROM escalation_queue eq
      JOIN candidates c ON eq.candidate_id = c.id
      WHERE eq.status = ?
    `;

    const params = [status];

    if (priority) {
      query += ' AND eq.priority = ?';
      params.push(priority);
    }

    if (category) {
      query += ' AND eq.category = ?';
      params.push(category);
    }

    if (adminId) {
      query += ' AND eq.admin_assigned = ?';
      params.push(adminId);
    }

    query += `
      ORDER BY
        CASE eq.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          ELSE 4
        END,
        eq.created_at ASC
      LIMIT ?
    `;

    params.push(limit);

    return this.db.prepare(query).all(...params);
  }

  /**
   * Assign escalation to admin
   */
  assignEscalation(escalationId, adminId) {
    try {
      const result = this.db.prepare(`
        UPDATE escalation_queue
        SET admin_assigned = ?, status = 'in_progress'
        WHERE id = ? AND status = 'pending'
      `).run(adminId, escalationId);

      if (result.changes > 0) {
        console.log(`👤 [Escalation] Assigned escalation #${escalationId} to admin ${adminId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [Escalation] Error assigning escalation:', error);
      return false;
    }
  }

  /**
   * Resolve escalation
   */
  resolveEscalation(escalationId, adminId, resolutionNotes) {
    try {
      const result = this.db.prepare(`
        UPDATE escalation_queue
        SET status = 'resolved',
            resolved_at = datetime('now'),
            resolution_notes = ?
        WHERE id = ? AND admin_assigned = ?
      `).run(resolutionNotes, escalationId, adminId);

      if (result.changes > 0) {
        console.log(`✅ [Escalation] Resolved escalation #${escalationId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [Escalation] Error resolving escalation:', error);
      return false;
    }
  }

  /**
   * Get escalation statistics for dashboard
   */
  getEscalationStats(days = 30) {
    try {
      const stats = this.db.prepare(`
        SELECT
          status,
          priority,
          category,
          COUNT(*) as count,
          AVG(
            CASE
              WHEN resolved_at IS NOT NULL
              THEN (julianday(resolved_at) - julianday(created_at)) * 24
              ELSE NULL
            END
          ) as avg_resolution_hours
        FROM escalation_queue
        WHERE created_at > datetime('now', '-' || ? || ' days')
        GROUP BY status, priority, category
        ORDER BY count DESC
      `).all(days);

      const summary = this.db.prepare(`
        SELECT
          COUNT(*) as total_escalations,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
          AVG(
            CASE
              WHEN resolved_at IS NOT NULL
              THEN (julianday(resolved_at) - julianday(created_at)) * 24
              ELSE NULL
            END
          ) as avg_resolution_hours
        FROM escalation_queue
        WHERE created_at > datetime('now', '-' || ? || ' days')
      `).get(days);

      return { stats, summary };

    } catch (error) {
      console.error('❌ [Escalation] Error getting stats:', error);
      return { stats: [], summary: {} };
    }
  }

  /**
   * Auto-escalate overdue items
   */
  checkOverdueEscalations() {
    try {
      // Check for overdue escalations based on priority
      const overdueHigh = this.db.prepare(`
        SELECT id, candidate_id, priority, created_at
        FROM escalation_queue
        WHERE status = 'pending'
        AND priority = 'high'
        AND created_at < datetime('now', '-4 hours')
      `).all();

      const overdueCritical = this.db.prepare(`
        SELECT id, candidate_id, priority, created_at
        FROM escalation_queue
        WHERE status = 'pending'
        AND priority = 'critical'
        AND created_at < datetime('now', '-1 hours')
      `).all();

      // Escalate overdue items
      [...overdueHigh, ...overdueCritical].forEach(escalation => {
        this.escalateOverdue(escalation);
      });

    } catch (error) {
      console.error('❌ [Escalation] Error checking overdue:', error);
    }
  }

  escalateOverdue(escalation) {
    // Increase priority and send urgent notification
    const newPriority = escalation.priority === 'high' ? 'critical' : 'critical';

    this.db.prepare(`
      UPDATE escalation_queue
      SET priority = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newPriority, escalation.id);

    // Send urgent notification
    this.notifyAdmins(escalation.id, escalation.candidate_id, newPriority, 'overdue');

    console.log(`⚠️ [Escalation] Escalated overdue item #${escalation.id} to ${newPriority} priority`);
  }
}

module.exports = EscalationHandler;