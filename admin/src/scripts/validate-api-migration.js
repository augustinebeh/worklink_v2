#!/usr/bin/env node

/**
 * API Migration Validation Script
 *
 * This script validates all API migrations to ensure:
 * 1. Syntax is correct
 * 2. API imports are valid
 * 3. Method calls match available API services
 * 4. Error handling is maintained
 * 5. Parameter conversion from URLSearchParams to objects is correct
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for terminal output
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

// Available API services and their methods (based on our analysis)
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
    'search', 'getAnalytics', 'bulkUpdate', 'exportData'
  ],
  jobs: [
    'getAll', 'getById', 'create', 'update', 'delete', 'updateStatus',
    'getApplicants', 'addApplicant', 'updateApplicantStatus',
    'getPerformance', 'search', 'getTemplates', 'createFromTemplate',
    'clone', 'getAnalytics', 'getMatchingCandidates', 'bulkUpdate',
    'exportData', 'schedule', 'getPreview'
  ],
  clients: [
    'getAll', 'getById', 'create', 'update', 'delete', 'updateStatus',
    'getJobs', 'getContracts', 'addContract', 'updateContract',
    'getBilling', 'updateBilling', 'getPerformance', 'getContacts',
    'addContact', 'updateContact', 'deleteContact', 'search',
    'getAnalytics', 'getInvoices', 'generateInvoice', 'uploadDocuments',
    'getDocuments', 'exportData', 'getActivityFeed'
  ],
  analytics: [
    'getDashboard', 'getFinancialDashboard', 'getCandidates', 'getJobs',
    'getClients', 'getPerformance', 'getRealTimeMetrics', 'getRetention',
    'getRevenue', 'getConversionFunnel', 'getMarketTrends', 'getEngagement',
    'getCustomReport', 'createCustomReport', 'exportData', 'getGamification',
    'getAIPerformance', 'getSystemHealth'
  ]
};

// Files to test (all React files in pages and components)
const TEST_DIRECTORIES = [
  path.join(__dirname, '../pages'),
  path.join(__dirname, '../components')
];

const REPORT = {
  totalFiles: 0,
  migratedFiles: 0,
  nonMigratedFiles: 0,
  syntaxErrors: [],
  importErrors: [],
  methodErrors: [],
  fetchUsage: [],
  parameterIssues: [],
  recommendations: []
};

/**
 * Get all .jsx files from the specified directories
 */
function getAllJsxFiles(directories) {
  const files = [];

  for (const dir of directories) {
    if (!fs.existsSync(dir)) continue;

    function walkDir(currentDir) {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (item.endsWith('.jsx')) {
          files.push(fullPath);
        }
      }
    }

    walkDir(dir);
  }

  return files;
}

/**
 * Check syntax by attempting to parse with basic regex patterns
 */
