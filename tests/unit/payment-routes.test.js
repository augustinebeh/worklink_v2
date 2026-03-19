/**
 * Unit Tests: Payment Routes (GET + PATCH + approve/reject)
 *
 * Tests payment listing with filters, stats, single updates,
 * and approve/reject/paid flows.
 *
 * Strategy: mock the db module and auth middleware so we can
 * exercise route handlers in isolation without a real database.
 */

// ---- Mocks must be declared before any require() ----

// Stub the generic logger used by middleware/auth.js
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// --- Database mock ---
const mockPrepare = jest.fn();
const mockTransaction = jest.fn();
const mockDb = {
  prepare: mockPrepare,
  transaction: mockTransaction,
};
jest.mock('../../db', () => ({ db: mockDb }));

// --- Validation middleware mock (payments uses createValidationMiddleware('payment')) ---
jest.mock('../../middleware/database-validation', () => ({
  createValidationMiddleware: () => (_req, _res, next) => next(),
}));

// --- Auth middleware mock: always pass through as admin ---
jest.mock('../../middleware/auth', () => ({
  authenticateAdmin: (req, _res, next) => { req.user = { role: 'admin', id: 'ADMIN001' }; next(); },
  authenticateAdminOrOwner: (req, _res, next) => { req.user = { role: 'admin', id: 'ADMIN001' }; next(); },
  authenticateToken: (req, _res, next) => { req.user = { role: 'candidate', id: 'C001' }; next(); },
  authenticateUser: (req, _res, next) => { req.user = { role: 'candidate', id: 'C001' }; next(); },
}));

// ---- Now require modules ----
const express = require('express');
const request = require('supertest');

// Helper: build a mini Express app that mounts the payment router
function buildApp(router, path = '/') {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  return app;
}

// Helper: create a chainable prepare() mock
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
  stmts.forEach(stmt => {
    mockPrepare.mockReturnValueOnce(stmt);
  });
  return stmts;
}

// ==============================================
// PAYMENT ROUTES
// ==============================================

