/**
 * Unit Tests: Database Helper Utilities
 *
 * Tests safeJsonParse and other pure utility functions
 * from db/utils/db-helpers.js that don't require a database connection.
 */

const { safeJsonParse } = require('../../db/utils/db-helpers');

// ============================================
// SAFE JSON PARSE
// ============================================

describe('safeJsonParse', () => {
  describe('valid JSON input', () => {
    test('parses a simple object', () => {
      const result = safeJsonParse('{"name":"John","age":30}');
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    test('parses an array', () => {
      const result = safeJsonParse('[1, 2, 3]');
      expect(result).toEqual([1, 2, 3]);
    });

    test('parses nested objects', () => {
      const input = JSON.stringify({
        user: {
          name: 'Jane',
          address: {
            city: 'Singapore',
            zip: '123456',
          },
          tags: ['admin', 'user'],
        },
      });

      const result = safeJsonParse(input);
      expect(result.user.address.city).toBe('Singapore');
      expect(result.user.tags).toEqual(['admin', 'user']);
    });

    test('parses a string value', () => {
      expect(safeJsonParse('"hello"')).toBe('hello');
    });

    test('parses a number', () => {
      expect(safeJsonParse('42')).toBe(42);
      expect(safeJsonParse('3.14')).toBe(3.14);
    });

    test('parses boolean values', () => {
      expect(safeJsonParse('true')).toBe(true);
      expect(safeJsonParse('false')).toBe(false);
    });

    test('parses null literal', () => {
      expect(safeJsonParse('null')).toBe(null);
    });

    test('parses an empty object', () => {
      expect(safeJsonParse('{}')).toEqual({});
    });

    test('parses an empty array', () => {
      expect(safeJsonParse('[]')).toEqual([]);
    });
  });

  describe('invalid JSON input', () => {
    test('returns default fallback (null) for invalid JSON', () => {
      expect(safeJsonParse('{invalid}')).toBe(null);
    });

    test('returns custom fallback for invalid JSON', () => {
      expect(safeJsonParse('{invalid}', [])).toEqual([]);
      expect(safeJsonParse('{invalid}', {})).toEqual({});
      expect(safeJsonParse('{invalid}', 'default')).toBe('default');
      expect(safeJsonParse('{invalid}', 0)).toBe(0);
    });

    test('returns fallback for malformed JSON', () => {
      expect(safeJsonParse("{'key': 'value'}", [])).toEqual([]);
      expect(safeJsonParse('not json at all', null)).toBe(null);
      expect(safeJsonParse('{key: value}', 'fallback')).toBe('fallback');
    });

    test('returns fallback for truncated JSON', () => {
      expect(safeJsonParse('{"name": "John', {})).toEqual({});
      expect(safeJsonParse('[1, 2,', [])).toEqual([]);
    });
  });

  describe('falsy input values', () => {
    test('returns fallback for null input', () => {
      expect(safeJsonParse(null)).toBe(null);
      expect(safeJsonParse(null, [])).toEqual([]);
      expect(safeJsonParse(null, 'default')).toBe('default');
    });

    test('returns fallback for undefined input', () => {
      expect(safeJsonParse(undefined)).toBe(null);
      expect(safeJsonParse(undefined, [])).toEqual([]);
      expect(safeJsonParse(undefined, {})).toEqual({});
    });

    test('returns fallback for empty string', () => {
      expect(safeJsonParse('')).toBe(null);
      expect(safeJsonParse('', [])).toEqual([]);
      expect(safeJsonParse('', 'fallback')).toBe('fallback');
    });

    test('returns fallback for zero (falsy)', () => {
      expect(safeJsonParse(0)).toBe(null);
      expect(safeJsonParse(0, 'fallback')).toBe('fallback');
    });

    test('returns fallback for false (falsy)', () => {
      expect(safeJsonParse(false)).toBe(null);
      expect(safeJsonParse(false, [])).toEqual([]);
    });
  });

  describe('fallback behavior', () => {
    test('defaults fallback to null when not specified', () => {
      expect(safeJsonParse(null)).toBe(null);
      expect(safeJsonParse('{bad}')).toBe(null);
    });

    test('supports array fallback (common for certifications field)', () => {
      expect(safeJsonParse(null, [])).toEqual([]);
    });

    test('supports object fallback', () => {
      expect(safeJsonParse(null, {})).toEqual({});
    });

    test('supports numeric fallback', () => {
      expect(safeJsonParse(null, 0)).toBe(0);
      expect(safeJsonParse(null, -1)).toBe(-1);
    });

    test('does not return fallback for valid JSON null literal', () => {
      // "null" is valid JSON, should parse to null, not return fallback
      expect(safeJsonParse('null', 'fallback')).toBe(null);
    });
  });

  describe('edge cases', () => {
    test('handles JSON with unicode characters', () => {
      const input = JSON.stringify({ name: '日本語テスト', emoji: '🔒' });
      const result = safeJsonParse(input);
      expect(result.name).toBe('日本語テスト');
      expect(result.emoji).toBe('🔒');
    });

    test('handles JSON with special characters in strings', () => {
      const input = JSON.stringify({ text: 'line1\nline2\ttab' });
      const result = safeJsonParse(input);
      expect(result.text).toBe('line1\nline2\ttab');
    });

    test('handles deeply nested structures', () => {
      const deep = { a: { b: { c: { d: { e: 'deep' } } } } };
      const result = safeJsonParse(JSON.stringify(deep));
      expect(result.a.b.c.d.e).toBe('deep');
    });

    test('handles large JSON arrays', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);
      const result = safeJsonParse(JSON.stringify(largeArray));
      expect(result).toHaveLength(1000);
      expect(result[999]).toBe(999);
    });

    test('handles JSON with whitespace', () => {
      const result = safeJsonParse('  { "key" : "value" }  ');
      expect(result).toEqual({ key: 'value' });
    });
  });
});
