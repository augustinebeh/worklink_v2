/**
 * Ad ML Service
 *
 * Handles advertisement optimization through A/B testing and machine learning.
 * Tracks performance, learns optimal variables, and exports training data.
 */

const { db } = require('../../db');
const { askClaude } = require('../../utils/claude');
const abTesting = require('./ab-testing');
const timing = require('./timing');

/**
 * Get Ad ML settings
 */
function getSettings() {
  const rows = db.prepare('SELECT key, value FROM ad_ml_settings').all();
  const settings = {};
  rows.forEach(row => {
    if (row.value === 'true') settings[row.key] = true;
    else if (row.value === 'false') settings[row.key] = false;
    else if (!isNaN(parseFloat(row.value))) settings[row.key] = parseFloat(row.value);
    else settings[row.key] = row.value;
  });
  return settings;
}

/**
 * Update Ad ML setting
 */
function updateSetting(key, value) {
  db.prepare(`
    INSERT INTO ad_ml_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = ?
  `).run(key, String(value), String(value));
}

/**
 * Generate ad variants for A/B testing
 */
async function generateAdVariants(job, count = 2) {
  const settings = getSettings();

  // Get learned preferences
  const preferences = getLearnedPreferences(job.category);

  // Select variable to test (lowest confidence)
  const testVariable = abTesting.selectTestVariable(job.category);

  const variants = [];

  for (let i = 0; i < count; i++) {
    const variantKey = String.fromCharCode(65 + i); // A, B, C...
    const variables = { ...preferences };

    // Apply test variable value for this variant
    if (testVariable) {
      variables[testVariable.name] = testVariable.values[i % testVariable.values.length];
    }

    // Generate ad content
    const content = await generateAdContent(job, variables);

    // Store variant
    const result = db.prepare(`
      INSERT INTO ad_variants (job_id, variant_key, content, variables, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(job.id, variantKey, content, JSON.stringify(variables));

    variants.push({
      id: result.lastInsertRowid,
      variantKey,
      content,
      variables,
      testVariable: testVariable?.name,
    });
  }

  return variants;
}

/**
 * Generate ad content using LLM with specified variables
 */
async function generateAdContent(job, variables) {
  const tone = variables.tone || 'friendly';
  const emojiCount = variables.emoji_count || 3;
  const length = variables.length || 'medium';
  const ctaStyle = variables.cta_style || 'direct';

  const systemPrompt = `You are a recruitment ad copywriter for WorkLink, a staffing agency in Singapore.
Generate a Telegram job posting based on the job details and style requirements.

Style requirements:
- Tone: ${tone} (options: formal, friendly, casual, urgent)
- Emoji usage: ${emojiCount} emojis total (0 = none, 3 = moderate, 5+ = heavy)
- Length: ${length} (short = under 100 words, medium = 100-150 words, long = 150+ words)
- Call-to-action style: ${ctaStyle} (direct = "Apply now!", soft = "Interested? Message us", question = "Ready to join?")

Return ONLY the ad text, ready to post. Use proper Telegram formatting (bold with *, italic with _).`;

  const prompt = `Generate a job ad for:
Title: ${job.title}
Location: ${job.location}
Pay: $${job.pay_rate}/hr
Date: ${job.job_date}
Time: ${job.start_time} - ${job.end_time}
Slots available: ${job.total_slots - (job.filled_slots || 0)}
Requirements: ${job.requirements || 'None specified'}
Description: ${job.description || ''}`;

  try {
    const response = await askClaude(prompt, systemPrompt, { maxTokens: 500 });
    return response.trim();
  } catch (error) {
    console.error('Ad generation failed:', error.message);
    // Fallback to template-based ad
    return generateTemplateAd(job, variables);
  }
}

/**
 * Fallback template-based ad generation
 */
function generateTemplateAd(job, variables) {
  const emojis = ['🔥', '💼', '📍', '💰', '📅', '⏰', '👥', '✅'];
  const useEmojis = (variables.emoji_count || 3) > 0;

  let ad = '';

  if (useEmojis) ad += '🔥 ';
  ad += `*${job.title.toUpperCase()}*\n\n`;

  if (useEmojis) ad += '📍 ';
  ad += `Location: ${job.location}\n`;

  if (useEmojis) ad += '💰 ';
  ad += `Pay: $${job.pay_rate}/hr\n`;

  if (useEmojis) ad += '📅 ';
  ad += `Date: ${job.job_date}\n`;

  if (useEmojis) ad += '⏰ ';
  ad += `Time: ${job.start_time} - ${job.end_time}\n`;

  const slotsAvailable = job.total_slots - (job.filled_slots || 0);
  if (useEmojis) ad += '👥 ';
  ad += `Slots: ${slotsAvailable} available\n\n`;

  if (job.requirements) {
    if (useEmojis) ad += '✅ ';
    ad += `Requirements: ${job.requirements}\n\n`;
  }

  // CTA based on style
  const ctaStyle = variables.cta_style || 'direct';
  if (ctaStyle === 'direct') {
    ad += 'Apply now in the WorkLink app!';
  } else if (ctaStyle === 'soft') {
    ad += 'Interested? Open WorkLink to apply.';
  } else {
    ad += 'Ready to join? Apply through WorkLink!';
  }

  return ad;
}

/**
 * Get learned preferences for a job category
 */
function getLearnedPreferences(category = null) {
  const query = category
    ? 'SELECT * FROM ad_variable_scores WHERE (job_category = ? OR job_category IS NULL) AND confidence >= 0.6 ORDER BY confidence DESC'
    : 'SELECT * FROM ad_variable_scores WHERE job_category IS NULL AND confidence >= 0.6 ORDER BY confidence DESC';

  const scores = category
    ? db.prepare(query).all(category)
    : db.prepare(query).all();

  const preferences = {};
  const seen = new Set();

  for (const score of scores) {
    if (!seen.has(score.variable_name)) {
      preferences[score.variable_name] = score.variable_value;
      seen.add(score.variable_name);
    }
  }

  return preferences;
}

/**
 * Generate a single optimized ad (using learned preferences)
 */
async function generateOptimizedAd(job) {
  const preferences = getLearnedPreferences(job.category);
  return generateAdContent(job, preferences);
}

/**
 * Record that an ad was posted
 */
function recordPost(variantId, groupId, messageId, postedAt) {
  const now = new Date(postedAt);
  const hour = now.getHours();
  const day = now.getDay();

  db.prepare(`
    INSERT INTO ad_performance (variant_id, job_id, group_id, message_id, posted_at, post_hour, post_day)
    SELECT ?, job_id, ?, ?, datetime(?), ?, ?
    FROM ad_variants WHERE id = ?
  `).run(variantId, groupId, messageId, postedAt.toISOString(), hour, day, variantId);
}

/**
 * Record a response to an ad
 */
function recordResponse(variantId) {
  db.prepare(`
    UPDATE ad_performance
    SET responses = responses + 1, measured_at = datetime('now')
    WHERE variant_id = ?
  `).run(variantId);
}

/**
 * Evaluate A/B test for a job
 */
async function evaluateTest(jobId) {
  // Get all variants for this job
  const variants = db.prepare(`
    SELECT
      v.id, v.variant_key, v.variables,
      COALESCE(SUM(p.responses), 0) as total_responses,
      COALESCE(AVG(p.response_rate), 0) as avg_response_rate
    FROM ad_variants v
    LEFT JOIN ad_performance p ON v.id = p.variant_id
    WHERE v.job_id = ?
    GROUP BY v.id
  `).all(jobId);

  if (variants.length < 2) {
    return { success: false, error: 'Not enough variants to evaluate' };
  }

  // Find winner
  const sorted = variants.sort((a, b) => b.total_responses - a.total_responses);
  const winner = sorted[0];
  const loser = sorted[1];

  if (winner.total_responses === loser.total_responses) {
    return { success: false, error: 'No clear winner yet' };
  }

  // Update variable scores
  const winnerVars = JSON.parse(winner.variables);
  const loserVars = JSON.parse(loser.variables);

  for (const [key, value] of Object.entries(winnerVars)) {
    updateVariableScore(key, value, null, 'win', winner.total_responses);
  }

  for (const [key, value] of Object.entries(loserVars)) {
    if (winnerVars[key] !== value) {
      updateVariableScore(key, value, null, 'lose', loser.total_responses);
    }
  }

  // Store in training data
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
  if (job) {
    const winnerVariant = db.prepare('SELECT * FROM ad_variants WHERE id = ?').get(winner.id);
    db.prepare(`
      INSERT INTO ad_training_data (job_details, ad_content, variables, response_rate, is_winner, quality_score, created_at)
      VALUES (?, ?, ?, ?, 1, ?, datetime('now'))
    `).run(
      JSON.stringify({ title: job.title, location: job.location, pay_rate: job.pay_rate, category: job.category }),
      winnerVariant.content,
      winner.variables,
      winner.avg_response_rate,
      Math.min(1, winner.avg_response_rate * 10)
    );
  }

  return {
    success: true,
    winner: {
      variantKey: winner.variant_key,
      responses: winner.total_responses,
      variables: winnerVars,
    },
    loser: {
      variantKey: loser.variant_key,
      responses: loser.total_responses,
      variables: loserVars,
    },
  };
}

/**
 * Update variable score based on A/B test result
 */
function updateVariableScore(variableName, variableValue, jobCategory, outcome, responses) {
  const existing = db.prepare(`
    SELECT * FROM ad_variable_scores
    WHERE variable_name = ? AND variable_value = ? AND (job_category = ? OR (job_category IS NULL AND ? IS NULL))
  `).get(variableName, variableValue, jobCategory, jobCategory);

  if (existing) {
    const winCount = outcome === 'win' ? existing.win_count + 1 : existing.win_count;
    const loseCount = outcome === 'lose' ? existing.lose_count + 1 : existing.lose_count;
    const totalResponses = existing.total_responses + responses;
    const avgResponseRate = totalResponses / (winCount + loseCount);
    const confidence = winCount / (winCount + loseCount + 1); // Simple confidence calculation

    db.prepare(`
      UPDATE ad_variable_scores
      SET win_count = ?, lose_count = ?, total_responses = ?, avg_response_rate = ?, confidence = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(winCount, loseCount, totalResponses, avgResponseRate, confidence, existing.id);
  } else {
    db.prepare(`
      INSERT INTO ad_variable_scores (variable_name, variable_value, job_category, win_count, lose_count, total_responses, avg_response_rate, confidence, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      variableName,
      variableValue,
      jobCategory,
      outcome === 'win' ? 1 : 0,
      outcome === 'lose' ? 1 : 0,
      responses,
      responses,
      outcome === 'win' ? 0.6 : 0.4
    );
  }
}

/**
 * Get optimal posting time
 */
function getOptimalPostTime(jobCategory = null) {
  return timing.suggestPostTime(jobCategory);
}

/**
 * Get Ad ML statistics
 */
function getStats() {
  const totalVariants = db.prepare('SELECT COUNT(*) as count FROM ad_variants').get().count;
  const totalTests = db.prepare('SELECT COUNT(DISTINCT job_id) as count FROM ad_variants WHERE (SELECT COUNT(*) FROM ad_variants v2 WHERE v2.job_id = ad_variants.job_id) >= 2').get().count;
  const totalResponses = db.prepare('SELECT COALESCE(SUM(responses), 0) as total FROM ad_performance').get().total;
  const avgResponseRate = db.prepare('SELECT COALESCE(AVG(response_rate), 0) as avg FROM ad_performance WHERE response_rate > 0').get().avg;

  const variableScores = db.prepare(`
    SELECT variable_name, variable_value, confidence, win_count, lose_count
    FROM ad_variable_scores
    WHERE confidence >= 0.6
    ORDER BY confidence DESC
    LIMIT 10
  `).all();

  const timingStats = timing.getTimingHeatmap();

  return {
    totalVariants,
    totalTests,
    totalResponses,
    avgResponseRate: avgResponseRate.toFixed(4),
    topVariables: variableScores,
    timingHeatmap: timingStats,
  };
}

/**
 * Get all variable scores
 */
function getVariableScores() {
  return db.prepare(`
    SELECT * FROM ad_variable_scores
    ORDER BY variable_name, confidence DESC
  `).all();
}

/**
 * Get active A/B tests
 */
function getActiveTests() {
  const tests = db.prepare(`
    SELECT
      v.job_id,
      j.title as job_title,
      COUNT(v.id) as variant_count,
      SUM(COALESCE(p.responses, 0)) as total_responses,
      MIN(v.created_at) as started_at
    FROM ad_variants v
    LEFT JOIN jobs j ON v.job_id = j.id
    LEFT JOIN ad_performance p ON v.id = p.variant_id
    GROUP BY v.job_id
    HAVING variant_count >= 2
    ORDER BY started_at DESC
    LIMIT 20
  `).all();

  return tests;
}

/**
 * Get training data for export
 */
function getTrainingData(options = {}) {
  const { limit = 100, minQuality = 0.5 } = options;

  return db.prepare(`
    SELECT * FROM ad_training_data
    WHERE quality_score >= ?
    ORDER BY quality_score DESC, created_at DESC
    LIMIT ?
  `).all(minQuality, limit);
}

/**
 * Export training data to JSONL format
 */
function exportToJSONL(options = {}) {
  const { minQuality = 0.5 } = options;

  const data = getTrainingData({ limit: 10000, minQuality });

  const lines = data.map(row => {
    return JSON.stringify({
      messages: [
        { role: 'user', content: `Generate a job ad for: ${row.job_details}` },
        { role: 'assistant', content: row.ad_content },
      ],
    });
  });

  return { content: lines.join('\n'), count: lines.length };
}

module.exports = {
  getSettings,
  updateSetting,
  generateAdVariants,
  generateOptimizedAd,
  recordPost,
  recordResponse,
  evaluateTest,
  getOptimalPostTime,
  getStats,
  getVariableScores,
  getActiveTests,
  getTrainingData,
  exportToJSONL,
  getLearnedPreferences,
};
