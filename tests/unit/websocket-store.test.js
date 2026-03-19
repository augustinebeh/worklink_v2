/**
 * Unit Tests: WebSocket Client Store + Event Types
 *
 * Tests client store management (add/remove/query candidates and admins,
 * connection/message tracking, rate limiting) and event type constants.
 *
 * Connection Validator and Message Router tests are in websocket.test.js
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

const clientStore = require('../../websocket/utils/client-store');
const { EventTypes } = require('../../websocket/config/event-types');

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

// ============================================
// CLIENT STORE
// ============================================

describe('Client Store', () => {
  beforeEach(() => {
    clientStore.clearAll();
  });

  // ---------- Candidate clients ----------

  describe('addCandidateClient', () => {
    test('adds a candidate and can retrieve it', () => {
      const ws = createMockWs();
      clientStore.addCandidateClient('C001', ws);

      expect(clientStore.getCandidateClient('C001')).toBe(ws);
      expect(clientStore.getCandidateCount()).toBe(1);
    });

    test('replaces existing connection for same candidateId', () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();

      clientStore.addCandidateClient('C001', ws1);
      clientStore.addCandidateClient('C001', ws2);

      expect(clientStore.getCandidateClient('C001')).toBe(ws2);
      expect(clientStore.getCandidateCount()).toBe(1);
      // Old connection should be closed
      expect(ws1.close).toHaveBeenCalled();
    });

    test('does not close previous connection if already closed', () => {
      const ws1 = createMockWs({ readyState: 3 }); // CLOSED
      const ws2 = createMockWs();

      clientStore.addCandidateClient('C001', ws1);
      clientStore.addCandidateClient('C001', ws2);

      expect(ws1.close).not.toHaveBeenCalled();
      expect(clientStore.getCandidateClient('C001')).toBe(ws2);
    });

    test('ignores null candidateId', () => {
      const ws = createMockWs();
      clientStore.addCandidateClient(null, ws);

      expect(clientStore.getCandidateCount()).toBe(0);
    });

    test('ignores null ws', () => {
      clientStore.addCandidateClient('C001', null);

      expect(clientStore.getCandidateCount()).toBe(0);
    });

    test('ignores undefined parameters', () => {
      clientStore.addCandidateClient(undefined, undefined);

      expect(clientStore.getCandidateCount()).toBe(0);
    });
  });

  describe('removeCandidateClient', () => {
    test('removes an existing candidate', () => {
      const ws = createMockWs();
      clientStore.addCandidateClient('C001', ws);
      clientStore.removeCandidateClient('C001');

      expect(clientStore.getCandidateClient('C001')).toBeUndefined();
      expect(clientStore.getCandidateCount()).toBe(0);
    });

    test('handles removing non-existent candidate gracefully', () => {
      expect(() => clientStore.removeCandidateClient('C999')).not.toThrow();
    });

    test('handles null candidateId gracefully', () => {
      expect(() => clientStore.removeCandidateClient(null)).not.toThrow();
    });

    test('handles undefined candidateId gracefully', () => {
      expect(() => clientStore.removeCandidateClient(undefined)).not.toThrow();
    });
  });

  describe('getCandidateClient', () => {
    test('returns ws for existing candidate', () => {
      const ws = createMockWs();
      clientStore.addCandidateClient('C001', ws);

      expect(clientStore.getCandidateClient('C001')).toBe(ws);
    });

    test('returns undefined for non-existent candidate', () => {
      expect(clientStore.getCandidateClient('C999')).toBeUndefined();
    });
  });

  describe('isCandidateConnected', () => {
    test('returns true for connected candidate with OPEN readyState', () => {
      const ws = createMockWs({ readyState: 1 });
      clientStore.addCandidateClient('C001', ws);

      expect(clientStore.isCandidateConnected('C001')).toBe(true);
    });

    test('returns false for connected candidate with CLOSED readyState', () => {
      const ws = createMockWs({ readyState: 3 });
      clientStore.addCandidateClient('C001', ws);

      expect(clientStore.isCandidateConnected('C001')).toBe(false);
    });

    test('returns falsy for non-existent candidate', () => {
      expect(clientStore.isCandidateConnected('C999')).toBeFalsy();
    });
  });

  describe('getConnectedCandidateIds', () => {
    test('returns all connected candidate IDs', () => {
      clientStore.addCandidateClient('C001', createMockWs());
      clientStore.addCandidateClient('C002', createMockWs());
      clientStore.addCandidateClient('C003', createMockWs());

      const ids = clientStore.getConnectedCandidateIds();
      expect(ids).toEqual(expect.arrayContaining(['C001', 'C002', 'C003']));
      expect(ids).toHaveLength(3);
    });

    test('returns empty array when no candidates connected', () => {
      expect(clientStore.getConnectedCandidateIds()).toEqual([]);
    });
  });

  // ---------- Admin clients ----------

  describe('addAdminClient', () => {
    test('adds admin client and increments count', () => {
      const ws = createMockWs();
      clientStore.addAdminClient(ws);

      expect(clientStore.getAdminCount()).toBe(1);
    });

    test('supports multiple admin clients', () => {
      clientStore.addAdminClient(createMockWs());
      clientStore.addAdminClient(createMockWs());
      clientStore.addAdminClient(createMockWs());

      expect(clientStore.getAdminCount()).toBe(3);
    });

    test('ignores null ws', () => {
      clientStore.addAdminClient(null);

      expect(clientStore.getAdminCount()).toBe(0);
    });
  });

  describe('removeAdminClient', () => {
    test('removes an admin client', () => {
      const ws = createMockWs();
      clientStore.addAdminClient(ws);
      clientStore.removeAdminClient(ws);

      expect(clientStore.getAdminCount()).toBe(0);
    });

    test('only removes the specified admin', () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();
      clientStore.addAdminClient(ws1);
      clientStore.addAdminClient(ws2);

      clientStore.removeAdminClient(ws1);

      expect(clientStore.getAdminCount()).toBe(1);
      expect(clientStore.getAdminClients().has(ws2)).toBe(true);
    });

    test('handles removing non-existent admin gracefully', () => {
      const ws = createMockWs();
      expect(() => clientStore.removeAdminClient(ws)).not.toThrow();
    });

    test('handles null ws gracefully', () => {
      expect(() => clientStore.removeAdminClient(null)).not.toThrow();
    });
  });

  describe('getAdminClients', () => {
    test('returns a Set of admin clients', () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();
      clientStore.addAdminClient(ws1);
      clientStore.addAdminClient(ws2);

      const admins = clientStore.getAdminClients();
      expect(admins).toBeInstanceOf(Set);
      expect(admins.size).toBe(2);
      expect(admins.has(ws1)).toBe(true);
      expect(admins.has(ws2)).toBe(true);
    });
  });

  describe('getAdminCount', () => {
    test('returns 0 when no admins connected', () => {
      expect(clientStore.getAdminCount()).toBe(0);
    });

    test('returns correct count after add/remove', () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();
      clientStore.addAdminClient(ws1);
      clientStore.addAdminClient(ws2);
      expect(clientStore.getAdminCount()).toBe(2);

      clientStore.removeAdminClient(ws1);
      expect(clientStore.getAdminCount()).toBe(1);
    });
  });

  // ---------- Statistics ----------

  describe('getStats', () => {
    test('returns correct stats with no clients', () => {
      const stats = clientStore.getStats();
      expect(stats).toEqual({
        candidates: 0,
        admins: 0,
        total: 0,
        candidateIds: []
      });
    });

    test('returns correct stats with mixed clients', () => {
      clientStore.addCandidateClient('C001', createMockWs());
      clientStore.addCandidateClient('C002', createMockWs());
      clientStore.addAdminClient(createMockWs());

      const stats = clientStore.getStats();
      expect(stats.candidates).toBe(2);
      expect(stats.admins).toBe(1);
      expect(stats.total).toBe(3);
      expect(stats.candidateIds).toEqual(expect.arrayContaining(['C001', 'C002']));
    });
  });

  // ---------- Rate limiting: connection tracking ----------

  describe('connection tracking', () => {
    test('tracks connections for an IP', () => {
      const now = Date.now();
      clientStore.trackConnection('192.168.1.1', now);
      clientStore.trackConnection('192.168.1.1', now + 100);

      const count = clientStore.getConnectionCount('192.168.1.1', 60000);
      expect(count).toBe(2);
    });

    test('returns 0 for unknown IP', () => {
      const count = clientStore.getConnectionCount('10.0.0.1', 60000);
      expect(count).toBe(0);
    });

    test('filters out connections outside the time window', () => {
      const now = Date.now();
      // Connection from 2 minutes ago
      clientStore.trackConnection('192.168.1.1', now - 120000);
      // Connection from just now
      clientStore.trackConnection('192.168.1.1', now);

      // 60 second window should only include the recent one
      const count = clientStore.getConnectionCount('192.168.1.1', 60000);
      expect(count).toBe(1);
    });
  });

  // ---------- Rate limiting: message tracking ----------

  describe('message tracking', () => {
    test('tracks messages for a connection', () => {
      const now = Date.now();
      clientStore.trackMessage('conn-1', now);
      clientStore.trackMessage('conn-1', now + 50);
      clientStore.trackMessage('conn-1', now + 100);

      const count = clientStore.getMessageCount('conn-1', 60000);
      expect(count).toBe(3);
    });

    test('returns 0 for unknown connection', () => {
      const count = clientStore.getMessageCount('conn-unknown', 60000);
      expect(count).toBe(0);
    });

    test('filters out messages outside the time window', () => {
      const now = Date.now();
      clientStore.trackMessage('conn-1', now - 120000);
      clientStore.trackMessage('conn-1', now);

      const count = clientStore.getMessageCount('conn-1', 60000);
      expect(count).toBe(1);
    });

    test('clearTracking removes message data for a connection', () => {
      clientStore.trackMessage('conn-1', Date.now());
      clientStore.trackMessage('conn-1', Date.now());
      clientStore.clearTracking('conn-1');

      const count = clientStore.getMessageCount('conn-1', 60000);
      expect(count).toBe(0);
    });
  });

  // ---------- clearAll ----------

  describe('clearAll', () => {
    test('clears all clients and tracking data', () => {
      clientStore.addCandidateClient('C001', createMockWs());
      clientStore.addAdminClient(createMockWs());
      clientStore.trackConnection('192.168.1.1', Date.now());
      clientStore.trackMessage('conn-1', Date.now());

      clientStore.clearAll();

      expect(clientStore.getCandidateCount()).toBe(0);
      expect(clientStore.getAdminCount()).toBe(0);
      expect(clientStore.getConnectionCount('192.168.1.1', 60000)).toBe(0);
      expect(clientStore.getMessageCount('conn-1', 60000)).toBe(0);
    });
  });
});

// ============================================
// EVENT TYPES
// ============================================

describe('Event Types', () => {
  test('EventTypes is defined', () => {
    expect(EventTypes).toBeDefined();
    expect(typeof EventTypes).toBe('object');
  });

  // ---------- Chat events ----------

  describe('chat events', () => {
    test('CHAT_MESSAGE is defined', () => {
      expect(EventTypes.CHAT_MESSAGE).toBe('chat_message');
    });

    test('CHAT_TYPING is defined', () => {
      expect(EventTypes.CHAT_TYPING).toBe('typing');
    });

    test('CHAT_READ is defined', () => {
      expect(EventTypes.CHAT_READ).toBe('messages_read');
    });
  });

  // ---------- Status events ----------

  describe('status events', () => {
    test('STATUS_CHANGE is defined', () => {
      expect(EventTypes.STATUS_CHANGE).toBe('status_change');
    });
  });

  // ---------- Job events ----------

  describe('job events', () => {
    test('JOB_CREATED is defined', () => {
      expect(EventTypes.JOB_CREATED).toBe('job_created');
    });

    test('JOB_UPDATED is defined', () => {
      expect(EventTypes.JOB_UPDATED).toBe('job_updated');
    });

    test('JOB_DELETED is defined', () => {
      expect(EventTypes.JOB_DELETED).toBe('job_deleted');
    });
  });

  // ---------- Deployment events ----------

  describe('deployment events', () => {
    test('DEPLOYMENT_CREATED is defined', () => {
      expect(EventTypes.DEPLOYMENT_CREATED).toBe('deployment_created');
    });

    test('DEPLOYMENT_UPDATED is defined', () => {
      expect(EventTypes.DEPLOYMENT_UPDATED).toBe('deployment_updated');
    });

    test('DEPLOYMENT_STATUS_CHANGED is defined', () => {
      expect(EventTypes.DEPLOYMENT_STATUS_CHANGED).toBe('deployment_status_changed');
    });
  });

  // ---------- Payment events ----------

  describe('payment events', () => {
    test('PAYMENT_CREATED is defined', () => {
      expect(EventTypes.PAYMENT_CREATED).toBe('payment_created');
    });

    test('PAYMENT_STATUS_CHANGED is defined', () => {
      expect(EventTypes.PAYMENT_STATUS_CHANGED).toBe('payment_status_changed');
    });
  });

  // ---------- Notification events ----------

  describe('notification events', () => {
    test('NOTIFICATION is defined', () => {
      expect(EventTypes.NOTIFICATION).toBe('notification');
    });
  });

  // ---------- Gamification events ----------

  describe('gamification events', () => {
    test('XP_EARNED is defined', () => {
      expect(EventTypes.XP_EARNED).toBe('xp_earned');
    });

    test('LEVEL_UP is defined', () => {
      expect(EventTypes.LEVEL_UP).toBe('level_up');
    });

    test('ACHIEVEMENT_UNLOCKED is defined', () => {
      expect(EventTypes.ACHIEVEMENT_UNLOCKED).toBe('achievement_unlocked');
    });

    test('QUEST_COMPLETED is defined', () => {
      expect(EventTypes.QUEST_COMPLETED).toBe('quest_completed');
    });
  });

  // ---------- FOMO events ----------

  describe('FOMO events', () => {
    test('FOMO_TRIGGER is defined', () => {
      expect(EventTypes.FOMO_TRIGGER).toBe('fomo_trigger');
    });

    test('FOMO_URGENCY is defined', () => {
      expect(EventTypes.FOMO_URGENCY).toBe('fomo_urgency');
    });

    test('FOMO_SOCIAL_PROOF is defined', () => {
      expect(EventTypes.FOMO_SOCIAL_PROOF).toBe('fomo_social_proof');
    });

    test('FOMO_SCARCITY is defined', () => {
      expect(EventTypes.FOMO_SCARCITY).toBe('fomo_scarcity');
    });

    test('FOMO_STREAK_RISK is defined', () => {
      expect(EventTypes.FOMO_STREAK_RISK).toBe('fomo_streak_risk');
    });

    test('FOMO_PEER_ACTIVITY is defined', () => {
      expect(EventTypes.FOMO_PEER_ACTIVITY).toBe('fomo_peer_activity');
    });

    test('FOMO_COMPETITIVE_PRESSURE is defined', () => {
      expect(EventTypes.FOMO_COMPETITIVE_PRESSURE).toBe('fomo_competitive_pressure');
    });
  });

  // ---------- Candidate events ----------

  describe('candidate events', () => {
    test('CANDIDATE_UPDATED is defined', () => {
      expect(EventTypes.CANDIDATE_UPDATED).toBe('candidate_updated');
    });
  });

  // ---------- Completeness check ----------

  describe('completeness', () => {
    test('has at least the core event types', () => {
      const keys = Object.keys(EventTypes);
      expect(keys.length).toBeGreaterThanOrEqual(22);
      // Verify all documented keys are present
      const expectedKeys = [
        'CHAT_MESSAGE', 'CHAT_TYPING', 'CHAT_READ',
        'STATUS_CHANGE',
        'JOB_CREATED', 'JOB_UPDATED', 'JOB_DELETED',
        'DEPLOYMENT_CREATED', 'DEPLOYMENT_UPDATED', 'DEPLOYMENT_STATUS_CHANGED',
        'PAYMENT_CREATED', 'PAYMENT_STATUS_CHANGED',
        'NOTIFICATION',
        'XP_EARNED', 'LEVEL_UP', 'ACHIEVEMENT_UNLOCKED', 'QUEST_COMPLETED',
        'FOMO_TRIGGER', 'FOMO_URGENCY', 'FOMO_SOCIAL_PROOF', 'FOMO_SCARCITY',
        'FOMO_STREAK_RISK', 'FOMO_PEER_ACTIVITY', 'FOMO_COMPETITIVE_PRESSURE',
        'CANDIDATE_UPDATED'
      ];
      expectedKeys.forEach(key => {
        expect(keys).toContain(key);
      });
    });

    test('all values are non-empty strings', () => {
      Object.entries(EventTypes).forEach(([key, value]) => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    test('all values are unique', () => {
      const values = Object.values(EventTypes);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
});
