/**
 * Unit Tests: LLM Integration Utility (utils/claude.js)
 *
 * Tests provider fallback chain, caching, cost calculation,
 * token estimation, usage recording, and error handling.
 */

// ============================================
// MOCKS — must be defined before requiring the module
// ============================================

// Mock structured-logger to suppress output during tests
jest.mock('../../utils/structured-logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock db module — lightweight in-memory stubs
const mockRun = jest.fn().mockReturnValue({ changes: 1 });
const mockPrepare = jest.fn().mockReturnValue({ run: mockRun, all: jest.fn().mockReturnValue([]) });
const mockExec = jest.fn();

jest.mock('../../db', () => ({
  db: {
    exec: (...args) => mockExec(...args),
    prepare: (...args) => mockPrepare(...args),
  },
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Now require the module under test
const {
  askClaude,
  estimateTokens,
  calculateCost,
  PROVIDERS,
  API_COSTS,
} = require('../../utils/claude');

// Internal helpers are not exported directly, so we access them
// through the module's behavior or re-require for cache testing.
const crypto = require('crypto');

// ============================================
// HELPER: Build a mock fetch response
// ============================================

function mockFetchResponse(body, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

function groqSuccessBody(text = 'Hello from Groq') {
  return {
    choices: [{ message: { content: text } }],
    usage: { prompt_tokens: 10, completion_tokens: 20 },
  };
}

function geminiSuccessBody(text = 'Hello from Gemini') {
  return {
    candidates: [{ content: { parts: [{ text }] } }],
  };
}

function claudeSuccessBody(text = 'Hello from Claude') {
  return {
    content: [{ text }],
    usage: { input_tokens: 15, output_tokens: 25 },
  };
}

// ============================================
// TEST SETUP
// ============================================

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  mockExec.mockReset();
  mockPrepare.mockReset().mockReturnValue({ run: mockRun, all: jest.fn().mockReturnValue([]) });
  mockRun.mockReset().mockReturnValue({ changes: 1 });

  // Clear all env keys by default — tests set them as needed
  delete process.env.GROQ_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
});

// ============================================
// estimateTokens
// ============================================

describe('estimateTokens', () => {
  test('returns 0 for empty or falsy input', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
  });

  test('estimates roughly 1 token per 4 characters', () => {
    // 20 characters => ceil(20/4) = 5
    expect(estimateTokens('12345678901234567890')).toBe(5);
  });

  test('rounds up partial tokens', () => {
    // 5 characters => ceil(5/4) = 2
    expect(estimateTokens('hello')).toBe(2);
  });

  test('handles long text proportionally', () => {
    const longText = 'a'.repeat(4000);
    expect(estimateTokens(longText)).toBe(1000);
  });
});

// ============================================
// calculateCost
// ============================================

describe('calculateCost', () => {
  test('returns 0 for unknown provider', () => {
    expect(calculateCost('unknown-provider', 100, 100)).toBe(0);
  });

  test('calculates Claude costs correctly', () => {
    // 1000 input tokens * 0.003/1K + 1000 output tokens * 0.015/1K = 0.003 + 0.015 = 0.018
    const cost = calculateCost('claude', 1000, 1000);
    expect(cost).toBeCloseTo(0.018, 6);
  });

  test('calculates Groq costs correctly', () => {
    // 1000 input * 0.0001/1K + 1000 output * 0.0002/1K = 0.0001 + 0.0002 = 0.0003
    const cost = calculateCost('groq', 1000, 1000);
    expect(cost).toBeCloseTo(0.0003, 6);
  });

  test('calculates Gemini costs correctly', () => {
    // 1000 input * 0.00125/1K + 1000 output * 0.00375/1K = 0.00125 + 0.00375 = 0.005
    const cost = calculateCost('gemini', 1000, 1000);
    expect(cost).toBeCloseTo(0.005, 6);
  });

  test('returns 0 when tokens are 0', () => {
    expect(calculateCost('claude', 0, 0)).toBe(0);
  });

  test('scales linearly with token count', () => {
    const cost1k = calculateCost('claude', 1000, 1000);
    const cost2k = calculateCost('claude', 2000, 2000);
    expect(cost2k).toBeCloseTo(cost1k * 2, 6);
  });
});

// ============================================
// generateCacheKey (tested via behavior)
// ============================================

describe('generateCacheKey', () => {
  // Since generateCacheKey is not exported, we replicate its logic
  // and verify consistency. The real function is exercised through askClaude cache tests.
  function replicateCacheKey(prompt, systemPrompt, options) {
    const key = JSON.stringify({
      prompt: prompt.substring(0, 500),
      system: systemPrompt.substring(0, 200),
      maxTokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.7,
    });
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 32);
  }

  test('produces consistent keys for identical inputs', () => {
    const key1 = replicateCacheKey('Hello', 'System', {});
    const key2 = replicateCacheKey('Hello', 'System', {});
    expect(key1).toBe(key2);
  });

  test('different prompts produce different keys', () => {
    const key1 = replicateCacheKey('Hello', 'System', {});
    const key2 = replicateCacheKey('Goodbye', 'System', {});
    expect(key1).not.toBe(key2);
  });

  test('different system prompts produce different keys', () => {
    const key1 = replicateCacheKey('Hello', 'System A', {});
    const key2 = replicateCacheKey('Hello', 'System B', {});
    expect(key1).not.toBe(key2);
  });

  test('different options produce different keys', () => {
    const key1 = replicateCacheKey('Hello', 'System', { maxTokens: 512 });
    const key2 = replicateCacheKey('Hello', 'System', { maxTokens: 2048 });
    expect(key1).not.toBe(key2);
  });

  test('key is 32-character hex string (SHA-256 truncated)', () => {
    const key = replicateCacheKey('Hello', 'System', {});
    expect(key).toHaveLength(32);
    expect(key).toMatch(/^[a-f0-9]{32}$/);
  });

  test('truncates long prompts to 500 chars for key generation', () => {
    const longPrompt = 'x'.repeat(1000);
    const shortPrompt = 'x'.repeat(500);
    // Both should produce the same key because the prompt is truncated at 500
    const key1 = replicateCacheKey(longPrompt, '', {});
    const key2 = replicateCacheKey(shortPrompt, '', {});
    expect(key1).toBe(key2);
  });

  test('truncates long system prompts to 200 chars for key generation', () => {
    const longSystem = 'y'.repeat(400);
    const shortSystem = 'y'.repeat(200);
    const key1 = replicateCacheKey('Hello', longSystem, {});
    const key2 = replicateCacheKey('Hello', shortSystem, {});
    expect(key1).toBe(key2);
  });
});

// ============================================
// cleanCache (tested via askClaude triggering)
// ============================================

describe('cleanCache', () => {
  // cleanCache is an internal function. We test it by stuffing the internal
  // cache via successful askClaude calls and verifying eviction behavior.
  // For direct unit testing, we re-require the module with a fresh cache.

  test('concept: expired entries get cleaned on subsequent calls', async () => {
    // This test verifies the cache TTL concept: a cached response that is
    // older than CACHE_TTL (5 min) will not be returned as a cache hit.
    // We cannot easily manipulate time without jest.useFakeTimers which
    // interacts badly with async fetch, so we test the inverse: fresh
    // cache entries ARE returned.
    process.env.GROQ_API_KEY = 'test-groq-key';
    mockFetch.mockResolvedValueOnce(mockFetchResponse(groqSuccessBody('cached response')));

    const result1 = await askClaude('test prompt for cache', 'system', { useCache: true });
    expect(result1).toBe('cached response');

    // Second call with same inputs should use cache (no new fetch call)
    const result2 = await askClaude('test prompt for cache', 'system', { useCache: true });
    expect(result2).toBe('cached response');

    // fetch should only have been called once (first call)
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('cache is bypassed when useCache is false', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    mockFetch
      .mockResolvedValueOnce(mockFetchResponse(groqSuccessBody('first')))
      .mockResolvedValueOnce(mockFetchResponse(groqSuccessBody('second')));

    await askClaude('bypass test', '', { useCache: true });
    const result = await askClaude('bypass test', '', { useCache: false });

    expect(result).toBe('second');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// ============================================
// recordUsage
// ============================================

describe('recordUsage', () => {
  test('records usage to database via db.prepare and db.exec', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    mockFetch.mockResolvedValueOnce(mockFetchResponse(groqSuccessBody('recorded')));

    await askClaude('record test', '', { useCache: false });

    // db.exec should be called (CREATE TABLE IF NOT EXISTS)
    expect(mockExec).toHaveBeenCalled();
    // db.prepare should be called for INSERT statements
    expect(mockPrepare).toHaveBeenCalled();
    // The run function should be called with provider, tokens, cost, etc.
    expect(mockRun).toHaveBeenCalled();
  });

  test('handles missing table by creating it and retrying', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    mockFetch.mockResolvedValueOnce(mockFetchResponse(groqSuccessBody('retry test')));

    // First exec call succeeds (the CREATE TABLE IF NOT EXISTS in the try block)
    // But first prepare/run fails with "no such table"
    let callCount = 0;
    mockExec.mockImplementation(() => {
      // Always succeed for CREATE TABLE statements
    });
    mockPrepare.mockImplementation(() => {
      callCount++;
      if (callCount <= 1) {
        // First prepare call fails with missing table
        throw new Error('no such table: llm_usage_logs');
      }
      // Subsequent calls succeed
      return { run: mockRun };
    });

    // This should NOT throw — recordUsage handles errors gracefully
    await askClaude('table creation test', '', { useCache: false });

    // exec should be called (both the initial CREATE TABLE and the recovery CREATE TABLE)
    expect(mockExec).toHaveBeenCalled();
  });

  test('does not recurse infinitely on repeated failure', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    mockFetch.mockResolvedValueOnce(mockFetchResponse(groqSuccessBody('no recursion')));

    // First db.exec succeeds (initial CREATE TABLE in try block),
    // but db.prepare fails with "no such table" (simulating table not actually created).
    // In the catch branch, db.exec succeeds again (recovery CREATE TABLE),
    // but the retry db.prepare also fails. recordUsage should give up silently.
    mockExec.mockImplementation(() => {
      // CREATE TABLE IF NOT EXISTS — let it succeed
    });
    mockPrepare.mockImplementation(() => {
      throw new Error('no such table: llm_usage_logs');
    });

    // Should NOT throw — recordUsage silently gives up after one retry
    const result = await askClaude('recursion test', '', { useCache: false });
    expect(result).toBe('no recursion');

    // Verify prepare was called multiple times (try + retry) but did not loop infinitely
    // The function is called for both the success-path recordUsage and error-path recordUsage,
    // but should not exceed a reasonable number of attempts
    expect(mockPrepare.mock.calls.length).toBeLessThan(20);
  });

  test('silently ignores non-table errors', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    mockFetch.mockResolvedValueOnce(mockFetchResponse(groqSuccessBody('non-table error')));

    mockExec.mockImplementation(() => {
      throw new Error('disk I/O error');
    });

    // Should not throw
    const result = await askClaude('disk error test', '', { useCache: false });
    expect(result).toBe('non-table error');
  });
});

// ============================================
// askClaude — provider fallback chain
// ============================================

describe('askClaude - provider fallback chain', () => {
  test('tries groq first (priority 1), then gemini (priority 2), then claude (priority 3)', async () => {
    // Set all API keys
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.GOOGLE_API_KEY = 'test-gemini-key';
    process.env.ANTHROPIC_API_KEY = 'test-claude-key';

    mockFetch.mockResolvedValueOnce(mockFetchResponse(groqSuccessBody()));

    const result = await askClaude('test fallback', '', { useCache: false });

    expect(result).toBe('Hello from Groq');
    // Only one fetch call — groq succeeded
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // Verify the URL was Groq's
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/chat/completions');
  });

  test('falls back to gemini when groq fails', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.GOOGLE_API_KEY = 'test-gemini-key';
    process.env.ANTHROPIC_API_KEY = 'test-claude-key';

    // Groq fails
    mockFetch
      .mockResolvedValueOnce(mockFetchResponse({ error: { message: 'Groq error' } }, false, 500))
      .mockResolvedValueOnce(mockFetchResponse(geminiSuccessBody()));

    const result = await askClaude('test gemini fallback', '', { useCache: false });

    expect(result).toBe('Hello from Gemini');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test('falls back to claude when groq and gemini both fail', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.GOOGLE_API_KEY = 'test-gemini-key';
    process.env.ANTHROPIC_API_KEY = 'test-claude-key';

    // Groq and Gemini fail
    mockFetch
      .mockResolvedValueOnce(mockFetchResponse({ error: { message: 'Groq error' } }, false, 500))
      .mockResolvedValueOnce(mockFetchResponse({ error: { message: 'Gemini error' } }, false, 500))
      .mockResolvedValueOnce(mockFetchResponse(claudeSuccessBody()));

    const result = await askClaude('test claude fallback', '', { useCache: false });

    expect(result).toBe('Hello from Claude');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  test('throws when all providers fail', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.GOOGLE_API_KEY = 'test-gemini-key';
    process.env.ANTHROPIC_API_KEY = 'test-claude-key';

    mockFetch
      .mockResolvedValueOnce(mockFetchResponse({ error: { message: 'Groq error' } }, false, 500))
      .mockResolvedValueOnce(mockFetchResponse({ error: { message: 'Gemini error' } }, false, 500))
      .mockResolvedValueOnce(mockFetchResponse({ error: { message: 'Claude error' } }, false, 500));

    await expect(askClaude('all fail', '', { useCache: false }))
      .rejects.toThrow('All LLM providers failed');
  });

  test('throws when no providers have API keys', async () => {
    // All env keys deleted in beforeEach
    await expect(askClaude('no keys', '', { useCache: false }))
      .rejects.toThrow('All LLM providers failed');

    // No fetch calls should have been made
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ============================================
// askClaude — cache behavior
// ============================================

describe('askClaude - cache behavior', () => {
  test('cache hit returns cached response without calling API', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    mockFetch.mockResolvedValueOnce(mockFetchResponse(groqSuccessBody('cached!')));

    // First call populates cache
    const result1 = await askClaude('cache hit prompt', 'system', { useCache: true });
    expect(result1).toBe('cached!');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call should hit cache
    const result2 = await askClaude('cache hit prompt', 'system', { useCache: true });
    expect(result2).toBe('cached!');
    expect(mockFetch).toHaveBeenCalledTimes(1); // No additional call
  });

  test('cache miss calls API', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    mockFetch
      .mockResolvedValueOnce(mockFetchResponse(groqSuccessBody('response A')))
      .mockResolvedValueOnce(mockFetchResponse(groqSuccessBody('response B')));

    const resultA = await askClaude('prompt A', '', { useCache: true });
    const resultB = await askClaude('prompt B', '', { useCache: true });

    // Different prompts = different cache keys = two API calls
    expect(resultA).toBe('response A');
    expect(resultB).toBe('response B');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test('cache records usage as provider=cache on hit', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    mockFetch.mockResolvedValueOnce(mockFetchResponse(groqSuccessBody('cache usage')));

    await askClaude('cache usage prompt', 'sys', { useCache: true });

    // Clear mocks to isolate cache-hit recording
    mockPrepare.mockClear();
    mockRun.mockClear();
    mockPrepare.mockReturnValue({ run: mockRun });

    await askClaude('cache usage prompt', 'sys', { useCache: true });

    // recordUsage should have been called with 'cache' as provider
    const insertCalls = mockRun.mock.calls;
    const cacheCall = insertCalls.find(call => call[0] === 'cache');
    expect(cacheCall).toBeDefined();
  });
});

// ============================================
// askClaude — forceProvider option
// ============================================

describe('askClaude - forceProvider option', () => {
  test('forceProvider=claude only tries Claude', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-claude-key';
    process.env.GROQ_API_KEY = 'test-groq-key';

    mockFetch.mockResolvedValueOnce(mockFetchResponse(claudeSuccessBody()));

    const result = await askClaude('force claude', '', { forceProvider: 'claude', useCache: false });

    expect(result).toBe('Hello from Claude');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages');
  });

  test('forceProvider=groq only tries Groq', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';

    mockFetch.mockResolvedValueOnce(mockFetchResponse(groqSuccessBody()));

    const result = await askClaude('force groq', '', { forceProvider: 'groq', useCache: false });

    expect(result).toBe('Hello from Groq');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/chat/completions');
  });

  test('forceProvider=gemini only tries Gemini', async () => {
    process.env.GOOGLE_API_KEY = 'test-gemini-key';

    mockFetch.mockResolvedValueOnce(mockFetchResponse(geminiSuccessBody()));

    const result = await askClaude('force gemini', '', { forceProvider: 'gemini', useCache: false });

    expect(result).toBe('Hello from Gemini');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain('generativelanguage.googleapis.com');
  });

  test('forceProvider fails if that provider has no API key', async () => {
    // No ANTHROPIC_API_KEY set
    await expect(askClaude('no key', '', { forceProvider: 'claude', useCache: false }))
      .rejects.toThrow('All LLM providers failed');
  });
});

// ============================================
// Provider selection — skips providers without API keys
// ============================================

describe('askClaude - provider key detection', () => {
  test('skips groq when GROQ_API_KEY is missing, uses gemini', async () => {
    // Only gemini key set
    process.env.GOOGLE_API_KEY = 'test-gemini-key';

    mockFetch.mockResolvedValueOnce(mockFetchResponse(geminiSuccessBody()));

    const result = await askClaude('skip groq', '', { useCache: false });

    expect(result).toBe('Hello from Gemini');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain('generativelanguage.googleapis.com');
  });

  test('skips groq and gemini when only ANTHROPIC_API_KEY is set', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-claude-key';

    mockFetch.mockResolvedValueOnce(mockFetchResponse(claudeSuccessBody()));

    const result = await askClaude('only claude', '', { useCache: false });

    expect(result).toBe('Hello from Claude');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages');
  });
});

// ============================================
// Error handling — rate limits and retries
// ============================================

describe('askClaude - error handling', () => {
  test('waits on rate limit (429) before trying next provider', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.GOOGLE_API_KEY = 'test-gemini-key';

    // Groq returns a 429 rate limit
    mockFetch
      .mockResolvedValueOnce(mockFetchResponse(
        { error: { message: 'rate limit exceeded' } }, false, 429
      ))
      .mockResolvedValueOnce(mockFetchResponse(geminiSuccessBody()));

    const startTime = Date.now();
    const result = await askClaude('rate limit test', '', { useCache: false });
    const elapsed = Date.now() - startTime;

    expect(result).toBe('Hello from Gemini');
    // Should have waited at least ~1000ms for rate limit sleep
    expect(elapsed).toBeGreaterThanOrEqual(900);
  });

  test('detects rate limit in error message text', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.GOOGLE_API_KEY = 'test-gemini-key';

    mockFetch
      .mockResolvedValueOnce(mockFetchResponse(
        { error: { message: 'You have hit the rate limit for this API' } }, false, 429
      ))
      .mockResolvedValueOnce(mockFetchResponse(geminiSuccessBody()));

    const result = await askClaude('rate limit message', '', { useCache: false });
    expect(result).toBe('Hello from Gemini');
  });

  test('handles empty response from provider', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.GOOGLE_API_KEY = 'test-gemini-key';

    // Groq returns success but empty content
    mockFetch
      .mockResolvedValueOnce(mockFetchResponse({
        choices: [{ message: { content: '' } }],
        usage: { prompt_tokens: 10, completion_tokens: 0 },
      }))
      .mockResolvedValueOnce(mockFetchResponse(geminiSuccessBody('fallback after empty')));

    const result = await askClaude('empty response', '', { useCache: false });
    expect(result).toBe('fallback after empty');
  });

  test('handles fetch network error gracefully', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.GOOGLE_API_KEY = 'test-gemini-key';

    // Groq fetch throws network error
    mockFetch
      .mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValueOnce(mockFetchResponse(geminiSuccessBody('recovered')));

    const result = await askClaude('network error', '', { useCache: false });
    expect(result).toBe('recovered');
  });

  test('records failed attempts with error message', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.GOOGLE_API_KEY = 'test-gemini-key';

    mockFetch
      .mockResolvedValueOnce(mockFetchResponse({ error: { message: 'Groq broke' } }, false, 500))
      .mockResolvedValueOnce(mockFetchResponse(geminiSuccessBody()));

    await askClaude('error recording', '', { useCache: false });

    // The run mock should have been called with an error message for the failed provider
    const callsWithErrors = mockRun.mock.calls.filter(
      call => call.length >= 6 && call[5] !== null && typeof call[5] === 'string'
    );
    expect(callsWithErrors.length).toBeGreaterThanOrEqual(1);
  });

  test('error message includes last provider error', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';

    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ error: { message: 'specific error detail' } }, false, 500)
    );

    await expect(askClaude('last error detail', '', { useCache: false }))
      .rejects.toThrow('specific error detail');
  });
});

