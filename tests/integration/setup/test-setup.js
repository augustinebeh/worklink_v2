/**
 * Test Setup and Utilities
 * Shared configuration and helpers for integration tests
 */

const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

// Global test configuration
global.TEST_CONFIG = {
  DB_PATH: path.join(__dirname, '../../../database/test_gebiz_intelligence.db'),
  API_BASE_URL: 'http://localhost:3000/api/v1',
  ADMIN_BASE_URL: 'http://localhost:3001',
  TEST_TIMEOUT: 30000,
  TEST_USER_ID: 'test-admin-user',
  TEST_EMAIL: 'test@worklink.sg'
};

// Test database helpers
global.TestDB = {
  /**
   * Create a fresh test database
   */
  createTestDB() {
    const db = new Database(global.TEST_CONFIG.DB_PATH);

    // Create test schema (simplified version of main schema)
    db.exec(`
      -- BPO tender lifecycle table
      CREATE TABLE IF NOT EXISTS bpo_tender_lifecycle (
        id TEXT PRIMARY KEY,
        source_type TEXT DEFAULT 'manual_entry',
        source_id TEXT,
        tender_no TEXT,
        title TEXT NOT NULL,
        agency TEXT NOT NULL,
        description TEXT,
        category TEXT,
        published_date DATE,
        closing_date DATE,
        contract_start_date DATE,
        contract_end_date DATE,
        estimated_value REAL,
        our_bid_amount REAL,
        stage TEXT DEFAULT 'new_opportunity',
        priority TEXT DEFAULT 'medium',
        is_urgent INTEGER DEFAULT 0,
        is_featured INTEGER DEFAULT 0,
        is_renewal INTEGER DEFAULT 0,
        renewal_id TEXT,
        incumbent_supplier TEXT,
        external_url TEXT,
        assigned_to TEXT,
        assigned_team TEXT DEFAULT '[]',
        qualification_score REAL,
        qualification_details TEXT DEFAULT '{}',
        decision TEXT,
        decision_reasoning TEXT,
        decision_made_at DATETIME,
        decision_made_by TEXT,
        outcome TEXT,
        outcome_date DATE,
        actual_contract_value REAL,
        loss_reason TEXT,
        notes TEXT,
        tags TEXT DEFAULT '[]',
        documents TEXT DEFAULT '[]',
        stage_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Contract renewals table
      CREATE TABLE IF NOT EXISTS contract_renewals (
        id TEXT PRIMARY KEY,
        agency TEXT NOT NULL,
        contract_reference TEXT,
        original_tender_id TEXT,
        contract_start_date DATE,
        contract_end_date DATE,
        contract_value REAL,
        service_description TEXT,
        incumbent_supplier TEXT,
        renewal_probability REAL DEFAULT 50,
        engagement_status TEXT DEFAULT 'not_started',
        bd_manager TEXT,
        last_engagement_date DATETIME,
        next_action_date DATE,
        activities TEXT DEFAULT '[]',
        stage TEXT DEFAULT 'monitoring',
        priority TEXT DEFAULT 'medium',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Alert rules table
      CREATE TABLE IF NOT EXISTS alert_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_name TEXT NOT NULL UNIQUE,
        rule_type TEXT NOT NULL,
        description TEXT,
        conditions TEXT DEFAULT '{}',
        recipients TEXT DEFAULT '{}',
        priority TEXT DEFAULT 'medium',
        active INTEGER DEFAULT 1,
        escalation_enabled INTEGER DEFAULT 0,
        escalation_after_minutes INTEGER DEFAULT 60,
        escalation_recipients TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_triggered_at DATETIME
      );

      -- Alert history table
      CREATE TABLE IF NOT EXISTS alert_history (
        id TEXT PRIMARY KEY,
        rule_id INTEGER,
        trigger_type TEXT,
        tender_id TEXT,
        renewal_id TEXT,
        alert_title TEXT,
        alert_message TEXT,
        alert_priority TEXT DEFAULT 'medium',
        alert_data TEXT DEFAULT '{}',
        triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        acknowledged INTEGER DEFAULT 0,
        acknowledged_at DATETIME,
        acknowledged_by TEXT,
        action_taken TEXT,
        escalated INTEGER DEFAULT 0,
        escalated_at DATETIME,
        escalation_level INTEGER DEFAULT 0,
        delivered_channels TEXT DEFAULT '[]',
        delivery_status TEXT DEFAULT 'pending',
        delivery_errors TEXT,
        digest_sent INTEGER DEFAULT 0,
        digest_sent_at DATETIME
      );

      -- User alert preferences
      CREATE TABLE IF NOT EXISTS user_alert_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL UNIQUE,
        email_address TEXT,
        slack_user_id TEXT,
        teams_user_id TEXT,
        digest_enabled INTEGER DEFAULT 1,
        digest_frequency TEXT DEFAULT 'daily',
        email_enabled INTEGER DEFAULT 1,
        slack_enabled INTEGER DEFAULT 0,
        teams_enabled INTEGER DEFAULT 0,
        priority_filter TEXT DEFAULT 'all',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Audit log
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        event_action TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        user_id TEXT,
        old_value TEXT,
        new_value TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    return db;
  },

  /**
   * Clean test database
   */
  cleanTestDB() {
    const db = new Database(global.TEST_CONFIG.DB_PATH);
    db.exec(`
      DELETE FROM alert_history;
      DELETE FROM alert_rules;
      DELETE FROM contract_renewals;
      DELETE FROM bpo_tender_lifecycle;
      DELETE FROM user_alert_preferences;
      DELETE FROM audit_log;
    `);
    db.close();
  },

  /**
   * Seed test data
   */
  seedTestData() {
    const db = new Database(global.TEST_CONFIG.DB_PATH);

    // Insert test tender
    const tenderId = uuidv4();
    db.prepare(`
      INSERT INTO bpo_tender_lifecycle (
        id, title, agency, description, estimated_value,
        closing_date, stage, priority, is_urgent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tenderId,
      'Test Security Services Tender',
      'Ministry of Defence',
      'Comprehensive security services for government facilities',
      2500000,
      new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
      'new_opportunity',
      'high',
      1
    );

    // Insert test renewal
    const renewalId = uuidv4();
    db.prepare(`
      INSERT INTO contract_renewals (
        id, agency, contract_reference, contract_end_date,
        contract_value, renewal_probability, engagement_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      renewalId,
      'Housing Development Board',
      'HDB/2023/CLEAN001',
      new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months from now
      1800000,
      75,
      'not_started'
    );

    // Insert test alert rules
    db.prepare(`
      INSERT INTO alert_rules (
        rule_name, rule_type, description, conditions, recipients, priority, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'High Value Tenders',
      'value_threshold',
      'Alert for tenders over $1M',
      JSON.stringify({ min_value: 1000000, categories: [] }),
      JSON.stringify({ emails: ['admin@worklink.sg'], slack_channels: [] }),
      'high',
      1
    );

    db.prepare(`
      INSERT INTO alert_rules (
        rule_name, rule_type, description, conditions, recipients, priority, active, escalation_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Closing Soon',
      'closing_soon',
      'Alert for tenders closing within 2 days',
      JSON.stringify({ days_until_close: 2, exclude_stages: ['submitted', 'awarded', 'lost'] }),
      JSON.stringify({ emails: ['bidmanager@worklink.sg'], slack_channels: [] }),
      'critical',
      1,
      1
    );

    // Insert user preferences
    db.prepare(`
      INSERT INTO user_alert_preferences (
        user_id, email_address, digest_enabled, email_enabled
      ) VALUES (?, ?, ?, ?)
    `).run(
      global.TEST_CONFIG.TEST_USER_ID,
      global.TEST_CONFIG.TEST_EMAIL,
      1,
      1
    );

    db.close();

    return { tenderId, renewalId };
  }
};

// Test API helpers
global.TestAPI = {
  /**
   * Helper to make authenticated API requests
   */
  async makeAuthRequest(app, method, endpoint, data = null) {
    const request = require('supertest')(app);
    let req;

    switch (method.toLowerCase()) {
      case 'get':
        req = request.get(endpoint);
        break;
      case 'post':
        req = request.post(endpoint);
        break;
      case 'patch':
        req = request.patch(endpoint);
        break;
      case 'delete':
        req = request.delete(endpoint);
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    // Add auth headers if needed
    req = req.set('Authorization', `Bearer test-token`);
    req = req.set('User-Agent', 'Integration-Test');

    if (data) {
      req = req.send(data);
    }

    return req;
  }
};

// Setup and teardown
beforeEach(() => {
  global.TestDB.createTestDB();
});

afterEach(() => {
  global.TestDB.cleanTestDB();
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('✅ Test environment configured');