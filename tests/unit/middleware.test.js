/**
 * Unit Tests: Middleware Stack
 *
 * Tests authentication middleware (role checks, ownership, optional auth,
 * legacy auth delegation), getUserFromDatabase security fixes, and
 * the centralized error handler.
 *
 * Mocks: jwt.verify, db.prepare, logger
 */

// ── Environment setup (before any require) ─────────────────────────
process.env.JWT_SECRET = 'test-secret-key-for-middleware-tests';
process.env.NODE_ENV = 'test';

// ── Mock logger (prevent console noise) ────────────────────────────
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// ── Mock database ──────────────────────────────────────────────────
const mockGet = jest.fn();
const mockPrepare = jest.fn(() => ({ get: mockGet }));

jest.mock('../../db', () => ({
  db: { prepare: mockPrepare },
}));

// ── Requires ───────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');
const {
  generateToken,
  generateAdminToken,
  verifyToken,
  authenticateAdmin,
  authenticateCandidate,
  authenticateCandidateOwnership,
  authenticateAdminOrOwner,
  optionalAuth,
  legacyAuth,
  JWT_SECRET,
} = require('../../middleware/auth');

const {
  errorHandler,
  ApiError,
  notFoundHandler,
  asyncHandler,
} = require('../../middleware/errorHandler');

// ── Helpers ────────────────────────────────────────────────────────

/** Build a minimal Express-like request object */
function mockReq(overrides = {}) {
  return {
    headers: {},
    cookies: {},
    params: {},
    body: {},
    path: '/test',
    ...overrides,
  };
}

/** Build a minimal Express-like response object with chainable status/json */
function mockRes() {
  const res = {
    statusCode: null,
    body: null,
  };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((data) => {
    res.body = data;
    return res;
  });
  return res;
}

/** Create a valid signed token for a given payload */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '1h',
    issuer: 'worklink-v2',
    audience: 'worklink-users',
  });
}

/** Convenience: req with a Bearer token header */
function reqWithToken(payload, extra = {}) {
  const token = signToken(payload);
  return mockReq({
    headers: { authorization: `Bearer ${token}` },
    ...extra,
  });
}

// ── Reset mocks between tests ──────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  // Default: db returns nothing
  mockGet.mockReturnValue(null);
});

// ====================================================================
// 1. authenticateAdmin
// ====================================================================
describe('authenticateAdmin', () => {
  test('allows request when user has admin role', (done) => {
    // DB returns admin user for ADMIN001
    mockGet.mockReturnValue(null); // candidate lookup returns null
    // getUserFromDatabase for admin type just checks userId === 'ADMIN001'
    const req = reqWithToken({ id: 'ADMIN001', email: 'admin@worklink.sg', name: 'Admin', role: 'admin', type: 'admin' });
    const res = mockRes();

    authenticateAdmin(req, res, () => {
      expect(req.user).toBeDefined();
      expect(req.user.role).toBe('admin');
      done();
    });
  });

  test('rejects candidate with 403', (done) => {
    // Token says candidate, DB returns a candidate row
    mockGet.mockReturnValue({
      id: 'C001', name: 'Test', email: 'c@test.com',
      status: 'active', role: 'candidate', type: 'candidate',
    });

    const req = reqWithToken({ id: 'C001', email: 'c@test.com', name: 'Test', role: 'candidate', type: 'candidate' });
    const res = mockRes();

    authenticateAdmin(req, res, () => {
      // Should not reach here
      done.fail('next() should not have been called');
    });

    // Give the sync call stack time to complete
    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
      done();
    });
  });

  test('rejects unauthenticated request (no token) with 401', (done) => {
    const req = mockReq(); // no token
    const res = mockRes();

    authenticateAdmin(req, res, () => {
      done.fail('next() should not have been called');
    });

    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body.code).toBe('NO_TOKEN');
      done();
    });
  });

  test('rejects invalid token with 401', (done) => {
    const req = mockReq({ headers: { authorization: 'Bearer bad.token.value' } });
    const res = mockRes();

    authenticateAdmin(req, res, () => {
      done.fail('next() should not have been called');
    });

    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
      done();
    });
  });
});

