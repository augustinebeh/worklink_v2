/**
 * Advertisement ML API Routes
 *
 * Endpoints for managing ad optimization, A/B testing, and training data.
 */

const express = require('express');
const router = express.Router();
const adML = require('../../../services/ad-ml');
const abTesting = require('../../../services/ad-ml/ab-testing');
const timing = require('../../../services/ad-ml/timing');
const trainer = require('../../../services/ad-ml/trainer');

// =====================================================
// AD ML SETTINGS
// =====================================================

/**
 * GET /api/v1/ad-ml/settings
 * Get Ad ML settings
 */
router.get('/settings', (req, res) => {
  try {
    const settings = adML.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/ad-ml/settings
 * Update Ad ML settings
 */
router.put('/settings', (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({ success: false, error: 'Key is required' });
    }

    adML.updateSetting(key, value);
    res.json({ success: true, message: 'Setting updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// STATS & DASHBOARD
// =====================================================

/**
 * GET /api/v1/ad-ml/stats
 * Get Ad ML statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = adML.getStats();
    const trainingStats = trainer.getTrainingStats();

    res.json({
      success: true,
      data: {
        ...stats,
        training: trainingStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// VARIABLE SCORES
// =====================================================

/**
 * GET /api/v1/ad-ml/variables
 * Get all variable scores
 */
router.get('/variables', (req, res) => {
  try {
    const scores = adML.getVariableScores();
    const available = abTesting.getAvailableVariables();

    res.json({
      success: true,
      data: {
        scores,
        available,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// TIMING OPTIMIZATION
// =====================================================

/**
 * GET /api/v1/ad-ml/timing
 * Get timing analysis data
 */
router.get('/timing', (req, res) => {
  try {
    const heatmap = timing.getTimingHeatmap();
    const suggestion = timing.suggestPostTime(req.query.category);

    res.json({
      success: true,
      data: {
        heatmap,
        suggestion,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/ad-ml/timing/analyze
 * Trigger timing pattern analysis
 */
router.post('/timing/analyze', (req, res) => {
  try {
    const result = timing.analyzeTimingPatterns();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// A/B TESTS
// =====================================================

/**
 * GET /api/v1/ad-ml/tests
 * Get active A/B tests
 */
router.get('/tests', (req, res) => {
  try {
    const tests = adML.getActiveTests();
    res.json({ success: true, data: tests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/ad-ml/tests/:jobId
 * Get test progress for a specific job
 */
router.get('/tests/:jobId', (req, res) => {
  try {
    const progress = abTesting.getTestProgress(req.params.jobId);
    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/ad-ml/tests/:jobId/evaluate
 * Manually evaluate an A/B test
 */
router.post('/tests/:jobId/evaluate', async (req, res) => {
  try {
    const result = await adML.evaluateTest(req.params.jobId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// AD GENERATION
// =====================================================

/**
 * POST /api/v1/ad-ml/generate
 * Generate ad variants for a job
 */
router.post('/generate', async (req, res) => {
  try {
    const { job, count = 2 } = req.body;

    if (!job) {
      return res.status(400).json({ success: false, error: 'Job data is required' });
    }

    const variants = await adML.generateAdVariants(job, count);

    res.json({
      success: true,
      data: variants,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/ad-ml/generate-optimized
 * Generate a single optimized ad
 */
router.post('/generate-optimized', async (req, res) => {
  try {
    const { job } = req.body;

    if (!job) {
      return res.status(400).json({ success: false, error: 'Job data is required' });
    }

    const content = await adML.generateOptimizedAd(job);

    res.json({
      success: true,
      data: { content },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// RESPONSE TRACKING
// =====================================================

/**
 * POST /api/v1/ad-ml/response
 * Record a response to an ad
 */
router.post('/response', (req, res) => {
  try {
    const { variantId } = req.body;

    if (!variantId) {
      return res.status(400).json({ success: false, error: 'variantId is required' });
    }

    adML.recordResponse(variantId);
    res.json({ success: true, message: 'Response recorded' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// TRAINING DATA
// =====================================================

/**
 * GET /api/v1/ad-ml/training-data
 * Get training data
 */
router.get('/training-data', (req, res) => {
  try {
    const { limit = 50, offset = 0, minQuality = 0, winnersOnly = 'false' } = req.query;

    const data = trainer.getTrainingData({
      limit: parseInt(limit),
      offset: parseInt(offset),
      minQuality: parseFloat(minQuality),
      winnersOnly: winnersOnly === 'true',
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/ad-ml/training-data/stats
 * Get training data statistics
 */
router.get('/training-data/stats', (req, res) => {
  try {
    const stats = trainer.getTrainingStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/ad-ml/training-data
 * Add training example manually
 */
router.post('/training-data', (req, res) => {
  try {
    const { jobDetails, adContent, variables = {}, qualityScore = 0.7, isWinner = false } = req.body;

    if (!jobDetails || !adContent) {
      return res.status(400).json({
        success: false,
        error: 'jobDetails and adContent are required',
      });
    }

    const id = trainer.addTrainingExample(jobDetails, adContent, variables, {
      qualityScore,
      isWinner,
    });

    res.json({ success: true, data: { id }, message: 'Training example added' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/v1/ad-ml/training-data/:id
 * Delete training example
 */
router.delete('/training-data/:id', (req, res) => {
  try {
    trainer.deleteTrainingExample(req.params.id);
    res.json({ success: true, message: 'Training example deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/ad-ml/training-data/export
 * Export training data
 */
router.post('/training-data/export', (req, res) => {
  try {
    const {
      format = 'jsonl',
      minQuality = 0.5,
      winnersOnly = true,
    } = req.body;

    let result;

    switch (format) {
      case 'csv':
        result = trainer.exportToCSV({ minQuality, winnersOnly });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=ad_training_data.csv');
        break;

      case 'huggingface':
        result = trainer.exportToHuggingFace({ minQuality, winnersOnly });
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=ad_dataset.json');
        break;

      case 'jsonl':
      default:
        result = trainer.exportToJSONL({ minQuality, winnersOnly, format: 'chat' });
        res.setHeader('Content-Type', 'application/jsonl');
        res.setHeader('Content-Disposition', 'attachment; filename=ad_training_data.jsonl');
        break;
    }

    res.send(result.content);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/ad-ml/training-data/import
 * Import training data from JSONL
 */
router.post('/training-data/import', (req, res) => {
  try {
    const { content, qualityScore = 0.7 } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const result = trainer.importFromJSONL(content, { qualityScore });

    res.json({
      success: true,
      data: result,
      message: `Imported ${result.imported} examples (${result.errors} errors)`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/ad-ml/training-data/update-quality
 * Update quality scores based on response rates
 */
router.post('/training-data/update-quality', (req, res) => {
  try {
    const result = trainer.updateQualityScores();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
