/**
 * Unit Tests: Authentication Middleware
 *
 * Tests token generation, verification, extraction,
 * and role-based access control.
 */

const jwt = require('jsonwebtoken');

// Set JWT_SECRET before requiring auth module to ensure consistent behavior
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';

const {
  generateToken,
  generateAdminToken,
  verifyToken,
  JWT_SECRET,
} = require('../../middleware/auth');

// ============================================
// TOKEN GENERATION
// ============================================

describe('generateToken', () => {
  test('generates a valid JWT string', () => {
    const user = { id: 'C001', email: 'test@test.com', name: 'Test User' };
    const token = generateToken(user);

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  test('token contains user payload', () => {
    const user = { id: 'C001', email: 'test@test.com', name: 'Test User' };
    const token = generateToken(user);
    const decoded = jwt.decode(token);

    expect(decoded.id).toBe('C001');
    expect(decoded.email).toBe('test@test.com');
    expect(decoded.name).toBe('Test User');
  });

  test('defaults role to candidate', () => {
    const user = { id: 'C001', email: 'test@test.com', name: 'Test' };
    const token = generateToken(user);
    const decoded = jwt.decode(token);

    expect(decoded.role).toBe('candidate');
  });

  test('preserves custom role if provided', () => {
    const user = { id: 'A001', email: 'admin@test.com', name: 'Admin', role: 'admin' };
    const token = generateToken(user);
    const decoded = jwt.decode(token);

    expect(decoded.role).toBe('admin');
  });

  test('sets issuer and audience claims', () => {
    const user = { id: 'C001', email: 'test@test.com', name: 'Test' };
    const token = generateToken(user);
    const decoded = jwt.decode(token, { complete: true });

    expect(decoded.payload.iss).toBe('worklink-v2');
    expect(decoded.payload.aud).toBe('worklink-users');
  });

  test('sets expiration', () => {
    const user = { id: 'C001', email: 'test@test.com', name: 'Test' };
    const token = generateToken(user);
    const decoded = jwt.decode(token);

    expect(decoded.exp).toBeDefined();
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });
});

// ============================================
// ADMIN TOKEN GENERATION
// ============================================

describe('generateAdminToken', () => {
  test('forces role to admin', () => {
    const admin = { id: 'ADM_001', email: 'admin@worklink.sg', name: 'Admin' };
    const token = generateAdminToken(admin);
    const decoded = jwt.decode(token);

    expect(decoded.role).toBe('admin');
  });

  test('includes admin id and email', () => {
    const admin = { id: 'ADM_001', email: 'admin@worklink.sg', name: 'Admin' };
    const token = generateAdminToken(admin);
    const decoded = jwt.decode(token);

    expect(decoded.id).toBe('ADM_001');
    expect(decoded.email).toBe('admin@worklink.sg');
  });
});

// ============================================
// TOKEN VERIFICATION
// ============================================

describe('verifyToken', () => {
  test('verifies a valid token', () => {
    const user = { id: 'C001', email: 'test@test.com', name: 'Test' };
    const token = generateToken(user);
    const result = verifyToken(token);

    expect(result).not.toBeNull();
    expect(result.id).toBe('C001');
  });

  test('returns null for invalid token', () => {
    const result = verifyToken('invalid.token.string');
    expect(result).toBeNull();
  });

  test('returns null for expired token', () => {
    const expiredToken = jwt.sign(
      { id: 'C001', role: 'candidate' },
      JWT_SECRET,
      { expiresIn: '0s', issuer: 'worklink-v2', audience: 'worklink-users' }
    );
    const result = verifyToken(expiredToken);
    expect(result).toBeNull();
  });

  test('returns null for token with wrong secret', () => {
    const wrongToken = jwt.sign(
      { id: 'C001', role: 'candidate' },
      'wrong-secret',
      { issuer: 'worklink-v2', audience: 'worklink-users' }
    );
    const result = verifyToken(wrongToken);
    expect(result).toBeNull();
  });

  test('returns null for empty string', () => {
    const result = verifyToken('');
    expect(result).toBeNull();
  });

  test('handles demo-admin-token (legacy)', () => {
    const result = verifyToken('demo-admin-token');

    expect(result).not.toBeNull();
    expect(result.id).toBe('ADM_DEV');
    expect(result.role).toBe('admin');
  });

  test('returns null for null input', () => {
    const result = verifyToken(null);
    expect(result).toBeNull();
  });
});

// ============================================
// TOKEN EXTRACTION (mock Express req)
// ============================================

describe('extractToken (via verifyToken integration)', () => {
  // We test extractToken indirectly through the auth flow
  // since it's not exported separately. Instead we test the
  // token format expectations.

  test('Bearer token format is standard JWT', () => {
    const user = { id: 'C001', email: 'test@test.com', name: 'Test' };
    const token = generateToken(user);

    // Should be parseable as "Bearer <token>"
    const bearerString = `Bearer ${token}`;
    const extracted = bearerString.substring(7);

    expect(verifyToken(extracted)).not.toBeNull();
  });
});

// ============================================
// ROLE HIERARCHY
// ============================================

describe('role-based token behavior', () => {
  test('candidate token has candidate role', () => {
    const token = generateToken({ id: 'C001', email: 'c@test.com', name: 'Candidate' });
    const decoded = verifyToken(token);

    expect(decoded.role).toBe('candidate');
  });

  test('admin token has admin role', () => {
    const token = generateAdminToken({ id: 'ADM_001', email: 'a@test.com', name: 'Admin' });
    const decoded = verifyToken(token);

    expect(decoded.role).toBe('admin');
  });

  test('candidate cannot forge admin role without correct secret', () => {
    // A token signed with wrong secret should fail verification
    const forgedToken = jwt.sign(
      { id: 'C001', role: 'admin' },
      'wrong-secret',
      { issuer: 'worklink-v2', audience: 'worklink-users' }
    );

    expect(verifyToken(forgedToken)).toBeNull();
  });
});

// ============================================
// JWT CLAIMS VALIDATION
// ============================================

describe('JWT claims', () => {
  test('rejects token with wrong issuer', () => {
    const token = jwt.sign(
      { id: 'C001', role: 'candidate' },
      JWT_SECRET,
      { issuer: 'wrong-issuer', audience: 'worklink-users' }
    );
    const result = verifyToken(token);
    expect(result).toBeNull();
  });

  test('rejects token with wrong audience', () => {
    const token = jwt.sign(
      { id: 'C001', role: 'candidate' },
      JWT_SECRET,
      { issuer: 'worklink-v2', audience: 'wrong-audience' }
    );
    const result = verifyToken(token);
    expect(result).toBeNull();
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('edge cases', () => {
  test('handles user with minimal fields', () => {
    const user = { id: 'C001' };
    const token = generateToken(user);

    expect(typeof token).toBe('string');
    const decoded = jwt.decode(token);
    expect(decoded.id).toBe('C001');
  });

  test('handles user with extra fields (not included in token)', () => {
    const user = {
      id: 'C001',
      email: 'test@test.com',
      name: 'Test',
      password: 'secret123',
      bankAccount: '1234567890',
    };
    const token = generateToken(user);
    const decoded = jwt.decode(token);

    // Sensitive fields should NOT be in the token
    expect(decoded.password).toBeUndefined();
    expect(decoded.bankAccount).toBeUndefined();
  });

  test('token payload does not contain sensitive data', () => {
    const user = { id: 'C001', email: 'test@test.com', name: 'Test' };
    const token = generateToken(user);
    const decoded = jwt.decode(token);

    // Only expected fields
    const expectedKeys = ['id', 'email', 'name', 'role', 'type', 'iat', 'exp', 'iss', 'aud'];
    Object.keys(decoded).forEach(key => {
      expect(expectedKeys).toContain(key);
    });
  });
});
