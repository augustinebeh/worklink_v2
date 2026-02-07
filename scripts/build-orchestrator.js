#!/usr/bin/env node

/**
 * WorkLink v2 Build Orchestrator
 * Coordinates building of admin and worker portals with structured output
 */

const { spawn } = require('child_process');
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
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Structured logging utility
const log = {
  header: () => console.log(`${colors.cyan}${colors.bright}══════════════════════════════════════════════════════════════════════════════════${colors.reset}`),
  title: (text) => console.log(`${colors.cyan}${colors.bright}🏗️  ${text}${colors.reset}`),
  success: (text) => console.log(`${colors.green}✅ ${text}${colors.reset}`),
  warning: (text) => console.log(`${colors.yellow}⚠️  ${text}${colors.reset}`),
  error: (text) => console.log(`${colors.red}❌ ${text}${colors.reset}`),
  info: (text) => console.log(`${colors.blue}ℹ️  ${text}${colors.reset}`),
  step: (text) => console.log(`${colors.cyan}📦 ${text}${colors.reset}`),
  progress: (text) => console.log(`${colors.magenta}⏳ ${text}${colors.reset}`),
  footer: () => console.log(`${colors.cyan}${colors.bright}══════════════════════════════════════════════════════════════════════════════════${colors.reset}`)
};

// Build progress tracker
const buildProgress = {
  admin: { started: false, completed: false, failed: false },
  worker: { started: false, completed: false, failed: false }
};

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getBuildStats(distPath) {
  try {
    if (!fs.existsSync(distPath)) return null;

    const files = fs.readdirSync(distPath);
    let totalSize = 0;
    let fileCount = 0;

    function walkDir(dir) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else {
          totalSize += stat.size;
          fileCount++;
        }
      }
    }

    walkDir(distPath);
    return { totalSize, fileCount };
  } catch (error) {
    return null;
  }
}

async function runCommand(command, args, cwd, label) {
  return new Promise((resolve, reject) => {
    log.progress(`Building ${label}...`);

    const child = spawn(command, args, {
      cwd,
      stdio: 'pipe',
      shell: true
    });

    let output = '';
    let hasError = false;

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      const errorText = data.toString();
      // Filter out npm warnings and non-critical messages
      if (!errorText.includes('npm warn') &&
          !errorText.includes('(!) Some chunks are larger') &&
          !errorText.includes('Consider:')) {
        hasError = true;
        output += errorText;
      }
    });

    child.on('close', (code) => {
      if (code === 0 && !hasError) {
        resolve(output);
      } else {
        reject(new Error(`Build failed with code ${code}\n${output}`));
      }
    });
  });
}

async function buildPortal(name, path, installCmd, buildCmd) {
  const startTime = Date.now();
  buildProgress[name].started = true;

  try {
    // Install dependencies
    log.step(`Installing ${name} dependencies...`);
    await runCommand('npm', ['install', '--prefer-offline', '--no-audit', '--legacy-peer-deps'], path, name);
    log.success(`${name} dependencies installed`);

    // Build portal
    log.step(`Building ${name} portal...`);
    await runCommand('npm', ['run', 'build'], path, name);

    // Get build statistics
    const distPath = `${path}/dist`;
    const stats = getBuildStats(distPath);
    const buildTime = ((Date.now() - startTime) / 1000).toFixed(2);

    buildProgress[name].completed = true;

    if (stats) {
      log.success(`${name} build complete! (${buildTime}s, ${stats.fileCount} files, ${formatFileSize(stats.totalSize)})`);
    } else {
      log.success(`${name} build complete! (${buildTime}s)`);
    }

    return true;
  } catch (error) {
    buildProgress[name].failed = true;
    log.error(`${name} build failed: ${error.message}`);
    return false;
  }
}

async function buildAll() {
  const totalStartTime = Date.now();

  log.header();
  log.title('Building WorkLink v2 Production Assets');
  log.header();

  log.info('Building admin and worker portals for production deployment...');
  console.log('');

  // Build admin portal
  const adminSuccess = await buildPortal('admin', './admin', 'install', 'build');
  console.log('');

  // Build worker portal
  const workerSuccess = await buildPortal('worker', './worker', 'install', 'build');
  console.log('');

  // Final summary
  const totalBuildTime = ((Date.now() - totalStartTime) / 1000).toFixed(2);

  log.header();

  if (adminSuccess && workerSuccess) {
    log.success(`All builds completed successfully! (Total time: ${totalBuildTime}s)`);
    log.info('Admin portal: /admin/dist/');
    log.info('Worker PWA: /worker/dist/');
    console.log('');
    log.success('Ready to start production server on port 8080...');
  } else {
    log.error('Build process failed!');
    if (!adminSuccess) log.error('❌ Admin portal build failed');
    if (!workerSuccess) log.error('❌ Worker portal build failed');
    process.exit(1);
  }

  log.footer();
}

// Execute build process
buildAll().catch(error => {
  log.error(`Build orchestration failed: ${error.message}`);
  process.exit(1);
});