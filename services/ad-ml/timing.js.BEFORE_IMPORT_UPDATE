/**
 * Timing Optimization for Ad Posts
 *
 * Analyzes historical data to find optimal posting times.
 * Uses Singapore timezone (UTC+8).
 */

const { db } = require('../../db/database');

/**
 * Get Singapore time
 */
function getSingaporeTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
}

/**
 * Get current hour in Singapore
 */
function getSingaporeHour() {
  return parseInt(new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Singapore',
    hour: 'numeric',
    hour12: false,
  }));
}

/**
 * Get current day of week in Singapore (0 = Sunday)
 */
function getSingaporeDay() {
  const options = { timeZone: 'Asia/Singapore', weekday: 'short' };
  const day = new Date().toLocaleString('en-US', options);
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return dayMap[day];
}

/**
 * Analyze timing patterns from historical data
 */
function analyzeTimingPatterns() {
  // Get response rates by hour
  const hourlyStats = db.prepare(`
    SELECT
      post_hour as hour,
      COUNT(*) as post_count,
      COALESCE(SUM(responses), 0) as total_responses,
      COALESCE(AVG(CASE WHEN views > 0 THEN CAST(responses AS FLOAT) / views ELSE 0 END), 0) as avg_response_rate
    FROM ad_performance
    WHERE post_hour IS NOT NULL
    GROUP BY post_hour
    ORDER BY post_hour
  `).all();

  // Get response rates by day
  const dailyStats = db.prepare(`
    SELECT
      post_day as day,
      COUNT(*) as post_count,
      COALESCE(SUM(responses), 0) as total_responses,
      COALESCE(AVG(CASE WHEN views > 0 THEN CAST(responses AS FLOAT) / views ELSE 0 END), 0) as avg_response_rate
    FROM ad_performance
    WHERE post_day IS NOT NULL
    GROUP BY post_day
    ORDER BY post_day
  `).all();

  // Get response rates by hour and day combination
  const combinedStats = db.prepare(`
    SELECT
      post_hour as hour,
      post_day as day,
      COUNT(*) as post_count,
      COALESCE(SUM(responses), 0) as total_responses,
      COALESCE(AVG(CASE WHEN views > 0 THEN CAST(responses AS FLOAT) / views ELSE 0 END), 0) as avg_response_rate
    FROM ad_performance
    WHERE post_hour IS NOT NULL AND post_day IS NOT NULL
    GROUP BY post_hour, post_day
  `).all();

  // Update timing scores
  updateTimingScores(hourlyStats, dailyStats, combinedStats);

  return { hourlyStats, dailyStats, combinedStats };
}

/**
 * Update timing scores in database
 */
function updateTimingScores(hourlyStats, dailyStats, combinedStats) {
  // Find max response rate for normalization
  const maxRate = Math.max(
    ...hourlyStats.map(h => h.avg_response_rate),
    ...dailyStats.map(d => d.avg_response_rate),
    0.001
  );

  // Update hourly scores
  for (const stat of hourlyStats) {
    const score = stat.avg_response_rate / maxRate;
    db.prepare(`
      INSERT INTO ad_timing_scores (hour, day_of_week, post_count, total_responses, avg_response_rate, score, updated_at)
      VALUES (?, NULL, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(hour, day_of_week) DO UPDATE SET
        post_count = ?, total_responses = ?, avg_response_rate = ?, score = ?, updated_at = datetime('now')
    `).run(stat.hour, stat.post_count, stat.total_responses, stat.avg_response_rate, score,
           stat.post_count, stat.total_responses, stat.avg_response_rate, score);
  }

  // Update daily scores
  for (const stat of dailyStats) {
    const score = stat.avg_response_rate / maxRate;
    db.prepare(`
      INSERT INTO ad_timing_scores (hour, day_of_week, post_count, total_responses, avg_response_rate, score, updated_at)
      VALUES (NULL, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(hour, day_of_week) DO UPDATE SET
        post_count = ?, total_responses = ?, avg_response_rate = ?, score = ?, updated_at = datetime('now')
    `).run(stat.day, stat.post_count, stat.total_responses, stat.avg_response_rate, score,
           stat.post_count, stat.total_responses, stat.avg_response_rate, score);
  }
}

/**
 * Suggest optimal posting time
 */
