/**
 * 💬 SLACK NOTIFICATION SERVICE
 * Webhook integration for team alerts
 * Rich formatting with blocks and attachments
 */

const https = require('https');

class SlackService {
  constructor() {
    this.initialized = false;
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.defaultChannel = process.env.SLACK_DEFAULT_CHANNEL || '#tenders';
  }

  /**
   * Initialize Slack service
   */
  initialize() {
    if (!this.webhookUrl) {
      console.warn('⚠️  Slack webhook URL not found. Slack notifications disabled.');
      return false;
    }
    
    this.initialized = true;
    console.log('✅ Slack service initialized (Webhooks)');
    return true;
  }

  /**
   * Send high-value tender alert
   */
  async sendHighValueTenderAlert(tender, channels) {
    if (!this.initialized) return { success: false, error: 'Slack service not initialized' };
    
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 High-Value Tender Alert',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${tender.title}*\n${tender.agency}`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Value:*\n$${this.formatCurrency(tender.estimated_value)}`
          },
          {
            type: 'mrkdwn',
            text: `*Closes:*\n${this.formatDate(tender.closing_date)}`
          },
          {
            type: 'mrkdwn',
            text: `*Tender No:*\n${tender.tender_no || 'N/A'}`
          },
          {
            type: 'mrkdwn',
            text: `*Stage:*\n${this.formatStage(tender.stage)}`
          }
        ]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Review Tender',
              emoji: true
            },
            url: `${this.getAppUrl()}/admin/bpo-lifecycle/${tender.id}`,
            style: 'danger'
          }
        ]
      }
    ];
    
    return await this.send(channels, { blocks }, 'danger');
  }

  /**
   * Send closing soon alert
   */
  async sendClosingSoonAlert(tender, channels, daysUntil) {
    if (!this.initialized) return { success: false, error: 'Slack service not initialized' };
    
    const urgency = daysUntil <= 1 ? '⚠️ URGENT' : '⏰';
    
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${urgency} Tender Closing in ${daysUntil} Day${daysUntil !== 1 ? 's' : ''}`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${tender.title}*\n${tender.agency}`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Time Remaining:*\n${daysUntil} day${daysUntil !== 1 ? 's' : ''} ⏰`
          },
          {
            type: 'mrkdwn',
            text: `*Current Stage:*\n${this.formatStage(tender.stage)}`
          },
          {
            type: 'mrkdwn',
            text: `*Assigned To:*\n${tender.assigned_to || 'Unassigned'}`
          },
          {
            type: 'mrkdwn',
            text: `*Priority:*\n${tender.priority.toUpperCase()}`
          }
        ]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Take Action',
              emoji: true
            },
            url: `${this.getAppUrl()}/admin/bpo-lifecycle/${tender.id}`,
            style: 'danger'
          }
        ]
      }
    ];
    
    return await this.send(channels, { blocks }, 'warning');
  }

  /**
   * Send renewal prediction alert
   */
  async sendRenewalPredictionAlert(renewal, channels) {
    if (!this.initialized) return { success: false, error: 'Slack service not initialized' };
    
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🔮 Renewal Opportunity Detected',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${renewal.agency}*\n${renewal.contract_description || 'Contract Renewal'}`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Probability:*\n${renewal.renewal_probability}% 📊`
          },
          {
            type: 'mrkdwn',
            text: `*Value:*\n$${this.formatCurrency(renewal.contract_value)}`
          },
          {
            type: 'mrkdwn',
            text: `*Contract Ends:*\n${this.formatDate(renewal.contract_end_date)}`
          },
          {
            type: 'mrkdwn',
            text: `*Expected RFP:*\n${this.formatDate(renewal.predicted_rfp_date)}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Incumbent:* ${renewal.incumbent_supplier || 'Unknown'}`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Start Engagement',
              emoji: true
            },
            url: `${this.getAppUrl()}/admin/renewal-pipeline/${renewal.id}`,
            style: 'primary'
          }
        ]
      }
    ];
    
    return await this.send(channels, { blocks }, 'good');
  }

  /**
   * Send generic alert
   */
  async sendAlert(alert, channels) {
    if (!this.initialized) return { success: false, error: 'Slack service not initialized' };
    
    const priorityColors = {
      critical: 'danger',
      high: 'warning',
      medium: 'good',
      low: '#dddddd'
    };
    
    const priorityIcons = {
      critical: '🚨',
      high: '⚠️',
      medium: 'ℹ️',
      low: '📢'
    };
    
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${priorityIcons[alert.priority] || 'ℹ️'} ${alert.alert_title}`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: alert.alert_message
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Priority: *${alert.priority.toUpperCase()}*  |  ${new Date().toLocaleString('en-SG')}`
          }
        ]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Alert',
              emoji: true
            },
            url: `${this.getAppUrl()}/admin/alerts`
          }
        ]
      }
    ];
    
    return await this.send(channels, { blocks }, priorityColors[alert.priority]);
  }

  /**
   * Send daily digest
   */
  async sendDailyDigest(alerts, channels) {
    if (!this.initialized) return { success: false, error: 'Slack service not initialized' };
    
    const grouped = {
      critical: alerts.filter(a => a.priority === 'critical'),
      high: alerts.filter(a => a.priority === 'high'),
      medium: alerts.filter(a => a.priority === 'medium')
    };
    
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📊 Daily Alert Digest (${alerts.length} alerts)`,
          emoji: true
        }
      }
    ];
    
    if (grouped.critical.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🚨 Critical (${grouped.critical.length})*\n` +
                grouped.critical.slice(0, 3).map(a => `• ${a.alert_title}`).join('\n') +
                (grouped.critical.length > 3 ? `\n_+ ${grouped.critical.length - 3} more_` : '')
        }
      });
    }
    
    if (grouped.high.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*⚠️ High Priority (${grouped.high.length})*\n` +
                grouped.high.slice(0, 3).map(a => `• ${a.alert_title}`).join('\n') +
                (grouped.high.length > 3 ? `\n_+ ${grouped.high.length - 3} more_` : '')
        }
      });
    }
    
    if (grouped.medium.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*ℹ️ Medium Priority (${grouped.medium.length})*\n_${grouped.medium.length} alerts_`
        }
      });
    }
    
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View All Alerts',
            emoji: true
          },
          url: `${this.getAppUrl()}/admin/alerts`
        }
      ]
    });
    
    return await this.send(channels, { blocks });
  }

  /**
   * Generic send method
   */
  async send(channels, payload, color = null) {
    if (!this.initialized) {
      return { success: false, error: 'Slack service not initialized' };
    }
    
    try {
      const channelList = Array.isArray(channels) ? channels : [channels || this.defaultChannel];
      const results = [];
      
      for (const channel of channelList) {
        const message = {
          channel,
          ...payload
        };
        
        if (color && !payload.blocks) {
          message.attachments = [{
            color,
            ...payload
          }];
        }
        
        try {
          await this.sendWebhook(message);
          results.push({
            channel,
            success: true
          });
        } catch (error) {
          results.push({
            channel,
            success: false,
            error: error.message
          });
        }
      }
      
      const successful = results.filter(r => r.success).length;
      
      return {
        success: successful > 0,
        sent: successful,
        failed: results.length - successful,
        results
      };
    } catch (error) {
      console.error('Slack send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send webhook POST request
   */
  sendWebhook(message) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(message);
      const url = new URL(this.webhookUrl);
      
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`Slack API error: ${res.statusCode} ${data}`));
          }
        });
      });
      
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  formatCurrency(value) {
    return new Intl.NumberFormat('en-SG').format(value);
  }

  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-SG', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    });
  }

  formatStage(stage) {
    const stages = {
      renewal_watch: 'Renewal Watch',
      new_opportunity: 'New Opportunity',
      review: 'Under Review',
      bidding: 'Bidding',
      internal_approval: 'Internal Approval',
      submitted: 'Submitted',
      awarded: 'Awarded',
      lost: 'Lost'
    };
    return stages[stage] || stage;
  }

  getAppUrl() {
    return process.env.APP_URL || 'http://localhost:8080';
  }
}

module.exports = new SlackService();
