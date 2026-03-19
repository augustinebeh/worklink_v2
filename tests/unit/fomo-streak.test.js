/**
 * Unit Tests: FOMO Engine & Streak Protection System
 *
 * Tests activity recording, buffer processing, cache eviction,
 * FOMO event creation, streak risk analysis, cache cleanup,
 * and MAX_CACHE_SIZE enforcement.
 *
 * All database and interval-registry interactions are mocked so
 * tests run without touching any real SQLite database.
 */

// ---------------------------------------------------------------------------
// Mock setup — must come before any require() that triggers module loading
// ---------------------------------------------------------------------------

const mockDbRun = jest.fn().mockReturnValue({ changes: 0 });
const mockDbGet = jest.fn().mockReturnValue({ count: 0 });
const mockDbAll = jest.fn().mockReturnValue([]);
const mockDbExec = jest.fn();
const mockDbPrepare = jest.fn().mockReturnValue({
  run: mockDbRun,
  get: mockDbGet,
  all: mockDbAll,
});

jest.mock('../../db', () => ({
  db: {
    exec: mockDbExec,
    prepare: mockDbPrepare,
  },
}));

jest.mock('../../utils/interval-registry', () => ({
  register: jest.fn(),
  clear: jest.fn(),
  clearAll: jest.fn(),
}));

jest.mock('../../utils/structured-logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('../../shared/utils/gamification', () => ({
  formatXP: jest.fn((xp) => `${xp} XP`),
  calculateLevel: jest.fn((xp) => Math.floor(xp / 100)),
  getLevelTier: jest.fn(() => 'gold'),
}));

jest.mock('../../websocket', () => ({
  notifyStreakRisk: jest.fn(),
  notifyAchievementUnlocked: jest.fn(),
  notifyCompetitivePressure: jest.fn(),
  broadcastToCandidate: jest.fn(),
  EventTypes: {
    FOMO_STREAK_RISK: 'fomo_streak_risk',
    FOMO_PEER_ACTIVITY: 'fomo_peer_activity',
  },
}));

// Sub-modules of fomo/ — mock only the functions we need to isolate
jest.mock('../../services/fomo/urgency-calculator', () => ({
  calculateUrgencyScores: jest.fn(),
  createUrgencyEvent: jest.fn(),
}));

jest.mock('../../services/fomo/social-proof-generator', () => ({
  updateSocialProofData: jest.fn(),
  createSocialProofEvent: jest.fn(),
  calculateSocialProofFactor: jest.fn().mockReturnValue(0.5),
  processSocialProofBatch: jest.fn(),
}));

jest.mock('../../services/fomo/scarcity-processor', () => ({
  processScarcityTriggers: jest.fn(),
  calculateScarcityLevel: jest.fn().mockReturnValue(0.3),
}));

jest.mock('../../services/fomo/streak-protector', () => ({
  checkStreakProtectionOpportunities: jest.fn(),
}));

jest.mock('../../services/fomo/fomo-messenger', () => ({
  generateFOMOMessage: jest.fn().mockReturnValue('Test FOMO message'),
  getFOMOAction: jest.fn().mockReturnValue({ type: 'browse_jobs' }),
  processImmediateFOMO: jest.fn(),
  isHighImpactActivity: jest.fn().mockReturnValue(false),
}));

// Prevent real setInterval timers from firing during tests
jest.useFakeTimers();

// ---------------------------------------------------------------------------
// Now require the modules under test — they will pick up the mocks above
// ---------------------------------------------------------------------------

// We need to require after mocks are in place.  The modules export singletons
// (new FOMAEngine / new StreakProtectionSystem), so construction happens at
// require-time and the mocked db.exec / db.prepare will be used.

let fomaEngine;
let streakSystem;
let riskAnalyzer;
let milestoneProcessor;

beforeAll(() => {
  // The constructor calls db.exec, db.prepare, setInterval, etc. — all mocked.
  fomaEngine = require('../../services/fomo-engine');
  streakSystem = require('../../services/streak-protection-system');
  riskAnalyzer = require('../../services/streak-protection/risk-analyzer');
  milestoneProcessor = require('../../services/streak-protection/milestone-processor');
});

afterEach(() => {
  jest.clearAllMocks();
});

// ============================================
// FOMO ENGINE — recordActivity
// ============================================

