/**
 * Integration Bridge for Template Response System
 *
 * Bridges the fact-based template system with the existing AI chat infrastructure
 * Provides seamless replacement of problematic AI responses
 */

const FactBasedTemplateSystem = require('./index');
const { db } = require('../../db/database');

class TemplateIntegrationBridge {
  constructor() {
    this.templateSystem = new FactBasedTemplateSystem();
    this.isEnabled = true;
    this.fallbackToAI = false; // Set to true to fallback to original AI if template fails

    console.log('🌉 [Integration Bridge] Template response integration initialized');
  }

  /**
   * Main entry point to replace AI chat processing
   * This is called instead of the original AI chat system
   */
  async processIncomingMessage(candidateId, message, channel = 'app') {
    try {
      console.log(`🌉 [Bridge] Processing message for ${candidateId} via template system`);

      // Use fact-based template system
      const templateResponse = await this.templateSystem.processMessage(candidateId, message, {
        channel,
        adminMode: 'auto'
      });

      if (templateResponse && !templateResponse.error) {
        console.log(`✅ [Bridge] Template system handled message successfully`);

        // Send response if in auto mode
        if (templateResponse.content && !templateResponse.requiresAdminAttention) {
          await this.sendTemplateResponse(candidateId, templateResponse, channel, message);
        }

        return {
          mode: 'template_auto',
          response: templateResponse,
          source: 'fact_based_templates'
        };
      }

      // Fallback to original AI if enabled and template fails
      if (this.fallbackToAI) {
        console.log(`⚠️ [Bridge] Template system failed, falling back to AI`);
        return await this.fallbackToOriginalAI(candidateId, message, channel);
      }

      // Otherwise, escalate to admin
      console.log(`🚨 [Bridge] Template system couldn't handle message, escalating to admin`);
      return {
        mode: 'escalated',
        response: templateResponse,
        source: 'fact_based_templates'
      };

    } catch (error) {
      console.error('❌ [Bridge] Processing error:', error);

      if (this.fallbackToAI) {
        return await this.fallbackToOriginalAI(candidateId, message, channel);
      }

      return {
        mode: 'error',
        response: {
          content: "I'm having trouble processing your request. I've flagged this for admin attention.",
          source: 'bridge_error',
          requiresAdminAttention: true,
          error: true
        },
        source: 'fact_based_templates'
      };
    }
  }

  /**
   * Send template response via messaging system
   */
  async sendTemplateResponse(candidateId, response, channel, originalMessage) {
    try {
      const messaging = require('../messaging');

      console.log(`📤 [Bridge] Sending template response to ${candidateId} via ${channel}`);

      const result = await messaging.sendToCandidate(candidateId, response.content, {
        channel: channel,
        replyToChannel: channel,
        aiGenerated: false, // These are template responses, not AI generated
        aiSource: response.source || 'fact_based_template',
        templateId: response.templateId
      });

      if (result.success) {
        // Log successful template usage
        this.logSuccessfulResponse(candidateId, originalMessage, response, channel);

        // Broadcast to admins
        const { broadcastToAdmins } = require('../../websocket');
        broadcastToAdmins({
          type: 'template_message_sent',
          candidateId,
          message: result.message,
          templateResponse: response,
          channel: channel
        });

        console.log(`✅ [Bridge] Template response sent successfully`);
      }

      return result;

    } catch (error) {
      console.error('❌ [Bridge] Error sending template response:', error);
      throw error;
    }
  }

  /**
   * Fallback to original AI system (if enabled)
   */
  async fallbackToOriginalAI(candidateId, message, channel) {
    try {
      console.log(`🤖 [Bridge] Falling back to original AI system`);

      // Load original AI chat service
      const originalAI = require('../ai-chat/index');

      // Process with original AI
      const aiResponse = await originalAI.generateResponse(candidateId, message, { mode: 'auto' });

      if (aiResponse) {
        // Filter out problematic responses even from AI fallback
        if (this.isProblematicResponse(aiResponse.content)) {
          console.log(`⚠️ [Bridge] AI fallback response filtered as problematic`);

          // Create escalation instead
          await this.templateSystem.escalationHandler.createEscalation(
            candidateId,
            message,
            'filtered_ai_response',
            'normal',
            'AI response filtered for false promises'
          );

          return {
            mode: 'escalated',
            response: {
              content: "I'll have the admin team check your specific situation and provide accurate information.",
              source: 'filtered_ai_fallback',
              requiresAdminAttention: true
            },
            source: 'fact_based_templates'
          };
        }

        // Send AI response
        await this.sendAIResponse(candidateId, aiResponse, channel, message);

        return {
          mode: 'ai_fallback',
          response: aiResponse,
          source: 'original_ai_system'
        };
      }

      throw new Error('AI fallback failed');

    } catch (error) {
      console.error('❌ [Bridge] AI fallback error:', error);

      return {
        mode: 'error',
        response: {
          content: "I'm experiencing difficulties. The admin team will assist you shortly.",
          source: 'fallback_error',
          requiresAdminAttention: true,
          error: true
        },
        source: 'fact_based_templates'
      };
    }
  }

