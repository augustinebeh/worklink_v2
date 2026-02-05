/**
 * Gamification API - Main Router
 * Modular implementation replacing the original 1649-line monolithic file
 *
 * Features:
 * - Candidate profile and core gamification data
 * - XP management (awards, job completion, penalties, streaks)
 * - Achievement system (unlocking, claiming, checking)
 * - Quest system (daily, weekly, special events)
 * - Leaderboard and ranking system
 * - Profile borders and customization
 * - Rewards shop (The Sink - Career Ladder Strategy)
 * - Profile flair and theme customization
 *
 * @module gamification
 */

const express = require('express');
const router = express.Router();

// Import route modules
const profileRoutes = require('./routes/profile');
const xpRoutes = require('./routes/xp');
const achievementRoutes = require('./routes/achievements');
const questRoutes = require('./routes/quests');
const leaderboardRoutes = require('./routes/leaderboard');
const borderRoutes = require('./routes/borders');
const rewardRoutes = require('./routes/rewards');
const customizationRoutes = require('./routes/customization');

// Mount route modules
router.use('/', profileRoutes);           // GET /profile/:candidateId
router.use('/', xpRoutes);               // POST /xp/award, /xp/job-complete, /xp/penalty, /streak/update
router.use('/', achievementRoutes);      // GET /achievements, /achievements/user/:candidateId, POST /achievements/unlock, /achievements/:id/claim, /achievements/check/:candidateId
router.use('/', questRoutes);            // GET /quests, /quests/user/:candidateId, POST /quests/:id/start, /quests/:id/progress, /quests/:id/complete, /quests/:id/claim
router.use('/', leaderboardRoutes);      // GET /leaderboard, /leaderboard/rank/:candidateId
router.use('/', borderRoutes);           // GET /borders/:candidateId, POST /borders/:candidateId/select
router.use('/', rewardRoutes);           // GET /rewards, /rewards/user/:candidateId, POST /rewards/:id/purchase
router.use('/', customizationRoutes);    // GET/POST /flair/:candidateId, GET/POST /theme/:candidateId, GET /themes

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    module: 'gamification',
    version: '2.0.0',
    architecture: 'modular'
  });
});

/**
 * GET /
 * Module information and available endpoints
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Gamification API - Modular Implementation',
    version: '2.0.0',
    architecture: 'modular',
    status: 'operational',
    endpoints: {
      // Profile and core data
      'GET /profile/:candidateId': 'Get candidate gamification profile with all data',

      // XP management
      'POST /xp/award': 'Award XP to candidate with level up handling',
      'POST /xp/job-complete': 'Award XP for job completion (Career Ladder Strategy)',
      'POST /xp/penalty': 'Apply XP penalty for no-shows or late cancellations',
      'POST /streak/update': 'Update work streak for weekly quests',

      // Achievement system
      'GET /achievements': 'Get all achievements with pagination and filtering',
      'GET /achievements/user/:candidateId': 'Get user achievements with claimed status',
      'POST /achievements/unlock': 'Manually unlock achievement',
      'POST /achievements/:achievementId/claim': 'Claim achievement XP reward',
      'POST /achievements/check/:candidateId': 'Check and auto-unlock achievements',

      // Quest system
      'GET /quests': 'Get all active quests with pagination and filtering',
      'GET /quests/user/:candidateId': 'Get user quests with progress',
      'POST /quests/:questId/start': 'Start a quest for candidate',
      'POST /quests/:questId/progress': 'Update quest progress (check-in quests)',
      'POST /quests/:questId/complete': 'Mark quest as completed',
      'POST /quests/:questId/claim': 'Claim quest XP reward',

      // Leaderboard and ranking
      'GET /leaderboard': 'Get leaderboard with ranking and filtering',
      'GET /leaderboard/rank/:candidateId': 'Get candidate rank and context',

      // Profile borders
      'GET /borders/:candidateId': 'Get borders with unlock status',
      'POST /borders/:candidateId/select': 'Select border for candidate',

      // Rewards shop (The Sink)
      'GET /rewards': 'Get all rewards with pagination and filtering',
      'GET /rewards/user/:candidateId': 'Get user rewards with purchase status',
      'POST /rewards/:rewardId/purchase': 'Purchase reward with points',

      // Customization (requires rewards)
      'GET /flair/:candidateId': 'Get user profile flair and ownership',
      'POST /flair/:candidateId': 'Set profile flair (requires RWD_PROFILE_FLAIR)',
      'GET /theme/:candidateId': 'Get user theme and available themes',
      'POST /theme/:candidateId': 'Set theme (requires RWD_DARK_MODE for premium)',
      'GET /themes': 'Get all available themes with descriptions',

      // Utility endpoints
      'GET /health': 'Health check',
    },
    features: [
      'Comprehensive gamification system for candidate engagement',
      'XP and leveling with tier progression',
      'Achievement system with unlock conditions and rewards',
      'Daily, weekly, and special event quests',
      'Competitive leaderboard with ranking',
      'Profile customization with borders, flair, and themes',
      'Point-based rewards shop (The Sink - Career Ladder Strategy)',
      'Work streak tracking for retention',
      'Level up notifications and celebrations',
      'Tier-based unlocks and progression',
      'Career ladder integration with job completion bonuses'
    ],
    strategies: [
      'Career Ladder Strategy - Progressive XP and tier system',
      'The Sink - Point-based rewards shop to manage economy',
      'Social Proof - Leaderboards and achievement sharing',
      'Retention Mechanics - Daily streaks and weekly quests',
      'Customization Economy - Paid cosmetic upgrades',
      'Achievement Psychology - Clear goals and celebrations'
    ],
    refactoring: {
      original_file: 'gamification.js (1649 lines)',
      new_structure: 'Modular architecture with 13 files',
      improvements: [
        'Separated concerns into logical route groupings',
        'Extracted business logic to helper modules',
        'Improved error handling and logging',
        'Better code organization and maintainability',
        'Enhanced security and validation',
        'Cleaner separation of database operations',
        'Comprehensive documentation and JSDoc',
        'Consistent API patterns across all endpoints'
      ]
    }
  });
});

module.exports = router;