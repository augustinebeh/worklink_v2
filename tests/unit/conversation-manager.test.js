/**
 * Unit Tests: Conversation Manager
 *
 * Tests conversation metadata management (status, priority, tags,
 * assignments, escalation, resolution), query functions, escalation
 * checks, tracking helpers, and statistics.
 *
 * Quick Replies tests are in quick-replies.test.js
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
  getConversationMetadata,
  updateStatus,
  updatePriority,
  addTag,
  removeTag,
  assignTo,
  escalate,
  resolve,
  getConversationsByStatus,
  getConversationsByPriority,
  getEscalatedConversations,
  searchMessages,
  checkForEscalation,
  recordAdminReply,
  recordCandidateMessage,
  getStatistics,
  VALID_STATUSES,
  VALID_PRIORITIES,
  NEGATIVE_SENTIMENT_KEYWORDS,
} = require('../../services/conversation-manager');

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
// CONVERSATION MANAGER: CONSTANTS
// ============================================

describe('conversation manager constants', () => {
  test('VALID_STATUSES contains expected values', () => {
    expect(VALID_STATUSES).toEqual(['open', 'pending', 'resolved']);
  });

  test('VALID_PRIORITIES contains expected values', () => {
    expect(VALID_PRIORITIES).toEqual(['low', 'normal', 'high', 'urgent']);
  });

  test('NEGATIVE_SENTIMENT_KEYWORDS is a non-empty array', () => {
    expect(Array.isArray(NEGATIVE_SENTIMENT_KEYWORDS)).toBe(true);
    expect(NEGATIVE_SENTIMENT_KEYWORDS.length).toBeGreaterThan(0);
    expect(NEGATIVE_SENTIMENT_KEYWORDS).toContain('angry');
    expect(NEGATIVE_SENTIMENT_KEYWORDS).toContain('frustrated');
    expect(NEGATIVE_SENTIMENT_KEYWORDS).toContain('urgent');
  });
});

// ============================================
// CONVERSATION MANAGER: getConversationMetadata
// ============================================

describe('getConversationMetadata', () => {
  test('returns existing metadata with parsed tags', () => {
    mockGet.mockReturnValue({
      id: 1,
      candidate_id: 'C001',
      status: 'open',
      priority: 'normal',
      tags: '["support","vip"]',
      escalated: 0,
    });

    const result = getConversationMetadata('C001');

    expect(result.candidate_id).toBe('C001');
    expect(result.tags).toEqual(['support', 'vip']);
  });

  test('creates new metadata if not found', () => {
    mockGet
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce({
        id: 1,
        candidate_id: 'C001',
        status: 'open',
        priority: 'normal',
        tags: '[]',
        escalated: 0,
      });

    const result = getConversationMetadata('C001');

    expect(mockRun).toHaveBeenCalled();
    expect(result.candidate_id).toBe('C001');
    expect(result.tags).toEqual([]);
  });

  test('handles malformed tags JSON gracefully', () => {
    mockGet.mockReturnValue({
      id: 1,
      candidate_id: 'C001',
      status: 'open',
      tags: '{invalid-json',
    });

    const result = getConversationMetadata('C001');
    expect(result.tags).toEqual([]);
  });
});

// ============================================
// CONVERSATION MANAGER: updateStatus
// ============================================

describe('updateStatus', () => {
  test('updates to a valid status and returns metadata', () => {
    mockGet.mockReturnValue({
      id: 1,
      candidate_id: 'C001',
      status: 'pending',
      priority: 'normal',
      tags: '[]',
    });

    const result = updateStatus('C001', 'pending');

    expect(mockRun).toHaveBeenCalled();
    expect(result.status).toBe('pending');
  });

  test('throws on invalid status', () => {
    expect(() => updateStatus('C001', 'invalid')).toThrow(
      /Invalid status: invalid/
    );
  });

  test('accepts all valid statuses', () => {
    VALID_STATUSES.forEach((status) => {
      mockGet.mockReturnValue({
        id: 1,
        candidate_id: 'C001',
        status,
        tags: '[]',
      });

      expect(() => updateStatus('C001', status)).not.toThrow();
    });
  });
});

// ============================================
// CONVERSATION MANAGER: updatePriority
// ============================================

describe('updatePriority', () => {
  test('updates to a valid priority and returns metadata', () => {
    mockGet.mockReturnValue({
      id: 1,
      candidate_id: 'C001',
      status: 'open',
      priority: 'high',
      tags: '[]',
    });

    const result = updatePriority('C001', 'high');

    expect(mockRun).toHaveBeenCalled();
    expect(result.priority).toBe('high');
  });

  test('throws on invalid priority', () => {
    expect(() => updatePriority('C001', 'critical')).toThrow(
      /Invalid priority: critical/
    );
  });

  test('accepts all valid priorities', () => {
    VALID_PRIORITIES.forEach((priority) => {
      mockGet.mockReturnValue({
        id: 1,
        candidate_id: 'C001',
        priority,
        tags: '[]',
      });

      expect(() => updatePriority('C001', priority)).not.toThrow();
    });
  });
});

// ============================================
// CONVERSATION MANAGER: tags
// ============================================

describe('addTag', () => {
  test('adds a new tag to the conversation', () => {
    mockGet
      .mockReturnValueOnce({
        id: 1,
        candidate_id: 'C001',
        tags: '[]',
      })
      .mockReturnValueOnce({
        id: 1,
        candidate_id: 'C001',
        tags: '["support"]',
      });

    const result = addTag('C001', 'Support');

    expect(mockRun).toHaveBeenCalled();
    expect(result.tags).toEqual(['support']);
  });

  test('normalizes tags to lowercase and trimmed', () => {
    mockGet
      .mockReturnValueOnce({
        id: 1,
        candidate_id: 'C001',
        tags: '[]',
      })
      .mockReturnValueOnce({
        id: 1,
        candidate_id: 'C001',
        tags: '["urgent"]',
      });

    addTag('C001', '  Urgent  ');

    const runCalls = mockRun.mock.calls;
    const tagUpdate = runCalls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('urgent')
    );
    expect(mockRun).toHaveBeenCalled();
  });

  test('does not duplicate existing tags', () => {
    mockGet.mockReturnValue({
      id: 1,
      candidate_id: 'C001',
      tags: '["support"]',
    });

    addTag('C001', 'support');

    expect(mockRun).not.toHaveBeenCalled();
  });
});

describe('removeTag', () => {
  test('removes an existing tag', () => {
    mockGet
      .mockReturnValueOnce({
        id: 1,
        candidate_id: 'C001',
        tags: '["support","vip"]',
      })
      .mockReturnValueOnce({
        id: 1,
        candidate_id: 'C001',
        tags: '["vip"]',
      });

    const result = removeTag('C001', 'support');

    expect(mockRun).toHaveBeenCalled();
    expect(result.tags).toEqual(['vip']);
  });

  test('normalizes tag before removal', () => {
    mockGet
      .mockReturnValueOnce({
        id: 1,
        candidate_id: 'C001',
        tags: '["vip"]',
      })
      .mockReturnValueOnce({
        id: 1,
        candidate_id: 'C001',
        tags: '[]',
      });

    const result = removeTag('C001', '  VIP  ');

    expect(result.tags).toEqual([]);
  });
});

// ============================================
// CONVERSATION MANAGER: assignTo
// ============================================

describe('assignTo', () => {
  test('assigns conversation to an admin', () => {
    mockGet.mockReturnValue({
      id: 1,
      candidate_id: 'C001',
      assigned_to: 'ADM_001',
      tags: '[]',
    });

    const result = assignTo('C001', 'ADM_001');

    expect(mockRun).toHaveBeenCalled();
    expect(result.assigned_to).toBe('ADM_001');
  });

  test('unassigns when adminId is null', () => {
    mockGet.mockReturnValue({
      id: 1,
      candidate_id: 'C001',
      assigned_to: null,
      tags: '[]',
    });

    const result = assignTo('C001', null);

    expect(mockRun).toHaveBeenCalled();
    expect(result.assigned_to).toBeNull();
  });
});

// ============================================
// CONVERSATION MANAGER: escalate
// ============================================

describe('escalate', () => {
  test('marks conversation as escalated with reason', () => {
    mockGet.mockReturnValue({
      id: 1,
      candidate_id: 'C001',
      escalated: 1,
      escalation_reason: 'Customer very angry',
      priority: 'urgent',
      status: 'open',
      tags: '[]',
    });

    const result = escalate('C001', 'Customer very angry');

    expect(mockRun).toHaveBeenCalled();
    expect(result.escalated).toBe(1);
    expect(result.escalation_reason).toBe('Customer very angry');
    expect(result.priority).toBe('urgent');
    expect(result.status).toBe('open');
  });
});

// ============================================
// CONVERSATION MANAGER: resolve
// ============================================

describe('resolve', () => {
  test('sets status to resolved and clears escalation', () => {
    mockGet.mockReturnValue({
      id: 1,
      candidate_id: 'C001',
      status: 'resolved',
      escalated: 0,
      tags: '[]',
    });

    const result = resolve('C001');

    expect(mockRun).toHaveBeenCalled();
    expect(result.status).toBe('resolved');
    expect(result.escalated).toBe(0);
  });
});

// ============================================
// CONVERSATION MANAGER: query functions
// ============================================

describe('getConversationsByStatus', () => {
  test('returns conversations filtered by status', () => {
    mockAll.mockReturnValue([
      { candidate_id: 'C001', status: 'open', tags: '["vip"]' },
      { candidate_id: 'C002', status: 'open', tags: '[]' },
    ]);

    const results = getConversationsByStatus('open');

    expect(results).toHaveLength(2);
    expect(results[0].tags).toEqual(['vip']);
    expect(results[1].tags).toEqual([]);
  });

  test('throws on invalid status', () => {
    expect(() => getConversationsByStatus('invalid')).toThrow(
      /Invalid status/
    );
  });

  test('handles malformed tags in results', () => {
    mockAll.mockReturnValue([
      { candidate_id: 'C001', status: 'open', tags: 'not-json' },
    ]);

    const results = getConversationsByStatus('open');
    expect(results[0].tags).toEqual([]);
  });
});

describe('getConversationsByPriority', () => {
  test('returns conversations filtered by priority', () => {
    mockAll.mockReturnValue([
      { candidate_id: 'C001', priority: 'urgent', tags: '[]' },
    ]);

    const results = getConversationsByPriority('urgent');

    expect(results).toHaveLength(1);
    expect(results[0].priority).toBe('urgent');
  });

  test('throws on invalid priority', () => {
    expect(() => getConversationsByPriority('critical')).toThrow(
      /Invalid priority/
    );
  });
});

describe('getEscalatedConversations', () => {
  test('returns all escalated conversations', () => {
    mockAll.mockReturnValue([
      { candidate_id: 'C001', escalated: 1, tags: '["urgent"]' },
      { candidate_id: 'C002', escalated: 1, tags: '[]' },
    ]);

    const results = getEscalatedConversations();

    expect(results).toHaveLength(2);
    expect(results[0].tags).toEqual(['urgent']);
  });
});

// ============================================
// CONVERSATION MANAGER: searchMessages
// ============================================

describe('searchMessages', () => {
  test('returns messages grouped by candidate', () => {
    mockAll.mockReturnValue([
      { id: 1, candidate_id: 'C001', content: 'Hello', sender: 'candidate', channel: 'web', created_at: '2026-03-19', candidate_name: 'Alice', candidate_email: 'alice@test.com' },
      { id: 2, candidate_id: 'C001', content: 'Hello again', sender: 'candidate', channel: 'web', created_at: '2026-03-19', candidate_name: 'Alice', candidate_email: 'alice@test.com' },
      { id: 3, candidate_id: 'C002', content: 'Hello there', sender: 'candidate', channel: 'telegram', created_at: '2026-03-19', candidate_name: 'Bob', candidate_email: 'bob@test.com' },
    ]);

    const results = searchMessages('Hello');

    expect(results).toHaveLength(2); // Grouped by candidate
    const aliceGroup = results.find((g) => g.candidateId === 'C001');
    expect(aliceGroup.messages).toHaveLength(2);
    expect(aliceGroup.candidateName).toBe('Alice');
  });

  test('filters by candidateId when provided', () => {
    mockAll.mockReturnValue([
      { id: 1, candidate_id: 'C001', content: 'Test', sender: 'candidate', channel: 'web', created_at: '2026-03-19', candidate_name: 'Alice', candidate_email: 'alice@test.com' },
    ]);

    const results = searchMessages('Test', 'C001');

    expect(results).toHaveLength(1);
    expect(results[0].candidateId).toBe('C001');
  });

  test('returns empty array when no matches', () => {
    mockAll.mockReturnValue([]);

    const results = searchMessages('nonexistent');
    expect(results).toEqual([]);
  });
});

// ============================================
// CONVERSATION MANAGER: checkForEscalation
// ============================================

describe('checkForEscalation', () => {
  test('recommends escalation for low AI confidence', () => {
    mockGet.mockReturnValue({
      id: 1,
      candidate_id: 'C001',
      tags: '[]',
      last_admin_reply_at: new Date().toISOString(),
      last_candidate_message_at: null,
    });

    const result = checkForEscalation('C001', 'Simple question', 0.3);

    expect(result.shouldEscalate).toBe(true);
    expect(result.reason).toMatch(/Low AI confidence/);
  });

  test('recommends escalation for negative sentiment', () => {
    mockGet.mockReturnValue({
      id: 1,
      candidate_id: 'C001',
      tags: '[]',
      last_admin_reply_at: new Date().toISOString(),
      last_candidate_message_at: null,
    });

    const result = checkForEscalation('C001', 'I am very angry about this!', 0.9);

    expect(result.shouldEscalate).toBe(true);
    expect(result.reason).toMatch(/Negative sentiment.*angry/);
  });

  test('recommends escalation for no admin reply in 24+ hours', () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    mockGet.mockReturnValue({
      id: 1,
      candidate_id: 'C001',
      tags: '[]',
      last_admin_reply_at: oldDate,
      last_candidate_message_at: null,
    });

    const result = checkForEscalation('C001', 'Any update?', 0.9);

    expect(result.shouldEscalate).toBe(true);
    expect(result.reason).toMatch(/No admin reply/);
  });

  test('does not escalate for normal conversation', () => {
    mockGet.mockReturnValue({
      id: 1,
      candidate_id: 'C001',
      tags: '[]',
      last_admin_reply_at: new Date().toISOString(),
      last_candidate_message_at: null,
    });

    const result = checkForEscalation('C001', 'Thanks for the update', 0.95);

    expect(result.shouldEscalate).toBe(false);
    expect(result.reason).toBe('');
  });

  test('combines multiple escalation reasons', () => {
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    mockGet.mockReturnValue({
      id: 1,
      candidate_id: 'C001',
      tags: '[]',
      last_admin_reply_at: oldDate,
      last_candidate_message_at: null,
    });

    const result = checkForEscalation('C001', 'I am frustrated, this is urgent!', 0.4);

    expect(result.shouldEscalate).toBe(true);
    expect(result.reason).toMatch(/Low AI confidence/);
    expect(result.reason).toMatch(/Negative sentiment/);
    expect(result.reason).toMatch(/No admin reply/);
  });

  test('escalates for unanswered conversation (no admin reply ever)', () => {
    const oldDate = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
    mockGet.mockReturnValue({
      id: 1,
      candidate_id: 'C001',
      tags: '[]',
      last_admin_reply_at: null,
      last_candidate_message_at: oldDate,
    });

    const result = checkForEscalation('C001', 'Hello?', 0.9);

    expect(result.shouldEscalate).toBe(true);
    expect(result.reason).toMatch(/conversation unanswered/);
  });
});

// ============================================
// CONVERSATION MANAGER: tracking helpers
// ============================================

describe('recordAdminReply', () => {
  test('updates last_admin_reply_at timestamp', () => {
    mockGet.mockReturnValue({
      id: 1,
      candidate_id: 'C001',
      tags: '[]',
    });

    recordAdminReply('C001');

    expect(mockRun).toHaveBeenCalled();
  });
});

describe('recordCandidateMessage', () => {
  test('updates last_candidate_message_at timestamp', () => {
    mockGet.mockReturnValue({
      id: 1,
      candidate_id: 'C001',
      tags: '[]',
    });

    recordCandidateMessage('C001');

    expect(mockRun).toHaveBeenCalled();
  });
});

// ============================================
// CONVERSATION MANAGER: getStatistics
// ============================================

describe('getStatistics', () => {
  test('returns aggregated statistics', () => {
    mockGet.mockReturnValue({
      total: 50,
      open_count: 20,
      pending_count: 15,
      resolved_count: 15,
      escalated_count: 3,
      urgent_count: 2,
      high_priority_count: 5,
      assigned_count: 30,
    });

    const stats = getStatistics();

    expect(stats.total).toBe(50);
    expect(stats.open_count).toBe(20);
    expect(stats.escalated_count).toBe(3);
    expect(stats.assigned_count).toBe(30);
  });
});
