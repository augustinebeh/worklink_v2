/**
 * Unit Tests: WebSocket System (Connection Validator + Message Router)
 *
 * Tests connection validation and message routing.
 *
 * Client Store and Event Types tests are in websocket-store.test.js
 */

// Set JWT_SECRET before any module requires auth
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';

// ============================================
// MOCKS
// ============================================

// Mock the database module - must be before any require that touches db
jest.mock('../../db', () => ({
  db: {
    prepare: jest.fn(() => ({
      get: jest.fn(),
      all: jest.fn(() => []),
      run: jest.fn()
    }))
  }
}));

// Mock the structured logger to silence output during tests
jest.mock('../../utils/structured-logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    security: jest.fn()
  })
}));

// Mock the plain logger used by middleware/auth
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const { db } = require('../../db');
const { validateConnection } = require('../../websocket/connection/validator');
const { routeMessage } = require('../../websocket/messaging/message-router');
const { generateToken, generateAdminToken } = require('../../middleware/auth');

// ============================================
// HELPERS
// ============================================

/**
 * Create a mock WebSocket object
 */
function createMockWs(overrides = {}) {
  return {
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1, // OPEN
    ...overrides
  };
}

/**
 * Generate a valid admin JWT token
 */
function makeAdminToken() {
  return generateAdminToken({ id: 'ADM_001', email: 'admin@worklink.sg', name: 'Admin' });
}

/**
 * Generate a valid candidate JWT token
 */
function makeCandidateToken(id = 'C001') {
  return generateToken({ id, email: `${id}@test.com`, name: 'Test Candidate', role: 'candidate' });
}

// ============================================
// CONNECTION VALIDATOR
// ============================================

describe('Connection Validator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------- Missing token ----------

  describe('missing or empty token', () => {
    test('rejects null token', () => {
      const result = validateConnection(null, null, true);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing authentication token');
    });

    test('rejects undefined token', () => {
      const result = validateConnection(undefined, null, false);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing authentication token');
    });

    test('rejects empty string token', () => {
      const result = validateConnection('', 'C001', false);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing authentication token');
    });
  });

  // ---------- Invalid token ----------

  describe('invalid tokens', () => {
    test('rejects a garbage string', () => {
      const result = validateConnection('not-a-real-token', null, true);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid authentication token. Please log in again.');
    });

    test('rejects legacy demo token', () => {
      const result = validateConnection('demo-admin-token', null, true);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid authentication token. Please log in again.');
    });

    test('rejects a malformed JWT', () => {
      const result = validateConnection('eyJ.bad.token', null, false);
      expect(result.valid).toBe(false);
    });
  });

  // ---------- Admin connections ----------

  describe('admin connections', () => {
    test('accepts a valid admin token when isAdmin=true', () => {
      const token = makeAdminToken();
      const result = validateConnection(token, null, true);
      expect(result.valid).toBe(true);
      expect(result.role).toBe('admin');
    });

    test('rejects an admin token when isAdmin=false', () => {
      const token = makeAdminToken();
      const result = validateConnection(token, null, false);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid role for connection type');
    });
  });

  // ---------- Candidate connections ----------

  describe('candidate connections', () => {
    test('accepts a valid candidate token with matching candidateId', () => {
      const token = makeCandidateToken('C001');

      db.prepare.mockReturnValue({
        get: jest.fn(() => ({ id: 'C001' }))
      });

      const result = validateConnection(token, 'C001', false);
      expect(result.valid).toBe(true);
      expect(result.role).toBe('candidate');
      expect(result.candidateId).toBe('C001');
    });

    test('accepts a valid candidate token when candidateId param is null', () => {
      const token = makeCandidateToken('C001');

      db.prepare.mockReturnValue({
        get: jest.fn(() => ({ id: 'C001' }))
      });

      const result = validateConnection(token, null, false);
      expect(result.valid).toBe(true);
      expect(result.candidateId).toBe('C001');
    });

    test('rejects when token candidateId does not match param', () => {
      const token = makeCandidateToken('C001');

      const result = validateConnection(token, 'C999', false);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token candidateId mismatch');
    });

    test('rejects when candidate is not found in database', () => {
      const token = makeCandidateToken('C001');

      db.prepare.mockReturnValue({
        get: jest.fn(() => null)
      });

      const result = validateConnection(token, 'C001', false);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Candidate not found');
    });

    test('returns database error when db throws', () => {
      const token = makeCandidateToken('C001');

      db.prepare.mockReturnValue({
        get: jest.fn(() => { throw new Error('SQLITE_ERROR'); })
      });

      const result = validateConnection(token, 'C001', false);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Database error');
    });

    test('rejects candidate token when isAdmin=true', () => {
      const token = makeCandidateToken('C001');
      const result = validateConnection(token, null, true);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid role for connection type');
    });
  });
});

