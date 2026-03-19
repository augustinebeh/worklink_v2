/**
 * Unit Tests: Telegram & Messaging Services
 *
 * Tests telegram bot integration (sendMessage, sendPhoto, sendDocument,
 * webhooks, formatting), and the messaging service (channel routing,
 * incoming message handling, candidate channels, verification).
 */

// ---------------------------------------------------------------------------
// Mocks – must be defined BEFORE any require() that touches the modules
// ---------------------------------------------------------------------------

// --- db ---
const mockPrepare = jest.fn();
const mockExec = jest.fn();
const mockDb = { prepare: mockPrepare, exec: mockExec };
jest.mock('../../db', () => ({ db: mockDb }));

// --- websocket ---
const mockBroadcastToCandidate = jest.fn();
const mockBroadcastToAdmins = jest.fn();
const mockCreateNotification = jest.fn();
const mockIsCandidateOnline = jest.fn();
jest.mock('../../websocket', () => ({
  broadcastToCandidate: mockBroadcastToCandidate,
  broadcastToAdmins: mockBroadcastToAdmins,
  createNotification: mockCreateNotification,
  isCandidateOnline: mockIsCandidateOnline,
  EventTypes: { CHAT_MESSAGE: 'chat_message' },
}));

// --- web-push ---
const mockSendNotification = jest.fn();
jest.mock('web-push', () => ({
  sendNotification: mockSendNotification,
}));

