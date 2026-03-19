/**
 * Unit Tests: Gamification Route Handlers (Achievements + Quests)
 *
 * Tests achievements and quests route logic with mocked database.
 *
 * Rewards and quest-processor tests are in gamification-rewards.test.js
 */

// ---------------------------------------------------------------------------
// Mock infrastructure – must be set up BEFORE requiring any source modules
// ---------------------------------------------------------------------------

// Reusable mock helpers
function mockPrepare(returnValue) {
  return {
    get: jest.fn().mockReturnValue(returnValue),
    all: jest.fn().mockReturnValue(Array.isArray(returnValue) ? returnValue : []),
    run: jest.fn().mockReturnValue({ changes: 1 }),
  };
}

const stmtStore = {};

const mockDb = {
  prepare: jest.fn((sql) => {
    // Allow per-query overrides via stmtStore, keyed by a substring of the SQL
    for (const key of Object.keys(stmtStore)) {
      if (sql.includes(key)) {
        return stmtStore[key];
      }
    }
    // Default: return a stmt that yields undefined / empty array
    return {
      get: jest.fn().mockReturnValue(undefined),
      all: jest.fn().mockReturnValue([]),
      run: jest.fn().mockReturnValue({ changes: 0 }),
    };
  }),
  transaction: jest.fn((fn) => fn), // transaction() returns the function itself; caller invokes it
};

// Clear stmtStore helper
function clearStmtStore() {
  for (const key of Object.keys(stmtStore)) {
    delete stmtStore[key];
  }
}

// Mock the db module used by all gamification routes
jest.mock('../../db', () => ({ db: mockDb }));

// Mock the structured-logger so route files don't crash
jest.mock('../../utils/structured-logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    business: jest.fn(),
  }),
}));

// Mock shared/constants used by quest-processor and xp-calculator
jest.mock('../../shared/constants', () => ({
  getSGDateString: jest.fn(() => '2026-03-19'),
  XP_THRESHOLDS: [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000],
  XP_VALUES: { job_completion: 50, referral: 100 },
  calculateLevel: jest.fn((xp) => {
    const thresholds = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000];
    let lvl = 1;
    for (let i = 1; i < thresholds.length; i++) {
      if (xp >= thresholds[i]) lvl = i + 1;
    }
    return lvl;
  }),
  calculateJobXP: jest.fn(() => 50),
  getLevelTier: jest.fn((level) => {
    if (level >= 9) return 'diamond';
    if (level >= 7) return 'platinum';
    if (level >= 5) return 'gold';
    if (level >= 3) return 'silver';
    return 'bronze';
  }),
}));

// Mock auth middleware to always call next()
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req, res, next) => next(),
  authenticateAdmin: (req, res, next) => next(),
}));

// Mock the gamification helpers that the route files import
jest.mock(
  '../../routes/api/v1/gamification/helpers/xp-calculator',
  () => ({
    processLevelUp: jest.fn(() => ({ leveledUp: false, level: 1 })),
    calculateLevel: jest.fn(() => 1),
    calculateLevelProgress: jest.fn(() => ({ levelProgress: 50 })),
    calculateJobXP: jest.fn(() => 50),
    getLevelTier: jest.fn(() => 'bronze'),
    XP_THRESHOLDS: [0, 100, 250, 500, 1000],
    XP_VALUES: { job_completion: 50 },
  })
);

jest.mock(
  '../../routes/api/v1/gamification/helpers/achievement-checker',
  () => ({
    checkAndUnlockAchievements: jest.fn(() => []),
    unlockAchievement: jest.fn(() => []),
  })
);

jest.mock(
  '../../routes/api/v1/gamification/helpers/database-queries',
  () => ({
    getCandidateAchievements: jest.fn(() => []),
    getCandidateQuests: jest.fn(() => []),
    createXPTransaction: jest.fn(),
    updateCandidateXP: jest.fn(),
    getCandidateProfile: jest.fn(),
  })
);

// ---------------------------------------------------------------------------
// Now require the source modules under test
// ---------------------------------------------------------------------------

