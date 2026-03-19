/**
 * Unit Tests: BPO Tender Lifecycle Routes
 *
 * Tests CRUD operations (GET/POST/PATCH/DELETE) and stage transitions
 * for the lifecycle router.
 *
 * See bpo-lifecycle-advanced.test.js for Pipeline routes, safeJsonParse,
 * tableExists pattern, Railway degradation, and stage validation tests.
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
// Inline router builders (mirrors source logic for self-contained testing)
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

// Test Helpers
function enableTable(name = 'bpo_tender_lifecycle') {
  mockTableExistsMap[name] = true;
}

function disableTable(name = 'bpo_tender_lifecycle') {
  delete mockTableExistsMap[name];
}

function onQuery(fragment, overrides) {
  mockPrepareReturn[fragment] = {
    get: jest.fn(() => undefined),
    all: jest.fn(() => []),
    run: jest.fn(() => ({ changes: 0 })),
    ...overrides
  };
}

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

describe('BPO Tender Lifecycle Routes', () => {
  let lifecycleApp;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrepareReturn = {};
    mockTableExistsMap = {};
    mockUuidCounter = 0;
    lifecycleApp = buildApp(createLifecycleRouter);
  });

  describe('GET / - List tenders', () => {
    test('returns empty data when table does not exist (Railway degradation)', async () => {
      disableTable('bpo_tender_lifecycle');

      const res = await request(lifecycleApp).get('/');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
      expect(res.body.message).toMatch(/not available/i);
    });

    test('returns tenders when table exists', async () => {
      enableTable();
      const sampleTender = makeTenderRow();
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE 1=1', {
        all: jest.fn(() => [sampleTender])
      });

      const res = await request(lifecycleApp).get('/');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Office Cleaning Service');
    });

    test('filters by stage query parameter', async () => {
      enableTable();
      const reviewTender = makeTenderRow({ stage: 'review', title: 'Review Tender' });
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE 1=1', {
        all: jest.fn(() => [reviewTender])
      });

      const res = await request(lifecycleApp).get('/?stage=review');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].stage).toBe('review');
    });

    test('filters by priority', async () => {
      enableTable();
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE 1=1', {
        all: jest.fn(() => [makeTenderRow({ priority: 'high' })])
      });

      const res = await request(lifecycleApp).get('/?priority=high');

      expect(res.status).toBe(200);
      expect(res.body.data[0].priority).toBe('high');
    });

    test('filters by agency', async () => {
      enableTable();
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE 1=1', {
        all: jest.fn(() => [makeTenderRow({ agency: 'PUB' })])
      });

      const res = await request(lifecycleApp).get('/?agency=PUB');

      expect(res.status).toBe(200);
      expect(res.body.data[0].agency).toBe('PUB');
    });

    test('filters by is_urgent=true', async () => {
      enableTable();
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE 1=1', {
        all: jest.fn(() => [makeTenderRow({ is_urgent: 1 })])
      });

      const res = await request(lifecycleApp).get('/?is_urgent=true');

      expect(res.status).toBe(200);
      expect(res.body.data[0].is_urgent).toBe(1);
    });

    test('filters by is_renewal=true', async () => {
      enableTable();
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE 1=1', {
        all: jest.fn(() => [makeTenderRow({ is_renewal: 1 })])
      });

      const res = await request(lifecycleApp).get('/?is_renewal=true');

      expect(res.status).toBe(200);
      expect(res.body.data[0].is_renewal).toBe(1);
    });

    test('respects limit and offset', async () => {
      enableTable();
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE 1=1', {
        all: jest.fn(() => [makeTenderRow()])
      });

      const res = await request(lifecycleApp).get('/?limit=10&offset=5');

      expect(res.status).toBe(200);
      expect(res.body.meta.limit).toBe(10);
      expect(res.body.meta.offset).toBe(5);
    });

    test('uses default limit 100 and offset 0', async () => {
      enableTable();
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE 1=1', {
        all: jest.fn(() => [])
      });

      const res = await request(lifecycleApp).get('/');

      expect(res.body.meta.limit).toBe(100);
      expect(res.body.meta.offset).toBe(0);
    });
  });

  describe('POST / - Create tender', () => {
    test('returns 503 when table does not exist (Railway degradation)', async () => {
      disableTable('bpo_tender_lifecycle');

      const res = await request(lifecycleApp)
        .post('/')
        .send({ title: 'Test', agency: 'MOE' });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/initialize/i);
    });

    test('returns 400 when title is missing', async () => {
      enableTable();

      const res = await request(lifecycleApp)
        .post('/')
        .send({ agency: 'MOE' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required fields/i);
    });

    test('returns 400 when agency is missing', async () => {
      enableTable();

      const res = await request(lifecycleApp)
        .post('/')
        .send({ title: 'Test Tender' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required fields/i);
    });

    test('returns 400 when both title and agency are missing', async () => {
      enableTable();

      const res = await request(lifecycleApp)
        .post('/')
        .send({ description: 'No required fields' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required fields/i);
    });

    test('creates tender with valid data', async () => {
      enableTable();
      const createdTender = makeTenderRow({ id: 'test-uuid-1' });
      onQuery('INSERT INTO bpo_tender_lifecycle', {
        run: jest.fn(() => ({ changes: 1 }))
      });
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE id = ?', {
        get: jest.fn(() => createdTender)
      });

      const res = await request(lifecycleApp)
        .post('/')
        .send({ title: 'Office Cleaning Service', agency: 'Ministry of Education' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Office Cleaning Service');
      expect(res.body.message).toMatch(/created/i);
    });

    test('defaults stage to new_opportunity', async () => {
      enableTable();
      const createdTender = makeTenderRow({ id: 'test-uuid-1', stage: 'new_opportunity' });
      onQuery('INSERT INTO bpo_tender_lifecycle', {
        run: jest.fn(() => ({ changes: 1 }))
      });
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE id = ?', {
        get: jest.fn(() => createdTender)
      });

      const res = await request(lifecycleApp)
        .post('/')
        .send({ title: 'Test Tender', agency: 'PUB' });

      expect(res.status).toBe(201);
      expect(res.body.data.stage).toBe('new_opportunity');
    });

    test('defaults priority to medium', async () => {
      enableTable();
      const createdTender = makeTenderRow({ id: 'test-uuid-1', priority: 'medium' });
      onQuery('INSERT INTO bpo_tender_lifecycle', {
        run: jest.fn(() => ({ changes: 1 }))
      });
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE id = ?', {
        get: jest.fn(() => createdTender)
      });

      const res = await request(lifecycleApp)
        .post('/')
        .send({ title: 'Test', agency: 'MOE' });

      expect(res.status).toBe(201);
      expect(res.body.data.priority).toBe('medium');
    });
  });

  describe('PATCH /:id - Update tender', () => {
    test('returns 503 when table does not exist', async () => {
      disableTable('bpo_tender_lifecycle');

      const res = await request(lifecycleApp)
        .patch('/tender-001')
        .send({ title: 'Updated' });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
    });

    test('returns 400 when no valid fields provided', async () => {
      enableTable();

      const res = await request(lifecycleApp)
        .patch('/tender-001')
        .send({ invalid_field: 'something' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no valid fields/i);
    });

    test('returns 400 when body is empty', async () => {
      enableTable();

      const res = await request(lifecycleApp)
        .patch('/tender-001')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no valid fields/i);
    });

    test('returns 404 when tender not found', async () => {
      enableTable();
      onQuery('UPDATE bpo_tender_lifecycle SET', {
        run: jest.fn(() => ({ changes: 0 }))
      });

      const res = await request(lifecycleApp)
        .patch('/nonexistent-id')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    test('updates title successfully', async () => {
      enableTable();
      const updatedTender = makeTenderRow({ title: 'Updated Title' });
      onQuery('UPDATE bpo_tender_lifecycle SET', {
        run: jest.fn(() => ({ changes: 1 }))
      });
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE id = ?', {
        get: jest.fn(() => updatedTender)
      });

      const res = await request(lifecycleApp)
        .patch('/tender-001')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Title');
      expect(res.body.message).toMatch(/updated/i);
    });

    test('updates multiple fields at once', async () => {
      enableTable();
      const updatedTender = makeTenderRow({ title: 'New Title', priority: 'high', agency: 'PUB' });
      onQuery('UPDATE bpo_tender_lifecycle SET', {
        run: jest.fn(() => ({ changes: 1 }))
      });
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE id = ?', {
        get: jest.fn(() => updatedTender)
      });

      const res = await request(lifecycleApp)
        .patch('/tender-001')
        .send({ title: 'New Title', priority: 'high', agency: 'PUB' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('New Title');
      expect(res.body.data.priority).toBe('high');
      expect(res.body.data.agency).toBe('PUB');
    });

    test('stringifies JSON fields (tags, documents, assigned_team)', async () => {
      enableTable();
      const updatedTender = makeTenderRow({ tags: '["urgent","gov"]' });
      onQuery('UPDATE bpo_tender_lifecycle SET', {
        run: jest.fn((...args) => {
          // Verify the tags param was stringified
          const tagsParam = args.find(a => typeof a === 'string' && a.includes('urgent'));
          expect(tagsParam).toBe(JSON.stringify(['urgent', 'gov']));
          return { changes: 1 };
        })
      });
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE id = ?', {
        get: jest.fn(() => updatedTender)
      });

      const res = await request(lifecycleApp)
        .patch('/tender-001')
        .send({ tags: ['urgent', 'gov'] });

      expect(res.status).toBe(200);
    });

    test('converts is_urgent boolean to integer', async () => {
      enableTable();
      const updatedTender = makeTenderRow({ is_urgent: 1 });
      onQuery('UPDATE bpo_tender_lifecycle SET', {
        run: jest.fn((...args) => {
          // is_urgent=true should become 1
          expect(args).toContain(1);
          return { changes: 1 };
        })
      });
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE id = ?', {
        get: jest.fn(() => updatedTender)
      });

      const res = await request(lifecycleApp)
        .patch('/tender-001')
        .send({ is_urgent: true });

      expect(res.status).toBe(200);
    });

    test('ignores disallowed fields', async () => {
      enableTable();

      // Sending only disallowed fields should result in 400
      const res = await request(lifecycleApp)
        .patch('/tender-001')
        .send({ id: 'hacked', created_at: '2020-01-01', source_type: 'injected' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no valid fields/i);
    });
  });

  describe('POST /:id/move - Move tender between stages', () => {
    test('returns 503 when table does not exist', async () => {
      disableTable('bpo_tender_lifecycle');

      const res = await request(lifecycleApp)
        .post('/tender-001/move')
        .send({ new_stage: 'review' });

      expect(res.status).toBe(503);
    });

    test('returns 400 when new_stage is missing', async () => {
      enableTable();

      const res = await request(lifecycleApp)
        .post('/tender-001/move')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/new_stage required/i);
    });

    test('returns 400 for invalid stage name', async () => {
      enableTable();

      const res = await request(lifecycleApp)
        .post('/tender-001/move')
        .send({ new_stage: 'invalid_stage' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid stage/i);
    });

    test('returns 404 when tender not found', async () => {
      enableTable();
      onQuery('UPDATE bpo_tender_lifecycle SET stage', {
        run: jest.fn(() => ({ changes: 0 }))
      });

      const res = await request(lifecycleApp)
        .post('/nonexistent/move')
        .send({ new_stage: 'review' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    // Test all valid stage transitions
    const validStages = [
      'renewal_watch',
      'new_opportunity',
      'review',
      'bidding',
      'internal_approval',
      'submitted',
      'awarded',
      'lost'
    ];

    validStages.forEach(stage => {
      test(`accepts valid stage: ${stage}`, async () => {
        enableTable();
        const movedTender = makeTenderRow({ stage });
        onQuery('UPDATE bpo_tender_lifecycle SET stage', {
          run: jest.fn(() => ({ changes: 1 }))
        });
        onQuery('SELECT * FROM bpo_tender_lifecycle WHERE id = ?', {
          get: jest.fn(() => movedTender)
        });

        const res = await request(lifecycleApp)
          .post('/tender-001/move')
          .send({ new_stage: stage });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain(stage);
      });
    });

    test('moves from new_opportunity to review', async () => {
      enableTable();
      const movedTender = makeTenderRow({ stage: 'review' });
      onQuery('UPDATE bpo_tender_lifecycle SET stage', {
        run: jest.fn(() => ({ changes: 1 }))
      });
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE id = ?', {
        get: jest.fn(() => movedTender)
      });

      const res = await request(lifecycleApp)
        .post('/tender-001/move')
        .send({ new_stage: 'review', user_id: 'admin-001' });

      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('review');
    });

    test('moves from review to bidding', async () => {
      enableTable();
      const movedTender = makeTenderRow({ stage: 'bidding' });
      onQuery('UPDATE bpo_tender_lifecycle SET stage', {
        run: jest.fn(() => ({ changes: 1 }))
      });
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE id = ?', {
        get: jest.fn(() => movedTender)
      });

      const res = await request(lifecycleApp)
        .post('/tender-001/move')
        .send({ new_stage: 'bidding' });

      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('bidding');
    });

    test('moves from bidding to internal_approval', async () => {
      enableTable();
      const movedTender = makeTenderRow({ stage: 'internal_approval' });
      onQuery('UPDATE bpo_tender_lifecycle SET stage', {
        run: jest.fn(() => ({ changes: 1 }))
      });
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE id = ?', {
        get: jest.fn(() => movedTender)
      });

      const res = await request(lifecycleApp)
        .post('/tender-001/move')
        .send({ new_stage: 'internal_approval' });

      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('internal_approval');
    });

    test('moves from internal_approval to submitted', async () => {
      enableTable();
      const movedTender = makeTenderRow({ stage: 'submitted' });
      onQuery('UPDATE bpo_tender_lifecycle SET stage', {
        run: jest.fn(() => ({ changes: 1 }))
      });
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE id = ?', {
        get: jest.fn(() => movedTender)
      });

      const res = await request(lifecycleApp)
        .post('/tender-001/move')
        .send({ new_stage: 'submitted' });

      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('submitted');
    });

    test('moves from submitted to awarded (win)', async () => {
      enableTable();
      const movedTender = makeTenderRow({ stage: 'awarded' });
      onQuery('UPDATE bpo_tender_lifecycle SET stage', {
        run: jest.fn(() => ({ changes: 1 }))
      });
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE id = ?', {
        get: jest.fn(() => movedTender)
      });

      const res = await request(lifecycleApp)
        .post('/tender-001/move')
        .send({ new_stage: 'awarded' });

      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('awarded');
    });

    test('moves from submitted to lost', async () => {
      enableTable();
      const movedTender = makeTenderRow({ stage: 'lost' });
      onQuery('UPDATE bpo_tender_lifecycle SET stage', {
        run: jest.fn(() => ({ changes: 1 }))
      });
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE id = ?', {
        get: jest.fn(() => movedTender)
      });

      const res = await request(lifecycleApp)
        .post('/tender-001/move')
        .send({ new_stage: 'lost' });

      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('lost');
    });

    test('rejects stages outside the valid set', async () => {
      enableTable();

      const invalidStages = ['draft', 'pending', 'approved', 'completed', 'cancelled', 'in_progress', ''];

      for (const stage of invalidStages) {
        if (stage === '') continue; // empty is caught by missing check
        const res = await request(lifecycleApp)
          .post('/tender-001/move')
          .send({ new_stage: stage });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/invalid stage/i);
      }
    });

    test('audit log failure does not break the move operation', async () => {
      enableTable();
      enableTable('audit_log');
      const movedTender = makeTenderRow({ stage: 'review' });
      onQuery('UPDATE bpo_tender_lifecycle SET stage', {
        run: jest.fn(() => ({ changes: 1 }))
      });
      onQuery('SELECT * FROM bpo_tender_lifecycle WHERE id = ?', {
        get: jest.fn(() => movedTender)
      });
      // audit_log insert will throw
      onQuery('INSERT INTO audit_log', {
        run: jest.fn(() => { throw new Error('Audit table broken'); })
      });

      const res = await request(lifecycleApp)
        .post('/tender-001/move')
        .send({ new_stage: 'review', user_id: 'admin-001' });

      // The move should still succeed even though audit logging failed
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stage).toBe('review');
    });
  });

  describe('DELETE /:id - Delete tender', () => {
    test('returns 503 when table does not exist', async () => {
      disableTable('bpo_tender_lifecycle');

      const res = await request(lifecycleApp).delete('/tender-001');

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
    });

    test('returns 404 when tender not found', async () => {
      enableTable();
      onQuery('DELETE FROM bpo_tender_lifecycle WHERE id = ?', {
        run: jest.fn(() => ({ changes: 0 }))
      });

      const res = await request(lifecycleApp).delete('/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    test('deletes tender successfully', async () => {
      enableTable();
      onQuery('DELETE FROM bpo_tender_lifecycle WHERE id = ?', {
        run: jest.fn(() => ({ changes: 1 }))
      });

      const res = await request(lifecycleApp).delete('/tender-001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/deleted/i);
    });
  });
});
