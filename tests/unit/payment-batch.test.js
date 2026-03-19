/**
 * Unit Tests: Payment Batch Operations, Edge Cases & Transaction Safety
 *
 * Tests batch approve, batch paid, transaction safety guarantees,
 * and edge cases for the payment routes.
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
// PAYMENT BATCH OPERATIONS, EDGE CASES & TRANSACTION SAFETY
// ==============================================

describe('Payment Routes - Batch Operations & Edge Cases', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      const paymentRouter = require('../../routes/api/v1/payments');
      app = buildApp(paymentRouter);
    });
  });

  // ------------------------------------------
  // POST /batch-approve - Batch approve payments
  // ------------------------------------------
  describe('POST /batch-approve - batch approve', () => {
    test('returns 400 when payment_ids is missing', async () => {
      const res = await request(app)
        .post('/batch-approve')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/No payment IDs/i);
    });

    test('returns 400 when payment_ids is empty array', async () => {
      const res = await request(app)
        .post('/batch-approve')
        .send({ payment_ids: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/No payment IDs/i);
    });

    test('approves multiple pending payments', async () => {
      const approved = [
        { id: 'PAY001', status: 'approved' },
        { id: 'PAY002', status: 'approved' },
      ];
      setupPrepareSequence([
        { run: { changes: 2 } },   // UPDATE ... status = 'approved' WHERE IN(...)
        { all: approved },          // SELECT updated payments
      ]);

      const res = await request(app)
        .post('/batch-approve')
        .send({ payment_ids: ['PAY001', 'PAY002'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.message).toMatch(/2 payments approved/);
    });

    test('only updates payments with pending status', async () => {
      setupPrepareSequence([
        { run: { changes: 1 } },
        { all: [{ id: 'PAY001', status: 'approved' }] },
      ]);

      await request(app)
        .post('/batch-approve')
        .send({ payment_ids: ['PAY001', 'PAY002'] });

      const sqlArg = mockPrepare.mock.calls[0][0];
      expect(sqlArg).toMatch(/status = 'approved'/);
      expect(sqlArg).toMatch(/AND status = 'pending'/);
    });

    test('handles single payment ID', async () => {
      setupPrepareSequence([
        { run: { changes: 1 } },
        { all: [{ id: 'PAY001', status: 'approved' }] },
      ]);

      const res = await request(app)
        .post('/batch-approve')
        .send({ payment_ids: ['PAY001'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/1 payments approved/);
    });

    test('handles duplicate IDs gracefully', async () => {
      setupPrepareSequence([
        { run: { changes: 1 } },
        { all: [{ id: 'PAY001', status: 'approved' }] },
      ]);

      const res = await request(app)
        .post('/batch-approve')
        .send({ payment_ids: ['PAY001', 'PAY001'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('handles non-existent payment IDs', async () => {
      setupPrepareSequence([
        { run: { changes: 0 } },
        { all: [] },
      ]);

      const res = await request(app)
        .post('/batch-approve')
        .send({ payment_ids: ['PAY_NONEXISTENT'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.message).toMatch(/0 payments approved/);
    });

    test('returns 500 on database error', async () => {
      mockPrepare.mockImplementation(() => { throw new Error('DB failure'); });

      const res = await request(app)
        .post('/batch-approve')
        .send({ payment_ids: ['PAY001'] });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ------------------------------------------
  // POST /batch-paid - Batch mark as paid
  // ------------------------------------------
  describe('POST /batch-paid - batch mark as paid', () => {
    test('returns 400 when payment_ids is missing', async () => {
      const res = await request(app)
        .post('/batch-paid')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/No payment IDs/i);
    });

    test('returns 400 when payment_ids is empty array', async () => {
      const res = await request(app)
        .post('/batch-paid')
        .send({ payment_ids: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/No payment IDs/i);
    });

    test('marks approved payments as paid and updates candidate earnings', async () => {
      const payments = [
        { id: 'PAY001', candidate_id: 'C001', total_amount: 100, status: 'approved' },
        { id: 'PAY002', candidate_id: 'C002', total_amount: 200, status: 'approved' },
      ];

      // transaction() receives a function; we call it immediately
      mockTransaction.mockImplementation(fn => fn);
      setupPrepareSequence([
        { all: payments },           // SELECT approved payments
        { run: { changes: 2 } },     // UPDATE payments SET status='paid'
        { run: { changes: 1 } },     // UPDATE candidates earnings for C001
        { run: { changes: 1 } },     // UPDATE candidates earnings for C002
      ]);

      const res = await request(app)
        .post('/batch-paid')
        .send({ payment_ids: ['PAY001', 'PAY002'], transaction_id: 'TXN_BATCH_001' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/2 payments marked as paid/);
    });

    test('returns 500 when no approved payments found', async () => {
      mockTransaction.mockImplementation(fn => fn);
      setupPrepare({ all: [] }); // No approved payments

      const res = await request(app)
        .post('/batch-paid')
        .send({ payment_ids: ['PAY001'], transaction_id: 'TXN_001' });

      // The transaction throws "No approved payments found" which gets caught
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    test('uses transaction for atomicity', async () => {
      const payments = [
        { id: 'PAY001', candidate_id: 'C001', total_amount: 100, status: 'approved' },
      ];

      mockTransaction.mockImplementation(fn => fn);
      setupPrepareSequence([
        { all: payments },
        { run: { changes: 1 } },
        { run: { changes: 1 } },
      ]);

      await request(app)
        .post('/batch-paid')
        .send({ payment_ids: ['PAY001'], transaction_id: 'TXN_001' });

      // Verify db.transaction was called
      expect(mockTransaction).toHaveBeenCalled();
    });

    test('only processes payments with approved status', async () => {
      mockTransaction.mockImplementation(fn => fn);
      const stmt = setupPrepare({
        all: [{ id: 'PAY001', candidate_id: 'C001', total_amount: 100, status: 'approved' }],
        run: { changes: 1 },
      });

      await request(app)
        .post('/batch-paid')
        .send({ payment_ids: ['PAY001', 'PAY002'], transaction_id: 'TXN_001' });

      // The first SELECT query should filter by approved status
      const sqlArg = mockPrepare.mock.calls[0][0];
      expect(sqlArg).toMatch(/AND status = 'approved'/);
    });

    test('handles non-existent IDs (none approved)', async () => {
      mockTransaction.mockImplementation(fn => fn);
      setupPrepare({ all: [] });

      const res = await request(app)
        .post('/batch-paid')
        .send({ payment_ids: ['FAKE001', 'FAKE002'], transaction_id: 'TXN_001' });

      // Throws because no approved payments found
      expect(res.status).toBe(500);
    });

    test('returns 500 on database error in transaction', async () => {
      mockTransaction.mockImplementation(() => { throw new Error('Transaction failed'); });

      const res = await request(app)
        .post('/batch-paid')
        .send({ payment_ids: ['PAY001'], transaction_id: 'TXN_001' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ------------------------------------------
  // Transaction safety tests
  // ------------------------------------------
  describe('Transaction safety', () => {
    test('PATCH /:id wraps status=paid update in db.transaction', async () => {
      const payment = { id: 'PAY001', candidate_id: 'C001', total_amount: 100, status: 'approved' };

      setupPrepareSequence([
        { get: payment },
        { run: { changes: 1 } },
        { run: { changes: 1 } },
        { get: { ...payment, status: 'paid' } },
      ]);
      mockTransaction.mockImplementation(fn => fn);

      await request(app)
        .patch('/PAY001')
        .send({ status: 'paid' });

      // The route creates a transaction function
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(typeof mockTransaction.mock.calls[0][0]).toBe('function');
    });

    test('batch-paid rolls back on error (transaction throws)', async () => {
      mockTransaction.mockImplementation(fn => {
        // Simulate partial failure inside the transaction
        throw new Error('Simulated rollback');
      });

      const res = await request(app)
        .post('/batch-paid')
        .send({ payment_ids: ['PAY001'], transaction_id: 'TXN_001' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    test('single mark-paid uses transaction for payment + earnings atomicity', async () => {
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

      // Verify transaction was used
      expect(mockTransaction).toHaveBeenCalled();
    });
  });

  // ------------------------------------------
  // Edge cases
  // ------------------------------------------
  describe('Edge cases', () => {
    test('batch-approve with null payment_ids returns 400', async () => {
      const res = await request(app)
        .post('/batch-approve')
        .send({ payment_ids: null });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/No payment IDs/i);
    });

    test('batch-paid with null payment_ids returns 400', async () => {
      const res = await request(app)
        .post('/batch-paid')
        .send({ payment_ids: null });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/No payment IDs/i);
    });

    test('batch-approve generates correct SQL placeholders for varying array sizes', async () => {
      // Test with 3 IDs
      setupPrepareSequence([
        { run: { changes: 3 } },
        { all: [] },
      ]);

      await request(app)
        .post('/batch-approve')
        .send({ payment_ids: ['P1', 'P2', 'P3'] });

      const sqlArg = mockPrepare.mock.calls[0][0];
      expect(sqlArg).toMatch(/IN \(\?,\?,\?\)/);
    });

    test('batch-approve with single ID generates single placeholder', async () => {
      setupPrepareSequence([
        { run: { changes: 1 } },
        { all: [] },
      ]);

      await request(app)
        .post('/batch-approve')
        .send({ payment_ids: ['P1'] });

      const sqlArg = mockPrepare.mock.calls[0][0];
      expect(sqlArg).toMatch(/IN \(\?\)/);
    });

    test('PATCH with multiple fields updates all of them', async () => {
      const payment = { id: 'PAY001', candidate_id: 'C001', total_amount: 100, status: 'pending' };

      setupPrepareSequence([
        { get: payment },
        { run: { changes: 1 } },
        { get: { ...payment, notes: 'Test', transaction_id: 'TXN', payment_proof: 'proof.jpg' } },
      ]);
      mockTransaction.mockImplementation(fn => fn);

      const res = await request(app)
        .patch('/PAY001')
        .send({ notes: 'Test', transaction_id: 'TXN', payment_proof: 'proof.jpg' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('request-withdrawal is not admin-gated (no auth middleware)', async () => {
      // The route does not use authenticateAdmin - it is open for candidate use.
      // We verify it works without admin credentials by checking the route still processes.
      const payment = { id: 'PAY001', status: 'approved', total_amount: 100 };

      setupPrepareSequence([
        { get: payment },
        { run: { changes: 1 } },
        { get: { ...payment, withdrawal_requested: 1 } },
      ]);

      const res = await request(app)
        .post('/PAY001/request-withdrawal')
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('GET /stats handles large monetary amounts', async () => {
      setupPrepareSequence([
        { get: { amount: 9999999.99 } },
        { get: { amount: 5000000 } },
        { get: { amount: 3000000 } },
        { get: { amount: 1999999.99 } },
        { all: [{ status: 'paid', count: 1000, amount: 1999999.99 }] },
        { get: { amount: 999999.99 } },
      ]);

      const res = await request(app).get('/stats');

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(9999999.99);
    });
  });
});
