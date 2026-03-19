/**
 * Unit Tests: DataLifecycleManager & GeBIZRSSOrchestrator
 *
 * Tests staging table insertion, existence checks, value estimation,
 * urgency determination, tag generation, and the full orchestrator pipeline.
 * All external dependencies (HTTP, database, email) are mocked.
 */

// ---------------------------------------------------------------------------
// Mock setup — must come before any require() that touches the mocked modules
// ---------------------------------------------------------------------------

// Mock the database module
const mockDbPrepare = jest.fn();
const mockDb = { prepare: mockDbPrepare };
jest.mock('../../db', () => ({ db: mockDb }));

// Mock structured-logger so services don't write to stdout
jest.mock('../../utils/structured-logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock rate-limiter-flexible
const mockRateLimiterConsume = jest.fn().mockResolvedValue(true);
jest.mock('rate-limiter-flexible', () => ({
  RateLimiterMemory: jest.fn().mockImplementation(() => ({
    consume: mockRateLimiterConsume,
  })),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

// Mock nodemailer
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
const mockVerify = jest.fn().mockResolvedValue(true);
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    sendMail: mockSendMail,
    verify: mockVerify,
  })),
}));

// Mock https so fetchHTML never hits the network
jest.mock('https', () => {
  const EventEmitter = require('events');

  return {
    request: jest.fn((options, callback) => {
      const req = new EventEmitter();
      req.end = jest.fn();
      req.destroy = jest.fn();

      // Store callback so individual tests can trigger it
      req._callback = callback;
      req._options = options;

      // Default: resolve in next tick with empty 200 response
      process.nextTick(() => {
        if (!req._handled) {
          const res = new EventEmitter();
          res.statusCode = 200;
          res.statusMessage = 'OK';
          res.headers = {};
          callback(res);
          res.emit('data', '<html></html>');
          res.emit('end');
        }
      });

      return req;
    }),
  };
});

// ---------------------------------------------------------------------------
// Imports under test
// ---------------------------------------------------------------------------

const DataLifecycleManager = require('../../services/scraping/dataLifecycleManager');
const GeBIZRSSOrchestrator = require('../../services/scraping/gebizRssOrchestrator');

// ============================================================================
// DataLifecycleManager
// ============================================================================