const request = require('supertest');
const express = require('express');

// Route modules
const achievementsRouter = require('../../routes/api/v1/gamification/routes/achievements');
const questsRouter = require('../../routes/api/v1/gamification/routes/quests');

// Helpers we want to inspect mock calls on
const { updateCandidateXP, createXPTransaction } = require('../../routes/api/v1/gamification/helpers/database-queries');

// ---------------------------------------------------------------------------
// Express app used for supertest
// ---------------------------------------------------------------------------

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', achievementsRouter);
  app.use('/', questsRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Reset mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  clearStmtStore();
});

// ============================================================================
// 1. GET /achievements - list achievements, handle pagination
// ============================================================================

describe('GET /achievements', () => {
  const app = buildApp();

  test('returns paginated achievements list', async () => {
    const achievements = [
      { id: 'ACH1', name: 'First Shift', category: 'reliable', rarity: 'common', xp_reward: 50 },
      { id: 'ACH2', name: 'Five Shifts', category: 'reliable', rarity: 'uncommon', xp_reward: 100 },
    ];

    stmtStore['COUNT(*)'] = { get: jest.fn(() => ({ total: 2 })) };
    stmtStore['SELECT * FROM achievements'] = { all: jest.fn(() => achievements) };

    const res = await request(app).get('/achievements').query({ page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 2,
      pages: 1,
    });
  });

  test('defaults to page 1 and limit 50 when not provided', async () => {
    stmtStore['COUNT(*)'] = { get: jest.fn(() => ({ total: 0 })) };
    stmtStore['SELECT * FROM achievements'] = { all: jest.fn(() => []) };

    const res = await request(app).get('/achievements');

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(50);
  });

  test('clamps limit to maximum of 500', async () => {
    stmtStore['COUNT(*)'] = { get: jest.fn(() => ({ total: 0 })) };
    stmtStore['SELECT * FROM achievements'] = { all: jest.fn(() => []) };

    const res = await request(app).get('/achievements').query({ limit: 9999 });

    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(500);
  });

  test('clamps page to minimum of 1 when negative', async () => {
    stmtStore['COUNT(*)'] = { get: jest.fn(() => ({ total: 0 })) };
    stmtStore['SELECT * FROM achievements'] = { all: jest.fn(() => []) };

    const res = await request(app).get('/achievements').query({ page: -5 });

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
  });

  test('filters by category when provided', async () => {
    stmtStore['COUNT(*)'] = { get: jest.fn(() => ({ total: 1 })) };
    const skilled = [{ id: 'ACH3', name: 'Level Up', category: 'skilled', rarity: 'common', xp_reward: 75 }];
    stmtStore['SELECT * FROM achievements'] = { all: jest.fn(() => skilled) };

    const res = await request(app).get('/achievements').query({ category: 'skilled' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].category).toBe('skilled');
  });

  test('calculates correct page count for pagination', async () => {
    stmtStore['COUNT(*)'] = { get: jest.fn(() => ({ total: 25 })) };
    stmtStore['SELECT * FROM achievements'] = { all: jest.fn(() => []) };

    const res = await request(app).get('/achievements').query({ limit: 10 });

    expect(res.body.pagination.pages).toBe(3); // ceil(25/10)
  });

  test('returns 500 on database error', async () => {
    // Force db.prepare to throw
    mockDb.prepare.mockImplementationOnce(() => { throw new Error('DB connection lost'); });

    const res = await request(app).get('/achievements');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal server error');
  });
});

// ============================================================================
// 2. POST /achievements/unlock - unlock achievement, handle already unlocked
// ============================================================================

