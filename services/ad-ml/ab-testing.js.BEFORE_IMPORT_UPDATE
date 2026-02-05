/**
 * A/B Testing Logic for Ad Optimization
 *
 * Handles variable selection, variant assignment, and statistical analysis.
 */

const { db } = require('../../db/database');

/**
 * Available variables for testing
 */
const TEST_VARIABLES = {
  tone: {
    name: 'tone',
    values: ['friendly', 'casual', 'formal', 'urgent'],
    description: 'Overall tone of the ad',
  },
  emoji_count: {
    name: 'emoji_count',
    values: ['0', '2', '4', '6'],
    description: 'Number of emojis used',
  },
  length: {
    name: 'length',
    values: ['short', 'medium', 'long'],
    description: 'Ad length',
  },
  cta_style: {
    name: 'cta_style',
    values: ['direct', 'soft', 'question'],
    description: 'Call-to-action style',
  },
  pay_emphasis: {
    name: 'pay_emphasis',
    values: ['prominent', 'normal', 'subtle'],
    description: 'How prominently pay is displayed',
  },
  format: {
    name: 'format',
    values: ['bullets', 'paragraph', 'hybrid'],
    description: 'Text formatting style',
  },
};

/**
 * Select which variable to test next
 * Prioritizes variables with lowest confidence scores
 */
function selectTestVariable(jobCategory = null) {
  // Get current confidence scores for all variables
  const scores = db.prepare(`
    SELECT variable_name, AVG(confidence) as avg_confidence, COUNT(*) as test_count
    FROM ad_variable_scores
    WHERE job_category = ? OR job_category IS NULL
    GROUP BY variable_name
  `).all(jobCategory);

  const scoreMap = new Map(scores.map(s => [s.variable_name, s]));

  // Find variable with lowest confidence or no tests
  let selectedVariable = null;
  let lowestConfidence = 1;

  for (const [name, config] of Object.entries(TEST_VARIABLES)) {
    const score = scoreMap.get(name);

    if (!score) {
      // Never tested - high priority
      selectedVariable = config;
      break;
    }

    if (score.avg_confidence < lowestConfidence) {
      lowestConfidence = score.avg_confidence;
      selectedVariable = config;
    }
  }

  // If all variables have high confidence, randomly select one to continue testing
  if (!selectedVariable || lowestConfidence > 0.8) {
    const keys = Object.keys(TEST_VARIABLES);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    selectedVariable = TEST_VARIABLES[randomKey];
  }

  return selectedVariable;
}

/**
 * Assign variants to groups for testing
 * Ensures even distribution
 */
function assignVariantsToGroups(variants, groups) {
  const assignments = {};

  for (let i = 0; i < groups.length; i++) {
    const variantIndex = i % variants.length;
    const group = groups[i];
    const variant = variants[variantIndex];

    assignments[group.id || group] = variant;
  }

  return assignments;
}

/**
 * Check if test result is statistically significant
 * Uses simple proportion comparison (can upgrade to chi-squared later)
 */
function isSignificant(variantA, variantB, minSampleSize = 10) {
  // Require minimum sample size
  if (variantA.views < minSampleSize || variantB.views < minSampleSize) {
    return { significant: false, reason: 'Insufficient sample size' };
  }

  // Calculate response rates
  const rateA = variantA.responses / variantA.views;
  const rateB = variantB.responses / variantB.views;

  // Calculate pooled rate
  const totalResponses = variantA.responses + variantB.responses;
  const totalViews = variantA.views + variantB.views;
  const pooledRate = totalResponses / totalViews;

  // Calculate standard error
  const seA = Math.sqrt(pooledRate * (1 - pooledRate) / variantA.views);
  const seB = Math.sqrt(pooledRate * (1 - pooledRate) / variantB.views);
  const seDiff = Math.sqrt(seA * seA + seB * seB);

  // Z-score for the difference
  const zScore = Math.abs(rateA - rateB) / seDiff;

  // 95% confidence requires z > 1.96
  const significant = zScore > 1.96;

  return {
    significant,
    zScore: zScore.toFixed(2),
    rateA: rateA.toFixed(4),
    rateB: rateB.toFixed(4),
    winner: rateA > rateB ? 'A' : 'B',
    difference: Math.abs(rateA - rateB).toFixed(4),
  };
}

/**
 * Calculate required sample size for desired power
 */
function calculateRequiredSampleSize(baselineRate = 0.05, minDetectableEffect = 0.02, power = 0.8) {
  // Simplified sample size calculation for two-proportion z-test
  const alpha = 0.05; // 95% confidence
  const zAlpha = 1.96;
  const zBeta = 0.84; // 80% power

  const p1 = baselineRate;
  const p2 = baselineRate + minDetectableEffect;
  const pBar = (p1 + p2) / 2;

  const numerator = Math.pow(zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
  const denominator = Math.pow(p2 - p1, 2);

  return Math.ceil(numerator / denominator);
}

/**
 * Get test progress for a job
 */
function getTestProgress(jobId) {
  const variants = db.prepare(`
    SELECT
      v.id, v.variant_key, v.variables,
      COALESCE(SUM(p.views), 0) as views,
      COALESCE(SUM(p.responses), 0) as responses
    FROM ad_variants v
    LEFT JOIN ad_performance p ON v.id = p.variant_id
    WHERE v.job_id = ?
    GROUP BY v.id
  `).all(jobId);

  if (variants.length < 2) {
    return { isTest: false };
  }

  const variantA = variants[0];
  const variantB = variants[1];

  const significance = isSignificant(variantA, variantB);

  return {
    isTest: true,
    variants: variants.map(v => ({
      key: v.variant_key,
      views: v.views,
      responses: v.responses,
      rate: v.views > 0 ? (v.responses / v.views).toFixed(4) : 0,
    })),
    significance,
    recommendedSampleSize: calculateRequiredSampleSize(),
    canConclude: significance.significant,
  };
}

/**
 * Get all available test variables
 */
function getAvailableVariables() {
  return Object.values(TEST_VARIABLES);
}

module.exports = {
  TEST_VARIABLES,
  selectTestVariable,
  assignVariantsToGroups,
  isSignificant,
  calculateRequiredSampleSize,
  getTestProgress,
  getAvailableVariables,
};
