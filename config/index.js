/**
 * Centralized Configuration
 * Validates required environment variables and provides typed config
 */

const logger = require('../utils/logger');

// Define required environment variables by category
const requiredInProduction = [
  'ADMIN_PASSWORD',
  'BASE_URL',
];

const recommended = [
  'GROQ_API_KEY',
  'GOOGLE_API_KEY',
  'TELEGRAM_BOT_TOKEN',
];

// Validate environment on startup
function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing = [];
  const warnings = [];

  // Check required vars in production
  if (isProduction) {
    requiredInProduction.forEach(key => {
      if (!process.env[key]) {
        missing.push(key);
      }
    });
  }

  // Warn about recommended vars
  recommended.forEach(key => {
    if (!process.env[key]) {
      warnings.push(key);
    }
  });

  // Log warnings
  if (warnings.length > 0) {
    logger.warn(`Missing recommended environment variables: ${warnings.join(', ')}`);
  }

  // Fail on missing required vars in production
  if (missing.length > 0 && isProduction) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Configuration object
const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',

  // Server
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || '0.0.0.0',
  },

  // Admin
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@talentvis.com',
    password: process.env.ADMIN_PASSWORD,
  },

  // URLs
  urls: {
    base: process.env.BASE_URL || process.env.APP_URL,
    app: process.env.APP_URL || 'https://worklinkv2-production.up.railway.app',
  },

  // Database
  database: {
    path: process.env.DATABASE_PATH ||
          (process.env.RAILWAY_VOLUME_MOUNT_PATH
            ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/worklink.db`
            : './data/worklink.db'),
  },

  // AI/LLM
  ai: {
    groqApiKey: process.env.GROQ_API_KEY,
    googleApiKey: process.env.GOOGLE_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  },

  // Telegram
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    botUsername: process.env.TELEGRAM_BOT_USERNAME || 'WorkLinkBot',
  },

  // Push Notifications
  push: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    vapidEmail: process.env.VAPID_EMAIL || 'mailto:admin@worklink.sg',
  },

  // CORS
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'],
  },
};

// Run validation
validateEnvironment();

module.exports = config;