// --- structured-logger (silenced) ---
jest.mock('../../utils/structured-logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// --- global fetch for telegram ---
global.fetch = jest.fn();

// ---------------------------------------------------------------------------
// TELEGRAM SERVICE TESTS
// ---------------------------------------------------------------------------

describe('Telegram Service', () => {
  let telegram;
  const originalEnv = process.env.TELEGRAM_BOT_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    // The module reads the env var at require-time, so we reset modules
    // and set the token before re-requiring.
    jest.resetModules();

    // Re-mock dependencies that the telegram module needs
    jest.mock('../../utils/structured-logger', () => ({
      createLogger: () => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      }),
    }));

    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
    telegram = require('../../services/messaging/telegram');
  });

  afterAll(() => {
    if (originalEnv) {
      process.env.TELEGRAM_BOT_TOKEN = originalEnv;
    } else {
      delete process.env.TELEGRAM_BOT_TOKEN;
    }
  });

  // ========================================
  // isConfigured
  // ========================================

  describe('isConfigured', () => {
    test('returns true when TELEGRAM_BOT_TOKEN is set', () => {
      expect(telegram.isConfigured()).toBe(true);
    });

    test('returns false when TELEGRAM_BOT_TOKEN is unset', () => {
      jest.resetModules();
      jest.mock('../../utils/structured-logger', () => ({
        createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }),
      }));
      delete process.env.TELEGRAM_BOT_TOKEN;
      const tgUnconfigured = require('../../services/messaging/telegram');
      expect(tgUnconfigured.isConfigured()).toBe(false);
      // Restore
      process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
    });
  });

  // ========================================
  // sendMessage
  // ========================================

  describe('sendMessage', () => {
    test('sends message and returns success', async () => {
      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true, result: { message_id: 42 } }),
      });

      const result = await telegram.sendMessage('12345', 'Hello');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe(42);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/sendMessage'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"chat_id":"12345"'),
        })
      );
    });

    test('returns error on API failure response', async () => {
      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: false, description: 'Chat not found' }),
      });

      const result = await telegram.sendMessage('99999', 'Hi');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Chat not found');
    });

    test('returns error on network exception', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const result = await telegram.sendMessage('12345', 'Hi');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    test('returns error when bot token is not configured', async () => {
      jest.resetModules();
      jest.mock('../../utils/structured-logger', () => ({
        createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }),
      }));
      delete process.env.TELEGRAM_BOT_TOKEN;
      const tgNone = require('../../services/messaging/telegram');

      const result = await tgNone.sendMessage('12345', 'Hello');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Telegram not configured');
      process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
    });

    test('uses HTML parse_mode by default', async () => {
      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true, result: { message_id: 1 } }),
      });

      await telegram.sendMessage('123', 'text');

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.parse_mode).toBe('HTML');
    });
  });

  // ========================================
  // sendMessageWithButtons
  // ========================================

  describe('sendMessageWithButtons', () => {
    test('sends message with inline keyboard', async () => {
      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true, result: { message_id: 50 } }),
      });

      const buttons = [[{ text: 'Yes', callback_data: 'yes' }]];
      const result = await telegram.sendMessageWithButtons('123', 'Confirm?', buttons);

      expect(result.success).toBe(true);
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.reply_markup.inline_keyboard).toEqual(buttons);
    });
  });

  // ========================================
  // sendPhoto
  // ========================================

  describe('sendPhoto', () => {
    test('sends photo successfully', async () => {
      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true, result: { message_id: 60 } }),
      });

      const result = await telegram.sendPhoto('123', 'https://img.url/pic.jpg', 'Nice');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe(60);
    });

    test('returns error when bot not configured', async () => {
      jest.resetModules();
      jest.mock('../../utils/structured-logger', () => ({
        createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }),
      }));
      delete process.env.TELEGRAM_BOT_TOKEN;
      const tg = require('../../services/messaging/telegram');
      const result = await tg.sendPhoto('123', 'url', 'cap');
      expect(result.success).toBe(false);
      process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
    });
  });

  // ========================================
  // sendDocument
  // ========================================

  describe('sendDocument', () => {
    test('sends document successfully', async () => {
      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true, result: { message_id: 70 } }),
      });

      const result = await telegram.sendDocument('123', 'https://files.url/doc.pdf', 'Report');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe(70);
    });

    test('handles API error response', async () => {
      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: false, description: 'File too large' }),
      });

      const result = await telegram.sendDocument('123', 'url', 'cap');
      expect(result.success).toBe(false);
      expect(result.error).toBe('File too large');
    });
  });

  // ========================================
  // setWebhook / deleteWebhook
  // ========================================

  describe('setWebhook', () => {
    test('sets webhook URL successfully', async () => {
      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      });

      const result = await telegram.setWebhook('https://example.com/webhook');

      expect(result.success).toBe(true);
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.url).toBe('https://example.com/webhook');
    });
  });

  describe('deleteWebhook', () => {
    test('deletes webhook successfully', async () => {
      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      });

      const result = await telegram.deleteWebhook();
      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // getBotInfo / getWebhookInfo
  // ========================================

  describe('getBotInfo', () => {
    test('returns bot information', async () => {
      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true, result: { id: 1, first_name: 'WorkLinkBot' } }),
      });

      const result = await telegram.getBotInfo();
      expect(result.success).toBe(true);
      expect(result.bot.first_name).toBe('WorkLinkBot');
    });
  });

  describe('getWebhookInfo', () => {
    test('returns webhook information', async () => {
      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true, result: { url: 'https://example.com/wh' } }),
      });

      const result = await telegram.getWebhookInfo();
      expect(result.success).toBe(true);
      expect(result.webhook.url).toBe('https://example.com/wh');
    });
  });

  // ========================================
  // formatJobPost
  // ========================================

  describe('formatJobPost', () => {
    test('formats a job posting with all fields', () => {
      const job = {
        title: 'Warehouse Associate',
        location: 'Jurong',
        job_date: '2026-04-01',
        start_time: '09:00',
        end_time: '17:00',
        pay_rate: 15,
        description: 'Loading and unloading',
        xp_bonus: 50,
      };

      const message = telegram.formatJobPost(job, 'https://app.worklink.sg/jobs/1');

      expect(message).toContain('<b>Warehouse Associate</b>');
      expect(message).toContain('$15/hr');
      expect(message).toContain('+50 XP Bonus');
      expect(message).toContain('href="https://app.worklink.sg/jobs/1"');
    });

    test('omits XP bonus line when not present', () => {
      const job = {
        title: 'Cleaner',
        location: 'CBD',
        job_date: '2026-04-02',
        start_time: '08:00',
        end_time: '12:00',
        pay_rate: 12,
        description: '',
        xp_bonus: 0,
      };

      const message = telegram.formatJobPost(job, 'https://app.worklink.sg/jobs/2');

      expect(message).not.toContain('XP Bonus');
    });
  });

  // ========================================
  // sendToGroup
  // ========================================

  describe('sendToGroup', () => {
    test('delegates to sendMessage', async () => {
      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true, result: { message_id: 80 } }),
      });

      const result = await telegram.sendToGroup('-100123', 'Group msg');

      expect(result.success).toBe(true);
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.chat_id).toBe('-100123');
    });
  });
});

