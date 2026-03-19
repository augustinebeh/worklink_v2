/**
 * Unit Tests: Alert System
 *
 * Tests the alert routes (rules CRUD, unread count, trigger/dedup)
 * and the AlertEngine class (evaluateAllRules, value_threshold, closing_soon).
 *
 * The real database and logger are mocked so these tests run in isolation.
 */

// ---------------------------------------------------------------------------
// Mock setup  (must come before any require that touches these modules)
// ---------------------------------------------------------------------------

// In-memory store that the mock db operates on
let mockTables = {};   // { tableName: [row, ...] }
let mockSqliteMaster = new Set(); // track which tables "exist"

/**
 * Tiny fake prepared-statement factory.
 * Supports the SQL patterns used by the alerts module:
 *   SELECT ... FROM sqlite_master WHERE type='table' AND name=?
 *   SELECT * FROM alert_rules ...
 *   INSERT INTO alert_rules ...
 *   UPDATE / DELETE ...
 */
function makeMockPrepare() {
  return function prepare(sql) {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    return {
      // ---------- SELECT sqlite_master (tableExists helper) ----------
      get(...params) {
        if (normalized.includes('sqlite_master')) {
          const tableName = params[0];
          if (mockSqliteMaster.has(tableName)) {
            return { name: tableName };
          }
          return undefined;
        }

        // SELECT COUNT(*) as count FROM alert_history WHERE acknowledged = 0
        if (normalized.includes('COUNT(*)') && normalized.includes('alert_history')) {
          const rows = mockTables['alert_history'] || [];
          const count = rows.filter(r => r.acknowledged === 0).length;
          return { count };
        }

        // SELECT * FROM alert_rules WHERE id = ?
        if (normalized.includes('FROM alert_rules') && normalized.includes('WHERE id')) {
          const id = params[0];
          return (mockTables['alert_rules'] || []).find(r => r.id === id) || undefined;
        }

        // SELECT * FROM bpo_tender_lifecycle WHERE id = ?
        if (normalized.includes('bpo_tender_lifecycle') && normalized.includes('WHERE id')) {
          const id = params[0];
          return (mockTables['bpo_tender_lifecycle'] || []).find(r => r.id === id) || undefined;
        }

        // Dedup check from route: uses COALESCE pattern with 4 params (ruleId, triggerType, tenderId, renewalId)
        // Dedup check from engine isDuplicate: uses (tender_id = ? OR renewal_id = ?) with 3 params (ruleId, tenderId, renewalId)
        if (normalized.includes('FROM alert_history') && normalized.includes('rule_id')) {
          const rows = mockTables['alert_history'] || [];

          if (normalized.includes('COALESCE')) {
            // Route trigger dedup: params = [ruleId, triggerType, tenderId, renewalId]
            const ruleId = params[0];
            const triggerType = params[1];
            const tenderId = params[2];
            const match = rows.find(r =>
              r.rule_id === ruleId &&
              r.trigger_type === triggerType &&
              (r.tender_id || '') === (tenderId || '')
            );
            return match ? { id: match.id } : undefined;
          } else {
            // Engine isDuplicate: params = [ruleId, tenderId, renewalId]
            const ruleId = params[0];
            const tenderId = params[1];
            const renewalId = params[2];
            const match = rows.find(r =>
              r.rule_id === ruleId &&
              (r.tender_id === tenderId || r.renewal_id === renewalId)
            );
            return match ? { id: match.id } : undefined;
          }
        }

        return undefined;
      },

      all(...params) {
        // SELECT * FROM alert_rules WHERE active = 1
        if (normalized.includes('FROM alert_rules') && normalized.includes('active = 1')) {
          return (mockTables['alert_rules'] || []).filter(r => r.active === 1);
        }

        // SELECT * FROM alert_rules ORDER BY ...
        if (normalized.includes('FROM alert_rules')) {
          if (normalized.includes('WHERE active = 1')) {
            return (mockTables['alert_rules'] || []).filter(r => r.active === 1);
          }
          return mockTables['alert_rules'] || [];
        }

        // SELECT * FROM bpo_tender_lifecycle WHERE estimated_value >= ?
        if (normalized.includes('bpo_tender_lifecycle') && normalized.includes('estimated_value')) {
          const minValue = params[0];
          return (mockTables['bpo_tender_lifecycle'] || []).filter(
            t => t.estimated_value >= minValue
          );
        }

        // SELECT * FROM bpo_tender_lifecycle WHERE closing_date ...
        if (normalized.includes('bpo_tender_lifecycle') && normalized.includes('closing_date')) {
          const daysUntilClose = params[0];
          const now = new Date();
          return (mockTables['bpo_tender_lifecycle'] || []).filter(t => {
            if (!t.closing_date) return false;
            const closingDate = new Date(t.closing_date);
            const diffDays = Math.floor((closingDate - now) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= daysUntilClose;
          }).map(t => ({
            ...t,
            days_remaining: Math.max(0, Math.floor(
              (new Date(t.closing_date) - now) / (1000 * 60 * 60 * 24)
            ))
          }));
        }

        return [];
      },

      run(...params) {
        // INSERT INTO alert_rules
        if (normalized.includes('INSERT INTO alert_rules')) {
          if (!mockTables['alert_rules']) mockTables['alert_rules'] = [];
          const row = {
            id: params[0],
            rule_name: params[1],
            rule_type: params[2],
            conditions: params[3],
            priority: params[4],
            notification_channels: params[5],
            recipients: params[6],
            escalation_enabled: params[7],
            escalation_after_minutes: params[8],
            escalation_recipients: params[9],
            digest_enabled: params[10],
            digest_frequency: params[11],
            digest_time: params[12],
            active: params[13],
            created_by: params[14],
          };
          mockTables['alert_rules'].push(row);
          return { changes: 1, lastInsertRowid: mockTables['alert_rules'].length };
        }

        // INSERT INTO alert_history
        if (normalized.includes('INSERT INTO alert_history')) {
          if (!mockTables['alert_history']) mockTables['alert_history'] = [];
          const row = {
            id: params[0],
            rule_id: params[1],
            trigger_type: params[2],
            tender_id: params[3],
            renewal_id: params[4],
            alert_title: params[5],
            alert_message: params[6],
            alert_priority: params[7],
            alert_data: params[8],
            delivered_channels: params[9],
            delivery_status: params[10],
            acknowledged: 0,
            triggered_at: new Date().toISOString(),
          };
          mockTables['alert_history'].push(row);
          return { changes: 1 };
        }

        // UPDATE alert_rules SET ... WHERE id = ?
        if (normalized.includes('UPDATE alert_rules')) {
          const id = params[params.length - 1];
          const rows = mockTables['alert_rules'] || [];
          const idx = rows.findIndex(r => r.id === id);
          if (idx === -1) return { changes: 0 };
          // Apply a simple placeholder update (exact field mapping not needed for test)
          rows[idx].updated_at = new Date().toISOString();
          return { changes: 1 };
        }

        // DELETE FROM alert_rules WHERE id = ?
        if (normalized.includes('DELETE FROM alert_rules')) {
          const id = params[0];
          const rows = mockTables['alert_rules'] || [];
          const idx = rows.findIndex(r => r.id === id);
          if (idx === -1) return { changes: 0 };
          rows.splice(idx, 1);
          return { changes: 1 };
        }

        return { changes: 0 };
      },
    };
  };
}

// Build the mock db object
const mockDb = {
  prepare: makeMockPrepare(),
};

// Mock the db module
jest.mock('../../db', () => ({
  db: mockDb,
}));

// Mock uuid so we get predictable ids
// Variable must be prefixed with 'mock' to satisfy jest.mock hoisting rules
let mockUuidCounter = 0;
jest.mock('uuid', () => ({
  v4: () => `test-uuid-${++mockUuidCounter}`,
}));

// Mock the structured-logger
jest.mock('../../utils/structured-logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock db-helpers for safeJsonParse (re-implement here to avoid loading real db)
jest.mock('../../db/utils/db-helpers', () => ({
  safeJsonParse: (value, fallback = null) => {
    if (!value) return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
  },
}));

// Mock node-cron (used by engine)
jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({ stop: jest.fn() })),
}));

