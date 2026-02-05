/**
 * Auth API - Main Router
 * Modular implementation replacing the original 686-line monolithic file
 *
 * Features:
 * - Core authentication (login, register, me)
 * - Worker app authentication
 * - Telegram OAuth authentication
 * - Google OAuth authentication
 * - Token management
 * - Comprehensive validation and security
 *
 * @module auth
 */

const express = require('express');
const router = express.Router();

// Import route modules
const coreRoutes = require('./routes/core');
const workerRoutes = require('./routes/worker');
const telegramRoutes = require('./routes/telegram');
const googleRoutes = require('./routes/google');
const tokensRoutes = require('./routes/tokens');

// Mount route modules
router.use('/', coreRoutes);           // POST /login, POST /register, GET /me
router.use('/', workerRoutes);         // POST /worker/login
router.use('/', telegramRoutes);       // POST /telegram/login, GET /telegram/config, POST /telegram/debug
router.use('/', googleRoutes);         // POST /google/login, GET /google/config
router.use('/', tokensRoutes);         // POST /push-token

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    module: 'auth',
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
    message: 'Auth API - Modular Implementation',
    version: '2.0.0',
    architecture: 'modular',
    status: 'operational',
    endpoints: {
      // Core authentication
      'POST /login': 'Login for candidates and admins',
      'POST /register': 'Register new candidate (email-based)',
      'GET /me': 'Get current user information',

      // Worker authentication
      'POST /worker/login': 'Worker app login (phone/email)',

      // Telegram authentication
      'POST /telegram/login': 'Telegram widget authentication',
      'GET /telegram/config': 'Get Telegram bot configuration',
      'POST /telegram/debug': 'Debug Telegram authentication',

      // Google authentication
      'POST /google/login': 'Google OAuth authentication',
      'GET /google/config': 'Get Google OAuth configuration',

      // Token management
      'POST /push-token': 'Update push notification token',

      // Utility endpoints
      'GET /health': 'Health check',
    },
    features: [
      'Multi-provider authentication (Email, Telegram, Google)',
      'Admin authentication with secure credentials',
      'Worker app simplified login',
      'JWT token generation and validation',
      'Referral system integration',
      'Avatar generation and management',
      'Push notification token management',
      'Comprehensive security validation',
      'Demo account support',
      'Account status management'
    ],
    security: [
      'Telegram widget verification',
      'Google ID token verification',
      'JWT token authentication',
      'Admin credential protection',
      'Input validation and sanitization',
      'Rate limiting (inherited from parent)',
      'Environment-based configuration'
    ],
    refactoring: {
      original_file: 'auth.js (686 lines)',
      new_structure: 'Modular architecture with 9 files',
      improvements: [
        'Separated authentication providers',
        'Extracted utility functions to helpers',
        'Improved code organization and maintainability',
        'Better error handling and logging',
        'Cleaner separation of concerns',
        'Enhanced security practices',
        'Easier testing and debugging'
      ]
    }
  });
});

module.exports = router;