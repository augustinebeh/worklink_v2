/**
 * Unit Tests: Chat Route Handlers
 *
 * Tests conversation listing, message retrieval, message creation,
 * and input validation for the chat API routes.
 */

const express = require('express');
const request = require('supertest');

// ============================================
// MOCKS - must be declared before imports
// ============================================

// Mock the db module
const mockAll = jest.fn().mockReturnValue([]);
const mockGet = jest.fn().mockReturnValue(null);
const mockRun = jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 42 });
const mockPrepare = jest.fn().mockReturnValue({
  all: mockAll,
  get: mockGet,
  run: mockRun
});
const mockExec = jest.fn();

jest.mock('../../db', () => ({
  db: {
    prepare: mockPrepare,
    exec: mockExec
  }
}));

// Mock auth middleware to auto-inject req.user
jest.mock('../../middleware/auth', () => ({
  authenticateAdmin: (req, res, next) => {
    req.user = { id: 'ADMIN001', role: 'admin', name: 'Test Admin', email: 'admin@test.com' };
    next();
  },
  authenticateAny: (req, res, next) => {
    req.user = req.headers['x-test-role'] === 'candidate'
      ? { id: 'C001', role: 'candidate', name: 'Test Candidate', email: 'candidate@test.com' }
      : { id: 'ADMIN001', role: 'admin', name: 'Test Admin', email: 'admin@test.com' };
    next();
  },
  authenticateCandidateOwnership: (req, res, next) => {
    req.user = { id: 'C001', role: 'candidate', name: 'Test Candidate', email: 'candidate@test.com' };
    next();
  }
}));

// Mock WebSocket integration helpers
jest.mock('../../routes/api/v1/chat/helpers/websocket-integration', () => ({
  broadcastConversationStatus: jest.fn(),
  broadcastToCandidate: jest.fn(),
  broadcastToAdmins: jest.fn(),
  broadcastTypingIndicator: jest.fn(),
  broadcastReadReceipt: jest.fn(),
  isCandidateOnline: jest.fn().mockResolvedValue(false),
  getOnlineCandidates: jest.fn().mockResolvedValue([])
}));

// Mock AI replies helper
jest.mock('../../routes/api/v1/chat/helpers/ai-replies', () => ({
  generateAIQuickReplies: jest.fn().mockResolvedValue(null),
  getDefaultReplies: jest.fn().mockReturnValue(['Sure!', 'Thank you', 'Got it'])
}));