function suggestPostTime(jobCategory = null) {
  // Get best hour
  const bestHour = db.prepare(`
    SELECT hour, score, avg_response_rate
    FROM ad_timing_scores
    WHERE hour IS NOT NULL AND day_of_week IS NULL
    ORDER BY score DESC
    LIMIT 1
  `).get();

  // Get best day
  const bestDay = db.prepare(`
    SELECT day_of_week as day, score, avg_response_rate
    FROM ad_timing_scores
    WHERE hour IS NULL AND day_of_week IS NOT NULL
    ORDER BY score DESC
    LIMIT 1
  `).get();

  // Get current Singapore time
  const currentHour = getSingaporeHour();
  const currentDay = getSingaporeDay();

  // Default times if no data
  if (!bestHour && !bestDay) {
    return {
      suggestedHour: 18, // 6 PM
      suggestedDay: 1, // Monday
      confidence: 0.3,
      isNowGood: currentHour >= 17 && currentHour <= 21,
      reason: 'Using default optimal times (no historical data)',
    };
  }

  const suggestedHour = bestHour?.hour ?? 18;
  const suggestedDay = bestDay?.day ?? currentDay;
  const confidence = ((bestHour?.score || 0.5) + (bestDay?.score || 0.5)) / 2;

  // Check if current time is good
  const currentHourScore = db.prepare(`
    SELECT score FROM ad_timing_scores WHERE hour = ? AND day_of_week IS NULL
  `).get(currentHour);

  const isNowGood = (currentHourScore?.score || 0) >= 0.7;

  // Calculate next optimal time
  const nextOptimal = calculateNextOptimalTime(suggestedHour, suggestedDay);

  return {
    suggestedHour,
    suggestedDay,
    suggestedDayName: getDayName(suggestedDay),
    confidence,
    isNowGood,
    currentHour,
    currentDay,
    nextOptimalTime: nextOptimal,
    reason: isNowGood
      ? 'Current time is optimal for posting'
      : `Best time to post: ${suggestedHour}:00 on ${getDayName(suggestedDay)}`,
  };
}

/**
 * Calculate the next occurrence of optimal time
 */
function calculateNextOptimalTime(hour, dayOfWeek) {
  const now = getSingaporeTime();
  const currentDay = now.getDay();
  const currentHour = now.getHours();

  let daysUntil = dayOfWeek - currentDay;
  if (daysUntil < 0 || (daysUntil === 0 && currentHour >= hour)) {
    daysUntil += 7;
  }

  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysUntil);
  nextDate.setHours(hour, 0, 0, 0);

  return nextDate.toISOString();
}

/**
 * Get day name from number
 */
function getDayName(dayNum) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNum] || 'Unknown';
}

/**
 * Get timing heatmap data (24 hours x 7 days)
 */
function getTimingHeatmap() {
  // Get all hour/day combinations
  const data = db.prepare(`
    SELECT
      post_hour as hour,
      post_day as day,
      COALESCE(SUM(responses), 0) as responses,
      COUNT(*) as posts
    FROM ad_performance
    WHERE post_hour IS NOT NULL AND post_day IS NOT NULL
    GROUP BY post_hour, post_day
  `).all();

  // Create 24x7 matrix
  const heatmap = [];
  for (let hour = 0; hour < 24; hour++) {
    const row = [];
    for (let day = 0; day < 7; day++) {
      const cell = data.find(d => d.hour === hour && d.day === day);
      row.push({
        hour,
        day,
        responses: cell?.responses || 0,
        posts: cell?.posts || 0,
        rate: cell?.posts > 0 ? cell.responses / cell.posts : 0,
      });
    }
    heatmap.push(row);
  }

  // Calculate max for normalization
  const maxRate = Math.max(...data.map(d => d.responses / Math.max(d.posts, 1)), 0.001);

  return {
    heatmap,
    maxRate,
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  };
}

/**
 * Schedule a post for optimal time
 * Returns either 'now' or a scheduled time
 */
function scheduleOptimalPost(jobId, immediate = false) {
  if (immediate) {
    return { postNow: true, scheduledTime: null };
  }

  const optimal = suggestPostTime();

  if (optimal.isNowGood) {
    return { postNow: true, scheduledTime: null };
  }

  return {
    postNow: false,
    scheduledTime: optimal.nextOptimalTime,
    reason: optimal.reason,
  };
}

/**
 * Record timing for a post (for learning)
 */
function recordPostTiming(variantId, messageId) {
  const now = getSingaporeTime();
  const hour = now.getHours();
  const day = now.getDay();

  db.prepare(`
    UPDATE ad_performance
    SET post_hour = ?, post_day = ?
    WHERE variant_id = ? AND message_id = ?
  `).run(hour, day, variantId, messageId);
}

module.exports = {
  getSingaporeTime,
  getSingaporeHour,
  getSingaporeDay,
  analyzeTimingPatterns,
  suggestPostTime,
  getTimingHeatmap,
  scheduleOptimalPost,
  recordPostTiming,
  getDayName,
};