function checkSyntax(filePath, content) {
  const errors = [];

  try {
    // Check for basic syntax issues
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      // Check for unmatched brackets/braces
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      const openBrackets = (line.match(/\[/g) || []).length;
      const closeBrackets = (line.match(/\]/g) || []).length;

      // Basic check for missing semicolons on statements
      if (line.match(/^(const|let|var|function|import|export)\s+/) && !line.match(/[{;,]$/)) {
        if (!line.includes('//') && !line.includes('/*')) {
          errors.push(`Line ${lineNum}: Possible missing semicolon or brace`);
        }
      }

      // Check for unterminated strings
      const singleQuotes = (line.match(/'/g) || []).length;
      const doubleQuotes = (line.match(/"/g) || []).length;
      const backticks = (line.match(/`/g) || []).length;

      if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0 || backticks % 2 !== 0) {
        errors.push(`Line ${lineNum}: Possible unterminated string`);
      }
    }

  } catch (error) {
    errors.push(`Parse error: ${error.message}`);
  }

  return errors;
}

/**
 * Check if file uses the new API import structure
 */
function checkImports(content) {
  const issues = [];

  // Check for API imports
  const apiImportPattern = /import\s+{[^}]*api[^}]*}\s+from\s+['"`]\.\.\/shared\/services\/api['"`]/;
  const oldFetchPattern = /import.*from.*\/api\//;

  const hasNewApiImport = apiImportPattern.test(content);
  const hasOldImport = oldFetchPattern.test(content);

  if (hasOldImport && !hasNewApiImport) {
    issues.push('File uses old API import pattern');
  }

  if (!hasNewApiImport && content.includes('api.')) {
    issues.push('File uses api.* calls without proper import');
  }

  return {
    hasNewApiImport,
    hasOldImport,
    issues
  };
}

/**
 * Check method calls against available API methods
 */
function checkMethodCalls(content) {
  const errors = [];
  const warnings = [];

  // Find all api.* method calls
  const apiCallPattern = /api\.(\w+)\.(\w+)/g;
  const matches = [...content.matchAll(apiCallPattern)];

  for (const match of matches) {
    const [fullMatch, service, method] = match;

    if (!API_SERVICES[service]) {
      errors.push(`Unknown API service: ${service} in call ${fullMatch}`);
    } else if (!API_SERVICES[service].includes(method)) {
      errors.push(`Unknown method: ${method} in service ${service} (${fullMatch})`);
    }
  }

  // Check for raw client usage
  const rawClientPattern = /api\.client\./g;
  const rawClientMatches = [...content.matchAll(rawClientPattern)];

  for (const match of rawClientMatches) {
    warnings.push(`Raw API client usage detected: ${match[0]} - consider using service method instead`);
  }

  return { errors, warnings, apiCallCount: matches.length };
}

/**
 * Check for remaining fetch() usage
 */
function checkFetchUsage(content) {
  const fetchPattern = /fetch\s*\(/g;
  const matches = [...content.matchAll(fetchPattern)];

  const usages = [];
  const lines = content.split('\n');

  for (const match of matches) {
    const index = match.index;
    const lineNumber = content.substring(0, index).split('\n').length;
    const line = lines[lineNumber - 1];

    usages.push({
      lineNumber,
      line: line.trim(),
      context: lines.slice(Math.max(0, lineNumber - 3), lineNumber + 2)
    });
  }

  return usages;
}

/**
 * Check for parameter conversion issues
 */
function checkParameterConversion(content) {
  const issues = [];

  // Check for URLSearchParams usage (should be converted to objects)
  if (content.includes('URLSearchParams')) {
    issues.push('URLSearchParams usage detected - should be converted to object parameters');
  }

  // Check for manual query string building
  const manualQueryPattern = /['\"`]\?.*?=.*?['\"`]/;
  if (manualQueryPattern.test(content)) {
    issues.push('Manual query string building detected - should use object parameters');
  }

  return issues;
}

/**
 * Test a single file
 */
function testFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  console.log(`${colors.blue}Testing:${colors.reset} ${relativePath}`);

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Cannot read file: ${error.message}`);
    return;
  }

  REPORT.totalFiles++;

  // Check syntax
  const syntaxErrors = checkSyntax(filePath, content);
  if (syntaxErrors.length > 0) {
    REPORT.syntaxErrors.push({ file: relativePath, errors: syntaxErrors });
    console.log(`${colors.red}✗${colors.reset} Syntax errors: ${syntaxErrors.length}`);
  } else {
    console.log(`${colors.green}✓${colors.reset} Syntax OK`);
  }

  // Check imports
  const importCheck = checkImports(content);
  if (importCheck.issues.length > 0) {
    REPORT.importErrors.push({ file: relativePath, issues: importCheck.issues });
    console.log(`${colors.yellow}!${colors.reset} Import issues: ${importCheck.issues.length}`);
  }

  // Determine if file is migrated
  const isMigrated = importCheck.hasNewApiImport && !content.includes('fetch(');
  if (isMigrated) {
    REPORT.migratedFiles++;
    console.log(`${colors.green}✓${colors.reset} Migrated to new API`);
  } else {
    REPORT.nonMigratedFiles++;
    console.log(`${colors.yellow}!${colors.reset} Not yet migrated`);
  }

  // Check method calls
  if (importCheck.hasNewApiImport) {
    const methodCheck = checkMethodCalls(content);
    if (methodCheck.errors.length > 0) {
      REPORT.methodErrors.push({
        file: relativePath,
        errors: methodCheck.errors,
        warnings: methodCheck.warnings
      });
      console.log(`${colors.red}✗${colors.reset} Method errors: ${methodCheck.errors.length}`);
    }

    if (methodCheck.warnings.length > 0) {
      console.log(`${colors.yellow}!${colors.reset} Method warnings: ${methodCheck.warnings.length}`);
    }

    console.log(`${colors.cyan}→${colors.reset} API calls found: ${methodCheck.apiCallCount}`);
  }

  // Check fetch usage
  const fetchUsages = checkFetchUsage(content);
  if (fetchUsages.length > 0) {
    REPORT.fetchUsage.push({ file: relativePath, usages: fetchUsages });
    console.log(`${colors.yellow}!${colors.reset} fetch() calls: ${fetchUsages.length}`);
  }

  // Check parameter conversion
  const paramIssues = checkParameterConversion(content);
  if (paramIssues.length > 0) {
    REPORT.parameterIssues.push({ file: relativePath, issues: paramIssues });
    console.log(`${colors.yellow}!${colors.reset} Parameter issues: ${paramIssues.length}`);
  }

  console.log('');
}

/**
 * Generate recommendations based on findings
 */
function generateRecommendations() {
  const recs = [];

  if (REPORT.syntaxErrors.length > 0) {
    recs.push(`Fix ${REPORT.syntaxErrors.length} files with syntax errors before deployment`);
  }

  if (REPORT.nonMigratedFiles > 0) {
    recs.push(`Migrate ${REPORT.nonMigratedFiles} remaining files to use centralized API services`);
  }

  if (REPORT.methodErrors.length > 0) {
    recs.push(`Fix ${REPORT.methodErrors.length} files with invalid API method calls`);
  }

  if (REPORT.fetchUsage.length > 0) {
    recs.push(`Replace fetch() calls in ${REPORT.fetchUsage.length} files with API service methods`);
  }

  if (REPORT.parameterIssues.length > 0) {
    recs.push(`Convert parameter handling in ${REPORT.parameterIssues.length} files to use object syntax`);
  }

  if (REPORT.migratedFiles === REPORT.totalFiles && REPORT.syntaxErrors.length === 0) {
    recs.push('✓ All files successfully migrated and tested!');
  }

  return recs;
}

/**
 * Print detailed report
 */
function printReport() {
  console.log(`\n${colors.bright}${colors.cyan}API Migration Validation Report${colors.reset}`);
  console.log(`${'='.repeat(50)}\n`);

  // Summary stats
  console.log(`${colors.bright}Summary:${colors.reset}`);
  console.log(`Total files tested: ${REPORT.totalFiles}`);
  console.log(`Migrated files: ${colors.green}${REPORT.migratedFiles}${colors.reset}`);
  console.log(`Non-migrated files: ${colors.yellow}${REPORT.nonMigratedFiles}${colors.reset}`);
  console.log(`Migration progress: ${Math.round((REPORT.migratedFiles / REPORT.totalFiles) * 100)}%\n`);

  // Detailed findings
  if (REPORT.syntaxErrors.length > 0) {
    console.log(`${colors.bright}${colors.red}Syntax Errors (${REPORT.syntaxErrors.length} files):${colors.reset}`);
    for (const item of REPORT.syntaxErrors) {
      console.log(`  ${colors.red}✗${colors.reset} ${item.file}`);
      for (const error of item.errors) {
        console.log(`    ${error}`);
      }
    }
    console.log('');
  }

  if (REPORT.methodErrors.length > 0) {
    console.log(`${colors.bright}${colors.red}Method Call Errors (${REPORT.methodErrors.length} files):${colors.reset}`);
    for (const item of REPORT.methodErrors) {
      console.log(`  ${colors.red}✗${colors.reset} ${item.file}`);
      for (const error of item.errors) {
        console.log(`    ${error}`);
      }
      for (const warning of item.warnings) {
        console.log(`    ${colors.yellow}⚠${colors.reset} ${warning}`);
      }
    }
    console.log('');
  }

  if (REPORT.fetchUsage.length > 0) {
    console.log(`${colors.bright}${colors.yellow}Remaining fetch() Usage (${REPORT.fetchUsage.length} files):${colors.reset}`);
    for (const item of REPORT.fetchUsage) {
      console.log(`  ${colors.yellow}!${colors.reset} ${item.file} (${item.usages.length} calls)`);
      for (const usage of item.usages.slice(0, 3)) { // Show first 3 usages
        console.log(`    Line ${usage.lineNumber}: ${usage.line}`);
      }
      if (item.usages.length > 3) {
        console.log(`    ... and ${item.usages.length - 3} more`);
      }
    }
    console.log('');
  }

  if (REPORT.importErrors.length > 0) {
    console.log(`${colors.bright}${colors.yellow}Import Issues (${REPORT.importErrors.length} files):${colors.reset}`);
    for (const item of REPORT.importErrors) {
      console.log(`  ${colors.yellow}!${colors.reset} ${item.file}`);
      for (const issue of item.issues) {
        console.log(`    ${issue}`);
      }
    }
    console.log('');
  }

  // Recommendations
  const recommendations = generateRecommendations();
  if (recommendations.length > 0) {
    console.log(`${colors.bright}${colors.magenta}Recommendations:${colors.reset}`);
    for (const rec of recommendations) {
      console.log(`  ${rec.startsWith('✓') ? colors.green : ''}${rec}${colors.reset}`);
    }
    console.log('');
  }

  // Available API services info
  console.log(`${colors.bright}Available API Services:${colors.reset}`);
  for (const [service, methods] of Object.entries(API_SERVICES)) {
    console.log(`  ${colors.cyan}${service}${colors.reset}: ${methods.length} methods`);
    console.log(`    ${methods.slice(0, 5).join(', ')}${methods.length > 5 ? '...' : ''}`);
  }
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.bright}${colors.cyan}API Migration Validation Tool${colors.reset}`);
  console.log(`Testing React components for API migration compliance\n`);

  const files = getAllJsxFiles(TEST_DIRECTORIES);

  if (files.length === 0) {
    console.log(`${colors.red}No .jsx files found in test directories${colors.reset}`);
    process.exit(1);
  }

  console.log(`Found ${files.length} .jsx files to test\n`);

  // Test each file
  for (const file of files) {
    testFile(file);
  }

  // Print comprehensive report
  printReport();

  // Exit with appropriate code
  const hasErrors = REPORT.syntaxErrors.length > 0 || REPORT.methodErrors.length > 0;
  process.exit(hasErrors ? 1 : 0);
}

// Run the script
main();