// ---------------------------------------------------------------------------
// MESSAGING SERVICE TESTS
// ---------------------------------------------------------------------------

describe('Messaging Service', () => {
  let messaging;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up telegram token so telegram.isConfigured() returns true
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';

    // We need to re-require messaging so it picks up our mocks
    jest.resetModules();

    // Re-mock everything for the fresh module graph
    jest.mock('../../db', () => ({ db: mockDb }));
    jest.mock('../../websocket', () => ({
      broadcastToCandidate: mockBroadcastToCandidate,
      broadcastToAdmins: mockBroadcastToAdmins,
      createNotification: mockCreateNotification,
      isCandidateOnline: mockIsCandidateOnline,
      EventTypes: { CHAT_MESSAGE: 'chat_message' },
    }));
    jest.mock('web-push', () => ({ sendNotification: mockSendNotification }));
    jest.mock('../../utils/structured-logger', () => ({
      createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }),
    }));

    messaging = require('../../services/messaging/index');
  });

  // ========================================
  // Channels constant
  // ========================================

  describe('Channels', () => {
    test('exports expected channel constants', () => {
      expect(messaging.Channels.APP).toBe('app');
      expect(messaging.Channels.TELEGRAM).toBe('telegram');
      expect(messaging.Channels.AUTO).toBe('auto');
      expect(messaging.Channels.ALL).toBe('all');
    });
  });

  // ========================================
  // getLastCandidateMessageChannel
  // ========================================

  describe('getLastCandidateMessageChannel', () => {
    test('returns the channel from the last candidate message', () => {
      mockPrepare.mockReturnValueOnce({ get: jest.fn(() => ({ channel: 'telegram' })) });

      const result = messaging.getLastCandidateMessageChannel('C001');
      expect(result).toBe('telegram');
    });

    test('defaults to app when no messages found', () => {
      mockPrepare.mockReturnValueOnce({ get: jest.fn(() => null) });

      const result = messaging.getLastCandidateMessageChannel('C001');
      expect(result).toBe('app');
    });
  });

  // ========================================
  // sendToCandidate
  // ========================================

  describe('sendToCandidate', () => {
    const candidateRow = {
      id: 'C001',
      name: 'John',
      telegram_chat_id: '99999',
      preferred_contact: 'app',
      online_status: 'online',
      push_token: null,
    };

    beforeEach(() => {
      // Default mocks for sendToCandidate flow:
      // 1. SELECT candidate
      // 2. INSERT message
      // 3. SELECT message (for full object)
      // 4. broadcastToAdmins gets called
      mockPrepare.mockImplementation((sql) => {
        if (sql.includes('FROM candidates WHERE')) {
          return { get: jest.fn(() => candidateRow) };
        }
        if (sql.includes('INSERT INTO messages')) {
          return { run: jest.fn() };
        }
        if (sql.includes('FROM messages WHERE')) {
          return { get: jest.fn(() => ({ id: 1, content: 'Hello', channel: 'app' })) };
        }
        if (sql.includes('FROM messages') && sql.includes('sender')) {
          return { get: jest.fn(() => ({ channel: 'app' })) };
        }
        if (sql.includes('UPDATE messages')) {
          return { run: jest.fn() };
        }
        return { get: jest.fn(() => null), run: jest.fn(), all: jest.fn(() => []) };
      });

      mockIsCandidateOnline.mockReturnValue(true);
    });

    test('returns error when candidate not found', async () => {
      mockPrepare.mockImplementation(() => ({
        get: jest.fn(() => null),
        run: jest.fn(),
      }));

      const result = await messaging.sendToCandidate('UNKNOWN', 'Hi');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Candidate not found');
    });

    test('sends to app channel via WebSocket', async () => {
      const result = await messaging.sendToCandidate('C001', 'Hello', { channel: 'app' });

      expect(result.success).toBe(true);
      expect(result.sentToApp).toBe(true);
      expect(mockBroadcastToCandidate).toHaveBeenCalledWith('C001', expect.objectContaining({
        type: 'chat_message',
      }));
      expect(mockCreateNotification).toHaveBeenCalled();
    });

    test('broadcasts to admins after sending', async () => {
      await messaging.sendToCandidate('C001', 'Hello', { channel: 'app' });

      expect(mockBroadcastToAdmins).toHaveBeenCalledWith(expect.objectContaining({
        type: 'message_sent',
        candidateId: 'C001',
      }));
    });

    test('sends to telegram channel when configured', async () => {
      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true, result: { message_id: 99 } }),
      });

      const result = await messaging.sendToCandidate('C001', 'Hello via TG', { channel: 'telegram' });

      expect(result.success).toBe(true);
      expect(result.sentToTelegram).toBe(true);
    });

    test('sends push notification when candidate is offline', async () => {
      const offlineCandidate = {
        ...candidateRow,
        push_token: JSON.stringify({ endpoint: 'https://push.example.com', keys: { p256dh: 'key', auth: 'auth' } }),
      };
      mockPrepare.mockImplementation((sql) => {
        if (sql.includes('FROM candidates WHERE')) {
          return { get: jest.fn(() => offlineCandidate) };
        }
        if (sql.includes('INSERT INTO messages')) {
          return { run: jest.fn() };
        }
        if (sql.includes('FROM messages WHERE')) {
          return { get: jest.fn(() => ({ id: 1, content: 'Hello', channel: 'app' })) };
        }
        return { get: jest.fn(() => null), run: jest.fn(), all: jest.fn(() => []) };
      });

      mockIsCandidateOnline.mockReturnValue(false);
      mockSendNotification.mockResolvedValue({});

      const result = await messaging.sendToCandidate('C001', 'You have a message', { channel: 'app' });

      expect(result.success).toBe(true);
      expect(mockSendNotification).toHaveBeenCalled();
    });

    test('auto channel resolves from last candidate message', async () => {
      // Override so last message channel is 'telegram'
      mockPrepare.mockImplementation((sql) => {
        if (sql.includes('FROM candidates WHERE')) {
          return { get: jest.fn(() => candidateRow) };
        }
        if (sql.includes('sender = \'candidate\'')) {
          return { get: jest.fn(() => ({ channel: 'telegram' })) };
        }
        if (sql.includes('INSERT INTO messages')) {
          return { run: jest.fn() };
        }
        if (sql.includes('FROM messages WHERE')) {
          return { get: jest.fn(() => ({ id: 1, content: 'Hi', channel: 'telegram' })) };
        }
        if (sql.includes('UPDATE messages')) {
          return { run: jest.fn() };
        }
        return { get: jest.fn(() => null), run: jest.fn(), all: jest.fn(() => []) };
      });

      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true, result: { message_id: 101 } }),
      });

      const result = await messaging.sendToCandidate('C001', 'Auto-routed', { channel: 'auto' });

      expect(result.success).toBe(true);
      expect(result.channel).toBe('telegram');
    });
  });

  // ========================================
  // sendViaApp / sendViaTelegram
  // ========================================

  describe('sendViaApp', () => {
    test('delegates to sendToCandidate with channel app', async () => {
      const candidateRow = { id: 'C001', name: 'J', telegram_chat_id: null, preferred_contact: 'app', online_status: 'online', push_token: null };
      mockPrepare.mockImplementation((sql) => {
        if (sql.includes('FROM candidates WHERE')) return { get: jest.fn(() => candidateRow) };
        if (sql.includes('INSERT INTO messages')) return { run: jest.fn() };
        if (sql.includes('FROM messages WHERE')) return { get: jest.fn(() => ({ id: 1, content: 'Hi', channel: 'app' })) };
        return { get: jest.fn(() => null), run: jest.fn(), all: jest.fn(() => []) };
      });
      mockIsCandidateOnline.mockReturnValue(true);

      const result = await messaging.sendViaApp('C001', 'Via app');
      expect(result.success).toBe(true);
      expect(result.sentToApp).toBe(true);
    });
  });

  // ========================================
  // handleIncomingMessage
  // ========================================

  describe('handleIncomingMessage', () => {
    test('processes incoming telegram message from known candidate', async () => {
      mockPrepare.mockImplementation((sql) => {
        if (sql.includes('FROM candidates WHERE telegram_chat_id')) {
          return { get: jest.fn(() => ({ id: 'C001' })) };
        }
        if (sql.includes('INSERT INTO messages')) {
          return { run: jest.fn() };
        }
        if (sql.includes('FROM messages WHERE id')) {
          return { get: jest.fn(() => ({ id: 999, candidate_id: 'C001', content: 'Hi there', channel: 'telegram' })) };
        }
        return { get: jest.fn(() => null), run: jest.fn(), all: jest.fn(() => []) };
      });

      // Mock the AI chat require inside handleIncomingMessage
      jest.mock('../../services/ai-chat', () => ({
        processIncomingMessage: jest.fn().mockResolvedValue({ mode: 'auto' }),
      }), { virtual: true });

      const data = { chat: { id: 12345 }, text: 'Hi there', message_id: 777 };
      const result = await messaging.handleIncomingMessage('telegram', data);

      expect(result.success).toBe(true);
      expect(result.candidateId).toBe('C001');
      expect(result.channel).toBe('telegram');
      expect(mockBroadcastToAdmins).toHaveBeenCalledWith(expect.objectContaining({
        type: 'new_message',
      }));
    });

    test('returns error for unknown telegram user', async () => {
      mockPrepare.mockImplementation(() => ({
        get: jest.fn(() => null),
        run: jest.fn(),
      }));

      const data = { chat: { id: 99999 }, text: 'Who am I?', message_id: 1 };
      const result = await messaging.handleIncomingMessage('telegram', data);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown telegram user');
    });

    test('returns error for WhatsApp (not implemented)', async () => {
      const result = await messaging.handleIncomingMessage('whatsapp', {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('WhatsApp not implemented');
    });

    test('returns error for unknown channel', async () => {
      const result = await messaging.handleIncomingMessage('sms', {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown channel');
    });
  });

  // ========================================
  // getCandidateChannels
  // ========================================

  describe('getCandidateChannels', () => {
    test('returns channel status for existing candidate', () => {
      mockPrepare.mockImplementation((sql) => {
        if (sql.includes('whatsapp_opted_in')) {
          return { get: jest.fn(() => ({ telegram_chat_id: '555', whatsapp_opted_in: 0, preferred_contact: 'telegram' })) };
        }
        // getLastCandidateMessageChannel inner query
        return { get: jest.fn(() => ({ channel: 'telegram' })) };
      });

      const channels = messaging.getCandidateChannels('C001');

      expect(channels.app).toBe(true);
      expect(channels.telegram).toBe(true);
      expect(channels.whatsapp).toBe(false);
      expect(channels.preferred).toBe('telegram');
    });

    test('returns null for non-existent candidate', () => {
      mockPrepare.mockReturnValue({ get: jest.fn(() => null) });

      const channels = messaging.getCandidateChannels('UNKNOWN');
      expect(channels).toBeNull();
    });
  });

  // ========================================
  // getConfiguredChannels
  // ========================================

  describe('getConfiguredChannels', () => {
    test('returns configured status of all channels', () => {
      const channels = messaging.getConfiguredChannels();

      expect(channels.app).toBe(true);
      expect(typeof channels.telegram).toBe('boolean');
      expect(channels.whatsapp).toBe(false);
    });
  });

  // ========================================
  // generateVerificationCode
  // ========================================

  describe('generateVerificationCode', () => {
    test('generates a 6-character uppercase code and stores it', () => {
      mockExec.mockReturnValue(undefined);
      mockPrepare.mockReturnValue({ run: jest.fn() });

      const code = messaging.generateVerificationCode('C001');

      expect(typeof code).toBe('string');
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });
  });

  // ========================================
  // linkTelegram
  // ========================================

  describe('linkTelegram', () => {
    test('links telegram chat when code is valid', async () => {
      const mockRun = jest.fn();
      mockPrepare.mockImplementation((sql) => {
        if (sql.includes('FROM telegram_verifications')) {
          return { get: jest.fn(() => ({ candidate_id: 'C001' })) };
        }
        return { run: mockRun };
      });

      const result = await messaging.linkTelegram('12345', 'ABC123');

      expect(result.success).toBe(true);
      expect(result.candidateId).toBe('C001');
      expect(mockRun).toHaveBeenCalled();
    });

    test('returns error for invalid/expired code', async () => {
      mockPrepare.mockReturnValue({ get: jest.fn(() => null), run: jest.fn() });

      const result = await messaging.linkTelegram('12345', 'BADCODE');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired code');
    });
  });
});
