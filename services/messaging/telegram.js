/**
 * Telegram Bot Service
 * Handles sending and receiving messages via Telegram Bot API
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Send a message to a Telegram chat
 * @param {string} chatId - Telegram chat ID
 * @param {string} text - Message text
 * @param {object} options - Additional options (parse_mode, reply_markup, etc.)
 */
async function sendMessage(chatId, text, options = {}) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return { success: false, error: 'Telegram not configured' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parse_mode || 'HTML',
        ...options,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error('Telegram API error:', result);
      return { success: false, error: result.description };
    }

    return {
      success: true,
      messageId: result.result.message_id,
      data: result.result
    };
  } catch (error) {
    console.error('Telegram send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a message with inline keyboard buttons
 */
async function sendMessageWithButtons(chatId, text, buttons) {
  return sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: buttons,
    },
  });
}

/**
 * Send a photo with caption
 */
async function sendPhoto(chatId, photoUrl, caption = '') {
  if (!TELEGRAM_BOT_TOKEN) {
    return { success: false, error: 'Telegram not configured' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: 'HTML',
      }),
    });

    const result = await response.json();
    return result.ok
      ? { success: true, messageId: result.result.message_id }
      : { success: false, error: result.description };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Send a document/file
 */
async function sendDocument(chatId, documentUrl, caption = '') {
  if (!TELEGRAM_BOT_TOKEN) {
    return { success: false, error: 'Telegram not configured' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendDocument`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        document: documentUrl,
        caption,
        parse_mode: 'HTML',
      }),
    });

    const result = await response.json();
    return result.ok
      ? { success: true, messageId: result.result.message_id }
      : { success: false, error: result.description };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Set webhook URL for receiving updates
 */
async function setWebhook(webhookUrl) {
  if (!TELEGRAM_BOT_TOKEN) {
    return { success: false, error: 'Telegram not configured' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
      }),
    });

    const result = await response.json();
    console.log('Telegram webhook set:', result);
    return result.ok
      ? { success: true }
      : { success: false, error: result.description };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Remove webhook
 */
async function deleteWebhook() {
  if (!TELEGRAM_BOT_TOKEN) {
    return { success: false, error: 'Telegram not configured' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/deleteWebhook`, {
      method: 'POST',
    });

    const result = await response.json();
    return result.ok
      ? { success: true }
      : { success: false, error: result.description };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get bot info
 */
async function getBotInfo() {
  if (!TELEGRAM_BOT_TOKEN) {
    return { success: false, error: 'Telegram not configured' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/getMe`);
    const result = await response.json();
    return result.ok
      ? { success: true, bot: result.result }
      : { success: false, error: result.description };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get webhook info
 */
async function getWebhookInfo() {
  if (!TELEGRAM_BOT_TOKEN) {
    return { success: false, error: 'Telegram not configured' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/getWebhookInfo`);
    const result = await response.json();
    return result.ok
      ? { success: true, webhook: result.result }
      : { success: false, error: result.description };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Send message to a group
 */
async function sendToGroup(groupChatId, text, options = {}) {
  return sendMessage(groupChatId, text, options);
}

/**
 * Format a job posting for Telegram
 */
function formatJobPost(job, applyUrl) {
  return `
<b>NEW JOB ALERT</b>

<b>${job.title}</b>
${job.location}

${job.job_date} | ${job.start_time} - ${job.end_time}
<b>$${job.pay_rate}/hr</b>

${job.description || ''}

${job.xp_bonus ? `+${job.xp_bonus} XP Bonus` : ''}

<a href="${applyUrl}">Apply Now</a>
`.trim();
}

/**
 * Check if Telegram is configured
 */
function isConfigured() {
  return !!TELEGRAM_BOT_TOKEN;
}

module.exports = {
  sendMessage,
  sendMessageWithButtons,
  sendPhoto,
  sendDocument,
  sendToGroup,
  setWebhook,
  deleteWebhook,
  getBotInfo,
  getWebhookInfo,
  formatJobPost,
  isConfigured,
};