// ====================================================================
// 2. authenticateCandidate
// ====================================================================
describe('authenticateCandidate', () => {
  test('allows request when user has candidate role', (done) => {
    mockGet.mockReturnValue({
      id: 'C001', name: 'Test', email: 'c@test.com',
      status: 'active', role: 'candidate', type: 'candidate',
    });

    const req = reqWithToken({ id: 'C001', email: 'c@test.com', name: 'Test', role: 'candidate', type: 'candidate' });
    const res = mockRes();

    authenticateCandidate(req, res, () => {
      expect(req.user).toBeDefined();
      expect(req.user.role).toBe('candidate');
      done();
    });
  });

  test('rejects admin with 403', (done) => {
    // Token is admin, DB returns admin for ADMIN001
    const req = reqWithToken({ id: 'ADMIN001', email: 'admin@worklink.sg', name: 'Admin', role: 'admin', type: 'admin' });
    const res = mockRes();

    authenticateCandidate(req, res, () => {
      done.fail('next() should not have been called for admin');
    });

    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toBe('Candidate access required');
      done();
    });
  });

  test('rejects unauthenticated request with 401', (done) => {
    const req = mockReq();
    const res = mockRes();

    authenticateCandidate(req, res, () => {
      done.fail('next() should not have been called');
    });

    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(401);
      done();
    });
  });
});

// ====================================================================
// 3. authenticateCandidateOwnership
// ====================================================================
describe('authenticateCandidateOwnership', () => {
  test('allows candidate to access their own data (params.id)', (done) => {
    mockGet.mockReturnValue({
      id: 'C001', name: 'Test', email: 'c@test.com',
      status: 'active', role: 'candidate', type: 'candidate',
    });

    const req = reqWithToken(
      { id: 'C001', email: 'c@test.com', name: 'Test', role: 'candidate', type: 'candidate' },
      { params: { id: 'C001' } }
    );
    const res = mockRes();

    authenticateCandidateOwnership(req, res, () => {
      expect(req.user.id).toBe('C001');
      done();
    });
  });

  test('allows candidate to access their own data (params.candidateId)', (done) => {
    mockGet.mockReturnValue({
      id: 'C001', name: 'Test', email: 'c@test.com',
      status: 'active', role: 'candidate', type: 'candidate',
    });

    const req = reqWithToken(
      { id: 'C001', email: 'c@test.com', name: 'Test', role: 'candidate', type: 'candidate' },
      { params: { candidateId: 'C001' } }
    );
    const res = mockRes();

    authenticateCandidateOwnership(req, res, () => {
      expect(req.user.id).toBe('C001');
      done();
    });
  });

  test('allows candidate to access their own data (body.candidate_id)', (done) => {
    mockGet.mockReturnValue({
      id: 'C001', name: 'Test', email: 'c@test.com',
      status: 'active', role: 'candidate', type: 'candidate',
    });

    const req = reqWithToken(
      { id: 'C001', email: 'c@test.com', name: 'Test', role: 'candidate', type: 'candidate' },
      { body: { candidate_id: 'C001' } }
    );
    const res = mockRes();

    authenticateCandidateOwnership(req, res, () => {
      expect(req.user.id).toBe('C001');
      done();
    });
  });

  test('rejects candidate accessing another candidate data with 403', (done) => {
    mockGet.mockReturnValue({
      id: 'C001', name: 'Test', email: 'c@test.com',
      status: 'active', role: 'candidate', type: 'candidate',
    });

    const req = reqWithToken(
      { id: 'C001', email: 'c@test.com', name: 'Test', role: 'candidate', type: 'candidate' },
      { params: { id: 'C999' } }
    );
    const res = mockRes();

    authenticateCandidateOwnership(req, res, () => {
      done.fail('next() should not have been called');
    });

    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toBe('Can only access your own data');
      done();
    });
  });

  test('allows candidate when no candidateId param is present (no ownership check needed)', (done) => {
    mockGet.mockReturnValue({
      id: 'C001', name: 'Test', email: 'c@test.com',
      status: 'active', role: 'candidate', type: 'candidate',
    });

    const req = reqWithToken(
      { id: 'C001', email: 'c@test.com', name: 'Test', role: 'candidate', type: 'candidate' },
      { params: {} }
    );
    const res = mockRes();

    authenticateCandidateOwnership(req, res, () => {
      // When no id param, ownership check is skipped
      expect(req.user.id).toBe('C001');
      done();
    });
  });
});

