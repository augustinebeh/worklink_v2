#!/usr/bin/env node

/**
 * Focused API Migration Test
 * Tests specific migrated files for integration correctness
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Known migrated files to test
const MIGRATED_FILES = [
  'admin/src/pages/EscalationQueue.jsx',
  'admin/src/pages/Candidates.jsx',
  'admin/src/pages/Dashboard.jsx',
  'admin/src/pages/AISourcing.jsx',
  'admin/src/pages/RetentionAnalytics.jsx',
  'admin/src/pages/CandidateProfile.jsx',
  'admin/src/pages/Jobs.jsx',
  'admin/src/pages/Clients.jsx'
];

// Expected API service methods (expanded list)
const API_METHODS = {
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

function testFile(filePath) {
  console.log(`\n=== Testing ${filePath} ===`);

  if (!fs.existsSync(filePath)) {
    console.log('❌ File does not exist');
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  let hasErrors = false;

  // 1. Check for API import
  const apiImportPattern = /import\s+{[^}]*\bapi\b[^}]*}\s+from\s+['"`][^'"`]*services\/api['"`]/;
  const hasApiImport = apiImportPattern.test(content);

  if (hasApiImport) {
    console.log('✅ Has centralized API import');
  } else {
    console.log('❌ Missing centralized API import');
    hasErrors = true;
  }

  // 2. Check for remaining fetch() calls
  const fetchMatches = [...content.matchAll(/fetch\s*\(/g)];
  if (fetchMatches.length === 0) {
    console.log('✅ No fetch() calls found');
  } else {
    console.log(`❌ Still has ${fetchMatches.length} fetch() calls`);
    hasErrors = true;
  }

  // 3. Check API method calls (excluding raw client calls and external URLs)
  const apiCallPattern = /api\.(\w+)\.(\w+)/g;
  const apiCalls = [...content.matchAll(apiCallPattern)];
  const invalidCalls = [];

  for (const [fullMatch, service, method] of apiCalls) {
    // Skip raw client calls and external URLs like api.dicebear.com
    if (service === 'client' || service === 'dicebear') {
      continue;
    }

    if (!API_METHODS[service]) {
      invalidCalls.push(`Unknown service: ${service} in ${fullMatch}`);
    } else if (!API_METHODS[service].includes(method)) {
      invalidCalls.push(`Unknown method: ${service}.${method}`);
    }
  }

  if (invalidCalls.length === 0 && apiCalls.length > 0) {
    console.log(`✅ All ${apiCalls.length} API calls are valid`);
  } else if (invalidCalls.length > 0) {
    console.log(`❌ ${invalidCalls.length} invalid API calls:`);
    invalidCalls.forEach(call => console.log(`   - ${call}`));
    hasErrors = true;
  }

  // 4. Check for raw client usage (should be warnings, not errors)
  const rawClientCalls = [...content.matchAll(/api\.client\./g)];
  if (rawClientCalls.length > 0) {
    console.log(`⚠️  ${rawClientCalls.length} raw client calls (consider using service methods)`);
  }

  // 5. Check parameter passing patterns
  const oldParamPatterns = [
    /new URLSearchParams/,
    /\?\$\{.*\}/,
    /params\.append/
  ];

  const hasOldParams = oldParamPatterns.some(pattern => pattern.test(content));
  if (hasOldParams) {
    console.log('⚠️  Old parameter patterns detected (consider object syntax)');
  }

  return !hasErrors;
}

function runTests() {
  console.log('🚀 Testing migrated files for API integration...\n');

  let passedFiles = 0;
  let totalFiles = 0;

  for (const file of MIGRATED_FILES) {
    const fullPath = path.resolve(file);
    totalFiles++;

    if (testFile(fullPath)) {
      passedFiles++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Passed: ${passedFiles}/${totalFiles}`);
  console.log(`   Failed: ${totalFiles - passedFiles}/${totalFiles}`);

  if (passedFiles === totalFiles) {
    console.log('🎉 All migrated files pass integration tests!');
    return true;
  } else {
    console.log('🔧 Some files need fixes before deployment');
    return false;
  }
}

// Check if specific methods are missing from services
function checkMissingMethods() {
  console.log('\n🔍 Checking for potentially missing API methods...\n');

  // Scan migrated files for api.* calls to find potentially missing methods
  const foundCalls = new Set();

  for (const file of MIGRATED_FILES) {
    const fullPath = path.resolve(file);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, 'utf-8');
    const apiCalls = [...content.matchAll(/api\.(\w+)\.(\w+)/g)];

    for (const [, service, method] of apiCalls) {
      foundCalls.add(`${service}.${method}`);
    }
  }

  // Check which calls are not in our known methods
  const unknownCalls = [];
  for (const call of foundCalls) {
    const [service, method] = call.split('.');
    if (!API_METHODS[service] || !API_METHODS[service].includes(method)) {
      unknownCalls.push(call);
    }
  }

  if (unknownCalls.length === 0) {
    console.log('✅ All API calls match available service methods');
  } else {
    console.log('❌ Missing service methods:');
    for (const call of unknownCalls) {
      console.log(`   - ${call}`);
    }
    console.log('\n💡 These methods may need to be implemented in the API services');
  }
}

// Run the tests
const success = runTests();
checkMissingMethods();

process.exit(success ? 0 : 1);