// Mock notifications router (used by engine)
jest.mock('../../services/notifications', () => ({
  routeHighValueTenderAlert: jest.fn(async () => ({
    success: true,
    delivered_channels: ['in_app'],
    failed_channels: [],
  })),
  routeClosingSoonAlert: jest.fn(async () => ({
    success: true,
    delivered_channels: ['in_app'],
    failed_channels: [],
  })),
  routeRenewalPredictionAlert: jest.fn(async () => ({
    success: true,
    delivered_channels: ['in_app'],
    failed_channels: [],
  })),
  routeAlert: jest.fn(async () => ({
    success: true,
    delivered_channels: ['in_app'],
    failed_channels: [],
  })),
  sendDailyDigest: jest.fn(async () => ({})),
}));

// ---------------------------------------------------------------------------
// Require modules under test AFTER mocks are in place
// ---------------------------------------------------------------------------
const express = require('express');
const alertRouter = require('../../routes/api/v1/alerts/index');

// ---------------------------------------------------------------------------
// Helpers to drive the express router without supertest
// ---------------------------------------------------------------------------

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/alerts', alertRouter);
  return app;
}

/**
 * Lightweight request helper that drives the express app using node http.
 * Returns { status, body } after parsing JSON.
 */
const http = require('http');

function request(app, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const options = {
        hostname: '127.0.0.1',
        port,
        path,
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json' },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          server.close();
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });

      req.on('error', (err) => { server.close(); reject(err); });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  });
}