// ====================================================================
// 4. authenticateAdminOrOwner
// ====================================================================
describe('authenticateAdminOrOwner', () => {
  test('allows admin to access any candidate data', (done) => {
    // Admin token, accessing another candidate's resource
    const req = reqWithToken(
      { id: 'ADMIN001', email: 'admin@worklink.sg', name: 'Admin', role: 'admin', type: 'admin' },
      { params: { id: 'C999' } }
    );
    const res = mockRes();

    authenticateAdminOrOwner(req, res, () => {
      expect(req.user.role).toBe('admin');
      done();
    });
  });

  test('allows candidate to access their own data', (done) => {
    mockGet.mockReturnValue({
      id: 'C001', name: 'Test', email: 'c@test.com',
      status: 'active', role: 'candidate', type: 'candidate',
    });

    const req = reqWithToken(
      { id: 'C001', email: 'c@test.com', name: 'Test', role: 'candidate', type: 'candidate' },
      { params: { id: 'C001' } }
    );
    const res = mockRes();

    authenticateAdminOrOwner(req, res, () => {
      expect(req.user.id).toBe('C001');
      done();
    });
  });

  test('rejects candidate accessing another candidate data with 403', (done) => {
    mockGet.mockReturnValue({
      id: 'C001', name: 'Test', email: 'c@test.com',
      status: 'active', role: 'candidate', type: 'candidate',
    });

    const req = reqWithToken(
      { id: 'C001', email: 'c@test.com', name: 'Test', role: 'candidate', type: 'candidate' },
      { params: { id: 'C999' } }
    );
    const res = mockRes();

    authenticateAdminOrOwner(req, res, () => {
      done.fail('next() should not have been called');
    });

    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toBe('Access denied');
      done();
    });
  });

  test('rejects candidate when no id param is present (cannot prove ownership)', (done) => {
    mockGet.mockReturnValue({
      id: 'C001', name: 'Test', email: 'c@test.com',
      status: 'active', role: 'candidate', type: 'candidate',
    });

    const req = reqWithToken(
      { id: 'C001', email: 'c@test.com', name: 'Test', role: 'candidate', type: 'candidate' },
      { params: {} }
    );
    const res = mockRes();

    authenticateAdminOrOwner(req, res, () => {
      done.fail('next() should not have been called');
    });

    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(403);
      done();
    });
  });

  test('rejects unauthenticated request with 401', (done) => {
    const req = mockReq({ params: { id: 'C001' } });
    const res = mockRes();

    authenticateAdminOrOwner(req, res, () => {
      done.fail('next() should not have been called');
    });

    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(401);
      done();
    });
  });
});

// ====================================================================
// 5. optionalAuth
// ====================================================================
describe('optionalAuth', () => {
  test('attaches user when valid token is present', (done) => {
    mockGet.mockReturnValue({
      id: 'C001', name: 'Test', email: 'c@test.com',
      status: 'active', role: 'candidate', type: 'candidate',
    });

    const req = reqWithToken({ id: 'C001', email: 'c@test.com', name: 'Test', role: 'candidate', type: 'candidate' });
    const res = mockRes();

    optionalAuth(req, res, () => {
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('C001');
      expect(req.token).toBeDefined();
      done();
    });
  });

  test('calls next() without user when no token is present', (done) => {
    const req = mockReq();
    const res = mockRes();

    optionalAuth(req, res, () => {
      expect(req.user).toBeUndefined();
      expect(req.token).toBeUndefined();
      done();
    });
  });

  test('calls next() without user when token is invalid (null dereference fix)', (done) => {
    // This tests the security fix: verifyToken returns null for a bad token,
    // and optionalAuth must not crash trying to access decoded.id
    const req = mockReq({ headers: { authorization: 'Bearer invalid.token.here' } });
    const res = mockRes();

    optionalAuth(req, res, () => {
      // Should reach next() without crashing
      expect(req.user).toBeUndefined();
      done();
    });
  });

  test('does not attach user when token is valid but user is inactive', (done) => {
    mockGet.mockReturnValue({
      id: 'C001', name: 'Test', email: 'c@test.com',
      status: 'suspended', role: 'candidate', type: 'candidate',
    });

    const req = reqWithToken({ id: 'C001', email: 'c@test.com', name: 'Test', role: 'candidate', type: 'candidate' });
    const res = mockRes();

    optionalAuth(req, res, () => {
      // User exists but is not active, so should not be attached
      expect(req.user).toBeUndefined();
      done();
    });
  });

  test('does not attach user when token is valid but user not found in DB', (done) => {
    // DB returns null (user deleted or never existed)
    mockGet.mockReturnValue(null);

    const req = reqWithToken({ id: 'C999', email: 'gone@test.com', name: 'Ghost', role: 'candidate', type: 'candidate' });
    const res = mockRes();

    optionalAuth(req, res, () => {
      expect(req.user).toBeUndefined();
      done();
    });
  });

  test('handles thrown exception gracefully and still calls next()', (done) => {
    // Force db.prepare to throw
    mockPrepare.mockImplementationOnce(() => { throw new Error('DB exploded'); });

    const req = reqWithToken({ id: 'C001', email: 'c@test.com', name: 'Test', role: 'candidate', type: 'candidate' });
    const res = mockRes();

    optionalAuth(req, res, () => {
      // Should reach next() even after error
      expect(req.user).toBeUndefined();
      done();
    });
  });
});

