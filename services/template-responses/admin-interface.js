/**
 * Admin Interface for Template Response Management
 *
 * Web interface for managing templates, viewing escalations,
 * and analyzing response effectiveness
 */

const { db } = require('../../db');

class TemplateAdminInterface {
  constructor() {
    this.initializeInterface();
  }

  initializeInterface() {
    console.log('🎛️ [Admin Interface] Template management interface initialized');
  }

  /**
   * Get dashboard overview data
   */
  getDashboardOverview(days = 30) {
    try {
      // Get overall stats
      const overview = db.prepare(`
        SELECT
          COUNT(*) as total_messages,
          COUNT(CASE WHEN source LIKE 'template_%' THEN 1 END) as template_responses,
          COUNT(CASE WHEN source = 'escalation_response' THEN 1 END) as escalated,
          AVG(confidence) as avg_confidence
        FROM template_usage_logs
        WHERE created_at > datetime('now', '-' || ? || ' days')
      `).get(days);

      // Get escalation stats
      const escalationStats = db.prepare(`
        SELECT
          status,
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
        GROUP BY status
      `).all(days);

      // Get top performing templates
      const topTemplates = db.prepare(`
        SELECT
          rt.name,
          rt.usage_count,
          rt.success_rate,
          tc.name as category
        FROM response_templates rt
        JOIN template_categories tc ON rt.category_id = tc.id
        WHERE rt.active = 1
        ORDER BY rt.success_rate DESC, rt.usage_count DESC
        LIMIT 10
      `).all();

      // Get recent escalations
      const recentEscalations = db.prepare(`
        SELECT
          eq.*,
          c.name as candidate_name
        FROM escalation_queue eq
        JOIN candidates c ON eq.candidate_id = c.id
        WHERE eq.created_at > datetime('now', '-24 hours')
        ORDER BY eq.created_at DESC
        LIMIT 10
      `).all();

      return {
        overview,
        escalationStats,
        topTemplates,
        recentEscalations
      };

    } catch (error) {
      console.error('❌ [Admin Interface] Dashboard error:', error);
      return null;
    }
  }

  /**
   * Get detailed template performance report
   */
  getTemplatePerformanceReport(templateId = null, days = 30) {
    try {
      let query = `
        SELECT
          rt.id,
          rt.name,
          rt.template_content,
          tc.name as category,
          rt.usage_count,
          rt.success_rate,
          rt.confidence_score,
          COUNT(tul.id) as recent_usage,
          AVG(tul.effectiveness_score) as recent_effectiveness,
          AVG(tul.confidence) as avg_confidence
        FROM response_templates rt
        JOIN template_categories tc ON rt.category_id = tc.id
        LEFT JOIN template_usage_logs tul ON rt.id = tul.template_id
          AND tul.created_at > datetime('now', '-' || ? || ' days')
      `;

      const params = [days];

      if (templateId) {
        query += ' WHERE rt.id = ?';
        params.push(templateId);
      }

      query += `
        GROUP BY rt.id
        ORDER BY rt.usage_count DESC, rt.success_rate DESC
      `;

      const templates = db.prepare(query).all(...params);

      // Get detailed usage logs for each template
      const templateDetails = templates.map(template => {
        const usageLogs = db.prepare(`
          SELECT
            tul.*,
            c.name as candidate_name
          FROM template_usage_logs tul
          JOIN candidates c ON tul.candidate_id = c.id
          WHERE tul.template_id = ?
          AND tul.created_at > datetime('now', '-' || ? || ' days')
          ORDER BY tul.created_at DESC
          LIMIT 20
        `).all(template.id, days);

        return {
          ...template,
          recentUsage: usageLogs
        };
      });

      return templateDetails;

    } catch (error) {
      console.error('❌ [Admin Interface] Template performance error:', error);
      return [];
    }
  }

