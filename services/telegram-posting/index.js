/**
 * Telegram Group Posting Service
 *
 * Handles posting job advertisements to Telegram groups
 * with A/B testing and ML optimization integration.
 */

const { db } = require('../../db');
const telegram = require('../messaging/telegram');
const adML = require('../ad-ml');
const abTesting = require('../ad-ml/ab-testing');
const timing = require('../ad-ml/timing');

/**
 * Get posting settings
 */
function getSettings() {
  const rows = db.prepare(`
    SELECT * FROM telegram_auto_post_settings ORDER BY id DESC LIMIT 1
  `).get();

  return rows || {
    enabled: false,
    post_on_job_create: true,
    default_groups: null,
  };
}

/**
 * Update posting settings
 */
function updateSettings(updates) {
  const current = getSettings();

  db.prepare(`
    INSERT INTO telegram_auto_post_settings (enabled, post_on_job_create, default_groups, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(
    updates.enabled !== undefined ? updates.enabled : current.enabled,
    updates.post_on_job_create !== undefined ? updates.post_on_job_create : current.post_on_job_create,
    updates.default_groups !== undefined ? updates.default_groups : current.default_groups
  );
}

/**
 * Get all configured Telegram groups
 */
function getGroups(activeOnly = true) {
  let query = 'SELECT * FROM telegram_groups';
  if (activeOnly) {
    query += ' WHERE active = 1';
  }
  query += ' ORDER BY created_at DESC';

  return db.prepare(query).all();
}

/**
 * Add a Telegram group
 */
function addGroup(chatId, name, type = 'job_posting') {
  const result = db.prepare(`
    INSERT INTO telegram_groups (chat_id, name, type, active, created_at)
    VALUES (?, ?, ?, 1, datetime('now'))
  `).run(chatId, name, type);

  return result.lastInsertRowid;
}

/**
 * Update a group
 */
function updateGroup(id, updates) {
  const setClauses = [];
  const params = [];

  if (updates.name !== undefined) {
    setClauses.push('name = ?');
    params.push(updates.name);
  }
  if (updates.active !== undefined) {
    setClauses.push('active = ?');
    params.push(updates.active ? 1 : 0);
  }
  if (updates.type !== undefined) {
    setClauses.push('type = ?');
    params.push(updates.type);
  }

  if (setClauses.length === 0) return;

  params.push(id);
  db.prepare(`UPDATE telegram_groups SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
}

/**
 * Remove a group
 */
function removeGroup(id) {
  db.prepare('DELETE FROM telegram_groups WHERE id = ?').run(id);
}

/**
 * Post job to a single group
 */
async function postJobToGroup(job, groupId, options = {}) {
  const { content = null, variantId = null } = options;

  const group = db.prepare('SELECT * FROM telegram_groups WHERE id = ?').get(groupId);
  if (!group) {
    return { success: false, error: 'Group not found' };
  }

  // Use provided content or generate from job
  const messageContent = content || formatJobPost(job);

  // Send to Telegram
  const result = await telegram.sendToGroup(group.chat_id, messageContent);

  if (result.success) {
    // Record the post
    db.prepare(`
      INSERT INTO telegram_job_posts (job_id, group_id, message_id, posted_at, status)
      VALUES (?, ?, ?, datetime('now'), 'sent')
    `).run(job.id, groupId, result.messageId);

    // Record in ad performance if variant tracking
    if (variantId) {
      adML.recordPost(variantId, groupId, result.messageId, new Date());
    }

    return {
      success: true,
      messageId: result.messageId,
      groupId,
      groupName: group.name,
    };
  }

  return { success: false, error: result.error, groupId };
}

/**
 * Post job to all active groups
 */
async function postJobToAllGroups(job, options = {}) {
  const { useABTesting = true, scheduleOptimal = false } = options;
  const settings = adML.getSettings();
  const groups = getGroups(true);

  if (groups.length === 0) {
    return { success: false, error: 'No active groups configured' };
  }

  // Check if we should schedule for optimal time
  if (scheduleOptimal) {
    const schedule = timing.scheduleOptimalPost(job.id);
    if (!schedule.postNow) {
      // TODO: Implement scheduling queue
      return {
        success: true,
        scheduled: true,
        scheduledTime: schedule.scheduledTime,
        reason: schedule.reason,
      };
    }
  }

  const results = [];

  // A/B testing with multiple groups
  if (useABTesting && settings.ab_testing_enabled !== false && groups.length >= 2) {
    // Generate variants
    const variants = await adML.generateAdVariants(job, Math.min(groups.length, 3));

    // Assign variants to groups
    const assignments = abTesting.assignVariantsToGroups(variants, groups);

    // Post each variant to assigned groups
    for (const group of groups) {
      const variant = assignments[group.id];
      const result = await postJobToGroup(job, group.id, {
        content: variant.content,
        variantId: variant.id,
      });
      results.push({
        ...result,
        variantKey: variant.variantKey,
        testVariable: variant.testVariable,
      });
    }

    // Schedule evaluation after measurement period
    const measurementHours = settings.measurement_hours || 48;
    scheduleTestEvaluation(job.id, measurementHours);

    return {
      success: true,
      results,
      isABTest: true,
      variantCount: variants.length,
      measurementHours,
    };
  } else {
    // Single optimized ad for all groups
    const content = await adML.generateOptimizedAd(job);

    for (const group of groups) {
      const result = await postJobToGroup(job, group.id, { content });
      results.push(result);
    }

    return {
      success: true,
      results,
      isABTest: false,
    };
  }
}

/**
 * Schedule test evaluation (in production, use a proper job queue)
 */
function scheduleTestEvaluation(jobId, hours) {
  // Simple setTimeout for now - in production use a job queue like Bull
  const ms = hours * 60 * 60 * 1000;

  setTimeout(async () => {
    try {
      const result = await adML.evaluateTest(jobId);
      console.log(`A/B test evaluation for job ${jobId}:`, result);
    } catch (error) {
      console.error(`Failed to evaluate A/B test for job ${jobId}:`, error);
    }
  }, ms);

  console.log(`Scheduled A/B test evaluation for job ${jobId} in ${hours} hours`);
}

/**
 * Format a job as a Telegram post (basic formatting)
 */
function formatJobPost(job, options = {}) {
  const { includeApplyLink = true, appBaseUrl = process.env.APP_BASE_URL || 'https://worklink.sg' } = options;

  let post = `🔥 *${job.title.toUpperCase()}*\n\n`;

  post += `📍 Location: ${job.location}\n`;
  post += `💰 Pay: $${job.pay_rate}/hr\n`;
  post += `📅 Date: ${job.job_date}\n`;

  if (job.start_time && job.end_time) {
    post += `⏰ Time: ${job.start_time} - ${job.end_time}\n`;
  }

  const slotsAvailable = job.total_slots - (job.filled_slots || 0);
  post += `👥 Slots: ${slotsAvailable} available\n`;

  if (job.requirements) {
    post += `\n✅ Requirements: ${job.requirements}\n`;
  }

  if (job.description) {
    post += `\n${job.description}\n`;
  }

  if (includeApplyLink) {
    post += `\n📱 Apply now: ${appBaseUrl}/jobs/${job.id}`;
  } else {
    post += '\n📱 Apply in the WorkLink app!';
  }

  return post;
}

/**
 * Get post history for a job
 */
function getJobPostHistory(jobId) {
  return db.prepare(`
    SELECT
      p.*,
      g.name as group_name,
      g.chat_id
    FROM telegram_job_posts p
    JOIN telegram_groups g ON p.group_id = g.id
    WHERE p.job_id = ?
    ORDER BY p.posted_at DESC
  `).all(jobId);
}

/**
 * Get all recent posts
 */
function getRecentPosts(limit = 50) {
  return db.prepare(`
    SELECT
      p.*,
      g.name as group_name,
      j.title as job_title
    FROM telegram_job_posts p
    JOIN telegram_groups g ON p.group_id = g.id
    JOIN jobs j ON p.job_id = j.id
    ORDER BY p.posted_at DESC
    LIMIT ?
  `).all(limit);
}

/**
 * Delete a post (cannot actually delete from Telegram, just marks as deleted)
 */
function deletePost(postId) {
  db.prepare(`
    UPDATE telegram_job_posts SET status = 'deleted' WHERE id = ?
  `).run(postId);
}

/**
 * Track response from ad (called when candidate applies mentioning source)
 */
async function trackAdResponse(jobId, groupId, candidateId) {
  // Find which variant was used for this group
  const post = db.prepare(`
    SELECT v.id as variant_id
    FROM telegram_job_posts p
    JOIN ad_performance ap ON p.message_id = ap.message_id AND p.group_id = ap.group_id
    JOIN ad_variants v ON ap.variant_id = v.id
    WHERE p.job_id = ? AND p.group_id = ?
    ORDER BY p.posted_at DESC
    LIMIT 1
  `).get(jobId, groupId);

  if (post?.variant_id) {
    adML.recordResponse(post.variant_id);
    return { tracked: true, variantId: post.variant_id };
  }

  return { tracked: false };
}

/**
 * Check if Telegram posting is configured
 */
function isConfigured() {
  return telegram.isConfigured();
}

module.exports = {
  getSettings,
  updateSettings,
  getGroups,
  addGroup,
  updateGroup,
  removeGroup,
  postJobToGroup,
  postJobToAllGroups,
  formatJobPost,
  getJobPostHistory,
  getRecentPosts,
  deletePost,
  trackAdResponse,
  isConfigured,
};
