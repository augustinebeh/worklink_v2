/**
 * Unit Tests: Input Validation Middleware
 *
 * Tests sanitizeInput, sanitizeString, validateRequestFrequency,
 * and individual field validators from middleware/input-validation.js.
 */

const {
  sanitizeString,
  sanitizeInput,
  validateRequestFrequency,
  validateEmail,
  validatePhone,
  validateURL,
  validateDate,
  validateNumber,
  validateJSON,
  InputValidationError,
} = require('../../middleware/input-validation');

// ============================================
// SANITIZE STRING
// ============================================

describe('sanitizeString', () => {
  test('trims whitespace from both ends', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
    expect(sanitizeString('\thello\n')).toBe('hello');
  });

  test('removes null bytes', () => {
    expect(sanitizeString('hello\0world')).toBe('helloworld');
    expect(sanitizeString('\0dangerous\0')).toBe('dangerous');
  });

  test('returns non-string values unchanged', () => {
    expect(sanitizeString(123)).toBe(123);
    expect(sanitizeString(true)).toBe(true);
    expect(sanitizeString(null)).toBe(null);
    expect(sanitizeString(undefined)).toBe(undefined);
  });

  test('throws InputValidationError when string exceeds maxLength', () => {
    expect(() => sanitizeString('a'.repeat(1001))).toThrow(InputValidationError);
    expect(() => sanitizeString('a'.repeat(1001))).toThrow('String too long');
  });

  test('allows string at exactly maxLength', () => {
    const str = 'a'.repeat(1000);
    expect(sanitizeString(str)).toBe(str);
  });

  test('respects custom maxLength', () => {
    expect(() => sanitizeString('a'.repeat(11), 10)).toThrow(InputValidationError);
    expect(sanitizeString('a'.repeat(10), 10)).toBe('a'.repeat(10));
  });

  test('handles empty string', () => {
    expect(sanitizeString('')).toBe('');
  });

  test('preserves normal special characters', () => {
    expect(sanitizeString('hello@world.com')).toBe('hello@world.com');
    expect(sanitizeString('price: $100')).toBe('price: $100');
    expect(sanitizeString('<script>alert(1)</script>')).toBe('<script>alert(1)</script>');
  });
});

// ============================================
// SANITIZE INPUT MIDDLEWARE
// ============================================

