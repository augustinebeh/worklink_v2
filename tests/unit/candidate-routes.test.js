/**
 * Unit Tests: Candidate Routes (GET list + GET profile)
 *
 * Tests handler logic for candidate list and profile retrieval routes.
 * Mocks the database layer and auth middleware to isolate route handler behavior.
 *
 * Mutation tests (PUT update, POST create) are in candidate-mutations.test.js
 */

// ============================================
// MOCK SETUP
// ============================================

// Mock db module - must be before requiring route files
const mockPrepare = jest.fn();
const mockExec = jest.fn();
const mockTransaction = jest.fn();

jest.mock('../../db', () => ({
  db: {
    prepare: mockPrepare,
    exec: mockExec,
    transaction: mockTransaction,
  },
}));

// Mock auth middleware - all pass through by default
jest.mock('../../middleware/auth', () => ({
  authenticateAdmin: (req, res, next) => next(),
  authenticateCandidateOwnership: (req, res, next) => next(),
  authenticateAdminOrOwner: (req, res, next) => next(),
  authenticateToken: (req, res, next) => next(),
  authenticateAny: (req, res, next) => next(),
}));

// Mock database-validation middleware
jest.mock('../../middleware/database-validation', () => ({
  createValidationMiddleware: () => (req, res, next) => next(),
}));

// Mock structured-logger
jest.mock('../../utils/structured-logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// ============================================
// HELPERS
// ============================================

/**
 * Create a mock Express response object
 */
function createMockRes() {
  const res = {
    json: jest.fn(),
    status: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

/**
 * Create a mock Express request object
 */
function createMockReq(overrides = {}) {
  return {
    params: {},
    query: {},
    body: {},
    user: { id: 'ADM_001', role: 'admin', email: 'admin@worklink.sg' },
    ...overrides,
  };
}

/**
 * Helper to create a mock db.prepare().get/all/run chain
 */
function mockDbGet(returnValue) {
  return mockPrepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue(returnValue) });
}

function mockDbAll(returnValue) {
  return mockPrepare.mockReturnValueOnce({ all: jest.fn().mockReturnValue(returnValue) });
}

// ============================================
// SAMPLE DATA
// ============================================

const sampleCandidate = {
  id: 'CND001',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+6591234567',
  status: 'active',
  skills: '["cleaning","security"]',
  certifications: '["WSQ"]',
  preferred_locations: '["Central","East"]',
  experience_level: 'intermediate',
  available: 1,
  tier: 2,
  level: 3,
  xp: 150,
  profile_photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-06-01T00:00:00.000Z',
};

const sampleCandidate2 = {
  id: 'CND002',
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '+6598765432',
  status: 'pending',
  skills: '["admin","data-entry"]',
  certifications: '[]',
  preferred_locations: '["West"]',
  experience_level: 'beginner',
  available: 0,
  tier: 1,
  level: 1,
  xp: 0,
  profile_photo: null,
  avatar_url: null,
  created_at: '2025-02-01T00:00:00.000Z',
  updated_at: '2025-06-01T00:00:00.000Z',
};

// ============================================
// IMPORT ROUTE HANDLERS
// ============================================

const listRouter = require('../../routes/api/v1/candidates/routes/list');
const profileRouter = require('../../routes/api/v1/candidates/routes/profile');

/**
 * Extract a handler from an Express router by method and path.
 */
function getHandler(router, method, path) {
  for (const layer of router.stack) {
    if (
      layer.route &&
      layer.route.path === path &&
      layer.route.methods[method]
    ) {
      const handlers = layer.route.stack;
      return handlers[handlers.length - 1].handle;
    }
  }
  throw new Error(`Handler not found: ${method.toUpperCase()} ${path}`);
}

const listHandler = getHandler(listRouter, 'get', '/');
const getProfileHandler = getHandler(profileRouter, 'get', '/:id');

// ============================================
// TESTS: GET / (List Candidates)
// ============================================

describe('GET / (list candidates)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns a list of candidates with pagination', () => {
    const mockReq = createMockReq({ query: {} });
    const mockRes = createMockRes();

    mockDbAll([sampleCandidate, sampleCandidate2]);
    mockDbGet({ count: 2 });

    listHandler(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'CND001', name: 'John Doe' }),
          expect.objectContaining({ id: 'CND002', name: 'Jane Smith' }),
        ]),
        pagination: expect.objectContaining({
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        }),
      })
    );
  });

  test('parses JSON fields (skills, certifications, preferred_locations)', () => {
    const mockReq = createMockReq({ query: {} });
    const mockRes = createMockRes();

    mockDbAll([sampleCandidate]);
    mockDbGet({ count: 1 });

    listHandler(mockReq, mockRes);

    const responseData = mockRes.json.mock.calls[0][0].data[0];
    expect(Array.isArray(responseData.skills)).toBe(true);
    expect(responseData.skills).toEqual(['cleaning', 'security']);
    expect(Array.isArray(responseData.certifications)).toBe(true);
    expect(responseData.certifications).toEqual(['WSQ']);
    expect(Array.isArray(responseData.preferred_locations)).toBe(true);
    expect(responseData.preferred_locations).toEqual(['Central', 'East']);
  });

  test('passes search filter through to query builder', () => {
    const mockReq = createMockReq({ query: { search: 'John' } });
    const mockRes = createMockRes();

    mockDbAll([sampleCandidate]);
    mockDbGet({ count: 1 });

    listHandler(mockReq, mockRes);

    const searchCallArgs = mockPrepare.mock.calls[0][0];
    expect(searchCallArgs).toContain('LIKE');
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        filters: expect.objectContaining({ search: 'John' }),
      })
    );
  });

  test('passes status filter through to query builder', () => {
    const mockReq = createMockReq({ query: { status: 'active' } });
    const mockRes = createMockRes();

    mockDbAll([sampleCandidate]);
    mockDbGet({ count: 1 });

    listHandler(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        filters: expect.objectContaining({ status: 'active' }),
      })
    );
  });

  test('handles pagination parameters (page, limit)', () => {
    const mockReq = createMockReq({ query: { page: '2', limit: '5' } });
    const mockRes = createMockRes();

    mockDbAll([]);
    mockDbGet({ count: 10 });

    listHandler(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        pagination: expect.objectContaining({
          page: 2,
          limit: 5,
          total: 10,
          totalPages: 2,
          hasNext: false,
          hasPrev: true,
        }),
      })
    );
  });

  test('hasNext is true when there are more pages', () => {
    const mockReq = createMockReq({ query: { page: '1', limit: '1' } });
    const mockRes = createMockRes();

    mockDbAll([sampleCandidate]);
    mockDbGet({ count: 3 });

    listHandler(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: expect.objectContaining({
          hasNext: true,
          hasPrev: false,
          totalPages: 3,
        }),
      })
    );
  });

  test('returns empty list when no candidates match', () => {
    const mockReq = createMockReq({ query: { search: 'nonexistent' } });
    const mockRes = createMockRes();

    mockDbAll([]);
    mockDbGet({ count: 0 });

    listHandler(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: [],
        pagination: expect.objectContaining({
          total: 0,
          totalPages: 0,
        }),
      })
    );
  });

  test('returns 500 on database error', () => {
    const mockReq = createMockReq({ query: {} });
    const mockRes = createMockRes();

    mockPrepare.mockImplementationOnce(() => {
      throw new Error('Database connection lost');
    });

    listHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Failed to retrieve candidates',
      })
    );
  });
});

