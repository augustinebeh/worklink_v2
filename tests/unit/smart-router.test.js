/**
 * Unit Tests: Smart Response Router
 *
 * Tests intent classification, message routing, fact-based template generation,
 * real data access error handling, quality checks, and loop prevention.
 */

// Silence all logger output during tests
jest.mock('../../utils/structured-logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));

// Mock the database module
jest.mock('../../db', () => {
  const runFn = jest.fn().mockReturnValue({ lastInsertRowid: 1 });
  const allFn = jest.fn().mockReturnValue([]);
  const getFn = jest.fn().mockReturnValue(null);
  const prepareFn = jest.fn().mockReturnValue({ run: runFn, all: allFn, get: getFn });
  const execFn = jest.fn();
  return {
    db: { prepare: prepareFn, exec: execFn },
    __mocks: { prepareFn, runFn, allFn, getFn, execFn }
  };
});

// Mock WebSocket broadcast
jest.mock('../../websocket', () => ({
  broadcastToAdmins: jest.fn()
}));

// Mock the SLM scheduling bridge
jest.mock('../../utils/slm-scheduling-bridge', () => {
  return jest.fn().mockImplementation(() => ({
    handlePendingCandidateMessage: jest.fn().mockResolvedValue({
      content: 'Welcome! Let me help you schedule an interview.',
      type: 'scheduling_offer',
      metadata: { step: 'initial' },
      schedulingContext: { available: true }
    })
  }));
});

// Mock the old AI chat for fallback tests
jest.mock('../../services/ai-chat', () => ({
  generateResponse: jest.fn().mockResolvedValue({
    content: 'Old system response',
    source: 'old_ai_chat'
  })
}));

const SmartResponseRouter = require('../../services/smart-response-router/index');
const IntentClassificationEngine = require('../../services/smart-response-router/intent-classification');

// ============================================
// HELPERS
// ============================================

function buildCandidateContext(overrides = {}) {
  return {
    id: 'C100',
    name: 'Alice Tan',
    email: 'alice@example.com',
    phone: '91234567',
    status: 'active',
    created_at: '2025-01-01',
    last_seen: '2026-03-19',
    online_status: 'online',
    level: 2,
    xp: 150,
    preferred_contact: 'telegram',
    conversationMeta: { metadata: {}, messageStats: {} },
    recentActivity: [],
    isOnline: true,
    fetchedAt: new Date().toISOString(),
    ...overrides
  };
}

function buildRealData(overrides = {}) {
  return {
    pendingEarnings: 120,
    paidEarnings: 500,
    availableEarnings: 80,
    totalEarnings: 620,
    totalPayments: 5,
    paymentHistory: [{ id: 1, total_amount: 100, status: 'paid' }],
    withdrawalHistory: [{ id: 1, amount: 50, status: 'completed' }],
    upcomingJobs: [{ id: 1, title: 'Event Staff', location: 'MBS', job_date: '2026-04-01' }],
    availableJobs: [{ id: 2, title: 'Warehouse Help', location: 'Tuas', job_date: '2026-04-05' }],
    jobHistory: [],
    hasUpcomingWork: true,
    availableOpportunities: 1,
    totalJobsCompleted: 3,
    activeApplications: [{ id: 1, title: 'Event Staff', status: 'pending' }],
    applicationStats: { total_applications: 5, pending_applications: 1, confirmed_applications: 2 },
    hasActiveApplications: true,
    pendingApplications: 1,
    confirmedApplications: 2,
    upcomingShifts: [{ id: 1, title: 'Event Staff', job_date: '2026-04-01', start_time: '09:00', end_time: '17:00', location: 'MBS' }],
    todaySchedule: [],
    hasScheduledWork: true,
    workingToday: false,
    nextShift: { id: 1, title: 'Event Staff', job_date: '2026-04-01', location: 'MBS' },
    recentActivity: [],
    gamificationData: {},
    hasRecentActivity: false,
    fetchedAt: new Date().toISOString(),
    ...overrides
  };
}

// ============================================
// INTENT CLASSIFICATION ENGINE
// ============================================

describe('IntentClassificationEngine', () => {
  let classifier;

  beforeEach(() => {
    classifier = new IntentClassificationEngine();
  });

  // ------------------------------------------
  // cleanMessage
  // ------------------------------------------
  describe('cleanMessage', () => {
    test('lowercases and strips punctuation', () => {
      expect(classifier.cleanMessage('Hello! How are you?')).toBe('hello how are you');
    });

    test('normalises multiple spaces to one', () => {
      expect(classifier.cleanMessage('  a   b  ')).toBe('a b');
    });

    test('handles empty string', () => {
      expect(classifier.cleanMessage('')).toBe('');
    });
  });

  // ------------------------------------------
  // analyzeMessage
  // ------------------------------------------
  describe('analyzeMessage', () => {
    const ctx = buildCandidateContext();

    test('classifies a payment inquiry message', async () => {
      const result = await classifier.analyzeMessage('When will I get paid?', ctx, null);
      expect(result.primary).toBe('payment_inquiry');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.requiresRealData).toBe(true);
    });

    test('classifies a greeting message', async () => {
      const result = await classifier.analyzeMessage('Hello!', ctx, null);
      expect(result.primary).toBe('greeting');
      expect(result.requiresRealData).toBe(false);
    });

    test('classifies a job inquiry message', async () => {
      const result = await classifier.analyzeMessage('Are there any jobs available?', ctx, null);
      expect(result.primary).toBe('job_inquiry');
      expect(result.requiresRealData).toBe(true);
    });

    test('classifies a balance check message', async () => {
      const result = await classifier.analyzeMessage('Check my balance please', ctx, null);
      expect(result.primary).toBe('balance_check');
      expect(result.requiresRealData).toBe(true);
    });

    test('classifies a complaint and marks escalation', async () => {
      const result = await classifier.analyzeMessage('I am very unhappy with unfair treatment', ctx, null);
      expect(result.primary).toBe('complaint_feedback');
      expect(result.requiresEscalation).toBe(true);
    });

    test('classifies a technical issue and marks escalation', async () => {
      const result = await classifier.analyzeMessage('The app is not working, I keep getting an error', ctx, null);
      expect(result.primary).toBe('technical_issue');
      expect(result.requiresEscalation).toBe(true);
    });

    test('classifies a withdrawal request', async () => {
      const result = await classifier.analyzeMessage('I want to withdraw my money to bank', ctx, null);
      expect(result.primary).toBe('withdrawal_request');
      expect(result.requiresRealData).toBe(true);
    });

    test('classifies schedule inquiry', async () => {
      const result = await classifier.analyzeMessage('What is my work schedule for the week?', ctx, null);
      expect(result.primary).toBe('schedule_inquiry');
      expect(result.requiresRealData).toBe(true);
    });

    test('falls back to general_question for gibberish', async () => {
      const result = await classifier.analyzeMessage('xyzzy qwerty asdf', ctx, null);
      expect(result.primary).toBe('general_question');
    });

    test('returns safe fallback when analysis throws', async () => {
      // Force an error by passing invalid context
      const broken = new IntentClassificationEngine();
      jest.spyOn(broken, 'performPatternMatching').mockRejectedValue(new Error('boom'));

      const result = await broken.analyzeMessage('hello', ctx, null);
      expect(result.primary).toBe('general_question');
      expect(result.confidence).toBe(0.3);
      expect(result.requiresEscalation).toBe(true);
      expect(result.error).toBe(true);
    });
  });

  // ------------------------------------------
  // checkEscalationTriggers
  // ------------------------------------------
  describe('checkEscalationTriggers', () => {
    test('detects urgency triggers', async () => {
      const result = await classifier.checkEscalationTriggers('this is urgent i need help asap');
      expect(result.requiresEscalation).toBe(true);
      expect(result.escalationScore).toBeGreaterThanOrEqual(2);
      expect(result.escalationUrgency).toBe('high');
    });

    test('detects emotional triggers', async () => {
      const result = await classifier.checkEscalationTriggers('i am very angry and frustrated');
      expect(result.requiresEscalation).toBe(true);
      expect(result.signals.emotion).toBeGreaterThan(0);
    });

    test('detects legal triggers', async () => {
      const result = await classifier.checkEscalationTriggers('i will get a lawyer and sue you');
      expect(result.requiresEscalation).toBe(true);
      expect(result.signals.legal).toBeGreaterThan(0);
    });

    test('returns no escalation for benign message', async () => {
      const result = await classifier.checkEscalationTriggers('good morning how are you');
      expect(result.requiresEscalation).toBe(false);
      expect(result.escalationScore).toBe(0);
    });

    test('detects cancellation triggers', async () => {
      const result = await classifier.checkEscalationTriggers('i want to cancel and delete account');
      expect(result.requiresEscalation).toBe(true);
      expect(result.signals.cancellation).toBeGreaterThan(0);
    });
  });

  // ------------------------------------------
  // contextual analysis boosts
  // ------------------------------------------
  describe('performContextualAnalysis', () => {
    test('adds pending candidate boost for pending status', async () => {
      const ctx = buildCandidateContext({ status: 'pending' });
      const result = await classifier.performContextualAnalysis('schedule interview', ctx);
      expect(result.pendingCandidateBoost).toBeDefined();
      expect(result.pendingCandidateBoost.interview_scheduling).toBe(0.3);
    });

    test('adds active candidate boost for active status', async () => {
      const ctx = buildCandidateContext({ status: 'active' });
      const result = await classifier.performContextualAnalysis('any jobs', ctx);
      expect(result.activeCandidateBoost).toBeDefined();
      expect(result.activeCandidateBoost.job_inquiry).toBe(0.2);
    });

    test('returns empty factors when no candidate context', async () => {
      const result = await classifier.performContextualAnalysis('hello', null);
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  // ------------------------------------------
  // getClassificationStats
  // ------------------------------------------
  describe('getClassificationStats', () => {
    test('returns counts for all intent categories', () => {
      const stats = classifier.getClassificationStats();
      expect(stats.totalIntents).toBeGreaterThan(10);
      expect(stats.realDataIntents).toBeGreaterThan(0);
      expect(stats.escalationTriggerCategories).toBe(6);
    });
  });
});

// ============================================
// SMART RESPONSE ROUTER
// ============================================

describe('SmartResponseRouter', () => {
  let router;

  beforeEach(() => {
    router = new SmartResponseRouter();
    // Override data access layer to return controlled values
    router.dataAccess.getCandidateContext = jest.fn();
    router.dataAccess.getRealCandidateData = jest.fn();
    router.dataAccess.validateDataAvailability = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ------------------------------------------
  // processMessage - basic routing
  // ------------------------------------------
  describe('processMessage', () => {
    test('returns error response when candidate not found', async () => {
      router.dataAccess.getCandidateContext.mockResolvedValue(null);
      router.dataAccess.getRealCandidateData.mockResolvedValue(null);

      const result = await router.processMessage('C999', 'hello');

      expect(result.error).toBe(true);
      expect(result.source).toBe('error_response');
      expect(result.content).toContain('support team');
    });

    test('returns structured response with metadata for valid candidate', async () => {
      const ctx = buildCandidateContext();
      const data = buildRealData();

      router.dataAccess.getCandidateContext.mockResolvedValue(ctx);
      router.dataAccess.getRealCandidateData.mockResolvedValue(data);

      const result = await router.processMessage('C100', 'Hello');

      expect(result.routedBy).toBe('smart-response-router');
      expect(result.intentAnalysis).toBeDefined();
      expect(result.responseTimeMs).toBeDefined();
      expect(typeof result.content).toBe('string');
      expect(result.content.length).toBeGreaterThan(0);
    });

    test('routes payment inquiry to real data response', async () => {
      const ctx = buildCandidateContext();
      const data = buildRealData();

      router.dataAccess.getCandidateContext.mockResolvedValue(ctx);
      router.dataAccess.getRealCandidateData.mockResolvedValue(data);
      router.dataAccess.validateDataAvailability.mockResolvedValue(true);

      const result = await router.processMessage('C100', 'When will I get paid?');

      expect(result.intentAnalysis.primary).toBe('payment_inquiry');
      expect(result.usesRealData).toBe(true);
      expect(result.content).toContain('Alice');
    });

    test('routes pending candidate to scheduling bridge', async () => {
      const ctx = buildCandidateContext({ status: 'pending' });

      router.dataAccess.getCandidateContext.mockResolvedValue(ctx);
      router.dataAccess.getRealCandidateData.mockResolvedValue(null);

      const result = await router.processMessage('C100', 'I want to schedule an interview');

      // Should be routed through SLM bridge or escalated
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');
    });

    test('returns critical error response when processMessage throws', async () => {
      router.dataAccess.getCandidateContext.mockRejectedValue(new Error('DB down'));
      router.dataAccess.getRealCandidateData.mockRejectedValue(new Error('DB down'));

      const result = await router.processMessage('C100', 'hello');

      expect(result.error).toBe(true);
      expect(result.source).toBe('critical_error_fallback');
      expect(result.escalated).toBe(true);
      expect(result.requiresAdminAttention).toBe(true);
    });
  });

  // ------------------------------------------
  // Loop prevention
  // ------------------------------------------
  describe('loop prevention', () => {
    test('prevents duplicate concurrent requests', async () => {
      const ctx = buildCandidateContext();
      router.dataAccess.getCandidateContext.mockResolvedValue(ctx);
      router.dataAccess.getRealCandidateData.mockResolvedValue(buildRealData());

      // Simulate an active request by pre-populating the map
      const requestKey = `C100_${router.hashString('hello')}`;
      router.activeRequests.set(requestKey, Date.now());

      const result = await router.processMessage('C100', 'hello');

      expect(result.source).toBe('critical_error_fallback');
      expect(result.error).toBe(true);
    });

    test('prevents exceeding max request depth', async () => {
      router.dataAccess.getCandidateContext.mockResolvedValue(buildCandidateContext());
      router.dataAccess.getRealCandidateData.mockResolvedValue(buildRealData());

      const result = await router.processMessage('C100', 'hello', { requestDepth: 3 });

      expect(result.source).toBe('critical_error_fallback');
      expect(result.error).toBe(true);
    });

    test('cleans up active requests after processing', async () => {
      router.dataAccess.getCandidateContext.mockResolvedValue(buildCandidateContext());
      router.dataAccess.getRealCandidateData.mockResolvedValue(buildRealData());

      await router.processMessage('C100', 'hello');

      const requestKey = `C100_${router.hashString('hello')}`;
      expect(router.activeRequests.has(requestKey)).toBe(false);
    });
  });

  // ------------------------------------------
  // routeToResponseSystem
  // ------------------------------------------
  describe('routeToResponseSystem', () => {
    test('routes to escalation when confidence is below threshold', async () => {
      const ctx = buildCandidateContext();
      const data = buildRealData();
      const intent = {
        primary: 'general_question',
        confidence: 0.1,
        requiresRealData: false,
        requiresEscalation: false
      };

      const result = await router.routeToResponseSystem(ctx, data, intent, 'something unclear', {});

      expect(result.escalated).toBe(true);
      expect(result.requiresAdminAttention).toBe(true);
    });

    test('routes to escalation when requiresEscalation is true', async () => {
      const ctx = buildCandidateContext();
      const data = buildRealData();
      const intent = {
        primary: 'complaint_feedback',
        confidence: 0.9,
        requiresRealData: false,
        requiresEscalation: true,
        escalationReason: 'complaints'
      };

      const result = await router.routeToResponseSystem(ctx, data, intent, 'I am angry', {});

      expect(result.escalated).toBe(true);
    });

    test('routes to fact-based real data when requiresRealData is true and confidence is high', async () => {
      const ctx = buildCandidateContext();
      const data = buildRealData();
      const intent = {
        primary: 'payment_inquiry',
        confidence: 0.9,
        requiresRealData: true,
        requiresEscalation: false
      };

      router.dataAccess.validateDataAvailability.mockResolvedValue(true);

      const result = await router.routeToResponseSystem(ctx, data, intent, 'payment status', {});

      expect(result.source).toBe('fact_based_real_data');
      expect(result.usesRealData).toBe(true);
    });

    test('routes to template system when confidence >= 0.7 and no real data needed', async () => {
      const ctx = buildCandidateContext();
      const data = buildRealData();
      const intent = {
        primary: 'greeting',
        confidence: 0.85,
        requiresRealData: false,
        requiresEscalation: false
      };

      const result = await router.routeToResponseSystem(ctx, data, intent, 'hello', {});

      expect(result.content).toBeDefined();
      // greeting template does not require escalation
      expect(result.source).toMatch(/fact_based_template|pending_candidate_template|fallback_template/);
    });

    test('falls back to escalation when confidence between 0.3 and 0.7 and no real data', async () => {
      const ctx = buildCandidateContext();
      const data = buildRealData();
      const intent = {
        primary: 'general_question',
        confidence: 0.5,
        requiresRealData: false,
        requiresEscalation: false
      };

      const result = await router.routeToResponseSystem(ctx, data, intent, 'some vague question', {});

      // Confidence < 0.7 and no other condition -> escalation fallback
      expect(result.escalated).toBe(true);
    });
  });

  // ------------------------------------------
  // generateFactBasedRealDataResponse
  // ------------------------------------------
  describe('generateFactBasedRealDataResponse', () => {
    test('escalates when required data is not available', async () => {
      const ctx = buildCandidateContext();
      const data = buildRealData({ pendingEarnings: 0, paidEarnings: 0, availableEarnings: 0 });
      const intent = { primary: 'payment_inquiry', confidence: 0.9 };

      router.dataAccess.validateDataAvailability.mockResolvedValue(false);

      const result = await router.generateFactBasedRealDataResponse(ctx, data, intent, 'my payment?');

      expect(result.escalated).toBe(true);
      expect(result.requiresAdminAttention).toBe(true);
    });

    test('generates real data response when data is available', async () => {
      const ctx = buildCandidateContext();
      const data = buildRealData();
      const intent = { primary: 'balance_check', confidence: 0.95 };

      router.dataAccess.validateDataAvailability.mockResolvedValue(true);

      const result = await router.generateFactBasedRealDataResponse(ctx, data, intent, 'check balance');

      expect(result.usesRealData).toBe(true);
      expect(result.content).toContain('Alice');
    });

    test('escalates on data access error', async () => {
      const ctx = buildCandidateContext();
      const intent = { primary: 'payment_inquiry', confidence: 0.9 };

      router.dataAccess.validateDataAvailability.mockRejectedValue(new Error('DB error'));

      const result = await router.generateFactBasedRealDataResponse(ctx, null, intent, 'payment?');

      expect(result.escalated).toBe(true);
    });
  });

  // ------------------------------------------
  // Quality check
  // ------------------------------------------
  describe('performQualityCheck', () => {
    test('passes clean response through unchanged', async () => {
      const response = { content: 'Hello, how can I help you today?', source: 'template' };
      const intent = { primary: 'greeting' };

      const result = await router.performQualityCheck(response, intent);

      expect(result.content).toBe(response.content);
      expect(result.qualityCheckFailed).toBeUndefined();
    });

    test('replaces response containing false promise phrases', async () => {
      const response = { content: 'Your funds will be processed in 24 hours with guaranteed payment.', source: 'template' };
      const intent = { primary: 'payment_inquiry' };

      const result = await router.performQualityCheck(response, intent);

      expect(result.qualityCheckFailed).toBe(true);
      expect(result.source).toBe('quality_check_escalation');
      expect(result.content).toContain('accurate information');
    });

    test('detects "automatic approval" as problematic', async () => {
      const response = { content: 'Your account has automatic approval.', source: 'template' };
      const intent = { primary: 'account_verification' };

      const result = await router.performQualityCheck(response, intent);

      expect(result.qualityCheckFailed).toBe(true);
    });

    test('detects "instant approval" as problematic', async () => {
      const response = { content: 'You will receive instant approval for your request.', source: 'template' };
      const intent = { primary: 'account_verification' };

      const result = await router.performQualityCheck(response, intent);

      expect(result.qualityCheckFailed).toBe(true);
    });

    test('skips quality check when preventFalsePromises is disabled', async () => {
      router.routingConfig.preventFalsePromises = false;
      const response = { content: 'Your funds will be processed in 1 hour with guaranteed payment.', source: 'template' };
      const intent = { primary: 'payment_inquiry' };

      const result = await router.performQualityCheck(response, intent);

      expect(result.qualityCheckFailed).toBeUndefined();
      expect(result.content).toBe(response.content);
    });
  });

  // ------------------------------------------
  // verifySLMResponse
  // ------------------------------------------
  describe('verifySLMResponse', () => {
    test('returns true for valid SLM response', () => {
      const response = { content: 'Welcome! How can I help you today?', type: 'greeting' };
      expect(router.verifySLMResponse(response)).toBe(true);
    });

    test('returns false for null response', () => {
      expect(router.verifySLMResponse(null)).toBe(false);
    });

    test('returns false for response with empty content', () => {
      expect(router.verifySLMResponse({ content: '', type: 'greeting' })).toBe(false);
    });

    test('returns false for response missing type', () => {
      expect(router.verifySLMResponse({ content: 'Hello there' })).toBe(false);
    });

    test('returns false for very short content (<10 chars)', () => {
      expect(router.verifySLMResponse({ content: 'Hi', type: 'greeting' })).toBe(false);
    });

    test('returns false for error type response', () => {
      expect(router.verifySLMResponse({ content: 'Something went wrong', type: 'error' })).toBe(false);
    });

    test('returns false for non-object input', () => {
      expect(router.verifySLMResponse('just a string')).toBe(false);
    });
  });

  // ------------------------------------------
  // hashString
  // ------------------------------------------
  describe('hashString', () => {
    test('returns a non-negative integer', () => {
      const hash = router.hashString('test input');
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
    });

    test('returns deterministic output for same input', () => {
      expect(router.hashString('hello')).toBe(router.hashString('hello'));
    });

    test('produces different hashes for different inputs', () => {
      expect(router.hashString('hello')).not.toBe(router.hashString('world'));
    });

    test('handles empty string', () => {
      const hash = router.hashString('');
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBe(0);
    });
  });

  // ------------------------------------------
  // shouldUseSmartRouter (A/B testing)
  // ------------------------------------------
  describe('shouldUseSmartRouter', () => {
    test('returns true when rollout is 100%', () => {
      router.routingConfig.rolloutPercentage = 100;
      expect(router.shouldUseSmartRouter('C100')).toBe(true);
    });

    test('returns false when rollout is 0%', () => {
      router.routingConfig.rolloutPercentage = 0;
      expect(router.shouldUseSmartRouter('C100')).toBe(false);
    });

    test('returns consistent result for same candidate at partial rollout', () => {
      router.routingConfig.rolloutPercentage = 50;
      const first = router.shouldUseSmartRouter('C100');
      const second = router.shouldUseSmartRouter('C100');
      expect(first).toBe(second);
    });
  });

  // ------------------------------------------
  // generateErrorResponse
  // ------------------------------------------
  describe('generateErrorResponse', () => {
    test('returns candidate_not_found message', () => {
      const result = router.generateErrorResponse('candidate_not_found');
      expect(result.error).toBe(true);
      expect(result.content).toContain('profile');
      expect(result.requiresAdminAttention).toBe(true);
    });

    test('returns system_error message for unknown error type', () => {
      const result = router.generateErrorResponse('unknown_type');
      expect(result.error).toBe(true);
      expect(result.content).toContain('technical difficulties');
    });
  });

  // ------------------------------------------
  // generateCriticalErrorResponse
  // ------------------------------------------
  describe('generateCriticalErrorResponse', () => {
    test('returns safe fallback with escalation flags', () => {
      const result = router.generateCriticalErrorResponse('C100', new Error('fatal'));
      expect(result.source).toBe('critical_error_fallback');
      expect(result.error).toBe(true);
      expect(result.escalated).toBe(true);
      expect(result.requiresAdminAttention).toBe(true);
      expect(result.content).toContain('technical difficulties');
    });
  });

  // ------------------------------------------
  // logWithRateLimit
  // ------------------------------------------
  describe('logWithRateLimit', () => {
    test('allows initial log calls through', () => {
      // Should not throw
      expect(() => {
        router.logWithRateLimit('info', 'test message', { candidateId: 'C1' });
      }).not.toThrow();
    });

    test('enforces rate limiting after max calls', () => {
      // Call enough times to exceed maxLogsPerWindow (5)
      for (let i = 0; i < 10; i++) {
        router.logWithRateLimit('info', 'repeated message', { candidateId: 'C1' });
      }
      // Rate limiter map should have entries
      expect(router.logRateLimiter.size).toBeGreaterThan(0);
    });

    test('cleans up old entries when map exceeds 1000', () => {
      // Populate with 1001 stale entries
      const oldTime = Date.now() - 100000;
      for (let i = 0; i < 1001; i++) {
        router.logRateLimiter.set(i, { count: 1, lastReset: oldTime });
      }

      router.logWithRateLimit('info', 'trigger cleanup', { candidateId: 'C1' });

      // After cleanup, stale entries should be removed
      expect(router.logRateLimiter.size).toBeLessThan(1001);
    });
  });

  // ------------------------------------------
  // logRoutingDecision
  // ------------------------------------------
  describe('logRoutingDecision', () => {
    test('does nothing when logAllDecisions is false', async () => {
      router.routingConfig.logAllDecisions = false;
      const { __mocks } = require('../../db');

      __mocks.prepareFn.mockClear();

      await router.logRoutingDecision('C100', 'hello', { primary: 'greeting', confidence: 0.9 }, { source: 'template', escalated: false });

      // prepare should not have been called for logging
      expect(__mocks.prepareFn).not.toHaveBeenCalled();
    });

    test('handles database write errors gracefully', async () => {
      router.routingConfig.logAllDecisions = true;
      const { __mocks } = require('../../db');

      __mocks.prepareFn.mockImplementationOnce(() => {
        throw new Error('DB write failure');
      });

      // Should not throw
      await expect(
        router.logRoutingDecision('C100', 'hello', { primary: 'greeting', confidence: 0.9 }, { source: 'template', escalated: false })
      ).resolves.not.toThrow();
    });
  });

  // ------------------------------------------
  // handlePendingCandidateScheduling
  // ------------------------------------------
  describe('handlePendingCandidateScheduling', () => {
    test('returns SLM bridge response for valid scheduling', async () => {
      const ctx = buildCandidateContext({ status: 'pending' });
      const intent = { primary: 'interview_scheduling', confidence: 0.9 };

      const result = await router.handlePendingCandidateScheduling(ctx, 'schedule interview', intent);

      expect(result.content).toBeDefined();
      expect(result.slmBridgeUsed).toBe(true);
      expect(result.isPendingUser).toBe(true);
      expect(result.canScheduleInterview).toBe(true);
    });

    test('escalates when SLM bridge returns invalid response', async () => {
      const ctx = buildCandidateContext({ status: 'pending' });
      const intent = { primary: 'interview_scheduling', confidence: 0.9 };

      // Override the scheduling bridge to return invalid response
      router.schedulingBridge.handlePendingCandidateMessage = jest.fn().mockResolvedValue(null);

      const result = await router.handlePendingCandidateScheduling(ctx, 'schedule interview', intent);

      expect(result.escalated).toBe(true);
      expect(result.requiresAdminAttention).toBe(true);
    });

    test('escalates when SLM bridge throws an error', async () => {
      const ctx = buildCandidateContext({ status: 'pending' });
      const intent = { primary: 'interview_scheduling', confidence: 0.9 };

      router.schedulingBridge.handlePendingCandidateMessage = jest.fn().mockRejectedValue(new Error('SLM crash'));

      const result = await router.handlePendingCandidateScheduling(ctx, 'schedule interview', intent);

      expect(result.escalated).toBe(true);
      expect(result.requiresAdminAttention).toBe(true);
    });
  });

  // ------------------------------------------
  // fallbackToOldSystem
  // ------------------------------------------
  describe('fallbackToOldSystem', () => {
    test('returns failsafe response when old system throws', async () => {
      const oldAI = require('../../services/ai-chat');
      oldAI.generateResponse.mockRejectedValueOnce(new Error('old system broken'));

      const result = await router.fallbackToOldSystem('C100', 'hello', {});

      expect(result.source).toBe('failsafe_system_failure');
      expect(result.error).toBe(true);
      expect(result.systemFailure).toBe(true);
    });
  });
});
