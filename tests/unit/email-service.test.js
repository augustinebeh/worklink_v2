/**
 * Unit Tests: Email Service
 *
 * Tests email initialization, sending, retry logic, validation,
 * rate limiting, permanent failure detection, and priority calculation.
 */

// ---------------------------------------------------------------------------
// Mocks – must be defined BEFORE any require() that touches the modules
// ---------------------------------------------------------------------------

// --- nodemailer ---
const mockSendMail = jest.fn();
const mockVerify = jest.fn();
const mockCreateTransporter = jest.fn(() => ({
  sendMail: mockSendMail,
  verify: mockVerify,
}));
jest.mock('nodemailer', () => ({
  createTransporter: mockCreateTransporter,
}));

// --- @sendgrid/mail ---
const mockSgSend = jest.fn();
const mockSgSetApiKey = jest.fn();
jest.mock('@sendgrid/mail', () => ({
  send: mockSgSend,
  setApiKey: mockSgSetApiKey,
}));

// --- db ---
const mockPrepare = jest.fn();
const mockExec = jest.fn();
const mockDb = { prepare: mockPrepare, exec: mockExec };
jest.mock('../../db', () => ({ db: mockDb }));

// --- config/email ---
const mockGetEmailConfig = jest.fn();
jest.mock('../../config/email', () => ({
  getEmailConfig: mockGetEmailConfig,
}));

// --- email templates ---
const mockRender = jest.fn();
jest.mock('../../services/email/templates', () => {
  return jest.fn().mockImplementation(() => ({
    render: mockRender,
  }));
});

// --- email delivery tracker ---
const mockCreateDeliveryRecord = jest.fn();
const mockMarkAsDelivered = jest.fn();
const mockMarkAsFailed = jest.fn();
const mockMarkAsFailedPermanently = jest.fn();
jest.mock('../../services/email/delivery-tracker', () => {
  return jest.fn().mockImplementation(() => ({
    createDeliveryRecord: mockCreateDeliveryRecord,
    markAsDelivered: mockMarkAsDelivered,
    markAsFailed: mockMarkAsFailed,
    markAsFailedPermanently: mockMarkAsFailedPermanently,
  }));
});

