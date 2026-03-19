/**
 * Unit Tests: GeBIZ RSS Parser
 *
 * Tests the HTML scraper that extracts tender data from GeBIZ listing pages.
 * All external dependencies (HTTP, database) are mocked.
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

const GeBIZRSSParser = require('../../services/scraping/gebizRssParser');

// ---------------------------------------------------------------------------
// Sample HTML fixtures
// ---------------------------------------------------------------------------

const SAMPLE_LISTING_HTML = `
<html>
<body>
  <div class="listing-container">
    <div class="tender-entry">
      <div class="tender-details">
        <a href="/ptn/opportunity/directlink.xhtml?docCode=PUB000123">
          Provision of Cleaning Services for Government Buildings 2026
        </a>
        <span>Published: 10 Mar 2026</span>
        <span>Closing: 15 Apr 2026</span>
        <span>Miscellaneous => Others</span>
      </div>
    </div>
    <div class="tender-entry">
      <div class="tender-details">
        <a href="/ptn/opportunity/directlink.xhtml?docCode=DEFNGPP00456">
          Supply and Delivery of Security Equipment for Ministry of Defence Facilities
        </a>
        <span>Published: 08 Mar 2026</span>
        <span>Closing: 20 Apr 2026</span>
      </div>
    </div>
    <div class="tender-entry">
      <div class="tender-details">
        <a href="/ptn/opportunity/directlink.xhtml?docCode=ITE000789">
          Manpower Outsourcing Services for ITE Campus West Facility Management
        </a>
        <span>Published: 05 Mar 2026</span>
        <span>Closing: 01 Apr 2026</span>
      </div>
    </div>
  </div>
</body>
</html>
`;

const EMPTY_PAGE_HTML = `
<html>
<body>
  <div class="listing-container">
    <p>No opportunities found.</p>
  </div>
</body>
</html>
`;

const DUPLICATE_LINKS_HTML = `
<html>
<body>
  <div>
    <a href="/ptn/opportunity/directlink.xhtml?docCode=PUB000999">
      Provision of Transport Services for PUB Sites Around Singapore
    </a>
  </div>
  <div>
    <a href="/ptn/opportunity/directlink.xhtml?docCode=PUB000999">
      Provision of Transport Services for PUB Sites Around Singapore
    </a>
  </div>
</body>
</html>
`;

// ============================================================================
// GeBIZRSSParser
// ============================================================================

describe('GeBIZRSSParser', () => {
  let parser;

  beforeEach(() => {
    parser = new GeBIZRSSParser();
    jest.clearAllMocks();
    mockRateLimiterConsume.mockResolvedValue(true);
  });

  // ------------------------------------------------------------------
  // extractTendersFromListing
  // ------------------------------------------------------------------

  describe('extractTendersFromListing', () => {
    test('extracts tenders from valid listing HTML', () => {
      const tenders = parser.extractTendersFromListing(SAMPLE_LISTING_HTML);

      expect(tenders).toHaveLength(3);
      expect(tenders[0].tender_no).toBe('PUB000123');
      expect(tenders[1].tender_no).toBe('DEFNGPP00456');
      expect(tenders[2].tender_no).toBe('ITE000789');
    });

    test('returns empty array for page with no tender links', () => {
      const tenders = parser.extractTendersFromListing(EMPTY_PAGE_HTML);
      expect(tenders).toHaveLength(0);
    });

    test('deduplicates tenders with the same docCode', () => {
      const tenders = parser.extractTendersFromListing(DUPLICATE_LINKS_HTML);
      expect(tenders).toHaveLength(1);
      expect(tenders[0].tender_no).toBe('PUB000999');
    });

    test('populates source_url with direct link for each tender', () => {
      const tenders = parser.extractTendersFromListing(SAMPLE_LISTING_HTML);

      tenders.forEach((tender) => {
        expect(tender.source_url).toBe(
          `https://www.gebiz.gov.sg/ptn/opportunity/directlink.xhtml?docCode=${tender.tender_no}`
        );
      });
    });

    test('skips links with titles shorter than 5 characters', () => {
      const html = `
        <html><body>
          <a href="/ptn/opportunity/directlink.xhtml?docCode=XYZ001">OK</a>
        </body></html>
      `;
      const tenders = parser.extractTendersFromListing(html);
      expect(tenders).toHaveLength(0);
    });

    test('stores raw_content JSON for each tender', () => {
      const tenders = parser.extractTendersFromListing(SAMPLE_LISTING_HTML);

      tenders.forEach((tender) => {
        const raw = JSON.parse(tender.raw_content);
        expect(raw.docCode).toBe(tender.tender_no);
        expect(raw.extractedAt).toBeDefined();
      });
    });
  });

  // ------------------------------------------------------------------
  // extractTenderCodes (regex-based extraction)
  // ------------------------------------------------------------------

  describe('extractTenderCodes', () => {
    test('extracts unique document codes from HTML', () => {
      const html = `
        <a href="/ptn/opportunity/directlink.xhtml?docCode=PUB001">link1</a>
        <a href="/ptn/opportunity/directlink.xhtml?docCode=DEFNGPP002">link2</a>
        <a href="/ptn/opportunity/directlink.xhtml?docCode=PUB001">duplicate</a>
      `;
      const codes = parser.extractTenderCodes(html);

      expect(codes).toContain('PUB001');
      expect(codes).toContain('DEFNGPP002');
      expect(codes).toHaveLength(2); // deduped
    });

    test('returns empty array when no docCode links exist', () => {
      const codes = parser.extractTenderCodes('<html><body>No tenders</body></html>');
      expect(codes).toHaveLength(0);
    });

    test('matches case-insensitive docCode values', () => {
      const html = '<a href="/ptn/opportunity/directlink.xhtml?docCode=abc123">link</a>';
      const codes = parser.extractTenderCodes(html);
      // The regex is case-insensitive but captures what's in the HTML
      expect(codes).toHaveLength(1);
    });
  });

  // ------------------------------------------------------------------
  // extractAgencyFromContext (prefix-based agency lookup)
  // ------------------------------------------------------------------

  describe('extractAgencyFromContext', () => {
    test('maps PUB prefix to Public Utilities Board', () => {
      expect(parser.extractAgencyFromContext('', 'PUB000123')).toBe('Public Utilities Board');
    });

    test('maps DEFNGPP prefix to Ministry of Defence', () => {
      expect(parser.extractAgencyFromContext('', 'DEFNGPP00456')).toBe('Ministry of Defence');
    });

    test('maps ITE prefix to Institute of Technical Education', () => {
      expect(parser.extractAgencyFromContext('', 'ITE000789')).toBe('Institute of Technical Education');
    });

    test('maps HDB prefix to Housing and Development Board', () => {
      expect(parser.extractAgencyFromContext('', 'HDB12345')).toBe('Housing and Development Board');
    });

    test('returns Government Agency for unknown prefix', () => {
      expect(parser.extractAgencyFromContext('', 'UNKNOWN001')).toBe('Government Agency');
    });

    test('matches longest prefix first (DEFNGPP before GOV)', () => {
      // DEFNGPP should match before a shorter prefix
      expect(parser.extractAgencyFromContext('', 'DEFNGPP999')).toBe('Ministry of Defence');
    });
  });

  // ------------------------------------------------------------------
  // extractDatesFromContext
  // ------------------------------------------------------------------

  describe('extractDatesFromContext', () => {
    test('extracts published and closing dates from context text', () => {
      const text = 'Published: 10 Mar 2026 Closing: 15 Apr 2026';
      const dates = parser.extractDatesFromContext(text);

      // The source parses via new Date() then .toISOString(), so the UTC
      // date may shift by +/-1 day depending on local timezone offset.
      // We verify both dates are plausible ISO dates near the expected values.
      expect(dates.published).toMatch(/^2026-03-(09|10)$/);
      expect(dates.closing).toMatch(/^2026-04-(14|15)$/);
    });

    test('returns nulls when no dates found', () => {
      const dates = parser.extractDatesFromContext('No dates here');
      expect(dates.published).toBeNull();
      expect(dates.closing).toBeNull();
    });

    test('handles single date in text', () => {
      const dates = parser.extractDatesFromContext('Published: 01 Jan 2026');
      // UTC conversion may shift by a day
      expect(dates.published).toMatch(/^(2025-12-31|2026-01-01)$/);
      expect(dates.closing).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // categorizeContent
  // ------------------------------------------------------------------

  describe('categorizeContent', () => {
    test('categorizes cleaning-related tenders', () => {
      expect(parser.categorizeContent('Cleaning Services', '')).toBe('cleaning_services');
    });

    test('categorizes security-related tenders', () => {
      expect(parser.categorizeContent('Security Guard Services', '')).toBe('security_services');
    });

    test('categorizes manpower-related tenders', () => {
      expect(parser.categorizeContent('Manpower Outsourcing', '')).toBe('manpower_services');
    });

    test('falls back to general_services for unknown content', () => {
      expect(parser.categorizeContent('Miscellaneous Procurement', '')).toBe('general_services');
    });

    test('checks description as well as title', () => {
      expect(parser.categorizeContent('Generic Title', 'hospital ward staffing')).toBe('healthcare_staffing');
    });
  });

  // ------------------------------------------------------------------
  // validateTenderData
  // ------------------------------------------------------------------

  describe('validateTenderData', () => {
    test('returns validated tender with priority field', () => {
      const tender = {
        tender_no: 'PUB001',
        title: 'Provision of Cleaning Services for Government Buildings',
        agency: 'Public Utilities Board',
        description: 'Cleaning services tender',
        published_date: '2026-03-10',
        closing_date: '2026-04-15',
        category: 'cleaning_services',
        source_url: 'https://www.gebiz.gov.sg/ptn/opportunity/directlink.xhtml?docCode=PUB001',
      };
      const result = parser.validateTenderData(tender);

      expect(result).not.toBeNull();
      expect(result.priority).toBeDefined();
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    test('returns null for tender with title too short', () => {
      const tender = { tender_no: 'PUB001', title: 'Short' };
      expect(parser.validateTenderData(tender)).toBeNull();
    });

    test('returns null for tender without tender_no', () => {
      const tender = { title: 'A valid long enough title for testing' };
      expect(parser.validateTenderData(tender)).toBeNull();
    });

    test('nullifies invalid published_date', () => {
      const tender = {
        tender_no: 'PUB001',
        title: 'Valid Tender Title With Enough Characters',
        published_date: 'not-a-date',
        closing_date: '2026-04-15',
        source_url: 'https://example.com',
      };
      const result = parser.validateTenderData(tender);
      expect(result).not.toBeNull();
      expect(result.published_date).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // calculatePriority
  // ------------------------------------------------------------------

  describe('calculatePriority', () => {
    test('returns medium for a basic tender', () => {
      const tender = {
        title: 'General procurement of office supplies',
        description: 'Standard order',
        agency: 'SLA',
        closing_date: '2026-12-31',
      };
      expect(parser.calculatePriority(tender)).toBe('medium');
    });

    test('returns high for a high-value agency tender with manpower keyword', () => {
      const tender = {
        title: 'Manpower staffing contract',
        description: 'Personnel outsourcing',
        agency: 'MOH',
        closing_date: '2026-12-31',
      };
      const priority = parser.calculatePriority(tender);
      // MOH (+20) + manpower (+10) + staffing (+10) = 90 => critical
      expect(['high', 'critical']).toContain(priority);
    });

    test('boosts priority when closing date is within 7 days', () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 3);
      const tender = {
        title: 'General procurement of supplies and equipment',
        description: 'Standard order',
        agency: 'SLA',
        closing_date: soon.toISOString().split('T')[0],
      };
      const priority = parser.calculatePriority(tender);
      // base 50 + 20 (closing<=7 days) = 70 => high
      expect(['high', 'critical']).toContain(priority);
    });
  });

  // ------------------------------------------------------------------
  // isDuplicate
  // ------------------------------------------------------------------

  describe('isDuplicate', () => {
    test('returns true when tender exists in pipeline table', async () => {
      mockDbPrepare.mockReturnValue({
        get: jest.fn().mockReturnValueOnce({ count: 1 }),
      });

      const result = await parser.isDuplicate('PUB001');
      expect(result).toBe(true);
    });

    test('returns true when tender exists in staging table', async () => {
      mockDbPrepare
        .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ count: 0 }) }) // pipeline
        .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ count: 1 }) }); // staging

      const result = await parser.isDuplicate('PUB001');
      expect(result).toBe(true);
    });

    test('returns false when tender is not in either table', async () => {
      mockDbPrepare
        .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ count: 0 }) })
        .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ count: 0 }) });

      const result = await parser.isDuplicate('NEW001');
      expect(result).toBe(false);
    });

    test('returns false on database error (fail-open)', async () => {
      mockDbPrepare.mockImplementation(() => {
        throw new Error('DB connection lost');
      });

      const result = await parser.isDuplicate('PUB001');
      expect(result).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // parseRSSFeed (integration of fetch + extract + validate)
  // ------------------------------------------------------------------

  describe('parseRSSFeed', () => {
    test('returns success:false when rate limited', async () => {
      mockRateLimiterConsume.mockRejectedValueOnce({ msBeforeNext: 3000 });

      const result = await parser.parseRSSFeed();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Rate limited/);
    });

    test('returns success:true with empty validatedTenders for empty page', async () => {
      // fetchHTML will return the default mocked empty HTML
      // isDuplicate won't be called because no tenders are extracted
      const result = await parser.parseRSSFeed();

      expect(result.success).toBe(true);
      expect(result.validatedTenders).toHaveLength(0);
    });

    test('updates stats after a run', async () => {
      parser.resetStats();

      await parser.parseRSSFeed();

      const stats = parser.getStats();
      expect(stats.lastRun).not.toBeNull();
      expect(stats.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  // ------------------------------------------------------------------
  // Utility methods
  // ------------------------------------------------------------------

  describe('utility methods', () => {
    test('sanitizeText collapses whitespace and trims', () => {
      expect(parser.sanitizeText('  hello   world  ')).toBe('hello world');
    });

    test('sanitizeText returns empty string for null', () => {
      expect(parser.sanitizeText(null)).toBe('');
    });

    test('sanitizeText truncates to 2000 characters', () => {
      const long = 'a'.repeat(3000);
      expect(parser.sanitizeText(long)).toHaveLength(2000);
    });

    test('parseDate returns ISO date for valid input', () => {
      expect(parser.parseDate('2026-03-19')).toBe('2026-03-19');
    });

    test('parseDate returns null for invalid input', () => {
      expect(parser.parseDate('not-a-date')).toBeNull();
    });

    test('parseDate returns null for null input', () => {
      expect(parser.parseDate(null)).toBeNull();
    });

    test('getEstimatedClosingDate returns a date 30 days from now', () => {
      const result = parser.getEstimatedClosingDate();
      const expected = new Date();
      expected.setDate(expected.getDate() + 30);

      expect(result).toBe(expected.toISOString().split('T')[0]);
    });

    test('getTenderType returns correct types by prefix', () => {
      expect(parser.getTenderType('PUB001')).toBe('Public Tender');
      expect(parser.getTenderType('DEFNGPP001')).toBe('Defense Tender');
      expect(parser.getTenderType('ITE001')).toBe('ITE Tender');
      expect(parser.getTenderType('UNKNOWN')).toBe('Government Tender');
    });

    test('categorizeFromCode maps codes to categories', () => {
      expect(parser.categorizeFromCode('DEFNGPP001')).toBe('security_services');
      expect(parser.categorizeFromCode('ITE001')).toBe('facility_management');
      expect(parser.categorizeFromCode('NST001')).toBe('manpower_services');
      expect(parser.categorizeFromCode('PUB001')).toBe('general_services');
    });

    test('getStats reports healthy when error rate is low', () => {
      parser.stats.totalParsed = 100;
      parser.stats.errors = 5;
      expect(parser.getStats().isHealthy).toBe(true);
    });

    test('getStats reports unhealthy when error rate exceeds 10%', () => {
      parser.stats.totalParsed = 100;
      parser.stats.errors = 15;
      expect(parser.getStats().isHealthy).toBe(false);
    });

    test('resetStats clears all counters', () => {
      parser.stats.totalParsed = 50;
      parser.stats.errors = 10;
      parser.resetStats();

      expect(parser.stats.totalParsed).toBe(0);
      expect(parser.stats.errors).toBe(0);
      expect(parser.stats.lastRun).toBeNull();
    });
  });
});
