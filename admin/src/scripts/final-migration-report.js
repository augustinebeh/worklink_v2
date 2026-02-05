#!/usr/bin/env node

/**
 * Final API Migration Test Report
 * Comprehensive testing and reporting of API migration status
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Migration status of key files
const FILE_STATUS = {
  // Successfully migrated files
  migrated: [
    'admin/src/pages/EscalationQueue.jsx',
    'admin/src/pages/Candidates.jsx',
    'admin/src/pages/Dashboard.jsx',
    'admin/src/pages/AISourcing.jsx',
    'admin/src/pages/RetentionAnalytics.jsx',
    'admin/src/pages/CandidateProfile.jsx',
    'admin/src/pages/Jobs.jsx',
    'admin/src/pages/Clients.jsx'
  ],

  // Files that still use fetch() and need migration
  needsMigration: [
    'admin/src/pages/Chat.jsx',
    'admin/src/pages/ConsultantPerformance.jsx',
    'admin/src/pages/ClientDetail.jsx',
    'admin/src/pages/JobDetail.jsx',
    'admin/src/pages/Settings.jsx',
    'admin/src/pages/Payments.jsx',
    'admin/src/pages/Deployments.jsx',
    'admin/src/pages/Analytics.jsx',
    'admin/src/pages/FinancialDashboard.jsx',
    'admin/src/pages/BPODashboard.jsx',
    'admin/src/pages/Training.jsx',
    'admin/src/pages/TenderMonitor.jsx',
    'admin/src/pages/MLDashboard.jsx',
    'admin/src/pages/AIAutomation.jsx',
    'admin/src/pages/TelegramGroups.jsx',
    'admin/src/pages/AdOptimization.jsx',
    'admin/src/pages/Gamification.jsx'
  ],

  // Lower priority files
  lowPriority: [
    'admin/src/pages/InterviewScheduling.jsx',
    'admin/src/pages/Login.jsx'
  ]
};

// API services and their methods (comprehensive list)
const API_SERVICES = {
  auth: [
    'login', 'logout', 'clearLocalAuth', 'refreshToken', 'verifyToken',
    'requestPasswordReset', 'resetPassword', 'changePassword',
    'updateProfile', 'getProfile', 'enableTwoFactor', 'verifyTwoFactor',
    'disableTwoFactor', 'getPermissions', 'getSessions', 'revokeSession',
    'revokeAllSessions', 'isAuthenticated', 'getCurrentUser', 'getToken'
  ],
  candidates: [
    'getAll', 'getById', 'create', 'update', 'delete', 'updateStatus',
    'getPerformance', 'getApplications', 'addNote', 'uploadDocuments',
    'search', 'getAnalytics', 'bulkUpdate', 'exportData', 'getStats'
  ],
  jobs: [
    'getAll', 'getById', 'create', 'update', 'delete', 'updateStatus',
    'getApplicants', 'addApplicant', 'updateApplicantStatus',
    'getPerformance', 'search', 'getTemplates', 'createFromTemplate',
    'clone', 'getAnalytics', 'getMatchingCandidates', 'bulkUpdate',
    'exportData', 'schedule', 'getPreview', 'getStats'
  ],
  clients: [
    'getAll', 'getById', 'create', 'update', 'delete', 'updateStatus',
    'getJobs', 'getContracts', 'addContract', 'updateContract',
    'getBilling', 'updateBilling', 'getPerformance', 'getContacts',
    'addContact', 'updateContact', 'deleteContact', 'search',
    'getAnalytics', 'getInvoices', 'generateInvoice', 'uploadDocuments',
    'getDocuments', 'exportData', 'getActivityFeed', 'getStats'
  ],
  analytics: [
    'getDashboard', 'getFinancialDashboard', 'getCandidates', 'getJobs',
    'getClients', 'getPerformance', 'getRealTimeMetrics', 'getRetention',
    'getRevenue', 'getConversionFunnel', 'getMarketTrends', 'getEngagement',
    'getCustomReport', 'createCustomReport', 'exportData', 'getGamification',
    'getAIPerformance', 'getSystemHealth'
  ]
};

function testMigratedFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { success: false, error: 'File does not exist' };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];
  const warnings = [];

  // Check for proper API import
  const apiImportPattern = /import\s+{[^}]*\bapi\b[^}]*}\s+from\s+['"`][^'"`]*services\/api['"`]/;
  if (!apiImportPattern.test(content)) {
    issues.push('Missing centralized API import');
  }

  // Check for remaining fetch calls
  const fetchCalls = [...content.matchAll(/fetch\s*\(/g)];
  if (fetchCalls.length > 0) {
    issues.push(`Still contains ${fetchCalls.length} fetch() calls`);
  }

  // Check API method validity
  const apiCalls = [...content.matchAll(/api\.(\w+)\.(\w+)/g)];
  const invalidMethods = [];
  const rawClientCalls = [];

  for (const [fullMatch, service, method] of apiCalls) {
    if (service === 'client') {
      rawClientCalls.push(fullMatch);
    } else if (service === 'dicebear') {
      // Skip external API calls
      continue;
    } else if (!API_SERVICES[service]) {
      invalidMethods.push(`Unknown service: ${fullMatch}`);
    } else if (!API_SERVICES[service].includes(method)) {
      invalidMethods.push(`Unknown method: ${fullMatch}`);
    }
  }

  if (invalidMethods.length > 0) {
    issues.push(`Invalid API calls: ${invalidMethods.join(', ')}`);
  }

  if (rawClientCalls.length > 0) {
    warnings.push(`${rawClientCalls.length} raw client calls (consider service methods)`);
  }

  // Check for old parameter patterns
  const oldParamPatterns = [
    { pattern: /new URLSearchParams/, desc: 'URLSearchParams usage' },
    { pattern: /params\.append/, desc: 'manual parameter building' }
  ];

  for (const { pattern, desc } of oldParamPatterns) {
    if (pattern.test(content)) {
      warnings.push(`Old parameter pattern: ${desc}`);
    }
  }

  return {
    success: issues.length === 0,
    issues,
    warnings,
    apiCallCount: apiCalls.filter(([, service]) => service !== 'client' && service !== 'dicebear').length,
    rawClientCount: rawClientCalls.length
  };
}

function countFetchCalls(filePath) {
  if (!fs.existsSync(filePath)) return 0;

  const content = fs.readFileSync(filePath, 'utf-8');
  return [...content.matchAll(/fetch\s*\(/g)].length;
}

function generateReport() {
  console.log(`${colors.bright}${colors.cyan}🎯 API Migration Final Report${colors.reset}`);
  console.log('=' .repeat(60));
  console.log('');

  // Test migrated files
  console.log(`${colors.bright}✅ Successfully Migrated Files (${FILE_STATUS.migrated.length})${colors.reset}`);
  console.log('-'.repeat(40));

  let migratedPassed = 0;
  let migratedTotal = 0;

  for (const file of FILE_STATUS.migrated) {
    migratedTotal++;
    const result = testMigratedFile(file);
    const fileName = path.basename(file);

    if (result.success) {
      console.log(`${colors.green}✓${colors.reset} ${fileName} - ${result.apiCallCount} API calls`);
      if (result.warnings.length > 0) {
        result.warnings.forEach(w => console.log(`  ${colors.yellow}⚠${colors.reset} ${w}`));
      }
      migratedPassed++;
    } else {
      console.log(`${colors.red}✗${colors.reset} ${fileName}`);
      result.issues.forEach(issue => console.log(`    ${colors.red}•${colors.reset} ${issue}`));
      result.warnings.forEach(w => console.log(`    ${colors.yellow}•${colors.reset} ${w}`));
    }
  }

  console.log('');

  // Files needing migration
  console.log(`${colors.bright}📋 Files Needing Migration (${FILE_STATUS.needsMigration.length})${colors.reset}`);
  console.log('-'.repeat(40));

  let totalFetchCalls = 0;

  for (const file of FILE_STATUS.needsMigration) {
    const fetchCount = countFetchCalls(file);
    totalFetchCalls += fetchCount;
    const fileName = path.basename(file);

    if (fetchCount > 0) {
      console.log(`${colors.yellow}!${colors.reset} ${fileName} - ${fetchCount} fetch() calls`);
    } else {
      console.log(`${colors.blue}?${colors.reset} ${fileName} - needs verification`);
    }
  }

  console.log('');

  // Low priority files
  console.log(`${colors.bright}📄 Low Priority Files (${FILE_STATUS.lowPriority.length})${colors.reset}`);
  console.log('-'.repeat(40));

  for (const file of FILE_STATUS.lowPriority) {
    const fetchCount = countFetchCalls(file);
    const fileName = path.basename(file);
    console.log(`${colors.cyan}•${colors.reset} ${fileName}${fetchCount > 0 ? ` - ${fetchCount} fetch() calls` : ''}`);
  }

  console.log('');

  // Summary statistics
  const totalFiles = FILE_STATUS.migrated.length + FILE_STATUS.needsMigration.length + FILE_STATUS.lowPriority.length;
  const migrationProgress = Math.round((FILE_STATUS.migrated.length / totalFiles) * 100);

  console.log(`${colors.bright}📊 Migration Summary${colors.reset}`);
  console.log('-'.repeat(40));
  console.log(`Total files: ${totalFiles}`);
  console.log(`${colors.green}Migrated: ${FILE_STATUS.migrated.length}${colors.reset}`);
  console.log(`${colors.yellow}Needs migration: ${FILE_STATUS.needsMigration.length}${colors.reset}`);
  console.log(`${colors.cyan}Low priority: ${FILE_STATUS.lowPriority.length}${colors.reset}`);
  console.log(`${colors.bright}Migration progress: ${migrationProgress}%${colors.reset}`);
  console.log(`${colors.yellow}Total fetch() calls to replace: ${totalFetchCalls}${colors.reset}`);

  // Test quality of migrated files
  console.log('');
  console.log(`${colors.bright}🔍 Migration Quality${colors.reset}`);
  console.log('-'.repeat(40));
  console.log(`Migrated files passing tests: ${colors.green}${migratedPassed}/${migratedTotal}${colors.reset}`);

  if (migratedPassed === migratedTotal) {
    console.log(`${colors.green}✓ All migrated files are working correctly!${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ ${migratedTotal - migratedPassed} migrated files need fixes${colors.reset}`);
  }

  // Available API services reference
  console.log('');
  console.log(`${colors.bright}🔧 Available API Services${colors.reset}`);
  console.log('-'.repeat(40));

  for (const [service, methods] of Object.entries(API_SERVICES)) {
    console.log(`${colors.cyan}${service}${colors.reset}: ${methods.length} methods`);
    // Show first few methods as examples
    const exampleMethods = methods.slice(0, 4).join(', ');
    console.log(`  ${exampleMethods}${methods.length > 4 ? '...' : ''}`);
  }

  // Recommendations
  console.log('');
  console.log(`${colors.bright}🎯 Recommendations${colors.reset}`);
  console.log('-'.repeat(40));

  if (FILE_STATUS.needsMigration.length > 0) {
    console.log(`${colors.yellow}1.${colors.reset} Migrate ${FILE_STATUS.needsMigration.length} remaining files to use API services`);
  }

  if (migratedPassed < migratedTotal) {
    console.log(`${colors.yellow}2.${colors.reset} Fix ${migratedTotal - migratedPassed} files with migration issues`);
  }

  if (totalFetchCalls > 0) {
    console.log(`${colors.yellow}3.${colors.reset} Replace ${totalFetchCalls} fetch() calls with service methods`);
  }

  if (migratedPassed === migratedTotal && FILE_STATUS.needsMigration.length === 0) {
    console.log(`${colors.green}✓ Migration complete! All files successfully migrated.${colors.reset}`);
  } else {
    console.log(`${colors.blue}4.${colors.reset} Run this report again after fixes to track progress`);
  }

  console.log('');
  console.log(`${colors.bright}📋 Next Steps${colors.reset}`);
  console.log('-'.repeat(40));
  console.log('1. Fix any failing migrated files');
  console.log('2. Continue migrating high-priority files');
  console.log('3. Run comprehensive syntax validation');
  console.log('4. Deploy and monitor API service usage');

  console.log('');
}

// Run the report
generateReport();