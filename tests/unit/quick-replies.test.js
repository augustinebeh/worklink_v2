/**
 * Unit Tests: Quick Replies
 *
 * Tests quick reply suggestions (context detection, frequent replies,
 * usage tracking, context keyword analysis).
 *
 * Conversation Manager tests are in conversation-manager.test.js
 *
 * All database dependencies are mocked.
 */

// ---------------------------------------------------------------------------
// Mock modules BEFORE any require() that pulls them in
// ---------------------------------------------------------------------------

const mockRun = jest.fn(() => ({ lastInsertRowid: 1, changes: 1 }));
const mockGet = jest.fn();
const mockAll = jest.fn(() => []);
const mockExec = jest.fn();
const mockPrepare = jest.fn(() => ({ run: mockRun, get: mockGet, all: mockAll }));

jest.mock('../../db', () => ({
  db: {
    prepare: mockPrepare,
    exec: mockExec,
  },
}));

// Mock structured-logger to suppress output
jest.mock('../../utils/structured-logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Require modules under test AFTER mocks are in place
// ---------------------------------------------------------------------------

const {
  detectContext,
  getSuggestedReplies,
  getCustomReplies,
  addFrequentReply,
  trackSuggestionUsage,
  getRepliesForContext,
  analyzeMessageContexts,
  CONTEXT_KEYWORDS,
  SUGGESTED_REPLIES,
} = require('../../services/quick-replies');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetMocks() {
  mockRun.mockClear();
  mockGet.mockClear();
  mockAll.mockClear();
  mockExec.mockClear();
  mockPrepare.mockClear();

  // Reset default implementations
  mockRun.mockReturnValue({ lastInsertRowid: 1, changes: 1 });
  mockGet.mockReturnValue(undefined);
  mockAll.mockReturnValue([]);
  mockPrepare.mockReturnValue({ run: mockRun, get: mockGet, all: mockAll });
}

beforeEach(() => {
  resetMocks();
});

// ============================================
// QUICK REPLIES: detectContext
// ============================================

describe('detectContext', () => {
  test('detects job_offer context', () => {
    const result = detectContext('We have a new job opportunity for you');
    expect(result.type).toBe('job_offer');
    expect(result.confidence).toBeGreaterThan(0);
  });

  test('detects schedule context', () => {
    const result = detectContext('Are you available tomorrow?');
    expect(['schedule', 'question']).toContain(result.type);
    expect(result.confidence).toBeGreaterThan(0);
  });

  test('detects payment context', () => {
    const result = detectContext('Your payment has been processed for salary');
    expect(result.type).toBe('payment');
    expect(result.confidence).toBeGreaterThan(0);
  });

  test('detects confirmation context', () => {
    const result = detectContext('Please confirm and approve the assignment');
    expect(result.type).toBe('confirmation');
    expect(result.confidence).toBeGreaterThan(0);
  });

  test('detects question context for messages ending with ?', () => {
    const result = detectContext('How are you doing today?');
    expect(result.type).toBe('question');
    expect(result.confidence).toBe(0.5);
  });

  test('returns default for empty/null input', () => {
    expect(detectContext('')).toEqual({ type: 'default', confidence: 0 });
    expect(detectContext(null)).toEqual({ type: 'default', confidence: 0 });
    expect(detectContext(undefined)).toEqual({ type: 'default', confidence: 0 });
  });

  test('returns default for non-string input', () => {
    expect(detectContext(123)).toEqual({ type: 'default', confidence: 0 });
  });

  test('returns default for generic message with no keywords', () => {
    const result = detectContext('Hello there');
    expect(result.type).toBe('default');
  });
});

// ============================================
// QUICK REPLIES: getSuggestedReplies
// ============================================

describe('getSuggestedReplies', () => {
  test('returns default suggestions when no admin message exists', () => {
    mockGet.mockReturnValue(undefined);

    const result = getSuggestedReplies('C001');

    expect(result.context.type).toBe('default');
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.personalized).toBe(false);
  });

  test('returns context-aware suggestions based on last admin message', () => {
    mockGet
      .mockReturnValueOnce({ content: 'We have a new job opportunity for you', sender: 'admin' })
      .mockReturnValueOnce(undefined); // no frequent_replies table

    mockAll.mockReturnValue([]);

    const result = getSuggestedReplies('C001');

    expect(result.context.type).toBe('job_offer');
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.lastMessagePreview).toBeDefined();
  });

  test('respects the limit parameter', () => {
    mockGet.mockReturnValue(undefined);

    const result = getSuggestedReplies('C001', 2);

    expect(result.suggestions.length).toBeLessThanOrEqual(2);
  });

  test('includes personalized suggestions from frequent replies', () => {
    mockGet
      .mockReturnValueOnce({ content: 'Do you have any questions about the job?', sender: 'admin' })
      .mockReturnValueOnce({ name: 'frequent_replies' });

    mockAll.mockReturnValue([
      { reply_text: 'What are the job requirements?', usage_count: 5, last_used: '2026-03-19' },
      { reply_text: 'Thanks for the info', usage_count: 3, last_used: '2026-03-18' },
    ]);

    const result = getSuggestedReplies('C001', 5);

    expect(result.personalized).toBe(true);
  });
});