describe('sanitizeInput middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  test('calls next() for valid input', () => {
    req.body = { name: 'John', age: 30 };
    sanitizeInput(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('trims string values in body', () => {
    req.body = { name: '  John  ', email: '  test@test.com  ' };
    sanitizeInput(req, res, next);

    expect(req.body.name).toBe('John');
    expect(req.body.email).toBe('test@test.com');
  });

  test('trims string values in query', () => {
    req.query = { search: '  keyword  ', page: '1' };
    sanitizeInput(req, res, next);

    expect(req.query.search).toBe('keyword');
    expect(req.query.page).toBe('1');
  });

  test('handles nested objects', () => {
    req.body = {
      user: {
        name: '  Nested User  ',
        address: {
          city: '  Singapore  ',
        },
      },
    };
    sanitizeInput(req, res, next);

    expect(req.body.user.name).toBe('Nested User');
    expect(req.body.user.address.city).toBe('Singapore');
  });

  test('handles arrays in body', () => {
    req.body = {
      tags: ['  tag1  ', '  tag2  ', '  tag3  '],
    };
    sanitizeInput(req, res, next);

    expect(req.body.tags).toEqual(['tag1', 'tag2', 'tag3']);
  });

  test('handles nested arrays of objects', () => {
    req.body = {
      items: [
        { name: '  Item 1  ' },
        { name: '  Item 2  ' },
      ],
    };
    sanitizeInput(req, res, next);

    expect(req.body.items[0].name).toBe('Item 1');
    expect(req.body.items[1].name).toBe('Item 2');
  });

  test('preserves non-string values', () => {
    req.body = { count: 42, active: true, data: null };
    sanitizeInput(req, res, next);

    expect(req.body.count).toBe(42);
    expect(req.body.active).toBe(true);
    expect(req.body.data).toBe(null);
  });

  test('removes null bytes from strings', () => {
    req.body = { name: 'hello\0world' };
    sanitizeInput(req, res, next);

    expect(req.body.name).toBe('helloworld');
  });

  test('returns 400 when body string exceeds length limit', () => {
    req.body = { name: 'a'.repeat(1001) };
    sanitizeInput(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'LENGTH_EXCEEDED',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('allows OAuth credential fields up to 5000 characters', () => {
    req.body = { credential: 'a'.repeat(4999) };
    sanitizeInput(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.credential).toBe('a'.repeat(4999));
  });

  test('handles missing body gracefully', () => {
    req.body = undefined;
    sanitizeInput(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('handles missing query gracefully', () => {
    req.query = undefined;
    sanitizeInput(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

// ============================================
// VALIDATE REQUEST FREQUENCY
// ============================================

describe('validateRequestFrequency', () => {
  let res, next;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  test('allows requests within limit', () => {
    const middleware = validateRequestFrequency(60000, 5);

    for (let i = 0; i < 5; i++) {
      next.mockClear();
      const req = { ip: '192.168.1.1', path: '/api/test' };
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  test('blocks requests exceeding limit', () => {
    const middleware = validateRequestFrequency(60000, 3);
    const ip = '192.168.1.2';

    // First 3 should pass
    for (let i = 0; i < 3; i++) {
      next.mockClear();
      middleware({ ip, path: '/api/test' }, res, next);
      expect(next).toHaveBeenCalled();
    }

    // 4th should be blocked
    next.mockClear();
    middleware({ ip, path: '/api/test' }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Too many requests. Please slow down.',
        code: 'RATE_LIMIT_EXCEEDED',
      })
    );
  });

  test('tracks different IPs independently', () => {
    const middleware = validateRequestFrequency(60000, 2);

    // IP 1 uses its quota
    middleware({ ip: '10.0.0.1', path: '/test' }, res, next);
    middleware({ ip: '10.0.0.1', path: '/test' }, res, next);

    // IP 2 should still have its own quota
    next.mockClear();
    middleware({ ip: '10.0.0.2', path: '/test' }, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('resets count after window expires', () => {
    const middleware = validateRequestFrequency(100, 2); // 100ms window

    const ip = '192.168.1.3';
    middleware({ ip, path: '/test' }, res, next);
    middleware({ ip, path: '/test' }, res, next);

    // Should be blocked now
    next.mockClear();
    middleware({ ip, path: '/test' }, res, next);
    expect(next).not.toHaveBeenCalled();

    // Wait for window to expire and check again
    return new Promise((resolve) => {
      setTimeout(() => {
        next.mockClear();
        middleware({ ip, path: '/test' }, res, next);
        expect(next).toHaveBeenCalled();
        resolve();
      }, 150);
    });
  });

  test('uses "anonymous" key when req.ip is missing', () => {
    const middleware = validateRequestFrequency(60000, 2);

    middleware({ path: '/test' }, res, next);
    middleware({ path: '/test' }, res, next);

    // Third request from anonymous should be blocked
    next.mockClear();
    middleware({ path: '/test' }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
  });

  test('uses default parameters when none provided', () => {
    const middleware = validateRequestFrequency();
    const req = { ip: '192.168.1.100', path: '/test' };

    // Should allow at least one request with defaults (100 max)
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

// ============================================
// VALIDATE EMAIL
// ============================================

describe('validateEmail', () => {
  test('accepts valid email', () => {
    const result = validateEmail('user@example.com');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  test('rejects invalid email', () => {
    expect(() => validateEmail('not-an-email')).toThrow(InputValidationError);
    expect(() => validateEmail('missing@')).toThrow(InputValidationError);
    expect(() => validateEmail('@no-local.com')).toThrow(InputValidationError);
  });

  test('returns falsy input unchanged', () => {
    expect(validateEmail('')).toBe('');
    expect(validateEmail(null)).toBe(null);
    expect(validateEmail(undefined)).toBe(undefined);
  });

  test('rejects email exceeding 254 characters', () => {
    const longEmail = 'a'.repeat(250) + '@b.com';
    expect(() => validateEmail(longEmail)).toThrow(InputValidationError);
  });
});

// ============================================
// VALIDATE NUMBER
// ============================================

describe('validateNumber', () => {
  test('returns valid number unchanged', () => {
    expect(validateNumber(42, 'count')).toBe(42);
    expect(validateNumber(3.14, 'rate')).toBe(3.14);
  });

  test('returns null/undefined unchanged', () => {
    expect(validateNumber(null, 'field')).toBe(null);
    expect(validateNumber(undefined, 'field')).toBe(undefined);
  });

  test('rejects NaN', () => {
    expect(() => validateNumber(NaN, 'field')).toThrow(InputValidationError);
  });

  test('rejects non-number types', () => {
    expect(() => validateNumber('42', 'field')).toThrow(InputValidationError);
    expect(() => validateNumber(true, 'field')).toThrow(InputValidationError);
  });

  test('enforces minimum', () => {
    expect(() => validateNumber(-1, 'field', { min: 0 })).toThrow('at least 0');
  });

  test('enforces maximum', () => {
    expect(() => validateNumber(101, 'field', { max: 100 })).toThrow('at most 100');
  });

  test('enforces integer constraint', () => {
    expect(() => validateNumber(3.5, 'field', { integer: true })).toThrow('integer');
    expect(validateNumber(3, 'field', { integer: true })).toBe(3);
  });
});

// ============================================
// VALIDATE DATE
// ============================================

describe('validateDate', () => {
  test('accepts ISO 8601 dates', () => {
    expect(validateDate('2024-01-15')).toBe('2024-01-15');
    expect(validateDate('2024-01-15T10:30:00Z')).toBe('2024-01-15T10:30:00Z');
  });

  test('rejects non-ISO date formats', () => {
    expect(() => validateDate('15/01/2024')).toThrow(InputValidationError);
    expect(() => validateDate('not-a-date')).toThrow(InputValidationError);
  });

  test('returns falsy input unchanged', () => {
    expect(validateDate('')).toBe('');
    expect(validateDate(null)).toBe(null);
  });
});

// ============================================
// VALIDATE JSON
// ============================================

describe('validateJSON', () => {
  test('accepts valid JSON string', () => {
    expect(validateJSON('{"key":"value"}')).toBe('{"key":"value"}');
    expect(validateJSON('[1,2,3]')).toBe('[1,2,3]');
  });

  test('rejects invalid JSON string', () => {
    expect(() => validateJSON('{invalid}')).toThrow(InputValidationError);
    expect(() => validateJSON("{'key': 'value'}")).toThrow(InputValidationError);
  });

  test('returns falsy input unchanged', () => {
    expect(validateJSON('')).toBe('');
    expect(validateJSON(null)).toBe(null);
  });

  test('rejects non-string input', () => {
    expect(() => validateJSON(42)).toThrow(InputValidationError);
    expect(() => validateJSON({ key: 'val' })).toThrow(InputValidationError);
  });
});

// ============================================
// INPUT VALIDATION ERROR
// ============================================

describe('InputValidationError', () => {
  test('has correct name property', () => {
    const err = new InputValidationError('test error', 'field');
    expect(err.name).toBe('InputValidationError');
  });

  test('stores field and code', () => {
    const err = new InputValidationError('test', 'email', 'CUSTOM_CODE');
    expect(err.field).toBe('email');
    expect(err.code).toBe('CUSTOM_CODE');
  });

  test('defaults code to VALIDATION_ERROR', () => {
    const err = new InputValidationError('test', 'field');
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  test('is an instance of Error', () => {
    const err = new InputValidationError('test', 'field');
    expect(err).toBeInstanceOf(Error);
  });
});