// Mock messaging service
jest.mock('../../services/messaging', () => ({
  sendMessage: jest.fn().mockResolvedValue({ success: true })
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// ============================================
// TEST SETUP
// ============================================

const conversationsRouter = require('../../routes/api/v1/chat/routes/conversations');
const messagesRouter = require('../../routes/api/v1/chat/routes/messages');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/conversations', conversationsRouter);
  app.use('/messages', messagesRouter);
  return app;
}

let app;

beforeEach(() => {
  app = createApp();
  jest.clearAllMocks();

  // Reset default mock implementations
  mockAll.mockReturnValue([]);
  mockGet.mockReturnValue(null);
  mockRun.mockReturnValue({ changes: 1, lastInsertRowid: 42 });
  mockPrepare.mockReturnValue({
    all: mockAll,
    get: mockGet,
    run: mockRun
  });
  mockExec.mockReturnValue(undefined);
});

// ============================================
// GET /conversations
// ============================================

describe('GET /conversations', () => {
  const sampleConversations = [
    {
      id: 1,
      candidate_id: 1,
      name: 'Alice',
      email: 'alice@test.com',
      phone: '91234567',
      candidate_status: 'active',
      latest_message: 'Hello!',
      latest_sender: 'candidate',
      latest_message_time: '2026-03-19T10:00:00Z',
      latest_message_read: 0,
      total_messages: 5,
      unread_count: 2,
      admin_messages: 2,
      candidate_messages: 3,
      conversation_status: 'active',
      conversation_priority: 'normal',
      last_seen: '2026-03-19T10:00:00Z'
    },
    {
      id: 2,
      candidate_id: 2,
      name: 'Bob',
      email: 'bob@test.com',
      phone: '98765432',
      candidate_status: 'active',
      latest_message: 'Thanks',
      latest_sender: 'admin',
      latest_message_time: '2026-03-18T08:00:00Z',
      latest_message_read: 1,
      total_messages: 10,
      unread_count: 0,
      admin_messages: 6,
      candidate_messages: 4,
      conversation_status: 'active',
      conversation_priority: 'high',
      last_seen: '2026-03-18T08:00:00Z'
    }
  ];

  test('returns conversation list with success response', async () => {
    // First call: main query (conversations list)
    // Second call: count query
    let callCount = 0;
    mockPrepare.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // exec for table creation - not a prepare call
      }
      return {
        all: jest.fn().mockReturnValue(sampleConversations),
        get: jest.fn().mockReturnValue({ total: 2 }),
        run: jest.fn()
      };
    });

    const res = await request(app).get('/conversations');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.pagination).toBeDefined();
    expect(res.body.summary).toBeDefined();
    expect(res.body.filters).toBeDefined();
  });

  test('returns pagination metadata', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue(sampleConversations),
      get: jest.fn().mockReturnValue({ total: 50 }),
      run: jest.fn()
    }));

    const res = await request(app).get('/conversations?page=2&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.pagination).toEqual(
      expect.objectContaining({
        page: 2,
        limit: 10,
        total: 50,
        totalPages: 5
      })
    );
    expect(res.body.pagination.hasNext).toBe(true);
    expect(res.body.pagination.hasPrev).toBe(true);
  });

  test('page 1 has hasPrev = false', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue(sampleConversations),
      get: jest.fn().mockReturnValue({ total: 50 }),
      run: jest.fn()
    }));

    const res = await request(app).get('/conversations?page=1&limit=20');

    expect(res.status).toBe(200);
    expect(res.body.pagination.hasPrev).toBe(false);
  });

  test('handles status filter', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValue({ total: 0 }),
      run: jest.fn()
    }));

    const res = await request(app).get('/conversations?status=resolved');

    expect(res.status).toBe(200);
    expect(res.body.filters.status).toBe('resolved');
  });

  test('handles priority filter', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValue({ total: 0 }),
      run: jest.fn()
    }));

    const res = await request(app).get('/conversations?priority=high');

    expect(res.status).toBe(200);
    expect(res.body.filters.priority).toBe('high');
  });

  test('handles search filter', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValue({ total: 0 }),
      run: jest.fn()
    }));

    const res = await request(app).get('/conversations?search=alice');

    expect(res.status).toBe(200);
    expect(res.body.filters.search).toBe('alice');
  });

  test('returns summary with unread counts', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue(sampleConversations),
      get: jest.fn().mockReturnValue({ total: 2 }),
      run: jest.fn()
    }));

    const res = await request(app).get('/conversations');

    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual(
      expect.objectContaining({
        total_conversations: 2,
        total_unread: expect.any(Number),
        online_candidates: expect.any(Number),
        active_conversations: expect.any(Number)
      })
    );
  });

  test('enhances conversations with computed fields', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([sampleConversations[0]]),
      get: jest.fn().mockReturnValue({ total: 1 }),
      run: jest.fn()
    }));

    const res = await request(app).get('/conversations');

    expect(res.status).toBe(200);
    const conv = res.body.data[0];
    expect(conv).toHaveProperty('is_online');
    expect(conv).toHaveProperty('has_unread');
    expect(conv).toHaveProperty('last_activity');
    expect(conv).toHaveProperty('conversation_health');
    expect(conv.conversation_health).toHaveProperty('score');
    expect(conv.conversation_health).toHaveProperty('level');
    expect(conv.conversation_health).toHaveProperty('indicators');
  });

  test('returns 500 on database error', async () => {
    mockExec.mockImplementation(() => { throw new Error('DB connection lost'); });

    const res = await request(app).get('/conversations');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Failed to retrieve conversations/);
  });

  test('defaults to page=1, limit=20, sortBy=latest_message, order=DESC', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValue({ total: 0 }),
      run: jest.fn()
    }));

    const res = await request(app).get('/conversations');

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(20);
    expect(res.body.filters.sortBy).toBe('latest_message');
    expect(res.body.filters.order).toBe('DESC');
  });
});

// ============================================
// GET /conversations/:candidateId
// ============================================