// ============================================
// TESTS: GET /:id (Get Profile)
// ============================================

describe('GET /:id (get candidate profile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns candidate data when found', () => {
    const mockReq = createMockReq({
      params: { id: 'CND001' },
      query: {},
      user: { id: 'CND001', role: 'candidate' },
    });
    const mockRes = createMockRes();

    mockDbGet(sampleCandidate);

    getProfileHandler(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          id: 'CND001',
          name: 'John Doe',
          email: 'john@example.com',
        }),
        message: 'Candidate retrieved successfully',
      })
    );
  });

  test('parses JSON fields in the response', () => {
    const mockReq = createMockReq({
      params: { id: 'CND001' },
      query: {},
    });
    const mockRes = createMockRes();

    mockDbGet(sampleCandidate);

    getProfileHandler(mockReq, mockRes);

    const responseData = mockRes.json.mock.calls[0][0].data;
    expect(responseData.skills).toEqual(['cleaning', 'security']);
    expect(responseData.certifications).toEqual(['WSQ']);
    expect(responseData.preferred_locations).toEqual(['Central', 'East']);
  });

  test('maps profile_photo to avatar_url for frontend compatibility', () => {
    const mockReq = createMockReq({
      params: { id: 'CND001' },
      query: {},
    });
    const mockRes = createMockRes();

    mockDbGet(sampleCandidate);

    getProfileHandler(mockReq, mockRes);

    const responseData = mockRes.json.mock.calls[0][0].data;
    expect(responseData.avatar_url).toBe(sampleCandidate.profile_photo);
  });

  test('returns 404 when candidate not found', () => {
    const mockReq = createMockReq({
      params: { id: 'NONEXISTENT' },
      query: {},
    });
    const mockRes = createMockRes();

    mockDbGet(undefined);

    getProfileHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Candidate not found',
      })
    );
  });

  test('includes stats when includeStats=true', () => {
    const mockReq = createMockReq({
      params: { id: 'CND001' },
      query: { includeStats: 'true' },
    });
    const mockRes = createMockRes();

    mockDbGet(sampleCandidate);
    mockDbGet({
      total_applications: 5,
      accepted_applications: 2,
      rejected_applications: 1,
      pending_applications: 2,
    });
    mockDbGet({
      total_payments: 3,
      total_earnings: 450.0,
      average_payment: 150.0,
    });
    mockDbAll([
      { title: 'Office Cleaner', location: 'Central', status: 'completed', created_at: '2025-05-01' },
    ]);

    getProfileHandler(mockReq, mockRes);

    const responseData = mockRes.json.mock.calls[0][0].data;
    expect(responseData.stats).toBeDefined();
    expect(responseData.stats.jobs.total_applications).toBe(5);
    expect(responseData.stats.payments.total_earnings).toBe(450.0);
    expect(responseData.stats.recent_jobs).toHaveLength(1);
  });

  test('does not include stats when includeStats is not set', () => {
    const mockReq = createMockReq({
      params: { id: 'CND001' },
      query: {},
    });
    const mockRes = createMockRes();

    mockDbGet(sampleCandidate);

    getProfileHandler(mockReq, mockRes);

    const responseData = mockRes.json.mock.calls[0][0].data;
    expect(responseData.stats).toBeUndefined();
  });

  test('returns candidate without stats if stats queries fail', () => {
    const mockReq = createMockReq({
      params: { id: 'CND001' },
      query: { includeStats: 'true' },
    });
    const mockRes = createMockRes();

    mockDbGet(sampleCandidate);
    mockPrepare.mockImplementationOnce(() => {
      throw new Error('no such table: deployments');
    });

    getProfileHandler(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ id: 'CND001' }),
      })
    );
  });

  test('returns 500 on unexpected database error', () => {
    const mockReq = createMockReq({
      params: { id: 'CND001' },
      query: {},
    });
    const mockRes = createMockRes();

    mockPrepare.mockImplementationOnce(() => {
      throw new Error('Database failure');
    });

    getProfileHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Failed to retrieve candidate',
      })
    );
  });
});
