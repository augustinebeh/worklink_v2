/**
 * Unit Tests: Training & Analytics Routes
 *
 * Tests training CRUD, enrollment, completion with score validation,
 * XP award logic, and analytics endpoints (financial dashboard,
 * retention overview) with auth requirements.
 */

const express = require('express');
const request = require('supertest');

// ============================================
// MOCK SETUP
// ============================================

// Per-test mock state
let mockRows = {};
let mockRunResult = { changes: 1 };

/**
 * Build a mock statement object. Each call to db.prepare(sql) returns
 * an object with .get(), .all(), .run() methods whose return values
 * are determined by matching the sql string.
 */
function makeMockStatement(sql) {
  return {
    get: jest.fn((...args) => {
      const s = sql.replace(/\s+/g, ' ').trim();

      // --- Auth middleware: candidate lookup ---
      if (s.includes('FROM candidates') && s.includes('WHERE id = ?')) {
        // If the auth middleware is looking up a candidate user, return it
        // so the candidate is considered authenticated.
        return mockRows.authCandidate ?? {
          id: 'C001', name: 'Candidate', email: 'c@test.com',
          role: 'candidate', type: 'candidate', status: 'active',
        };
      }

      // --- Training routes ---
      if (s.includes('FROM training WHERE id')) return mockRows.training ?? null;
      if (s.includes('FROM candidate_training') && s.includes('COUNT(*)')) return { total: mockRows.total ?? 0 };
      if (s.includes('FROM training') && s.includes('COUNT(*)')) return { total: mockRows.total ?? 0 };

      // --- Candidates for XP award path ---
      if (s.includes('certifications FROM candidates')) return mockRows.candidate ?? null;

      // --- Analytics: financial dashboard ---
      if (s.includes('COALESCE(SUM(gross_revenue), 0) as total_revenue')) return mockRows.currentEarnings ?? {
        total_revenue: 0, total_candidate_pay: 0, total_gross_profit: 0,
        total_incentives: 0, total_deployments: 0, total_hours: 0,
      };
      if (s.includes('SUM(d.gross_revenue)') && s.includes('job_date LIKE')) return mockRows.monthEarnings ?? {
        revenue: 0, profit: 0, incentives: 0, deployments: 0,
      };
      if (s.includes('incentive_percent_of_profit')) return mockRows.incentiveAnalysis ?? {
        total_incentives: 0, total_gross_profit: 0, incentive_percent_of_profit: 0,
        deployments_with_incentive: 0, total_deployments: 0,
      };
      if (s.includes('AVG(charge_rate)')) return mockRows.avgRates ?? {
        avg_charge_rate: 0, avg_pay_rate: 0, avg_spread: 0, avg_margin_percent: 0,
      };

      // --- Analytics: incentives totals ---
      if (s.includes('SUM(incentive_amount) as total_paid')) return mockRows.incentiveTotals ?? {
        total_paid: 0, times_paid: 0,
      };

      // --- Analytics: retention overview ---
      if (s.includes('dau')) return mockRows.activeUsers ?? { dau: 0, wau: 0, mau: 0, total_active: 0 };
      if (s.includes('active_streaks')) return mockRows.streakMetrics ?? {
        active_streaks: 0, at_risk_streaks: 0, avg_streak_length: 0, max_streak: 0,
      };
      if (s.includes('notification_effectiveness')) return mockRows.notificationMetrics ?? {
        total_sent: 0, total_opened: 0, total_clicked: 0, total_responded: 0,
        open_rate: 0, response_rate: 0,
      };
      if (s.includes('retained_week1')) return mockRows.retention ?? {
        retained_week1: 0, eligible_week1: 0, retained_month1: 0, eligible_month1: 0,
      };

      // --- Analytics: dashboard aggregate .get() calls ---
      if (s.includes('COUNT(*)')) return { count: mockRows.count ?? 0, total: mockRows.total ?? 0 };
      if (s.includes('COALESCE(SUM(')) return { total: 0 };

      // Generic fallback
      return mockRows.generic ?? { total: 0, count: 0 };
    }),
    all: jest.fn((...args) => mockRows.allResults ?? []),
    run: jest.fn((...args) => mockRunResult),
  };
}