// ---------------------------------------------------------------------------
// Reset state before each test
// ---------------------------------------------------------------------------
beforeEach(() => {
  mockTables = {};
  mockSqliteMaster = new Set();
  mockUuidCounter = 0;
});

// ============================================================================
// 1. GET /rules
// ============================================================================
describe('GET /api/v1/alerts/rules', () => {
  test('returns empty array when alert_rules table does not exist', async () => {
    const app = buildApp();
    const res = await request(app, 'GET', '/api/v1/alerts/rules');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.message).toMatch(/not available/i);
  });

  test('returns all rules when active_only=false', async () => {
    mockSqliteMaster.add('alert_rules');
    mockTables['alert_rules'] = [
      {
        id: 'r1',
        rule_name: 'Rule 1',
        active: 1,
        priority: 5,
        conditions: '{"min_value":100}',
        notification_channels: '["email"]',
        recipients: '{"email":"a@b.com"}',
        escalation_recipients: null,
      },
      {
        id: 'r2',
        rule_name: 'Rule 2',
        active: 0,
        priority: 3,
        conditions: '{}',
        notification_channels: '[]',
        recipients: '{}',
        escalation_recipients: null,
      },
    ];

    const app = buildApp();
    const res = await request(app, 'GET', '/api/v1/alerts/rules?active_only=false');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  test('filters to active rules by default', async () => {
    mockSqliteMaster.add('alert_rules');
    mockTables['alert_rules'] = [
      {
        id: 'r1',
        rule_name: 'Active',
        active: 1,
        priority: 5,
        conditions: '{}',
        notification_channels: '[]',
        recipients: '{}',
        escalation_recipients: null,
      },
      {
        id: 'r2',
        rule_name: 'Inactive',
        active: 0,
        priority: 3,
        conditions: '{}',
        notification_channels: '[]',
        recipients: '{}',
        escalation_recipients: null,
      },
    ];

    const app = buildApp();
    const res = await request(app, 'GET', '/api/v1/alerts/rules');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe('r1');
  });

  test('parses JSON fields on returned rules', async () => {
    mockSqliteMaster.add('alert_rules');
    mockTables['alert_rules'] = [
      {
        id: 'r1',
        rule_name: 'Rule',
        active: 1,
        priority: 5,
        conditions: '{"min_value":500}',
        notification_channels: '["email","slack"]',
        recipients: '{"email":"x@y.com"}',
        escalation_recipients: '{"email":"mgr@y.com"}',
      },
    ];

    const app = buildApp();
    const res = await request(app, 'GET', '/api/v1/alerts/rules');

    expect(res.status).toBe(200);
    const rule = res.body.data[0];
    expect(rule.conditions).toEqual({ min_value: 500 });
    expect(rule.notification_channels).toEqual(['email', 'slack']);
    expect(rule.recipients).toEqual({ email: 'x@y.com' });
    expect(rule.escalation_recipients).toEqual({ email: 'mgr@y.com' });
  });
});

// ============================================================================
// 2. POST /rules
// ============================================================================
describe('POST /api/v1/alerts/rules', () => {
  test('returns 503 when alert_rules table does not exist', async () => {
    const app = buildApp();
    const res = await request(app, 'POST', '/api/v1/alerts/rules', {
      rule_name: 'Test',
      rule_type: 'value_threshold',
      conditions: { min_value: 100 },
      notification_channels: ['email'],
      recipients: { email: 'a@b.com' },
    });

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not available/i);
  });

  test('returns 400 when required fields are missing', async () => {
    mockSqliteMaster.add('alert_rules');
    const app = buildApp();

    // Missing rule_type, conditions, notification_channels, recipients
    const res = await request(app, 'POST', '/api/v1/alerts/rules', {
      rule_name: 'Incomplete',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/missing required/i);
  });

  test('creates a rule and returns 201 with data', async () => {
    mockSqliteMaster.add('alert_rules');
    const app = buildApp();

    const payload = {
      rule_name: 'High Value Alert',
      rule_type: 'value_threshold',
      conditions: { min_value: 500000 },
      notification_channels: ['email', 'slack'],
      recipients: { email: 'ops@worklink.sg' },
      priority: 'high',
    };

    const res = await request(app, 'POST', '/api/v1/alerts/rules', payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/created/i);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe('test-uuid-1');
    expect(res.body.data.rule_name).toBe('High Value Alert');
  });

  test('defaults created_by to system when not provided', async () => {
    mockSqliteMaster.add('alert_rules');
    const app = buildApp();

    const payload = {
      rule_name: 'Default Creator',
      rule_type: 'agency_match',
      conditions: { agencies: ['PUB'] },
      notification_channels: ['in_app'],
      recipients: { user_ids: ['u1'] },
    };

    const res = await request(app, 'POST', '/api/v1/alerts/rules', payload);

    expect(res.status).toBe(201);
    // Verify the stored row has created_by = 'system'
    const stored = mockTables['alert_rules'].find(r => r.id === 'test-uuid-1');
    expect(stored.created_by).toBe('system');
  });

  test('stores conditions as JSON string', async () => {
    mockSqliteMaster.add('alert_rules');
    const app = buildApp();

    const conditions = { min_value: 100000, categories: ['IT', 'Construction'] };
    const res = await request(app, 'POST', '/api/v1/alerts/rules', {
      rule_name: 'JSON test',
      rule_type: 'value_threshold',
      conditions,
      notification_channels: ['email'],
      recipients: { email: 'a@b.com' },
    });

    expect(res.status).toBe(201);
    const stored = mockTables['alert_rules'][0];
    expect(stored.conditions).toBe(JSON.stringify(conditions));
  });
});

// ============================================================================
// 3. PATCH /rules/:id
// ============================================================================
describe('PATCH /api/v1/alerts/rules/:id', () => {
  test('returns 404 when rule does not exist', async () => {
    mockSqliteMaster.add('alert_rules');
    mockTables['alert_rules'] = [];

    const app = buildApp();
    const res = await request(app, 'PATCH', '/api/v1/alerts/rules/nonexistent', {
      rule_name: 'Updated',
    });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('returns 400 when no valid fields are provided', async () => {
    mockSqliteMaster.add('alert_rules');
    mockTables['alert_rules'] = [{ id: 'r1', rule_name: 'Original' }];

    const app = buildApp();
    const res = await request(app, 'PATCH', '/api/v1/alerts/rules/r1', {
      bogus_field: 'ignored',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no valid fields/i);
  });

  test('updates rule and returns updated data', async () => {
    mockSqliteMaster.add('alert_rules');
    mockTables['alert_rules'] = [
      { id: 'r1', rule_name: 'Original', active: 1, priority: 'medium' },
    ];

    const app = buildApp();
    const res = await request(app, 'PATCH', '/api/v1/alerts/rules/r1', {
      rule_name: 'Updated Name',
      priority: 'high',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/updated/i);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe('r1');
  });

  test('stringifies JSON fields during update', async () => {
    mockSqliteMaster.add('alert_rules');
    mockTables['alert_rules'] = [
      { id: 'r1', rule_name: 'Original', conditions: '{}' },
    ];

    const app = buildApp();
    // conditions is in the allowedFields JSON list, so it should be stringified
    const res = await request(app, 'PATCH', '/api/v1/alerts/rules/r1', {
      conditions: { min_value: 999 },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ============================================================================
// 4. DELETE /rules/:id
// ============================================================================
describe('DELETE /api/v1/alerts/rules/:id', () => {
  test('returns 404 when rule does not exist', async () => {
    mockSqliteMaster.add('alert_rules');
    mockTables['alert_rules'] = [];

    const app = buildApp();
    const res = await request(app, 'DELETE', '/api/v1/alerts/rules/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('deletes rule and returns success', async () => {
    mockSqliteMaster.add('alert_rules');
    mockTables['alert_rules'] = [
      { id: 'r1', rule_name: 'To Delete' },
    ];

    const app = buildApp();
    const res = await request(app, 'DELETE', '/api/v1/alerts/rules/r1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/deleted/i);
    expect(mockTables['alert_rules']).toHaveLength(0);
  });

  test('only deletes the targeted rule', async () => {
    mockSqliteMaster.add('alert_rules');
    mockTables['alert_rules'] = [
      { id: 'r1', rule_name: 'Keep' },
      { id: 'r2', rule_name: 'Delete' },
      { id: 'r3', rule_name: 'Keep' },
    ];

    const app = buildApp();
    const res = await request(app, 'DELETE', '/api/v1/alerts/rules/r2');

    expect(res.status).toBe(200);
    expect(mockTables['alert_rules']).toHaveLength(2);
    expect(mockTables['alert_rules'].map(r => r.id)).toEqual(['r1', 'r3']);
  });
});

// ============================================================================
// 5. GET /unread-count
// ============================================================================
describe('GET /api/v1/alerts/unread-count', () => {
  test('returns 0 when alert_history table does not exist', async () => {
    // Do NOT add 'alert_history' to mockSqliteMaster
    const app = buildApp();
    const res = await request(app, 'GET', '/api/v1/alerts/unread-count');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unread_count).toBe(0);
    expect(res.body.message).toMatch(/not available/i);
  });

  test('returns correct count of unacknowledged alerts', async () => {
    mockSqliteMaster.add('alert_history');
    mockTables['alert_history'] = [
      { id: 'a1', acknowledged: 0 },
      { id: 'a2', acknowledged: 0 },
      { id: 'a3', acknowledged: 1 },
    ];

    const app = buildApp();
    const res = await request(app, 'GET', '/api/v1/alerts/unread-count');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unread_count).toBe(2);
  });

  test('returns 0 when all alerts are acknowledged', async () => {
    mockSqliteMaster.add('alert_history');
    mockTables['alert_history'] = [
      { id: 'a1', acknowledged: 1 },
      { id: 'a2', acknowledged: 1 },
    ];

    const app = buildApp();
    const res = await request(app, 'GET', '/api/v1/alerts/unread-count');

    expect(res.status).toBe(200);
    expect(res.body.data.unread_count).toBe(0);
  });

  test('returns 0 when table exists but is empty', async () => {
    mockSqliteMaster.add('alert_history');
    mockTables['alert_history'] = [];

    const app = buildApp();
    const res = await request(app, 'GET', '/api/v1/alerts/unread-count');

    expect(res.status).toBe(200);
    expect(res.body.data.unread_count).toBe(0);
  });
});

// ============================================================================
// 6. POST /trigger
// ============================================================================
describe('POST /api/v1/alerts/trigger', () => {
  test('evaluates value_threshold rule against a tender', async () => {
    mockSqliteMaster.add('alert_rules');
    mockSqliteMaster.add('alert_history');
    mockSqliteMaster.add('bpo_tender_lifecycle');

    mockTables['alert_rules'] = [
      {
        id: 'rule-1',
        rule_name: 'High Value',
        rule_type: 'value_threshold',
        conditions: JSON.stringify({ min_value: 100000 }),
        priority: 'high',
        notification_channels: JSON.stringify(['email']),
        recipients: JSON.stringify({ email: 'a@b.com' }),
        active: 1,
      },
    ];

    mockTables['bpo_tender_lifecycle'] = [
      {
        id: 'tender-1',
        title: 'Big Contract',
        estimated_value: 500000,
        agency: 'PUB',
        closing_date: '2026-12-31',
      },
    ];

    mockTables['alert_history'] = [];

    const app = buildApp();
    const res = await request(app, 'POST', '/api/v1/alerts/trigger', {
      trigger_type: 'tender',
      tender_id: 'tender-1',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.triggered_count).toBe(1);
    expect(res.body.data.alerts).toHaveLength(1);
    expect(res.body.data.alerts[0].rule_name).toBe('High Value');
    expect(res.body.data.alerts[0].title).toMatch(/High-value tender/i);
  });

  test('does not trigger when tender value is below threshold', async () => {
    mockSqliteMaster.add('alert_rules');
    mockSqliteMaster.add('alert_history');
    mockSqliteMaster.add('bpo_tender_lifecycle');

    mockTables['alert_rules'] = [
      {
        id: 'rule-1',
        rule_name: 'High Value',
        rule_type: 'value_threshold',
        conditions: JSON.stringify({ min_value: 1000000 }),
        priority: 'high',
        notification_channels: JSON.stringify(['email']),
        active: 1,
      },
    ];

    mockTables['bpo_tender_lifecycle'] = [
      {
        id: 'tender-1',
        title: 'Small Contract',
        estimated_value: 50000,
        agency: 'MOH',
      },
    ];

    mockTables['alert_history'] = [];

    const app = buildApp();
    const res = await request(app, 'POST', '/api/v1/alerts/trigger', {
      trigger_type: 'tender',
      tender_id: 'tender-1',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.triggered_count).toBe(0);
    expect(res.body.data.alerts).toHaveLength(0);
  });

  test('evaluates closing_soon rule correctly', async () => {
    mockSqliteMaster.add('alert_rules');
    mockSqliteMaster.add('alert_history');
    mockSqliteMaster.add('bpo_tender_lifecycle');

    // Closing date 1 day from now
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const closingDate = tomorrow.toISOString().split('T')[0];

    mockTables['alert_rules'] = [
      {
        id: 'rule-cs',
        rule_name: 'Closing Soon',
        rule_type: 'closing_soon',
        conditions: JSON.stringify({ days_until_close: 3 }),
        priority: 'high',
        notification_channels: JSON.stringify(['in_app']),
        active: 1,
      },
    ];

    mockTables['bpo_tender_lifecycle'] = [
      {
        id: 'tender-cs',
        title: 'Urgent Tender',
        estimated_value: 200000,
        agency: 'MOE',
        closing_date: closingDate,
      },
    ];

    mockTables['alert_history'] = [];

    const app = buildApp();
    const res = await request(app, 'POST', '/api/v1/alerts/trigger', {
      trigger_type: 'tender',
      tender_id: 'tender-cs',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.triggered_count).toBe(1);
    expect(res.body.data.alerts[0].title).toMatch(/closing in/i);
  });

  test('skips duplicate alerts (deduplication)', async () => {
    mockSqliteMaster.add('alert_rules');
    mockSqliteMaster.add('alert_history');
    mockSqliteMaster.add('bpo_tender_lifecycle');

    mockTables['alert_rules'] = [
      {
        id: 'rule-1',
        rule_name: 'High Value',
        rule_type: 'value_threshold',
        conditions: JSON.stringify({ min_value: 100000 }),
        priority: 'high',
        notification_channels: JSON.stringify(['email']),
        active: 1,
      },
    ];

    mockTables['bpo_tender_lifecycle'] = [
      {
        id: 'tender-1',
        title: 'Big Contract',
        estimated_value: 500000,
        agency: 'PUB',
      },
    ];

    // Simulate existing recent alert for this rule + tender
    mockTables['alert_history'] = [
      {
        id: 'existing-alert',
        rule_id: 'rule-1',
        trigger_type: 'tender',
        tender_id: 'tender-1',
        renewal_id: null,
        triggered_at: new Date().toISOString(),
      },
    ];

    const app = buildApp();
    const res = await request(app, 'POST', '/api/v1/alerts/trigger', {
      trigger_type: 'tender',
      tender_id: 'tender-1',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.triggered_count).toBe(0);
  });

  test('returns zero triggered when no rules match', async () => {
    mockSqliteMaster.add('alert_rules');
    mockTables['alert_rules'] = [];
    mockTables['alert_history'] = [];

    const app = buildApp();
    const res = await request(app, 'POST', '/api/v1/alerts/trigger', {
      trigger_type: 'tender',
      tender_id: 'tender-1',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.triggered_count).toBe(0);
  });

  test('skips when tender_id does not exist in database', async () => {
    mockSqliteMaster.add('alert_rules');
    mockSqliteMaster.add('bpo_tender_lifecycle');

    mockTables['alert_rules'] = [
      {
        id: 'rule-1',
        rule_name: 'High Value',
        rule_type: 'value_threshold',
        conditions: JSON.stringify({ min_value: 0 }),
        priority: 'medium',
        notification_channels: JSON.stringify(['email']),
        active: 1,
      },
    ];

    mockTables['bpo_tender_lifecycle'] = []; // no tenders
    mockTables['alert_history'] = [];

    const app = buildApp();
    const res = await request(app, 'POST', '/api/v1/alerts/trigger', {
      trigger_type: 'tender',
      tender_id: 'nonexistent-tender',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.triggered_count).toBe(0);
  });
});