describe('POST /achievements/unlock', () => {
  const app = buildApp();

  test('unlocks achievement for candidate', async () => {
    const achievement = { id: 'ACH1', name: 'First Shift', xp_reward: 50 };

    // No existing unlock
    stmtStore['FROM candidate_achievements WHERE'] = { get: jest.fn(() => undefined) };
    // Achievement exists
    stmtStore['FROM achievements WHERE id'] = { get: jest.fn(() => achievement) };
    // INSERT succeeds
    stmtStore['INSERT INTO candidate_achievements'] = { run: jest.fn() };

    const res = await request(app)
      .post('/achievements/unlock')
      .send({ candidate_id: 'C001', achievement_id: 'ACH1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unlocked).toBe(true);
    expect(res.body.data.claimed).toBe(false);
    expect(res.body.data.achievement.name).toBe('First Shift');
  });

  test('returns already_unlocked true when achievement was previously unlocked', async () => {
    stmtStore['FROM candidate_achievements WHERE'] = {
      get: jest.fn(() => ({ candidate_id: 'C001', achievement_id: 'ACH1', claimed: 0 })),
    };

    const res = await request(app)
      .post('/achievements/unlock')
      .send({ candidate_id: 'C001', achievement_id: 'ACH1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.already_unlocked).toBe(true);
    expect(res.body.claimed).toBe(false);
  });

  test('returns already_unlocked with claimed true when achievement was claimed', async () => {
    stmtStore['FROM candidate_achievements WHERE'] = {
      get: jest.fn(() => ({ candidate_id: 'C001', achievement_id: 'ACH1', claimed: 1 })),
    };

    const res = await request(app)
      .post('/achievements/unlock')
      .send({ candidate_id: 'C001', achievement_id: 'ACH1' });

    expect(res.status).toBe(200);
    expect(res.body.already_unlocked).toBe(true);
    expect(res.body.claimed).toBe(true);
  });

  test('returns 400 when candidate_id is missing', async () => {
    const res = await request(app)
      .post('/achievements/unlock')
      .send({ achievement_id: 'ACH1' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/candidate_id.*achievement_id.*required/i);
  });

  test('returns 400 when achievement_id is missing', async () => {
    const res = await request(app)
      .post('/achievements/unlock')
      .send({ candidate_id: 'C001' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 404 when achievement does not exist', async () => {
    stmtStore['FROM candidate_achievements WHERE'] = { get: jest.fn(() => undefined) };
    stmtStore['FROM achievements WHERE id'] = { get: jest.fn(() => undefined) };

    const res = await request(app)
      .post('/achievements/unlock')
      .send({ candidate_id: 'C001', achievement_id: 'NONEXISTENT' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Achievement not found');
  });

  test('does NOT award XP on unlock (XP is only awarded on claim)', async () => {
    const achievement = { id: 'ACH1', name: 'First Shift', xp_reward: 50 };

    stmtStore['FROM candidate_achievements WHERE'] = { get: jest.fn(() => undefined) };
    stmtStore['FROM achievements WHERE id'] = { get: jest.fn(() => achievement) };
    stmtStore['INSERT INTO candidate_achievements'] = { run: jest.fn() };

    await request(app)
      .post('/achievements/unlock')
      .send({ candidate_id: 'C001', achievement_id: 'ACH1' });

    // updateCandidateXP and createXPTransaction should NOT be called during unlock
    expect(updateCandidateXP).not.toHaveBeenCalled();
    expect(createXPTransaction).not.toHaveBeenCalled();
  });
});

// ============================================================================
// 3. GET /quests - list quests, filter by type
// ============================================================================

describe('GET /quests', () => {
  const app = buildApp();

  test('returns paginated active quests list', async () => {
    const quests = [
      { id: 'Q1', title: 'Daily Login', type: 'daily', xp_reward: 10, active: 1, requirement: '{"count":1}' },
      { id: 'Q2', title: 'Complete 5 Jobs', type: 'weekly', xp_reward: 50, active: 1, requirement: '{"count":5}' },
    ];

    stmtStore['COUNT(*)'] = { get: jest.fn(() => ({ total: 2 })) };
    stmtStore['SELECT * FROM quests'] = { all: jest.fn(() => quests) };

    const res = await request(app).get('/quests');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    // parseQuests should have added computed fields
    expect(res.body.data[0]).toHaveProperty('requirement');
    expect(res.body.data[0]).toHaveProperty('target');
    expect(res.body.data[0]).toHaveProperty('status');
  });

  test('filters by type when provided', async () => {
    const dailyQuests = [
      { id: 'Q1', title: 'Daily Login', type: 'daily', xp_reward: 10, active: 1, requirement: '{"count":1}' },
    ];

    stmtStore['COUNT(*)'] = { get: jest.fn(() => ({ total: 1 })) };
    stmtStore['SELECT * FROM quests'] = { all: jest.fn(() => dailyQuests) };

    const res = await request(app).get('/quests').query({ type: 'daily' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].type).toBe('daily');
  });

  test('defaults to page 1 and limit 20', async () => {
    stmtStore['COUNT(*)'] = { get: jest.fn(() => ({ total: 0 })) };
    stmtStore['SELECT * FROM quests'] = { all: jest.fn(() => []) };

    const res = await request(app).get('/quests');

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(20);
  });

  test('returns parsed quest data with computed status', async () => {
    const quests = [
      { id: 'Q1', title: 'Quest A', type: 'daily', xp_reward: 10, active: 1, requirement: '{"count":3}', claimed: 0, completed: 0, started_at: null },
      { id: 'Q2', title: 'Quest B', type: 'daily', xp_reward: 20, active: 1, requirement: '{"count":1}', claimed: 1, completed: 1, started_at: '2026-01-01' },
      { id: 'Q3', title: 'Quest C', type: 'weekly', xp_reward: 30, active: 1, requirement: '{}', claimed: 0, completed: 1, started_at: '2026-01-01' },
      { id: 'Q4', title: 'Quest D', type: 'weekly', xp_reward: 40, active: 1, requirement: '{"count":7}', claimed: 0, completed: 0, started_at: '2026-01-01' },
    ];

    stmtStore['COUNT(*)'] = { get: jest.fn(() => ({ total: 4 })) };
    stmtStore['SELECT * FROM quests'] = { all: jest.fn(() => quests) };

    const res = await request(app).get('/quests');

    expect(res.body.data[0].status).toBe('available');     // not started
    expect(res.body.data[1].status).toBe('claimed');        // claimed
    expect(res.body.data[2].status).toBe('claimable');      // completed but not claimed
    expect(res.body.data[3].status).toBe('in_progress');    // started but not completed
  });

  test('returns 500 on database error', async () => {
    mockDb.prepare.mockImplementationOnce(() => { throw new Error('DB failure'); });

    const res = await request(app).get('/quests');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================================
// 4. POST /quests/:id/progress - update quest progress
// ============================================================================

describe('POST /quests/:questId/progress', () => {
  const app = buildApp();

  test('returns 400 when candidateId is missing', async () => {
    const res = await request(app)
      .post('/quests/Q1/progress')
      .send({ increment: 1 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('candidateId is required');
  });

  test('delegates to updateQuestProgress and returns result', async () => {
    const quest = { id: 'Q1', title: 'Daily Login', active: 1, requirement: '{"count":5}' };
    const candidateQuest = { quest_id: 'Q1', candidate_id: 'C001', progress: 2, target: 5, completed: 0 };

    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => quest) };
    stmtStore['FROM candidate_quests'] = { get: jest.fn(() => candidateQuest) };
    stmtStore['UPDATE candidate_quests'] = { run: jest.fn() };

    const res = await request(app)
      .post('/quests/Q1/progress')
      .send({ candidateId: 'C001', increment: 1 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.progress).toBe(3);
    expect(res.body.data.target).toBe(5);
    expect(res.body.data.completed).toBe(false);
  });

  test('defaults increment to 1 when not provided', async () => {
    const quest = { id: 'Q1', title: 'Daily Login', active: 1, requirement: '{"count":5}' };
    const candidateQuest = { quest_id: 'Q1', candidate_id: 'C001', progress: 0, target: 5, completed: 0 };

    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => quest) };
    stmtStore['FROM candidate_quests'] = { get: jest.fn(() => candidateQuest) };
    stmtStore['UPDATE candidate_quests'] = { run: jest.fn() };

    const res = await request(app)
      .post('/quests/Q1/progress')
      .send({ candidateId: 'C001' });

    expect(res.status).toBe(200);
    expect(res.body.data.progress).toBe(1);
  });

  test('marks quest as completed when progress reaches target', async () => {
    const quest = { id: 'Q1', title: 'Daily Login', active: 1, requirement: '{"count":3}' };
    const candidateQuest = { quest_id: 'Q1', candidate_id: 'C001', progress: 2, target: 3, completed: 0 };

    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => quest) };
    stmtStore['FROM candidate_quests'] = { get: jest.fn(() => candidateQuest) };
    stmtStore['UPDATE candidate_quests'] = { run: jest.fn() };

    const res = await request(app)
      .post('/quests/Q1/progress')
      .send({ candidateId: 'C001', increment: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data.progress).toBe(3);
    expect(res.body.data.completed).toBe(true);
  });

  test('returns 500 when quest does not exist (thrown error)', async () => {
    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => null) };

    const res = await request(app)
      .post('/quests/NONEXISTENT/progress')
      .send({ candidateId: 'C001', increment: 1 });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  test('returns 500 when quest not started by candidate', async () => {
    const quest = { id: 'Q1', title: 'Daily Login', active: 1, requirement: '{"count":5}' };
    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => quest) };
    stmtStore['FROM candidate_quests'] = { get: jest.fn(() => null) };

    const res = await request(app)
      .post('/quests/Q1/progress')
      .send({ candidateId: 'C001', increment: 1 });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================================
// 5. POST /achievements/:achievementId/claim
// ============================================================================

describe('POST /achievements/:achievementId/claim', () => {
  const app = buildApp();

  test('returns 400 when candidateId is missing', async () => {
    const res = await request(app)
      .post('/achievements/ACH1/claim')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/candidateId.*candidate_id.*required/i);
  });

  test('returns 404 when achievement does not exist', async () => {
    stmtStore['FROM achievements WHERE id'] = { get: jest.fn(() => null) };

    const res = await request(app)
      .post('/achievements/NONEXISTENT/claim')
      .send({ candidateId: 'C001' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Achievement not found');
  });

  test('returns 400 when achievement not unlocked (transaction returns error)', async () => {
    const achievement = { id: 'ACH1', name: 'Test', xp_reward: 50 };

    stmtStore['FROM achievements WHERE id'] = { get: jest.fn(() => achievement) };

    // Override transaction to simulate the inner transaction logic
    mockDb.transaction.mockImplementation((fn) => {
      return () => {
        const originalPrepare = mockDb.prepare;
        mockDb.prepare = jest.fn((sql) => {
          if (sql.includes('FROM candidate_achievements')) {
            return { get: jest.fn(() => null) }; // not unlocked
          }
          return { get: jest.fn(), run: jest.fn() };
        });

        const result = fn();
        mockDb.prepare = originalPrepare;
        return result;
      };
    });

    const res = await request(app)
      .post('/achievements/ACH1/claim')
      .send({ candidateId: 'C001' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Achievement not unlocked');
  });

  test('returns 400 when achievement already claimed', async () => {
    const achievement = { id: 'ACH1', name: 'Test', xp_reward: 50 };

    stmtStore['FROM achievements WHERE id'] = { get: jest.fn(() => achievement) };

    mockDb.transaction.mockImplementation((fn) => {
      return () => {
        const originalPrepare = mockDb.prepare;
        mockDb.prepare = jest.fn((sql) => {
          if (sql.includes('FROM candidate_achievements')) {
            return { get: jest.fn(() => ({ candidate_id: 'C001', achievement_id: 'ACH1', claimed: 1 })) };
          }
          return { get: jest.fn(), run: jest.fn() };
        });

        const result = fn();
        mockDb.prepare = originalPrepare;
        return result;
      };
    });

    const res = await request(app)
      .post('/achievements/ACH1/claim')
      .send({ candidateId: 'C001' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Achievement already claimed');
  });
});

// ============================================================================
// 6. POST /quests/:questId/start
// ============================================================================

describe('POST /quests/:questId/start', () => {
  const app = buildApp();

  test('returns 400 when candidate_id is missing', async () => {
    const res = await request(app)
      .post('/quests/Q1/start')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('candidate_id is required');
  });

  test('returns 404 when quest does not exist', async () => {
    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => null) };

    const res = await request(app)
      .post('/quests/NONEXISTENT/start')
      .send({ candidate_id: 'C001' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Quest not found or inactive');
  });

  test('returns 404 when quest is inactive', async () => {
    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => ({ id: 'Q1', active: 0 })) };

    const res = await request(app)
      .post('/quests/Q1/start')
      .send({ candidate_id: 'C001' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Quest not found or inactive');
  });

  test('returns already_started when quest was previously started', async () => {
    const quest = { id: 'Q1', title: 'Quest', active: 1, requirement: '{"count":5}' };
    const existing = { candidate_id: 'C001', quest_id: 'Q1', progress: 3, target: 5 };

    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => quest) };
    stmtStore['FROM candidate_quests WHERE'] = { get: jest.fn(() => existing) };

    const res = await request(app)
      .post('/quests/Q1/start')
      .send({ candidate_id: 'C001' });

    expect(res.status).toBe(200);
    expect(res.body.already_started).toBe(true);
    expect(res.body.progress).toBe(3);
    expect(res.body.target).toBe(5);
  });

  test('starts quest with progress 0 and computed target', async () => {
    const quest = { id: 'Q1', title: 'Do 5 Things', active: 1, requirement: '{"count":5}' };

    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => quest) };
    stmtStore['FROM candidate_quests WHERE'] = { get: jest.fn(() => undefined) };
    stmtStore['INSERT INTO candidate_quests'] = { run: jest.fn() };

    const res = await request(app)
      .post('/quests/Q1/start')
      .send({ candidate_id: 'C001' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.progress).toBe(0);
    expect(res.body.data.target).toBe(5);
    expect(res.body.data.started).toBe(true);
  });

  test('defaults target to 1 when requirement has no count', async () => {
    const quest = { id: 'Q1', title: 'Simple', active: 1, requirement: '{}' };

    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => quest) };
    stmtStore['FROM candidate_quests WHERE'] = { get: jest.fn(() => undefined) };
    stmtStore['INSERT INTO candidate_quests'] = { run: jest.fn() };

    const res = await request(app)
      .post('/quests/Q1/start')
      .send({ candidate_id: 'C001' });

    expect(res.body.data.target).toBe(1);
  });
});

// ============================================================================
// 7. POST /quests/:questId/complete
// ============================================================================

describe('POST /quests/:questId/complete', () => {
  const app = buildApp();

  test('returns 400 when candidateId is missing', async () => {
    const res = await request(app)
      .post('/quests/Q1/complete')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('candidateId is required');
  });

  test('returns 400 when quest not started', async () => {
    stmtStore['FROM candidate_quests WHERE'] = { get: jest.fn(() => null) };

    const res = await request(app)
      .post('/quests/Q1/complete')
      .send({ candidateId: 'C001' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Quest not started');
  });

  test('returns already_completed when quest was previously completed', async () => {
    stmtStore['FROM candidate_quests WHERE'] = {
      get: jest.fn(() => ({ candidate_id: 'C001', quest_id: 'Q1', completed: 1 })),
    };

    const res = await request(app)
      .post('/quests/Q1/complete')
      .send({ candidateId: 'C001' });

    expect(res.status).toBe(200);
    expect(res.body.already_completed).toBe(true);
  });

  test('marks quest as completed', async () => {
    stmtStore['FROM candidate_quests WHERE'] = {
      get: jest.fn(() => ({ candidate_id: 'C001', quest_id: 'Q1', completed: 0, progress: 5, target: 5 })),
    };
    stmtStore['UPDATE candidate_quests'] = { run: jest.fn() };

    const res = await request(app)
      .post('/quests/Q1/complete')
      .send({ candidateId: 'C001' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.completed).toBe(true);
  });
});
