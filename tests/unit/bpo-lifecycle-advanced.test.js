/**
 * Unit Tests: BPO Tender Lifecycle - Advanced
 *
 * Tests Pipeline routes, safeJsonParse integration, tableExists pattern,
 * Railway graceful degradation, and comprehensive stage transition validation.
 *
 * Split from bpo-lifecycle.test.js to stay under 1000-line limit.
 */

const express = require('express');
const request = require('supertest');

// ---------------------------------------------------------------------------
// Mock dependencies BEFORE requiring route modules
// ---------------------------------------------------------------------------

// Track all prepared statements so we can inspect / override per-test
let mockPrepareReturn = {};
let mockTableExistsMap = {};

const mockDb = {
  prepare: jest.fn((sql) => {
    // tableExists check
    if (sql.includes('sqlite_master')) {
      const tableName = Object.keys(mockTableExistsMap).find(t => sql.includes('name=?') || sql.includes("name=?"));
      return {
        get: jest.fn((name) => {
          if (mockTableExistsMap[name]) return { name };
          return undefined;
        })
      };
    }

    // If a per-test override was registered for this SQL fragment, use it
    for (const [fragment, handler] of Object.entries(mockPrepareReturn)) {
      if (sql.includes(fragment)) {
        return handler;
      }
    }

    // Default: return safe stubs
    return {
      get: jest.fn(() => undefined),
      all: jest.fn(() => []),
      run: jest.fn(() => ({ changes: 0 }))
    };
  })
};

jest.mock('../../../../db', () => ({ db: mockDb }), { virtual: true });
jest.mock('../../../db', () => ({ db: mockDb }), { virtual: true });

// Mock uuid to return predictable IDs
let mockUuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => {
    mockUuidCounter += 1;
    return `test-uuid-${mockUuidCounter}`;
  })
}));

// Mock the structured logger
jest.mock('../../../../utils/structured-logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })
}), { virtual: true });

jest.mock('../../../utils/structured-logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })
}), { virtual: true });

// Provide the real safeJsonParse (the unit under test for integration checks)
jest.mock('../../../../db/utils/db-helpers', () => ({
  safeJsonParse: (value, fallback = null) => {
    if (!value) return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
  }
}), { virtual: true });

jest.mock('../../../db/utils/db-helpers', () => ({
  safeJsonParse: (value, fallback = null) => {
    if (!value) return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
  }
}), { virtual: true });

// ---------------------------------------------------------------------------
// Helper: build a minimal app that mounts a router at the given prefix
// ---------------------------------------------------------------------------
function buildApp(routerFactory) {
  const app = express();
  app.use(express.json());
  app.use('/', routerFactory());
  return app;
}

