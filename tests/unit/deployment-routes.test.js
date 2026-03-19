/**
 * Unit Tests: Deployment & Job Routes
 *
 * Tests input validation, status enum checks, error handling,
 * and business logic for deployment and job endpoints.
 *
 * Strategy: mock the db module and auth middleware so we can
 * exercise route handlers in isolation without a real database.
 */

// ---- Mocks must be declared before any require() ----

// Stub the structured-logger used by jobs.js
jest.mock('../../utils/structured-logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Stub the generic logger used by middleware/auth.js
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Stub telegram-posting so it never loads
jest.mock('../../services/telegram-posting', () => null);

// --- Database mock ---
const mockPrepare = jest.fn();
const mockTransaction = jest.fn();
const mockDb = {
  prepare: mockPrepare,
  transaction: mockTransaction,
};
jest.mock('../../db', () => ({ db: mockDb }));

// --- db-helpers mock ---
jest.mock('../../db/utils/db-helpers', () => ({
  safeJsonParse: (val, fallback = null) => {
    if (!val) return fallback;
    try { return JSON.parse(val); } catch { return fallback; }
  },
}));

// --- Validation middleware mocks (jobs.js uses these) ---
jest.mock('../../middleware/database-validation', () => ({
  createValidationMiddleware: () => (_req, _res, next) => next(),
}));
jest.mock('../../middleware/input-validation', () => ({
  createInputValidationMiddleware: () => (_req, _res, next) => next(),
}));

// --- Auth middleware mock: always pass through ---
jest.mock('../../middleware/auth', () => ({
  authenticateAdmin: (req, _res, next) => { req.user = { role: 'admin' }; next(); },
  authenticateToken: (req, _res, next) => { req.user = { role: 'candidate', id: 'C001' }; next(); },
  authenticateUser: (req, _res, next) => { req.user = { role: 'candidate', id: 'C001' }; next(); },
}));

// ---- Now require modules ----
const express = require('express');
const request = require('supertest');

// Helper: build a mini Express app that mounts a router
function buildApp(router, path = '/') {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  return app;
}

// Helper: create a chainable prepare() mock
// Usage: setupPrepare({ get: returnValue }) or setupPrepare({ all: returnValue }) or { run: returnValue }
function setupPrepare(stubs) {
  const stmt = {
    get: jest.fn().mockReturnValue(stubs.get !== undefined ? stubs.get : undefined),
    all: jest.fn().mockReturnValue(stubs.all !== undefined ? stubs.all : []),
    run: jest.fn().mockReturnValue(stubs.run !== undefined ? stubs.run : { changes: 0 }),
  };
  mockPrepare.mockReturnValue(stmt);
  return stmt;
}

// Helper: queue multiple prepare() calls that return different stubs
function setupPrepareSequence(stubsList) {
  const stmts = stubsList.map(stubs => ({
    get: jest.fn().mockReturnValue(stubs.get !== undefined ? stubs.get : undefined),
    all: jest.fn().mockReturnValue(stubs.all !== undefined ? stubs.all : []),
    run: jest.fn().mockReturnValue(stubs.run !== undefined ? stubs.run : { changes: 0 }),
  }));
  stmts.forEach((stmt, i) => {
    if (i === 0) mockPrepare.mockReturnValueOnce(stmt);
    else mockPrepare.mockReturnValueOnce(stmt);
  });
  return stmts;
}

// ==============================================
// DEPLOYMENT ROUTES
// ==============================================

describe('Deployment Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-require to reset module state per suite
    jest.isolateModules(() => {
      const deploymentRouter = require('../../routes/api/v1/deployments');
      app = buildApp(deploymentRouter);
    });
  });

  // ------------------------------------------
  // POST / - Create deployment
  // ------------------------------------------
  describe('POST / - create deployment', () => {
    test('returns 400 when job_id is missing', async () => {
      const res = await request(app)
        .post('/')
        .send({ candidate_id: 'C001' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/job_id/i);
    });

    test('returns 400 when job_id is not a string', async () => {
      const res = await request(app)
        .post('/')
        .send({ job_id: 123, candidate_id: 'C001' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/job_id.*string/i);
    });

    test('returns 400 when candidate_id is missing', async () => {
      const res = await request(app)
        .post('/')
        .send({ job_id: 'JOB001' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/candidate_id/i);
    });

    test('returns 400 when candidate_id is not a string', async () => {
      const res = await request(app)
        .post('/')
        .send({ job_id: 'JOB001', candidate_id: 42 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/candidate_id.*string/i);
    });

    test('returns 404 when job does not exist', async () => {
      // Transaction mock: the fn passed to db.transaction is called immediately
      mockTransaction.mockImplementation(fn => fn);
      // Inside transaction: job lookup returns null
      setupPrepareSequence([
        { get: null },       // SELECT * FROM jobs WHERE id = ?
      ]);

      const res = await request(app)
        .post('/')
        .send({ job_id: 'JOB_MISSING', candidate_id: 'C001' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Job not found/i);
    });

    test('returns 404 when candidate does not exist', async () => {
      mockTransaction.mockImplementation(fn => fn);
      setupPrepareSequence([
        { get: { id: 'JOB001', filled_slots: 0, total_slots: 5 } }, // job exists
        { get: null }, // candidate not found
      ]);

      const res = await request(app)
        .post('/')
        .send({ job_id: 'JOB001', candidate_id: 'C_MISSING' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Candidate not found/i);
    });

    test('returns 400 when job is fully booked', async () => {
      mockTransaction.mockImplementation(fn => fn);
      setupPrepareSequence([
        { get: { id: 'JOB001', filled_slots: 5, total_slots: 5 } }, // full
        { get: { id: 'C001', name: 'Test' } }, // candidate exists
      ]);

      const res = await request(app)
        .post('/')
        .send({ job_id: 'JOB001', candidate_id: 'C001' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/fully booked/i);
    });

    test('returns 400 when candidate already assigned', async () => {
      mockTransaction.mockImplementation(fn => fn);
      setupPrepareSequence([
        { get: { id: 'JOB001', filled_slots: 1, total_slots: 5 } },  // job
        { get: { id: 'C001', name: 'Test' } },                        // candidate
        { get: { id: 'DEP_EXISTING' } },                              // existing deployment
      ]);

      const res = await request(app)
        .post('/')
        .send({ job_id: 'JOB001', candidate_id: 'C001' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already assigned/i);
    });

    test('creates deployment successfully', async () => {
      const deploymentData = { id: 'DEP_NEW', job_id: 'JOB001', candidate_id: 'C001', status: 'assigned' };

      mockTransaction.mockImplementation(fn => fn);
      setupPrepareSequence([
        { get: { id: 'JOB001', filled_slots: 0, total_slots: 5 } },   // job exists
        { get: { id: 'C001', name: 'Test' } },                         // candidate exists
        { get: null },                                                  // no existing deployment
        { run: { changes: 1 } },                                       // INSERT deployment
        { run: { changes: 1 } },                                       // UPDATE filled_slots
        { get: { filled_slots: 1, total_slots: 5 } },                  // check if fully booked
      ]);

      // After transaction, the route does one more prepare to fetch the created deployment
      mockPrepare.mockReturnValueOnce({
        get: jest.fn().mockReturnValue(deploymentData),
        all: jest.fn(),
        run: jest.fn(),
      });

      const res = await request(app)
        .post('/')
        .send({ job_id: 'JOB001', candidate_id: 'C001' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(deploymentData);
    });

    test('marks job as filled when last slot taken', async () => {
      const deploymentData = { id: 'DEP_NEW', job_id: 'JOB001', candidate_id: 'C001', status: 'assigned' };

      mockTransaction.mockImplementation(fn => fn);
      setupPrepareSequence([
        { get: { id: 'JOB001', filled_slots: 4, total_slots: 5 } },   // job with 1 slot left
        { get: { id: 'C001', name: 'Test' } },                         // candidate
        { get: null },                                                  // no existing deployment
        { run: { changes: 1 } },                                       // INSERT deployment
        { run: { changes: 1 } },                                       // UPDATE filled_slots
        { get: { filled_slots: 5, total_slots: 5 } },                  // now full
        { run: { changes: 1 } },                                       // UPDATE jobs SET status='filled'
      ]);

      mockPrepare.mockReturnValueOnce({
        get: jest.fn().mockReturnValue(deploymentData),
        all: jest.fn(),
        run: jest.fn(),
      });

      const res = await request(app)
        .post('/')
        .send({ job_id: 'JOB001', candidate_id: 'C001' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ------------------------------------------
  // PATCH /:id - Update deployment status
  // ------------------------------------------
  describe('PATCH /:id - update deployment status', () => {
    test('returns 400 for invalid status value', async () => {
      const res = await request(app)
        .patch('/DEP001')
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/status must be one of/i);
    });

    test.each([
      'assigned',
      'confirmed',
      'checked_in',
      'completed',
      'cancelled',
      'no_show',
    ])('accepts valid status "%s"', async (validStatus) => {
      setupPrepareSequence([
        { get: { id: 'DEP001', job_id: 'JOB001', candidate_id: 'C001', status: 'assigned' } }, // find deployment
        { run: { changes: 1 } },  // UPDATE deployment
        { get: { id: 'DEP001', status: validStatus } }, // return updated
      ]);

      const res = await request(app)
        .patch('/DEP001')
        .send({ status: validStatus });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('returns 404 when deployment not found', async () => {
      setupPrepare({ get: null });

      const res = await request(app)
        .patch('/DEP_MISSING')
        .send({ status: 'confirmed' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Deployment not found/i);
    });

    test('calculates financials when completing with hours_worked', async () => {
      const deployment = { id: 'DEP001', job_id: 'JOB001', candidate_id: 'C001', status: 'checked_in' };
      const job = { charge_rate: 25, pay_rate: 18 };

      setupPrepareSequence([
        { get: deployment },    // find deployment
        { get: job },           // get job rates
        { run: { changes: 1 } }, // UPDATE deployments with financials
        { run: { changes: 1 } }, // UPDATE candidates stats (rating provided)
        { get: { ...deployment, status: 'completed', hours_worked: 8, gross_revenue: 200, candidate_pay: 144, gross_profit: 56 } },
      ]);

      const res = await request(app)
        .patch('/DEP001')
        .send({ status: 'completed', hours_worked: 8, rating: 5 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('updates non-status fields (check_in_time, rating, feedback)', async () => {
      const deployment = { id: 'DEP001', job_id: 'JOB001', candidate_id: 'C001', status: 'assigned' };

      setupPrepareSequence([
        { get: deployment },     // find deployment
        { run: { changes: 1 } }, // UPDATE
        { get: { ...deployment, rating: 4, feedback: 'Good worker' } },
      ]);

      const res = await request(app)
        .patch('/DEP001')
        .send({ rating: 4, feedback: 'Good worker' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(4);
    });
  });

  // ------------------------------------------
  // GET /stats/overview - Deployment statistics
  // ------------------------------------------
  describe('GET /stats/overview - deployment statistics', () => {
    test('returns statistics object', async () => {
      setupPrepareSequence([
        { get: { count: 42 } },                                     // total
        { all: [{ status: 'assigned', count: 20 }, { status: 'completed', count: 22 }] }, // byStatus
        { get: { count: 5 } },                                      // today
        { get: { count: 15 } },                                     // thisWeek
      ]);

      const res = await request(app)
        .get('/stats/overview');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        total: 42,
        byStatus: [{ status: 'assigned', count: 20 }, { status: 'completed', count: 22 }],
        today: 5,
        thisWeek: 15,
      });
    });

    test('returns 500 on database error', async () => {
      mockPrepare.mockImplementation(() => { throw new Error('DB failure'); });

      const res = await request(app)
        .get('/stats/overview');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});

// ==============================================
// JOB ROUTES
// ==============================================

describe('Job Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      const jobRouter = require('../../routes/api/v1/jobs');
      app = buildApp(jobRouter);
    });
  });

  // ------------------------------------------
  // GET /stats - Job statistics
  // ------------------------------------------
  describe('GET /stats - job statistics', () => {
    test('returns stats with correct structure', async () => {
      setupPrepareSequence([
        { all: [{ status: 'open', count: 10 }, { status: 'filled', count: 3 }, { status: 'completed', count: 7 }] },
        { get: { count: 20 } },         // total
        { all: [{ date: '2026-03-19', count: 2 }] }, // recent postings
      ]);

      const res = await request(app)
        .get('/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({ open: 10, filled: 3, completed: 7 });
      expect(res.body.meta.total).toBe(20);
      expect(res.body.meta.recent_postings).toHaveLength(1);
      expect(res.body.generated_at).toBeDefined();
    });

    test('returns zeroes when no jobs exist', async () => {
      setupPrepareSequence([
        { all: [] },             // no status rows
        { get: { count: 0 } },  // total
        { all: [] },             // no recent postings
      ]);

      const res = await request(app)
        .get('/stats');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ open: 0, filled: 0, completed: 0 });
      expect(res.body.meta.total).toBe(0);
    });

    test('returns 500 on database error', async () => {
      mockPrepare.mockImplementation(() => { throw new Error('DB failure'); });

      const res = await request(app)
        .get('/stats');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/statistics/i);
    });
  });

  // ------------------------------------------
  // POST /:id/accept - Candidate accepts job
  // ------------------------------------------
  describe('POST /:id/accept - candidate accepts job', () => {
    test('returns 404 when candidate not found', async () => {
      setupPrepare({ get: null });

      const res = await request(app)
        .post('/JOB001/accept')
        .send({ candidate_id: 'C_MISSING' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Candidate not found/i);
    });

    test('returns 403 when candidate is not active (pending)', async () => {
      setupPrepare({ get: { status: 'pending' } });

      const res = await request(app)
        .post('/JOB001/accept')
        .send({ candidate_id: 'C001' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/pending verification/i);
      expect(res.body.code).toBe('ACCOUNT_PENDING');
    });

    test('returns 404 when job not found', async () => {
      setupPrepareSequence([
        { get: { status: 'active' } },  // candidate is active
        { get: null },                   // job not found
      ]);

      const res = await request(app)
        .post('/JOB_MISSING/accept')
        .send({ candidate_id: 'C001' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Job not found/i);
    });

    test('returns 400 when job is fully booked', async () => {
      setupPrepareSequence([
        { get: { status: 'active' } },                                  // candidate
        { get: { id: 'JOB001', filled_slots: 3, total_slots: 3 } },    // job full
      ]);

      const res = await request(app)
        .post('/JOB001/accept')
        .send({ candidate_id: 'C001' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/fully booked/i);
    });

    test('returns 400 when already assigned', async () => {
      setupPrepareSequence([
        { get: { status: 'active' } },                                  // candidate
        { get: { id: 'JOB001', filled_slots: 1, total_slots: 5 } },    // job
        { get: { id: 'DEP_EXISTING' } },                               // existing deployment
      ]);

      const res = await request(app)
        .post('/JOB001/accept')
        .send({ candidate_id: 'C001' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Already assigned/i);
    });

    test('successfully accepts job and returns deployment_id', async () => {
      setupPrepareSequence([
        { get: { status: 'active' } },                                  // candidate active
        { get: { id: 'JOB001', filled_slots: 0, total_slots: 5 } },    // job has slots
        { get: null },                                                  // no existing deployment
        { run: { changes: 1 } },                                       // INSERT deployment
        { run: { changes: 1 } },                                       // UPDATE filled_slots
        { get: { filled_slots: 1, total_slots: 5 } },                  // not yet full
      ]);

      const res = await request(app)
        .post('/JOB001/accept')
        .send({ candidate_id: 'C001' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deployment_id).toBeDefined();
      expect(res.body.data.deployment_id).toMatch(/^DEP/);
    });

    test('marks job as filled when last slot taken', async () => {
      setupPrepareSequence([
        { get: { status: 'active' } },                                  // candidate
        { get: { id: 'JOB001', filled_slots: 4, total_slots: 5 } },    // 1 slot left
        { get: null },                                                  // no existing deployment
        { run: { changes: 1 } },                                       // INSERT deployment
        { run: { changes: 1 } },                                       // UPDATE filled_slots
        { get: { filled_slots: 5, total_slots: 5 } },                  // now full
        { run: { changes: 1 } },                                       // UPDATE status='filled'
      ]);

      const res = await request(app)
        .post('/JOB001/accept')
        .send({ candidate_id: 'C001' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ------------------------------------------
  // PATCH /:id/status - Update job status
  // ------------------------------------------
  describe('PATCH /:id/status - update job status', () => {
    test('returns 400 when status is missing', async () => {
      const res = await request(app)
        .patch('/JOB001/status')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Status is required/i);
    });

    test('returns 400 for invalid status value', async () => {
      const res = await request(app)
        .patch('/JOB001/status')
        .send({ status: 'bogus' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid status/i);
      expect(res.body.error).toMatch(/open/);
      expect(res.body.error).toMatch(/filled/);
      expect(res.body.error).toMatch(/completed/);
      expect(res.body.error).toMatch(/cancelled/);
    });

    test.each(['open', 'filled', 'completed', 'cancelled'])(
      'accepts valid status "%s"',
      async (validStatus) => {
        setupPrepareSequence([
          { get: { id: 'JOB001', status: 'open' } },  // job exists
          { run: { changes: 1 } },                     // UPDATE
          { get: { id: 'JOB001', status: validStatus } },
        ]);

        const res = await request(app)
          .patch('/JOB001/status')
          .send({ status: validStatus });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe(validStatus);
      }
    );

    test('returns 404 when job not found', async () => {
      setupPrepare({ get: null });

      const res = await request(app)
        .patch('/JOB_MISSING/status')
        .send({ status: 'open' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Job not found/i);
    });
  });

  // ------------------------------------------
  // autoCompleteExpiredJobs() - background task
  // ------------------------------------------
  describe('autoCompleteExpiredJobs()', () => {
    // The function is not exported, but it runs at the start of GET /.
    // We exercise it indirectly through GET / and verify the UPDATE was called.

    test('runs auto-complete on GET / and updates expired jobs', async () => {
      const stmts = setupPrepareSequence([
        { run: { changes: 3 } }, // autoCompleteExpiredJobs UPDATE
        { all: [] },             // main GET query
        { get: { count: 0 } },  // total count
      ]);

      const res = await request(app)
        .get('/');

      expect(res.status).toBe(200);
      // The first prepare call should be the auto-complete UPDATE
      expect(mockPrepare.mock.calls[0][0]).toMatch(/UPDATE jobs.*SET status = 'completed'/s);
    });

    test('does not throw when auto-complete encounters a database error', async () => {
      // First call (autoComplete) throws, but subsequent calls succeed
      mockPrepare
        .mockImplementationOnce(() => { throw new Error('DB locked'); })
        .mockReturnValueOnce({ all: jest.fn().mockReturnValue([]) }) // GET query
        .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ count: 0 }) }); // total

      const res = await request(app)
        .get('/');

      // Should not crash - auto-complete errors are swallowed
      expect(res.status).toBe(200);
    });

    test('auto-complete uses correct date/time comparison SQL', async () => {
      setupPrepareSequence([
        { run: { changes: 0 } }, // autoComplete - no expired jobs
        { all: [] },
        { get: { count: 0 } },
      ]);

      await request(app).get('/');

      const autoCompleteSql = mockPrepare.mock.calls[0][0];
      // Verify the SQL checks both past dates and same-day past times
      expect(autoCompleteSql).toMatch(/job_date < \?/);
      expect(autoCompleteSql).toMatch(/job_date = \? AND end_time <= \?/);
      // Verify it only targets open or filled jobs
      expect(autoCompleteSql).toMatch(/status = 'open' OR status = 'filled'/);
    });

    test('auto-complete passes current date and time as parameters', async () => {
      const stmt = { run: jest.fn().mockReturnValue({ changes: 0 }) };
      mockPrepare
        .mockReturnValueOnce(stmt) // autoComplete
        .mockReturnValueOnce({ all: jest.fn().mockReturnValue([]) })
        .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ count: 0 }) });

      await request(app).get('/');

      // The run call should receive (currentDate, currentDate, currentTime)
      const args = stmt.run.mock.calls[0];
      expect(args).toHaveLength(3);
      // First two args: YYYY-MM-DD format
      expect(args[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(args[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(args[0]).toBe(args[1]); // same date passed twice
      // Third arg: HH:MM format
      expect(args[2]).toMatch(/^\d{2}:\d{2}$/);
    });
  });
});