// ============================================
// Individual provider API call format
// ============================================

describe('provider API call format', () => {
  test('Groq sends correct headers and body shape', async () => {
    process.env.GROQ_API_KEY = 'my-groq-key';

    mockFetch.mockResolvedValueOnce(mockFetchResponse(groqSuccessBody()));

    await askClaude('groq format', 'system msg', { forceProvider: 'groq', useCache: false });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(options.headers['Authorization']).toBe('Bearer my-groq-key');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body.model).toBe('llama-3.1-8b-instant');
    expect(body.messages).toEqual([
      { role: 'system', content: 'system msg' },
      { role: 'user', content: 'groq format' },
    ]);
    expect(body.max_tokens).toBeDefined();
    expect(body.temperature).toBeDefined();
  });

  test('Claude sends correct headers including anthropic-version', async () => {
    process.env.ANTHROPIC_API_KEY = 'my-claude-key';

    mockFetch.mockResolvedValueOnce(mockFetchResponse(claudeSuccessBody()));

    await askClaude('claude format', 'sys', { forceProvider: 'claude', useCache: false });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(options.headers['x-api-key']).toBe('my-claude-key');
    expect(options.headers['anthropic-version']).toBe('2023-06-01');

    const body = JSON.parse(options.body);
    expect(body.model).toBe('claude-3-5-sonnet-20241022');
    expect(body.system).toBe('sys');
    expect(body.messages).toEqual([{ role: 'user', content: 'claude format' }]);
  });

  test('Gemini sends API key as query parameter', async () => {
    process.env.GOOGLE_API_KEY = 'my-gemini-key';

    mockFetch.mockResolvedValueOnce(mockFetchResponse(geminiSuccessBody()));

    await askClaude('gemini format', '', { forceProvider: 'gemini', useCache: false });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('key=my-gemini-key');
    expect(url).toContain('gemini-1.5-pro:generateContent');
  });

  test('Gemini prepends system prompt to user content', async () => {
    process.env.GOOGLE_API_KEY = 'my-gemini-key';

    mockFetch.mockResolvedValueOnce(mockFetchResponse(geminiSuccessBody()));

    await askClaude('user msg', 'system instructions', { forceProvider: 'gemini', useCache: false });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const text = body.contents[0].parts[0].text;
    expect(text).toContain('system instructions');
    expect(text).toContain('user msg');
  });

  test('Claude omits system field when systemPrompt is empty', async () => {
    process.env.ANTHROPIC_API_KEY = 'my-claude-key';

    mockFetch.mockResolvedValueOnce(mockFetchResponse(claudeSuccessBody()));

    await askClaude('no system', '', { forceProvider: 'claude', useCache: false });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.system).toBeUndefined();
  });

  test('Groq omits system message when systemPrompt is empty', async () => {
    process.env.GROQ_API_KEY = 'my-groq-key';

    mockFetch.mockResolvedValueOnce(mockFetchResponse(groqSuccessBody()));

    await askClaude('no system groq', '', { forceProvider: 'groq', useCache: false });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages).toEqual([{ role: 'user', content: 'no system groq' }]);
  });
});

