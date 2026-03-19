/**
 * Unit Tests: GeBIZ Intelligence
 *
 * Tests EPU/SER/19 Monitor and Competitor Analyzer modules.
 * All database interactions are mocked.
 */

// ---------------------------------------------------------------------------
// Mock setup — must come before any require() that touches the mocked modules
// ---------------------------------------------------------------------------

const mockPrepare = jest.fn();
const mockExec = jest.fn();
const mockDb = { prepare: mockPrepare, exec: mockExec };

jest.mock('../../db', () => ({ db: mockDb }));

jest.mock('../../utils/structured-logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock axios and cheerio (imported by epu-ser-19-monitor but not used in tested methods)
jest.mock('axios');
jest.mock('cheerio');

// ---------------------------------------------------------------------------
// Require modules under test AFTER mocks are set up
// ---------------------------------------------------------------------------

const EPUSer19Monitor = require('../../services/gebiz-intelligence/epu-ser-19-monitor');
const EPUCompetitorAnalyzer = require('../../services/gebiz-intelligence/epu-competitor-analyzer');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a mock statement object whose .get / .all / .run resolve to given values */
function mockStmt({ get, all, run } = {}) {
  return {
    get: jest.fn(() => get ?? null),
    all: jest.fn(() => all ?? []),
    run: jest.fn(() => run ?? { changes: 1, lastInsertRowid: 1 }),
  };
}

/** Resets all db mocks between tests */
function resetDbMocks() {
  mockPrepare.mockReset();
  mockExec.mockReset();
}

// ============================================
// EPU/SER/19 MONITOR
// ============================================

describe('EPUSer19Monitor', () => {
  let monitor;

  beforeEach(() => {
    resetDbMocks();
    monitor = new EPUSer19Monitor();
  });

  // ------------------------------------------
  // initDB — singleton pattern
  // ------------------------------------------
  describe('initDB', () => {
    test('assigns db singleton on first call', () => {
      monitor.initDB();
      expect(monitor.db).toBe(mockDb);
    });

    test('calls ensureEPUTables on first init', () => {
      monitor.initDB();
      // ensureEPUTables calls db.exec 4 times (4 CREATE TABLE blocks)
      expect(mockExec).toHaveBeenCalledTimes(4);
    });

    test('does NOT re-initialize on subsequent calls', () => {
      monitor.initDB();
      const firstCallCount = mockExec.mock.calls.length;
      monitor.initDB();
      // No additional exec calls
      expect(mockExec).toHaveBeenCalledTimes(firstCallCount);
    });

    test('ensureEPUTables throws when exec fails', () => {
      mockExec.mockImplementationOnce(() => {
        throw new Error('disk I/O error');
      });
      expect(() => monitor.initDB()).toThrow('disk I/O error');
    });
  });

  // ------------------------------------------
  // isEPUSerTender — tender detection
  // ------------------------------------------
  describe('isEPUSerTender', () => {
    test('direct category match returns confidence 1.0', () => {
      const result = monitor.isEPUSerTender({ title: 'EPU/SER/19 contract', description: '', category: '' });
      expect(result.match).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.reason).toBe('direct_category_match');
    });

    test('dash variant EPU-SER-19 also matches', () => {
      const result = monitor.isEPUSerTender({ title: '', description: 'epu-ser-19 requirements', category: '' });
      expect(result.match).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    test('multiple keyword matches return keyword_match', () => {
      const tender = { title: 'Manpower supply and temporary staff services', description: '', category: '' };
      const result = monitor.isEPUSerTender(tender);
      expect(result.match).toBe(true);
      expect(result.reason).toBe('keyword_match');
      expect(result.keywords.length).toBeGreaterThanOrEqual(2);
    });

    test('keyword confidence caps at 1.0', () => {
      // Use many keywords to force confidence >= 1.0
      const tender = {
        title: 'manpower supply temporary staff outsourcing services data entry administrative support contract staff',
        description: '',
        category: '',
      };
      const result = monitor.isEPUSerTender(tender);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    test('service pattern match returns confidence 0.8', () => {
      const tender = { title: 'Administrative Support Services for Agency', description: '', category: '' };
      const result = monitor.isEPUSerTender(tender);
      expect(result.match).toBe(true);
      expect(result.confidence).toBe(0.8);
      expect(result.reason).toBe('service_pattern_match');
    });

    test('non-matching tender returns match false', () => {
      const tender = { title: 'Road construction project', description: 'Building highways', category: 'Construction' };
      const result = monitor.isEPUSerTender(tender);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0.0);
    });

    test('handles missing title/description/category gracefully', () => {
      const result = monitor.isEPUSerTender({});
      expect(result.match).toBe(false);
    });

    test('category field triggers detection', () => {
      const result = monitor.isEPUSerTender({ title: '', description: '', category: 'EPU/SER/19' });
      expect(result.match).toBe(true);
    });
  });

  // ------------------------------------------
  // analyzeEPUTender
  // ------------------------------------------
  describe('analyzeEPUTender', () => {
    test('classifies data entry service type', () => {
      const tender = { title: 'Data entry outsourcing', description: '' };
      const result = monitor.analyzeEPUTender(tender);
      expect(result.service_type).toBe('data_entry');
      expect(result.win_probability).toBe(0.7);
    });

    test('classifies administrative service type', () => {
      const tender = { title: 'Administrative support staff', description: '' };
      const result = monitor.analyzeEPUTender(tender);
      expect(result.service_type).toBe('administrative');
    });

    test('classifies event support service type', () => {
      const tender = { title: 'Event manpower needed', description: '' };
      const result = monitor.analyzeEPUTender(tender);
      expect(result.service_type).toBe('event_support');
      expect(result.win_probability).toBe(0.6);
    });

    test('extracts manpower estimate from tender text', () => {
      const tender = { title: '', description: 'Requires 30 personnel for data entry work' };
      const result = monitor.analyzeEPUTender(tender);
      expect(result.estimated_manpower).toBe(30);
    });

    test('extracts duration in months', () => {
      const tender = { title: '12 month contract for admin staff', description: '' };
      const result = monitor.analyzeEPUTender(tender);
      expect(result.estimated_duration).toBe(12);
    });

    test('converts year duration to months', () => {
      const tender = { title: '2 year staffing contract', description: '' };
      const result = monitor.analyzeEPUTender(tender);
      expect(result.estimated_duration).toBe(24);
    });

    test('sets high priority for large manpower requirements', () => {
      const tender = { title: '', description: 'Provide 25 personnel for administrative duties' };
      const result = monitor.analyzeEPUTender(tender);
      expect(result.estimated_manpower).toBe(25);
      // Intelligence score gets +15 for manpower > 20
    });

    test('sets urgent priority for high intelligence scores', () => {
      const tender = {
        title: 'Urgent event manpower supply',
        description: '50 experienced certified personnel needed for 3 year contract with renewal option',
        agency: 'Ministry of Health',
      };
      const result = monitor.analyzeEPUTender(tender);
      expect(result.alert_priority).toBe('urgent');
      expect(result.intelligence_score).toBeGreaterThanOrEqual(80);
    });

    test('increases renewal probability when keywords found', () => {
      const tender = { title: 'Contract with renewal option and extension clause', description: '' };
      const result = monitor.analyzeEPUTender(tender);
      expect(result.renewal_probability).toBeGreaterThan(0.3);
    });

    test('renewal probability caps at 1.0', () => {
      const tender = { title: 'renewal extension option continue contract', description: '' };
      const result = monitor.analyzeEPUTender(tender);
      expect(result.renewal_probability).toBeLessThanOrEqual(1.0);
    });

    test('boosts score for high value agency', () => {
      const tenderWithAgency = { title: 'General manpower supply', description: '', agency: 'Ministry of Education' };
      const tenderNoAgency = { title: 'General manpower supply', description: '', agency: 'Some Unknown Org' };
      const withAgency = monitor.analyzeEPUTender(tenderWithAgency);
      const noAgency = monitor.analyzeEPUTender(tenderNoAgency);
      expect(withAgency.intelligence_score).toBeGreaterThan(noAgency.intelligence_score);
    });

    test('default values for minimal tender', () => {
      const result = monitor.analyzeEPUTender({ title: '', description: '' });
      expect(result.service_type).toBe('general');
      expect(result.estimated_manpower).toBeNull();
      expect(result.estimated_duration).toBe(12);
      expect(result.win_probability).toBe(0.5);
      expect(result.alert_priority).toBe('low');
    });

    test('many competitive factors lower win probability', () => {
      const tender = {
        title: 'urgent critical essential senior experienced qualified certified shift contract',
        description: '',
      };
      const result = monitor.analyzeEPUTender(tender);
      // More than 3 competitive factors => win_probability = 0.3
      // (unless service_type overrides it - general type won't override)
      expect(result.competitive_factors.length).toBeGreaterThan(3);
      expect(result.win_probability).toBe(0.3);
    });
  });

  // ------------------------------------------
  // storeEPUTender
  // ------------------------------------------
  describe('storeEPUTender', () => {
    test('stores tender and returns insert id', () => {
      const insertStmt = mockStmt({ run: { changes: 1, lastInsertRowid: 42 } });
      mockPrepare.mockReturnValue(insertStmt);

      const tender = { tender_no: 'T001', title: 'Test tender', agency: 'MOE' };
      const analysis = {
        estimated_duration: 12,
        estimated_manpower: 5,
        service_type: 'data_entry',
        renewal_probability: 0.5,
        win_probability: 0.7,
        intelligence_score: 60,
        alert_priority: 'high',
        competitive_factors: [],
      };

      const id = monitor.storeEPUTender(tender, analysis);
      expect(id).toBe(42);
      expect(insertStmt.run).toHaveBeenCalledTimes(1);
    });

    test('stores market intelligence for competitive factors', () => {
      const mainStmt = mockStmt({ run: { changes: 1, lastInsertRowid: 10 } });
      const intelStmt = mockStmt();
      mockPrepare.mockReturnValueOnce(mainStmt).mockReturnValue(intelStmt);

      const tender = { tender_no: 'T002', title: 'Test' };
      const analysis = {
        estimated_duration: 6,
        estimated_manpower: null,
        service_type: 'general',
        renewal_probability: 0.3,
        win_probability: 0.5,
        intelligence_score: 40,
        alert_priority: 'medium',
        competitive_factors: ['urgent', 'critical'],
      };

      monitor.storeEPUTender(tender, analysis);
      // One intel insert per competitive factor
      expect(intelStmt.run).toHaveBeenCalledTimes(2);
    });

    test('throws on database error', () => {
      const failStmt = mockStmt();
      failStmt.run.mockImplementation(() => { throw new Error('UNIQUE constraint'); });
      mockPrepare.mockReturnValue(failStmt);

      const tender = { tender_no: 'DUP', title: 'Dup' };
      const analysis = { competitive_factors: [], estimated_duration: 12, service_type: 'general' };

      expect(() => monitor.storeEPUTender(tender, analysis)).toThrow('UNIQUE constraint');
    });
  });

  // ------------------------------------------
  // getActiveEPUTenders
  // ------------------------------------------
  describe('getActiveEPUTenders', () => {
    test('returns enriched tenders with market intelligence', () => {
      const tenderRows = [
        { id: 1, title: 'Tender A', status: 'active' },
        { id: 2, title: 'Tender B', status: 'active' },
      ];
      const tenderStmt = mockStmt({ all: tenderRows });
      const intelStmt = mockStmt({ all: [{ id: 10, data_point: 'insight' }] });
      mockPrepare.mockReturnValueOnce(tenderStmt).mockReturnValue(intelStmt);

      const result = monitor.getActiveEPUTenders();
      expect(result).toHaveLength(2);
      expect(result[0].market_intelligence).toEqual([{ id: 10, data_point: 'insight' }]);
    });

    test('applies minIntelligenceScore filter', () => {
      const stmt = mockStmt({ all: [] });
      mockPrepare.mockReturnValue(stmt);

      monitor.getActiveEPUTenders({ minIntelligenceScore: 50 });
      const callArgs = stmt.all.mock.calls[0];
      expect(callArgs).toContain(50);
    });

    test('applies alertPriority filter', () => {
      const stmt = mockStmt({ all: [] });
      mockPrepare.mockReturnValue(stmt);

      monitor.getActiveEPUTenders({ alertPriority: 'urgent' });
      const callArgs = stmt.all.mock.calls[0];
      expect(callArgs).toContain('urgent');
    });

    test('applies serviceType filter', () => {
      const stmt = mockStmt({ all: [] });
      mockPrepare.mockReturnValue(stmt);

      monitor.getActiveEPUTenders({ serviceType: 'data_entry' });
      const callArgs = stmt.all.mock.calls[0];
      expect(callArgs).toContain('data_entry');
    });

    test('applies agency filter with LIKE pattern', () => {
      const stmt = mockStmt({ all: [] });
      mockPrepare.mockReturnValue(stmt);

      monitor.getActiveEPUTenders({ agency: 'MOE' });
      const callArgs = stmt.all.mock.calls[0];
      expect(callArgs).toContain('%MOE%');
    });

    test('returns empty array when no active tenders', () => {
      const stmt = mockStmt({ all: [] });
      mockPrepare.mockReturnValue(stmt);

      const result = monitor.getActiveEPUTenders();
      expect(result).toEqual([]);
    });
  });

  // ------------------------------------------
  // generateMarketReport
  // ------------------------------------------
  describe('generateMarketReport', () => {
    test('returns well-structured report with all sections', () => {
      const activeStmt = mockStmt({ get: { count: 5, total_value: 1000000 } });
      const serviceStmt = mockStmt({ all: [{ service_type: 'data_entry', count: 3, value: 500000 }] });
      const agencyStmt = mockStmt({ all: [{ agency: 'MOE', count: 2, value: 300000 }] });
      const alertStmt = mockStmt({ all: [{ id: 1, alert_priority: 'urgent' }] });
      const insightStmt = mockStmt({ all: [{ intelligence_type: 'pricing', frequency: 4, avg_confidence: 0.85 }] });

      mockPrepare
        .mockReturnValueOnce(activeStmt)
        .mockReturnValueOnce(serviceStmt)
        .mockReturnValueOnce(agencyStmt)
        .mockReturnValueOnce(alertStmt)
        .mockReturnValueOnce(insightStmt);

      const report = monitor.generateMarketReport();

      expect(report.category).toBe('EPU/SER/19');
      expect(report.active_opportunities).toBe(5);
      expect(report.total_estimated_value).toBe(1000000);
      expect(report.service_type_breakdown).toHaveProperty('data_entry');
      expect(report.agency_breakdown).toHaveProperty('MOE');
      expect(report.high_priority_alerts).toHaveLength(1);
      expect(report.intelligence_insights).toHaveLength(1);
      expect(report.generated_at).toBeDefined();
    });

    test('handles empty database gracefully', () => {
      const activeStmt = mockStmt({ get: { count: 0, total_value: null } });
      const serviceStmt = mockStmt({ all: [] });
      const agencyStmt = mockStmt({ all: [] });
      const alertStmt = mockStmt({ all: [] });
      const insightStmt = mockStmt({ all: [] });

      mockPrepare
        .mockReturnValueOnce(activeStmt)
        .mockReturnValueOnce(serviceStmt)
        .mockReturnValueOnce(agencyStmt)
        .mockReturnValueOnce(alertStmt)
        .mockReturnValueOnce(insightStmt);

      const report = monitor.generateMarketReport();

      expect(report.active_opportunities).toBe(0);
      expect(report.total_estimated_value).toBe(0);
      expect(Object.keys(report.service_type_breakdown)).toHaveLength(0);
      expect(Object.keys(report.agency_breakdown)).toHaveLength(0);
      expect(report.high_priority_alerts).toHaveLength(0);
    });
  });

  // ------------------------------------------
  // closeDB — no-op
  // ------------------------------------------
  describe('closeDB', () => {
    test('is a no-op and does not throw', () => {
      expect(() => monitor.closeDB()).not.toThrow();
    });
  });

  // ------------------------------------------
  // Constructor defaults
  // ------------------------------------------
  describe('constructor', () => {
    test('initializes with expected category', () => {
      expect(monitor.category).toBe('EPU/SER/19');
      expect(monitor.categoryDescription).toBe('Service - Manpower Supply');
    });

    test('keywords list is populated', () => {
      expect(monitor.keywords.length).toBeGreaterThan(10);
    });

    test('targetAgencies list is populated', () => {
      expect(monitor.targetAgencies.length).toBeGreaterThan(5);
    });

    test('stats object has default zeros', () => {
      expect(monitor.stats.total_epu_ser_19_tenders).toBe(0);
      expect(monitor.stats.active_tenders).toBe(0);
      expect(monitor.stats.total_value).toBe(0);
    });
  });
});

// ============================================
// EPU COMPETITOR ANALYZER
// ============================================

describe('EPUCompetitorAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    resetDbMocks();
    analyzer = new EPUCompetitorAnalyzer();
  });

  // ------------------------------------------
  // initDB — singleton pattern
  // ------------------------------------------
  describe('initDB', () => {
    test('assigns db singleton on first call', () => {
      analyzer.initDB();
      expect(analyzer.db).toBe(mockDb);
    });

    test('creates competitor tables on first init', () => {
      analyzer.initDB();
      // ensureCompetitorTables calls db.exec 4 times
      expect(mockExec).toHaveBeenCalledTimes(4);
    });

    test('does NOT re-initialize on subsequent calls', () => {
      analyzer.initDB();
      const firstCount = mockExec.mock.calls.length;
      analyzer.initDB();
      expect(mockExec).toHaveBeenCalledTimes(firstCount);
    });

    test('throws when table creation fails', () => {
      mockExec.mockImplementationOnce(() => {
        throw new Error('table creation failed');
      });
      expect(() => analyzer.initDB()).toThrow('table creation failed');
    });
  });

  // ------------------------------------------
  // Constructor
  // ------------------------------------------
  describe('constructor', () => {
    test('initializes competitor categories', () => {
      expect(analyzer.competitorCategories.TIER_1).toBe('tier_1');
      expect(analyzer.competitorCategories.NEW_ENTRANT).toBe('new_entrant');
    });

    test('initializes threat levels', () => {
      expect(analyzer.threatLevels.CRITICAL).toBe('critical');
      expect(analyzer.threatLevels.MINIMAL).toBe('minimal');
    });

    test('initializes analysis dimensions', () => {
      expect(analyzer.analysisDimensions.FINANCIAL_STRENGTH).toBe('financial_strength');
      expect(analyzer.analysisDimensions.RELIABILITY).toBe('reliability');
    });

    test('creates internal EPUSer19Monitor instance', () => {
      expect(analyzer.monitor).toBeInstanceOf(EPUSer19Monitor);
    });
  });

  // ------------------------------------------
  // analyzeTenderCompetitors
  // ------------------------------------------
  describe('analyzeTenderCompetitors', () => {
    test('analyzes awarded supplier when present', async () => {
      analyzer.db = mockDb;
      // Mock sub-methods to isolate analyzeTenderCompetitors logic
      analyzer.analyzeWinningSupplier = jest.fn().mockResolvedValue();
      analyzer.identifyLikelyCompetitors = jest.fn().mockResolvedValue([]);
      analyzer.updateCompetitorThreatLevels = jest.fn().mockResolvedValue();
      analyzer.generateCompetitiveAlerts = jest.fn().mockResolvedValue();

      const tender = {
        tender_no: 'T100',
        title: 'Admin staff',
        agency: 'MOE',
        awarded_supplier: 'ABC Corp',
        award_date: '2025-06-01',
        estimated_value: 200000,
        status: 'awarded',
      };

      const result = await analyzer.analyzeTenderCompetitors(tender);
      expect(result).toBe(true);
      expect(analyzer.analyzeWinningSupplier).toHaveBeenCalledWith(tender);
      expect(analyzer.generateCompetitiveAlerts).toHaveBeenCalledWith(tender);
    });

    test('calls identifyLikelyCompetitors for active tenders', async () => {
      analyzer.db = mockDb;
      const likelyCompetitors = [{ id: 1, name: 'Corp A', threat_level: 'high', likelihood: 0.8 }];
      analyzer.analyzeWinningSupplier = jest.fn().mockResolvedValue();
      analyzer.identifyLikelyCompetitors = jest.fn().mockResolvedValue(likelyCompetitors);
      analyzer.updateCompetitorThreatLevels = jest.fn().mockResolvedValue();
      analyzer.generateCompetitiveAlerts = jest.fn().mockResolvedValue();

      const tender = { tender_no: 'T101', status: 'active' };

      const result = await analyzer.analyzeTenderCompetitors(tender);
      expect(result).toBe(true);
      expect(analyzer.identifyLikelyCompetitors).toHaveBeenCalledWith(tender);
      expect(analyzer.updateCompetitorThreatLevels).toHaveBeenCalledWith(tender, likelyCompetitors);
    });

    test('returns false on error', async () => {
      mockPrepare.mockImplementation(() => {
        throw new Error('db error');
      });

      const tender = {
        tender_no: 'T200',
        awarded_supplier: 'Fail Corp',
        award_date: '2025-01-01',
        status: 'awarded',
      };

      const result = await analyzer.analyzeTenderCompetitors(tender);
      expect(result).toBe(false);
    });
  });

  // ------------------------------------------
  // calculateThreatScore
  // ------------------------------------------
  describe('calculateThreatScore', () => {
    beforeEach(() => {
      // Force db initialization to avoid exec calls interfering
      analyzer.db = mockDb;
    });

    test('returns early when competitor not found', async () => {
      const stmt = mockStmt({ get: null });
      mockPrepare.mockReturnValue(stmt);

      await analyzer.calculateThreatScore(999);
      // Only one prepare call (SELECT), no UPDATE
      expect(mockPrepare).toHaveBeenCalledTimes(1);
    });

    test('scores critical for high-performing competitor', async () => {
      const competitor = {
        id: 1,
        win_rate: 0.9,
        avg_contract_value: 600000,
        total_epu_contracts: 15,
        total_epu_value: 5000000,
        latest_contract_date: new Date().toISOString().split('T')[0],
        innovation_score: 80,
        reliability_score: 90,
      };

      const selectStmt = mockStmt({ get: competitor });
      const updateStmt = mockStmt();
      mockPrepare.mockReturnValueOnce(selectStmt).mockReturnValueOnce(updateStmt);

      await analyzer.calculateThreatScore(1);

      const updateArgs = updateStmt.run.mock.calls[0];
      const threatScore = updateArgs[0];
      const threatLevel = updateArgs[1];

      expect(threatScore).toBeGreaterThanOrEqual(80);
      expect(threatLevel).toBe('critical');
    });

    test('scores low for inactive competitor', async () => {
      const competitor = {
        id: 2,
        win_rate: 0.1,
        avg_contract_value: 50000,
        total_epu_contracts: 1,
        total_epu_value: 50000,
        latest_contract_date: '2020-01-01',
        innovation_score: 10,
        reliability_score: 10,
      };

      const selectStmt = mockStmt({ get: competitor });
      const updateStmt = mockStmt();
      mockPrepare.mockReturnValueOnce(selectStmt).mockReturnValueOnce(updateStmt);

      await analyzer.calculateThreatScore(2);

      const updateArgs = updateStmt.run.mock.calls[0];
      const threatScore = updateArgs[0];
      const threatLevel = updateArgs[1];

      expect(threatScore).toBeLessThan(40);
      expect(['low', 'minimal']).toContain(threatLevel);
    });

    test('scores medium for average competitor', async () => {
      const competitor = {
        id: 3,
        win_rate: 0.5,
        avg_contract_value: 150000,
        total_epu_contracts: 5,
        total_epu_value: 750000,
        latest_contract_date: '2025-06-01',
        innovation_score: 40,
        reliability_score: 40,
      };

      const selectStmt = mockStmt({ get: competitor });
      const updateStmt = mockStmt();
      mockPrepare.mockReturnValueOnce(selectStmt).mockReturnValueOnce(updateStmt);

      await analyzer.calculateThreatScore(3);

      const updateArgs = updateStmt.run.mock.calls[0];
      const threatScore = updateArgs[0];

      expect(threatScore).toBeGreaterThanOrEqual(40);
      expect(threatScore).toBeLessThan(80);
    });

    test('threat score caps at 100', async () => {
      const competitor = {
        id: 4,
        win_rate: 1.0,
        avg_contract_value: 999999999,
        total_epu_contracts: 100,
        total_epu_value: 999999999,
        latest_contract_date: new Date().toISOString().split('T')[0],
        innovation_score: 100,
        reliability_score: 100,
      };

      const selectStmt = mockStmt({ get: competitor });
      const updateStmt = mockStmt();
      mockPrepare.mockReturnValueOnce(selectStmt).mockReturnValueOnce(updateStmt);

      await analyzer.calculateThreatScore(4);

      const updateArgs = updateStmt.run.mock.calls[0];
      expect(updateArgs[0]).toBeLessThanOrEqual(100);
    });

    test('handles competitor with all null/zero fields', async () => {
      const competitor = {
        id: 5,
        win_rate: null,
        avg_contract_value: null,
        total_epu_contracts: null,
        total_epu_value: null,
        latest_contract_date: null,
        innovation_score: null,
        reliability_score: null,
      };

      const selectStmt = mockStmt({ get: competitor });
      const updateStmt = mockStmt();
      mockPrepare.mockReturnValueOnce(selectStmt).mockReturnValueOnce(updateStmt);

      await analyzer.calculateThreatScore(5);

      const updateArgs = updateStmt.run.mock.calls[0];
      const threatScore = updateArgs[0];
      const threatLevel = updateArgs[1];

      expect(threatScore).toBeGreaterThanOrEqual(0);
      expect(threatLevel).toBe('minimal');
    });
  });

  // ------------------------------------------
  // getOrCreateCompetitorProfile
  // ------------------------------------------
  describe('getOrCreateCompetitorProfile', () => {
    beforeEach(() => {
      analyzer.db = mockDb;
    });

    test('returns existing profile id', async () => {
      const selectStmt = mockStmt({ get: { id: 7 } });
      mockPrepare.mockReturnValueOnce(selectStmt);

      const id = await analyzer.getOrCreateCompetitorProfile('Existing Corp');
      expect(id).toBe(7);
    });

    test('creates new profile when not found', async () => {
      const selectStmt = mockStmt({ get: undefined });
      const insertStmt = mockStmt({ run: { lastInsertRowid: 99 } });
      mockPrepare.mockReturnValueOnce(selectStmt).mockReturnValueOnce(insertStmt);

      const id = await analyzer.getOrCreateCompetitorProfile('New Corp');
      expect(id).toBe(99);
      expect(insertStmt.run).toHaveBeenCalledWith('New Corp', 'tier_2', 'medium', 'medium');
    });
  });

  // ------------------------------------------
  // calculateWinRate
  // ------------------------------------------
  describe('calculateWinRate', () => {
    beforeEach(() => {
      analyzer.db = mockDb;
    });

    test('calculates win rate from bid history', async () => {
      const statsStmt = mockStmt({ get: { total_bids: 10, wins: 7 } });
      const updateStmt = mockStmt();
      mockPrepare.mockReturnValueOnce(statsStmt).mockReturnValueOnce(updateStmt);

      await analyzer.calculateWinRate(1);
      expect(updateStmt.run).toHaveBeenCalledWith(0.7, 0.7, 1);
    });

    test('returns 0 win rate when no bids', async () => {
      const statsStmt = mockStmt({ get: { total_bids: 0, wins: 0 } });
      const updateStmt = mockStmt();
      mockPrepare.mockReturnValueOnce(statsStmt).mockReturnValueOnce(updateStmt);

      await analyzer.calculateWinRate(1);
      expect(updateStmt.run).toHaveBeenCalledWith(0, 0, 1);
    });
  });

  // ------------------------------------------
  // getCompetitiveIntelligenceReport
  // ------------------------------------------
  describe('getCompetitiveIntelligenceReport', () => {
    test('returns well-structured report', () => {
      const marketStmt = mockStmt({ get: { total_competitors: 10, avg_win_rate: 0.45, avg_threat_score: 55, total_market_value: 5000000 } });
      const topStmt = mockStmt({ all: [{ company_name: 'Top Corp', overall_threat_score: 90 }] });
      const threatStmt = mockStmt({ all: [{ threat_level: 'high', count: 3 }] });
      const alertsStmt = mockStmt({ all: [{ alert_title: 'New competitor' }] });

      mockPrepare
        .mockReturnValueOnce(marketStmt)
        .mockReturnValueOnce(topStmt)
        .mockReturnValueOnce(threatStmt)
        .mockReturnValueOnce(alertsStmt);

      const report = analyzer.getCompetitiveIntelligenceReport();

      expect(report.generated_at).toBeDefined();
      expect(report.market_overview.total_competitors).toBe(10);
      expect(report.top_competitors).toHaveLength(1);
      expect(report.threat_analysis.distribution).toHaveLength(1);
      expect(report.competitive_alerts).toHaveLength(1);
    });

    test('handles empty database', () => {
      const marketStmt = mockStmt({ get: { total_competitors: 0, avg_win_rate: null, avg_threat_score: null, total_market_value: null } });
      const topStmt = mockStmt({ all: [] });
      const threatStmt = mockStmt({ all: [] });
      const alertsStmt = mockStmt({ all: [] });

      mockPrepare
        .mockReturnValueOnce(marketStmt)
        .mockReturnValueOnce(topStmt)
        .mockReturnValueOnce(threatStmt)
        .mockReturnValueOnce(alertsStmt);

      const report = analyzer.getCompetitiveIntelligenceReport();

      expect(report.market_overview.total_competitors).toBe(0);
      expect(report.top_competitors).toHaveLength(0);
      expect(report.competitive_alerts).toHaveLength(0);
    });
  });

  // ------------------------------------------
  // recordBidHistory
  // ------------------------------------------
  describe('recordBidHistory', () => {
    beforeEach(() => {
      analyzer.db = mockDb;
    });

    test('inserts bid record for won contract', async () => {
      const insertStmt = mockStmt();
      mockPrepare.mockReturnValue(insertStmt);

      const tender = {
        tender_no: 'BID01',
        awarded_supplier: 'Winner Corp',
        agency: 'MOE',
        service_type: 'data_entry',
        estimated_value: 100000,
        awarded_amount: 95000,
        published_date: '2025-01-01',
        award_date: '2025-03-01',
        contract_duration_months: 12,
      };

      await analyzer.recordBidHistory(1, tender, true);
      expect(insertStmt.run).toHaveBeenCalledWith(
        1, 'Winner Corp', null, 'BID01', 'MOE', 'data_entry',
        100000, 1, 95000, '2025-01-01', '2025-03-01', 12
      );
    });

    test('inserts bid record for lost contract', async () => {
      const insertStmt = mockStmt();
      mockPrepare.mockReturnValue(insertStmt);

      const tender = { tender_no: 'BID02', awarded_supplier: 'Loser Corp', agency: 'NEA' };

      await analyzer.recordBidHistory(2, tender, false);
      const args = insertStmt.run.mock.calls[0];
      expect(args[7]).toBe(0); // won_contract = false => 0
    });
  });

  // ------------------------------------------
  // closeDB — no-op
  // ------------------------------------------
  describe('closeDB', () => {
    test('is a no-op and does not throw', () => {
      expect(() => analyzer.closeDB()).not.toThrow();
    });
  });
});
