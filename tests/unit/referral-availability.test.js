/**
 * Unit Tests: Referral & Availability Routes
 *
 * Tests referral dashboard, registration, bonus processing,
 * leaderboard, validation, and availability CRUD + matching.
 */

const express = require('express');
const request = require('supertest');

// ---------------------------------------------------------------------------
// Mock: database (must be registered before route modules are required)
// ---------------------------------------------------------------------------

const mockPrepare = jest.fn();
const mockTransaction = jest.fn();

jest.mock('../../db', () => ({
  db: {
    prepare: mockPrepare,
    transaction: mockTransaction,
  },
}));

// ---------------------------------------------------------------------------
// Mock: auth middleware - pass-through for most tests
// ---------------------------------------------------------------------------

jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'ADMIN001', role: 'admin' };
    next();
  },
  authenticateAdmin: (req, res, next) => {
    req.user = { id: 'ADMIN001', role: 'admin' };
    next();
  },
  authenticateAny: (req, res, next) => {
    req.user = { id: 'ADMIN001', role: 'admin' };
    next();
  },
}));

// ---------------------------------------------------------------------------
// Mock: validation middleware - pass-through
// ---------------------------------------------------------------------------

jest.mock('../../middleware/validation', () => ({
  validate: () => (req, res, next) => next(),
  schemas: { referralRegistration: {} },
}));

// ---------------------------------------------------------------------------
// Mock: shared/constants
// ---------------------------------------------------------------------------