describe('GET /conversations/:candidateId', () => {
  test('returns conversation details for a valid candidate', async () => {
    const candidateData = {
      id: 1,
      name: 'Alice',
      email: 'alice@test.com',
      conversation_status: 'active',
      conversation_priority: 'normal'
    };
    const statsData = {
      total_messages: 10,
      unread_count: 3,
      admin_messages: 4,
      candidate_messages: 6,
      first_message_at: '2026-03-01T10:00:00Z',
      latest_message_at: '2026-03-19T10:00:00Z'
    };
    const recentMessages = [
      { content: 'Hi', sender: 'candidate', created_at: '2026-03-19T09:00:00Z', read: 1 },
      { content: 'Hello', sender: 'admin', created_at: '2026-03-19T09:05:00Z', read: 1 }
    ];

    let callCount = 0;
    mockPrepare.mockImplementation(() => {
      callCount++;
      return {
        all: jest.fn().mockReturnValue(recentMessages),
        get: jest.fn().mockImplementation(() => {
          // First get: candidate, second get: stats
          if (callCount === 1) return candidateData;
          return statsData;
        }),
        run: jest.fn()
      };
    });

    const res = await request(app).get('/conversations/1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data).toHaveProperty('candidate');
    expect(res.body.data).toHaveProperty('stats');
    expect(res.body.data).toHaveProperty('recent_messages');
    expect(res.body.data).toHaveProperty('is_online');
    expect(res.body.data).toHaveProperty('conversation_health');
  });

  test('returns 404 when candidate not found', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValue(null),
      run: jest.fn()
    }));

    const res = await request(app).get('/conversations/999');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Candidate not found/);
  });

  test('returns 500 on database error', async () => {
    mockPrepare.mockImplementation(() => {
      throw new Error('DB error');
    });

    const res = await request(app).get('/conversations/1');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// GET /messages (with candidateId query param)
// ============================================

describe('GET /messages', () => {
  const sampleMessages = [
    {
      id: 1,
      candidate_id: 1,
      content: 'Hello there',
      sender: 'candidate',
      created_at: '2026-03-19T09:00:00Z',
      read: 0,
      candidate_name: 'Alice'
    },
    {
      id: 2,
      candidate_id: 1,
      content: 'Hi Alice!',
      sender: 'admin',
      created_at: '2026-03-19T09:05:00Z',
      read: 1,
      candidate_name: 'Alice'
    }
  ];

  test('returns messages for a conversation', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue(sampleMessages),
      get: jest.fn(),
      run: jest.fn()
    }));

    const res = await request(app).get('/messages?candidateId=1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(sampleMessages);
    expect(res.body.candidateId).toBe('1');
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.limit).toBe(50);
    expect(res.body.pagination.offset).toBe(0);
  });

  test('requires candidateId parameter', async () => {
    const res = await request(app).get('/messages');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/candidateId is required/);
  });

  test('respects limit and offset parameters', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([sampleMessages[0]]),
      get: jest.fn(),
      run: jest.fn()
    }));

    const res = await request(app).get('/messages?candidateId=1&limit=1&offset=0');

    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(1);
    expect(res.body.pagination.offset).toBe(0);
  });

  test('caps limit at 500', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn(),
      run: jest.fn()
    }));

    const res = await request(app).get('/messages?candidateId=1&limit=999');

    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(500);
  });

  test('enforces minimum limit of 1 for negative values', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn(),
      run: jest.fn()
    }));

    const res = await request(app).get('/messages?candidateId=1&limit=-5');

    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(1);
  });

  test('falls back to default limit of 50 when limit=0 (falsy)', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn(),
      run: jest.fn()
    }));

    const res = await request(app).get('/messages?candidateId=1&limit=0');

    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(50);
  });

  test('supports since parameter for real-time updates', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([sampleMessages[1]]),
      get: jest.fn(),
      run: jest.fn()
    }));

    const res = await request(app)
      .get('/messages?candidateId=1&since=2026-03-19T09:01:00Z');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('sets hasMore when result count equals limit', async () => {
    const twoMessages = [sampleMessages[0], sampleMessages[1]];
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue(twoMessages),
      get: jest.fn(),
      run: jest.fn()
    }));

    const res = await request(app).get('/messages?candidateId=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.pagination.hasMore).toBe(true);
  });

  test('sets hasMore=false when result count is less than limit', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([sampleMessages[0]]),
      get: jest.fn(),
      run: jest.fn()
    }));

    const res = await request(app).get('/messages?candidateId=1&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.pagination.hasMore).toBe(false);
  });

  test('returns 500 on database error', async () => {
    mockPrepare.mockImplementation(() => {
      throw new Error('DB connection failed');
    });

    const res = await request(app).get('/messages?candidateId=1');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Failed to retrieve messages/);
  });
});