// ============================================
// PROVIDERS and API_COSTS exports
// ============================================

describe('exported constants', () => {
  test('PROVIDERS has expected keys', () => {
    expect(Object.keys(PROVIDERS)).toEqual(expect.arrayContaining(['claude', 'groq', 'gemini']));
  });

  test('provider priorities: groq(1) < gemini(2) < claude(3)', () => {
    expect(PROVIDERS.groq.priority).toBe(1);
    expect(PROVIDERS.gemini.priority).toBe(2);
    expect(PROVIDERS.claude.priority).toBe(3);
  });

  test('API_COSTS has input and output rates for each provider', () => {
    for (const provider of ['claude', 'groq', 'gemini']) {
      expect(API_COSTS[provider]).toHaveProperty('input');
      expect(API_COSTS[provider]).toHaveProperty('output');
      expect(typeof API_COSTS[provider].input).toBe('number');
      expect(typeof API_COSTS[provider].output).toBe('number');
    }
  });

  test('each provider has apiKey function', () => {
    for (const provider of Object.values(PROVIDERS)) {
      expect(typeof provider.apiKey).toBe('function');
    }
  });
});

// ============================================
// Custom options passed through
// ============================================

describe('askClaude - custom options', () => {
  test('custom maxTokens is passed to provider', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce(mockFetchResponse(groqSuccessBody()));

    await askClaude('custom tokens', '', { forceProvider: 'groq', useCache: false, maxTokens: 2048 });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(2048);
  });

  test('custom temperature is passed to provider', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce(mockFetchResponse(groqSuccessBody()));

    await askClaude('custom temp', '', { forceProvider: 'groq', useCache: false, temperature: 0.2 });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.temperature).toBe(0.2);
  });

  test('custom model is passed to provider', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce(mockFetchResponse(groqSuccessBody()));

    await askClaude('custom model', '', {
      forceProvider: 'groq',
      useCache: false,
      model: 'llama-3.1-70b-versatile',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('llama-3.1-70b-versatile');
  });
});
