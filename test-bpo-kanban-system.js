/**
 * Comprehensive BPO Kanban System Test Suite
 * Tests all components, functionality, and user flows
 *
 * Run: node test-bpo-kanban-system.js
 */

const axios = require('axios');
const fs = require('fs').promises;

const BASE_URL = 'http://localhost:8080';
const API_URL = `${BASE_URL}/api/v1`;

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Test results storage
const testResults = {
  passed: [],
  failed: [],
  warnings: [],
  performance: {},
  startTime: Date.now(),
};

// Test configuration
let authToken = null;
let testTenderId = null;

/**
 * Logging utilities
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80));
}

function logTest(name, status, details = '') {
  const symbol = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
  const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  log(`  ${symbol} ${name}`, color);
  if (details) {
    log(`    ${details}`, 'cyan');
  }
}

function recordTest(name, passed, details = '') {
  if (passed) {
    testResults.passed.push({ name, details });
    logTest(name, 'PASS', details);
  } else {
    testResults.failed.push({ name, details });
    logTest(name, 'FAIL', details);
  }
}

function recordWarning(name, details) {
  testResults.warnings.push({ name, details });
  logTest(name, 'WARN', details);
}

function recordPerformance(name, duration) {
  testResults.performance[name] = duration;
  const color = duration < 1000 ? 'green' : duration < 3000 ? 'yellow' : 'red';
  log(`    Performance: ${duration}ms`, color);
}

/**
 * Test 1: Authentication
 */
async function testAuthentication() {
  logSection('TEST 1: Authentication');

  try {
    const startTime = Date.now();
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@worklink.sg',
      password: 'admin123'
    });
    const duration = Date.now() - startTime;

    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      recordTest('Admin login successful', true, `Token: ${authToken.substring(0, 20)}...`);
      recordPerformance('Login', duration);
      return true;
    } else {
      recordTest('Admin login failed', false, 'No token returned');
      return false;
    }
  } catch (error) {
    recordTest('Admin login error', false, error.message);
    return false;
  }
}

/**
 * Test 2: API Lifecycle Service
 */
async function testLifecycleAPI() {
  logSection('TEST 2: Lifecycle API Endpoints');

  const headers = { Authorization: `Bearer ${authToken}` };

  // Test 2.1: Get all tenders
  try {
    const startTime = Date.now();
    const response = await axios.get(`${API_URL}/bpo/lifecycle`, { headers });
    const duration = Date.now() - startTime;

    if (response.data.success) {
      const tenders = response.data.data || [];
      recordTest('GET /bpo/lifecycle', true, `Retrieved ${tenders.length} tenders`);
      recordPerformance('Get Tenders', duration);

      if (tenders.length > 0) {
        testTenderId = tenders[0].id;
      }
    } else {
      recordTest('GET /bpo/lifecycle', false, response.data.message);
    }
  } catch (error) {
    recordTest('GET /bpo/lifecycle', false, error.message);
  }

  // Test 2.2: Get pipeline stats
  try {
    const startTime = Date.now();
    const response = await axios.get(`${API_URL}/bpo/lifecycle/dashboard/stats`, { headers });
    const duration = Date.now() - startTime;

    if (response.data.success) {
      const stats = response.data.data;
      recordTest('GET /bpo/lifecycle/dashboard/stats', true,
        `Total: ${stats.total_tenders}, Win Rate: ${stats.win_rate}%`);
      recordPerformance('Get Stats', duration);
    } else {
      recordTest('GET /bpo/lifecycle/dashboard/stats', false, response.data.message);
    }
  } catch (error) {
    recordTest('GET /bpo/lifecycle/dashboard/stats', false, error.message);
  }

  // Test 2.3: Get single tender
  if (testTenderId) {
    try {
      const response = await axios.get(`${API_URL}/bpo/lifecycle/${testTenderId}`, { headers });

      if (response.data.success) {
        const tender = response.data.data;
        recordTest('GET /bpo/lifecycle/:id', true, `Tender: ${tender.title}`);
      } else {
        recordTest('GET /bpo/lifecycle/:id', false, response.data.message);
      }
    } catch (error) {
      recordTest('GET /bpo/lifecycle/:id', false, error.message);
    }
  }

  // Test 2.4: Create new tender
  try {
    const newTender = {
      title: 'Test Kanban Tender - Auto Generated',
      agency: 'Ministry of Test',
      estimated_value: 500000,
      closing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'new_opportunity',
      priority: 'medium',
      source: 'gebiz',
      is_renewal: false
    };

    const response = await axios.post(`${API_URL}/bpo/lifecycle`, newTender, { headers });

    if (response.data.success) {
      testTenderId = response.data.data.id;
      recordTest('POST /bpo/lifecycle (Create)', true, `Created tender ID: ${testTenderId}`);
    } else {
      recordTest('POST /bpo/lifecycle (Create)', false, response.data.message);
    }
  } catch (error) {
    recordTest('POST /bpo/lifecycle (Create)', false, error.message);
  }
}