jest.mock('../../shared/constants', () => ({
  getSGDateString: () => '2026-03-19',
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a tiny Express app mounting the given router at the supplied prefix. */
function buildApp(prefix, router) {
  const app = express();
  app.use(express.json());
  app.use(prefix, router);
  return app;
}

/** Shorthand: make `db.prepare(sql)` return an object whose `.get`/`.all`/`.run` return the given value. */
function mockQuery(returnValue, method = 'get') {
  const stub = { get: jest.fn(), all: jest.fn(), run: jest.fn() };
  stub[method].mockReturnValue(returnValue);
  mockPrepare.mockReturnValueOnce(stub);
  return stub;
}

/** Chain multiple mockQuery calls for routes that issue multiple queries in sequence. */
function mockQueries(specs) {
  const stubs = [];
  for (const [method, value] of specs) {
    const s = mockQuery(value, method);
    stubs.push(s);
  }
  return stubs;
}

// ---------------------------------------------------------------------------
// Load routers (after mocks are in place)
// ---------------------------------------------------------------------------

const referralRouter = require('../../routes/api/v1/referrals');
const availabilityRouter = require('../../routes/api/v1/availability');

const refApp = buildApp('/referrals', referralRouter);
const availApp = buildApp('/availability', availabilityRouter);

// ---------------------------------------------------------------------------
// Reset mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockPrepare.mockReset();
  mockTransaction.mockReset();
});

// ===========================================================================
//  REFERRAL ROUTES
// ===========================================================================

// ---- GET /referrals/settings ---------------------------------------------

describe('GET /referrals/settings', () => {
  test('returns bonus amount and tiers', async () => {
    mockQuery({ bonus_amount: 25 }, 'get');   // tier1 query
    mockQuery([{ tier_level: 1, bonus_amount: 25 }, { tier_level: 2, bonus_amount: 50 }], 'all'); // allTiers

    const res = await request(refApp).get('/referrals/settings');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bonusAmount).toBe(25);
    expect(res.body.data.tiers).toHaveLength(2);
  });

  test('defaults bonus to 25 when no tier1 row exists', async () => {
    mockQuery(undefined, 'get');          // tier1 missing
    mockQuery([], 'all');                 // no tiers

    const res = await request(refApp).get('/referrals/settings');

    expect(res.status).toBe(200);
    expect(res.body.data.bonusAmount).toBe(25);
  });

  test('returns 500 on database error', async () => {
    mockPrepare.mockImplementationOnce(() => { throw new Error('DB down'); });

    const res = await request(refApp).get('/referrals/settings');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ---- GET /referrals/dashboard/:candidateId --------------------------------

describe('GET /referrals/dashboard/:candidateId', () => {
  const candidateRow = {
    id: 'CND1',
    name: 'Alice',
    referral_code: 'ALIC1234',
    referral_tier: 1,
    total_referral_earnings: 50,
  };

  const referralRows = [
    { id: 'REF1', referrer_id: 'CND1', referred_id: 'CND2', status: 'bonus_paid', referred_name: 'Bob', referred_status: 'active', referred_jobs: 3 },
    { id: 'REF2', referrer_id: 'CND1', referred_id: 'CND3', status: 'registered', referred_name: 'Carol', referred_status: 'onboarding', referred_jobs: 0 },
  ];

  const tierRows = [
    { tier_level: 1, bonus_amount: 25, jobs_required: 1, description: 'Tier 1' },
    { tier_level: 2, bonus_amount: 50, jobs_required: 5, description: 'Tier 2' },
  ];

  test('returns dashboard data for valid candidate', async () => {
    mockQuery(candidateRow, 'get');             // candidate lookup
    mockQuery(referralRows, 'all');             // referrals
    mockQuery(tierRows, 'all');                 // tiers
    mockQuery({ bonus_amount: 25 }, 'get');     // getBonusAmount inner call

    const res = await request(refApp).get('/referrals/dashboard/CND1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.referralCode).toBe('ALIC1234');
    expect(res.body.data.stats.totalReferrals).toBe(2);
    expect(res.body.data.stats.activeReferrals).toBe(2);
    expect(res.body.data.stats.pendingBonuses).toBe(1);
    expect(res.body.data.stats.totalEarned).toBe(50);
  });

  test('returns share links including whatsapp, telegram, sms', async () => {
    mockQuery(candidateRow, 'get');
    mockQuery(referralRows, 'all');
    mockQuery(tierRows, 'all');
    mockQuery({ bonus_amount: 25 }, 'get');

    const res = await request(refApp).get('/referrals/dashboard/CND1');

    const links = res.body.data.shareLinks;
    expect(links.web).toContain('ref=ALIC1234');
    expect(links.whatsapp).toContain('wa.me');
    expect(links.telegram).toContain('t.me/share');
    expect(links.sms).toContain('sms:');
  });

  test('returns current and next tier info', async () => {
    mockQuery(candidateRow, 'get');
    mockQuery(referralRows, 'all');
    mockQuery(tierRows, 'all');
    mockQuery({ bonus_amount: 25 }, 'get');

    const res = await request(refApp).get('/referrals/dashboard/CND1');

    expect(res.body.data.currentTier.tier_level).toBe(1);
    expect(res.body.data.nextTier.tier_level).toBe(2);
  });

  test('returns 404 when candidate not found', async () => {
    mockQuery(undefined, 'get');

    const res = await request(refApp).get('/referrals/dashboard/MISSING');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Candidate not found');
  });

  test('returns 500 on database error', async () => {
    mockPrepare.mockImplementationOnce(() => { throw new Error('DB error'); });

    const res = await request(refApp).get('/referrals/dashboard/CND1');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ---- POST /referrals/register --------------------------------------------

describe('POST /referrals/register', () => {
  const body = {
    name: 'Dave Lim',
    email: 'dave@example.com',
    phone: '91234567',
    referral_code: 'ALIC1234',
  };

  test('creates candidate and referral on valid code', async () => {
    mockQuery({ id: 'CND1', name: 'Alice' }, 'get');  // referrer lookup
    mockQuery(undefined, 'get');                        // email uniqueness check
    mockQuery({ bonus_amount: 25 }, 'get');             // tier1 bonus

    // Transaction mock - execute the callback immediately
    mockTransaction.mockImplementationOnce((fn) => {
      const wrappedFn = () => fn();
      return wrappedFn;
    });

    // The three prepare calls inside the transaction
    mockQuery(undefined, 'run'); // INSERT candidates
    mockQuery(undefined, 'run'); // INSERT referrals
    mockQuery(undefined, 'run'); // INSERT notifications

    const res = await request(refApp).post('/referrals/register').send(body);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.referredBy).toBe('Alice');
    expect(res.body.data.bonusAmount).toBe(25);
    expect(res.body.data.candidateId).toBeDefined();
    expect(res.body.data.referralCode).toBeDefined();
  });

  test('returns 400 for invalid referral code', async () => {
    mockQuery(undefined, 'get'); // referrer not found

    const res = await request(refApp).post('/referrals/register').send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid referral code');
  });

  test('returns 400 for duplicate email', async () => {
    mockQuery({ id: 'CND1', name: 'Alice' }, 'get');  // referrer exists
    mockQuery({ id: 'CND99' }, 'get');                 // email already exists

    const res = await request(refApp).post('/referrals/register').send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email already registered');
  });

  test('returns 500 on transaction failure', async () => {
    mockQuery({ id: 'CND1', name: 'Alice' }, 'get');
    mockQuery(undefined, 'get');
    mockQuery({ bonus_amount: 25 }, 'get');

    mockTransaction.mockImplementationOnce(() => {
      return () => { throw new Error('Transaction failed'); };
    });

    const res = await request(refApp).post('/referrals/register').send(body);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ---- POST /referrals/process-bonus ---------------------------------------

describe('POST /referrals/process-bonus', () => {
  test('returns no-op when candidate was not referred', async () => {
    mockQuery(undefined, 'get'); // no referral found

    const res = await request(refApp)
      .post('/referrals/process-bonus')
      .send({ candidate_id: 'CND5', job_id: 'JOB1' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('No referral to process');
  });

  test('awards first-job bonus and updates status', async () => {
    const referral = {
      id: 'REF1',
      referrer_id: 'CND1',
      referred_id: 'CND2',
      tier: 1,
      status: 'registered',
      bonus_amount: 25,
      total_bonus_paid: 0,
      jobs_completed_by_referred: 0,
      referrer_name: 'Alice',
    };

    mockQuery(referral, 'get');                        // referral lookup
    mockQuery(undefined, 'run');                       // UPDATE jobs_completed
    mockQuery([
      { tier_level: 1, bonus_amount: 25, jobs_required: 1, description: 'Tier 1' },
      { tier_level: 2, bonus_amount: 50, jobs_required: 5, description: 'Tier 2' },
    ], 'all');                                          // tiers
    mockQuery(undefined, 'run');                       // UPDATE referrals status

    // Transaction for awarding bonus
    mockTransaction.mockImplementationOnce((fn) => {
      const wrappedFn = () => fn();
      return wrappedFn;
    });
    mockQuery(undefined, 'run'); // UPDATE referrals tier/bonus
    mockQuery(undefined, 'run'); // UPDATE candidates earnings
    mockQuery(undefined, 'run'); // INSERT notification

    const res = await request(refApp)
      .post('/referrals/process-bonus')
      .send({ candidate_id: 'CND2', job_id: 'JOB1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bonusAwarded).toBe(25);
  });

  test('awards zero bonus when tier threshold not met', async () => {
    const referral = {
      id: 'REF1',
      referrer_id: 'CND1',
      referred_id: 'CND2',
      tier: 1,
      status: 'bonus_paid',
      bonus_amount: 25,
      total_bonus_paid: 25,
      jobs_completed_by_referred: 2,
      referrer_name: 'Alice',
    };

    mockQuery(referral, 'get');                         // referral lookup
    mockQuery(undefined, 'run');                        // UPDATE jobs_completed
    mockQuery([
      { tier_level: 1, bonus_amount: 25, jobs_required: 1, description: 'Tier 1' },
      { tier_level: 2, bonus_amount: 50, jobs_required: 5, description: 'Tier 2' },
    ], 'all');                                           // tiers

    const res = await request(refApp)
      .post('/referrals/process-bonus')
      .send({ candidate_id: 'CND2', job_id: 'JOB2' });

    expect(res.status).toBe(200);
    expect(res.body.data.bonusAwarded).toBe(0);
    expect(res.body.data.newTier).toBe(1);
  });

  test('returns 500 on database error', async () => {
    mockPrepare.mockImplementationOnce(() => { throw new Error('DB error'); });

    const res = await request(refApp)
      .post('/referrals/process-bonus')
      .send({ candidate_id: 'CND2', job_id: 'JOB1' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ---- GET /referrals/leaderboard ------------------------------------------

describe('GET /referrals/leaderboard', () => {
  test('returns leaderboard sorted by successful referrals', async () => {
    const rows = [
      { id: 'CND1', name: 'Alice', total_referrals: 10, successful_referrals: 8, total_referral_earnings: 200 },
      { id: 'CND2', name: 'Bob', total_referrals: 5, successful_referrals: 3, total_referral_earnings: 75 },
    ];
    mockQuery(rows, 'all');

    const res = await request(refApp).get('/referrals/leaderboard');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].name).toBe('Alice');
  });

  test('respects limit query parameter', async () => {
    mockQuery([{ id: 'CND1', name: 'Alice' }], 'all');

    const res = await request(refApp).get('/referrals/leaderboard?limit=5');

    expect(res.status).toBe(200);
    // verify that the limit was passed to the db query
    const allStub = mockPrepare.mock.results[0].value;
    expect(allStub.all).toHaveBeenCalledWith(5);
  });

  test('defaults limit to 20', async () => {
    mockQuery([], 'all');

    await request(refApp).get('/referrals/leaderboard');

    const allStub = mockPrepare.mock.results[0].value;
    expect(allStub.all).toHaveBeenCalledWith(20);
  });

  test('returns empty array when no referrers', async () => {
    mockQuery([], 'all');

    const res = await request(refApp).get('/referrals/leaderboard');

    expect(res.body.data).toEqual([]);
  });

  test('returns 500 on database error', async () => {
    mockPrepare.mockImplementationOnce(() => { throw new Error('DB error'); });

    const res = await request(refApp).get('/referrals/leaderboard');

    expect(res.status).toBe(500);
  });
});

// ---- GET /referrals/validate/:code ---------------------------------------

describe('GET /referrals/validate/:code', () => {
  test('returns valid=true with referrer info for valid code', async () => {
    mockQuery({ id: 'CND1', name: 'Alice', profile_photo: 'photo.jpg' }, 'get');
    mockQuery({ bonus_amount: 25 }, 'get');

    const res = await request(refApp).get('/referrals/validate/ALIC1234');

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.data.referrerName).toBe('Alice');
    expect(res.body.data.bonusAmount).toBe(25);
  });

  test('returns valid=false for unknown code', async () => {
    mockQuery(undefined, 'get');

    const res = await request(refApp).get('/referrals/validate/BADCODE');

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.data).toBeUndefined();
  });

  test('defaults bonus to 25 when no tier1 row', async () => {
    mockQuery({ id: 'CND1', name: 'Alice', profile_photo: null }, 'get');
    mockQuery(undefined, 'get'); // no tier row

    const res = await request(refApp).get('/referrals/validate/ALIC1234');

    expect(res.body.data.bonusAmount).toBe(25);
  });

  test('returns 500 on database error', async () => {
    mockPrepare.mockImplementationOnce(() => { throw new Error('DB error'); });

    const res = await request(refApp).get('/referrals/validate/CODE');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ===========================================================================
//  AVAILABILITY ROUTES
// ===========================================================================

// ---- GET /availability/:candidateId --------------------------------------

describe('GET /availability/:candidateId', () => {
  test('returns availability and calendar for valid candidate', async () => {
    mockQuery({ id: 'CND1', name: 'Alice' }, 'get');          // candidate
    mockQuery([{ candidate_id: 'CND1', date: '2026-03-20', status: 'available' }], 'all'); // availability
    mockQuery([], 'all');                                       // scheduledJobs

    const res = await request(availApp).get('/availability/CND1?start_date=2026-03-19&end_date=2026-03-21');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.candidate.id).toBe('CND1');
    expect(res.body.data.dateRange.start).toBe('2026-03-19');
    expect(res.body.data.availability).toHaveLength(1);
    expect(res.body.data.calendar).toBeDefined();
    expect(res.body.data.calendar.length).toBeGreaterThanOrEqual(1);
  });

  test('calendar marks days with jobs as booked', async () => {
    mockQuery({ id: 'CND1', name: 'Alice' }, 'get');
    mockQuery([], 'all');  // no explicit availability
    mockQuery([{ job_date: '2026-03-20', title: 'Office cleaning' }], 'all'); // 1 job

    const res = await request(availApp).get('/availability/CND1?start_date=2026-03-20&end_date=2026-03-20');

    const day = res.body.data.calendar.find(d => d.date === '2026-03-20');
    expect(day.status).toBe('booked');
    expect(day.jobs).toHaveLength(1);
  });

  test('calendar marks unset days as unset', async () => {
    mockQuery({ id: 'CND1', name: 'Alice' }, 'get');
    mockQuery([], 'all'); // no availability
    mockQuery([], 'all'); // no jobs

    const res = await request(availApp).get('/availability/CND1?start_date=2026-03-20&end_date=2026-03-20');

    expect(res.body.data.calendar[0].status).toBe('unset');
  });

  test('uses default 30-day range when dates not specified', async () => {
    mockQuery({ id: 'CND1', name: 'Alice' }, 'get');
    mockQuery([], 'all');
    mockQuery([], 'all');

    const res = await request(availApp).get('/availability/CND1');

    expect(res.status).toBe(200);
    // Calendar should span ~30 days from today (mocked as 2026-03-19)
    expect(res.body.data.calendar.length).toBeGreaterThanOrEqual(30);
  });

  test('returns 404 when candidate not found', async () => {
    mockQuery(undefined, 'get');

    const res = await request(availApp).get('/availability/MISSING');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Candidate not found');
  });

  test('returns 500 on database error', async () => {
    mockPrepare.mockImplementationOnce(() => { throw new Error('DB error'); });

    const res = await request(availApp).get('/availability/CND1');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ---- POST /availability/:candidateId -------------------------------------

describe('POST /availability/:candidateId', () => {
  test('sets availability for multiple dates', async () => {
    const insertStub = { run: jest.fn() };
    mockPrepare.mockReturnValueOnce(insertStub); // INSERT statement

    mockTransaction.mockImplementationOnce((fn) => {
      const wrappedFn = () => fn();
      return wrappedFn;
    });

    // triggerJobMatching inner queries (for available dates)
    mockQuery([], 'all'); // open jobs on those dates

    const dates = [
      { date: '2026-03-25', status: 'available' },
      { date: '2026-03-26', status: 'unavailable' },
    ];

    const res = await request(availApp)
      .post('/availability/CND1')
      .send({ dates });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(insertStub.run).toHaveBeenCalledTimes(2);
  });

  test('defaults status to available when not specified', async () => {
    const insertStub = { run: jest.fn() };
    mockPrepare.mockReturnValueOnce(insertStub);

    mockTransaction.mockImplementationOnce((fn) => {
      const wrappedFn = () => fn();
      return wrappedFn;
    });

    mockQuery([], 'all'); // triggerJobMatching

    const res = await request(availApp)
      .post('/availability/CND1')
      .send({ dates: [{ date: '2026-04-01' }] });

    expect(res.status).toBe(200);
    expect(res.body.data[0].status).toBe('available');
  });

  test('returns 400 when dates is empty array', async () => {
    const res = await request(availApp)
      .post('/availability/CND1')
      .send({ dates: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('dates array required');
  });

  test('returns 400 when dates is missing', async () => {
    const res = await request(availApp)
      .post('/availability/CND1')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('dates array required');
  });

  test('returns 500 on database error', async () => {
    mockPrepare.mockImplementationOnce(() => { throw new Error('DB error'); });

    const res = await request(availApp)
      .post('/availability/CND1')
      .send({ dates: [{ date: '2026-04-01', status: 'available' }] });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ---- POST /availability/:candidateId/range -------------------------------

describe('POST /availability/:candidateId/range', () => {
  test('sets availability for a date range', async () => {
    const insertStub = { run: jest.fn() };
    mockPrepare.mockReturnValueOnce(insertStub);

    mockTransaction.mockImplementationOnce((fn) => {
      const wrappedFn = () => fn();
      return wrappedFn;
    });

    const res = await request(availApp)
      .post('/availability/CND1/range')
      .send({ start_date: '2026-04-01', end_date: '2026-04-03', status: 'available' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.datesSet).toBe(3); // Apr 1, 2, 3
    expect(res.body.data.dates).toHaveLength(3);
  });

  test('excludes specified days of the week', async () => {
    const insertStub = { run: jest.fn() };
    mockPrepare.mockReturnValueOnce(insertStub);

    mockTransaction.mockImplementationOnce((fn) => {
      const wrappedFn = () => fn();
      return wrappedFn;
    });

    // 2026-04-04 is Saturday (6), 2026-04-05 is Sunday (0)
    const res = await request(availApp)
      .post('/availability/CND1/range')
      .send({
        start_date: '2026-04-01',
        end_date: '2026-04-07',
        status: 'available',
        exclude_days: [0, 6], // Exclude Sun & Sat
      });

    expect(res.status).toBe(200);
    // 7 calendar days minus weekends = 5 weekdays
    expect(res.body.data.datesSet).toBe(5);
  });

  test('attaches start_time and end_time when provided', async () => {
    const insertStub = { run: jest.fn() };
    mockPrepare.mockReturnValueOnce(insertStub);

    mockTransaction.mockImplementationOnce((fn) => {
      const wrappedFn = () => fn();
      return wrappedFn;
    });

    const res = await request(availApp)
      .post('/availability/CND1/range')
      .send({
        start_date: '2026-04-10',
        end_date: '2026-04-10',
        status: 'available',
        start_time: '09:00',
        end_time: '17:00',
      });

    expect(res.status).toBe(200);
    expect(insertStub.run).toHaveBeenCalledWith('CND1', '2026-04-10', 'available', '09:00', '17:00');
  });

  test('returns 400 when start_date missing', async () => {
    const res = await request(availApp)
      .post('/availability/CND1/range')
      .send({ end_date: '2026-04-07' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('start_date and end_date required');
  });

  test('returns 400 when end_date missing', async () => {
    const res = await request(availApp)
      .post('/availability/CND1/range')
      .send({ start_date: '2026-04-01' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('start_date and end_date required');
  });

  test('returns 500 on database error', async () => {
    mockPrepare.mockImplementationOnce(() => { throw new Error('DB error'); });

    const res = await request(availApp)
      .post('/availability/CND1/range')
      .send({ start_date: '2026-04-01', end_date: '2026-04-03' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ---- DELETE /availability/:candidateId/:date -----------------------------

describe('DELETE /availability/:candidateId/:date', () => {
  test('deletes availability record and returns success', async () => {
    const runStub = { run: jest.fn() };
    mockPrepare.mockReturnValueOnce(runStub);

    const res = await request(availApp).delete('/availability/CND1/2026-04-01');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(runStub.run).toHaveBeenCalledWith('CND1', '2026-04-01');
  });

  test('returns success even when no matching row exists', async () => {
    mockPrepare.mockReturnValueOnce({ run: jest.fn() });

    const res = await request(availApp).delete('/availability/CND1/2099-01-01');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 500 on database error', async () => {
    mockPrepare.mockImplementationOnce(() => { throw new Error('DB error'); });

    const res = await request(availApp).delete('/availability/CND1/2026-04-01');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ---- GET /availability/match/job/:jobId ----------------------------------

describe('GET /availability/match/job/:jobId', () => {
  const jobRow = {
    id: 'JOB1',
    title: 'Office cleaning',
    job_date: '2026-04-10',
    total_slots: 5,
    filled_slots: 2,
  };

  test('returns available candidates for a job', async () => {
    mockQuery(jobRow, 'get');
    mockQuery([
      { id: 'CND1', name: 'Alice', availability_status: 'available', rating: 4.8, total_jobs_completed: 10 },
    ], 'all'); // explicitly available
    mockQuery([
      { id: 'CND2', name: 'Bob', availability_status: 'default_available', rating: 4.2 },
    ], 'all'); // no entry (default available)

    const res = await request(availApp).get('/availability/match/job/JOB1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalAvailable).toBe(2);
    expect(res.body.data.availableCandidates).toHaveLength(2);
    expect(res.body.data.job.slots).toBe(3); // 5 - 2
  });

  test('returns job metadata in response', async () => {
    mockQuery(jobRow, 'get');
    mockQuery([], 'all');
    mockQuery([], 'all');

    const res = await request(availApp).get('/availability/match/job/JOB1');

    expect(res.body.data.job.id).toBe('JOB1');
    expect(res.body.data.job.title).toBe('Office cleaning');
    expect(res.body.data.job.date).toBe('2026-04-10');
  });

  test('returns empty list when no candidates available', async () => {
    mockQuery(jobRow, 'get');
    mockQuery([], 'all');
    mockQuery([], 'all');

    const res = await request(availApp).get('/availability/match/job/JOB1');

    expect(res.status).toBe(200);
    expect(res.body.data.totalAvailable).toBe(0);
  });

  test('returns 404 when job not found', async () => {
    mockQuery(undefined, 'get');

    const res = await request(availApp).get('/availability/match/job/MISSING');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Job not found');
  });

  test('returns 500 on database error', async () => {
    mockPrepare.mockImplementationOnce(() => { throw new Error('DB error'); });

    const res = await request(availApp).get('/availability/match/job/JOB1');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
