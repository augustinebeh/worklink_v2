/**
 * Unit Tests: Gamification Rewards + Quest Processor
 *
 * Tests rewards route logic (purchase, listing) and
 * quest-processor helper functions (parseQuests, updateQuestProgress)
 * with mocked database.
 *
 * Achievements and quests route tests are in gamification-routes.test.js
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
const rewardsRouter = require('../../routes/api/v1/gamification/routes/rewards');

// Helper under direct unit testing (not via HTTP)
const { parseQuests, updateQuestProgress } = require('../../routes/api/v1/gamification/helpers/quest-processor');

// ---------------------------------------------------------------------------
// Express app used for supertest
// ---------------------------------------------------------------------------

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', rewardsRouter);
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
// 1. POST /rewards/:id/purchase - purchase reward, handle insufficient points
// ============================================================================

describe('POST /rewards/:rewardId/purchase', () => {
  const app = buildApp();

  test('returns 400 when candidateId is missing', async () => {
    const res = await request(app)
      .post('/rewards/R1/purchase')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/candidateId.*candidate_id.*required/i);
  });

  test('successfully purchases reward and deducts points', async () => {
    const candidate = { current_points: 500, current_tier: 'silver', level: 3 };
    const reward = { id: 'R1', name: 'Priority Badge', point_cost: 100, tier_required: 'bronze', active: 1, stock: null, max_per_user: null };
    const updatedCandidate = { current_points: 400 };

    mockDb.transaction.mockImplementation((fn) => {
      return () => {
        const originalPrepare = mockDb.prepare;
        mockDb.prepare = jest.fn((sql) => {
          if (sql.includes('FROM candidates WHERE id')) {
            const callCount = mockDb.prepare.mock.calls.filter(c => c[0].includes('FROM candidates WHERE id')).length;
            return { get: jest.fn(() => callCount <= 1 ? candidate : updatedCandidate) };
          }
          if (sql.includes('FROM rewards WHERE id')) {
            return { get: jest.fn(() => reward) };
          }
          if (sql.includes('UPDATE candidates SET current_points')) {
            return { run: jest.fn() };
          }
          if (sql.includes('INSERT INTO candidate_rewards')) {
            return { run: jest.fn() };
          }
          if (sql.includes('UPDATE rewards SET stock')) {
            return { run: jest.fn() };
          }
          if (sql.includes('COUNT(*)')) {
            return { get: jest.fn(() => ({ count: 0 })) };
          }
          return { get: jest.fn(), all: jest.fn(() => []), run: jest.fn() };
        });

        const result = fn();
        mockDb.prepare = originalPrepare;
        return result;
      };
    });

    const res = await request(app)
      .post('/rewards/R1/purchase')
      .send({ candidateId: 'C001' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reward.name).toBe('Priority Badge');
    expect(res.body.data.points_spent).toBe(100);
    expect(res.body.data.remaining_points).toBe(400);
  });

  test('returns 500 with insufficient points error', async () => {
    const candidate = { current_points: 50, current_tier: 'bronze', level: 1 };
    const reward = { id: 'R1', name: 'Expensive Badge', point_cost: 500, tier_required: 'bronze', active: 1, stock: null, max_per_user: null };

    mockDb.transaction.mockImplementation((fn) => {
      return () => {
        const originalPrepare = mockDb.prepare;
        mockDb.prepare = jest.fn((sql) => {
          if (sql.includes('FROM candidates WHERE id')) {
            return { get: jest.fn(() => candidate) };
          }
          if (sql.includes('FROM rewards WHERE id')) {
            return { get: jest.fn(() => reward) };
          }
          return { get: jest.fn(), all: jest.fn(() => []), run: jest.fn() };
        });

        try {
          return fn();
        } finally {
          mockDb.prepare = originalPrepare;
        }
      };
    });

    const res = await request(app)
      .post('/rewards/R1/purchase')
      .send({ candidateId: 'C001' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  test('returns 500 with tier requirement error', async () => {
    const candidate = { current_points: 1000, current_tier: 'bronze', level: 1 };
    const reward = { id: 'R1', name: 'Gold Badge', point_cost: 100, tier_required: 'gold', active: 1, stock: null, max_per_user: null };

    mockDb.transaction.mockImplementation((fn) => {
      return () => {
        const originalPrepare = mockDb.prepare;
        mockDb.prepare = jest.fn((sql) => {
          if (sql.includes('FROM candidates WHERE id')) {
            return { get: jest.fn(() => candidate) };
          }
          if (sql.includes('FROM rewards WHERE id')) {
            return { get: jest.fn(() => reward) };
          }
          return { get: jest.fn(), all: jest.fn(() => []), run: jest.fn() };
        });

        try {
          return fn();
        } finally {
          mockDb.prepare = originalPrepare;
        }
      };
    });

    const res = await request(app)
      .post('/rewards/R1/purchase')
      .send({ candidateId: 'C001' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  test('returns 500 when reward is out of stock', async () => {
    const candidate = { current_points: 500, current_tier: 'silver', level: 3 };
    const reward = { id: 'R1', name: 'Limited Badge', point_cost: 100, tier_required: 'bronze', active: 1, stock: 0, max_per_user: null };

    mockDb.transaction.mockImplementation((fn) => {
      return () => {
        const originalPrepare = mockDb.prepare;
        mockDb.prepare = jest.fn((sql) => {
          if (sql.includes('FROM candidates WHERE id')) {
            return { get: jest.fn(() => candidate) };
          }
          if (sql.includes('FROM rewards WHERE id')) {
            return { get: jest.fn(() => reward) };
          }
          return { get: jest.fn(), all: jest.fn(() => []), run: jest.fn() };
        });

        try {
          return fn();
        } finally {
          mockDb.prepare = originalPrepare;
        }
      };
    });

    const res = await request(app)
      .post('/rewards/R1/purchase')
      .send({ candidateId: 'C001' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  test('returns 500 when max per user limit reached', async () => {
    const candidate = { current_points: 500, current_tier: 'silver', level: 3 };
    const reward = { id: 'R1', name: 'One-Time Badge', point_cost: 100, tier_required: 'bronze', active: 1, stock: null, max_per_user: 1 };

    mockDb.transaction.mockImplementation((fn) => {
      return () => {
        const originalPrepare = mockDb.prepare;
        mockDb.prepare = jest.fn((sql) => {
          if (sql.includes('FROM candidates WHERE id')) {
            return { get: jest.fn(() => candidate) };
          }
          if (sql.includes('FROM rewards WHERE id')) {
            return { get: jest.fn(() => reward) };
          }
          if (sql.includes('COUNT(*)')) {
            return { get: jest.fn(() => ({ count: 1 })) };
          }
          return { get: jest.fn(), all: jest.fn(() => []), run: jest.fn() };
        });

        try {
          return fn();
        } finally {
          mockDb.prepare = originalPrepare;
        }
      };
    });

    const res = await request(app)
      .post('/rewards/R1/purchase')
      .send({ candidateId: 'C001' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  test('accepts candidate_id as alternative to candidateId', async () => {
    const candidate = { current_points: 500, current_tier: 'silver', level: 3 };
    const reward = { id: 'R1', name: 'Badge', point_cost: 100, tier_required: 'bronze', active: 1, stock: null, max_per_user: null };
    const updatedCandidate = { current_points: 400 };

    mockDb.transaction.mockImplementation((fn) => {
      return () => {
        const originalPrepare = mockDb.prepare;
        mockDb.prepare = jest.fn((sql) => {
          if (sql.includes('FROM candidates WHERE id')) {
            const callCount = mockDb.prepare.mock.calls.filter(c => c[0].includes('FROM candidates WHERE id')).length;
            return { get: jest.fn(() => callCount <= 1 ? candidate : updatedCandidate) };
          }
          if (sql.includes('FROM rewards WHERE id')) {
            return { get: jest.fn(() => reward) };
          }
          if (sql.includes('UPDATE candidates')) {
            return { run: jest.fn() };
          }
          if (sql.includes('INSERT INTO candidate_rewards')) {
            return { run: jest.fn() };
          }
          return { get: jest.fn(), all: jest.fn(() => []), run: jest.fn() };
        });

        const result = fn();
        mockDb.prepare = originalPrepare;
        return result;
      };
    });

    const res = await request(app)
      .post('/rewards/R1/purchase')
      .send({ candidate_id: 'C001' }); // using candidate_id instead of candidateId

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 500 when candidate does not exist', async () => {
    mockDb.transaction.mockImplementation((fn) => {
      return () => {
        const originalPrepare = mockDb.prepare;
        mockDb.prepare = jest.fn((sql) => {
          if (sql.includes('FROM candidates WHERE id')) {
            return { get: jest.fn(() => null) };
          }
          return { get: jest.fn(), all: jest.fn(() => []), run: jest.fn() };
        });

        try {
          return fn();
        } finally {
          mockDb.prepare = originalPrepare;
        }
      };
    });

    const res = await request(app)
      .post('/rewards/R1/purchase')
      .send({ candidateId: 'NONEXISTENT' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================================
// 2. Quest Processor - parseQuests, updateQuestProgress
// ============================================================================

describe('quest-processor: parseQuests', () => {
  test('parses JSON requirement and computes target from count', () => {
    const quests = [
      { id: 'Q1', title: 'Do 5 Things', requirement: '{"count":5,"type":"job_complete"}' },
    ];
    const result = parseQuests(quests);

    expect(result[0].requirement).toEqual({ count: 5, type: 'job_complete' });
    expect(result[0].target).toBe(5);
  });

  test('defaults target to 1 when count is missing', () => {
    const quests = [{ id: 'Q1', title: 'Simple Quest', requirement: '{}' }];
    const result = parseQuests(quests);

    expect(result[0].target).toBe(1);
  });

  test('handles null requirement string gracefully', () => {
    const quests = [{ id: 'Q1', title: 'Quest', requirement: null }];
    const result = parseQuests(quests);

    expect(result[0].requirement).toEqual({});
    expect(result[0].target).toBe(1);
  });

  test('computes status "available" for unstarted quest', () => {
    const quests = [{ id: 'Q1', claimed: 0, completed: 0, started_at: null, requirement: '{}' }];
    const result = parseQuests(quests);

    expect(result[0].status).toBe('available');
  });

  test('computes status "in_progress" for started quest', () => {
    const quests = [{ id: 'Q1', claimed: 0, completed: 0, started_at: '2026-01-01T00:00:00Z', requirement: '{}' }];
    const result = parseQuests(quests);

    expect(result[0].status).toBe('in_progress');
  });

  test('computes status "claimable" for completed but unclaimed quest', () => {
    const quests = [{ id: 'Q1', claimed: 0, completed: 1, started_at: '2026-01-01', requirement: '{}' }];
    const result = parseQuests(quests);

    expect(result[0].status).toBe('claimable');
  });

  test('computes status "claimed" for fully claimed quest', () => {
    const quests = [{ id: 'Q1', claimed: 1, completed: 1, started_at: '2026-01-01', requirement: '{}' }];
    const result = parseQuests(quests);

    expect(result[0].status).toBe('claimed');
  });

  test('preserves all original quest fields', () => {
    const quests = [{
      id: 'Q1',
      title: 'Custom Quest',
      type: 'daily',
      xp_reward: 25,
      requirement: '{"count":3}',
      claimed: 0,
      completed: 0,
      started_at: null,
    }];
    const result = parseQuests(quests);

    expect(result[0].id).toBe('Q1');
    expect(result[0].title).toBe('Custom Quest');
    expect(result[0].type).toBe('daily');
    expect(result[0].xp_reward).toBe(25);
  });

  test('handles empty array', () => {
    const result = parseQuests([]);
    expect(result).toEqual([]);
  });
});

describe('quest-processor: updateQuestProgress', () => {
  test('increments progress by 1 and returns updated state', () => {
    const quest = { id: 'Q1', title: 'Daily Login', active: 1, requirement: '{"count":5}' };
    const candidateQuest = { quest_id: 'Q1', candidate_id: 'C001', progress: 2, target: 5, completed: 0 };

    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => quest) };
    stmtStore['FROM candidate_quests'] = { get: jest.fn(() => candidateQuest) };
    stmtStore['UPDATE candidate_quests'] = { run: jest.fn() };

    const result = updateQuestProgress(mockDb, 'Q1', 'C001', 1);

    expect(result.progress).toBe(3);
    expect(result.target).toBe(5);
    expect(result.completed).toBe(false);
    expect(result.questName).toBe('Daily Login');
  });

  test('marks quest as completed when progress reaches target', () => {
    const quest = { id: 'Q1', title: 'Three Jobs', active: 1, requirement: '{"count":3}' };
    const candidateQuest = { quest_id: 'Q1', candidate_id: 'C001', progress: 2, target: 3, completed: 0 };

    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => quest) };
    stmtStore['FROM candidate_quests'] = { get: jest.fn(() => candidateQuest) };
    stmtStore['UPDATE candidate_quests'] = { run: jest.fn() };

    const result = updateQuestProgress(mockDb, 'Q1', 'C001', 1);

    expect(result.progress).toBe(3);
    expect(result.completed).toBe(true);
  });

  test('caps progress at target (does not exceed)', () => {
    const quest = { id: 'Q1', title: 'Simple', active: 1, requirement: '{"count":3}' };
    const candidateQuest = { quest_id: 'Q1', candidate_id: 'C001', progress: 2, target: 3, completed: 0 };

    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => quest) };
    stmtStore['FROM candidate_quests'] = { get: jest.fn(() => candidateQuest) };
    stmtStore['UPDATE candidate_quests'] = { run: jest.fn() };

    const result = updateQuestProgress(mockDb, 'Q1', 'C001', 5); // increment by 5, but target is 3

    expect(result.progress).toBe(3); // capped at target
    expect(result.completed).toBe(true);
  });

  test('supports custom increment values', () => {
    const quest = { id: 'Q1', title: 'Big Quest', active: 1, requirement: '{"count":10}' };
    const candidateQuest = { quest_id: 'Q1', candidate_id: 'C001', progress: 3, target: 10, completed: 0 };

    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => quest) };
    stmtStore['FROM candidate_quests'] = { get: jest.fn(() => candidateQuest) };
    stmtStore['UPDATE candidate_quests'] = { run: jest.fn() };

    const result = updateQuestProgress(mockDb, 'Q1', 'C001', 4);

    expect(result.progress).toBe(7);
    expect(result.completed).toBe(false);
  });

  test('throws when quest does not exist', () => {
    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => null) };

    expect(() => {
      updateQuestProgress(mockDb, 'NONEXISTENT', 'C001', 1);
    }).toThrow('Quest not found or inactive');
  });

  test('throws when quest is inactive', () => {
    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => ({ id: 'Q1', active: 0, requirement: '{}' })) };

    expect(() => {
      updateQuestProgress(mockDb, 'Q1', 'C001', 1);
    }).toThrow('Quest not found or inactive');
  });

  test('throws when quest not started by candidate', () => {
    const quest = { id: 'Q1', title: 'Quest', active: 1, requirement: '{"count":5}' };
    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => quest) };
    stmtStore['FROM candidate_quests'] = { get: jest.fn(() => null) };

    expect(() => {
      updateQuestProgress(mockDb, 'Q1', 'C001', 1);
    }).toThrow('Quest not started by candidate');
  });

  test('throws when quest is already completed', () => {
    const quest = { id: 'Q1', title: 'Quest', active: 1, requirement: '{"count":5}' };
    const candidateQuest = { quest_id: 'Q1', candidate_id: 'C001', progress: 5, target: 5, completed: 1 };

    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => quest) };
    stmtStore['FROM candidate_quests'] = { get: jest.fn(() => candidateQuest) };

    expect(() => {
      updateQuestProgress(mockDb, 'Q1', 'C001', 1);
    }).toThrow('Quest already completed');
  });

  test('defaults target to 1 when requirement has no count', () => {
    const quest = { id: 'Q1', title: 'Simple', active: 1, requirement: '{}' };
    const candidateQuest = { quest_id: 'Q1', candidate_id: 'C001', progress: 0, target: 1, completed: 0 };

    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => quest) };
    stmtStore['FROM candidate_quests'] = { get: jest.fn(() => candidateQuest) };
    stmtStore['UPDATE candidate_quests'] = { run: jest.fn() };

    const result = updateQuestProgress(mockDb, 'Q1', 'C001', 1);

    expect(result.target).toBe(1);
    expect(result.progress).toBe(1);
    expect(result.completed).toBe(true);
  });

  test('writes correct values to database on progress update', () => {
    const quest = { id: 'Q1', title: 'Quest', active: 1, requirement: '{"count":5}' };
    const candidateQuest = { quest_id: 'Q1', candidate_id: 'C001', progress: 1, target: 5, completed: 0 };
    const runMock = jest.fn();

    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => quest) };
    stmtStore['FROM candidate_quests'] = { get: jest.fn(() => candidateQuest) };
    stmtStore['UPDATE candidate_quests'] = { run: runMock };

    updateQuestProgress(mockDb, 'Q1', 'C001', 2);

    expect(runMock).toHaveBeenCalledWith(
      3,       // newProgress = 1 + 2
      0,       // not completed (3 < 5)
      null,    // completedAt null since not completed
      'Q1',
      'C001'
    );
  });

  test('writes completion timestamp when quest completes', () => {
    const quest = { id: 'Q1', title: 'Quest', active: 1, requirement: '{"count":3}' };
    const candidateQuest = { quest_id: 'Q1', candidate_id: 'C001', progress: 2, target: 3, completed: 0 };
    const runMock = jest.fn();

    stmtStore['FROM quests WHERE id'] = { get: jest.fn(() => quest) };
    stmtStore['FROM candidate_quests'] = { get: jest.fn(() => candidateQuest) };
    stmtStore['UPDATE candidate_quests'] = { run: runMock };

    updateQuestProgress(mockDb, 'Q1', 'C001', 1);

    expect(runMock).toHaveBeenCalledWith(
      3,                          // newProgress
      1,                          // completed
      expect.any(String),         // completedAt is an ISO date string
      'Q1',
      'C001'
    );
  });
});

// ============================================================================
// 3. GET /rewards (listing)
// ============================================================================

describe('GET /rewards', () => {
  const app = buildApp();

  test('returns paginated active rewards', async () => {
    const rewards = [
      { id: 'R1', name: 'Badge', category: 'cosmetic', point_cost: 100, active: 1 },
      { id: 'R2', name: 'Boost', category: 'utility', point_cost: 200, active: 1 },
    ];

    stmtStore['COUNT(*)'] = { get: jest.fn(() => ({ total: 2 })) };
    stmtStore['SELECT * FROM rewards'] = { all: jest.fn(() => rewards) };

    const res = await request(app).get('/rewards');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
  });

  test('filters rewards by category', async () => {
    const cosmetic = [{ id: 'R1', name: 'Badge', category: 'cosmetic', point_cost: 100, active: 1 }];

    stmtStore['COUNT(*)'] = { get: jest.fn(() => ({ total: 1 })) };
    stmtStore['SELECT * FROM rewards'] = { all: jest.fn(() => cosmetic) };

    const res = await request(app).get('/rewards').query({ category: 'cosmetic' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test('filters rewards by tier_required', async () => {
    stmtStore['COUNT(*)'] = { get: jest.fn(() => ({ total: 0 })) };
    stmtStore['SELECT * FROM rewards'] = { all: jest.fn(() => []) };

    const res = await request(app).get('/rewards').query({ tier_required: 'gold' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