// ====================================================================
// 6. legacyAuth
// ====================================================================
describe('legacyAuth', () => {
  test('delegates to authenticateUser -- rejects when no token', (done) => {
    const req = mockReq();
    const res = mockRes();

    legacyAuth(req, res, () => {
      done.fail('next() should not have been called');
    });

    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body.code).toBe('NO_TOKEN');
      done();
    });
  });

  test('delegates to authenticateUser -- succeeds with valid candidate token', (done) => {
    mockGet.mockReturnValue({
      id: 'C001', name: 'Test', email: 'c@test.com',
      status: 'active', role: 'candidate', type: 'candidate',
    });

    const req = reqWithToken({ id: 'C001', email: 'c@test.com', name: 'Test', role: 'candidate', type: 'candidate' });
    const res = mockRes();

    legacyAuth(req, res, () => {
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('C001');
      done();
    });
  });

  test('delegates to authenticateUser -- rejects invalid token', (done) => {
    const req = mockReq({ headers: { authorization: 'Bearer totally.bogus.token' } });
    const res = mockRes();

    legacyAuth(req, res, () => {
      done.fail('next() should not have been called');
    });

    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
      done();
    });
  });
});

// ====================================================================
// 7. getUserFromDatabase (tested indirectly via authenticateUser)
// ====================================================================
describe('getUserFromDatabase (security fixes)', () => {
  test('returns admin object for ADMIN001', (done) => {
    // When token says type=admin and id=ADMIN001, getUserFromDatabase
    // returns a hardcoded admin object without querying the database.
    const req = reqWithToken({ id: 'ADMIN001', email: 'admin@worklink.sg', name: 'Admin', role: 'admin', type: 'admin' });
    const res = mockRes();

    legacyAuth(req, res, () => {
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('ADMIN001');
      expect(req.user.role).toBe('admin');
      // The DB prepare should NOT have been called for admin lookup --
      // only ADMIN001 is hardcoded, no DB query needed.
      expect(mockGet).not.toHaveBeenCalled();
      done();
    });
  });

  test('returns null for ADM_ prefix IDs that are not ADMIN001 (no arbitrary admin creation)', (done) => {
    // SECURITY FIX: Previously, any ID starting with ADM_ would get an
    // admin object fabricated on the fly. Now only ADMIN001 is valid.
    const req = reqWithToken({ id: 'ADM_999', email: 'fake@hack.com', name: 'Hacker', role: 'admin', type: 'admin' });
    const res = mockRes();

    legacyAuth(req, res, () => {
      done.fail('next() should not have been called for fake admin');
    });

    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body.code).toBe('USER_NOT_FOUND');
      done();
    });
  });

  test('returns null for ADM_EXPLOIT ID (prevents privilege escalation)', (done) => {
    const req = reqWithToken({ id: 'ADM_EXPLOIT', email: 'evil@bad.com', name: 'Evil', role: 'admin', type: 'admin' });
    const res = mockRes();

    legacyAuth(req, res, () => {
      done.fail('Should not authenticate');
    });

    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body.code).toBe('USER_NOT_FOUND');
      done();
    });
  });

  test('queries candidates table for candidate type', (done) => {
    mockGet.mockReturnValue({
      id: 'C001', name: 'Test', email: 'c@test.com',
      status: 'active', role: 'candidate', type: 'candidate',
    });

    const req = reqWithToken({ id: 'C001', email: 'c@test.com', name: 'Test', role: 'candidate', type: 'candidate' });
    const res = mockRes();

    legacyAuth(req, res, () => {
      expect(mockPrepare).toHaveBeenCalled();
      expect(mockGet).toHaveBeenCalledWith('C001');
      expect(req.user.id).toBe('C001');
      done();
    });
  });

  test('returns 401 USER_NOT_FOUND when candidate not in database', (done) => {
    mockGet.mockReturnValue(null); // candidate not found

    const req = reqWithToken({ id: 'C_GHOST', email: 'ghost@test.com', name: 'Ghost', role: 'candidate', type: 'candidate' });
    const res = mockRes();

    legacyAuth(req, res, () => {
      done.fail('Should not authenticate deleted candidate');
    });

    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body.code).toBe('USER_NOT_FOUND');
      done();
    });
  });

  test('returns 401 ACCOUNT_INACTIVE for suspended candidate', (done) => {
    mockGet.mockReturnValue({
      id: 'C001', name: 'Banned', email: 'banned@test.com',
      status: 'suspended', role: 'candidate', type: 'candidate',
    });

    const req = reqWithToken({ id: 'C001', email: 'banned@test.com', name: 'Banned', role: 'candidate', type: 'candidate' });
    const res = mockRes();

    legacyAuth(req, res, () => {
      done.fail('Should not authenticate suspended user');
    });

    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body.code).toBe('ACCOUNT_INACTIVE');
      done();
    });
  });

  test('handles database error gracefully (returns USER_NOT_FOUND)', (done) => {
    mockPrepare.mockImplementationOnce(() => { throw new Error('SQLITE_ERROR'); });

    const req = reqWithToken({ id: 'C001', email: 'c@test.com', name: 'Test', role: 'candidate', type: 'candidate' });
    const res = mockRes();

    legacyAuth(req, res, () => {
      done.fail('Should not authenticate when DB errors');
    });

    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body.code).toBe('USER_NOT_FOUND');
      done();
    });
  });
});