// ============================================
// MESSAGE ROUTER
// ============================================

describe('Message Router', () => {
  let mockWs;

  beforeEach(() => {
    mockWs = createMockWs();
    jest.clearAllMocks();
  });

  // ---------- Invalid messages ----------

  describe('invalid messages', () => {
    test('returns false for null message', () => {
      const result = routeMessage(mockWs, null, 'C001', false, {});
      expect(result).toBe(false);
    });

    test('returns false for undefined message', () => {
      const result = routeMessage(mockWs, undefined, 'C001', false, {});
      expect(result).toBe(false);
    });

    test('returns false for message without type', () => {
      const result = routeMessage(mockWs, { content: 'hello' }, 'C001', false, {});
      expect(result).toBe(false);
    });

    test('returns false for unknown message type', () => {
      const result = routeMessage(mockWs, { type: 'nonexistent_type' }, 'C001', false, {});
      expect(result).toBe(false);
    });

    test('returns false for empty object', () => {
      const result = routeMessage(mockWs, {}, 'C001', false, {});
      expect(result).toBe(false);
    });
  });

  // ---------- Ping / Pong ----------

  describe('ping message', () => {
    test('responds with pong', () => {
      const result = routeMessage(mockWs, { type: 'ping' }, null, false, {});
      expect(result).toBe(true);

      expect(mockWs.send).toHaveBeenCalledTimes(1);
      const sent = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sent.type).toBe('pong');
      expect(sent.timestamp).toBeDefined();
    });

    test('returns false when ws.send throws', () => {
      mockWs.send.mockImplementation(() => { throw new Error('Connection lost'); });
      const result = routeMessage(mockWs, { type: 'ping' }, null, false, {});
      expect(result).toBe(false);
    });
  });

  // ---------- Chat messages (candidate) ----------

  describe('candidate chat messages', () => {
    test('routes valid candidate message to handler', () => {
      const handler = jest.fn();
      const handlers = { sendMessageFromCandidate: handler };

      const result = routeMessage(
        mockWs,
        { type: 'message', content: 'Hello!' },
        'C001',
        false,
        handlers
      );

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('C001', 'Hello!');
    });

    test('rejects candidate message without content', () => {
      const handler = jest.fn();
      const handlers = { sendMessageFromCandidate: handler };

      const result = routeMessage(
        mockWs,
        { type: 'message' },
        'C001',
        false,
        handlers
      );

      expect(result).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });

    test('rejects candidate message without candidateId', () => {
      const handler = jest.fn();
      const handlers = { sendMessageFromCandidate: handler };

      const result = routeMessage(
        mockWs,
        { type: 'message', content: 'Hello!' },
        null,
        false,
        handlers
      );

      expect(result).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });

    test('returns false if handler is not provided', () => {
      const result = routeMessage(
        mockWs,
        { type: 'message', content: 'Hello!' },
        'C001',
        false,
        {}
      );

      expect(result).toBe(false);
    });
  });

  // ---------- Chat messages (admin) ----------

  describe('admin chat messages', () => {
    test('routes valid admin message to handler', () => {
      const handler = jest.fn();
      const handlers = { handleAdminMessage: handler };

      const result = routeMessage(
        mockWs,
        { type: 'message', candidateId: 'C001', content: 'Hi candidate' },
        null,
        true,
        handlers
      );

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('C001', 'Hi candidate', undefined);
    });

    test('passes template_id to admin message handler', () => {
      const handler = jest.fn();
      const handlers = { handleAdminMessage: handler };

      const result = routeMessage(
        mockWs,
        { type: 'message', candidateId: 'C001', content: 'Template msg', template_id: 'TPL_01' },
        null,
        true,
        handlers
      );

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('C001', 'Template msg', 'TPL_01');
    });

    test('rejects admin message without candidateId', () => {
      const handler = jest.fn();
      const handlers = { handleAdminMessage: handler };

      const result = routeMessage(
        mockWs,
        { type: 'message', content: 'Hello' },
        null,
        true,
        handlers
      );

      expect(result).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });

    test('rejects admin message without content', () => {
      const handler = jest.fn();
      const handlers = { handleAdminMessage: handler };

      const result = routeMessage(
        mockWs,
        { type: 'message', candidateId: 'C001' },
        null,
        true,
        handlers
      );

      expect(result).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ---------- Typing indicators ----------

  describe('typing messages', () => {
    test('routes typing indicator to handler', () => {
      const handler = jest.fn();
      const handlers = { handleTypingIndicator: handler };
      const message = { type: 'typing', isTyping: true };

      const result = routeMessage(mockWs, message, 'C001', false, handlers);

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith(message, 'C001', false);
    });

    test('returns false when typing handler is missing', () => {
      const result = routeMessage(mockWs, { type: 'typing' }, 'C001', false, {});
      expect(result).toBe(false);
    });
  });

  // ---------- Read receipts ----------

  describe('read messages', () => {
    test('routes read receipt to handler', () => {
      const handler = jest.fn();
      const handlers = { handleReadReceiptHandler: handler };
      const message = { type: 'read', messageIds: ['m1', 'm2'] };

      const result = routeMessage(mockWs, message, 'C001', false, handlers);

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith(message, 'C001', false);
    });
  });

  // ---------- Status updates ----------

  describe('status messages', () => {
    test('routes status update to handler', () => {
      const handler = jest.fn();
      const handlers = { updateCandidateStatus: handler };

      const result = routeMessage(
        mockWs,
        { type: 'status', status: 'online' },
        'C001',
        false,
        handlers
      );

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('C001', 'online');
    });

    test('rejects status update without candidateId', () => {
      const handler = jest.fn();
      const handlers = { updateCandidateStatus: handler };

      const result = routeMessage(
        mockWs,
        { type: 'status', status: 'online' },
        null,
        false,
        handlers
      );

      expect(result).toBe(false);
    });

    test('rejects status update without status field', () => {
      const handler = jest.fn();
      const handlers = { updateCandidateStatus: handler };

      const result = routeMessage(
        mockWs,
        { type: 'status' },
        'C001',
        false,
        handlers
      );

      expect(result).toBe(false);
    });
  });

  // ---------- Get status (admin) ----------

  describe('get_status messages', () => {
    test('routes get_status to handler for admin', () => {
      const handler = jest.fn();
      const handlers = { sendCandidateStatus: handler };

      const result = routeMessage(
        mockWs,
        { type: 'get_status', candidateId: 'C001' },
        null,
        true,
        handlers
      );

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith(mockWs, 'C001');
    });

    test('rejects get_status from non-admin', () => {
      const handler = jest.fn();
      const handlers = { sendCandidateStatus: handler };

      const result = routeMessage(
        mockWs,
        { type: 'get_status', candidateId: 'C001' },
        'C001',
        false,
        handlers
      );

      expect(result).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ---------- Notifications ----------

  describe('notification messages', () => {
    test('routes mark_notification_read to handler', () => {
      const handler = jest.fn();
      const handlers = { markNotificationRead: handler };

      const result = routeMessage(
        mockWs,
        { type: 'mark_notification_read', notificationId: 'N001' },
        'C001',
        false,
        handlers
      );

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('C001', 'N001');
    });

    test('rejects mark_notification_read without notificationId', () => {
      const handler = jest.fn();
      const handlers = { markNotificationRead: handler };

      const result = routeMessage(
        mockWs,
        { type: 'mark_notification_read' },
        'C001',
        false,
        handlers
      );

      expect(result).toBe(false);
    });

    test('routes mark_all_notifications_read to handler', () => {
      const handler = jest.fn();
      const handlers = { markAllNotificationsRead: handler };

      const result = routeMessage(
        mockWs,
        { type: 'mark_all_notifications_read' },
        'C001',
        false,
        handlers
      );

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('C001');
    });

    test('rejects mark_all_notifications_read without candidateId', () => {
      const handler = jest.fn();
      const handlers = { markAllNotificationsRead: handler };

      const result = routeMessage(
        mockWs,
        { type: 'mark_all_notifications_read' },
        null,
        false,
        handlers
      );

      expect(result).toBe(false);
    });
  });

  // ---------- Job applications ----------

  describe('apply_job messages', () => {
    test('routes job application to handler', () => {
      const handler = jest.fn();
      const handlers = { handleJobApplicationHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'apply_job', jobId: 'J001' },
        'C001',
        false,
        handlers
      );

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('C001', 'J001');
    });

    test('rejects job application without jobId', () => {
      const handler = jest.fn();
      const handlers = { handleJobApplicationHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'apply_job' },
        'C001',
        false,
        handlers
      );

      expect(result).toBe(false);
    });

    test('rejects job application without candidateId', () => {
      const handler = jest.fn();
      const handlers = { handleJobApplicationHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'apply_job', jobId: 'J001' },
        null,
        false,
        handlers
      );

      expect(result).toBe(false);
    });
  });

  // ---------- AI Suggestion messages (admin only) ----------

  describe('AI suggestion messages', () => {
    test('routes ai_suggestion_accept for admin', () => {
      const handler = jest.fn();
      const handlers = { handleAISuggestionAcceptHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'ai_suggestion_accept', suggestionId: 'S001', candidateId: 'C001' },
        null,
        true,
        handlers
      );

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('S001', 'C001', mockWs);
    });

    test('rejects ai_suggestion_accept for non-admin', () => {
      const handler = jest.fn();
      const handlers = { handleAISuggestionAcceptHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'ai_suggestion_accept', suggestionId: 'S001', candidateId: 'C001' },
        'C001',
        false,
        handlers
      );

      expect(result).toBe(false);
    });

    test('routes ai_suggestion_edit for admin with content', () => {
      const handler = jest.fn();
      const handlers = { handleAISuggestionEditHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'ai_suggestion_edit', suggestionId: 'S001', candidateId: 'C001', content: 'Edited reply' },
        null,
        true,
        handlers
      );

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('S001', 'C001', 'Edited reply', mockWs);
    });

    test('rejects ai_suggestion_edit without content', () => {
      const handler = jest.fn();
      const handlers = { handleAISuggestionEditHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'ai_suggestion_edit', suggestionId: 'S001', candidateId: 'C001' },
        null,
        true,
        handlers
      );

      expect(result).toBe(false);
    });

    test('routes ai_suggestion_dismiss for admin', () => {
      const handler = jest.fn();
      const handlers = { handleAISuggestionDismissHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'ai_suggestion_dismiss', suggestionId: 'S001' },
        null,
        true,
        handlers
      );

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('S001', mockWs);
    });

    test('routes ai_mode_update for admin', () => {
      const handler = jest.fn();
      const handlers = { handleAIModeUpdateHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'ai_mode_update', candidateId: 'C001', mode: 'auto' },
        null,
        true,
        handlers
      );

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('C001', 'auto', mockWs);
    });

    test('rejects ai_mode_update without mode', () => {
      const handler = jest.fn();
      const handlers = { handleAIModeUpdateHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'ai_mode_update', candidateId: 'C001' },
        null,
        true,
        handlers
      );

      expect(result).toBe(false);
    });
  });

  // ---------- Conversation management (admin only) ----------

  describe('conversation management messages', () => {
    test('routes conversation_status_update for admin', () => {
      const handler = jest.fn();
      const handlers = { handleConversationStatusUpdateHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'conversation_status_update', candidateId: 'C001', status: 'active' },
        null,
        true,
        handlers
      );

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('C001', 'active');
    });

    test('rejects conversation_status_update from non-admin', () => {
      const handler = jest.fn();
      const handlers = { handleConversationStatusUpdateHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'conversation_status_update', candidateId: 'C001', status: 'active' },
        'C001',
        false,
        handlers
      );

      expect(result).toBe(false);
    });

    test('routes conversation_priority_update for admin', () => {
      const handler = jest.fn();
      const handlers = { handleConversationPriorityUpdateHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'conversation_priority_update', candidateId: 'C001', priority: 'high' },
        null,
        true,
        handlers
      );

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('C001', 'high');
    });

    test('routes resolve_conversation for admin', () => {
      const handler = jest.fn();
      const handlers = { handleResolveConversationHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'resolve_conversation', candidateId: 'C001' },
        null,
        true,
        handlers
      );

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('C001');
    });

    test('routes get_quick_replies for admin', () => {
      const handler = jest.fn();
      const handlers = { handleGetQuickRepliesHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'get_quick_replies', candidateId: 'C001' },
        null,
        true,
        handlers
      );

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('C001', mockWs);
    });
  });

  // ---------- FOMO triggers ----------

  describe('FOMO trigger messages', () => {
    test('routes get_fomo_triggers to handler', () => {
      const handler = jest.fn();
      const handlers = { handleGetFOMOTriggersHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'get_fomo_triggers', candidateId: 'C001' },
        'C001',
        false,
        handlers
      );

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('C001', mockWs);
    });

    test('rejects get_fomo_triggers without candidateId in message', () => {
      const handler = jest.fn();
      const handlers = { handleGetFOMOTriggersHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'get_fomo_triggers' },
        'C001',
        false,
        handlers
      );

      expect(result).toBe(false);
    });
  });

  // ---------- Interview scheduling ----------

  describe('interview scheduling messages', () => {
    test('routes interview_scheduling to handler', () => {
      const handler = jest.fn();
      const handlers = { handleInterviewSchedulingHandler: handler };
      const message = { type: 'interview_scheduling', content: { date: '2026-04-01' } };

      const result = routeMessage(mockWs, message, 'C001', false, handlers);

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith(mockWs, message, 'C001');
    });

    test('rejects interview_scheduling without candidateId', () => {
      const handler = jest.fn();
      const handlers = { handleInterviewSchedulingHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'interview_scheduling', content: { date: '2026-04-01' } },
        null,
        false,
        handlers
      );

      expect(result).toBe(false);
    });

    test('rejects interview_scheduling without content', () => {
      const handler = jest.fn();
      const handlers = { handleInterviewSchedulingHandler: handler };

      const result = routeMessage(
        mockWs,
        { type: 'interview_scheduling' },
        'C001',
        false,
        handlers
      );

      expect(result).toBe(false);
    });
  });

  // ---------- Handler errors ----------

  describe('handler errors', () => {
    test('catches and returns false when handler throws', () => {
      const handlers = {
        sendMessageFromCandidate: jest.fn(() => { throw new Error('Handler crash'); })
      };

      const result = routeMessage(
        mockWs,
        { type: 'message', content: 'Hello!' },
        'C001',
        false,
        handlers
      );

      expect(result).toBe(false);
    });
  });

  // ---------- Default handlers parameter ----------

  describe('default handlers parameter', () => {
    test('works with no handlers argument', () => {
      const result = routeMessage(mockWs, { type: 'message', content: 'Hi' }, 'C001', false);
      expect(result).toBe(false);
    });
  });
});