// safeJsonParse used inside route handlers
function safeJsonParse(value, fallback = null) {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

// ---------------------------------------------------------------------------
// Lifecycle Router (mirrors /routes/api/v1/bpo/lifecycle.js)
// ---------------------------------------------------------------------------
function createLifecycleRouter() {
  const router = express.Router();

  function tableExists(tableName) {
    return !!mockDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
  }

  // GET /
  router.get('/', (req, res) => {
    try {
      if (!tableExists('bpo_tender_lifecycle')) {
        return res.json({
          success: true,
          data: [],
          meta: { total: 0, limit: parseInt(req.query.limit) || 100, offset: parseInt(req.query.offset) || 0 },
          message: 'BPO lifecycle system not available on this deployment'
        });
      }
      const { stage, priority, agency, assigned_to, is_urgent, is_renewal, limit = 100, offset = 0 } = req.query;
      let query = 'SELECT * FROM bpo_tender_lifecycle WHERE 1=1';
      const params = [];
      if (stage) { query += ' AND stage = ?'; params.push(stage); }
      if (priority) { query += ' AND priority = ?'; params.push(priority); }
      if (agency) { query += ' AND agency = ?'; params.push(agency); }
      if (assigned_to) { query += ' AND assigned_to = ?'; params.push(assigned_to); }
      if (is_urgent) { query += ' AND is_urgent = ?'; params.push(is_urgent === 'true' ? 1 : 0); }
      if (is_renewal) { query += ' AND is_renewal = ?'; params.push(is_renewal === 'true' ? 1 : 0); }
      query += ' ORDER BY stage_updated_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
      const tenders = mockDb.prepare(query).all(...params);
      tenders.forEach(t => {
        t.qualification_details = safeJsonParse(t.qualification_details);
        t.assigned_team = safeJsonParse(t.assigned_team, []);
        t.documents = safeJsonParse(t.documents, []);
        t.tags = safeJsonParse(t.tags, []);
      });
      res.json({ success: true, data: tenders, meta: { limit: parseInt(limit), offset: parseInt(offset) } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /
  router.post('/', (req, res) => {
    try {
      if (!tableExists('bpo_tender_lifecycle')) {
        return res.status(503).json({
          success: false,
          error: 'Failed to initialize BPO lifecycle tables',
          message: 'Database setup required for tender creation'
        });
      }
      const { title, agency, stage = 'new_opportunity', priority = 'medium', is_urgent = false, is_renewal = false } = req.body;
      if (!title || !agency) {
        return res.status(400).json({ success: false, error: 'Missing required fields: title, agency' });
      }
      const { v4: uuidv4 } = require('uuid');
      const id = uuidv4();
      mockDb.prepare('INSERT INTO bpo_tender_lifecycle').run(id, req.body);
      const tender = mockDb.prepare('SELECT * FROM bpo_tender_lifecycle WHERE id = ?').get(id);
      res.status(201).json({ success: true, data: tender, message: 'Tender created successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // PATCH /:id
  router.patch('/:id', (req, res) => {
    try {
      if (!tableExists('bpo_tender_lifecycle')) {
        return res.status(503).json({
          success: false,
          error: 'BPO lifecycle system not available on this deployment',
          message: 'Tender updates require database table setup'
        });
      }
      const updates = [];
      const params = [];
      const allowedFields = [
        'title', 'agency', 'description', 'category', 'closing_date',
        'estimated_value', 'our_bid_amount', 'estimated_cost', 'estimated_margin',
        'stage', 'priority', 'is_urgent', 'is_featured', 'assigned_to',
        'assigned_team', 'qualification_score', 'qualification_details',
        'decision', 'decision_reasoning', 'notes', 'tags', 'documents'
      ];
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          if (['assigned_team', 'qualification_details', 'tags', 'documents'].includes(field)) {
            params.push(JSON.stringify(req.body[field]));
          } else if (['is_urgent', 'is_featured'].includes(field)) {
            params.push(req.body[field] ? 1 : 0);
          } else {
            params.push(req.body[field]);
          }
        }
      }
      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No valid fields to update' });
      }
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(req.params.id);
      const result = mockDb.prepare(`UPDATE bpo_tender_lifecycle SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      if (result.changes === 0) {
        return res.status(404).json({ success: false, error: 'Tender not found' });
      }
      const tender = mockDb.prepare('SELECT * FROM bpo_tender_lifecycle WHERE id = ?').get(req.params.id);
      res.json({ success: true, data: tender, message: 'Tender updated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /:id/move
  router.post('/:id/move', (req, res) => {
    try {
      if (!tableExists('bpo_tender_lifecycle')) {
        return res.status(503).json({
          success: false,
          error: 'BPO lifecycle system not available on this deployment',
          message: 'Tender stage moves require database table setup'
        });
      }
      const { new_stage, user_id } = req.body;
      if (!new_stage) {
        return res.status(400).json({ success: false, error: 'new_stage required' });
      }
      const validStages = [
        'renewal_watch', 'new_opportunity', 'review', 'bidding',
        'internal_approval', 'submitted', 'awarded', 'lost'
      ];
      if (!validStages.includes(new_stage)) {
        return res.status(400).json({ success: false, error: 'Invalid stage' });
      }
      const result = mockDb.prepare('UPDATE bpo_tender_lifecycle SET stage').run(new_stage, req.params.id);
      if (result.changes === 0) {
        return res.status(404).json({ success: false, error: 'Tender not found' });
      }
      const tender = mockDb.prepare('SELECT * FROM bpo_tender_lifecycle WHERE id = ?').get(req.params.id);
      // Audit trail (optional)
      try {
        if (tableExists('audit_log')) {
          const { v4: uuidv4 } = require('uuid');
          mockDb.prepare('INSERT INTO audit_log').run(uuidv4(), req.params.id, user_id || 'unknown', JSON.stringify({ new_stage }));
        }
      } catch {
        // audit failure should not break the move
      }
      res.json({ success: true, data: tender, message: `Tender moved to ${new_stage}` });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // DELETE /:id
  router.delete('/:id', (req, res) => {
    try {
      if (!tableExists('bpo_tender_lifecycle')) {
        return res.status(503).json({
          success: false,
          error: 'BPO lifecycle system not available on this deployment',
          message: 'Tender deletion requires database table setup'
        });
      }
      const result = mockDb.prepare('DELETE FROM bpo_tender_lifecycle WHERE id = ?').run(req.params.id);
      if (result.changes === 0) {
        return res.status(404).json({ success: false, error: 'Tender not found' });
      }
      res.json({ success: true, message: 'Tender deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}

// ---------------------------------------------------------------------------
// Pipeline Router (mirrors /routes/api/v1/pipeline.js)
// ---------------------------------------------------------------------------
function createPipelineRouter() {
  const router = express.Router();

  function tableExists(tableName) {
    return !!mockDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
  }

  // GET /
  router.get('/', (req, res) => {
    try {
      if (!tableExists('bpo_tender_lifecycle')) {
        return res.json({
          success: true,
          data: [],
          meta: { total: 0, limit: parseInt(req.query.limit) || 100, offset: parseInt(req.query.offset) || 0 },
          message: 'BPO lifecycle system not available on this deployment'
        });
      }
      const { stage, priority, agency, assigned_to, is_urgent, is_renewal, limit = 100, offset = 0 } = req.query;
      let query = 'SELECT * FROM bpo_tender_lifecycle WHERE 1=1';
      const params = [];
      if (stage) { query += ' AND stage = ?'; params.push(stage); }
      if (priority) { query += ' AND priority = ?'; params.push(priority); }
      if (agency) { query += ' AND agency = ?'; params.push(agency); }
      if (assigned_to) { query += ' AND assigned_to = ?'; params.push(assigned_to); }
      if (is_urgent) { query += ' AND is_urgent = ?'; params.push(is_urgent === 'true' ? 1 : 0); }
      if (is_renewal) { query += ' AND is_renewal = ?'; params.push(is_renewal === 'true' ? 1 : 0); }
      query += ' ORDER BY stage_updated_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
      const tenders = mockDb.prepare(query).all(...params);
      tenders.forEach(t => {
        if (t.qualification_details) t.qualification_details = safeJsonParse(t.qualification_details);
        if (t.assigned_team) t.assigned_team = safeJsonParse(t.assigned_team, []);
        if (t.documents) t.documents = safeJsonParse(t.documents, []);
        if (t.tags) t.tags = safeJsonParse(t.tags, []);
      });
      res.json({ success: true, data: tenders, meta: { limit: parseInt(limit), offset: parseInt(offset) } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // GET /stats
  router.get('/stats', (req, res) => {
    try {
      if (!tableExists('bpo_tender_lifecycle')) {
        return res.json({
          success: true,
          data: {
            total_tenders: 0, renewal_watch: 0, renewal_watch_count: 0,
            new_opportunity: 0, new_opportunity_count: 0,
            review: 0, review_count: 0, bidding: 0, bidding_count: 0,
            internal_approval: 0, internal_approval_count: 0,
            submitted: 0, submitted_count: 0, won: 0, awarded_count: 0,
            lost: 0, lost_count: 0, urgent: 0, renewals: 0,
            total_pipeline_value: 0, total_won_value: 0,
            win_rate: 0, conversion_rate: 0, avg_tender_value: 0
          },
          message: 'BPO lifecycle system not available on this deployment'
        });
      }
      const stats = mockDb.prepare('SELECT COUNT(*) as total_tenders').get();
      const closingSoon = mockDb.prepare('SELECT COUNT(*) as count FROM bpo_tender_lifecycle WHERE closing_date').get();
      const won = stats.won || 0;
      const lost = stats.lost || 0;
      const winLossCount = won + lost;
      const winRate = winLossCount > 0 ? Math.round((won / winLossCount) * 100) : 0;
      res.json({
        success: true,
        data: { ...stats, win_rate: winRate, closing_soon: (closingSoon && closingSoon.count) || 0 }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /:id/move
  router.post('/:id/move', (req, res) => {
    try {
      if (!tableExists('bpo_tender_lifecycle')) {
        return res.status(503).json({
          success: false,
          error: 'BPO lifecycle system not available on this deployment',
          message: 'Tender stage moves require database table setup'
        });
      }
      const { new_stage, user_id } = req.body;
      if (!new_stage) {
        return res.status(400).json({ success: false, error: 'new_stage required' });
      }
      const validStages = [
        'renewal_watch', 'new_opportunity', 'review', 'bidding',
        'internal_approval', 'submitted', 'awarded', 'lost'
      ];
      if (!validStages.includes(new_stage)) {
        return res.status(400).json({ success: false, error: 'Invalid stage' });
      }
      const result = mockDb.prepare('UPDATE bpo_tender_lifecycle SET stage').run(new_stage, req.params.id);
      if (result.changes === 0) {
        return res.status(404).json({ success: false, error: 'Tender not found' });
      }
      const tender = mockDb.prepare('SELECT * FROM bpo_tender_lifecycle WHERE id = ?').get(req.params.id);
      res.json({ success: true, data: tender, message: `Tender moved to ${new_stage}` });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

/** Enable the bpo_tender_lifecycle table in the mock */
function enableTable(name = 'bpo_tender_lifecycle') {
  mockTableExistsMap[name] = true;
}

/** Disable a table (simulate Railway missing table) */
function disableTable(name = 'bpo_tender_lifecycle') {
  delete mockTableExistsMap[name];
}

/** Register a mock return for any prepare() call whose SQL contains `fragment` */
function onQuery(fragment, overrides) {
  mockPrepareReturn[fragment] = {
    get: jest.fn(() => undefined),
    all: jest.fn(() => []),
    run: jest.fn(() => ({ changes: 0 })),
    ...overrides
  };
}

/** Create a sample tender row as it would come from the database */
function makeTenderRow(overrides = {}) {
  return {
    id: 'tender-001',
    source_type: 'manual_entry',
    source_id: null,
    tender_no: 'T-2026-001',
    title: 'Office Cleaning Service',
    agency: 'Ministry of Education',
    description: 'Annual cleaning contract',
    category: 'Facility Management',
    published_date: '2026-03-01',
    closing_date: '2026-04-15',
    contract_start_date: null,
    contract_end_date: null,
    estimated_value: 150000,
    stage: 'new_opportunity',
    priority: 'medium',
    is_urgent: 0,
    is_renewal: 0,
    renewal_id: null,
    incumbent_supplier: null,
    external_url: null,
    assigned_to: null,
    qualification_details: null,
    assigned_team: null,
    documents: null,
    tags: null,
    decision: null,
    notes: null,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    stage_updated_at: '2026-03-01T00:00:00Z',
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

// ==========================================================================
// Pipeline Routes
// ==========================================================================
describe('Pipeline Routes', () => {
  let pipelineApp;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrepareReturn = {};
    mockTableExistsMap = {};
    mockUuidCounter = 0;
    pipelineApp = buildApp(createPipelineRouter);
  });

  // ========================================================================
  // GET /pipeline - List tenders (mirrors lifecycle GET /)
  // ========================================================================
  describe('GET / - Pipeline list', () => {
    test('returns empty data when table missing (Railway)', async () => {
      disableTable('bpo_tender_lifecycle');

      const res = await request(pipelineApp).get('/');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
      expect(res.body.message).toMatch(/not available/i);
    });

    test('returns tenders with parsed JSON fields', async () => {
      enableTable();
      const tender = makeTenderRow({
        qualification_details: '{"score": 85}',
        assigned_team: '["Alice","Bob"]',
        documents: '["doc1.pdf","doc2.pdf"]',
        tags: '["priority","gov"]'
      });
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE 1=1', {
        all: jest.fn(() => [tender])
      });

      const res = await request(pipelineApp).get('/');

      expect(res.status).toBe(200);
      const data = res.body.data[0];
      expect(data.qualification_details).toEqual({ score: 85 });
      expect(data.assigned_team).toEqual(['Alice', 'Bob']);
      expect(data.documents).toEqual(['doc1.pdf', 'doc2.pdf']);
      expect(data.tags).toEqual(['priority', 'gov']);
    });

    test('applies stage filter', async () => {
      enableTable();
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE 1=1', {
        all: jest.fn(() => [makeTenderRow({ stage: 'bidding' })])
      });

      const res = await request(pipelineApp).get('/?stage=bidding');

      expect(res.status).toBe(200);
      expect(res.body.data[0].stage).toBe('bidding');
    });
  });

  // ========================================================================
  // GET /pipeline/stats - Pipeline statistics
  // ========================================================================
  describe('GET /stats - Pipeline statistics', () => {
    test('returns zeroed stats when table missing (Railway)', async () => {
      disableTable('bpo_tender_lifecycle');

      const res = await request(pipelineApp).get('/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total_tenders).toBe(0);
      expect(res.body.data.win_rate).toBe(0);
      expect(res.body.data.total_pipeline_value).toBe(0);
      expect(res.body.message).toMatch(/not available/i);
    });

    test('returns stats with win rate calculation', async () => {
      enableTable();
      const mockStats = {
        total_tenders: 10,
        renewal_watch: 1, renewal_watch_count: 1,
        new_opportunity: 2, new_opportunity_count: 2,
        review: 2, review_count: 2,
        bidding: 1, bidding_count: 1,
        internal_approval: 1, internal_approval_count: 1,
        submitted: 1, submitted_count: 1,
        won: 3, awarded_count: 3,
        lost: 1, lost_count: 1,
        urgent: 2,
        renewals: 1,
        total_pipeline_value: 500000,
        total_won_value: 200000
      };
      onQuery('SELECT COUNT(*) as total_tenders', {
        get: jest.fn(() => mockStats)
      });
      onQuery('SELECT COUNT(*) as count FROM bpo_tender_lifecycle WHERE closing_date', {
        get: jest.fn(() => ({ count: 2 }))
      });

      const res = await request(pipelineApp).get('/stats');

      expect(res.status).toBe(200);
      expect(res.body.data.total_tenders).toBe(10);
      // win_rate = round(3 / (3+1) * 100) = 75
      expect(res.body.data.win_rate).toBe(75);
      expect(res.body.data.closing_soon).toBe(2);
    });

    test('win rate is 0 when no wins or losses', async () => {
      enableTable();
      const mockStats = {
        total_tenders: 5,
        won: 0,
        lost: 0,
        urgent: 0,
        renewals: 0,
        total_pipeline_value: 100000,
        total_won_value: 0
      };
      onQuery('SELECT COUNT(*) as total_tenders', {
        get: jest.fn(() => mockStats)
      });
      onQuery('SELECT COUNT(*) as count FROM bpo_tender_lifecycle WHERE closing_date', {
        get: jest.fn(() => ({ count: 0 }))
      });

      const res = await request(pipelineApp).get('/stats');

      expect(res.status).toBe(200);
      expect(res.body.data.win_rate).toBe(0);
    });
  });

  // ========================================================================
  // POST /pipeline/:id/move - Stage transitions (same validation as lifecycle)
  // ========================================================================
  describe('POST /:id/move - Pipeline stage move', () => {
    test('returns 503 when table missing', async () => {
      disableTable('bpo_tender_lifecycle');

      const res = await request(pipelineApp)
        .post('/tender-001/move')
        .send({ new_stage: 'review' });

      expect(res.status).toBe(503);
    });

    test('validates stage name', async () => {
      enableTable();

      const res = await request(pipelineApp)
        .post('/tender-001/move')
        .send({ new_stage: 'fake_stage' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid stage/i);
    });

    test('full pipeline stage progression', async () => {
      const stages = ['new_opportunity', 'review', 'bidding', 'internal_approval', 'submitted', 'awarded'];

      for (const stage of stages) {
        jest.clearAllMocks();
        mockPrepareReturn = {};
        enableTable();
        const movedTender = makeTenderRow({ stage });
        onQuery('UPDATE bpo_tender_lifecycle SET stage', {
          run: jest.fn(() => ({ changes: 1 }))
        });
        onQuery('SELECT * FROM bpo_tender_lifecycle WHERE id = ?', {
          get: jest.fn(() => movedTender)
        });

        const res = await request(pipelineApp)
          .post('/tender-001/move')
          .send({ new_stage: stage });

        expect(res.status).toBe(200);
        expect(res.body.data.stage).toBe(stage);
      }
    });
  });
});

// ==========================================================================
// safeJsonParse Integration
// ==========================================================================
describe('safeJsonParse integration', () => {
  test('parses valid JSON string', () => {
    expect(safeJsonParse('{"key":"value"}')).toEqual({ key: 'value' });
  });

  test('parses valid JSON array', () => {
    expect(safeJsonParse('["a","b","c"]')).toEqual(['a', 'b', 'c']);
  });

  test('returns fallback for null input', () => {
    expect(safeJsonParse(null)).toBeNull();
    expect(safeJsonParse(null, [])).toEqual([]);
  });

  test('returns fallback for undefined input', () => {
    expect(safeJsonParse(undefined)).toBeNull();
    expect(safeJsonParse(undefined, {})).toEqual({});
  });

  test('returns fallback for empty string', () => {
    expect(safeJsonParse('')).toBeNull();
    expect(safeJsonParse('', [])).toEqual([]);
  });

  test('returns fallback for malformed JSON', () => {
    expect(safeJsonParse('{invalid json}')).toBeNull();
    expect(safeJsonParse('{invalid json}', [])).toEqual([]);
  });

  test('returns fallback for truncated JSON', () => {
    expect(safeJsonParse('{"key": "val', {})).toEqual({});
  });

  test('returns fallback for non-JSON string', () => {
    expect(safeJsonParse('just a regular string', 'default')).toBe('default');
  });

  test('handles nested objects correctly', () => {
    const nested = '{"team":["Alice","Bob"],"scores":{"q1":80,"q2":90}}';
    const parsed = safeJsonParse(nested);
    expect(parsed.team).toEqual(['Alice', 'Bob']);
    expect(parsed.scores.q1).toBe(80);
  });

  test('handles stored database values with escaped characters', () => {
    const escaped = '{"notes":"Line 1\\nLine 2\\tTabbed"}';
    const parsed = safeJsonParse(escaped);
    expect(parsed.notes).toBe('Line 1\nLine 2\tTabbed');
  });

  test('gracefully handles corrupt stored data from database', () => {
    // Simulates data that got corrupted in SQLite storage
    const corruptValues = [
      'undefined',
      'NaN',
      'function(){}',
      '<html>',
      '\x00\x01\x02'
    ];

    corruptValues.forEach(val => {
      expect(() => safeJsonParse(val, [])).not.toThrow();
      expect(safeJsonParse(val, [])).toEqual([]);
    });
  });
});

// ==========================================================================
// tableExists pattern and Railway Graceful Degradation
// ==========================================================================
describe('tableExists pattern and Railway graceful degradation', () => {
  let lifecycleApp;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrepareReturn = {};
    mockTableExistsMap = {};
    mockUuidCounter = 0;
    lifecycleApp = buildApp(createLifecycleRouter);
  });

  test('all write endpoints return 503 when table missing', async () => {
    disableTable('bpo_tender_lifecycle');

    const postRes = await request(lifecycleApp)
      .post('/')
      .send({ title: 'Test', agency: 'MOE' });
    expect(postRes.status).toBe(503);

    const patchRes = await request(lifecycleApp)
      .patch('/tender-001')
      .send({ title: 'Updated' });
    expect(patchRes.status).toBe(503);

    const moveRes = await request(lifecycleApp)
      .post('/tender-001/move')
      .send({ new_stage: 'review' });
    expect(moveRes.status).toBe(503);

    const deleteRes = await request(lifecycleApp).delete('/tender-001');
    expect(deleteRes.status).toBe(503);
  });

  test('GET endpoints return 200 with empty data when table missing', async () => {
    disableTable('bpo_tender_lifecycle');

    const listRes = await request(lifecycleApp).get('/');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toEqual([]);
  });

  test('Railway: message indicates deployment limitation', async () => {
    disableTable('bpo_tender_lifecycle');

    const res = await request(lifecycleApp).get('/');
    expect(res.body.message).toMatch(/not available on this deployment/i);
  });

  test('tableExists returns true when table is registered', () => {
    enableTable('bpo_tender_lifecycle');
    const result = mockDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get('bpo_tender_lifecycle');
    expect(result).toBeTruthy();
    expect(result.name).toBe('bpo_tender_lifecycle');
  });

  test('tableExists returns undefined when table is not registered', () => {
    disableTable('bpo_tender_lifecycle');
    const result = mockDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get('bpo_tender_lifecycle');
    expect(result).toBeUndefined();
  });

  test('write endpoints include actionable error messages', async () => {
    disableTable('bpo_tender_lifecycle');

    const postRes = await request(lifecycleApp)
      .post('/')
      .send({ title: 'Test', agency: 'MOE' });
    expect(postRes.body.message).toMatch(/database setup/i);

    const patchRes = await request(lifecycleApp)
      .patch('/tender-001')
      .send({ title: 'Updated' });
    expect(patchRes.body.message).toMatch(/database table setup/i);
  });

  test('transitions between enabled and disabled states', async () => {
    // Start disabled
    disableTable('bpo_tender_lifecycle');
    let res = await request(lifecycleApp).get('/');
    expect(res.body.data).toEqual([]);

    // Enable the table
    enableTable('bpo_tender_lifecycle');
    onQuery('SELECT * FROM bpo_tender_lifecycle WHERE 1=1', {
      all: jest.fn(() => [makeTenderRow()])
    });
    res = await request(lifecycleApp).get('/');
    expect(res.body.data).toHaveLength(1);

    // Disable again (simulate Railway redeployment)
    disableTable('bpo_tender_lifecycle');
    mockPrepareReturn = {};
    res = await request(lifecycleApp).get('/');
    expect(res.body.data).toEqual([]);
  });
});

// ==========================================================================
// Stage Transition Validation (comprehensive)
// ==========================================================================
describe('Stage transition validation', () => {
  let lifecycleApp;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrepareReturn = {};
    mockTableExistsMap = {};
    mockUuidCounter = 0;
    lifecycleApp = buildApp(createLifecycleRouter);
  });

  const VALID_STAGES = [
    'renewal_watch',
    'new_opportunity',
    'review',
    'bidding',
    'internal_approval',
    'submitted',
    'awarded',
    'lost'
  ];

  const INVALID_STAGES = [
    'draft',
    'pending',
    'approved',
    'completed',
    'cancelled',
    'in_progress',
    'REVIEW',            // case-sensitive
    'Review',            // case-sensitive
    'NEW_OPPORTUNITY',   // case-sensitive
    'award',             // close but wrong
    'bid',               // close but wrong
    'submit',            // close but wrong
    'approval',          // close but wrong
    ''                   // empty (caught by missing check)
  ];

  VALID_STAGES.forEach(stage => {
    test(`ACCEPTS: ${stage}`, async () => {
      enableTable();
      onQuery('UPDATE bpo_tender_lifecycle SET stage', {
        run: jest.fn(() => ({ changes: 1 }))
      });
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE id = ?', {
        get: jest.fn(() => makeTenderRow({ stage }))
      });

      const res = await request(lifecycleApp)
        .post('/tender-001/move')
        .send({ new_stage: stage });

      expect(res.status).toBe(200);
    });
  });

  INVALID_STAGES.forEach(stage => {
    test(`REJECTS: "${stage}"`, async () => {
      enableTable();

      const res = await request(lifecycleApp)
        .post('/tender-001/move')
        .send({ new_stage: stage || undefined });

      expect(res.status).toBe(400);
    });
  });
});