/**
 * Test 3: Drag-and-Drop Functionality (API)
 */
async function testDragAndDropAPI() {
  logSection('TEST 3: Drag-and-Drop API (Move Tender)');

  if (!testTenderId) {
    recordWarning('Drag-and-Drop API', 'No tender ID available for testing');
    return;
  }

  const headers = { Authorization: `Bearer ${authToken}` };
  const stages = [
    'review',
    'bidding',
    'internal_approval',
    'submitted'
  ];

  // Test moving through multiple stages
  for (const stage of stages) {
    try {
      const startTime = Date.now();
      const response = await axios.post(
        `${API_URL}/bpo/lifecycle/${testTenderId}/move`,
        {
          new_stage: stage,
          user_id: 'admin',
          notes: `Automated test move to ${stage}`
        },
        { headers }
      );
      const duration = Date.now() - startTime;

      if (response.data.success) {
        recordTest(`Move tender to ${stage}`, true, `Stage updated successfully`);
        recordPerformance(`Move to ${stage}`, duration);

        // Verify the move
        const verifyResponse = await axios.get(`${API_URL}/bpo/lifecycle/${testTenderId}`, { headers });
        if (verifyResponse.data.data.stage === stage) {
          recordTest(`Verify move to ${stage}`, true, 'Stage verified');
        } else {
          recordTest(`Verify move to ${stage}`, false,
            `Expected ${stage}, got ${verifyResponse.data.data.stage}`);
        }
      } else {
        recordTest(`Move tender to ${stage}`, false, response.data.message);
      }

      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      recordTest(`Move tender to ${stage}`, false, error.message);
    }
  }
}

/**
 * Test 4: Component File Existence
 */
async function testComponentFiles() {
  logSection('TEST 4: Component File Existence');

  const files = [
    '/home/augustine/Augustine_Projects/worklink_v2/admin/src/pages/BPOTenderLifecycle.jsx',
    '/home/augustine/Augustine_Projects/worklink_v2/admin/src/components/bpo/ViewToggle.jsx',
    '/home/augustine/Augustine_Projects/worklink_v2/admin/src/components/bpo/KanbanBoard.jsx',
    '/home/augustine/Augustine_Projects/worklink_v2/admin/src/components/bpo/KanbanColumn.jsx',
    '/home/augustine/Augustine_Projects/worklink_v2/admin/src/components/bpo/TenderCard.jsx',
    '/home/augustine/Augustine_Projects/worklink_v2/admin/src/components/bpo/LifecyclePipeline.jsx',
    '/home/augustine/Augustine_Projects/worklink_v2/admin/src/hooks/useKanbanDnd.js',
    '/home/augustine/Augustine_Projects/worklink_v2/admin/src/shared/services/api/lifecycle.service.js',
  ];

  for (const file of files) {
    try {
      await fs.access(file);
      const stats = await fs.stat(file);
      const fileName = file.split('/').pop();
      recordTest(`File exists: ${fileName}`, true, `Size: ${stats.size} bytes`);
    } catch (error) {
      const fileName = file.split('/').pop();
      recordTest(`File exists: ${fileName}`, false, 'File not found');
    }
  }
}

/**
 * Test 5: Component Code Analysis
 */