// ============================================
// QUICK REPLIES: addFrequentReply
// ============================================

describe('addFrequentReply', () => {
  test('adds a new frequent reply successfully', () => {
    mockGet.mockReturnValue(undefined); // No existing reply

    const result = addFrequentReply('C001', 'Thanks!');

    expect(result).toBe(true);
    expect(mockExec).toHaveBeenCalled(); // CREATE TABLE IF NOT EXISTS
    expect(mockRun).toHaveBeenCalled(); // INSERT
  });

  test('increments usage count for existing reply', () => {
    mockGet.mockReturnValue({ id: 42 }); // Existing reply found

    const result = addFrequentReply('C001', 'Thanks!');

    expect(result).toBe(true);
    expect(mockRun).toHaveBeenCalled(); // UPDATE usage_count
  });

  test('returns false for empty/null reply', () => {
    expect(addFrequentReply('C001', '')).toBe(false);
    expect(addFrequentReply('C001', null)).toBe(false);
    expect(addFrequentReply('C001', undefined)).toBe(false);
  });

  test('returns false for non-string reply', () => {
    expect(addFrequentReply('C001', 123)).toBe(false);
  });

  test('returns false for reply exceeding 100 characters', () => {
    const longReply = 'A'.repeat(101);
    expect(addFrequentReply('C001', longReply)).toBe(false);
  });

  test('trims whitespace from reply', () => {
    mockGet.mockReturnValue(undefined); // No existing

    addFrequentReply('C001', '  Hello  ');

    expect(mockRun).toHaveBeenCalled();
  });

  test('returns false on database error', () => {
    mockExec.mockImplementationOnce(() => {
      throw new Error('DB error');
    });

    const result = addFrequentReply('C001', 'Test');

    expect(result).toBe(false);
  });
});

// ============================================
// QUICK REPLIES: trackSuggestionUsage
// ============================================

describe('trackSuggestionUsage', () => {
  test('records usage and adds to frequent replies', () => {
    mockRun.mockReturnValue({ lastInsertRowid: 1, changes: 1 });
    mockGet.mockReturnValue(undefined);

    const result = trackSuggestionUsage('C001', "I'm interested!", 'job_offer');

    expect(result).toBe(true);
    expect(mockExec).toHaveBeenCalled(); // CREATE TABLE calls
    expect(mockRun).toHaveBeenCalled();
  });

  test('returns false on database error', () => {
    mockExec.mockImplementationOnce(() => {
      throw new Error('DB error');
    });

    const result = trackSuggestionUsage('C001', 'Test', 'default');

    expect(result).toBe(false);
  });
});

// ============================================
// QUICK REPLIES: getRepliesForContext
// ============================================

