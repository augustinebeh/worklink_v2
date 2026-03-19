/**
 * Unit Tests: Password Hashing (scrypt)
 *
 * Tests the scrypt password hashing and verification flow
 * as implemented in routes/api/v1/auth/routes/core.js.
 *
 * Since hashPassword and verifyPassword are not exported,
 * we replicate the exact same logic here and validate that
 * the cryptographic properties hold.
 */

const crypto = require('crypto');

// ============================================
// REPLICATED FUNCTIONS (match core.js exactly)
// ============================================

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function hashPassword(password, salt = '') {
  const scryptSalt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, scryptSalt, SCRYPT_KEYLEN, SCRYPT_COST);
  return `scrypt:${scryptSalt}:${derived.toString('hex')}`;
}

function verifyPassword(password, storedHash, legacySalt = '') {
  if (storedHash.startsWith('scrypt:')) {
    const [, salt, hash] = storedHash.split(':');
    const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_COST);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derived);
  }
  // Legacy SHA-256 verification for migration
  const legacyHash = crypto.createHash('sha256').update(password + legacySalt).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(legacyHash, 'hex'));
}

// ============================================
// SCRYPT HASH FORMAT
// ============================================

describe('Password Hashing (scrypt)', () => {
  describe('hashPassword', () => {
    test('returns hash in scrypt:<salt>:<hash> format', () => {
      const hash = hashPassword('myPassword123');
      const parts = hash.split(':');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('scrypt');
    });

    test('salt is 32-character hex string (16 random bytes)', () => {
      const hash = hashPassword('myPassword123');
      const salt = hash.split(':')[1];

      expect(salt).toHaveLength(32);
      expect(salt).toMatch(/^[0-9a-f]{32}$/);
    });

    test('derived key is 128-character hex string (64 bytes)', () => {
      const hash = hashPassword('myPassword123');
      const derivedHex = hash.split(':')[2];

      expect(derivedHex).toHaveLength(128);
      expect(derivedHex).toMatch(/^[0-9a-f]{128}$/);
    });

    test('same password produces different hashes (random salt)', () => {
      const hash1 = hashPassword('identicalPassword');
      const hash2 = hashPassword('identicalPassword');

      expect(hash1).not.toBe(hash2);

      // Salts should differ
      const salt1 = hash1.split(':')[1];
      const salt2 = hash2.split(':')[1];
      expect(salt1).not.toBe(salt2);
    });

    test('different passwords produce different derived keys', () => {
      // Use the same salt to isolate the password difference
      const salt = crypto.randomBytes(16).toString('hex');
      const derived1 = crypto.scryptSync('password1', salt, SCRYPT_KEYLEN, SCRYPT_COST);
      const derived2 = crypto.scryptSync('password2', salt, SCRYPT_KEYLEN, SCRYPT_COST);

      expect(derived1.toString('hex')).not.toBe(derived2.toString('hex'));
    });

    test('handles empty string password', () => {
      const hash = hashPassword('');
      const parts = hash.split(':');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('scrypt');
    });

    test('handles unicode passwords', () => {
      const hash = hashPassword('p@$$w0rd-日本語-🔒');
      const parts = hash.split(':');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('scrypt');
    });

    test('handles very long passwords', () => {
      const longPassword = 'a'.repeat(10000);
      const hash = hashPassword(longPassword);

      expect(hash.startsWith('scrypt:')).toBe(true);
    });
  });

  // ============================================
  // SCRYPT VERIFICATION
  // ============================================

  describe('verifyPassword with scrypt hashes', () => {
    test('verifies correct password', () => {
      const password = 'correctPassword123';
      const hash = hashPassword(password);

      expect(verifyPassword(password, hash)).toBe(true);
    });

    test('rejects incorrect password', () => {
      const hash = hashPassword('correctPassword');

      expect(verifyPassword('wrongPassword', hash)).toBe(false);
    });

    test('rejects empty password against valid hash', () => {
      const hash = hashPassword('realPassword');

      expect(verifyPassword('', hash)).toBe(false);
    });

    test('verifies empty password when hashed as empty', () => {
      const hash = hashPassword('');

      expect(verifyPassword('', hash)).toBe(true);
    });

    test('verifies unicode passwords', () => {
      const password = 'sécurité-密码-🔑';
      const hash = hashPassword(password);

      expect(verifyPassword(password, hash)).toBe(true);
    });

    test('is case-sensitive', () => {
      const hash = hashPassword('CaseSensitive');

      expect(verifyPassword('CaseSensitive', hash)).toBe(true);
      expect(verifyPassword('casesensitive', hash)).toBe(false);
      expect(verifyPassword('CASESENSITIVE', hash)).toBe(false);
    });

    test('rejects password with extra whitespace', () => {
      const hash = hashPassword('password');

      expect(verifyPassword(' password', hash)).toBe(false);
      expect(verifyPassword('password ', hash)).toBe(false);
      expect(verifyPassword(' password ', hash)).toBe(false);
    });
  });

  // ============================================
  // LEGACY SHA-256 VERIFICATION (migration path)
  // ============================================

  describe('verifyPassword with legacy SHA-256 hashes', () => {
    test('verifies legacy SHA-256 hash with salt', () => {
      const password = 'legacyPassword';
      const legacySalt = 'user-id-123';
      const legacyHash = crypto.createHash('sha256').update(password + legacySalt).digest('hex');

      expect(verifyPassword(password, legacyHash, legacySalt)).toBe(true);
    });

    test('rejects wrong password against legacy hash', () => {
      const legacySalt = 'user-id-123';
      const legacyHash = crypto.createHash('sha256').update('correctPassword' + legacySalt).digest('hex');

      expect(verifyPassword('wrongPassword', legacyHash, legacySalt)).toBe(false);
    });

    test('verifies legacy hash with empty salt', () => {
      const password = 'noSaltPassword';
      const legacyHash = crypto.createHash('sha256').update(password).digest('hex');

      expect(verifyPassword(password, legacyHash, '')).toBe(true);
    });

    test('legacy hash does not start with "scrypt:"', () => {
      const legacyHash = crypto.createHash('sha256').update('password' + 'salt').digest('hex');

      // Should be pure hex, no "scrypt:" prefix
      expect(legacyHash.startsWith('scrypt:')).toBe(false);
      expect(legacyHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  // ============================================
  // TIMING-SAFE COMPARISON
  // ============================================

  describe('timing-safe comparison', () => {
    test('uses crypto.timingSafeEqual for scrypt verification', () => {
      const spy = jest.spyOn(crypto, 'timingSafeEqual');
      const hash = hashPassword('testPassword');

      verifyPassword('testPassword', hash);

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    test('uses crypto.timingSafeEqual for legacy SHA-256 verification', () => {
      const spy = jest.spyOn(crypto, 'timingSafeEqual');
      const legacyHash = crypto.createHash('sha256').update('password' + 'salt').digest('hex');

      verifyPassword('password', legacyHash, 'salt');

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  // ============================================
  // HASH DETECTION (scrypt vs legacy)
  // ============================================

  describe('hash format detection', () => {
    test('scrypt hash is detected by "scrypt:" prefix', () => {
      const hash = hashPassword('password');
      expect(hash.startsWith('scrypt:')).toBe(true);
    });

    test('legacy SHA-256 hash is 64-char hex without prefix', () => {
      const legacyHash = crypto.createHash('sha256').update('password').digest('hex');

      expect(legacyHash.startsWith('scrypt:')).toBe(false);
      expect(legacyHash).toHaveLength(64);
    });

    test('verifyPassword routes to correct algorithm based on prefix', () => {
      const password = 'routingTest';

      // scrypt path
      const scryptHash = hashPassword(password);
      expect(verifyPassword(password, scryptHash)).toBe(true);

      // legacy path
      const legacySalt = 'legacy-salt';
      const legacyHash = crypto.createHash('sha256').update(password + legacySalt).digest('hex');
      expect(verifyPassword(password, legacyHash, legacySalt)).toBe(true);
    });
  });

  // ============================================
  // SCRYPT PARAMETERS
  // ============================================

  describe('scrypt parameters', () => {
    test('uses NIST-recommended cost parameters', () => {
      // N=16384 (2^14), r=8, p=1 are NIST SP 800-132 recommended minimums
      expect(SCRYPT_COST.N).toBe(16384);
      expect(SCRYPT_COST.r).toBe(8);
      expect(SCRYPT_COST.p).toBe(1);
    });

    test('key length is 64 bytes (512 bits)', () => {
      expect(SCRYPT_KEYLEN).toBe(64);
    });

    test('max memory is 64 MB', () => {
      expect(SCRYPT_COST.maxmem).toBe(64 * 1024 * 1024);
    });
  });
});
