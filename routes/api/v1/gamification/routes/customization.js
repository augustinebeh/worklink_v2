/**
 * Gamification Customization Routes
 * Handles profile flair and theme preferences (requires rewards)
 * @module gamification/routes/customization
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { createLogger } = require('../../../../../utils/structured-logger');

const logger = createLogger('gamification-customization');

// Available themes
const THEMES = ['default', 'midnight', 'ocean', 'forest', 'sunset', 'purple'];

/**
 * GET /flair/:candidateId
 * Get user's flair and check if they own the reward
 */
router.get('/flair/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;

    const candidate = db.prepare(`
      SELECT profile_flair FROM candidates WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Check if user owns Profile Flair reward
    const ownsReward = db.prepare(`
      SELECT COUNT(*) as count FROM candidate_rewards
      WHERE candidate_id = ? AND reward_id = 'RWD_PROFILE_FLAIR'
    `).get(candidateId).count > 0;

    res.json({
      success: true,
      data: {
        flair: candidate.profile_flair,
        ownsReward,
        available: ownsReward
      },
    });

  } catch (error) {
    logger.error('Failed to get flair', {
      candidate_id: req.params.candidateId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /flair/:candidateId
 * Set user's flair (requires owning Profile Flair reward)
 */
router.post('/flair/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const { flair } = req.body;

    // Check if user owns Profile Flair reward
    const ownsReward = db.prepare(`
      SELECT COUNT(*) as count FROM candidate_rewards
      WHERE candidate_id = ? AND reward_id = 'RWD_PROFILE_FLAIR'
    `).get(candidateId).count > 0;

    if (!ownsReward) {
      return res.status(403).json({
        success: false,
        error: 'You need to purchase the Profile Flair reward first',
        required_reward: 'RWD_PROFILE_FLAIR'
      });
    }

    // Validate flair (should be a single emoji or short text)
    if (flair && flair.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Flair must be 10 characters or less'
      });
    }

    // Filter out potentially harmful content
    const cleanFlair = flair ? flair.trim().slice(0, 10) : null;

    // Update flair
    db.prepare('UPDATE candidates SET profile_flair = ? WHERE id = ?').run(cleanFlair, candidateId);

    logger.business('flair_updated', {
      candidate_id: candidateId,
      old_flair: req.body.old_flair,
      new_flair: cleanFlair
    });

    res.json({
      success: true,
      data: {
        flair: cleanFlair,
        message: cleanFlair ? 'Flair updated successfully' : 'Flair removed'
      },
    });

  } catch (error) {
    logger.error('Failed to set flair', {
      candidate_id: req.params.candidateId,
      flair: req.body.flair,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /theme/:candidateId
 * Get user's theme and check if they own the reward
 */
router.get('/theme/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;

    const candidate = db.prepare(`
      SELECT theme_preference FROM candidates WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Check if user owns Dark Mode Pro reward
    const ownsReward = db.prepare(`
      SELECT COUNT(*) as count FROM candidate_rewards
      WHERE candidate_id = ? AND reward_id = 'RWD_DARK_MODE'
    `).get(candidateId).count > 0;

    // Users can always use 'default' theme, premium themes require reward
    const availableThemes = ownsReward ? THEMES : ['default'];

    res.json({
      success: true,
      data: {
        current_theme: candidate.theme_preference || 'default',
        available_themes: availableThemes,
        ownsReward,
        all_themes: THEMES
      },
    });

  } catch (error) {
    logger.error('Failed to get theme', {
      candidate_id: req.params.candidateId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /theme/:candidateId
 * Set user's theme (requires owning Dark Mode Pro reward for non-default themes)
 */
router.post('/theme/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const { theme } = req.body;

    if (!theme || !THEMES.includes(theme)) {
      return res.status(400).json({
        success: false,
        error: `Invalid theme. Must be one of: ${THEMES.join(', ')}`
      });
    }

    // Check if user owns Dark Mode Pro reward (required for non-default themes)
    if (theme !== 'default') {
      const ownsReward = db.prepare(`
        SELECT COUNT(*) as count FROM candidate_rewards
        WHERE candidate_id = ? AND reward_id = 'RWD_DARK_MODE'
      `).get(candidateId).count > 0;

      if (!ownsReward) {
        return res.status(403).json({
          success: false,
          error: 'You need to purchase the Dark Mode Pro reward to use premium themes',
          required_reward: 'RWD_DARK_MODE',
          available_theme: 'default'
        });
      }
    }

    // Update theme preference
    db.prepare('UPDATE candidates SET theme_preference = ? WHERE id = ?').run(theme, candidateId);

    logger.business('theme_updated', {
      candidate_id: candidateId,
      new_theme: theme,
      is_premium: theme !== 'default'
    });

    res.json({
      success: true,
      data: {
        theme,
        message: `Theme updated to ${theme}`
      },
    });

  } catch (error) {
    logger.error('Failed to set theme', {
      candidate_id: req.params.candidateId,
      theme: req.body.theme,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /themes
 * Get all available themes with descriptions
 */
router.get('/themes', (req, res) => {
  try {
    const themeDescriptions = {
      default: {
        name: 'Default Light',
        description: 'Clean and bright interface',
        preview_colors: ['#ffffff', '#f8f9fa', '#007bff'],
        free: true
      },
      midnight: {
        name: 'Midnight Dark',
        description: 'Dark theme with blue accents',
        preview_colors: ['#1a1a1a', '#2d3748', '#4299e1'],
        free: false
      },
      ocean: {
        name: 'Ocean Blue',
        description: 'Calming blue tones',
        preview_colors: ['#0f4c75', '#3282b8', '#bbe1fa'],
        free: false
      },
      forest: {
        name: 'Forest Green',
        description: 'Natural green palette',
        preview_colors: ['#2d5016', '#68b684', '#a8e6cf'],
        free: false
      },
      sunset: {
        name: 'Sunset Orange',
        description: 'Warm sunset colors',
        preview_colors: ['#d84315', '#ff8a65', '#ffccbc'],
        free: false
      },
      purple: {
        name: 'Royal Purple',
        description: 'Elegant purple theme',
        preview_colors: ['#4a148c', '#7b1fa2', '#ce93d8'],
        free: false
      }
    };

    const themes = THEMES.map(theme => ({
      id: theme,
      ...themeDescriptions[theme]
    }));

    res.json({
      success: true,
      data: themes,
      meta: {
        total_themes: themes.length,
        free_themes: themes.filter(t => t.free).length,
        premium_themes: themes.filter(t => !t.free).length
      }
    });

  } catch (error) {
    logger.error('Failed to get themes', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;