  /**
   * Get escalation management data
   */
  getEscalationManagement(status = 'pending', priority = null) {
    try {
      let query = `
        SELECT
          eq.*,
          c.name as candidate_name,
          c.email,
          c.phone,
          c.status as candidate_status,
          (julianday('now') - julianday(eq.created_at)) * 24 as hours_since_created
        FROM escalation_queue eq
        JOIN candidates c ON eq.candidate_id = c.id
        WHERE eq.status = ?
      `;

      const params = [status];

      if (priority) {
        query += ' AND eq.priority = ?';
        params.push(priority);
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
      `;

      const escalations = db.prepare(query).all(...params);

      // Add urgency indicators
      const enrichedEscalations = escalations.map(escalation => {
        let urgencyLevel = 'normal';
        let isOverdue = false;

        switch (escalation.priority) {
          case 'critical':
            isOverdue = escalation.hours_since_created > 1;
            urgencyLevel = isOverdue ? 'critical_overdue' : 'critical';
            break;
          case 'high':
            isOverdue = escalation.hours_since_created > 4;
            urgencyLevel = isOverdue ? 'high_overdue' : 'high';
            break;
          case 'normal':
            isOverdue = escalation.hours_since_created > 24;
            urgencyLevel = isOverdue ? 'normal_overdue' : 'normal';
            break;
        }

        return {
          ...escalation,
          urgencyLevel,
          isOverdue
        };
      });

      return enrichedEscalations;

    } catch (error) {
      console.error('❌ [Admin Interface] Escalation management error:', error);
      return [];
    }
  }

  /**
   * Generate analytics report
   */
  generateAnalyticsReport(days = 30) {
    try {
      // Template usage trends
      const usageTrends = db.prepare(`
        SELECT
          DATE(tul.created_at) as date,
          COUNT(*) as total_responses,
          COUNT(CASE WHEN tul.effectiveness_score >= 4 THEN 1 END) as positive_responses,
          AVG(tul.confidence) as avg_confidence
        FROM template_usage_logs tul
        WHERE tul.created_at > datetime('now', '-' || ? || ' days')
        GROUP BY DATE(tul.created_at)
        ORDER BY date
      `).all(days);

      // Intent distribution
      const intentDistribution = db.prepare(`
        SELECT
          json_extract(tul.response, '$.intent') as intent,
          COUNT(*) as count,
          AVG(tul.effectiveness_score) as avg_effectiveness
        FROM template_usage_logs tul
        WHERE tul.created_at > datetime('now', '-' || ? || ' days')
        AND json_extract(tul.response, '$.intent') IS NOT NULL
        GROUP BY intent
        ORDER BY count DESC
      `).all(days);

      // Escalation trends
      const escalationTrends = db.prepare(`
        SELECT
          DATE(eq.created_at) as date,
          eq.priority,
          COUNT(*) as count
        FROM escalation_queue eq
        WHERE eq.created_at > datetime('now', '-' || ? || ' days')
        GROUP BY DATE(eq.created_at), eq.priority
        ORDER BY date, eq.priority
      `).all(days);

      // Response time analysis
      const responseTimeAnalysis = db.prepare(`
        SELECT
          eq.priority,
          AVG(
            CASE
              WHEN eq.resolved_at IS NOT NULL
              THEN (julianday(eq.resolved_at) - julianday(eq.created_at)) * 24
              ELSE NULL
            END
          ) as avg_resolution_hours,
          COUNT(CASE WHEN eq.status = 'resolved' THEN 1 END) as resolved_count,
          COUNT(*) as total_count
        FROM escalation_queue eq
        WHERE eq.created_at > datetime('now', '-' || ? || ' days')
        GROUP BY eq.priority
      `).all(days);

      // Effectiveness by category
      const effectivenessByCategory = db.prepare(`
        SELECT
          tc.name as category,
          COUNT(tul.id) as usage_count,
          AVG(tul.effectiveness_score) as avg_effectiveness,
          AVG(rt.success_rate) as template_success_rate
        FROM template_usage_logs tul
        JOIN response_templates rt ON tul.template_id = rt.id
        JOIN template_categories tc ON rt.category_id = tc.id
        WHERE tul.created_at > datetime('now', '-' || ? || ' days')
        GROUP BY tc.name
        ORDER BY avg_effectiveness DESC
      `).all(days);

      return {
        usageTrends,
        intentDistribution,
        escalationTrends,
        responseTimeAnalysis,
        effectivenessByCategory
      };

    } catch (error) {
      console.error('❌ [Admin Interface] Analytics report error:', error);
      return null;
    }
  }

  /**
   * Export data for external analysis
   */
  exportData(format = 'json', days = 30) {
    try {
      const data = {
        templates: this.getTemplatePerformanceReport(null, days),
        escalations: this.getEscalationManagement('all'),
        analytics: this.generateAnalyticsReport(days),
        exportedAt: new Date().toISOString()
      };

      switch (format) {
        case 'csv':
          return this.convertToCSV(data);
        case 'json':
        default:
          return JSON.stringify(data, null, 2);
      }

    } catch (error) {
      console.error('❌ [Admin Interface] Export error:', error);
      return null;
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    // Simple CSV conversion for templates
    const templateCSV = [
      'Template Name,Category,Usage Count,Success Rate,Recent Usage,Recent Effectiveness',
      ...data.templates.map(t =>
        `"${t.name}","${t.category}",${t.usage_count},${t.success_rate || 0},${t.recent_usage},${t.recent_effectiveness || 0}`
      )
    ].join('\n');

    return {
      templates: templateCSV,
      // Add other CSV conversions as needed
    };
  }

  /**
   * Get real-time metrics for dashboard widgets
   */
  getRealTimeMetrics() {
    try {
      // Active escalations count
      const activeEscalations = db.prepare(`
        SELECT COUNT(*) as count FROM escalation_queue WHERE status IN ('pending', 'in_progress')
      `).get();

      // High priority escalations
      const highPriorityEscalations = db.prepare(`
        SELECT COUNT(*) as count FROM escalation_queue
        WHERE status = 'pending' AND priority IN ('critical', 'high')
      `).get();

      // Recent template usage (last hour)
      const recentUsage = db.prepare(`
        SELECT COUNT(*) as count FROM template_usage_logs
        WHERE created_at > datetime('now', '-1 hour')
      `).get();

      // Average response confidence (last 24 hours)
      const avgConfidence = db.prepare(`
        SELECT AVG(confidence) as avg FROM template_usage_logs
        WHERE created_at > datetime('now', '-24 hours')
      `).get();

      return {
        activeEscalations: activeEscalations.count,
        highPriorityEscalations: highPriorityEscalations.count,
        recentUsage: recentUsage.count,
        avgConfidence: Math.round((avgConfidence.avg || 0) * 100) / 100
      };

    } catch (error) {
      console.error('❌ [Admin Interface] Real-time metrics error:', error);
      return {
        activeEscalations: 0,
        highPriorityEscalations: 0,
        recentUsage: 0,
        avgConfidence: 0
      };
    }
  }

  /**
   * Generate improvement recommendations
   */
  getImprovementRecommendations() {
    try {
      const recommendations = [];

      // Check for low-performing templates
      const lowPerformingTemplates = db.prepare(`
        SELECT name, success_rate, usage_count
        FROM response_templates
        WHERE active = 1 AND success_rate < 0.6 AND usage_count > 10
      `).all();

      if (lowPerformingTemplates.length > 0) {
        recommendations.push({
          type: 'template_performance',
          priority: 'medium',
          title: 'Low Performing Templates',
          description: `${lowPerformingTemplates.length} templates have success rates below 60%`,
          action: 'Review and update template content or trigger patterns',
          templates: lowPerformingTemplates
        });
      }

      // Check for high escalation rates
      const recentEscalationRate = db.prepare(`
        SELECT
          COUNT(CASE WHEN source = 'escalation_response' THEN 1 END) * 100.0 / COUNT(*) as rate
        FROM template_usage_logs
        WHERE created_at > datetime('now', '-7 days')
      `).get();

      if (recentEscalationRate.rate > 30) {
        recommendations.push({
          type: 'escalation_rate',
          priority: 'high',
          title: 'High Escalation Rate',
          description: `${Math.round(recentEscalationRate.rate)}% of conversations are being escalated`,
          action: 'Review common escalation triggers and improve template coverage'
        });
      }

      // Check for missing template coverage
      const commonUnmatchedIntents = db.prepare(`
        SELECT
          json_extract(response, '$.intent') as intent,
          COUNT(*) as count
        FROM template_usage_logs
        WHERE source = 'no_template_escalation'
        AND created_at > datetime('now', '-30 days')
        GROUP BY intent
        ORDER BY count DESC
        LIMIT 5
      `).all();

      if (commonUnmatchedIntents.length > 0) {
        recommendations.push({
          type: 'template_coverage',
          priority: 'medium',
          title: 'Missing Template Coverage',
          description: 'Common intents lacking template responses',
          action: 'Create templates for frequent unmatched intents',
          intents: commonUnmatchedIntents
        });
      }

      return recommendations;

    } catch (error) {
      console.error('❌ [Admin Interface] Recommendations error:', error);
      return [];
    }
  }
}

module.exports = TemplateAdminInterface;