describe('DataLifecycleManager', () => {
  let manager;

  beforeEach(() => {
    manager = new DataLifecycleManager();
    jest.clearAllMocks();
  });

  // ------------------------------------------------------------------
  // insertToStagingTable
  // ------------------------------------------------------------------

  describe('insertToStagingTable', () => {
    const makeTender = (overrides = {}) => ({
      tender_no: 'PUB001',
      title: 'Cleaning Services for Government Building',
      agency: 'Public Utilities Board',
      closing_date: '2026-04-15',
      published_date: '2026-03-10',
      category: 'cleaning_services',
      source_url: 'https://www.gebiz.gov.sg/ptn/opportunity/directlink.xhtml?docCode=PUB001',
      description: 'Cleaning services tender',
      priority: 'medium',
      ...overrides,
    });

    test('inserts new tenders and returns created count', async () => {
      // stagingTenderExists => false
      mockDbPrepare
        .mockReturnValueOnce({ run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 101 }) }) // INSERT stmt
        .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ count: 0 }) }); // existence check

      const result = await manager.insertToStagingTable([makeTender()]);

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.createdIds).toContain(101);
    });

    test('skips tenders that already exist in staging table', async () => {
      // INSERT stmt prepared first, then existence check returns true
      mockDbPrepare
        .mockReturnValueOnce({ run: jest.fn() }) // INSERT stmt (won't be called)
        .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ count: 1 }) }); // exists

      const result = await manager.insertToStagingTable([makeTender()]);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
    });

    test('handles INSERT OR IGNORE duplicates at DB level', async () => {
      mockDbPrepare
        .mockReturnValueOnce({ run: jest.fn().mockReturnValue({ changes: 0 }) }) // INSERT returns 0 changes
        .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ count: 0 }) }); // existence check

      const result = await manager.insertToStagingTable([makeTender()]);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
    });

    test('handles empty input array', async () => {
      mockDbPrepare.mockReturnValueOnce({ run: jest.fn() }); // INSERT stmt prepared

      const result = await manager.insertToStagingTable([]);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
    });

    test('throws on null input', async () => {
      await expect(manager.insertToStagingTable(null)).rejects.toThrow('Invalid tenders data provided');
    });

    test('throws on non-array input', async () => {
      await expect(manager.insertToStagingTable('not-an-array')).rejects.toThrow('Invalid tenders data provided');
    });

    test('records errors for tenders that fail insertion', async () => {
      mockDbPrepare
        .mockReturnValueOnce({
          run: jest.fn().mockImplementation(() => {
            throw new Error('SQLITE_CONSTRAINT');
          }),
        })
        .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ count: 0 }) });

      const result = await manager.insertToStagingTable([makeTender()]);

      expect(result.errors).toBe(1);
      expect(result.errorDetails).toHaveLength(1);
      expect(result.errorDetails[0].error).toMatch(/SQLITE_CONSTRAINT/);
    });

    test('processes multiple tenders with mixed outcomes', async () => {
      const tenders = [
        makeTender({ tender_no: 'NEW001' }),
        makeTender({ tender_no: 'EXISTING002' }),
        makeTender({ tender_no: 'NEW003' }),
      ];

      const insertMock = jest.fn()
        .mockReturnValueOnce({ changes: 1, lastInsertRowid: 201 })  // NEW001 inserted
        .mockReturnValueOnce({ changes: 1, lastInsertRowid: 203 }); // NEW003 inserted

      mockDbPrepare
        .mockReturnValueOnce({ run: insertMock }) // INSERT stmt
        .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ count: 0 }) })  // NEW001 not exists
        .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ count: 1 }) })  // EXISTING002 exists
        .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ count: 0 }) }); // NEW003 not exists

      const result = await manager.insertToStagingTable(tenders);

      expect(result.created).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.errors).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  // createLifecycleCards (backward-compatible alias)
  // ------------------------------------------------------------------

  describe('createLifecycleCards', () => {
    test('delegates to insertToStagingTable', async () => {
      const spy = jest.spyOn(manager, 'insertToStagingTable').mockResolvedValue({
        created: 1, skipped: 0, errors: 0, createdIds: [1], errorDetails: [],
      });

      const tenders = [{ tender_no: 'X001', title: 'Test' }];
      await manager.createLifecycleCards(tenders);

      expect(spy).toHaveBeenCalledWith(tenders);
      spy.mockRestore();
    });
  });

  // ------------------------------------------------------------------
  // stagingTenderExists / lifecycleCardExists
  // ------------------------------------------------------------------

  describe('existence checks', () => {
    test('stagingTenderExists returns true when count > 0', async () => {
      mockDbPrepare.mockReturnValue({ get: jest.fn().mockReturnValue({ count: 1 }) });
      expect(await manager.stagingTenderExists('PUB001')).toBe(true);
    });

    test('stagingTenderExists returns false when count is 0', async () => {
      mockDbPrepare.mockReturnValue({ get: jest.fn().mockReturnValue({ count: 0 }) });
      expect(await manager.stagingTenderExists('PUB001')).toBe(false);
    });

    test('stagingTenderExists returns false on DB error', async () => {
      mockDbPrepare.mockImplementation(() => { throw new Error('DB error'); });
      expect(await manager.stagingTenderExists('PUB001')).toBe(false);
    });

    test('lifecycleCardExists returns true when count > 0', async () => {
      mockDbPrepare.mockReturnValue({ get: jest.fn().mockReturnValue({ count: 1 }) });
      expect(await manager.lifecycleCardExists('PUB001')).toBe(true);
    });

    test('lifecycleCardExists returns false when count is 0', async () => {
      mockDbPrepare.mockReturnValue({ get: jest.fn().mockReturnValue({ count: 0 }) });
      expect(await manager.lifecycleCardExists('PUB001')).toBe(false);
    });

    test('lifecycleCardExists returns false on DB error', async () => {
      mockDbPrepare.mockImplementation(() => { throw new Error('DB error'); });
      expect(await manager.lifecycleCardExists('PUB001')).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // estimateValue
  // ------------------------------------------------------------------

  describe('estimateValue', () => {
    test('returns base value for general_services category', () => {
      const value = manager.estimateValue({
        title: 'Generic procurement',
        description: 'Standard order',
        category: 'general_services',
        agency: 'SLA',
      });
      expect(value).toBeGreaterThanOrEqual(20000);
      expect(value).toBeLessThanOrEqual(10000000);
    });

    test('applies higher base for manpower_services', () => {
      const generalValue = manager.estimateValue({
        title: 'Generic procurement',
        description: '',
        category: 'general_services',
        agency: 'SLA',
      });
      const manpowerValue = manager.estimateValue({
        title: 'Generic procurement',
        description: '',
        category: 'manpower_services',
        agency: 'SLA',
      });
      expect(manpowerValue).toBeGreaterThan(generalValue);
    });

    test('applies multiplier for high-value agencies', () => {
      const normalValue = manager.estimateValue({
        title: 'Test tender',
        description: '',
        category: 'general_services',
        agency: 'SLA',
      });
      const highValue = manager.estimateValue({
        title: 'Test tender',
        description: '',
        category: 'general_services',
        agency: 'MOH',
      });
      expect(highValue).toBeGreaterThan(normalValue);
    });

    test('caps value at 10M SGD', () => {
      const value = manager.estimateValue({
        title: 'Urgent island-wide 24/7 large scale specialist manager senior',
        description: 'nationwide bulk permanent',
        category: 'facility_management',
        agency: 'MOH',
      });
      expect(value).toBeLessThanOrEqual(10000000);
    });

    test('enforces minimum of 20K SGD', () => {
      const value = manager.estimateValue({
        title: 'Small item',
        description: '',
        category: 'event_management',
        agency: 'SLA',
      });
      expect(value).toBeGreaterThanOrEqual(20000);
    });
  });

  // ------------------------------------------------------------------
  // determineUrgency
  // ------------------------------------------------------------------

  describe('determineUrgency', () => {
    test('returns true for urgent keyword in title', () => {
      expect(manager.determineUrgency({
        title: 'Urgent cleaning services required',
        description: '',
        closing_date: '2027-12-31',
      })).toBe(true);
    });

    test('returns true when closing date is within 10 days', () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 5);
      expect(manager.determineUrgency({
        title: 'Standard procurement',
        description: '',
        closing_date: soon.toISOString().split('T')[0],
      })).toBe(true);
    });

    test('returns false for non-urgent tender with distant closing date', () => {
      expect(manager.determineUrgency({
        title: 'Standard procurement of items',
        description: 'Regular order',
        closing_date: '2027-12-31',
      })).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // generateTags
  // ------------------------------------------------------------------

  describe('generateTags', () => {
    test('includes category, agency, priority, and source tags', () => {
      const tags = manager.generateTags({
        title: 'Cleaning services',
        description: '',
        category: 'cleaning_services',
        agency: 'NEA',
        priority: 'medium',
      });

      expect(tags).toContain('cleaning services');
      expect(tags).toContain('NEA');
      expect(tags).toContain('priority-medium');
      expect(tags).toContain('rss-import');
    });

    test('adds keyword-based tags from title/description', () => {
      const tags = manager.generateTags({
        title: 'Security guard outsourcing',
        description: 'Night shift work',
        category: 'security_services',
        agency: 'SPF',
        priority: 'high',
      });

      expect(tags).toContain('security');
      expect(tags).toContain('outsourcing');
      expect(tags).toContain('night-shift');
    });

    test('limits to 10 tags', () => {
      const tags = manager.generateTags({
        title: 'Security cleaning manpower catering event transport facility maintenance outsourcing bpo staffing hr temporary contract part-time full-time shift weekend night 24/7',
        description: 'cbd jurong tampines woodlands changi marina bay orchard bugis raffles place',
        category: 'general_services',
        agency: 'HDB',
        priority: 'critical',
      });

      expect(tags.length).toBeLessThanOrEqual(10);
    });

    test('omits Unknown agency from tags', () => {
      const tags = manager.generateTags({
        title: 'Test tender',
        description: '',
        category: 'general_services',
        agency: 'Unknown',
        priority: 'low',
      });

      expect(tags).not.toContain('Unknown');
    });
  });
});

// ============================================================================
// GeBIZRSSOrchestrator
// ============================================================================

describe('GeBIZRSSOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    jest.clearAllMocks();
    // Disable email during tests
    process.env.EMAIL_NOTIFICATIONS_ENABLED = 'false';

    orchestrator = new GeBIZRSSOrchestrator();
    orchestrator.transporter = null; // Ensure no email calls
  });

  // ------------------------------------------------------------------
  // runCompleteScrapingPipeline — disabled portal
  // ------------------------------------------------------------------

  describe('runCompleteScrapingPipeline - disabled portal', () => {
    test('skips scraping when GeBIZ portal is disabled', async () => {
      mockDbPrepare.mockReturnValueOnce({
        get: jest.fn().mockReturnValue({ enabled: 0 }),
      });

      const result = await orchestrator.runCompleteScrapingPipeline();

      expect(result.skipped).toBe(true);
      expect(result.reason).toMatch(/disabled/i);
    });
  });

  // ------------------------------------------------------------------
  // runCompleteScrapingPipeline — happy path
  // ------------------------------------------------------------------

  describe('runCompleteScrapingPipeline - happy path', () => {
    test('orchestrates parse -> stage -> notify flow', async () => {
      // Mock portal check: enabled
      const portalGetMock = jest.fn().mockReturnValue({ enabled: 1 });

      // Mock job log insert
      const jobLogRunMock = jest.fn().mockReturnValue({ lastInsertRowid: 1 });

      // Mock job log update
      const jobLogUpdateMock = jest.fn().mockReturnValue({ changes: 1 });

      // Mock portal timestamp update
      const portalUpdateMock = jest.fn().mockReturnValue({ changes: 1 });

      mockDbPrepare
        .mockReturnValueOnce({ get: portalGetMock })        // portal check
        .mockReturnValueOnce({ run: jobLogRunMock });        // job log start

      // Stub the parser to return controlled results
      const mockParseResult = {
        success: true,
        newTenders: 1,
        duplicates: 0,
        errors: 0,
        validatedTenders: [
          {
            tender_no: 'PUB001',
            title: 'Provision of Cleaning Services for Government Buildings',
            agency: 'Public Utilities Board',
            description: 'Cleaning tender',
            category: 'cleaning_services',
            published_date: '2026-03-10',
            closing_date: '2026-04-15',
            source_url: 'https://www.gebiz.gov.sg/ptn/opportunity/directlink.xhtml?docCode=PUB001',
            priority: 'medium',
          },
        ],
        feedMetadata: { totalItems: 1 },
        stats: {},
      };

      jest.spyOn(orchestrator.parser, 'parseRSSFeed').mockResolvedValue(mockParseResult);

      // Stub lifecycle manager
      jest.spyOn(orchestrator.lifecycleManager, 'insertToStagingTable').mockResolvedValue({
        created: 1,
        skipped: 0,
        errors: 0,
        createdIds: [101],
        errorDetails: [],
      });

      // Additional DB calls from logScrapingJobComplete and portal update
      mockDbPrepare
        .mockReturnValueOnce({ run: jobLogUpdateMock })   // job log complete
        .mockReturnValueOnce({ run: portalUpdateMock });   // portal timestamp update

      const result = await orchestrator.runCompleteScrapingPipeline();

      expect(result.success).toBe(true);
      expect(result.summary.newTenders).toBe(1);
      expect(result.summary.stagingRecordsCreated).toBe(1);
      expect(result.stages.parsing).toBeDefined();
      expect(result.stages.lifecycle).toBeDefined();
      expect(result.stages.notifications).toBeDefined();
      expect(orchestrator.parser.parseRSSFeed).toHaveBeenCalledTimes(1);
      expect(orchestrator.lifecycleManager.insertToStagingTable).toHaveBeenCalledWith(
        mockParseResult.validatedTenders
      );
    });
  });

  // ------------------------------------------------------------------
  // runCompleteScrapingPipeline — no new tenders
  // ------------------------------------------------------------------

  describe('runCompleteScrapingPipeline - no new tenders', () => {
    test('skips staging when parser returns no validated tenders', async () => {
      mockDbPrepare
        .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ enabled: 1 }) })  // portal
        .mockReturnValueOnce({ run: jest.fn().mockReturnValue({ lastInsertRowid: 1 }) }); // job log

      jest.spyOn(orchestrator.parser, 'parseRSSFeed').mockResolvedValue({
        success: true,
        newTenders: 0,
        duplicates: 5,
        errors: 0,
        validatedTenders: [],
        feedMetadata: { totalItems: 5 },
        stats: {},
      });

      const stagingSpy = jest.spyOn(orchestrator.lifecycleManager, 'insertToStagingTable');

      // logScrapingJobComplete + portal update
      mockDbPrepare
        .mockReturnValueOnce({ run: jest.fn() })
        .mockReturnValueOnce({ run: jest.fn() });

      const result = await orchestrator.runCompleteScrapingPipeline();

      expect(result.success).toBe(true);
      expect(result.stages.lifecycle.created).toBe(0);
      expect(result.stages.lifecycle.message).toMatch(/No new tenders/);
      expect(stagingSpy).not.toHaveBeenCalled();
      stagingSpy.mockRestore();
    });
  });

  // ------------------------------------------------------------------
  // runCompleteScrapingPipeline — error handling
  // ------------------------------------------------------------------

  describe('runCompleteScrapingPipeline - error handling', () => {
    test('throws when already running (re-entrancy guard)', async () => {
      orchestrator.isRunning = true;

      await expect(orchestrator.runCompleteScrapingPipeline()).rejects.toThrow(
        'RSS scraping pipeline is already running'
      );
    });

    test('resets isRunning flag after parsing failure', async () => {
      mockDbPrepare
        .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ enabled: 1 }) })
        .mockReturnValueOnce({ run: jest.fn().mockReturnValue({ lastInsertRowid: 1 }) });

      jest.spyOn(orchestrator.parser, 'parseRSSFeed').mockRejectedValue(
        new Error('Network timeout')
      );

      await expect(orchestrator.runCompleteScrapingPipeline()).rejects.toThrow('Network timeout');
      expect(orchestrator.isRunning).toBe(false);
    });

    test('resets isRunning flag after staging failure', async () => {
      mockDbPrepare
        .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ enabled: 1 }) })
        .mockReturnValueOnce({ run: jest.fn().mockReturnValue({ lastInsertRowid: 1 }) });

      jest.spyOn(orchestrator.parser, 'parseRSSFeed').mockResolvedValue({
        success: true,
        newTenders: 1,
        duplicates: 0,
        errors: 0,
        validatedTenders: [{ tender_no: 'X001', title: 'Test tender', priority: 'medium' }],
        feedMetadata: { totalItems: 1 },
        stats: {},
      });

      jest.spyOn(orchestrator.lifecycleManager, 'insertToStagingTable').mockRejectedValue(
        new Error('Database locked')
      );

      await expect(orchestrator.runCompleteScrapingPipeline()).rejects.toThrow('Database locked');
      expect(orchestrator.isRunning).toBe(false);
    });

    test('continues if portal check table does not exist', async () => {
      // First db.prepare throws (scraping_portals table missing)
      mockDbPrepare
        .mockImplementationOnce(() => { throw new Error('no such table: scraping_portals'); })
        .mockReturnValueOnce({ run: jest.fn().mockReturnValue({ lastInsertRowid: 1 }) }); // job log

      jest.spyOn(orchestrator.parser, 'parseRSSFeed').mockResolvedValue({
        success: true,
        newTenders: 0,
        duplicates: 0,
        errors: 0,
        validatedTenders: [],
        feedMetadata: { totalItems: 0 },
        stats: {},
      });

      // logScrapingJobComplete + portal update
      mockDbPrepare
        .mockReturnValueOnce({ run: jest.fn() })
        .mockReturnValueOnce({ run: jest.fn() });

      const result = await orchestrator.runCompleteScrapingPipeline();
      expect(result.success).toBe(true);
    });

    test('notification failures do not cause pipeline failure', async () => {
      mockDbPrepare
        .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ enabled: 1 }) })
        .mockReturnValueOnce({ run: jest.fn().mockReturnValue({ lastInsertRowid: 1 }) });

      jest.spyOn(orchestrator.parser, 'parseRSSFeed').mockResolvedValue({
        success: true,
        newTenders: 1,
        duplicates: 0,
        errors: 0,
        validatedTenders: [
          {
            tender_no: 'PUB001',
            title: 'A valid tender title here for testing purposes',
            agency: 'PUB',
            priority: 'critical',
          },
        ],
        feedMetadata: { totalItems: 1 },
        stats: {},
      });

      jest.spyOn(orchestrator.lifecycleManager, 'insertToStagingTable').mockResolvedValue({
        created: 1, skipped: 0, errors: 0, createdIds: [1], errorDetails: [],
      });

      // Force notification to fail
      jest.spyOn(orchestrator, 'sendNotifications').mockRejectedValue(
        new Error('SMTP connection refused')
      );

      // logScrapingJobComplete + portal update
      mockDbPrepare
        .mockReturnValueOnce({ run: jest.fn() })
        .mockReturnValueOnce({ run: jest.fn() });

      const result = await orchestrator.runCompleteScrapingPipeline();

      // Pipeline should still succeed despite notification error
      expect(result.errors).toContain('Notification stage failed: SMTP connection refused');
      // errors array is non-empty so success will be false, but the pipeline didn't throw
      expect(result.stages.notifications.success).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // sendNotifications
  // ------------------------------------------------------------------

  describe('sendNotifications', () => {
    test('counts high-priority alerts', async () => {
      const pipelineResult = {
        summary: { newTenders: 2, errors: [] },
        stages: {
          parsing: {
            validatedTenders: [
              { priority: 'critical', tender_no: 'A', title: 'Critical', agency: 'MOH' },
              { priority: 'medium', tender_no: 'B', title: 'Normal', agency: 'SLA' },
              { priority: 'high', tender_no: 'C', title: 'High', agency: 'HDB' },
            ],
          },
        },
        errors: [],
      };

      const result = await orchestrator.sendNotifications(pipelineResult);
      expect(result.highPriorityAlerts).toBe(2); // critical + high
    });

    test('does not send email when transporter is null', async () => {
      orchestrator.transporter = null;

      const pipelineResult = {
        summary: { newTenders: 1 },
        stages: { parsing: { validatedTenders: [] } },
        errors: [],
      };

      const result = await orchestrator.sendNotifications(pipelineResult);
      expect(result.emailSent).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // getStatus
  // ------------------------------------------------------------------

  describe('getStatus', () => {
    test('returns current orchestrator status', () => {
      const status = orchestrator.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.totalRuns).toBe(0);
      expect(status.emailConfigured).toBe(false);
      expect(status.parserStats).toBeDefined();
      expect(status.nextScheduledRun).toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // getNextScheduledRun
  // ------------------------------------------------------------------

  describe('getNextScheduledRun', () => {
    test('returns a valid ISO date string', () => {
      const next = orchestrator.getNextScheduledRun();
      expect(() => new Date(next)).not.toThrow();
      expect(new Date(next).getTime()).toBeGreaterThan(Date.now() - 1000);
    });
  });

  // ------------------------------------------------------------------
  // manualTrigger
  // ------------------------------------------------------------------

  describe('manualTrigger', () => {
    test('delegates to runCompleteScrapingPipeline with manual flag', async () => {
      const spy = jest.spyOn(orchestrator, 'runCompleteScrapingPipeline').mockResolvedValue({
        success: true,
      });

      await orchestrator.manualTrigger({ dryRun: true });

      expect(spy).toHaveBeenCalledWith({ dryRun: true, manual: true });
      spy.mockRestore();
    });
  });
});
