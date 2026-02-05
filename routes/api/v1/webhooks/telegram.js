/**
 * Telegram Webhook Handler
 * Receives incoming messages and events from Telegram Bot API
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../db');
const messaging = require('../../../../services/messaging');
const telegram = require('../../../../services/messaging/telegram');
const logger = require('../../../../utils/logger');

// Store for pending verifications (linking Telegram to candidate)
// In production, this would be in Redis or database

/**
 * Main webhook endpoint for Telegram updates
 * POST /api/v1/webhooks/telegram
 */
router.post('/', async (req, res) => {
  try {
    const update = req.body;

    logger.info('Telegram webhook received:', JSON.stringify(update, null, 2));

    // Handle different update types
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    // Always respond 200 to Telegram
    res.sendStatus(200);
  } catch (error) {
    logger.error('Telegram webhook error:', error);
    // Still respond 200 to prevent Telegram from retrying
    res.sendStatus(200);
  }
});

/**
 * Handle incoming messages
 */
async function handleMessage(message) {
  const chatId = String(message.chat.id);
  const text = message.text || '';
  const from = message.from;

  logger.info(`Telegram message from ${chatId}: ${text}`);

  // Check if this is a command
  if (text.startsWith('/')) {
    return handleCommand(chatId, text, from, message);
  }

  // Check if user is trying to link their account with a verification code
  if (text.length === 6 && /^[A-Z0-9]+$/.test(text)) {
    return handleVerificationCode(chatId, text, from);
  }

  // Regular message - route to admin chat
  const candidate = db.prepare(`
    SELECT id, name FROM candidates WHERE telegram_chat_id = ?
  `).get(chatId);

  if (!candidate) {
    // Unknown user - prompt to link account
    await telegram.sendMessage(chatId,
      `Hi! I don't recognize your Telegram account yet.\n\n` +
      `To link your WorkLink account:\n` +
      `1. Open the WorkLink app\n` +
      `2. Go to Settings > Connect Telegram\n` +
      `3. Send me the 6-character code shown there\n\n` +
      `Or type /start to learn more.`
    );
    return;
  }

  // Forward message to admin chat
  const result = await messaging.handleIncomingMessage('telegram', {
    chat: { id: chatId },
    text: text,
    message_id: message.message_id,
    from: from,
  });

  if (result.success) {
    logger.info(`Message from ${candidate.name} forwarded to admin`);
  }
}

/**
 * Handle bot commands
 */
async function handleCommand(chatId, text, from, message) {
  const command = text.split(' ')[0].toLowerCase();
  const args = text.split(' ').slice(1).join(' ');

  switch (command) {
    case '/start':
      await handleStartCommand(chatId, from, args);
      break;

    case '/help':
      await handleHelpCommand(chatId);
      break;

    case '/link':
      await handleLinkCommand(chatId, args);
      break;

    case '/status':
      await handleStatusCommand(chatId);
      break;

    case '/jobs':
      await handleJobsCommand(chatId);
      break;

    case '/unlink':
      await handleUnlinkCommand(chatId);
      break;

    default:
      await telegram.sendMessage(chatId,
        `Unknown command. Type /help to see available commands.`
      );
  }
}

/**
 * /start command - Welcome message
 */
async function handleStartCommand(chatId, from, args) {
  const candidate = db.prepare(`
    SELECT id, name FROM candidates WHERE telegram_chat_id = ?
  `).get(chatId);

  if (candidate) {
    await telegram.sendMessage(chatId,
      `Welcome back, <b>${candidate.name}</b>!\n\n` +
      `Your Telegram is linked to WorkLink. You'll receive:\n` +
      `- Job notifications\n` +
      `- Messages from WorkLink support\n` +
      `- Payment updates\n\n` +
      `Type /help for available commands.`
    );
    return;
  }

  // Check if started with a deep link (verification code)
  if (args && args.length === 6) {
    return handleVerificationCode(chatId, args.toUpperCase(), from);
  }

  await telegram.sendMessage(chatId,
    `Hi <b>${from.first_name}</b>! Welcome to WorkLink Bot.\n\n` +
    `To get started, link your WorkLink account:\n\n` +
    `1. Open the WorkLink app\n` +
    `2. Go to <b>Settings</b> > <b>Connect Telegram</b>\n` +
    `3. Send me the 6-character code\n\n` +
    `Or use: /link YOUR_CODE\n\n` +
    `Type /help for more options.`
  );
}

/**
 * /help command
 */
async function handleHelpCommand(chatId) {
  await telegram.sendMessage(chatId,
    `<b>WorkLink Bot Commands</b>\n\n` +
    `/start - Welcome message\n` +
    `/link CODE - Link your WorkLink account\n` +
    `/status - Check your account status\n` +
    `/jobs - View available jobs\n` +
    `/unlink - Disconnect Telegram from WorkLink\n` +
    `/help - Show this message\n\n` +
    `You can also just send a message and it will be forwarded to WorkLink support.`
  );
}

/**
 * /link command - Link account with verification code
 */
async function handleLinkCommand(chatId, code) {
  if (!code) {
    await telegram.sendMessage(chatId,
      `Please provide your verification code.\n\n` +
      `Usage: /link YOUR_CODE\n\n` +
      `Get your code from: WorkLink App > Settings > Connect Telegram`
    );
    return;
  }

  await handleVerificationCode(chatId, code.toUpperCase(), null);
}

/**
 * Handle verification code for account linking
 */
