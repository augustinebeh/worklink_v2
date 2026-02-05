/**
 * Alert System Test Utility
 * Creates test alerts to verify the Alert Center functionality
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const API_BASE = 'http://localhost:3000/api/v1';

// Test alert data
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
  }
];

async function createTestAlerts() {
  console.log('🔔 Creating test alerts...\n');

  try {
    // First, create some alert rules (optional, for completeness)
    const sampleRule = {
      rule_name: 'High Value Tender Alert',
      rule_type: 'value_threshold',
      conditions: {
        min_value: 1000000,
        agencies: ['Ministry of Health', 'Ministry of Education']
      },
      priority: 'critical',
      notification_channels: ['email', 'in_app', 'slack'],
      recipients: {
        email: ['admin@worklink.sg'],
        slack: ['#alerts']
      },
      active: true,
      created_by: 'test-script'
    };

    // Create rule
    try {
      const ruleResponse = await axios.post(`${API_BASE}/alerts/rules`, sampleRule);
      console.log('✅ Created sample alert rule:', ruleResponse.data.data.rule_name);
    } catch (err) {
      console.log('ℹ️  Alert rule may already exist or DB not ready:', err.message);
    }

    // Create test alerts by inserting directly into history
    for (let i = 0; i < testAlerts.length; i++) {
      const alert = testAlerts[i];

      const alertData = {
        id: uuidv4(),
        rule_id: uuidv4(), // Mock rule ID
        trigger_type: alert.trigger_type,
        tender_id: alert.trigger_type === 'tender' ? uuidv4() : null,
        renewal_id: alert.trigger_type === 'renewal' ? uuidv4() : null,
        alert_title: alert.title,
        alert_message: alert.message,
        alert_priority: alert.priority,
        alert_data: JSON.stringify(alert.alert_data),
        delivered_channels: '["in_app"]',
        delivery_status: 'sent',
        triggered_at: new Date(Date.now() - (i * 30 * 60 * 1000)).toISOString(), // Spread alerts over 2.5 hours
        acknowledged: i > 2 ? 1 : 0, // Mark first 3 as unread
        acknowledged_at: i > 2 ? new Date().toISOString() : null,
        acknowledged_by: i > 2 ? 'admin' : null
      };

      try {
        // We'll use the trigger endpoint to simulate alert creation
        const triggerResponse = await axios.post(`${API_BASE}/alerts/trigger`, {
          tender_id: alertData.tender_id,
          renewal_id: alertData.renewal_id,
          trigger_type: alert.trigger_type,
          // Custom alert data for testing
          test_mode: true,
          custom_alert: alertData
        });

        if (triggerResponse.data.success) {
          console.log(`✅ Created ${alert.priority} alert: ${alert.title.substring(0, 50)}...`);
        }
      } catch (err) {
        console.log(`❌ Failed to create alert: ${alert.title.substring(0, 30)}...`);
        console.log('   Error:', err.response?.data?.error || err.message);
      }
    }

  } catch (error) {
    console.error('❌ Error creating test alerts:', error.message);
    process.exit(1);
  }
}

async function testAlertEndpoints() {
  console.log('\n🧪 Testing alert endpoints...\n');

  try {
    // Test unread count
    const countResponse = await axios.get(`${API_BASE}/alerts/unread-count`);
    console.log('📊 Unread count:', countResponse.data.data.unread_count);

    // Test alert history
    const historyResponse = await axios.get(`${API_BASE}/alerts/history?limit=5`);
    console.log('📋 Recent alerts:', historyResponse.data.data.length);

    // Test filtering
    const criticalResponse = await axios.get(`${API_BASE}/alerts/history?priority=critical&limit=5`);
    console.log('🚨 Critical alerts:', criticalResponse.data.data.length);

    // Test unread only
    const unreadResponse = await axios.get(`${API_BASE}/alerts/history?unread_only=true&limit=5`);
    console.log('👀 Unread alerts:', unreadResponse.data.data.length);

    console.log('\n✅ All endpoints working correctly!');

  } catch (error) {
    console.error('❌ Error testing endpoints:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('🔔 Alert System Test Suite');
  console.log('==========================\n');

  // Wait for server to be ready
  console.log('⏳ Waiting for server...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  await createTestAlerts();
  await testAlertEndpoints();

  console.log('\n🎉 Alert system test completed!');
  console.log('\nTo view alerts:');
  console.log('1. Visit http://localhost:3000/admin/alerts');
  console.log('2. Click the bell icon in the admin header');
  console.log('3. Check the alert preferences at /admin/alert-settings');
}

// Auto-run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createTestAlerts, testAlertEndpoints };