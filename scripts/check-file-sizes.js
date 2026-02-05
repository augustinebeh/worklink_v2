#!/usr/bin/env node

/**
 * File Size Checker
 * Scans project for files that are too large and need refactoring
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  extensions: ['.js'],
  ignore: ['node_modules', 'dist', 'build', '.git', 'coverage'],
  limits: {
    ideal: 300,
    acceptable: 500,
    review: 1000,
    critical: 1500
  }
};

// Color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Track statistics
const stats = {
  total: 0,
  ideal: 0,
  acceptable: 0,
  review: 0,
  critical: 0,
  files: []
};

/**
 * Count lines in a file
 */
function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch (error) {
    return 0;
  }
}

/**
 * Check if path should be ignored
 */
function shouldIgnore(filePath) {
  return CONFIG.ignore.some(ignored => filePath.includes(ignored));
}

/**
 * Scan directory recursively
 */
function scanDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    
    if (shouldIgnore(filePath)) {
      return;
    }

    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      scanDirectory(filePath);
    } else if (CONFIG.extensions.some(ext => file.endsWith(ext))) {
      const lines = countLines(filePath);
      stats.total++;

      const fileInfo = {
        path: filePath.replace(process.cwd() + '/', ''),
        lines: lines
      };

      if (lines >= CONFIG.limits.critical) {
        fileInfo.status = 'critical';
        stats.critical++;
      } else if (lines >= CONFIG.limits.review) {
        fileInfo.status = 'review';
        stats.review++;
      } else if (lines >= CONFIG.limits.acceptable) {
        fileInfo.status = 'acceptable';
        stats.acceptable++;
      } else if (lines <= CONFIG.limits.ideal) {
        fileInfo.status = 'ideal';
        stats.ideal++;
      } else {
        fileInfo.status = 'acceptable';
        stats.acceptable++;
      }

      stats.files.push(fileInfo);
    }
  });
}

/**
 * Get status emoji and color
 */
function getStatusDisplay(status) {
  switch (status) {
    case 'critical':
      return { emoji: '🚨', color: colors.red, label: 'CRITICAL' };
    case 'review':
      return { emoji: '🔴', color: colors.red, label: 'REVIEW' };
    case 'acceptable':
      return { emoji: '⚠️ ', color: colors.yellow, label: 'ACCEPTABLE' };
    case 'ideal':
      return { emoji: '✅', color: colors.green, label: 'IDEAL' };
    default:
      return { emoji: '❓', color: colors.reset, label: 'UNKNOWN' };
  }
}

/**
 * Print results
 */
function printResults() {
  console.log('\n' + '═'.repeat(70));
  console.log(`${colors.cyan}📊 FILE SIZE ANALYSIS REPORT${colors.reset}`);
  console.log('═'.repeat(70) + '\n');

  // Print summary
  console.log(`${colors.blue}📁 Total Files Scanned:${colors.reset} ${stats.total}`);
  console.log(`${colors.green}✅ Ideal (<${CONFIG.limits.ideal} lines):${colors.reset} ${stats.ideal} (${((stats.ideal/stats.total)*100).toFixed(1)}%)`);
  console.log(`${colors.yellow}⚠️  Acceptable (${CONFIG.limits.ideal}-${CONFIG.limits.acceptable} lines):${colors.reset} ${stats.acceptable} (${((stats.acceptable/stats.total)*100).toFixed(1)}%)`);
  console.log(`${colors.red}🔴 Review (${CONFIG.limits.acceptable}-${CONFIG.limits.review} lines):${colors.reset} ${stats.review} (${((stats.review/stats.total)*100).toFixed(1)}%)`);
  console.log(`${colors.red}🚨 Critical (>${CONFIG.limits.critical} lines):${colors.reset} ${stats.critical} (${((stats.critical/stats.total)*100).toFixed(1)}%)`);

  // Print files that need attention
  const problemFiles = stats.files.filter(f => 
    f.status === 'critical' || f.status === 'review' || f.status === 'acceptable'
  ).sort((a, b) => b.lines - a.lines);

  if (problemFiles.length > 0) {
    console.log('\n' + '─'.repeat(70));
    console.log(`${colors.cyan}⚠️  FILES NEEDING ATTENTION (${problemFiles.length} files)${colors.reset}`);
    console.log('─'.repeat(70) + '\n');

    problemFiles.forEach(file => {
      const display = getStatusDisplay(file.status);
      console.log(`${display.emoji} ${display.color}${file.path}${colors.reset}`);
      console.log(`   ${file.lines} lines (${display.label})`);
    });
  }

  // Print critical files (if any)
  const criticalFiles = stats.files.filter(f => f.status === 'critical');
  if (criticalFiles.length > 0) {
    console.log('\n' + '═'.repeat(70));
    console.log(`${colors.red}🚨 CRITICAL FILES - IMMEDIATE REFACTORING REQUIRED${colors.reset}`);
    console.log('═'.repeat(70) + '\n');

    criticalFiles.forEach(file => {
      console.log(`${colors.red}🚨 ${file.path}${colors.reset}`);
      console.log(`   ${file.lines} lines - Must be refactored before adding more code`);
      console.log('');
    });
  }

  // Overall status
  console.log('\n' + '═'.repeat(70));
  if (stats.critical > 0) {
    console.log(`${colors.red}❌ FAIL: ${stats.critical} critical file(s) need immediate refactoring${colors.reset}`);
    process.exit(1);
  } else if (stats.review > 0) {
    console.log(`${colors.yellow}⚠️  WARNING: ${stats.review} file(s) should be reviewed for refactoring${colors.reset}`);
  } else {
    console.log(`${colors.green}✅ PASS: All files are within acceptable size limits${colors.reset}`);
  }
  console.log('═'.repeat(70) + '\n');
}

// Main execution
console.log(`${colors.cyan}🔍 Scanning project for large files...${colors.reset}\n`);
scanDirectory(process.cwd());
printResults();