const mockPrepare = jest.fn((sql) => makeMockStatement(sql));

const mockTransaction = jest.fn((fn) => {
  // db.transaction returns a wrapper function. When called, it executes fn.
  return fn;
});

const mockDb = {
  prepare: mockPrepare,
  transaction: mockTransaction,
};

// Mock modules
jest.mock('../../db', () => ({ db: mockDb }));

jest.mock('../../db/utils/db-helpers', () => ({
  safeJsonParse: (value, fallback = null) => {
    if (!value) return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
  },
}));

jest.mock('../../shared/constants', () => ({
  getSGDateString: jest.fn(() => '2026-03-19'),
}));

jest.mock('../../utils/structured-logger', () => ({
  createLogger: () => ({
    info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
  }),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
}));

// Set JWT_SECRET before requiring auth
process.env.JWT_SECRET = 'test-secret-for-training-analytics';

const { generateToken, generateAdminToken } = require('../../middleware/auth');

// ============================================
// APP SETUP
// ============================================

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/training', require('../../routes/api/v1/training'));
  app.use('/analytics', require('../../routes/api/v1/analytics'));
  return app;
}

let app;
let adminToken;
let candidateToken;

beforeAll(() => {
  adminToken = generateAdminToken({ id: 'ADMIN001', email: 'admin@worklink.sg', name: 'Admin' });
  candidateToken = generateToken({ id: 'C001', email: 'c@test.com', name: 'Candidate' });
});

beforeEach(() => {
  jest.clearAllMocks();
  // Re-register default implementation after clearAllMocks
  mockPrepare.mockImplementation((sql) => makeMockStatement(sql));
  mockTransaction.mockImplementation((fn) => fn);
  mockRows = {};
  mockRunResult = { changes: 1 };
  app = createApp();
});

// ============================================
// TRAINING: LIST COURSES
// ============================================

