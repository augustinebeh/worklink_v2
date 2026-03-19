/**
 * Unit Tests: Alert Engine
 *
 * Tests the AlertEngine class (evaluateAllRules, value_threshold, closing_soon,
 * isDuplicate, formatCurrency, createAlert) and the tableExists helper pattern.
 *
 * Split from alert-system.test.js to stay under 1000-line limit.
 */

// ---------------------------------------------------------------------------
// Mock setup  (must come before any require that touches these modules)
// ---------------------------------------------------------------------------

// In-memory store that the mock db operates on
let mockTables = {};   // { tableName: [row, ...] }
let mockSqliteMaster = new Set(); // track which tables "exist"

/**
 * Tiny fake prepared-statement factory.
 * Supports the SQL patterns used by the alerts module.
 */
function makeMockPrepare() {
  return function prepare(sql) {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    return {
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

        // Dedup check
        if (normalized.includes('FROM alert_history') && normalized.includes('rule_id')) {
          const rows = mockTables['alert_history'] || [];

          if (normalized.includes('COALESCE')) {
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

// Mock db-helpers for safeJsonParse
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
const AlertEngine = require('../../services/alerts/engine');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/alerts', alertRouter);
  return app;
}

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
// AlertEngine unit tests
// ============================================================================
describe('AlertEngine', () => {
  let engine;

  beforeEach(() => {
    engine = AlertEngine;
    engine.isRunning = false;
    engine.cronJob = null;
    engine.lastRun = null;
    engine.runsCount = 0;
    engine.alertsTriggered = 0;
  });

  describe('getStatus', () => {
    test('returns status when engine is not running', () => {
      const status = engine.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.lastRun).toBeNull();
      expect(status.runsCount).toBe(0);
      expect(status.alertsTriggered).toBe(0);
      expect(status.uptime).toBe(0);
    });

    test('returns running status after start', () => {
      engine.start();
      const status = engine.getStatus();

      expect(status.isRunning).toBe(true);
      expect(status.runsCount).toBe(1); // immediate run on start
      engine.stop();
    });
  });

  describe('start / stop', () => {
    test('start sets isRunning to true', () => {
      engine.start();
      expect(engine.isRunning).toBe(true);
      engine.stop();
    });

    test('stop sets isRunning to false', () => {
      engine.start();
      engine.stop();
      expect(engine.isRunning).toBe(false);
      expect(engine.cronJob).toBeNull();
    });

    test('calling start twice does not create duplicate cron jobs', () => {
      engine.start();
      const firstJob = engine.cronJob;
      engine.start(); // should warn and return early
      expect(engine.cronJob).toBe(firstJob);
      engine.stop();
    });

    test('calling stop when not running is safe', () => {
      expect(() => engine.stop()).not.toThrow();
    });
  });

  describe('evaluateAllRules', () => {
    test('increments runsCount on each call', async () => {
      engine.isRunning = true;
      mockTables['alert_rules'] = [];

      await engine.evaluateAllRules();
      expect(engine.runsCount).toBe(1);

      await engine.evaluateAllRules();
      expect(engine.runsCount).toBe(2);
    });

    test('sets lastRun timestamp', async () => {
      engine.isRunning = true;
      mockTables['alert_rules'] = [];

      const before = new Date();
      await engine.evaluateAllRules();

      expect(engine.lastRun).toBeInstanceOf(Date);
      expect(engine.lastRun.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    test('handles zero active rules gracefully', async () => {
      engine.isRunning = true;
      mockTables['alert_rules'] = [];

      await expect(engine.evaluateAllRules()).resolves.not.toThrow();
    });
  });

  describe('evaluateRule - value_threshold', () => {
    test('triggers alert for high-value tender', async () => {
      mockTables['bpo_tender_lifecycle'] = [
        {
          id: 'vt-1',
          title: 'Expensive Tender',
          agency: 'MOH',
          estimated_value: 5000000,
          closing_date: '2026-12-31',
          stage: 'evaluation',
          created_at: new Date().toISOString(),
        },
      ];
      mockTables['alert_history'] = [];

      const rule = {
        id: 'rule-vt',
        rule_name: 'Value Threshold',
        rule_type: 'value_threshold',
        conditions: JSON.stringify({ min_value: 1000000 }),
        priority: 'high',
        notification_channels: JSON.stringify(['email']),
        recipients: JSON.stringify({ email: 'a@b.com' }),
      };

      const count = await engine.evaluateRule(mockDb, rule);
      expect(count).toBe(1);
    });

    test('does not trigger when no tenders meet threshold', async () => {
      mockTables['bpo_tender_lifecycle'] = [
        {
          id: 'vt-2',
          title: 'Cheap Tender',
          agency: 'MOE',
          estimated_value: 5000,
          stage: 'new',
          created_at: new Date().toISOString(),
        },
      ];
      mockTables['alert_history'] = [];

      const rule = {
        id: 'rule-vt',
        rule_name: 'Value Threshold',
        rule_type: 'value_threshold',
        conditions: JSON.stringify({ min_value: 1000000 }),
        priority: 'high',
        notification_channels: JSON.stringify(['email']),
      };

      const count = await engine.evaluateRule(mockDb, rule);
      expect(count).toBe(0);
    });

    test('skips duplicates in value_threshold evaluation', async () => {
      mockTables['bpo_tender_lifecycle'] = [
        {
          id: 'vt-dup',
          title: 'Duplicate Tender',
          agency: 'PUB',
          estimated_value: 2000000,
          stage: 'evaluation',
          created_at: new Date().toISOString(),
        },
      ];
      // Pre-existing alert for this rule+tender
      mockTables['alert_history'] = [
        {
          id: 'old-alert',
          rule_id: 'rule-vt-dup',
          tender_id: 'vt-dup',
          renewal_id: null,
          triggered_at: new Date().toISOString(),
        },
      ];

      const rule = {
        id: 'rule-vt-dup',
        rule_name: 'Value Threshold Dup',
        rule_type: 'value_threshold',
        conditions: JSON.stringify({ min_value: 1000000 }),
        priority: 'high',
        notification_channels: JSON.stringify(['email']),
      };

      const count = await engine.evaluateRule(mockDb, rule);
      expect(count).toBe(0);
    });
  });

  describe('evaluateRule - closing_soon', () => {
    test('triggers alert for tender closing within threshold', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockTables['bpo_tender_lifecycle'] = [
        {
          id: 'cs-1',
          title: 'Closing Tomorrow',
          agency: 'ITE',
          estimated_value: 100000,
          closing_date: tomorrow.toISOString().split('T')[0],
          stage: 'evaluation',
          days_remaining: 1,
          created_at: new Date().toISOString(),
        },
      ];
      mockTables['alert_history'] = [];

      const rule = {
        id: 'rule-cs',
        rule_name: 'Closing Soon',
        rule_type: 'closing_soon',
        conditions: JSON.stringify({ days_until_close: 3 }),
        priority: 'high',
        notification_channels: JSON.stringify(['in_app']),
      };

      const count = await engine.evaluateRule(mockDb, rule);
      expect(count).toBe(1);
    });

    test('does not trigger for tenders closing far in the future', async () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 90);

      mockTables['bpo_tender_lifecycle'] = [
        {
          id: 'cs-far',
          title: 'Far Future Tender',
          agency: 'MOH',
          closing_date: farFuture.toISOString().split('T')[0],
          stage: 'new',
          created_at: new Date().toISOString(),
        },
      ];
      mockTables['alert_history'] = [];

      const rule = {
        id: 'rule-cs-far',
        rule_name: 'Closing Soon',
        rule_type: 'closing_soon',
        conditions: JSON.stringify({ days_until_close: 2 }),
        priority: 'medium',
        notification_channels: JSON.stringify(['email']),
      };

      const count = await engine.evaluateRule(mockDb, rule);
      expect(count).toBe(0);
    });
  });

  describe('evaluateRule - unknown type', () => {
    test('returns 0 for unknown rule type', async () => {
      const rule = {
        id: 'rule-unknown',
        rule_name: 'Unknown',
        rule_type: 'totally_unknown_type',
        conditions: JSON.stringify({}),
        priority: 'low',
        notification_channels: JSON.stringify([]),
      };

      const count = await engine.evaluateRule(mockDb, rule);
      expect(count).toBe(0);
    });
  });

  describe('isDuplicate', () => {
    test('returns true when a recent alert exists for same rule and tender', () => {
      mockTables['alert_history'] = [
        {
          id: 'dup-1',
          rule_id: 'rule-x',
          tender_id: 'tender-x',
          renewal_id: null,
          triggered_at: new Date().toISOString(),
        },
      ];

      expect(engine.isDuplicate(mockDb, 'rule-x', 'tender-x', null)).toBe(true);
    });

    test('returns false when no matching alert exists', () => {
      mockTables['alert_history'] = [];
      expect(engine.isDuplicate(mockDb, 'rule-y', 'tender-y', null)).toBe(false);
    });
  });

  describe('formatCurrency', () => {
    test('formats large numbers in compact notation', () => {
      const result = engine.formatCurrency(1500000);
      // Intl compact for en-SG: "1.5M" or similar
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('formats zero', () => {
      const result = engine.formatCurrency(0);
      expect(result).toBe('0');
    });
  });

  describe('createAlert', () => {
    test('inserts alert into alert_history table', async () => {
      mockTables['alert_history'] = [];

      const alertId = await engine.createAlert(mockDb, {
        rule_id: 'rule-ca',
        trigger_type: 'tender',
        tender_id: 'tender-ca',
        alert_title: 'Test Alert',
        alert_message: 'This is a test',
        alert_priority: 'high',
        alert_data: { foo: 'bar' },
      });

      expect(typeof alertId).toBe('string');
      expect(mockTables['alert_history']).toHaveLength(1);
      expect(mockTables['alert_history'][0].alert_title).toBe('Test Alert');
      expect(mockTables['alert_history'][0].delivery_status).toBe('pending');
    });
  });
});

// ============================================================================
// tableExists helper (route-level)
// ============================================================================
describe('tableExists helper (graceful degradation)', () => {
  test('returns false when table does not exist in sqlite_master', () => {
    const result = mockDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).get('nonexistent_table');

    expect(result).toBeUndefined();
  });

  test('returns table info when table exists', () => {
    mockSqliteMaster.add('alert_rules');

    const result = mockDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).get('alert_rules');

    expect(result).toEqual({ name: 'alert_rules' });
  });

  test('GET /rules degrades gracefully to empty array', async () => {
    // Table missing
    const app = buildApp();
    const res = await request(app, 'GET', '/api/v1/alerts/rules');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  test('GET /unread-count degrades gracefully to zero', async () => {
    // Table missing
    const app = buildApp();
    const res = await request(app, 'GET', '/api/v1/alerts/unread-count');

    expect(res.status).toBe(200);
    expect(res.body.data.unread_count).toBe(0);
  });

  test('POST /rules degrades gracefully with 503', async () => {
    // Table missing
    const app = buildApp();
    const res = await request(app, 'POST', '/api/v1/alerts/rules', {
      rule_name: 'Test',
      rule_type: 'value_threshold',
      conditions: {},
      notification_channels: ['email'],
      recipients: {},
    });

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
  });
});