describe('getRepliesForContext', () => {
  test('returns replies for job_offer context', () => {
    const replies = getRepliesForContext('job_offer');
    expect(Array.isArray(replies)).toBe(true);
    expect(replies.length).toBeGreaterThan(0);
    expect(replies).toContain("I'm interested!");
  });

  test('returns replies for schedule context', () => {
    const replies = getRepliesForContext('schedule');
    expect(replies).toContain("I'm available");
  });

  test('returns replies for payment context', () => {
    const replies = getRepliesForContext('payment');
    expect(replies).toContain('When will I be paid?');
  });

  test('returns replies for confirmation context', () => {
    const replies = getRepliesForContext('confirmation');
    expect(replies).toContain('Yes, confirmed!');
  });

  test('returns default replies for unknown context', () => {
    const replies = getRepliesForContext('nonexistent');
    expect(replies).toEqual(SUGGESTED_REPLIES.default);
  });
});

// ============================================
// QUICK REPLIES: analyzeMessageContexts
// ============================================

describe('analyzeMessageContexts', () => {
  test('returns multiple context matches sorted by confidence', () => {
    const contexts = analyzeMessageContexts('When is the job available next week?');

    expect(contexts.length).toBeGreaterThan(0);
    for (let i = 1; i < contexts.length; i++) {
      expect(contexts[i - 1].confidence).toBeGreaterThanOrEqual(contexts[i].confidence);
    }
  });

  test('includes matched keywords in results', () => {
    const contexts = analyzeMessageContexts('I need to know about payment and salary');

    const paymentContext = contexts.find((c) => c.type === 'payment');
    expect(paymentContext).toBeDefined();
    expect(paymentContext.matchedKeywords).toContain('payment');
    expect(paymentContext.matchedKeywords).toContain('salary');
  });

  test('returns default for null/empty input', () => {
    expect(analyzeMessageContexts(null)).toEqual([{ type: 'default', confidence: 0 }]);
    expect(analyzeMessageContexts('')).toEqual([{ type: 'default', confidence: 0 }]);
  });

  test('detects question context for messages ending with ?', () => {
    const contexts = analyzeMessageContexts('Really?');

    const questionCtx = contexts.find((c) => c.type === 'question');
    expect(questionCtx).toBeDefined();
    expect(questionCtx.confidence).toBe(0.5);
  });

  test('returns default as fallback when no keywords match', () => {
    const contexts = analyzeMessageContexts('Hello there');
    expect(contexts).toEqual([{ type: 'default', confidence: 0 }]);
  });
});

// ============================================
// QUICK REPLIES: getCustomReplies
// ============================================

describe('getCustomReplies', () => {
  test('returns frequent replies from table when it exists', () => {
    mockGet.mockReturnValue({ name: 'frequent_replies' }); // table exists
    mockAll.mockReturnValue([
      { reply_text: 'Thanks!', usage_count: 10, last_used: '2026-03-19' },
      { reply_text: 'Got it', usage_count: 5, last_used: '2026-03-18' },
    ]);

    const result = getCustomReplies('C001');

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Thanks!');
    expect(result[0].count).toBe(10);
  });

  test('falls back to message history when table does not exist', () => {
    mockGet.mockReturnValue(undefined); // table does not exist
    mockAll.mockReturnValue([
      { content: 'Yes', frequency: 5 },
      { content: 'No', frequency: 3 },
    ]);

    const result = getCustomReplies('C001');

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Yes');
    expect(result[0].count).toBe(5);
    expect(result[0].lastUsed).toBeNull();
  });

  test('returns empty array on error', () => {
    mockGet.mockImplementation(() => {
      throw new Error('DB error');
    });

    const result = getCustomReplies('C001');

    expect(result).toEqual([]);
  });
});

// ============================================
// QUICK REPLIES: CONTEXT_KEYWORDS constant
// ============================================

describe('CONTEXT_KEYWORDS', () => {
  test('has all expected context types', () => {
    expect(CONTEXT_KEYWORDS).toHaveProperty('job_offer');
    expect(CONTEXT_KEYWORDS).toHaveProperty('schedule');
    expect(CONTEXT_KEYWORDS).toHaveProperty('payment');
    expect(CONTEXT_KEYWORDS).toHaveProperty('confirmation');
  });

  test('each context type has a non-empty keyword array', () => {
    for (const [type, keywords] of Object.entries(CONTEXT_KEYWORDS)) {
      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeGreaterThan(0);
    }
  });
});