describe('GET /training - list courses', () => {
  test('returns paginated course list', async () => {
    mockRows.total = 2;
    mockRows.allResults = [
      { id: 'TRN1', title: 'Safety 101', description: 'Basic safety' },
      { id: 'TRN2', title: 'Onboarding', description: 'New hire guide' },
    ];

    const res = await request(app).get('/training');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(20);
  });

  test('accepts custom page and limit query params', async () => {
    mockRows.total = 50;
    mockRows.allResults = [{ id: 'TRN3', title: 'Course 3' }];

    const res = await request(app).get('/training?page=3&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(3);
    expect(res.body.pagination.limit).toBe(10);
    expect(res.body.pagination.pages).toBe(5);
  });

  test('supports search filter', async () => {
    mockRows.total = 1;
    mockRows.allResults = [{ id: 'TRN1', title: 'Safety 101' }];

    const res = await request(app).get('/training?search=safety');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const prepareCalls = mockPrepare.mock.calls.map(c => c[0]);
    const hasSearchQuery = prepareCalls.some(q => q.includes('LIKE'));
    expect(hasSearchQuery).toBe(true);
  });

  test('returns empty list when no courses exist', async () => {
    mockRows.total = 0;
    mockRows.allResults = [];

    const res = await request(app).get('/training');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  test('does not require authentication', async () => {
    mockRows.total = 0;
    mockRows.allResults = [];

    const res = await request(app).get('/training');
    expect(res.status).toBe(200);
  });

  test('returns 500 on database error', async () => {
    mockPrepare.mockImplementation(() => { throw new Error('DB failure'); });

    const res = await request(app).get('/training');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// TRAINING: CREATE COURSE
// ============================================

describe('POST /training - create course', () => {
  test('creates a course with valid data and admin auth', async () => {
    mockRows.training = { id: 'TRN_NEW', title: 'New Course', xp_reward: 100 };

    const res = await request(app)
      .post('/training')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'New Course', description: 'A new course', duration_minutes: 60, xp_reward: 200 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('rejects missing title', async () => {
    const res = await request(app)
      .post('/training')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'No title provided' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title is required/i);
  });

  test('rejects empty string title', async () => {
    const res = await request(app)
      .post('/training')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title is required/i);
  });

  test('rejects whitespace-only title', async () => {
    const res = await request(app)
      .post('/training')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title is required/i);
  });

  test('rejects non-string title (number)', async () => {
    const res = await request(app)
      .post('/training')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 12345 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title is required/i);
  });

  test('applies default duration_minutes and xp_reward', async () => {
    mockRows.training = { id: 'TRN_DEF', title: 'Defaults', duration_minutes: 30, xp_reward: 100 };

    const res = await request(app)
      .post('/training')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Defaults' });

    expect(res.status).toBe(201);
    const insertCall = mockPrepare.mock.calls.find(c =>
      c[0].includes('INSERT INTO training')
    );
    expect(insertCall).toBeDefined();
  });

  test('requires admin authentication', async () => {
    const res = await request(app)
      .post('/training')
      .send({ title: 'Unauthorized Course' });

    expect(res.status).toBe(401);
  });

  test('rejects candidate token (non-admin)', async () => {
    const res = await request(app)
      .post('/training')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ title: 'Forbidden Course' });

    expect(res.status).toBe(403);
  });
});

// ============================================
// TRAINING: ENROLL
// ============================================

describe('POST /training/:id/enroll', () => {
  test('enrolls a candidate with valid token', async () => {
    const res = await request(app)
      .post('/training/TRN1/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 'C001' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('inserts enrollment with status enrolled', async () => {
    await request(app)
      .post('/training/TRN1/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 'C001' });

    const insertCall = mockPrepare.mock.calls.find(c => c[0].includes('INSERT INTO candidate_training'));
    expect(insertCall).toBeDefined();
    expect(insertCall[0]).toContain("'enrolled'");
  });

  test('requires authentication', async () => {
    const res = await request(app)
      .post('/training/TRN1/enroll')
      .send({ candidate_id: 'C001' });

    expect(res.status).toBe(401);
  });

  test('returns 500 on database error during enrollment', async () => {
    mockPrepare.mockImplementation((sql) => {
      // Auth-related candidate lookup succeeds
      if (sql.includes('candidates') && sql.includes('SELECT')) {
        return {
          get: jest.fn(() => ({
            id: 'ADMIN001', name: 'Admin', email: 'admin@worklink.sg',
            role: 'admin', type: 'admin', status: 'active',
          })),
          all: jest.fn(() => []),
          run: jest.fn(),
        };
      }
      // INSERT fails
      if (sql.includes('INSERT INTO candidate_training')) {
        return {
          get: jest.fn(),
          all: jest.fn(),
          run: jest.fn(() => { throw new Error('DB insert failed'); }),
        };
      }
      return makeMockStatement(sql);
    });

    const res = await request(app)
      .post('/training/TRN1/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 'C001' });

    expect(res.status).toBe(500);
  });
});

// ============================================
// TRAINING: COMPLETE (SCORE VALIDATION)
// ============================================

describe('POST /training/:id/complete', () => {
  beforeEach(() => {
    mockRows.training = {
      id: 'TRN1', title: 'Safety 101', xp_reward: 150,
      pass_score: 70, certification_name: 'Safety Cert',
    };
    mockRows.candidate = { id: 'C001', certifications: '[]' };
  });

  test('completes training with passing score and awards XP', async () => {
    const res = await request(app)
      .post('/training/TRN1/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 'C001', score: 85 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.passed).toBe(true);
    expect(res.body.xp_awarded).toBe(150);
  });

  test('completes training with failing score and awards 0 XP', async () => {
    const res = await request(app)
      .post('/training/TRN1/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 'C001', score: 50 });

    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(false);
    expect(res.body.xp_awarded).toBe(0);
  });

  test('rejects score below 0', async () => {
    const res = await request(app)
      .post('/training/TRN1/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 'C001', score: -1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/score is required.*between 0 and 100/i);
  });

  test('rejects score above 100', async () => {
    const res = await request(app)
      .post('/training/TRN1/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 'C001', score: 101 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/score is required.*between 0 and 100/i);
  });

  test('rejects missing score', async () => {
    const res = await request(app)
      .post('/training/TRN1/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 'C001' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/score is required/i);
  });

  test('rejects non-numeric score', async () => {
    const res = await request(app)
      .post('/training/TRN1/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 'C001', score: 'excellent' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/score is required/i);
  });

  test('accepts boundary score of 0', async () => {
    const res = await request(app)
      .post('/training/TRN1/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 'C001', score: 0 });

    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(false);
  });

  test('accepts boundary score of 100', async () => {
    const res = await request(app)
      .post('/training/TRN1/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 'C001', score: 100 });

    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(true);
  });

  test('accepts exact pass score as passing', async () => {
    const res = await request(app)
      .post('/training/TRN1/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 'C001', score: 70 });

    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(true);
  });

  test('fails score one below pass threshold', async () => {
    const res = await request(app)
      .post('/training/TRN1/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 'C001', score: 69 });

    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(false);
  });

  test('returns 404 for non-existent training', async () => {
    mockRows.training = null;

    const res = await request(app)
      .post('/training/FAKE/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 'C001', score: 80 });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/training not found/i);
  });

  test('rejects missing candidate_id', async () => {
    const res = await request(app)
      .post('/training/TRN1/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ score: 80 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/candidate_id is required/i);
  });

  test('rejects non-string candidate_id', async () => {
    const res = await request(app)
      .post('/training/TRN1/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 123, score: 80 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/candidate_id is required/i);
  });

  test('requires authentication', async () => {
    const res = await request(app)
      .post('/training/TRN1/complete')
      .send({ candidate_id: 'C001', score: 80 });

    expect(res.status).toBe(401);
  });
});

// ============================================
// TRAINING: XP AWARD TRANSACTION
// ============================================

describe('XP award on training completion', () => {
  beforeEach(() => {
    mockRows.training = {
      id: 'TRN1', title: 'Safety 101', xp_reward: 200,
      pass_score: 60, certification_name: 'Safety Cert',
    };
    mockRows.candidate = { id: 'C001', certifications: '[]' };
  });

  test('uses db.transaction for atomic XP award', async () => {
    await request(app)
      .post('/training/TRN1/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 'C001', score: 90 });

    expect(mockTransaction).toHaveBeenCalled();
  });

  test('does not create transaction when score fails', async () => {
    await request(app)
      .post('/training/TRN1/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 'C001', score: 30 });

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  test('records xp_transaction with training reason on pass', async () => {
    await request(app)
      .post('/training/TRN1/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 'C001', score: 80 });

    const xpInsertCall = mockPrepare.mock.calls.find(c =>
      c[0].includes('INSERT INTO xp_transactions')
    );
    expect(xpInsertCall).toBeDefined();
    expect(xpInsertCall[0]).toContain("'training'");
  });

  test('updates candidate XP on pass', async () => {
    await request(app)
      .post('/training/TRN1/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidate_id: 'C001', score: 80 });

    const xpUpdateCall = mockPrepare.mock.calls.find(c =>
      c[0].includes('UPDATE candidates SET xp = xp +')
    );
    expect(xpUpdateCall).toBeDefined();
  });
});

// ============================================
// TRAINING: UPDATE AND DELETE
// ============================================

describe('PUT /training/:id - update course', () => {
  test('updates a course with admin auth', async () => {
    mockRows.training = { id: 'TRN1', title: 'Updated' };

    const res = await request(app)
      .put('/training/TRN1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Updated', description: 'Updated desc' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('requires admin authentication', async () => {
    const res = await request(app)
      .put('/training/TRN1')
      .send({ title: 'Updated' });

    expect(res.status).toBe(401);
  });
});

describe('DELETE /training/:id - delete course', () => {
  test('deletes a course with admin auth', async () => {
    const res = await request(app)
      .delete('/training/TRN1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('requires admin authentication', async () => {
    const res = await request(app)
      .delete('/training/TRN1');

    expect(res.status).toBe(401);
  });
});

// ============================================
// TRAINING: CANDIDATE PROGRESS
// ============================================

describe('GET /training/candidate/:candidateId', () => {
  test('returns candidate training progress with pagination', async () => {
    mockRows.total = 1;
    mockRows.allResults = [
      { candidate_id: 'C001', training_id: 'TRN1', status: 'enrolled', title: 'Safety 101' },
    ];

    const res = await request(app).get('/training/candidate/C001');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toBeDefined();
  });

  test('supports status filter query param', async () => {
    mockRows.total = 0;
    mockRows.allResults = [];

    await request(app).get('/training/candidate/C001?status=completed');

    const prepareCalls = mockPrepare.mock.calls.map(c => c[0]);
    const hasStatusFilter = prepareCalls.some(q => q.includes('ct.status = ?'));
    expect(hasStatusFilter).toBe(true);
  });

  test('does not require authentication', async () => {
    mockRows.total = 0;
    mockRows.allResults = [];

    const res = await request(app).get('/training/candidate/C001');
    expect(res.status).toBe(200);
  });
});

// ============================================
// ANALYTICS: FINANCIAL DASHBOARD
// ============================================

describe('GET /analytics/financial/dashboard', () => {
  test('returns financial dashboard data with admin auth', async () => {
    mockRows.allResults = [];
    mockRows.currentEarnings = {
      total_revenue: 10000, total_candidate_pay: 7000,
      total_gross_profit: 3000, total_incentives: 500,
      total_deployments: 20, total_hours: 160,
    };
    mockRows.monthEarnings = { revenue: 2000, profit: 600, incentives: 100, deployments: 5 };

    const res = await request(app)
      .get('/analytics/financial/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.currentEarnings).toBeDefined();
    expect(res.body.data.projected).toBeDefined();
    expect(res.body.data.monthlyTrend).toBeDefined();
  });

  test('calculates net profit correctly', async () => {
    mockRows.allResults = [];
    mockRows.currentEarnings = {
      total_revenue: 10000, total_candidate_pay: 7000,
      total_gross_profit: 3000, total_incentives: 500,
      total_deployments: 20, total_hours: 160,
    };

    const res = await request(app)
      .get('/analytics/financial/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.currentEarnings.net_profit).toBe(2500);
  });

  test('requires admin authentication', async () => {
    const res = await request(app).get('/analytics/financial/dashboard');
    expect(res.status).toBe(401);
  });

  test('rejects candidate token', async () => {
    const res = await request(app)
      .get('/analytics/financial/dashboard')
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(res.status).toBe(403);
  });

  test('returns 500 on database error', async () => {
    mockPrepare.mockImplementation((sql) => {
      // Let auth-path lookups succeed (admin token does not hit DB for ADMIN001, so
      // any prepare call at this point is from the route handler itself).
      throw new Error('DB failure');
    });

    const res = await request(app)
      .get('/analytics/financial/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// ANALYTICS: RETENTION OVERVIEW
// ============================================

describe('GET /analytics/retention/overview', () => {
  test('returns retention metrics with admin auth', async () => {
    mockRows.activeUsers = { dau: 10, wau: 50, mau: 120, total_active: 200 };
    mockRows.streakMetrics = { active_streaks: 30, at_risk_streaks: 5, avg_streak_length: 4.5, max_streak: 21 };
    mockRows.notificationMetrics = {
      total_sent: 1000, total_opened: 600, total_clicked: 300,
      total_responded: 200, open_rate: 60.0, response_rate: 20.0,
    };
    mockRows.retention = {
      retained_week1: 80, eligible_week1: 100,
      retained_month1: 60, eligible_month1: 100,
    };

    const res = await request(app)
      .get('/analytics/retention/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary.dau).toBe(10);
    expect(res.body.data.summary.wau).toBe(50);
    expect(res.body.data.summary.mau).toBe(120);
    expect(res.body.data.summary.retentionRate7d).toBe(80.0);
    expect(res.body.data.summary.retentionRate30d).toBe(60.0);
    expect(res.body.data.metrics.streaks).toBeDefined();
    expect(res.body.data.metrics.notifications).toBeDefined();
  });

  test('returns correct streak metrics', async () => {
    mockRows.activeUsers = { dau: 5, wau: 20, mau: 50, total_active: 100 };
    mockRows.streakMetrics = { active_streaks: 15, at_risk_streaks: 3, avg_streak_length: 7.2, max_streak: 30 };
    mockRows.notificationMetrics = {
      total_sent: 0, total_opened: 0, total_clicked: 0,
      total_responded: 0, open_rate: 0, response_rate: 0,
    };
    mockRows.retention = {
      retained_week1: 0, eligible_week1: 0, retained_month1: 0, eligible_month1: 0,
    };

    const res = await request(app)
      .get('/analytics/retention/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.metrics.streaks.active).toBe(15);
    expect(res.body.data.metrics.streaks.atRisk).toBe(3);
    expect(res.body.data.metrics.streaks.maxLength).toBe(30);
  });

  test('requires admin authentication', async () => {
    const res = await request(app).get('/analytics/retention/overview');
    expect(res.status).toBe(401);
  });

  test('rejects candidate token', async () => {
    const res = await request(app)
      .get('/analytics/retention/overview')
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(res.status).toBe(403);
  });

  test('handles zero eligible users without division error', async () => {
    mockRows.activeUsers = { dau: 0, wau: 0, mau: 0, total_active: 0 };
    mockRows.streakMetrics = { active_streaks: 0, at_risk_streaks: 0, avg_streak_length: 0, max_streak: 0 };
    mockRows.notificationMetrics = {
      total_sent: 0, total_opened: 0, total_clicked: 0,
      total_responded: 0, open_rate: 0, response_rate: 0,
    };
    mockRows.retention = {
      retained_week1: 0, eligible_week1: 0,
      retained_month1: 0, eligible_month1: 0,
    };

    const res = await request(app)
      .get('/analytics/retention/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.summary.retentionRate7d).toBe(0);
    expect(res.body.data.summary.retentionRate30d).toBe(0);
  });

  test('returns 500 on database error', async () => {
    mockPrepare.mockImplementation(() => { throw new Error('DB failure'); });

    const res = await request(app)
      .get('/analytics/retention/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// ANALYTICS: DASHBOARD
// ============================================

describe('GET /analytics/dashboard', () => {
  test('returns dashboard analytics with admin auth', async () => {
    const res = await request(app)
      .get('/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('requires admin authentication', async () => {
    const res = await request(app).get('/analytics/dashboard');
    expect(res.status).toBe(401);
  });

  test('rejects candidate token', async () => {
    const res = await request(app)
      .get('/analytics/dashboard')
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(res.status).toBe(403);
  });
});

// ============================================
// ANALYTICS: LEADERBOARD
// ============================================

describe('GET /analytics/leaderboard', () => {
  test('returns leaderboard data with admin auth', async () => {
    mockRows.allResults = [
      { id: 'C001', name: 'Top Worker', xp: 5000, level: 10 },
    ];

    const res = await request(app)
      .get('/analytics/leaderboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('requires admin authentication', async () => {
    const res = await request(app).get('/analytics/leaderboard');
    expect(res.status).toBe(401);
  });
});

// ============================================
// ANALYTICS: RETENTION TEST ENDPOINT
// ============================================

describe('GET /analytics/retention-test', () => {
  test('returns success message with admin auth', async () => {
    const res = await request(app)
      .get('/analytics/retention-test')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/retention endpoint is working/i);
    expect(res.body.timestamp).toBeDefined();
  });

  test('requires admin authentication', async () => {
    const res = await request(app).get('/analytics/retention-test');
    expect(res.status).toBe(401);
  });
});

// ============================================
// ANALYTICS: CHURN RISK
// ============================================

describe('GET /analytics/retention/churn-risk', () => {
  test('returns at-risk users with risk summary', async () => {
    mockRows.allResults = [
      { id: 'C010', name: 'Ghost User', risk_level: 'high', days_since_seen: 10.3, hours_since_checkin: 250.1 },
      { id: 'C011', name: 'Fading User', risk_level: 'medium', days_since_seen: 4.2, hours_since_checkin: 100.5 },
    ];

    const res = await request(app)
      .get('/analytics/retention/churn-risk')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.atRiskUsers).toBeDefined();
    expect(res.body.data.atRiskUsers).toHaveLength(2);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary.high).toBe(1);
    expect(res.body.data.summary.medium).toBe(1);
    expect(res.body.data.summary.total).toBe(2);
  });

  test('requires admin authentication', async () => {
    const res = await request(app).get('/analytics/retention/churn-risk');
    expect(res.status).toBe(401);
  });

  test('returns empty list when no users at risk', async () => {
    mockRows.allResults = [];

    const res = await request(app)
      .get('/analytics/retention/churn-risk')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.atRiskUsers).toHaveLength(0);
    expect(res.body.data.summary.total).toBe(0);
  });
});