describe('Payment Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      const paymentRouter = require('../../routes/api/v1/payments');
      app = buildApp(paymentRouter);
    });
  });

  // ------------------------------------------
  // GET / - List payments with filters
  // ------------------------------------------
  describe('GET / - list payments', () => {
    test('returns all payments when no filters provided', async () => {
      const payments = [
        { id: 'PAY001', candidate_id: 'C001', total_amount: 100, status: 'pending' },
        { id: 'PAY002', candidate_id: 'C002', total_amount: 200, status: 'approved' },
      ];
      setupPrepare({ all: payments });

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].id).toBe('PAY001');
    });

    test('filters by status query parameter', async () => {
      const stmt = setupPrepare({ all: [{ id: 'PAY001', status: 'pending' }] });

      const res = await request(app).get('/?status=pending');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Verify the SQL included status filter
      const sqlArg = mockPrepare.mock.calls[0][0];
      expect(sqlArg).toMatch(/p\.status = \?/);
      // Verify parameter was passed
      expect(stmt.all).toHaveBeenCalledWith('pending');
    });

    test('filters by candidate_id query parameter', async () => {
      const stmt = setupPrepare({ all: [{ id: 'PAY001', candidate_id: 'C001' }] });

      const res = await request(app).get('/?candidate_id=C001');

      expect(res.status).toBe(200);
      const sqlArg = mockPrepare.mock.calls[0][0];
      expect(sqlArg).toMatch(/p\.candidate_id = \?/);
      expect(stmt.all).toHaveBeenCalledWith('C001');
    });

    test('filters by from_date query parameter', async () => {
      const stmt = setupPrepare({ all: [] });

      const res = await request(app).get('/?from_date=2026-01-01');

      expect(res.status).toBe(200);
      const sqlArg = mockPrepare.mock.calls[0][0];
      expect(sqlArg).toMatch(/p\.created_at >= \?/);
      expect(stmt.all).toHaveBeenCalledWith('2026-01-01');
    });

    test('filters by to_date query parameter', async () => {
      const stmt = setupPrepare({ all: [] });

      const res = await request(app).get('/?to_date=2026-12-31');

      expect(res.status).toBe(200);
      const sqlArg = mockPrepare.mock.calls[0][0];
      expect(sqlArg).toMatch(/p\.created_at <= \?/);
      expect(stmt.all).toHaveBeenCalledWith('2026-12-31');
    });

    test('combines multiple filters', async () => {
      const stmt = setupPrepare({ all: [] });

      const res = await request(app)
        .get('/?status=paid&candidate_id=C001&from_date=2026-01-01&to_date=2026-12-31');

      expect(res.status).toBe(200);
      const sqlArg = mockPrepare.mock.calls[0][0];
      expect(sqlArg).toMatch(/p\.status = \?/);
      expect(sqlArg).toMatch(/p\.candidate_id = \?/);
      expect(sqlArg).toMatch(/p\.created_at >= \?/);
      expect(sqlArg).toMatch(/p\.created_at <= \?/);
      expect(stmt.all).toHaveBeenCalledWith('paid', 'C001', '2026-01-01', '2026-12-31');
    });

    test('returns empty array when no payments match', async () => {
      setupPrepare({ all: [] });

      const res = await request(app).get('/?status=nonexistent');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    test('orders results by created_at DESC', async () => {
      setupPrepare({ all: [] });

      await request(app).get('/');

      const sqlArg = mockPrepare.mock.calls[0][0];
      expect(sqlArg).toMatch(/ORDER BY p\.created_at DESC/);
    });

    test('joins candidates, deployments, and jobs tables', async () => {
      setupPrepare({ all: [] });

      await request(app).get('/');

      const sqlArg = mockPrepare.mock.calls[0][0];
      expect(sqlArg).toMatch(/LEFT JOIN candidates/);
      expect(sqlArg).toMatch(/LEFT JOIN deployments/);
      expect(sqlArg).toMatch(/LEFT JOIN jobs/);
    });

    test('returns 500 on database error', async () => {
      mockPrepare.mockImplementation(() => { throw new Error('DB failure'); });

      const res = await request(app).get('/');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Internal server error/i);
    });
  });

  // ------------------------------------------
  // GET /stats - Payment statistics
  // ------------------------------------------
  describe('GET /stats - payment statistics', () => {
    test('returns stats with correct structure', async () => {
      setupPrepareSequence([
        { get: { amount: 10000 } },     // total
        { get: { amount: 3000 } },      // pending
        { get: { amount: 4000 } },      // approved
        { get: { amount: 3000 } },      // paid
        { all: [{ status: 'pending', count: 3, amount: 3000 }, { status: 'approved', count: 4, amount: 4000 }] }, // byStatus
        { get: { amount: 1500 } },      // thisMonth
      ]);

      const res = await request(app).get('/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(10000);
      expect(res.body.data.pending).toBe(3000);
      expect(res.body.data.approved).toBe(4000);
      expect(res.body.data.paid).toBe(3000);
      expect(res.body.data.byStatus).toHaveLength(2);
      expect(res.body.data.thisMonth).toBe(1500);
    });

    test('returns zeroes when no payments exist', async () => {
      setupPrepareSequence([
        { get: { amount: 0 } },
        { get: { amount: 0 } },
        { get: { amount: 0 } },
        { get: { amount: 0 } },
        { all: [] },
        { get: { amount: 0 } },
      ]);

      const res = await request(app).get('/stats');

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(0);
      expect(res.body.data.pending).toBe(0);
      expect(res.body.data.approved).toBe(0);
      expect(res.body.data.paid).toBe(0);
      expect(res.body.data.byStatus).toEqual([]);
      expect(res.body.data.thisMonth).toBe(0);
    });

    test('returns 500 on database error', async () => {
      mockPrepare.mockImplementation(() => { throw new Error('DB crash'); });

      const res = await request(app).get('/stats');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ------------------------------------------
  // PATCH /:id - Update payment status
  // ------------------------------------------
  describe('PATCH /:id - update payment', () => {
    test('returns 404 when payment not found', async () => {
      setupPrepare({ get: undefined });

      const res = await request(app)
        .patch('/PAY_MISSING')
        .send({ status: 'approved' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Payment not found/i);
    });

    test('updates status to approved', async () => {
      const payment = { id: 'PAY001', candidate_id: 'C001', total_amount: 100, status: 'pending' };
      const updatedPayment = { ...payment, status: 'approved' };

      // First call: SELECT payment, then transaction calls, then final SELECT
      setupPrepareSequence([
        { get: payment },          // SELECT * FROM payments WHERE id = ?
        { run: { changes: 1 } },   // UPDATE payments SET status = ? WHERE id = ?
        { get: updatedPayment },   // SELECT * FROM payments WHERE id = ? (after update)
      ]);
      mockTransaction.mockImplementation(fn => fn);

      const res = await request(app)
        .patch('/PAY001')
        .send({ status: 'approved' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('updates candidate earnings when status set to paid', async () => {
      const payment = { id: 'PAY001', candidate_id: 'C001', total_amount: 150.50, status: 'approved' };
      const updatedPayment = { ...payment, status: 'paid', paid_at: '2026-03-19' };

      setupPrepareSequence([
        { get: payment },          // SELECT payment
        { run: { changes: 1 } },   // UPDATE candidates SET total_earnings
        { run: { changes: 1 } },   // UPDATE payments SET status, paid_at
        { get: updatedPayment },   // SELECT updated payment
      ]);
      mockTransaction.mockImplementation(fn => fn);

      const res = await request(app)
        .patch('/PAY001')
        .send({ status: 'paid' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('updates transaction_id field', async () => {
      const payment = { id: 'PAY001', candidate_id: 'C001', total_amount: 100, status: 'approved' };

      setupPrepareSequence([
        { get: payment },
        { run: { changes: 1 } },   // UPDATE
        { get: { ...payment, transaction_id: 'TXN_123' } },
      ]);
      mockTransaction.mockImplementation(fn => fn);

      const res = await request(app)
        .patch('/PAY001')
        .send({ transaction_id: 'TXN_123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('updates notes field', async () => {
      const payment = { id: 'PAY001', candidate_id: 'C001', total_amount: 100, status: 'pending' };

      setupPrepareSequence([
        { get: payment },
        { run: { changes: 1 } },
        { get: { ...payment, notes: 'Urgent payment' } },
      ]);
      mockTransaction.mockImplementation(fn => fn);

      const res = await request(app)
        .patch('/PAY001')
        .send({ notes: 'Urgent payment' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('updates payment_proof field', async () => {
      const payment = { id: 'PAY001', candidate_id: 'C001', total_amount: 100, status: 'approved' };

      setupPrepareSequence([
        { get: payment },
        { run: { changes: 1 } },
        { get: { ...payment, payment_proof: 'proof_url.jpg' } },
      ]);
      mockTransaction.mockImplementation(fn => fn);

      const res = await request(app)
        .patch('/PAY001')
        .send({ payment_proof: 'proof_url.jpg' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('handles empty body without crashing', async () => {
      const payment = { id: 'PAY001', candidate_id: 'C001', total_amount: 100, status: 'pending' };

      setupPrepareSequence([
        { get: payment },
        { get: payment },  // no updates, just re-fetch
      ]);
      mockTransaction.mockImplementation(fn => fn);

      const res = await request(app)
        .patch('/PAY001')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('returns 500 on database error', async () => {
      mockPrepare.mockImplementation(() => { throw new Error('DB failure'); });

      const res = await request(app)
        .patch('/PAY001')
        .send({ status: 'approved' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ------------------------------------------
  // POST /:id/approve - Approve single payment
  // ------------------------------------------
  describe('POST /:id/approve - approve single payment', () => {
    test('returns 404 when payment not found', async () => {
      setupPrepare({ get: undefined });

      const res = await request(app)
        .post('/PAY_MISSING/approve')
        .send();

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Payment not found/i);
    });

    test('returns 400 when payment is not pending', async () => {
      setupPrepare({ get: { id: 'PAY001', status: 'approved' } });

      const res = await request(app)
        .post('/PAY001/approve')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Cannot approve/);
      expect(res.body.error).toMatch(/approved/);
    });

    test('returns 400 when payment is already paid', async () => {
      setupPrepare({ get: { id: 'PAY001', status: 'paid' } });

      const res = await request(app)
        .post('/PAY001/approve')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Cannot approve.*paid/);
    });

    test('returns 400 when payment is rejected', async () => {
      setupPrepare({ get: { id: 'PAY001', status: 'rejected' } });

      const res = await request(app)
        .post('/PAY001/approve')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Cannot approve.*rejected/);
    });

    test('approves a pending payment successfully', async () => {
      const payment = { id: 'PAY001', status: 'pending', total_amount: 100 };
      const approvedPayment = { ...payment, status: 'approved' };

      setupPrepareSequence([
        { get: payment },           // SELECT payment
        { run: { changes: 1 } },    // UPDATE status to approved
        { get: approvedPayment },   // SELECT updated payment
      ]);

      const res = await request(app)
        .post('/PAY001/approve')
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Payment approved/);
    });

    test('returns 500 on database error', async () => {
      mockPrepare.mockImplementation(() => { throw new Error('DB failure'); });

      const res = await request(app)
        .post('/PAY001/approve')
        .send();

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ------------------------------------------
  // POST /:id/reject - Reject single payment
  // ------------------------------------------
  describe('POST /:id/reject - reject single payment', () => {
    test('returns 404 when payment not found', async () => {
      setupPrepare({ get: undefined });

      const res = await request(app)
        .post('/PAY_MISSING/reject')
        .send();

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Payment not found/i);
    });

    test('returns 400 when payment is not pending', async () => {
      setupPrepare({ get: { id: 'PAY001', status: 'approved' } });

      const res = await request(app)
        .post('/PAY001/reject')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Cannot reject.*approved/);
    });

    test('rejects a pending payment without reason', async () => {
      const payment = { id: 'PAY001', status: 'pending', total_amount: 100 };
      const rejectedPayment = { ...payment, status: 'rejected' };

      setupPrepareSequence([
        { get: payment },
        { run: { changes: 1 } },
        { get: rejectedPayment },
      ]);

      const res = await request(app)
        .post('/PAY001/reject')
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Payment rejected/);
    });

    test('rejects a pending payment with a reason', async () => {
      const payment = { id: 'PAY001', status: 'pending', total_amount: 100 };
      const rejectedPayment = { ...payment, status: 'rejected', notes: 'Duplicate entry' };

      setupPrepareSequence([
        { get: payment },
        { run: { changes: 1 } },
        { get: rejectedPayment },
      ]);

      const res = await request(app)
        .post('/PAY001/reject')
        .send({ reason: 'Duplicate entry' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Payment rejected/);
    });

    test('returns 500 on database error', async () => {
      mockPrepare.mockImplementation(() => { throw new Error('DB failure'); });

      const res = await request(app)
        .post('/PAY001/reject')
        .send();

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ------------------------------------------
  // POST /:id/paid - Mark single payment as paid
  // ------------------------------------------
  describe('POST /:id/paid - mark single payment as paid', () => {
    test('returns 404 when payment not found', async () => {
      setupPrepare({ get: undefined });

      const res = await request(app)
        .post('/PAY_MISSING/paid')
        .send();

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Payment not found/i);
    });

    test('returns 400 when payment is not approved', async () => {
      setupPrepare({ get: { id: 'PAY001', status: 'pending' } });

      const res = await request(app)
        .post('/PAY001/paid')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Cannot mark as paid/);
      expect(res.body.error).toMatch(/pending/);
      expect(res.body.error).toMatch(/must be 'approved'/);
    });

    test('returns 400 when payment is already paid', async () => {
      setupPrepare({ get: { id: 'PAY001', status: 'paid' } });

      const res = await request(app)
        .post('/PAY001/paid')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Cannot mark as paid/);
    });

    test('returns 400 when payment is rejected', async () => {
      setupPrepare({ get: { id: 'PAY001', status: 'rejected' } });

      const res = await request(app)
        .post('/PAY001/paid')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Cannot mark as paid/);
    });

    test('marks an approved payment as paid with transaction_id', async () => {
      const payment = { id: 'PAY001', candidate_id: 'C001', total_amount: 250, status: 'approved' };
      const paidPayment = { ...payment, status: 'paid', transaction_id: 'TXN_789', paid_at: '2026-03-19' };

      setupPrepareSequence([
        { get: payment },          // SELECT payment
        { run: { changes: 1 } },   // UPDATE payments SET paid
        { run: { changes: 1 } },   // UPDATE candidates earnings
        { get: paidPayment },      // SELECT updated payment
      ]);
      mockTransaction.mockImplementation(fn => fn);

      const res = await request(app)
        .post('/PAY001/paid')
        .send({ transaction_id: 'TXN_789' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Payment marked as paid/);
    });

    test('marks an approved payment as paid without transaction_id', async () => {
      const payment = { id: 'PAY001', candidate_id: 'C001', total_amount: 100, status: 'approved' };
      const paidPayment = { ...payment, status: 'paid', paid_at: '2026-03-19' };

      setupPrepareSequence([
        { get: payment },
        { run: { changes: 1 } },
        { run: { changes: 1 } },
        { get: paidPayment },
      ]);
      mockTransaction.mockImplementation(fn => fn);

      const res = await request(app)
        .post('/PAY001/paid')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('uses transaction for atomicity (payment + earnings update)', async () => {
      const payment = { id: 'PAY001', candidate_id: 'C001', total_amount: 100, status: 'approved' };

      setupPrepareSequence([
        { get: payment },
        { run: { changes: 1 } },
        { run: { changes: 1 } },
        { get: { ...payment, status: 'paid' } },
      ]);
      mockTransaction.mockImplementation(fn => fn);

      await request(app)
        .post('/PAY001/paid')
        .send({ transaction_id: 'TXN_001' });

      expect(mockTransaction).toHaveBeenCalled();
    });

    test('returns 500 on transaction failure', async () => {
      const payment = { id: 'PAY001', candidate_id: 'C001', total_amount: 100, status: 'approved' };

      setupPrepare({ get: payment });
      mockTransaction.mockImplementation(() => { throw new Error('Transaction failed'); });

      const res = await request(app)
        .post('/PAY001/paid')
        .send({ transaction_id: 'TXN_001' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ------------------------------------------
  // POST /:id/request-withdrawal - Request withdrawal
  // ------------------------------------------
  describe('POST /:id/request-withdrawal - request withdrawal', () => {
    test('returns 404 when payment not found', async () => {
      setupPrepare({ get: undefined });

      const res = await request(app)
        .post('/PAY_MISSING/request-withdrawal')
        .send();

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Payment not found/i);
    });

    test('returns 400 when payment is not approved', async () => {
      setupPrepare({ get: { id: 'PAY001', status: 'pending' } });

      const res = await request(app)
        .post('/PAY001/request-withdrawal')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/must be approved/i);
    });

    test('returns 400 when payment is paid (not approved)', async () => {
      setupPrepare({ get: { id: 'PAY001', status: 'paid' } });

      const res = await request(app)
        .post('/PAY001/request-withdrawal')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/must be approved/i);
    });

    test('returns 400 when payment is rejected', async () => {
      setupPrepare({ get: { id: 'PAY001', status: 'rejected' } });

      const res = await request(app)
        .post('/PAY001/request-withdrawal')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/must be approved/i);
    });

    test('successfully requests withdrawal for approved payment', async () => {
      const payment = { id: 'PAY001', status: 'approved', total_amount: 100 };
      const updatedPayment = { ...payment, withdrawal_requested: 1, withdrawal_requested_at: '2026-03-19' };

      setupPrepareSequence([
        { get: payment },           // SELECT payment
        { run: { changes: 1 } },    // UPDATE withdrawal_requested
        { get: updatedPayment },    // SELECT updated payment
      ]);

      const res = await request(app)
        .post('/PAY001/request-withdrawal')
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.withdrawal_requested).toBe(1);
    });

    test('sets withdrawal_requested_at timestamp', async () => {
      const payment = { id: 'PAY001', status: 'approved', total_amount: 100 };

      setupPrepareSequence([
        { get: payment },
        { run: { changes: 1 } },
        { get: { ...payment, withdrawal_requested: 1 } },
      ]);

      await request(app)
        .post('/PAY001/request-withdrawal')
        .send();

      // Verify the UPDATE SQL sets both fields
      const updateSql = mockPrepare.mock.calls[1][0];
      expect(updateSql).toMatch(/withdrawal_requested = 1/);
      expect(updateSql).toMatch(/withdrawal_requested_at = CURRENT_TIMESTAMP/);
    });

    test('returns 500 on database error', async () => {
      mockPrepare.mockImplementation(() => { throw new Error('DB failure'); });

      const res = await request(app)
        .post('/PAY001/request-withdrawal')
        .send();

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