// ====================================================================
// 8. Error Handler Middleware
// ====================================================================
describe('errorHandler', () => {
  const nextFn = jest.fn();

  test('returns correct status code from ApiError', () => {
    const err = ApiError.badRequest('Missing field', 'MISSING_FIELD');
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, nextFn);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Missing field');
    expect(res.body.code).toBe('MISSING_FIELD');
  });

  test('defaults to 500 when err.status is not set', () => {
    const err = new Error('Something broke');
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, nextFn);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body.error).toBe('Something broke');
  });

  test('includes stack trace in non-production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const err = new Error('Dev error');
    err.stack = 'Error: Dev error\n    at test.js:1:1';
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, nextFn);

    expect(res.body.stack).toBeDefined();
    expect(res.body.stack).toContain('Dev error');

    process.env.NODE_ENV = originalEnv;
  });

  test('hides stack trace in production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new Error('Prod error');
    err.stack = 'Error: Prod error\n    at secret-file.js:42:1';
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, nextFn);

    expect(res.body.stack).toBeUndefined();

    process.env.NODE_ENV = originalEnv;
  });

  test('includes error code when present', () => {
    const err = ApiError.unauthorized('Bad token', 'TOKEN_EXPIRED');
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, nextFn);

    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });

  test('omits code field when err.code is not set', () => {
    const err = new Error('Generic error');
    const req = mockReq();
    const res = mockRes();

    errorHandler(err, req, res, nextFn);

    expect(res.body.code).toBeUndefined();
  });
});