async function handleVerificationCode(chatId, code, from) {
  const result = await messaging.linkTelegram(chatId, code);

  if (result.success) {
    const candidate = db.prepare(`
      SELECT name FROM candidates WHERE id = ?
    `).get(result.candidateId);

    await telegram.sendMessage(chatId,
      `Account linked successfully!\n\n` +
      `Welcome, <b>${candidate?.name || 'there'}</b>!\n\n` +
      `You'll now receive:\n` +
      `- Job notifications\n` +
      `- Messages from WorkLink support\n` +
      `- Payment updates\n\n` +
      `Type /help for available commands.`
    );
  } else {
    await telegram.sendMessage(chatId,
      `Invalid or expired code.\n\n` +
      `Please get a new code from:\n` +
      `WorkLink App > Settings > Connect Telegram`
    );
  }
}

/**
 * /status command - Show account status
 */
async function handleStatusCommand(chatId) {
  const candidate = db.prepare(`
    SELECT name, level, xp, total_jobs_completed, total_earnings, streak_days
    FROM candidates WHERE telegram_chat_id = ?
  `).get(chatId);

  if (!candidate) {
    await telegram.sendMessage(chatId,
      `Your Telegram is not linked to a WorkLink account.\n\n` +
      `Use /link CODE to connect your account.`
    );
    return;
  }

  await telegram.sendMessage(chatId,
    `<b>Your WorkLink Status</b>\n\n` +
    `<b>${candidate.name}</b>\n` +
    `Level ${candidate.level} | ${candidate.xp} XP\n\n` +
    `Jobs Completed: ${candidate.total_jobs_completed}\n` +
    `Total Earnings: $${(candidate.total_earnings || 0).toFixed(2)}\n` +
    `Current Streak: ${candidate.streak_days} days`
  );
}

/**
 * /jobs command - Show available jobs
 */
async function handleJobsCommand(chatId) {
  const candidate = db.prepare(`
    SELECT id FROM candidates WHERE telegram_chat_id = ?
  `).get(chatId);

  if (!candidate) {
    await telegram.sendMessage(chatId,
      `Please link your account first using /link CODE`
    );
    return;
  }

  const jobs = db.prepare(`
    SELECT id, title, location, job_date, start_time, end_time, pay_rate
    FROM jobs
    WHERE status = 'open' AND job_date >= date('now')
    ORDER BY job_date ASC
    LIMIT 5
  `).all();

  if (jobs.length === 0) {
    await telegram.sendMessage(chatId,
      `No jobs available at the moment.\n\n` +
      `We'll notify you when new jobs are posted!`
    );
    return;
  }

  let message = `<b>Available Jobs</b>\n\n`;

  jobs.forEach((job, i) => {
    message += `${i + 1}. <b>${job.title}</b>\n`;
    message += `   ${job.location}\n`;
    message += `   ${job.job_date} | ${job.start_time}-${job.end_time}\n`;
    message += `   $${job.pay_rate}/hr\n\n`;
  });

  message += `Apply in the WorkLink app for more details!`;

  await telegram.sendMessage(chatId, message);
}

/**
 * /unlink command - Disconnect Telegram
 */
async function handleUnlinkCommand(chatId) {
  const candidate = db.prepare(`
    SELECT id, name FROM candidates WHERE telegram_chat_id = ?
  `).get(chatId);

  if (!candidate) {
    await telegram.sendMessage(chatId,
      `Your Telegram is not linked to any WorkLink account.`
    );
    return;
  }

  db.prepare(`
    UPDATE candidates SET telegram_chat_id = NULL WHERE id = ?
  `).run(candidate.id);

  await telegram.sendMessage(chatId,
    `Your Telegram has been disconnected from WorkLink.\n\n` +
    `You will no longer receive notifications here.\n\n` +
    `Use /link CODE to reconnect anytime.`
  );
}

/**
 * Handle callback queries (button presses)
 */
async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  logger.info(`Callback query from ${chatId}: ${data}`);

  // Parse callback data
  const [action, ...params] = data.split(':');

  switch (action) {
    case 'apply':
      // Handle job application
      const jobId = params[0];
      await telegram.sendMessage(chatId,
        `To apply for this job, please open the WorkLink app and apply there.\n\n` +
        `This ensures we have all your details for the client.`
      );
      break;

    case 'confirm':
      // Handle confirmation
      await telegram.sendMessage(chatId, `Confirmed!`);
      break;

    default:
      logger.info('Unknown callback action:', action);
  }
}

/**
 * Setup webhook endpoint
 * GET /api/v1/webhooks/telegram/setup
 */
router.get('/setup', async (req, res) => {
  // Require BASE_URL to be explicitly set - don't trust Host header
  const baseUrl = process.env.BASE_URL;

  if (!baseUrl) {
    return res.status(500).json({
      success: false,
      error: 'BASE_URL environment variable not configured'
    });
  }

  const webhookUrl = `${baseUrl}/api/v1/webhooks/telegram`;

  const result = await telegram.setWebhook(webhookUrl);

  if (result.success) {
    res.json({
      success: true,
      message: 'Webhook configured',
      webhookUrl,
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
    });
  }
});

/**
 * Get webhook info
 * GET /api/v1/webhooks/telegram/info
 */
router.get('/info', async (req, res) => {
  const [botInfo, webhookInfo] = await Promise.all([
    telegram.getBotInfo(),
    telegram.getWebhookInfo(),
  ]);

  res.json({
    configured: telegram.isConfigured(),
    bot: botInfo.success ? botInfo.bot : null,
    webhook: webhookInfo.success ? webhookInfo.webhook : null,
    error: botInfo.error || webhookInfo.error,
  });
});

/**
 * Remove webhook
 * DELETE /api/v1/webhooks/telegram
 */
router.delete('/', async (req, res) => {
  const result = await telegram.deleteWebhook();
  res.json(result);
});

module.exports = router;