async function testComponentCode() {
  logSection('TEST 5: Component Code Analysis');

  // Test ViewToggle component
  try {
    const content = await fs.readFile(
      '/home/augustine/Augustine_Projects/worklink_v2/admin/src/components/bpo/ViewToggle.jsx',
      'utf-8'
    );

    const checks = [
      { name: 'ViewToggle has keyboard shortcuts (K/L)', pattern: /key === 'k'|key === 'K'|key === 'l'|key === 'L'/ },
      { name: 'ViewToggle has localStorage persistence', pattern: /localStorage\.setItem|localStorage\.getItem/ },
      { name: 'ViewToggle has mobile detection', pattern: /window\.innerWidth.*768/ },
      { name: 'ViewToggle has tooltip', pattern: /tooltip/i },
      { name: 'ViewToggle has useViewMode hook', pattern: /export function useViewMode/ },
    ];

    checks.forEach(check => {
      const passed = check.pattern.test(content);
      recordTest(check.name, passed);
    });
  } catch (error) {
    recordTest('ViewToggle code analysis', false, error.message);
  }

  // Test KanbanBoard component
  try {
    const content = await fs.readFile(
      '/home/augustine/Augustine_Projects/worklink_v2/admin/src/components/bpo/KanbanBoard.jsx',
      'utf-8'
    );

    const checks = [
      { name: 'KanbanBoard uses @dnd-kit/core', pattern: /@dnd-kit\/core/ },
      { name: 'KanbanBoard has DndContext', pattern: /<DndContext/ },
      { name: 'KanbanBoard has DragOverlay', pattern: /<DragOverlay/ },
      { name: 'KanbanBoard has 8 stages', pattern: /8.*stage|STAGES.*\[[\s\S]*?\]/ },
      { name: 'KanbanBoard has useKanbanDnd hook', pattern: /useKanbanDnd/ },
      { name: 'KanbanBoard has mobile warning', pattern: /mobile.*warning|drag.*drop.*optimized/i },
    ];

    checks.forEach(check => {
      const passed = check.pattern.test(content);
      recordTest(check.name, passed);
    });
  } catch (error) {
    recordTest('KanbanBoard code analysis', false, error.message);
  }

  // Test useKanbanDnd hook
  try {
    const content = await fs.readFile(
      '/home/augustine/Augustine_Projects/worklink_v2/admin/src/hooks/useKanbanDnd.js',
      'utf-8'
    );

    const checks = [
      { name: 'useKanbanDnd has optimistic updates', pattern: /optimistic.*update|setTenders.*map/i },
      { name: 'useKanbanDnd has error rollback', pattern: /rollback|previousState/i },
      { name: 'useKanbanDnd has toast notifications', pattern: /toast\.success|toast\.error/ },
      { name: 'useKanbanDnd calls lifecycle API', pattern: /lifecycleService\.moveTender/ },
      { name: 'useKanbanDnd has handleDragStart', pattern: /handleDragStart/ },
      { name: 'useKanbanDnd has handleDragEnd', pattern: /handleDragEnd/ },
    ];

    checks.forEach(check => {
      const passed = check.pattern.test(content);
      recordTest(check.name, passed);
    });
  } catch (error) {
    recordTest('useKanbanDnd code analysis', false, error.message);
  }

  // Test LifecyclePipeline integration
  try {
    const content = await fs.readFile(
      '/home/augustine/Augustine_Projects/worklink_v2/admin/src/components/bpo/LifecyclePipeline.jsx',
      'utf-8'
    );

    const checks = [
      { name: 'LifecyclePipeline has viewMode prop', pattern: /viewMode\s*[=:]/ },
      { name: 'LifecyclePipeline renders KanbanBoard', pattern: /<KanbanBoard/ },
      { name: 'LifecyclePipeline has conditional rendering', pattern: /if.*viewMode.*kanban|viewMode\s*===\s*['"]kanban['"]/ },
      { name: 'LifecyclePipeline passes refreshKey', pattern: /refreshKey\s*=/ },
    ];

    checks.forEach(check => {
      const passed = check.pattern.test(content);
      recordTest(check.name, passed);
    });
  } catch (error) {
    recordTest('LifecyclePipeline code analysis', false, error.message);
  }
}

/**
 * Test 6: API Payload Validation
 */
async function testAPIPayloads() {
  logSection('TEST 6: API Payload Validation');

  const headers = { Authorization: `Bearer ${authToken}` };

  // Test move tender with various payloads
  if (testTenderId) {
    // Test 6.1: Valid payload
    try {
      const response = await axios.post(
        `${API_URL}/bpo/lifecycle/${testTenderId}/move`,
        {
          new_stage: 'review',
          user_id: 'admin',
          notes: 'Valid payload test'
        },
        { headers }
      );

      recordTest('Valid move payload accepted', response.data.success);
    } catch (error) {
      recordTest('Valid move payload accepted', false, error.message);
    }

    // Test 6.2: Missing required fields
    try {
      const response = await axios.post(
        `${API_URL}/bpo/lifecycle/${testTenderId}/move`,
        { new_stage: 'bidding' }, // Missing user_id and notes
        { headers }
      );

      // Should still work with partial data
      recordTest('Partial payload handling', response.data.success,
        'API accepts minimal required fields');
    } catch (error) {
      recordWarning('Partial payload handling', 'API may require all fields');
    }

    // Test 6.3: Invalid stage
    try {
      const response = await axios.post(
        `${API_URL}/bpo/lifecycle/${testTenderId}/move`,
        {
          new_stage: 'invalid_stage',
          user_id: 'admin'
        },
        { headers }
      );

      recordTest('Invalid stage rejection', !response.data.success,
        'Should reject invalid stage names');
    } catch (error) {
      recordTest('Invalid stage rejection', true, 'API properly validates stages');
    }
  }
}

/**
 * Test 7: Performance Testing
 */
async function testPerformance() {
  logSection('TEST 7: Performance Testing');

  const headers = { Authorization: `Bearer ${authToken}` };

  // Test 7.1: Multiple rapid API calls
  try {
    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < 10; i++) {
      promises.push(axios.get(`${API_URL}/bpo/lifecycle`, { headers }));
    }

    await Promise.all(promises);
    const duration = Date.now() - startTime;

    const avgTime = duration / 10;
    recordTest('Concurrent API requests', true, `10 requests in ${duration}ms`);
    recordPerformance('Average request time', avgTime);

    if (avgTime > 1000) {
      recordWarning('Performance', 'Average request time exceeds 1 second');
    }
  } catch (error) {
    recordTest('Concurrent API requests', false, error.message);
  }

  // Test 7.2: Large dataset handling
  try {
    const startTime = Date.now();
    const response = await axios.get(`${API_URL}/bpo/lifecycle`, { headers });
    const duration = Date.now() - startTime;

    const tenderCount = response.data.data?.length || 0;
    recordTest('Large dataset loading', true, `${tenderCount} tenders in ${duration}ms`);

    if (tenderCount > 50 && duration > 2000) {
      recordWarning('Performance', 'Large dataset may cause slow rendering');
    }
  } catch (error) {
    recordTest('Large dataset loading', false, error.message);
  }
}

/**
 * Test 8: Error Handling
 */
async function testErrorHandling() {
  logSection('TEST 8: Error Handling');

  const headers = { Authorization: `Bearer ${authToken}` };

  // Test 8.1: Non-existent tender
  try {
    await axios.get(`${API_URL}/bpo/lifecycle/99999999`, { headers });
    recordTest('Non-existent tender error', false, 'Should return error for invalid ID');
  } catch (error) {
    recordTest('Non-existent tender error', true, 'Properly handles 404/error');
  }

  // Test 8.2: Invalid authentication
  try {
    await axios.get(`${API_URL}/bpo/lifecycle`, {
      headers: { Authorization: 'Bearer invalid_token' }
    });
    recordTest('Invalid auth error', false, 'Should reject invalid token');
  } catch (error) {
    recordTest('Invalid auth error', true, 'Properly validates authentication');
  }

  // Test 8.3: Malformed request
  try {
    await axios.post(`${API_URL}/bpo/lifecycle`,
      { invalid: 'data' },
      { headers }
    );
    recordTest('Malformed request error', false, 'Should validate request data');
  } catch (error) {
    recordTest('Malformed request error', true, 'Properly validates request structure');
  }
}

/**
 * Test 9: Integration Tests
 */
async function testIntegration() {
  logSection('TEST 9: Integration Tests');

  const headers = { Authorization: `Bearer ${authToken}` };

  // Test complete workflow: Create -> Move -> Update -> Delete
  try {
    // Step 1: Create tender
    const createResponse = await axios.post(`${API_URL}/bpo/lifecycle`, {
      title: 'Integration Test Tender',
      agency: 'Test Agency',
      estimated_value: 1000000,
      closing_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      stage: 'new_opportunity',
      priority: 'high'
    }, { headers });

    if (!createResponse.data.success) {
      recordTest('Integration workflow', false, 'Failed to create tender');
      return;
    }

    const integrationTenderId = createResponse.data.data.id;
    recordTest('Integration: Create tender', true, `ID: ${integrationTenderId}`);

    // Step 2: Move through stages
    const stages = ['review', 'bidding', 'internal_approval'];
    for (const stage of stages) {
      const moveResponse = await axios.post(
        `${API_URL}/bpo/lifecycle/${integrationTenderId}/move`,
        { new_stage: stage, user_id: 'admin' },
        { headers }
      );

      if (!moveResponse.data.success) {
        recordTest(`Integration: Move to ${stage}`, false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }
    recordTest('Integration: Move through stages', true, 'All stages completed');

    // Step 3: Update tender
    const updateResponse = await axios.patch(
      `${API_URL}/bpo/lifecycle/${integrationTenderId}`,
      { priority: 'critical', assigned_to: 'sarah_tan' },
      { headers }
    );

    recordTest('Integration: Update tender', updateResponse.data.success);

    // Step 4: Verify final state
    const finalResponse = await axios.get(
      `${API_URL}/bpo/lifecycle/${integrationTenderId}`,
      { headers }
    );

    const finalTender = finalResponse.data.data;
    const verified =
      finalTender.stage === 'internal_approval' &&
      finalTender.priority === 'critical' &&
      finalTender.assigned_to === 'sarah_tan';

    recordTest('Integration: Verify final state', verified,
      `Stage: ${finalTender.stage}, Priority: ${finalTender.priority}`);

    // Step 5: Clean up
    const deleteResponse = await axios.delete(
      `${API_URL}/bpo/lifecycle/${integrationTenderId}`,
      { headers }
    );

    recordTest('Integration: Delete tender', deleteResponse.data.success);

  } catch (error) {
    recordTest('Integration workflow', false, error.message);
  }
}

/**
 * Test 10: Accessibility and Best Practices
 */
async function testAccessibility() {
  logSection('TEST 10: Accessibility & Best Practices');

  // Check component files for accessibility features
  const componentFiles = [
    {
      path: '/home/augustine/Augustine_Projects/worklink_v2/admin/src/components/bpo/KanbanBoard.jsx',
      checks: [
        { name: 'Has ARIA labels', pattern: /aria-label/ },
        { name: 'Has role attributes', pattern: /role=/ },
        { name: 'Has keyboard support', pattern: /KeyboardSensor/ },
      ]
    },
    {
      path: '/home/augustine/Augustine_Projects/worklink_v2/admin/src/components/bpo/ViewToggle.jsx',
      checks: [
        { name: 'ViewToggle has ARIA labels', pattern: /aria-label/ },
        { name: 'ViewToggle has keyboard hints', pattern: /<kbd/ },
        { name: 'ViewToggle has pressed state', pattern: /aria-pressed/ },
      ]
    },
    {
      path: '/home/augustine/Augustine_Projects/worklink_v2/admin/src/components/bpo/TenderCard.jsx',
      checks: [
        { name: 'TenderCard has tabindex', pattern: /tabIndex/ },
        { name: 'TenderCard has semantic HTML', pattern: /role=|aria-/ },
      ]
    }
  ];

  for (const file of componentFiles) {
    try {
      const content = await fs.readFile(file.path, 'utf-8');

      file.checks.forEach(check => {
        const passed = check.pattern.test(content);
        recordTest(check.name, passed);
      });
    } catch (error) {
      recordTest(`Accessibility check for ${file.path.split('/').pop()}`, false, error.message);
    }
  }
}

/**
 * Generate Test Report
 */
function generateReport() {
  logSection('TEST REPORT SUMMARY');

  const totalTests = testResults.passed.length + testResults.failed.length;
  const passRate = ((testResults.passed.length / totalTests) * 100).toFixed(1);
  const duration = Date.now() - testResults.startTime;

  log(`\nTotal Tests: ${totalTests}`, 'bright');
  log(`Passed: ${testResults.passed.length}`, 'green');
  log(`Failed: ${testResults.failed.length}`, 'red');
  log(`Warnings: ${testResults.warnings.length}`, 'yellow');
  log(`Pass Rate: ${passRate}%`, passRate >= 90 ? 'green' : passRate >= 70 ? 'yellow' : 'red');
  log(`Total Duration: ${(duration / 1000).toFixed(2)}s`, 'cyan');

  // Overall status
  console.log('\n' + '='.repeat(80));
  if (testResults.failed.length === 0) {
    log('✅ ALL TESTS PASSED', 'green');
  } else if (passRate >= 80) {
    log('⚠️  TESTS PASSED WITH WARNINGS', 'yellow');
  } else {
    log('❌ TESTS FAILED', 'red');
  }
  console.log('='.repeat(80));

  // Failed tests details
  if (testResults.failed.length > 0) {
    log('\n\nFailed Tests:', 'red');
    testResults.failed.forEach((test, i) => {
      log(`  ${i + 1}. ${test.name}`, 'red');
      if (test.details) log(`     ${test.details}`, 'cyan');
    });
  }

  // Warnings
  if (testResults.warnings.length > 0) {
    log('\n\nWarnings:', 'yellow');
    testResults.warnings.forEach((warning, i) => {
      log(`  ${i + 1}. ${warning.name}`, 'yellow');
      if (warning.details) log(`     ${warning.details}`, 'cyan');
    });
  }

  // Performance summary
  log('\n\nPerformance Metrics:', 'cyan');
  Object.entries(testResults.performance).forEach(([name, duration]) => {
    const color = duration < 1000 ? 'green' : duration < 3000 ? 'yellow' : 'red';
    log(`  ${name}: ${duration}ms`, color);
  });

  // Recommendations
  log('\n\nRecommendations:', 'bright');

  if (testResults.failed.length === 0) {
    log('  ✓ All tests passed! System is ready for production.', 'green');
  } else {
    log('  ✗ Fix failed tests before deploying to production.', 'red');
  }

  if (testResults.warnings.length > 0) {
    log('  ⚠ Review warnings for potential improvements.', 'yellow');
  }

  const avgPerf = Object.values(testResults.performance).reduce((a, b) => a + b, 0) /
                  Object.values(testResults.performance).length;

  if (avgPerf > 2000) {
    log('  ⚠ Consider performance optimizations for better UX.', 'yellow');
  } else if (avgPerf < 1000) {
    log('  ✓ Excellent performance metrics!', 'green');
  }

  console.log('\n' + '='.repeat(80));

  return {
    totalTests,
    passed: testResults.passed.length,
    failed: testResults.failed.length,
    warnings: testResults.warnings.length,
    passRate: parseFloat(passRate),
    duration,
    status: testResults.failed.length === 0 ? 'PASS' : passRate >= 80 ? 'WARN' : 'FAIL'
  };
}

/**
 * Save detailed report to file
 */
async function saveReport(summary) {
  const report = {
    timestamp: new Date().toISOString(),
    summary,
    tests: {
      passed: testResults.passed,
      failed: testResults.failed,
      warnings: testResults.warnings
    },
    performance: testResults.performance
  };

  try {
    await fs.writeFile(
      '/home/augustine/Augustine_Projects/worklink_v2/bpo-kanban-test-report.json',
      JSON.stringify(report, null, 2)
    );
    log('\n📄 Detailed report saved to: bpo-kanban-test-report.json', 'cyan');
  } catch (error) {
    log('\n⚠️  Could not save report file', 'yellow');
  }
}

/**
 * Main test execution
 */
async function runTests() {
  log('\n' + '█'.repeat(80), 'bright');
  log('BPO KANBAN SYSTEM - COMPREHENSIVE TEST SUITE', 'bright');
  log('█'.repeat(80) + '\n', 'bright');

  log('Testing System:', 'cyan');
  log(`  Base URL: ${BASE_URL}`, 'cyan');
  log(`  API URL: ${API_URL}`, 'cyan');
  log(`  Start Time: ${new Date().toISOString()}`, 'cyan');

  try {
    // Run all test suites
    const authSuccess = await testAuthentication();

    if (!authSuccess) {
      log('\n❌ Authentication failed. Cannot proceed with API tests.', 'red');
      log('Please ensure the server is running on http://localhost:8080', 'yellow');
    } else {
      await testLifecycleAPI();
      await testDragAndDropAPI();
      await testAPIPayloads();
      await testPerformance();
      await testErrorHandling();
      await testIntegration();
    }

    // Run tests that don't require authentication
    await testComponentFiles();
    await testComponentCode();
    await testAccessibility();

    // Generate and save report
    const summary = generateReport();
    await saveReport(summary);

    // Exit with appropriate code
    process.exit(summary.failed > 0 ? 1 : 0);

  } catch (error) {
    log(`\n❌ Fatal error during testing: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();
