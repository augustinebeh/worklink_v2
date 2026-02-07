#!/usr/bin/env node

/**
 * WorkLink v2 Production Setup
 * Validates environment and prepares for production build
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for consistent styling
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Structured logging utility
const log = {
  header: (text) => console.log(`\n${colors.cyan}${colors.bright}══════════════════════════════════════════════════════════════════════════════════${colors.reset}`),
  title: (text) => console.log(`${colors.cyan}${colors.bright}🚀 ${text}${colors.reset}`),
  success: (text) => console.log(`${colors.green}✅ ${text}${colors.reset}`),
  warning: (text) => console.log(`${colors.yellow}⚠️  ${text}${colors.reset}`),
  error: (text) => console.log(`${colors.red}❌ ${text}${colors.reset}`),
  info: (text) => console.log(`${colors.blue}ℹ️  ${text}${colors.reset}`),
  step: (text) => console.log(`${colors.cyan}📋 ${text}${colors.reset}`),
  footer: (text) => console.log(`${colors.cyan}${colors.bright}══════════════════════════════════════════════════════════════════════════════════${colors.reset}\n`)
};

async function validateEnvironment() {
  log.header();
  log.title('WorkLink v2 Production Setup');
  log.header();

  log.step('Validating production environment...');

  // Check Node.js version
  const nodeVersion = process.version;
  const requiredNodeVersion = '20.0.0';
  log.info(`Node.js version: ${nodeVersion}`);

  // Check required directories
  const requiredDirs = [
    './admin',
    './worker',
    './routes',
    './services',
    './db',
    './data'
  ];

  for (const dir of requiredDirs) {
    if (fs.existsSync(dir)) {
      log.success(`Directory exists: ${dir}`);
    } else {
      log.error(`Missing required directory: ${dir}`);
      process.exit(1);
    }
  }

  // Check required files
  const requiredFiles = [
    './server.js',
    './admin/package.json',
    './worker/package.json',
    './admin/index.html'
  ];

  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      log.success(`File exists: ${file}`);
    } else {
      log.error(`Missing required file: ${file}`);
      process.exit(1);
    }
  }

  // Set production environment variables
  process.env.NODE_ENV = 'production';
  process.env.PORT = '8080';
  log.success('Environment variables configured for production');

  // Clean previous builds
  log.step('Cleaning previous build artifacts...');
  try {
    const cleanDirs = [
      './admin/dist',
      './worker/dist',
      './admin/node_modules/.vite',
      './worker/node_modules/.vite'
    ];

    for (const dir of cleanDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        log.success(`Cleaned: ${dir}`);
      }
    }
  } catch (error) {
    log.warning(`Cleanup warning: ${error.message}`);
  }

  log.footer();
  log.success('Production environment setup complete!');
  log.info('Ready to build admin and worker portals...');
  console.log('');
}

// Execute setup
validateEnvironment().catch(error => {
  log.error(`Setup failed: ${error.message}`);
  process.exit(1);
});