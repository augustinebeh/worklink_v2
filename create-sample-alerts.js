/**
 * Create Sample Alerts for Testing
 * Inserts test alerts directly into the database
 */

const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'database/gebiz_intelligence.db');

// Sample alert data
const testAlerts = [
  {
    priority: 'critical',
    trigger_type: 'tender',
    title: 'High-Value Tender Alert: Ministry of Health',
    message: 'New tender worth $2.5M for healthcare IT infrastructure has been published. Closing in 3 days.',
    alert_data: {
      tender_value: 2500000,
      agency: 'Ministry of Health',
      closing_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    priority: 'high',
    trigger_type: 'renewal',
    title: 'Contract Renewal Opportunity',
    message: 'MTI contract (85% renewal probability) expires in 2 months. Time to prepare renewal proposal.',
    alert_data: {
      agency: 'Ministry of Trade & Industry',
      renewal_probability: 85,
      contract_end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    priority: 'medium',
    trigger_type: 'deadline',
    title: 'Proposal Deadline Reminder',
    message: 'Proposal for MOM tender due tomorrow. Final review required.',
    alert_data: {
      tender_title: 'Workforce Development Platform',
      agency: 'Ministry of Manpower',
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    priority: 'low',
    trigger_type: 'system',
    title: 'Weekly Performance Summary',
    message: 'Your team processed 45 applications this week, 15% above target.',
    alert_data: {
      applications_processed: 45,
      target: 40,
      performance: '+15%'
    }
  },
  {
    priority: 'critical',
    trigger_type: 'tender',
    title: 'Urgent: Late-Stage Tender Clarification',
    message: 'Clarification questions received for ongoing MOE tender. Response required within 24 hours.',
    alert_data: {
      tender_title: 'Education Technology Platform',
      agency: 'Ministry of Education',
      response_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    priority: 'high',
    trigger_type: 'tender',
    title: 'New BTO Manpower Tender',
    message: 'HDB has published a new BTO construction manpower tender worth $1.2M.',
    alert_data: {
      tender_value: 1200000,
      agency: 'Housing Development Board',
      category: 'Construction Manpower'
    }
  }
];

function createSampleAlerts() {
  console.log('🔔 Creating sample alerts directly in database...\n');

  try {
    const db = new Database(DB_PATH);

    // Temporarily disable foreign key constraints for test data
    db.pragma('foreign_keys = OFF');

    // Clear existing alerts for fresh test
    db.prepare('DELETE FROM alert_history WHERE acknowledged_by = ?').run('test-system');

    const insertAlert = db.prepare(`
      INSERT INTO alert_history (
        id, rule_id, trigger_type, tender_id, renewal_id,
        alert_title, alert_message, alert_priority, alert_data,
        delivered_channels, delivery_status, triggered_at,
        acknowledged, acknowledged_at, acknowledged_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < testAlerts.length; i++) {
      const alert = testAlerts[i];
      const isUnread = i < 3; // First 3 are unread

      const alertData = {
        id: uuidv4(),
        rule_id: uuidv4(),
        trigger_type: alert.trigger_type,
        tender_id: alert.trigger_type === 'tender' ? uuidv4() : null,
        renewal_id: alert.trigger_type === 'renewal' ? uuidv4() : null,
        alert_title: alert.title,
        alert_message: alert.message,
        alert_priority: alert.priority,
        alert_data: JSON.stringify(alert.alert_data),
        delivered_channels: '["in_app"]',
        delivery_status: 'sent',
        triggered_at: new Date(Date.now() - (i * 45 * 60 * 1000)).toISOString(), // Spread over 4.5 hours
        acknowledged: isUnread ? 0 : 1,
        acknowledged_at: isUnread ? null : new Date().toISOString(),
        acknowledged_by: isUnread ? null : 'test-system'
      };

      insertAlert.run(
        alertData.id,
        alertData.rule_id,
        alertData.trigger_type,
        alertData.tender_id,
        alertData.renewal_id,
        alertData.alert_title,
        alertData.alert_message,
        alertData.alert_priority,
        alertData.alert_data,
        alertData.delivered_channels,
        alertData.delivery_status,
        alertData.triggered_at,
        alertData.acknowledged,
        alertData.acknowledged_at,
        alertData.acknowledged_by
      );

      const statusEmoji = isUnread ? '🔔' : '✅';
      console.log(`${statusEmoji} Created ${alert.priority} alert: ${alert.title.substring(0, 50)}...`);
    }

    // Re-enable foreign key constraints
    db.pragma('foreign_keys = ON');

    // Test queries
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM alert_history WHERE acknowledged = 0').get();
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM alert_history').get();

    console.log('\n📊 Alert Statistics:');
    console.log(`   Total alerts: ${totalCount.count}`);
    console.log(`   Unread alerts: ${unreadCount.count}`);

    // Test by priority
    const priorityCounts = db.prepare(`
      SELECT alert_priority, COUNT(*) as count
      FROM alert_history
      WHERE acknowledged = 0
      GROUP BY alert_priority
    `).all();

    console.log('\n📋 Unread Alerts by Priority:');
    priorityCounts.forEach(row => {
      console.log(`   ${row.alert_priority}: ${row.count}`);
    });

    // Test recent alerts
    const recentAlerts = db.prepare(`
      SELECT alert_title, alert_priority, triggered_at, acknowledged
      FROM alert_history
      ORDER BY triggered_at DESC
      LIMIT 3
    `).all();

    console.log('\n🕐 Recent Alerts:');
    recentAlerts.forEach(alert => {
      const status = alert.acknowledged ? '[READ]' : '[UNREAD]';
      console.log(`   ${status} ${alert.alert_title.substring(0, 40)}... (${alert.alert_priority})`);
    });

    db.close();

    console.log('\n🎉 Sample alerts created successfully!');
    console.log('\nNext steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Visit: http://localhost:3000/admin');
    console.log('3. Click the bell icon to see alerts');
    console.log('4. Visit: http://localhost:3000/admin/alerts for full view');

  } catch (error) {
    console.error('❌ Error creating sample alerts:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createSampleAlerts();
}

module.exports = { createSampleAlerts };