// --- structured-logger (silenced) ---
jest.mock('../../utils/structured-logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseEmailConfig(overrides = {}) {
  return {
    provider: 'smtp',
    smtp: { host: 'smtp.test.com', port: 587, auth: { user: 'u', pass: 'p' } },
    sendgrid: { apiKey: 'sg-key' },
    from: { name: 'WorkLink', email: 'noreply@worklink.sg' },
    rateLimit: { maxPerHour: 100, maxPerDay: 1000 },
    retry: { attempts: 3, delay: 10, backoff: 'exponential' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// EMAIL SERVICE TESTS
// ---------------------------------------------------------------------------

describe('EmailService', () => {
  let EmailService;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Re-require after resetting modules so fresh singleton is created
    // But since we use jest.mock at top level, the mock factories persist.
    // We need to require the actual module fresh:
    EmailService = require('../../services/email/index');
  });

  // ========================================
  // INITIALIZATION
  // ========================================

  describe('initialize', () => {
    test('initializes with SMTP provider and verifies connection', async () => {
      const config = baseEmailConfig();
      mockGetEmailConfig.mockReturnValue(config);
      mockVerify.mockResolvedValue(true);

      await EmailService.initialize();

      expect(mockGetEmailConfig).toHaveBeenCalled();
      expect(mockCreateTransporter).toHaveBeenCalledWith(config.smtp);
      expect(mockVerify).toHaveBeenCalled();
      expect(EmailService.isInitialized).toBe(true);
    });

    test('initializes with SendGrid provider', async () => {
      const config = baseEmailConfig({ provider: 'sendgrid' });
      mockGetEmailConfig.mockReturnValue(config);

      await EmailService.initialize();

      expect(mockSgSetApiKey).toHaveBeenCalledWith('sg-key');
      expect(EmailService.isInitialized).toBe(true);
    });

    test('throws for unsupported provider', async () => {
      mockGetEmailConfig.mockReturnValue(baseEmailConfig({ provider: 'unknown' }));

      await expect(EmailService.initialize()).rejects.toThrow('Unsupported email provider: unknown');
    });

    test('throws for mailgun provider (not implemented)', async () => {
      mockGetEmailConfig.mockReturnValue(baseEmailConfig({ provider: 'mailgun' }));

      await expect(EmailService.initialize()).rejects.toThrow('Mailgun provider not implemented yet');
    });

    test('throws for AWS SES provider (not implemented)', async () => {
      mockGetEmailConfig.mockReturnValue(baseEmailConfig({ provider: 'ses' }));

      await expect(EmailService.initialize()).rejects.toThrow('AWS SES provider not implemented yet');
    });

    test('sets isInitialized false when initialization fails', async () => {
      mockGetEmailConfig.mockImplementation(() => { throw new Error('Config error'); });

      await expect(EmailService.initialize()).rejects.toThrow('Config error');
      expect(EmailService.isInitialized).toBe(false);
    });
  });

  // ========================================
  // VALIDATION
  // ========================================

  describe('validateEmailData', () => {
    test('throws when recipient is missing', () => {
      expect(() => EmailService.validateEmailData({ subject: 'Hi', text: 'body' }))
        .toThrow('Recipient email is required');
    });

    test('throws when subject and template both missing', () => {
      expect(() => EmailService.validateEmailData({ to: 'a@b.com', text: 'body' }))
        .toThrow('Subject or template is required');
    });

    test('throws when no content provided', () => {
      expect(() => EmailService.validateEmailData({ to: 'a@b.com', subject: 'Hi' }))
        .toThrow('Email content (text, html, or template) is required');
    });

    test('throws for invalid email format', () => {
      expect(() => EmailService.validateEmailData({ to: 'not-an-email', subject: 'Hi', text: 'body' }))
        .toThrow('Invalid email address: not-an-email');
    });

    test('validates array of recipients', () => {
      expect(() => EmailService.validateEmailData({
        to: ['good@email.com', 'bad-email'],
        subject: 'Hi',
        text: 'body',
      })).toThrow('Invalid email address: bad-email');
    });

    test('passes for valid email data with template', () => {
      expect(() => EmailService.validateEmailData({
        to: 'user@example.com',
        template: 'welcome',
      })).not.toThrow();
    });

    test('passes for valid email data with text content', () => {
      expect(() => EmailService.validateEmailData({
        to: 'user@example.com',
        subject: 'Test',
        text: 'Hello',
      })).not.toThrow();
    });
  });

  // ========================================
  // SEND EMAIL
  // ========================================

  describe('sendEmail', () => {
    beforeEach(() => {
      // Pre-initialize the service to avoid auto-initialize in sendEmail
      const config = baseEmailConfig();
      mockGetEmailConfig.mockReturnValue(config);
      EmailService.config = config;
      EmailService.isInitialized = true;
      EmailService.transporter = { sendMail: mockSendMail };

      // Mock rate limit check (db queries return low counts)
      mockPrepare.mockImplementation(() => ({
        get: jest.fn(() => ({ count: 0 })),
        run: jest.fn(),
        all: jest.fn(() => []),
      }));

      mockCreateDeliveryRecord.mockReturnValue('track-123');
      mockSendMail.mockResolvedValue({ messageId: 'msg-001' });
    });

    test('sends email successfully via SMTP', async () => {
      const result = await EmailService.sendEmail({
        to: 'recipient@test.com',
        subject: 'Test Subject',
        text: 'Test body',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-001');
      expect(result.trackingId).toBe('track-123');
      expect(result.attempt).toBe(1);
      expect(mockMarkAsDelivered).toHaveBeenCalledWith('track-123', expect.objectContaining({
        messageId: 'msg-001',
        attempt: 1,
      }));
    });

    test('uses template when specified', async () => {
      mockRender.mockResolvedValue({ html: '<p>rendered</p>', text: 'rendered' });

      await EmailService.sendEmail({
        to: 'recipient@test.com',
        subject: 'Test',
        template: 'welcome',
        templateData: { recipientName: 'Alice' },
      });

      expect(mockRender).toHaveBeenCalledWith('welcome', { recipientName: 'Alice' });
    });

    test('auto-initializes when not initialized', async () => {
      EmailService.isInitialized = false;
      mockVerify.mockResolvedValue(true);

      await EmailService.sendEmail({
        to: 'r@test.com',
        subject: 'Test',
        text: 'body',
      });

      expect(mockGetEmailConfig).toHaveBeenCalled();
    });

    test('includes custom headers in message', async () => {
      await EmailService.sendEmail({
        to: 'r@test.com',
        subject: 'Test',
        text: 'body',
        priority: 'high',
        category: 'tender-alert',
      });

      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        headers: expect.objectContaining({
          'X-WorkLink-Priority': 'high',
          'X-WorkLink-Category': 'tender-alert',
        }),
      }));
    });
  });

  // ========================================
  // SEND VIA SENDGRID
  // ========================================

  describe('sendEmailViaProvider - SendGrid', () => {
    test('sends via SendGrid with correct format', async () => {
      EmailService.config = baseEmailConfig({ provider: 'sendgrid' });
      EmailService.isInitialized = true;

      const mockResponse = { headers: { 'x-message-id': 'sg-msg-001' } };
      mockSgSend.mockResolvedValue([mockResponse]);

      const result = await EmailService.sendEmailViaProvider({
        to: 'r@test.com',
        from: { name: 'WorkLink', address: 'noreply@worklink.sg' },
        subject: 'Test',
        text: 'body',
        html: '<p>body</p>',
      });

      expect(result.messageId).toBe('sg-msg-001');
      expect(mockSgSend).toHaveBeenCalled();
    });
  });

  // ========================================
  // RETRY LOGIC
  // ========================================

  describe('sendWithRetry', () => {
    beforeEach(() => {
      EmailService.config = baseEmailConfig({ retry: { attempts: 3, delay: 1, backoff: 'exponential' } });
      EmailService.isInitialized = true;
      EmailService.transporter = { sendMail: mockSendMail };
      mockCreateDeliveryRecord.mockReturnValue('track-retry');
    });

    test('retries on transient failure and succeeds', async () => {
      mockSendMail
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ messageId: 'msg-retry-ok' });

      const message = { to: 'r@test.com', subject: 'Hi', text: 'body' };
      const result = await EmailService.sendWithRetry(message, 'track-retry');

      expect(result.success).toBe(true);
      expect(result.attempt).toBe(2);
      expect(mockMarkAsFailed).toHaveBeenCalledTimes(1);
      expect(mockMarkAsDelivered).toHaveBeenCalledTimes(1);
    });

    test('does not retry on permanent failure', async () => {
      mockSendMail.mockRejectedValue(new Error('Invalid email address'));

      const message = { to: 'bad', subject: 'Hi', text: 'body' };

      await expect(
        EmailService.sendWithRetry(message, 'track-perm')
      ).rejects.toThrow('Email failed to send after 3 attempts');

      // Only 1 attempt because it is a permanent failure
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockMarkAsFailedPermanently).toHaveBeenCalled();
    });

    test('exhausts all attempts then throws', async () => {
      mockSendMail.mockRejectedValue(new Error('Server busy'));

      const message = { to: 'r@test.com', subject: 'Hi', text: 'body' };

      await expect(
        EmailService.sendWithRetry(message, 'track-exhaust')
      ).rejects.toThrow('Email failed to send after 3 attempts: Server busy');

      expect(mockSendMail).toHaveBeenCalledTimes(3);
      expect(mockMarkAsFailedPermanently).toHaveBeenCalled();
    });
  });

  // ========================================
  // RATE LIMITING
  // ========================================

  describe('checkRateLimit', () => {
    beforeEach(() => {
      EmailService.config = baseEmailConfig();
    });

    test('throws when hourly limit exceeded', async () => {
      mockPrepare
        .mockReturnValueOnce({ get: jest.fn(() => ({ count: 100 })) })  // hourly
        .mockReturnValueOnce({ get: jest.fn(() => ({ count: 0 })) });    // daily

      await expect(EmailService.checkRateLimit()).rejects.toThrow('Hourly email rate limit exceeded');
    });

    test('throws when daily limit exceeded', async () => {
      mockPrepare
        .mockReturnValueOnce({ get: jest.fn(() => ({ count: 0 })) })      // hourly
        .mockReturnValueOnce({ get: jest.fn(() => ({ count: 1000 })) });   // daily

      await expect(EmailService.checkRateLimit()).rejects.toThrow('Daily email rate limit exceeded');
    });

    test('passes when under limits', async () => {
      mockPrepare
        .mockReturnValueOnce({ get: jest.fn(() => ({ count: 5 })) })
        .mockReturnValueOnce({ get: jest.fn(() => ({ count: 50 })) });

      await expect(EmailService.checkRateLimit()).resolves.toBeUndefined();
    });
  });

  // ========================================
  // PERMANENT FAILURE DETECTION
  // ========================================

  describe('isPermanentFailure', () => {
    test.each([
      'Invalid email address foo',
      'Recipient rejected by server',
      'Domain not found for bar.com',
      'Authentication failed',
      'Invalid API key provided',
    ])('detects "%s" as permanent', (msg) => {
      expect(EmailService.isPermanentFailure(new Error(msg))).toBe(true);
    });

    test('treats transient errors as non-permanent', () => {
      expect(EmailService.isPermanentFailure(new Error('Connection timeout'))).toBe(false);
      expect(EmailService.isPermanentFailure(new Error('Server busy'))).toBe(false);
    });
  });

  // ========================================
  // RETRY DELAY CALCULATION
  // ========================================

  describe('calculateRetryDelay', () => {
    test('exponential backoff', () => {
      EmailService.config = baseEmailConfig({ retry: { delay: 1000, backoff: 'exponential' } });
      expect(EmailService.calculateRetryDelay(1)).toBe(1000);
      expect(EmailService.calculateRetryDelay(2)).toBe(2000);
      expect(EmailService.calculateRetryDelay(3)).toBe(4000);
    });

    test('linear backoff', () => {
      EmailService.config = baseEmailConfig({ retry: { delay: 1000, backoff: 'linear' } });
      expect(EmailService.calculateRetryDelay(1)).toBe(1000);
      expect(EmailService.calculateRetryDelay(2)).toBe(2000);
      expect(EmailService.calculateRetryDelay(3)).toBe(3000);
    });
  });

  // ========================================
  // TENDER PRIORITY
  // ========================================

  describe('getTenderPriority', () => {
    test('returns high for high-value tenders', () => {
      expect(EmailService.getTenderPriority({ estimated_value: 200000, closing_date: '2099-12-31' })).toBe('high');
    });

    test('returns high for tenders closing within 3 days', () => {
      const closingSoon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      expect(EmailService.getTenderPriority({ estimated_value: 1000, closing_date: closingSoon })).toBe('high');
    });

    test('returns medium for tenders closing within 7 days', () => {
      const closingMedium = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      expect(EmailService.getTenderPriority({ estimated_value: 1000, closing_date: closingMedium })).toBe('medium');
    });

    test('returns normal for tenders closing beyond 7 days', () => {
      const closingFar = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      expect(EmailService.getTenderPriority({ estimated_value: 1000, closing_date: closingFar })).toBe('normal');
    });
  });

  // ========================================
  // SEND TEST EMAIL
  // ========================================

  describe('sendTestEmail', () => {
    beforeEach(() => {
      EmailService.config = baseEmailConfig();
      EmailService.isInitialized = true;
      EmailService.transporter = { sendMail: mockSendMail };

      mockPrepare.mockImplementation(() => ({
        get: jest.fn(() => ({ count: 0 })),
        run: jest.fn(),
        all: jest.fn(() => []),
      }));

      mockCreateDeliveryRecord.mockReturnValue('track-test');
      mockSendMail.mockResolvedValue({ messageId: 'test-msg-001' });
    });

    test('sends test email with default subject/body', async () => {
      const result = await EmailService.sendTestEmail({ to: 'admin@test.com' });

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'WorkLink Email Service Test',
      }));
    });

    test('sends test email with custom subject', async () => {
      await EmailService.sendTestEmail({ to: 'admin@test.com', subject: 'Custom Test' });

      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Custom Test',
      }));
    });
  });
});
