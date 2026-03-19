/**
 * Unit Tests: Candidate Mutations (PUT update + POST create)
 *
 * Tests handler logic for candidate update and create routes.
 * Mocks the database layer and auth middleware to isolate route handler behavior.
 *
 * Read-only tests (GET list, GET profile) are in candidate-routes.test.js
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

function mockDbRun(returnValue) {
  return mockPrepare.mockReturnValueOnce({ run: jest.fn().mockReturnValue(returnValue) });
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

// ============================================
// IMPORT ROUTE HANDLERS
// ============================================

const profileRouter = require('../../routes/api/v1/candidates/routes/profile');
const createRouter = require('../../routes/api/v1/candidates/routes/create');

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

const updateProfileHandler = getHandler(profileRouter, 'put', '/:id');
const createHandler = getHandler(createRouter, 'post', '/');

// ============================================
// TESTS: PUT /:id (Update Profile)
// ============================================

describe('PUT /:id (update candidate profile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully updates candidate fields', () => {
    const mockReq = createMockReq({
      params: { id: 'CND001' },
      body: { name: 'John Updated', phone: '+6599999999' },
      user: { id: 'CND001', role: 'candidate' },
    });
    const mockRes = createMockRes();

    const updatedCandidate = { ...sampleCandidate, name: 'John Updated', phone: '+6599999999' };

    mockDbGet(sampleCandidate);
    mockDbRun({ changes: 1 });
    mockDbGet(updatedCandidate);

    updateProfileHandler(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          name: 'John Updated',
          phone: '+6599999999',
        }),
        message: 'Candidate updated successfully',
      })
    );
  });

  test('returns 404 when candidate to update not found', () => {
    const mockReq = createMockReq({
      params: { id: 'NONEXISTENT' },
      body: { name: 'Updated Name' },
    });
    const mockRes = createMockRes();

    mockDbGet(undefined);

    updateProfileHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Candidate not found',
      })
    );
  });

  test('returns 400 when no changes were made', () => {
    const mockReq = createMockReq({
      params: { id: 'CND001' },
      body: { name: 'Same Name' },
    });
    const mockRes = createMockRes();

    mockDbGet(sampleCandidate);
    mockDbRun({ changes: 0 });

    updateProfileHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'No changes made to candidate',
      })
    );
  });

  test('does not update id or created_at fields', () => {
    const mockReq = createMockReq({
      params: { id: 'CND001' },
      body: { id: 'HACKED_ID', created_at: '1999-01-01', name: 'Valid Update' },
    });
    const mockRes = createMockRes();

    mockDbGet(sampleCandidate);

    const mockRun = jest.fn().mockReturnValue({ changes: 1 });
    mockPrepare.mockReturnValueOnce({ run: mockRun });

    const updatedCandidate = { ...sampleCandidate, name: 'Valid Update' };
    mockDbGet(updatedCandidate);

    updateProfileHandler(mockReq, mockRes);

    const updateQueryCall = mockPrepare.mock.calls[1][0];
    const setClause = updateQueryCall.match(/SET\s+(.*?)\s+WHERE/)?.[1] || '';
    expect(setClause).not.toMatch(/\bid\s*=/);
    expect(setClause).not.toContain('created_at =');
  });

  test('does not update profile_photo unless explicitly provided', () => {
    const mockReq = createMockReq({
      params: { id: 'CND001' },
      body: { name: 'No Photo Change' },
    });
    const mockRes = createMockRes();

    mockDbGet(sampleCandidate);

    const mockRun = jest.fn().mockReturnValue({ changes: 1 });
    mockPrepare.mockReturnValueOnce({ run: mockRun });
    mockDbGet({ ...sampleCandidate, name: 'No Photo Change' });

    updateProfileHandler(mockReq, mockRes);

    const updateQueryCall = mockPrepare.mock.calls[1][0];
    expect(updateQueryCall).not.toContain('profile_photo');
  });

  test('updates profile_photo when explicitly provided', () => {
    const newPhoto = 'https://example.com/new-photo.jpg';
    const mockReq = createMockReq({
      params: { id: 'CND001' },
      body: { profile_photo: newPhoto },
    });
    const mockRes = createMockRes();

    mockDbGet(sampleCandidate);

    const mockRun = jest.fn().mockReturnValue({ changes: 1 });
    mockPrepare.mockReturnValueOnce({ run: mockRun });
    mockDbGet({ ...sampleCandidate, profile_photo: newPhoto });

    updateProfileHandler(mockReq, mockRes);

    const updateQueryCall = mockPrepare.mock.calls[1][0];
    expect(updateQueryCall).toContain('profile_photo');
  });

  test('stringifies JSON array fields for database storage', () => {
    const mockReq = createMockReq({
      params: { id: 'CND001' },
      body: { skills: ['driving', 'forklift'], certifications: ['Class 3'] },
    });
    const mockRes = createMockRes();

    mockDbGet(sampleCandidate);

    const mockRun = jest.fn().mockReturnValue({ changes: 1 });
    mockPrepare.mockReturnValueOnce({ run: mockRun });
    mockDbGet({
      ...sampleCandidate,
      skills: '["driving","forklift"]',
      certifications: '["Class 3"]',
    });

    updateProfileHandler(mockReq, mockRes);

    const runArgs = mockRun.mock.calls[0];
    const hasStringifiedSkills = runArgs.some(
      (arg) => typeof arg === 'string' && arg.includes('"driving"')
    );
    expect(hasStringifiedSkills).toBe(true);
  });

  test('returns 500 on database error during update', () => {
    const mockReq = createMockReq({
      params: { id: 'CND001' },
      body: { name: 'Crash Test' },
    });
    const mockRes = createMockRes();

    mockPrepare.mockImplementationOnce(() => {
      throw new Error('Disk full');
    });

    updateProfileHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Failed to update candidate',
      })
    );
  });
});

// ============================================
// TESTS: POST / (Create Candidate)
// ============================================

describe('POST / (create candidate)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates a new candidate successfully', () => {
    const mockReq = createMockReq({
      body: {
        name: 'New Candidate',
        email: 'new@example.com',
        phone: '+6590001111',
        skills: ['cleaning'],
      },
    });
    const mockRes = createMockRes();

    mockDbGet(undefined);

    const mockRun = jest.fn().mockReturnValue({ lastInsertRowid: 42 });
    mockPrepare.mockReturnValueOnce({ run: mockRun });

    mockDbGet({
      id: 42,
      name: 'New Candidate',
      email: 'new@example.com',
      phone: '+6590001111',
      skills: '["cleaning"]',
      certifications: '[]',
      preferred_locations: '[]',
      status: 'pending',
      tier: 1,
      level: 1,
      xp: 0,
      profile_photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
      created_at: '2025-06-01T00:00:00.000Z',
    });

    createHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Candidate created successfully',
        candidateId: 42,
        data: expect.objectContaining({
          name: 'New Candidate',
          email: 'new@example.com',
        }),
      })
    );
  });

  test('returns 409 when email already exists', () => {
    const mockReq = createMockReq({
      body: {
        name: 'Duplicate',
        email: 'john@example.com',
      },
    });
    const mockRes = createMockRes();

    mockDbGet({ id: 'CND001', email: 'john@example.com' });

    createHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Email already exists',
        conflictId: 'CND001',
      })
    );
  });

  test('sets default values for optional fields', () => {
    const mockReq = createMockReq({
      body: {
        name: 'Minimal Candidate',
        email: 'minimal@example.com',
      },
    });
    const mockRes = createMockRes();

    mockDbGet(undefined);

    const mockRun = jest.fn().mockReturnValue({ lastInsertRowid: 43 });
    mockPrepare.mockReturnValueOnce({ run: mockRun });

    mockDbGet({
      id: 43,
      name: 'Minimal Candidate',
      email: 'minimal@example.com',
      status: 'pending',
      tier: 1,
      level: 1,
      xp: 0,
      available: true,
      interview_status: 'not_scheduled',
      skills: '[]',
      certifications: '[]',
      preferred_locations: '[]',
      profile_photo: 'https://api.dicebear.com/7.x/test/svg',
      created_at: '2025-06-01T00:00:00.000Z',
    });

    createHandler(mockReq, mockRes);

    const insertQuery = mockPrepare.mock.calls[1][0];
    expect(insertQuery).toContain('INSERT INTO candidates');
    expect(insertQuery).toContain('status');

    const runArgs = mockRun.mock.calls[0];
    expect(runArgs).toContain('pending');
  });

  test('generates an avatar for new candidate without profile photo', () => {
    const mockReq = createMockReq({
      body: {
        name: 'Avatar Test',
        email: 'avatar@example.com',
      },
    });
    const mockRes = createMockRes();

    mockDbGet(undefined);

    const mockRun = jest.fn().mockReturnValue({ lastInsertRowid: 44 });
    mockPrepare.mockReturnValueOnce({ run: mockRun });

    mockDbGet({
      id: 44,
      name: 'Avatar Test',
      email: 'avatar@example.com',
      skills: '[]',
      certifications: '[]',
      preferred_locations: '[]',
      profile_photo: 'https://api.dicebear.com/7.x/some-style/svg?seed=test',
      created_at: '2025-06-01T00:00:00.000Z',
    });

    createHandler(mockReq, mockRes);

    const runArgs = mockRun.mock.calls[0];
    const hasAvatar = runArgs.some(
      (arg) => typeof arg === 'string' && arg.includes('dicebear.com')
    );
    expect(hasAvatar).toBe(true);
  });

  test('uses provided profile_photo instead of generating one', () => {
    const customPhoto = 'https://example.com/custom-photo.jpg';
    const mockReq = createMockReq({
      body: {
        name: 'Custom Photo',
        email: 'photo@example.com',
        profile_photo: customPhoto,
      },
    });
    const mockRes = createMockRes();

    mockDbGet(undefined);

    const mockRun = jest.fn().mockReturnValue({ lastInsertRowid: 45 });
    mockPrepare.mockReturnValueOnce({ run: mockRun });

    mockDbGet({
      id: 45,
      name: 'Custom Photo',
      email: 'photo@example.com',
      skills: '[]',
      certifications: '[]',
      preferred_locations: '[]',
      profile_photo: customPhoto,
      created_at: '2025-06-01T00:00:00.000Z',
    });

    createHandler(mockReq, mockRes);

    const runArgs = mockRun.mock.calls[0];
    expect(runArgs).toContain(customPhoto);
  });

  test('returns 400 when insert fails (no lastInsertRowid)', () => {
    const mockReq = createMockReq({
      body: {
        name: 'Failed Insert',
        email: 'fail@example.com',
      },
    });
    const mockRes = createMockRes();

    mockDbGet(undefined);

    const mockRun = jest.fn().mockReturnValue({ lastInsertRowid: 0 });
    mockPrepare.mockReturnValueOnce({ run: mockRun });

    createHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Failed to create candidate',
      })
    );
  });

  test('returns 500 on database error during creation', () => {
    const mockReq = createMockReq({
      body: {
        name: 'Error Candidate',
        email: 'error@example.com',
      },
    });
    const mockRes = createMockRes();

    mockPrepare.mockImplementationOnce(() => {
      throw new Error('Table locked');
    });

    createHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Failed to create candidate',
      })
    );
  });

  test('stringifies array fields before inserting', () => {
    const mockReq = createMockReq({
      body: {
        name: 'Array Fields',
        email: 'arrays@example.com',
        skills: ['welding', 'painting'],
        certifications: ['OSHA'],
        preferred_locations: ['North', 'South'],
      },
    });
    const mockRes = createMockRes();

    mockDbGet(undefined);

    const mockRun = jest.fn().mockReturnValue({ lastInsertRowid: 46 });
    mockPrepare.mockReturnValueOnce({ run: mockRun });

    mockDbGet({
      id: 46,
      name: 'Array Fields',
      email: 'arrays@example.com',
      skills: '["welding","painting"]',
      certifications: '["OSHA"]',
      preferred_locations: '["North","South"]',
      profile_photo: 'https://api.dicebear.com/7.x/test/svg',
      created_at: '2025-06-01T00:00:00.000Z',
    });

    createHandler(mockReq, mockRes);

    const runArgs = mockRun.mock.calls[0];
    const hasStringifiedSkills = runArgs.some(
      (arg) => typeof arg === 'string' && arg === '["welding","painting"]'
    );
    const hasStringifiedCerts = runArgs.some(
      (arg) => typeof arg === 'string' && arg === '["OSHA"]'
    );
    expect(hasStringifiedSkills).toBe(true);
    expect(hasStringifiedCerts).toBe(true);
  });
});