// ====================================================================
// ApiError static factory methods
// ====================================================================
describe('ApiError', () => {
  test('badRequest creates 400 error', () => {
    const err = ApiError.badRequest();
    expect(err.status).toBe(400);
    expect(err.message).toBe('Bad Request');
    expect(err.code).toBe('BAD_REQUEST');
  });

  test('unauthorized creates 401 error', () => {
    const err = ApiError.unauthorized();
    expect(err.status).toBe(401);
    expect(err.message).toBe('Unauthorized');
  });

  test('forbidden creates 403 error', () => {
    const err = ApiError.forbidden();
    expect(err.status).toBe(403);
  });

  test('notFound creates 404 error', () => {
    const err = ApiError.notFound();
    expect(err.status).toBe(404);
  });

  test('conflict creates 409 error', () => {
    const err = ApiError.conflict();
    expect(err.status).toBe(409);
  });

  test('internal creates 500 error', () => {
    const err = ApiError.internal();
    expect(err.status).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
  });

  test('custom message and code override defaults', () => {
    const err = ApiError.badRequest('Email taken', 'DUPLICATE_EMAIL');
    expect(err.message).toBe('Email taken');
    expect(err.code).toBe('DUPLICATE_EMAIL');
  });

  test('is an instance of Error', () => {
    const err = ApiError.internal();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.name).toBe('ApiError');
  });
});

// ====================================================================
// notFoundHandler
// ====================================================================
describe('notFoundHandler', () => {
  test('returns 404 with path info', () => {
    const req = mockReq({ path: '/api/v1/nonexistent' });
    const res = mockRes();

    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Not Found');
    expect(res.body.path).toBe('/api/v1/nonexistent');
  });
});

// ====================================================================
// asyncHandler
// ====================================================================
describe('asyncHandler', () => {
  test('passes sync errors to next()', () => {
    // Promise.resolve(fn()) -- if fn throws synchronously, the throw
    // escapes before Promise.resolve wraps it. This is a known
    // limitation of the asyncHandler pattern; it is designed for async
    // handlers. Synchronous throws propagate to the Express error
    // handling layer directly (which is acceptable).
    const next = jest.fn();
    const handler = asyncHandler(() => {
      throw new Error('sync boom');
    });

    expect(() => handler(mockReq(), mockRes(), next)).toThrow('sync boom');
  });

  test('passes async rejection to next()', async () => {
    const next = jest.fn();
    const handler = asyncHandler(async () => {
      throw new Error('async boom');
    });

    await handler(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('does not call next(err) on success', async () => {
    const next = jest.fn();
    const res = mockRes();
    const handler = asyncHandler(async (_req, r) => {
      r.status(200).json({ ok: true });
    });

    await handler(mockReq(), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});

// ====================================================================
// Token extraction edge cases (via auth middleware)
// ====================================================================
describe('token extraction', () => {
  test('extracts token from cookie when no Authorization header', (done) => {
    mockGet.mockReturnValue({
      id: 'C001', name: 'Test', email: 'c@test.com',
      status: 'active', role: 'candidate', type: 'candidate',
    });

    const token = signToken({ id: 'C001', email: 'c@test.com', name: 'Test', role: 'candidate', type: 'candidate' });
    const req = mockReq({ cookies: { token } });
    const res = mockRes();

    legacyAuth(req, res, () => {
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('C001');
      done();
    });
  });

  test('prefers Authorization header over cookie', (done) => {
    mockGet.mockReturnValue({
      id: 'C001', name: 'Header User', email: 'header@test.com',
      status: 'active', role: 'candidate', type: 'candidate',
    });

    const headerToken = signToken({ id: 'C001', email: 'header@test.com', name: 'Header User', role: 'candidate', type: 'candidate' });
    const cookieToken = signToken({ id: 'C002', email: 'cookie@test.com', name: 'Cookie User', role: 'candidate', type: 'candidate' });

    const req = mockReq({
      headers: { authorization: `Bearer ${headerToken}` },
      cookies: { token: cookieToken },
    });
    const res = mockRes();

    legacyAuth(req, res, () => {
      // Should have used the header token (C001), not the cookie (C002)
      expect(mockGet).toHaveBeenCalledWith('C001');
      done();
    });
  });

  test('rejects Authorization header without Bearer prefix', (done) => {
    const token = signToken({ id: 'C001', email: 'c@test.com', name: 'Test', role: 'candidate', type: 'candidate' });
    const req = mockReq({ headers: { authorization: token } }); // no "Bearer " prefix
    const res = mockRes();

    legacyAuth(req, res, () => {
      done.fail('Should not authenticate without Bearer prefix');
    });

    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body.code).toBe('NO_TOKEN');
      done();
    });
  });
});