  /**
   * Check if AI response contains problematic content
   */
  isProblematicResponse(content) {
    const problematicPhrases = [
      'usually arrive within 24 hours',
      'auto-approve',
      'within 72 hours max',
      'completely free',
      'usually within a few hours',
      'our system will automatically',
      'guaranteed',
      'will definitely',
      '100% sure',
      'always processed in',
      'never takes more than'
    ];

    return problematicPhrases.some(phrase =>
      content.toLowerCase().includes(phrase.toLowerCase())
    );
  }

  /**
   * Send AI response (for fallback scenarios)
   */
  async sendAIResponse(candidateId, response, channel, originalMessage) {
    try {
      const messaging = require('../messaging');

      const result = await messaging.sendToCandidate(candidateId, response.content, {
        channel: channel,
        replyToChannel: channel,
        aiGenerated: true,
        aiSource: 'ai_fallback'
      });

      if (result.success) {
        // Log AI fallback usage
        this.logAIFallbackUsage(candidateId, originalMessage, response, channel);
      }

      return result;

    } catch (error) {
      console.error('❌ [Bridge] Error sending AI response:', error);
      throw error;
    }
  }

  /**
   * Log successful template response
   */
  logSuccessfulResponse(candidateId, message, response, channel) {
    try {
      db.prepare(`
        INSERT INTO template_bridge_logs (
          candidate_id, message, response_content, response_source,
          channel, template_id, confidence, success, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
      `).run(
        candidateId,
        message,
        response.content,
        response.source,
        channel,
        response.templateId || null,
        response.confidence || 0.8
      );
    } catch (error) {
      console.error('❌ [Bridge] Error logging successful response:', error);
    }
  }

  /**
   * Log AI fallback usage for analysis
   */
  logAIFallbackUsage(candidateId, message, response, channel) {
    try {
      db.prepare(`
        INSERT INTO template_bridge_logs (
          candidate_id, message, response_content, response_source,
          channel, confidence, success, fallback_used, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, datetime('now'))
      `).run(
        candidateId,
        message,
        response.content,
        'ai_fallback',
        channel,
        response.confidence || 0.8
      );
    } catch (error) {
      console.error('❌ [Bridge] Error logging AI fallback:', error);
    }
  }

  /**
   * Initialize database tables for bridge logging
   */
  initializeBridgeTables() {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS template_bridge_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          candidate_id TEXT NOT NULL,
          message TEXT NOT NULL,
          response_content TEXT NOT NULL,
          response_source TEXT NOT NULL,
          channel TEXT DEFAULT 'app',
          template_id INTEGER,
          confidence REAL,
          success INTEGER DEFAULT 1,
          fallback_used INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_bridge_logs_candidate ON template_bridge_logs(candidate_id);
        CREATE INDEX IF NOT EXISTS idx_bridge_logs_created ON template_bridge_logs(created_at);
      `);
    } catch (error) {
      console.error('❌ [Bridge] Error creating tables:', error);
    }
  }

  /**
   * Get bridge performance metrics
   */
  getBridgeMetrics(days = 30) {
    try {
      const metrics = db.prepare(`
        SELECT
          COUNT(*) as total_messages,
          COUNT(CASE WHEN fallback_used = 0 THEN 1 END) as template_handled,
          COUNT(CASE WHEN fallback_used = 1 THEN 1 END) as ai_fallback,
          AVG(confidence) as avg_confidence,
          COUNT(CASE WHEN success = 1 THEN 1 END) as successful_responses
        FROM template_bridge_logs
        WHERE created_at > datetime('now', '-' || ? || ' days')
      `).get(days);

      const sourceBreakdown = db.prepare(`
        SELECT
          response_source,
          COUNT(*) as count,
          AVG(confidence) as avg_confidence
        FROM template_bridge_logs
        WHERE created_at > datetime('now', '-' || ? || ' days')
        GROUP BY response_source
        ORDER BY count DESC
      `).all(days);

      return {
        overview: metrics,
        sourceBreakdown
      };

    } catch (error) {
      console.error('❌ [Bridge] Error getting metrics:', error);
      return null;
    }
  }

  /**
   * Enable/disable the bridge system
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`🌉 [Bridge] Template system ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Configure fallback behavior
   */
  configureFallback(enableFallback) {
    this.fallbackToAI = enableFallback;
    console.log(`🌉 [Bridge] AI fallback ${enableFallback ? 'enabled' : 'disabled'}`);
  }

  /**
   * Health check for the bridge system
   */
  healthCheck() {
    try {
      const status = {
        bridge_enabled: this.isEnabled,
        fallback_enabled: this.fallbackToAI,
        template_system_ready: !!this.templateSystem,
        database_connected: !!db
      };

      // Test template system
      try {
        this.templateSystem.intentClassifier.classifyMessage('test message');
        status.intent_classifier_ready = true;
      } catch (error) {
        status.intent_classifier_ready = false;
        status.intent_classifier_error = error.message;
      }

      return status;

    } catch (error) {
      return {
        bridge_enabled: false,
        error: error.message
      };
    }
  }
}

module.exports = TemplateIntegrationBridge;