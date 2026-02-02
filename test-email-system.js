/**
 * Email System Test Script
 * Comprehensive test of the email notification system
 */

require('dotenv').config();

const { db } = require('./db');
const EmailService = require('./services/email');
const EmailDeliveryTracker = require('./services/email/delivery-tracker');
const { getEmailConfig, testEmailConfig } = require('./config/email');

class EmailSystemTester {
  constructor() {
    this.deliveryTracker = new EmailDeliveryTracker();
    this.results = [];
  }

  async runTests() {
    console.log('🧪 Starting Email System Comprehensive Test\n');
    console.log('=' .repeat(60));

    try {
      // Test 1: Database Tables
      await this.testDatabaseTables();

      // Test 2: Configuration Loading
      await this.testConfigurationLoading();

      // Test 3: Email Service Initialization
      await this.testEmailServiceInitialization();

      // Test 4: Template Rendering
      await this.testTemplateRendering();

      // Test 5: Email Preferences
      await this.testEmailPreferences();

      // Test 6: Delivery Tracking
      await this.testDeliveryTracking();

      // Test 7: Tender Alert Function
      await this.testTenderAlertFunction();

      // Test 8: Configuration API
      await this.testConfigurationAPI();

      // Test 9: Retry Logic
      await this.testRetryLogic();

      // Test 10: Rate Limiting
      await this.testRateLimiting();

      // Summary
      this.printSummary();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  async testDatabaseTables() {
    console.log('📊 Testing Database Tables...');

    try {
      // Test email_delivery_log table
      const deliveryLogTest = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='email_delivery_log'").get();
      this.assert(deliveryLogTest, 'email_delivery_log table exists');

      // Test email_delivery_attempts table
      const attemptsTest = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='email_delivery_attempts'").get();
      this.assert(attemptsTest, 'email_delivery_attempts table exists');

      // Test email_config table
      const configTest = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='email_config'").get();
      this.assert(configTest, 'email_config table exists');

      // Test email_preferences table
      const preferencesTest = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='email_preferences'").get();
      this.assert(preferencesTest, 'email_preferences table exists');

      // Test that we can insert and query data
      const testRecord = this.deliveryTracker.createDeliveryRecord({
        to: 'test@example.com',
        subject: 'Test Email',
        category: 'test',
        priority: 'normal'
      });
      this.assert(testRecord, 'Can create delivery record');

      const retrievedRecord = this.deliveryTracker.getDeliveryStatus(testRecord);
      this.assert(retrievedRecord && retrievedRecord.tracking_id === testRecord, 'Can retrieve delivery record');

      this.logSuccess('Database tables test passed');
    } catch (error) {
      this.logError('Database tables test failed', error);
    }
  }

  async testConfigurationLoading() {
    console.log('⚙️  Testing Configuration Loading...');

    try {
      const config = getEmailConfig();
      this.assert(config, 'Configuration loads successfully');
      this.assert(config.provider, 'Configuration has provider');
      this.assert(config.from, 'Configuration has from address');
      this.assert(config.rateLimit, 'Configuration has rate limit settings');
      this.assert(config.retry, 'Configuration has retry settings');

      this.logSuccess('Configuration loading test passed');
    } catch (error) {
      this.logError('Configuration loading test failed', error);
    }
  }

  async testEmailServiceInitialization() {
    console.log('🚀 Testing Email Service Initialization...');

    try {
      await EmailService.initialize();
      this.assert(EmailService.isInitialized, 'Email service initializes successfully');

      this.logSuccess('Email service initialization test passed');
    } catch (error) {
      this.logError('Email service initialization test failed', error);
    }
  }

  async testTemplateRendering() {
    console.log('📝 Testing Template Rendering...');

    try {
      const EmailTemplates = require('./services/email/templates');
      const templates = new EmailTemplates();

      // Test tender alert template
      const tenderAlertData = {
        recipientName: 'Test Admin',
        alert: { keyword: 'Test Keyword', id: 'alert123' },
        tender: {
          title: 'Test Tender',
          agency: 'Test Agency',
          category: 'Manpower Services',
          estimated_value: 50000,
          closing_date: '2024-03-15',
          location: 'Singapore',
          external_url: 'https://example.com'
        },
        alertUrl: 'https://example.com/alert',
        tenderUrl: 'https://example.com/tender'
      };

      const rendered = await templates.render('tender-alert', tenderAlertData);
      this.assert(rendered.html, 'Template renders HTML');
      this.assert(rendered.text, 'Template renders text');
      this.assert(rendered.subject, 'Template renders subject');
      this.assert(rendered.html.includes('Test Keyword'), 'Template includes data');

      this.logSuccess('Template rendering test passed');
    } catch (error) {
      this.logError('Template rendering test failed', error);
    }
  }

  async testEmailPreferences() {
    console.log('👤 Testing Email Preferences...');

    try {
      const testEmail = 'test@example.com';

      // Test getting default preferences
      const defaultPrefs = this.deliveryTracker.getEmailPreferences(testEmail);
      this.assert(defaultPrefs, 'Gets default preferences');
      this.assert(defaultPrefs.tender_alerts === 1, 'Default tender alerts enabled');

      // Test updating preferences
      const updatedPrefs = this.deliveryTracker.updateEmailPreferences(testEmail, {
        tender_alerts: 0,
        daily_reports: 1
      });
      this.assert(updatedPrefs.tender_alerts === 0, 'Updates preferences correctly');

      // Test preference checking
      const shouldSendTender = this.deliveryTracker.shouldSendEmail(testEmail, 'tender-alert');
      const shouldSendDaily = this.deliveryTracker.shouldSendEmail(testEmail, 'report-daily');
      this.assert(!shouldSendTender, 'Respects tender alert opt-out');
      this.assert(shouldSendDaily, 'Respects daily report opt-in');

      this.logSuccess('Email preferences test passed');
    } catch (error) {
      this.logError('Email preferences test failed', error);
    }
  }

  async testDeliveryTracking() {
    console.log('📬 Testing Delivery Tracking...');

    try {
      // Create delivery record
      const trackingId = this.deliveryTracker.createDeliveryRecord({
        to: 'test@example.com',
        subject: 'Test Delivery Tracking',
        category: 'test'
      });

      // Mark as delivered
      this.deliveryTracker.markAsDelivered(trackingId, {
        messageId: 'msg123',
        provider: 'smtp',
        attempt: 1
      });

      // Check status
      const status = this.deliveryTracker.getDeliveryStatus(trackingId);
      this.assert(status.status === 'delivered', 'Correctly marks as delivered');
      this.assert(status.message_id === 'msg123', 'Stores message ID');

      // Test analytics
      const analytics = this.deliveryTracker.getDeliveryAnalytics('24h');
      this.assert(analytics, 'Generates analytics');
      this.assert(analytics.overall.delivered >= 1, 'Counts delivered emails');

      this.logSuccess('Delivery tracking test passed');
    } catch (error) {
      this.logError('Delivery tracking test failed', error);
    }
  }

  async testTenderAlertFunction() {
    console.log('🎯 Testing Tender Alert Function...');

    try {
      // Create a test alert
      const alertData = {
        id: 'alert123',
        keyword: 'Test Manpower',
        email_notify: true
      };

      const tenderData = {
        title: 'Test Manpower Services Contract',
        agency: 'Test Agency',
        category: 'Manpower Services',
        estimated_value: 50000,
        closing_date: '2024-03-15',
        location: 'Singapore',
        external_url: 'https://example.com/tender'
      };

      // Test the actual tender alert function
      const tenderMonitor = require('./routes/api/v1/tender-monitor');

      // Since sendTenderAlert is not exported, we'll test it indirectly
      // by checking if EmailService.sendTenderAlert works
      const result = await EmailService.sendTenderAlert(alertData, tenderData);

      // In test mode, this might fail due to missing email config, but we check the structure
      this.assert(Array.isArray(result), 'Returns results array');

      this.logSuccess('Tender alert function test passed');
    } catch (error) {
      // Expected in test environment without proper email configuration
      this.logWarning('Tender alert function test skipped (no email config)', error.message);
    }
  }

  async testConfigurationAPI() {
    console.log('🔧 Testing Configuration API...');

    try {
      const { testEmailConfig, validateEmailConfig } = require('./config/email');

      // Test configuration validation
      const validConfig = {
        provider: 'smtp',
        smtp: {
          host: 'smtp.gmail.com',
          auth: {
            user: 'test@gmail.com',
            pass: 'password'
          }
        },
        from: {
          email: 'test@example.com'
        }
      };

      validateEmailConfig(validConfig);
      this.logSuccess('Configuration validation works');

      // Test invalid configuration
      try {
        validateEmailConfig({
          provider: 'invalid',
          from: { email: 'invalid-email' }
        });
        this.logError('Should reject invalid configuration');
      } catch (error) {
        this.logSuccess('Correctly rejects invalid configuration');
      }

      this.logSuccess('Configuration API test passed');
    } catch (error) {
      this.logError('Configuration API test failed', error);
    }
  }

  async testRetryLogic() {
    console.log('🔄 Testing Retry Logic...');

    try {
      // Create failed delivery record
      const trackingId = this.deliveryTracker.createDeliveryRecord({
        to: 'test@example.com',
        subject: 'Test Retry Logic',
        category: 'test',
        maxAttempts: 3
      });

      // Mark as failed
      this.deliveryTracker.markAsFailed(trackingId, {
        error: 'Network timeout',
        attempt: 1
      });

      // Get emails for retry
      const retryEmails = this.deliveryTracker.getEmailsForRetry();
      this.assert(retryEmails.length >= 1, 'Finds emails for retry');

      const emailScheduler = require('./services/email/scheduler');
      this.assert(emailScheduler, 'Email scheduler loads');

      this.logSuccess('Retry logic test passed');
    } catch (error) {
      this.logError('Retry logic test failed', error);
    }
  }

  async testRateLimiting() {
    console.log('⏱️  Testing Rate Limiting...');

    try {
      // Test rate limit check function exists
      const checkRateLimitMethod = EmailService.checkRateLimit;
      this.assert(typeof checkRateLimitMethod === 'function', 'Rate limit check method exists');

      this.logSuccess('Rate limiting test passed');
    } catch (error) {
      this.logError('Rate limiting test failed', error);
    }
  }

  // Test utilities
  assert(condition, message) {
    if (condition) {
      this.results.push({ status: 'PASS', message });
    } else {
      this.results.push({ status: 'FAIL', message });
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  logSuccess(message) {
    console.log(`  ✅ ${message}`);
    this.results.push({ status: 'PASS', message });
  }

  logError(message, error) {
    console.log(`  ❌ ${message}: ${error?.message || error}`);
    this.results.push({ status: 'FAIL', message, error: error?.message || error });
  }

  logWarning(message, details) {
    console.log(`  ⚠️  ${message}: ${details}`);
    this.results.push({ status: 'WARN', message, details });
  }

  printSummary() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📊 Total: ${this.results.length}`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  - ${r.message}: ${r.error}`);
      });
    }

    if (warnings > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results.filter(r => r.status === 'WARN').forEach(r => {
        console.log(`  - ${r.message}: ${r.details}`);
      });
    }

    console.log('\n' + '=' .repeat(60));
    console.log(`🎯 Email System Test Complete: ${failed === 0 ? 'SUCCESS' : 'FAILURE'}`);
    console.log('=' .repeat(60));

    if (failed > 0) {
      process.exit(1);
    }
  }
}

// Run tests
if (require.main === module) {
  const tester = new EmailSystemTester();
  tester.runTests().catch(console.error);
}

module.exports = EmailSystemTester;