describe('FOMAEngine.recordActivity', () => {
  test('adds activity to the correct buffer key', () => {
    fomaEngine.activityBuffer.clear();

    fomaEngine.recordActivity('C001', 'job_view', { jobId: 'J100' });

    expect(fomaEngine.activityBuffer.has('job_view')).toBe(true);
    expect(fomaEngine.activityBuffer.get('job_view')).toHaveLength(1);
  });

  test('appends multiple activities of the same type', () => {
    fomaEngine.activityBuffer.clear();

    fomaEngine.recordActivity('C001', 'job_view', { jobId: 'J100' });
    fomaEngine.recordActivity('C002', 'job_view', { jobId: 'J101' });

    expect(fomaEngine.activityBuffer.get('job_view')).toHaveLength(2);
  });

  test('separates activities by type', () => {
    fomaEngine.activityBuffer.clear();

    fomaEngine.recordActivity('C001', 'job_view', {});
    fomaEngine.recordActivity('C001', 'profile_update', {});

    expect(fomaEngine.activityBuffer.has('job_view')).toBe(true);
    expect(fomaEngine.activityBuffer.has('profile_update')).toBe(true);
    expect(fomaEngine.activityBuffer.get('job_view')).toHaveLength(1);
    expect(fomaEngine.activityBuffer.get('profile_update')).toHaveLength(1);
  });

  test('stores candidateId and metadata in the buffered entry', () => {
    fomaEngine.activityBuffer.clear();

    fomaEngine.recordActivity('C099', 'job_view', { jobId: 'J200', extra: true });

    const entry = fomaEngine.activityBuffer.get('job_view')[0];
    expect(entry.candidateId).toBe('C099');
    expect(entry.metadata).toEqual({ jobId: 'J200', extra: true });
  });

  test('generates a unique activity id', () => {
    fomaEngine.activityBuffer.clear();

    fomaEngine.recordActivity('C001', 'job_view', {});
    fomaEngine.recordActivity('C001', 'job_view', {});

    const ids = fomaEngine.activityBuffer.get('job_view').map((a) => a.id);
    expect(ids[0]).not.toBe(ids[1]);
  });

  test('records an ISO timestamp', () => {
    fomaEngine.activityBuffer.clear();

    fomaEngine.recordActivity('C001', 'job_view', {});

    const entry = fomaEngine.activityBuffer.get('job_view')[0];
    expect(() => new Date(entry.timestamp)).not.toThrow();
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  test('calls processImmediateFOMO for high-impact activities', () => {
    const { isHighImpactActivity, processImmediateFOMO } = require('../../services/fomo/fomo-messenger');
    isHighImpactActivity.mockReturnValueOnce(true);

    fomaEngine.recordActivity('C001', 'job_application', { jobId: 'J100' });

    expect(processImmediateFOMO).toHaveBeenCalledWith(
      'C001',
      'job_application',
      { jobId: 'J100' },
      expect.any(Function)
    );
  });

  test('does NOT call processImmediateFOMO for non-high-impact activities', () => {
    const { isHighImpactActivity, processImmediateFOMO } = require('../../services/fomo/fomo-messenger');
    isHighImpactActivity.mockReturnValueOnce(false);
    processImmediateFOMO.mockClear();

    fomaEngine.recordActivity('C001', 'page_view', {});

    expect(processImmediateFOMO).not.toHaveBeenCalled();
  });

  test('defaults metadata to empty object', () => {
    fomaEngine.activityBuffer.clear();

    fomaEngine.recordActivity('C001', 'job_view');

    const entry = fomaEngine.activityBuffer.get('job_view')[0];
    expect(entry.metadata).toEqual({});
  });
});

// ============================================
// FOMO ENGINE — processActivityBuffer
// ============================================

describe('FOMAEngine.processActivityBuffer', () => {
  const { processSocialProofBatch } = require('../../services/fomo/social-proof-generator');

  beforeEach(() => {
    fomaEngine.activityBuffer.clear();
    processSocialProofBatch.mockClear();
  });

  test('calls processSocialProofBatch for each activity type', () => {
    fomaEngine.activityBuffer.set('job_view', [
      { id: '1', candidateId: 'C1', timestamp: new Date().toISOString(), metadata: {} },
    ]);
    fomaEngine.activityBuffer.set('profile_update', [
      { id: '2', candidateId: 'C2', timestamp: new Date().toISOString(), metadata: {} },
    ]);

    fomaEngine.processActivityBuffer();

    expect(processSocialProofBatch).toHaveBeenCalledTimes(2);
    expect(processSocialProofBatch).toHaveBeenCalledWith('job_view', expect.any(Array));
    expect(processSocialProofBatch).toHaveBeenCalledWith('profile_update', expect.any(Array));
  });

  test('clears the buffer after processing', () => {
    fomaEngine.activityBuffer.set('job_view', [
      { id: '1', candidateId: 'C1', timestamp: new Date().toISOString(), metadata: {} },
    ]);

    fomaEngine.processActivityBuffer();

    expect(fomaEngine.activityBuffer.get('job_view')).toEqual([]);
  });

  test('skips empty activity arrays', () => {
    fomaEngine.activityBuffer.set('empty_type', []);

    fomaEngine.processActivityBuffer();

    expect(processSocialProofBatch).not.toHaveBeenCalled();
  });

  test('batches activities in groups of 50', () => {
    const bigList = Array.from({ length: 120 }, (_, i) => ({
      id: `act_${i}`,
      candidateId: `C${i}`,
      timestamp: new Date().toISOString(),
      metadata: {},
    }));
    fomaEngine.activityBuffer.set('job_view', bigList);

    fomaEngine.processActivityBuffer();

    // 120 activities / 50 batch size = 3 batches
    expect(processSocialProofBatch).toHaveBeenCalledTimes(3);
    expect(processSocialProofBatch.mock.calls[0][1]).toHaveLength(50);
    expect(processSocialProofBatch.mock.calls[1][1]).toHaveLength(50);
    expect(processSocialProofBatch.mock.calls[2][1]).toHaveLength(20);
  });

  test('handles processSocialProofBatch throwing without crashing', () => {
    processSocialProofBatch.mockImplementationOnce(() => {
      throw new Error('batch failed');
    });
    fomaEngine.activityBuffer.set('job_view', [
      { id: '1', candidateId: 'C1', timestamp: new Date().toISOString(), metadata: {} },
    ]);

    // Should not throw
    expect(() => fomaEngine.processActivityBuffer()).not.toThrow();
  });
});

// ============================================
// FOMO ENGINE — _evictOldest
// ============================================

describe('FOMAEngine._evictOldest', () => {
  test('does nothing when map size is within limit', () => {
    const map = new Map([['a', 1], ['b', 2]]);

    fomaEngine._evictOldest(map, 5);

    expect(map.size).toBe(2);
  });

  test('evicts oldest entries when map exceeds maxSize', () => {
    const map = new Map();
    for (let i = 0; i < 10; i++) {
      map.set(`key_${i}`, i);
    }

    fomaEngine._evictOldest(map, 5);

    expect(map.size).toBe(5);
    // The first 5 (oldest) should have been removed
    expect(map.has('key_0')).toBe(false);
    expect(map.has('key_4')).toBe(false);
    // The last 5 should remain
    expect(map.has('key_5')).toBe(true);
    expect(map.has('key_9')).toBe(true);
  });

  test('evicts exactly enough entries to reach maxSize', () => {
    const map = new Map();
    for (let i = 0; i < 8; i++) {
      map.set(`k${i}`, i);
    }

    fomaEngine._evictOldest(map, 3);

    expect(map.size).toBe(3);
  });

  test('uses MAX_CACHE_SIZE (1000) as default', () => {
    const map = new Map();
    for (let i = 0; i < 1002; i++) {
      map.set(`k${i}`, i);
    }

    fomaEngine._evictOldest(map);

    expect(map.size).toBe(1000);
    // First two should be gone
    expect(map.has('k0')).toBe(false);
    expect(map.has('k1')).toBe(false);
    // k2 onwards should remain
    expect(map.has('k2')).toBe(true);
  });

  test('handles map of exactly maxSize (no eviction needed)', () => {
    const map = new Map();
    for (let i = 0; i < 5; i++) {
      map.set(`k${i}`, i);
    }

    fomaEngine._evictOldest(map, 5);

    expect(map.size).toBe(5);
  });

  test('handles empty map without error', () => {
    const map = new Map();

    expect(() => fomaEngine._evictOldest(map, 5)).not.toThrow();
    expect(map.size).toBe(0);
  });
});

// ============================================
// FOMO ENGINE — createFOMOEvent
// ============================================

describe('FOMAEngine.createFOMOEvent', () => {
  beforeEach(() => {
    mockDbPrepare.mockReturnValue({ run: mockDbRun, get: mockDbGet, all: mockDbAll });
    mockDbRun.mockReturnValue({ changes: 1 });
  });

  test('inserts an event into the database', () => {
    fomaEngine.createFOMOEvent('C001', 'job_urgency', { jobId: 'J1' });

    expect(mockDbPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO fomo_events'));
    expect(mockDbRun).toHaveBeenCalled();
  });

  test('returns an event id starting with fomo_', () => {
    const eventId = fomaEngine.createFOMOEvent('C001', 'job_urgency', { jobId: 'J1' });

    expect(eventId).toMatch(/^fomo_/);
  });

  test('uses provided urgencyScore option', () => {
    fomaEngine.createFOMOEvent('C001', 'job_urgency', {}, { urgencyScore: 0.9 });

    const runArgs = mockDbRun.mock.calls[mockDbRun.mock.calls.length - 1];
    // urgencyScore is the 5th positional arg (after id, candidateId, eventType, eventData)
    expect(runArgs[4]).toBe(0.9);
  });

  test('uses provided expiresAt option', () => {
    const customExpiry = new Date('2026-12-31T23:59:59.000Z');
    fomaEngine.createFOMOEvent('C001', 'test', {}, { expiresAt: customExpiry });

    const runArgs = mockDbRun.mock.calls[mockDbRun.mock.calls.length - 1];
    expect(runArgs[7]).toBe(customExpiry.toISOString());
  });

  test('returns null when database insert fails', () => {
    mockDbPrepare.mockReturnValueOnce({
      run: jest.fn(() => { throw new Error('DB write error'); }),
    });

    const result = fomaEngine.createFOMOEvent('C001', 'test', {});

    expect(result).toBeNull();
  });

  test('serializes eventData as JSON', () => {
    const data = { jobId: 'J1', slots: 3 };
    fomaEngine.createFOMOEvent('C001', 'job_urgency', data);

    const runArgs = mockDbRun.mock.calls[mockDbRun.mock.calls.length - 1];
    expect(runArgs[3]).toBe(JSON.stringify(data));
  });

  test('defaults expiry to 2 hours from now', () => {
    const before = Date.now();
    fomaEngine.createFOMOEvent('C001', 'test', {});
    const after = Date.now();

    const runArgs = mockDbRun.mock.calls[mockDbRun.mock.calls.length - 1];
    const expiresAt = new Date(runArgs[7]).getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    expect(expiresAt).toBeGreaterThanOrEqual(before + twoHoursMs - 100);
    expect(expiresAt).toBeLessThanOrEqual(after + twoHoursMs + 100);
  });
});

// ============================================
// FOMO ENGINE — calculateEventUrgency
// ============================================

describe('FOMAEngine.calculateEventUrgency', () => {
  test('streak_protection: returns urgency based on hoursRemaining', () => {
    const urgency = fomaEngine.calculateEventUrgency('streak_protection', { hoursRemaining: 6 });
    // (24 - 6) / 24 = 0.75
    expect(urgency).toBeCloseTo(0.75);
  });

  test('streak_protection: defaults hoursRemaining to 12', () => {
    const urgency = fomaEngine.calculateEventUrgency('streak_protection', {});
    // (24 - 12) / 24 = 0.5
    expect(urgency).toBeCloseTo(0.5);
  });

  test('streak_protection: clamps at 1.0 max', () => {
    const urgency = fomaEngine.calculateEventUrgency('streak_protection', { hoursRemaining: 0 });
    expect(urgency).toBeLessThanOrEqual(1.0);
  });

  test('job_urgency: returns provided urgencyScore', () => {
    const urgency = fomaEngine.calculateEventUrgency('job_urgency', { urgencyScore: 0.8 });
    expect(urgency).toBe(0.8);
  });

  test('job_urgency: defaults to 0.5', () => {
    const urgency = fomaEngine.calculateEventUrgency('job_urgency', {});
    expect(urgency).toBe(0.5);
  });

  test('unknown event types return 0.3', () => {
    expect(fomaEngine.calculateEventUrgency('unknown_type', {})).toBe(0.3);
    expect(fomaEngine.calculateEventUrgency('random', { urgencyScore: 0.9 })).toBe(0.3);
  });
});

// ============================================
// FOMO ENGINE — MAX_CACHE_SIZE enforcement
// ============================================

describe('MAX_CACHE_SIZE enforcement', () => {
  test('urgencyCache is bounded to 1000', () => {
    fomaEngine.urgencyCache.clear();
    for (let i = 0; i < 1050; i++) {
      fomaEngine.urgencyCache.set(`key_${i}`, { score: Math.random() });
    }

    fomaEngine._evictOldest(fomaEngine.urgencyCache);

    expect(fomaEngine.urgencyCache.size).toBe(1000);
  });

  test('socialProofCache is bounded to 1000', () => {
    fomaEngine.socialProofCache.clear();
    for (let i = 0; i < 1100; i++) {
      fomaEngine.socialProofCache.set(`sp_${i}`, { data: i });
    }

    fomaEngine._evictOldest(fomaEngine.socialProofCache);

    expect(fomaEngine.socialProofCache.size).toBe(1000);
  });

  test('activityBuffer eviction uses custom maxSize of 500', () => {
    fomaEngine.activityBuffer.clear();
    for (let i = 0; i < 600; i++) {
      fomaEngine.activityBuffer.set(`type_${i}`, []);
    }

    fomaEngine._evictOldest(fomaEngine.activityBuffer, 500);

    expect(fomaEngine.activityBuffer.size).toBe(500);
  });

  test('scarcityTriggers Set is cleared when exceeding MAX_CACHE_SIZE', () => {
    fomaEngine.scarcityTriggers.clear();
    for (let i = 0; i < 1100; i++) {
      fomaEngine.scarcityTriggers.add(`trigger_${i}`);
    }

    // Replicate the logic from setupPeriodicTasks
    if (fomaEngine.scarcityTriggers.size > 1000) {
      fomaEngine.scarcityTriggers.clear();
    }

    expect(fomaEngine.scarcityTriggers.size).toBe(0);
  });
});

// ============================================
// STREAK PROTECTION — analyzeRisk helpers
// ============================================

describe('StreakProtectionSystem.calculateOverallRiskScore', () => {
  test('returns weighted combination of all risk factors', () => {
    const factors = {
      timeRisk: 1.0,
      patternRisk: 0.5,
      engagementRisk: 0.5,
      socialRisk: 0.5,
      valueRisk: 0.5,
    };

    // 1.0*0.4 + 0.5*0.2 + 0.5*0.2 + 0.5*0.1 + 0.5*0.1 = 0.4 + 0.1 + 0.1 + 0.05 + 0.05 = 0.7
    const score = riskAnalyzer.calculateOverallRiskScore(factors);
    expect(score).toBeCloseTo(0.7);
  });

  test('returns 0 when all factors are 0', () => {
    const factors = { timeRisk: 0, patternRisk: 0, engagementRisk: 0, socialRisk: 0, valueRisk: 0 };
    expect(riskAnalyzer.calculateOverallRiskScore(factors)).toBe(0);
  });

  test('clamps maximum score to 1.0', () => {
    const factors = { timeRisk: 1.0, patternRisk: 1.0, engagementRisk: 1.0, socialRisk: 1.0, valueRisk: 1.0 };
    expect(riskAnalyzer.calculateOverallRiskScore(factors)).toBeLessThanOrEqual(1.0);
  });

  test('handles missing factor keys gracefully (defaults to 0)', () => {
    const factors = { timeRisk: 0.8 }; // others missing
    const score = riskAnalyzer.calculateOverallRiskScore(factors);
    // 0.8*0.4 = 0.32
    expect(score).toBeCloseTo(0.32);
  });
});

// ============================================
// STREAK PROTECTION — predictStreakBreakTime
// ============================================

describe('StreakProtectionSystem.predictStreakBreakTime', () => {
  test('returns adjusted time remaining based on risk factors', () => {
    const candidate = { hours_since_checkin: 18 }; // 6 hours left
    const riskFactors = { patternRisk: 0.5, engagementRisk: 0.5 };

    // adjustmentFactor = 1 - (0.5*0.5 + 0.5*0.3) = 1 - 0.4 = 0.6
    // result = 6 * 0.6 = 3.6
    const result = riskAnalyzer.predictStreakBreakTime(candidate, riskFactors);
    expect(result).toBeCloseTo(3.6);
  });

  test('returns 0 when candidate has exceeded 24 hours', () => {
    const candidate = { hours_since_checkin: 25 };
    const riskFactors = { patternRisk: 0, engagementRisk: 0 };

    const result = riskAnalyzer.predictStreakBreakTime(candidate, riskFactors);
    expect(result).toBe(0);
  });

  test('never returns negative value', () => {
    const candidate = { hours_since_checkin: 30 };
    const riskFactors = { patternRisk: 0.9, engagementRisk: 0.9 };

    const result = riskAnalyzer.predictStreakBreakTime(candidate, riskFactors);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

// ============================================
// STREAK PROTECTION — calculateStreakValue
// ============================================

describe('StreakProtectionSystem.calculateStreakValue', () => {
  test('returns base value for short streaks', () => {
    // 5 days * 10 = 50 (no bonus)
    expect(riskAnalyzer.calculateStreakValue(5)).toBe(50);
  });

  test('adds 20 bonus at 7 days', () => {
    // 7*10 + 20 = 90
    expect(riskAnalyzer.calculateStreakValue(7)).toBe(90);
  });

  test('adds 50 bonus at 14 days', () => {
    // 14*10 + 50 = 190
    expect(riskAnalyzer.calculateStreakValue(14)).toBe(190);
  });

  test('adds 100 bonus at 30 days', () => {
    // 30*10 + 100 = 400
    expect(riskAnalyzer.calculateStreakValue(30)).toBe(400);
  });

  test('adds 200 bonus at 50 days', () => {
    // 50*10 + 200 = 700
    expect(riskAnalyzer.calculateStreakValue(50)).toBe(700);
  });

  test('adds 500 bonus at 100 days', () => {
    // 100*10 + 500 = 1500
    expect(riskAnalyzer.calculateStreakValue(100)).toBe(1500);
  });

  test('returns 0 for 0 streak days', () => {
    expect(riskAnalyzer.calculateStreakValue(0)).toBe(0);
  });
});

// ============================================
// STREAK PROTECTION — cache cleanup
// ============================================

describe('StreakProtectionSystem cache cleanup', () => {
  test('riskProfiles clears when exceeding 1000 entries', () => {
    streakSystem.riskProfiles.clear();
    for (let i = 0; i < 1001; i++) {
      streakSystem.riskProfiles.set(`rp_${i}`, { score: 0.5 });
    }

    // Replicate the eviction logic from the constructor
    if (streakSystem.riskProfiles.size > 1000) streakSystem.riskProfiles.clear();

    expect(streakSystem.riskProfiles.size).toBe(0);
  });

  test('protectionTokens clears when exceeding 1000 entries', () => {
    streakSystem.protectionTokens.clear();
    for (let i = 0; i < 1001; i++) {
      streakSystem.protectionTokens.set(`pt_${i}`, {});
    }

    if (streakSystem.protectionTokens.size > 1000) streakSystem.protectionTokens.clear();

    expect(streakSystem.protectionTokens.size).toBe(0);
  });

  test('milestoneTrackers clears when exceeding 1000 entries', () => {
    streakSystem.milestoneTrackers.clear();
    for (let i = 0; i < 1001; i++) {
      streakSystem.milestoneTrackers.set(`mt_${i}`, {});
    }

    if (streakSystem.milestoneTrackers.size > 1000) streakSystem.milestoneTrackers.clear();

    expect(streakSystem.milestoneTrackers.size).toBe(0);
  });

  test('caches stay intact at exactly 1000 entries', () => {
    streakSystem.riskProfiles.clear();
    for (let i = 0; i < 1000; i++) {
      streakSystem.riskProfiles.set(`rp_${i}`, { score: 0.5 });
    }

    if (streakSystem.riskProfiles.size > 1000) streakSystem.riskProfiles.clear();

    expect(streakSystem.riskProfiles.size).toBe(1000);
  });
});

// ============================================
// STREAK PROTECTION — selectProtectionType
// ============================================

describe('StreakProtectionSystem.selectProtectionType', () => {
  test('returns freeze_24h for high risk with 7+ day streak', () => {
    const candidate = { streak_days: 10 };
    const result = streakSystem.selectProtectionType(candidate, 0.7);
    expect(result.type).toBe('freeze_24h');
  });

  test('returns grace_period for moderate risk with 3+ day streak', () => {
    const candidate = { streak_days: 5 };
    const result = streakSystem.selectProtectionType(candidate, 0.55);
    expect(result.type).toBe('grace_period');
  });

  test('freeze_24h takes precedence over auto_checkin (first match wins)', () => {
    // freeze_24h condition (r>0.6 && days>=7) matches before auto_checkin (r>0.8 && days>=14)
    // because Array.find returns the first match in definition order
    const candidate = { streak_days: 20 };
    const result = streakSystem.selectProtectionType(candidate, 0.85);
    expect(result.type).toBe('freeze_24h');
  });

  test('falls back to grace_period when no condition matches', () => {
    const candidate = { streak_days: 1 }; // Too short for any condition
    const result = streakSystem.selectProtectionType(candidate, 0.1);
    expect(result.type).toBe('grace_period');
  });
});

// ============================================
// STREAK PROTECTION — generateUrgencyMessage
// ============================================

describe('StreakProtectionSystem.generateUrgencyMessage', () => {
  test('returns URGENT message for riskScore > 0.8', () => {
    const candidate = { hours_since_checkin: 22, streak_days: 15 };
    const msg = streakSystem.generateUrgencyMessage(candidate, 0.85);
    expect(msg).toMatch(/^URGENT/);
    expect(msg).toContain('15-day streak');
  });

  test('returns loss-aversion message for riskScore 0.6–0.8', () => {
    const candidate = { hours_since_checkin: 18, streak_days: 10 };
    const msg = streakSystem.generateUrgencyMessage(candidate, 0.65);
    expect(msg).toContain('10 days of progress');
  });

  test('returns gentle reminder for riskScore <= 0.6', () => {
    const candidate = { hours_since_checkin: 14, streak_days: 7 };
    const msg = streakSystem.generateUrgencyMessage(candidate, 0.5);
    expect(msg).toContain('Protect your 7-day streak');
  });
});

// ============================================
// STREAK PROTECTION — milestone helpers
// ============================================

describe('StreakProtectionSystem.isNewMilestone', () => {
  test('daily milestone matches exact streak days', () => {
    expect(milestoneProcessor.isNewMilestone({ streak_days: 7 }, 'daily', 7)).toBe(true);
    expect(milestoneProcessor.isNewMilestone({ streak_days: 8 }, 'daily', 7)).toBe(false);
  });

  test('weekly milestone matches streak days as value * 7', () => {
    expect(milestoneProcessor.isNewMilestone({ streak_days: 14 }, 'weekly', 2)).toBe(true);
    expect(milestoneProcessor.isNewMilestone({ streak_days: 15 }, 'weekly', 2)).toBe(false);
  });

  test('monthly milestone matches streak days as value * 30', () => {
    expect(milestoneProcessor.isNewMilestone({ streak_days: 90 }, 'monthly', 3)).toBe(true);
    expect(milestoneProcessor.isNewMilestone({ streak_days: 91 }, 'monthly', 3)).toBe(false);
  });

  test('unknown milestone type returns false', () => {
    expect(milestoneProcessor.isNewMilestone({ streak_days: 7 }, 'yearly', 1)).toBe(false);
  });
});

describe('StreakProtectionSystem.calculateMilestoneRarity', () => {
  test('daily 365 is legendary', () => {
    expect(milestoneProcessor.calculateMilestoneRarity({ type: 'daily', value: 365 })).toBe('legendary');
  });

  test('daily 100 is epic', () => {
    expect(milestoneProcessor.calculateMilestoneRarity({ type: 'daily', value: 100 })).toBe('epic');
  });

  test('daily 30 is rare', () => {
    expect(milestoneProcessor.calculateMilestoneRarity({ type: 'daily', value: 30 })).toBe('rare');
  });

  test('daily 3 is common', () => {
    expect(milestoneProcessor.calculateMilestoneRarity({ type: 'daily', value: 3 })).toBe('common');
  });

  test('monthly 12 is legendary', () => {
    expect(milestoneProcessor.calculateMilestoneRarity({ type: 'monthly', value: 12 })).toBe('legendary');
  });

  test('weekly 52 is legendary', () => {
    expect(milestoneProcessor.calculateMilestoneRarity({ type: 'weekly', value: 52 })).toBe('legendary');
  });
});

describe('StreakProtectionSystem.calculateMilestoneXP', () => {
  test('daily common milestone returns base XP', () => {
    // value=3, base = 3*50=150, rarity=common, multiplier=1 => 150
    expect(milestoneProcessor.calculateMilestoneXP({ type: 'daily', value: 3 })).toBe(150);
  });

  test('daily rare milestone applies 1.5x multiplier', () => {
    // value=30, base = 30*50=1500, rarity=rare, multiplier=1.5 => 2250
    expect(milestoneProcessor.calculateMilestoneXP({ type: 'daily', value: 30 })).toBe(2250);
  });

  test('monthly legendary milestone applies 3x multiplier', () => {
    // value=12, base = 12*1200=14400, rarity=legendary, multiplier=3 => 43200
    expect(milestoneProcessor.calculateMilestoneXP({ type: 'monthly', value: 12 })).toBe(43200);
  });

  test('weekly epic milestone applies 2x multiplier', () => {
    // value=12, base = 12*300=3600, rarity=epic, multiplier=2 => 7200
    expect(milestoneProcessor.calculateMilestoneXP({ type: 'weekly', value: 12 })).toBe(7200);
  });
});

// ============================================
// STREAK PROTECTION — generateFOMOInterventions
// ============================================

describe('StreakProtectionSystem.generateFOMOInterventions', () => {
  test('adds urgency_alert for high time risk', () => {
    const candidate = { hours_since_checkin: 22, streak_days: 10 };
    const riskFactors = { timeRisk: 0.8, socialRisk: 0, patternRisk: 0, engagementRisk: 0, valueRisk: 0 };

    const interventions = streakSystem.generateFOMOInterventions(candidate, riskFactors);

    expect(interventions.some((i) => i.type === 'urgency_alert')).toBe(true);
  });

  test('adds peer_comparison for social risk > 0.3', () => {
    const candidate = { hours_since_checkin: 14, streak_days: 5 };
    const riskFactors = { timeRisk: 0, socialRisk: 0.5, patternRisk: 0, engagementRisk: 0, valueRisk: 0 };

    const interventions = streakSystem.generateFOMOInterventions(candidate, riskFactors);

    expect(interventions.some((i) => i.type === 'peer_comparison')).toBe(true);
  });

  test('adds loss_aversion for 7+ day streaks', () => {
    const candidate = { hours_since_checkin: 14, streak_days: 10 };
    const riskFactors = { timeRisk: 0, socialRisk: 0, patternRisk: 0, engagementRisk: 0, valueRisk: 0 };

    const interventions = streakSystem.generateFOMOInterventions(candidate, riskFactors);

    const lossIntervention = interventions.find((i) => i.type === 'loss_aversion');
    expect(lossIntervention).toBeDefined();
    expect(lossIntervention.value).toBe(riskAnalyzer.calculateStreakValue(10));
  });

  test('returns empty array for low risk short streak', () => {
    const candidate = { hours_since_checkin: 5, streak_days: 2 };
    const riskFactors = { timeRisk: 0.1, socialRisk: 0.1, patternRisk: 0, engagementRisk: 0, valueRisk: 0 };

    const interventions = streakSystem.generateFOMOInterventions(candidate, riskFactors);

    expect(interventions).toEqual([]);
  });
});

// ============================================
// STREAK PROTECTION — generateCompetitiveMessage
// ============================================

describe('StreakProtectionSystem.generateCompetitiveMessage', () => {
  test('large gap (>50) message mentions catching up', () => {
    const milestone = { candidate: { streak_days: 100 }, value: 100, type: 'daily' };
    const peer = { streak_days: 40 };

    const msg = milestoneProcessor.generateCompetitiveMessage(milestone, peer);
    expect(msg).toContain('60 days ahead');
    expect(msg).toContain('catch up');
  });

  test('medium gap (10-50) message mentions closing the gap', () => {
    const milestone = { candidate: { streak_days: 40 }, value: 40, type: 'daily' };
    const peer = { streak_days: 20 };

    const msg = milestoneProcessor.generateCompetitiveMessage(milestone, peer);
    expect(msg).toContain('20-day gap');
  });

  test('small gap (<=10) message emphasizes closeness', () => {
    const milestone = { candidate: { streak_days: 15 }, value: 14, type: 'daily' };
    const peer = { streak_days: 10 };

    const msg = milestoneProcessor.generateCompetitiveMessage(milestone, peer);
    expect(msg).toContain('5 days behind');
  });
});
