/**
 * Unit Tests: Chat Message Operations
 *
 * Tests POST /messages, message validation, PUT /conversations/:candidateId/status,
 * PUT /messages/:id/read, DELETE /messages/:id, and POST /messages/typing.
 *
 * Split from chat-routes.test.js to stay under 1000-line limit.
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
// POST /messages
// ============================================

describe('POST /messages', () => {
  test('creates a message successfully', async () => {
    const savedMessage = {
      id: 42,
      candidate_id: 1,
      content: 'Test message',
      sender: 'admin',
      channel: 'app',
      created_at: '2026-03-19T10:00:00Z',
      read: 1,
      candidate_name: 'Alice'
    };

    let callCount = 0;
    mockPrepare.mockImplementation(() => {
      callCount++;
      return {
        all: jest.fn().mockReturnValue([]),
        get: jest.fn().mockImplementation(() => {
          // First get: candidate lookup, second get: saved message
          if (callCount === 1) return { id: 1, name: 'Alice' };
          return savedMessage;
        }),
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 42 })
      };
    });

    const res = await request(app)
      .post('/messages')
      .send({ candidateId: 1, content: 'Test message' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(savedMessage);
    expect(res.body.messageId).toBe(42);
    expect(res.body.message).toMatch(/Message sent successfully/);
  });

  test('sets sender to admin when user role is admin', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn()
        .mockReturnValueOnce({ id: 1, name: 'Alice' }) // candidate lookup
        .mockReturnValueOnce({ id: 42, sender: 'admin', content: 'Hi', candidate_name: 'Alice' }), // saved message
      run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 42 })
    }));

    const res = await request(app)
      .post('/messages')
      .send({ candidateId: 1, content: 'Hi from admin' });

    expect(res.status).toBe(201);
    // The run call should have been invoked with sender = 'admin'
    const runMock = mockPrepare.mock.results[1].value.run;
    expect(runMock).toHaveBeenCalled();
    const runArgs = runMock.mock.calls[0];
    expect(runArgs[2]).toBe('admin'); // sender arg position
  });

  test('sets sender to candidate when user role is candidate', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn()
        .mockReturnValueOnce({ id: 1, name: 'Alice' })
        .mockReturnValueOnce({ id: 42, sender: 'candidate', content: 'Hi', candidate_name: 'Alice' }),
      run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 42 })
    }));

    const res = await request(app)
      .post('/messages')
      .set('x-test-role', 'candidate')
      .send({ candidateId: 1, content: 'Hi from candidate' });

    expect(res.status).toBe(201);
    const runMock = mockPrepare.mock.results[1].value.run;
    const runArgs = runMock.mock.calls[0];
    expect(runArgs[2]).toBe('candidate');
  });

  test('defaults channel to app', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn()
        .mockReturnValueOnce({ id: 1, name: 'Alice' })
        .mockReturnValueOnce({ id: 42, content: 'Hi', channel: 'app', candidate_name: 'Alice' }),
      run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 42 })
    }));

    const res = await request(app)
      .post('/messages')
      .send({ candidateId: 1, content: 'Hi' });

    expect(res.status).toBe(201);
    const runMock = mockPrepare.mock.results[1].value.run;
    const runArgs = runMock.mock.calls[0];
    expect(runArgs[3]).toBe('app'); // channel arg position
  });

  test('returns 404 when candidate does not exist', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValue(null), // candidate not found
      run: jest.fn()
    }));

    const res = await request(app)
      .post('/messages')
      .send({ candidateId: 999, content: 'Hello' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Candidate not found/);
  });

  test('returns 500 when insert fails (no lastInsertRowid)', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValueOnce({ id: 1, name: 'Alice' }),
      run: jest.fn().mockReturnValue({ changes: 0, lastInsertRowid: null })
    }));

    const res = await request(app)
      .post('/messages')
      .send({ candidateId: 1, content: 'Test' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Failed to save message/);
  });

  test('returns 500 on database error', async () => {
    mockPrepare.mockImplementation(() => {
      throw new Error('Disk full');
    });

    const res = await request(app)
      .post('/messages')
      .send({ candidateId: 1, content: 'Test' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Failed to send message/);
  });
});

// ============================================
// MESSAGE VALIDATION
// ============================================

describe('message validation', () => {
  test('rejects missing candidateId', async () => {
    const res = await request(app)
      .post('/messages')
      .send({ content: 'Hello' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/candidateId and content are required/);
  });

  test('rejects missing content', async () => {
    const res = await request(app)
      .post('/messages')
      .send({ candidateId: 1 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/candidateId and content are required/);
  });

  test('rejects empty content (whitespace only)', async () => {
    const res = await request(app)
      .post('/messages')
      .send({ candidateId: 1, content: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Message content cannot be empty/);
  });

  test('rejects empty string content', async () => {
    const res = await request(app)
      .post('/messages')
      .send({ candidateId: 1, content: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/candidateId and content are required/);
  });

  test('rejects content exceeding 10000 characters', async () => {
    const longContent = 'a'.repeat(10001);

    const res = await request(app)
      .post('/messages')
      .send({ candidateId: 1, content: longContent });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Message content too long/);
  });

  test('accepts content at exactly 10000 characters', async () => {
    const maxContent = 'b'.repeat(10000);
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn()
        .mockReturnValueOnce({ id: 1, name: 'Alice' })
        .mockReturnValueOnce({ id: 42, content: maxContent, candidate_name: 'Alice' }),
      run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 42 })
    }));

    const res = await request(app)
      .post('/messages')
      .send({ candidateId: 1, content: maxContent });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('rejects both fields missing (empty body)', async () => {
    const res = await request(app)
      .post('/messages')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/candidateId and content are required/);
  });

  test('trims whitespace from content before saving', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn()
        .mockReturnValueOnce({ id: 1, name: 'Alice' })
        .mockReturnValueOnce({ id: 42, content: 'hello', candidate_name: 'Alice' }),
      run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 42 })
    }));

    const res = await request(app)
      .post('/messages')
      .send({ candidateId: 1, content: '  hello  ' });

    expect(res.status).toBe(201);
    // Verify the trimmed content was passed to the insert
    const runMock = mockPrepare.mock.results[1].value.run;
    const runArgs = runMock.mock.calls[0];
    expect(runArgs[1]).toBe('hello'); // content arg position (trimmed)
  });
});

// ============================================
// PUT /conversations/:candidateId/status
// ============================================

describe('PUT /conversations/:candidateId/status', () => {
  test('updates conversation status successfully', async () => {
    const updatedMeta = {
      candidate_id: 1,
      status: 'resolved',
      priority: 'high',
      assigned_to: 'admin1',
      last_updated: '2026-03-19T10:00:00Z'
    };

    let callCount = 0;
    mockPrepare.mockImplementation(() => {
      callCount++;
      return {
        all: jest.fn().mockReturnValue([]),
        get: jest.fn().mockImplementation(() => {
          if (callCount === 1) return { id: 1, name: 'Alice' }; // candidate check
          return updatedMeta; // updated metadata
        }),
        run: jest.fn().mockReturnValue({ changes: 1 })
      };
    });

    const res = await request(app)
      .put('/conversations/1/status')
      .send({ status: 'resolved', priority: 'high', assignedTo: 'admin1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(updatedMeta);
  });

  test('rejects invalid status value', async () => {
    const res = await request(app)
      .put('/conversations/1/status')
      .send({ status: 'banana' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Invalid status/);
  });

  test('rejects invalid priority value', async () => {
    const res = await request(app)
      .put('/conversations/1/status')
      .send({ priority: 'super-duper' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Invalid priority/);
  });

  test('returns 404 when candidate not found', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValue(null),
      run: jest.fn()
    }));

    const res = await request(app)
      .put('/conversations/999/status')
      .send({ status: 'active' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Candidate not found/);
  });

  test('rejects notes exceeding 5000 characters', async () => {
    const longNotes = 'x'.repeat(5001);

    const res = await request(app)
      .put('/conversations/1/status')
      .send({ notes: longNotes });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Notes must be a string with max 5000 characters/);
  });

  test('accepts valid statuses', async () => {
    const validStatuses = ['active', 'paused', 'resolved', 'escalated', 'archived'];

    for (const status of validStatuses) {
      let callCount = 0;
      mockPrepare.mockImplementation(() => {
        callCount++;
        return {
          all: jest.fn().mockReturnValue([]),
          get: jest.fn().mockImplementation(() => {
            if (callCount === 1) return { id: 1, name: 'Alice' };
            return { candidate_id: 1, status, priority: 'normal' };
          }),
          run: jest.fn().mockReturnValue({ changes: 1 })
        };
      });

      const res = await request(app)
        .put('/conversations/1/status')
        .send({ status });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });
});

// ============================================
// PUT /messages/:id/read
// ============================================

describe('PUT /messages/:id/read', () => {
  test('marks a message as read', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValue({ id: 1, candidate_id: 1, sender: 'candidate', read: 0 }),
      run: jest.fn().mockReturnValue({ changes: 1 })
    }));

    const res = await request(app).put('/messages/1/read');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Message marked as read/);
    expect(res.body.messageId).toBe('1');
  });

  test('returns 404 when message not found', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValue(null),
      run: jest.fn()
    }));

    const res = await request(app).put('/messages/999/read');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Message not found/);
  });

  test('returns 400 when update fails (changes=0)', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValue({ id: 1, candidate_id: 1, sender: 'candidate', read: 0 }),
      run: jest.fn().mockReturnValue({ changes: 0 })
    }));

    const res = await request(app).put('/messages/1/read');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Failed to update read status/);
  });
});

// ============================================
// DELETE /messages/:id
// ============================================

describe('DELETE /messages/:id', () => {
  test('deletes a message successfully', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValue({ id: 5, candidate_id: 1, content: 'Delete me', sender: 'admin' }),
      run: jest.fn().mockReturnValue({ changes: 1 })
    }));

    const res = await request(app).delete('/messages/5');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Message deleted successfully/);
    expect(res.body.messageId).toBe('5');
  });

  test('returns 404 when message does not exist', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValue(null),
      run: jest.fn()
    }));

    const res = await request(app).delete('/messages/999');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Message not found/);
  });

  test('returns 400 when delete fails (changes=0)', async () => {
    mockPrepare.mockImplementation(() => ({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValue({ id: 5, candidate_id: 1, content: 'Test', sender: 'admin' }),
      run: jest.fn().mockReturnValue({ changes: 0 })
    }));

    const res = await request(app).delete('/messages/5');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Failed to delete message/);
  });
});

// ============================================
// POST /messages/typing
// ============================================

describe('POST /messages/typing', () => {
  test('sends typing indicator', async () => {
    const res = await request(app)
      .post('/messages/typing')
      .send({ candidateId: 1, isTyping: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.candidateId).toBe(1);
    expect(res.body.isTyping).toBe(true);
  });

  test('requires candidateId', async () => {
    const res = await request(app)
      .post('/messages/typing')
      .send({ isTyping: true });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/candidateId is required/);
  });

  test('defaults isTyping to true', async () => {
    const res = await request(app)
      .post('/messages/typing')
      .send({ candidateId: 1 });

    expect(res.status).toBe(200);
    expect(res.body.isTyping).toBe(true);
  });
});
