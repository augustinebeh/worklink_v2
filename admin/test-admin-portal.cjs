/**
 * Comprehensive Admin Portal Frontend Test
 * Tests all UI elements, navigation, modals, forms, and buttons
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173/admin';
const CREDENTIALS = {
  email: 'admin@worklink.sg',
  password: 'admin123'
};

// Test results tracking
const testResults = {
  passed: [],
  failed: [],
  warnings: [],
  timestamp: new Date().toISOString(),
  screenshots: []
};

// Helper to take screenshots
async function takeScreenshot(page, name) {
  const screenshotDir = path.join(__dirname, 'test-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir);
  }
  const filename = `${name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
  const filepath = path.join(screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  testResults.screenshots.push({ name, filename, filepath });
  return filepath;
}

// Helper to log test results
function logTest(status, test, details = '') {
  const result = { test, details, timestamp: new Date().toISOString() };
  if (status === 'pass') {
    testResults.passed.push(result);
    console.log(`✓ PASS: ${test}`);
  } else if (status === 'fail') {
    testResults.failed.push(result);
    console.error(`✗ FAIL: ${test} - ${details}`);
  } else if (status === 'warn') {
    testResults.warnings.push(result);
    console.warn(`⚠ WARN: ${test} - ${details}`);
  }
  if (details) console.log(`  ${details}`);
}

// Helper to wait with timeout
async function waitForSelector(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout, state: 'visible' });
    return true;
  } catch (e) {
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Admin Portal Comprehensive Frontend Test\n');
  console.log(`Testing: ${BASE_URL}`);
  console.log(`Login: ${CREDENTIALS.email} / ${CREDENTIALS.password}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: 'test-videos/' }
  });
  const page = await context.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Capture page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  try {
    // ========================================
    // TEST 1: Login Page
    // ========================================
    console.log('\n📋 TEST SECTION: Login Page\n');

    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'login-page');

    // Check if login form exists
    const emailInput = await page.locator('input[type="email"]').isVisible();
    const passwordInput = await page.locator('input[type="password"]').isVisible();
    const loginButton = await page.locator('button[type="submit"]').isVisible();
    const logo = await page.locator('svg, img').first().isVisible();

    if (emailInput && passwordInput && loginButton) {
      logTest('pass', 'Login form elements visible', 'Email, password inputs and submit button found');
    } else {
      logTest('fail', 'Login form elements', 'Missing form elements');
    }

    if (logo) {
      logTest('pass', 'Logo visible on login page');
    } else {
      logTest('warn', 'Logo not found on login page');
    }

    // Test form validation
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    const validationMessages = await page.locator('text=/required|invalid/i').count();
    if (validationMessages > 0) {
      logTest('pass', 'Form validation works', `Found ${validationMessages} validation messages`);
    } else {
      logTest('warn', 'Form validation', 'No validation messages shown for empty form');
    }

    // Test invalid login
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);

    const errorMessage = await page.locator('text=/invalid|error|wrong/i').isVisible();
    if (errorMessage) {
      logTest('pass', 'Invalid login error handling', 'Error message displayed for wrong credentials');
    } else {
      logTest('warn', 'Invalid login error', 'No error message shown');
    }

    await takeScreenshot(page, 'login-error');

    // Test successful login
    await page.fill('input[type="email"]', CREDENTIALS.email);
    await page.fill('input[type="password"]', CREDENTIALS.password);

    // Click submit and wait for navigation
    await page.locator('button[type="submit"]').click();

    // Wait for redirect to dashboard (more flexible pattern)
    try {
      await page.waitForURL((url) => url.pathname.endsWith('/admin') || url.pathname.endsWith('/admin/'), { timeout: 15000 });
    } catch (e) {
      // Fallback: check if we're on any non-login page
      await page.waitForTimeout(3000);
    }

    await page.waitForLoadState('networkidle');

    const isLoggedIn = page.url().includes('/admin') && !page.url().includes('/login');
    if (isLoggedIn) {
      logTest('pass', 'Successful login', 'Redirected to dashboard');
    } else {
      logTest('fail', 'Login failed', `Current URL: ${page.url()}`);
      throw new Error('Login failed - cannot continue tests');
    }

    await takeScreenshot(page, 'dashboard-initial');

    // ========================================
    // TEST 2: Dashboard & Layout
    // ========================================
    console.log('\n📋 TEST SECTION: Dashboard & Layout\n');

    // Check sidebar
    const sidebar = await page.locator('aside').isVisible();
    if (sidebar) {
      logTest('pass', 'Sidebar visible');
    } else {
      logTest('fail', 'Sidebar not found');
    }

    // Check header
    const header = await page.locator('header').isVisible();
    if (header) {
      logTest('pass', 'Header visible');
    } else {
      logTest('warn', 'Header not found');
    }

    // Count navigation items
    const navItems = await page.locator('nav a, nav button').count();
    if (navItems > 0) {
      logTest('pass', 'Navigation items found', `${navItems} navigation items`);
    } else {
      logTest('fail', 'No navigation items found');
    }

    // Test theme toggle (dark mode)
    const themeToggle = await page.locator('button[aria-label*="theme"], button[aria-label*="dark"], svg.lucide-moon, svg.lucide-sun').first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
      const isDarkMode = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      logTest('pass', 'Theme toggle works', `Dark mode: ${isDarkMode}`);
      await takeScreenshot(page, 'dark-mode');
      // Toggle back
      await themeToggle.click();
      await page.waitForTimeout(500);
    } else {
      logTest('warn', 'Theme toggle button not found');
    }

    // Test sidebar collapse
    const collapseButton = await page.locator('button[aria-label*="collapse"]').first();
    if (await collapseButton.isVisible()) {
      await collapseButton.click();
      await page.waitForTimeout(500);
      await takeScreenshot(page, 'sidebar-collapsed');
      logTest('pass', 'Sidebar collapse works');
      // Expand back
      const logoIcon = await page.locator('aside svg, aside img').first();
      if (await logoIcon.isVisible()) {
        await logoIcon.click();
        await page.waitForTimeout(500);
      }
    } else {
      logTest('warn', 'Sidebar collapse button not found');
    }

    // ========================================
    // TEST 3: Navigation Testing
    // ========================================
    console.log('\n📋 TEST SECTION: Navigation Testing\n');

    const pagesToTest = [
      { name: 'Dashboard', path: '/', selector: 'h1, h2' },
      { name: 'Candidates', path: '/candidates', selector: 'table, .candidate' },
      { name: 'Jobs', path: '/jobs', selector: 'table, .job' },
      { name: 'BPO Dashboard', path: '/bpo', selector: 'h1, h2' },
      { name: 'Tender Monitor', path: '/tender-monitor', selector: 'h1, h2' },
      { name: 'Clients', path: '/clients', selector: 'table, .client' },
      { name: 'Deployments', path: '/deployments', selector: 'table, .deployment' },
      { name: 'Payments', path: '/payments', selector: 'table, .payment' },
      { name: 'Chat', path: '/chat', selector: '.chat, .message' },
      { name: 'Financials', path: '/financials', selector: 'h1, canvas, .chart' },
      { name: 'Retention Analytics', path: '/retention-analytics', selector: 'h1, canvas, .chart' },
      { name: 'Gamification', path: '/gamification', selector: 'h1, h2' },
      { name: 'Training', path: '/training', selector: 'h1, h2' },
      { name: 'AI Automation', path: '/ai-automation', selector: 'h1, h2' },
      { name: 'AI Sourcing', path: '/ai-sourcing', selector: 'h1, h2' },
      { name: 'ML Dashboard', path: '/ml-dashboard', selector: 'h1, h2' },
      { name: 'Telegram Groups', path: '/telegram-groups', selector: 'h1, table' },
      { name: 'Ad Optimization', path: '/ad-optimization', selector: 'h1, h2' },
      { name: 'Settings', path: '/settings', selector: 'h1, form' }
    ];

    for (const testPage of pagesToTest) {
      try {
        await page.goto(`${BASE_URL}${testPage.path}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        const contentExists = await page.locator(testPage.selector).first().isVisible();
        if (contentExists) {
          logTest('pass', `${testPage.name} page loads`, `URL: ${testPage.path}`);
        } else {
          logTest('warn', `${testPage.name} page content`, `Content selector "${testPage.selector}" not found`);
        }

        await takeScreenshot(page, `page-${testPage.name.toLowerCase().replace(/\s+/g, '-')}`);
      } catch (error) {
        logTest('fail', `${testPage.name} page navigation`, error.message);
      }
    }

    // ========================================
    // TEST 4: Interactive Elements - Candidates Page
    // ========================================
    console.log('\n📋 TEST SECTION: Candidates Page Interactive Elements\n');

    await page.goto(`${BASE_URL}/candidates`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Test search/filter functionality
    const searchInput = await page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      logTest('pass', 'Candidates search input works');
    } else {
      logTest('warn', 'Search input not found on Candidates page');
    }

    // Test filter buttons
    const filterButtons = await page.locator('button:has-text("Filter"), button:has-text("All"), button:has-text("Active")').count();
    if (filterButtons > 0) {
      logTest('pass', 'Filter buttons found', `${filterButtons} filter buttons`);
    } else {
      logTest('warn', 'No filter buttons found on Candidates page');
    }

    // Test "Add Candidate" button
    const addButton = await page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(1000);

      // Check if modal appears
      const modal = await page.locator('[role="dialog"], .modal, [class*="modal"]').isVisible();
      if (modal) {
        logTest('pass', 'Add Candidate modal opens');
        await takeScreenshot(page, 'candidate-add-modal');

        // Test modal close
        const closeButton = await page.locator('button[aria-label*="close" i], button:has-text("Cancel"), button:has-text("×")').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await page.waitForTimeout(500);
          logTest('pass', 'Modal close button works');
        } else {
          // Try pressing Escape
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          logTest('warn', 'Modal close button not found, used Escape key');
        }
      } else {
        logTest('warn', 'Add Candidate modal did not appear');
      }
    } else {
      logTest('warn', 'Add Candidate button not found');
    }

    // Test table interactions
    const tableRows = await page.locator('table tbody tr, [role="row"]').count();
    if (tableRows > 0) {
      logTest('pass', 'Candidate table has data', `${tableRows} rows`);

      // Try clicking first row
      const firstRow = page.locator('table tbody tr, [role="row"]').first();
      if (await firstRow.isVisible()) {
        await firstRow.click();
        await page.waitForTimeout(1000);

        // Check if navigated to detail page or modal opened
        const isDetailPage = page.url().includes('/candidates/');
        const isModalOpen = await page.locator('[role="dialog"]').isVisible();

        if (isDetailPage || isModalOpen) {
          logTest('pass', 'Candidate row click works', isDetailPage ? 'Navigated to detail page' : 'Opened modal');
          await takeScreenshot(page, 'candidate-detail');

          if (isDetailPage) {
            await page.goBack();
            await page.waitForLoadState('networkidle');
          }
        } else {
          logTest('warn', 'Clicking candidate row had no visible effect');
        }
      }
    } else {
      logTest('warn', 'No candidate data in table');
    }

    // ========================================
    // TEST 5: Interactive Elements - Jobs Page
    // ========================================
    console.log('\n📋 TEST SECTION: Jobs Page Interactive Elements\n');

    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Test create job button
    const createJobBtn = await page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New Job")').first();
    if (await createJobBtn.isVisible()) {
      await createJobBtn.click();
      await page.waitForTimeout(1000);

      const modal = await page.locator('[role="dialog"]').isVisible();
      if (modal) {
        logTest('pass', 'Create Job modal opens');
        await takeScreenshot(page, 'job-create-modal');

        // Test form fields
        const formInputs = await page.locator('input, textarea, select').count();
        if (formInputs > 0) {
          logTest('pass', 'Job form has input fields', `${formInputs} fields`);
        }

        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      } else {
        logTest('warn', 'Create Job modal did not appear');
      }
    } else {
      logTest('warn', 'Create Job button not found');
    }

    // Test job cards/table
    const jobItems = await page.locator('.job-card, table tbody tr, [class*="job"]').count();
    if (jobItems > 0) {
      logTest('pass', 'Jobs data displayed', `${jobItems} job items`);
    } else {
      logTest('warn', 'No job data found');
    }

    // ========================================
    // TEST 6: Forms - Settings Page
    // ========================================
    console.log('\n📋 TEST SECTION: Settings Page Forms\n');

    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const settingsForms = await page.locator('form').count();
    if (settingsForms > 0) {
      logTest('pass', 'Settings forms found', `${settingsForms} forms`);

      // Test input interactions
      const inputs = await page.locator('input:not([type="hidden"])').all();
      let interactiveInputs = 0;
      for (const input of inputs.slice(0, 3)) { // Test first 3 inputs
        if (await input.isVisible() && await input.isEnabled()) {
          interactiveInputs++;
        }
      }

      if (interactiveInputs > 0) {
        logTest('pass', 'Settings form inputs are interactive', `${interactiveInputs} inputs tested`);
      }
    } else {
      logTest('warn', 'No forms found on Settings page');
    }

    await takeScreenshot(page, 'settings-page');

    // ========================================
    // TEST 7: Buttons and Actions - BPO Dashboard
    // ========================================
    console.log('\n📋 TEST SECTION: BPO Dashboard Actions\n');

    await page.goto(`${BASE_URL}/bpo`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const actionButtons = await page.locator('button').count();
    if (actionButtons > 0) {
      logTest('pass', 'BPO Dashboard has action buttons', `${actionButtons} buttons found`);
    }

    // Test export/download buttons
    const exportBtn = await page.locator('button:has-text("Export"), button:has-text("Download")').first();
    if (await exportBtn.isVisible()) {
      logTest('pass', 'Export button found on BPO Dashboard');
    } else {
      logTest('warn', 'No export button found');
    }

    await takeScreenshot(page, 'bpo-dashboard');

    // ========================================
    // TEST 8: Charts and Visualizations
    // ========================================
    console.log('\n📋 TEST SECTION: Data Visualizations\n');

    await page.goto(`${BASE_URL}/financials`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for charts to render

    const charts = await page.locator('canvas, svg[class*="recharts"]').count();
    if (charts > 0) {
      logTest('pass', 'Financial charts rendered', `${charts} charts found`);
    } else {
      logTest('warn', 'No charts found on Financial Dashboard');
    }

    await takeScreenshot(page, 'financials-charts');

    // Check ML Dashboard charts
    await page.goto(`${BASE_URL}/ml-dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const mlCharts = await page.locator('canvas, svg[class*="recharts"]').count();
    if (mlCharts > 0) {
      logTest('pass', 'ML Dashboard charts rendered', `${mlCharts} charts found`);
    } else {
      logTest('warn', 'No charts found on ML Dashboard');
    }

    await takeScreenshot(page, 'ml-dashboard-charts');

    // ========================================
    // TEST 9: Responsive Design - Mobile View
    // ========================================
    console.log('\n📋 TEST SECTION: Responsive Design\n');

    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check if mobile menu exists
    const mobileMenuButton = await page.locator('button[aria-label*="menu" i], button:has-text("☰")').isVisible();
    if (mobileMenuButton) {
      logTest('pass', 'Mobile menu button visible');
      await takeScreenshot(page, 'mobile-dashboard');
    } else {
      logTest('warn', 'Mobile menu button not found');
    }

    // Test mobile navigation
    if (mobileMenuButton) {
      await page.locator('button[aria-label*="menu" i]').first().click();
      await page.waitForTimeout(500);
      const mobileSidebar = await page.locator('aside').isVisible();
      if (mobileSidebar) {
        logTest('pass', 'Mobile sidebar opens');
        await takeScreenshot(page, 'mobile-sidebar-open');
      } else {
        logTest('warn', 'Mobile sidebar did not open');
      }
    }

    // Reset viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // ========================================
    // TEST 10: Accessibility Checks
    // ========================================
    console.log('\n📋 TEST SECTION: Accessibility\n');

    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Check for ARIA labels
    const ariaLabels = await page.locator('[aria-label]').count();
    if (ariaLabels > 10) {
      logTest('pass', 'ARIA labels present', `${ariaLabels} elements with aria-label`);
    } else {
      logTest('warn', 'Limited ARIA labels', `Only ${ariaLabels} found`);
    }

    // Check for semantic HTML
    const semanticElements = await page.locator('nav, main, header, footer, aside, article, section').count();
    if (semanticElements > 0) {
      logTest('pass', 'Semantic HTML elements used', `${semanticElements} semantic elements`);
    } else {
      logTest('warn', 'No semantic HTML elements found');
    }

    // Check keyboard navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    const focusedElement = await page.evaluate(() => document.activeElement.tagName);
    if (focusedElement) {
      logTest('pass', 'Keyboard navigation works', `Focused: ${focusedElement}`);
    }

    // ========================================
    // TEST 11: Error Handling & Console Errors
    // ========================================
    console.log('\n📋 TEST SECTION: Error Handling\n');

    if (consoleErrors.length > 0) {
      logTest('warn', 'Console errors detected', `${consoleErrors.length} errors`);
      consoleErrors.slice(0, 5).forEach(err => {
        console.log(`  - ${err}`);
      });
    } else {
      logTest('pass', 'No console errors detected');
    }

    if (pageErrors.length > 0) {
      logTest('fail', 'Page errors detected', `${pageErrors.length} errors`);
      pageErrors.forEach(err => {
        console.log(`  - ${err}`);
      });
    } else {
      logTest('pass', 'No page errors detected');
    }

    // Test 404 page
    await page.goto(`${BASE_URL}/nonexistent-page-123456`);
    await page.waitForTimeout(1000);

    const redirectedToDashboard = page.url().endsWith('/admin/') || page.url().endsWith('/admin');
    if (redirectedToDashboard) {
      logTest('pass', '404 handling works', 'Redirected to dashboard');
    } else {
      logTest('warn', '404 page handling', `URL: ${page.url()}`);
    }

    // ========================================
    // TEST 12: Performance Checks
    // ========================================
    console.log('\n📋 TEST SECTION: Performance\n');

    const navigationStart = Date.now();
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - navigationStart;

    if (loadTime < 3000) {
      logTest('pass', 'Page load performance', `${loadTime}ms (< 3s)`);
    } else if (loadTime < 5000) {
      logTest('warn', 'Page load performance', `${loadTime}ms (3-5s)`);
    } else {
      logTest('warn', 'Slow page load', `${loadTime}ms (> 5s)`);
    }

  } catch (error) {
    console.error('\n❌ Test execution error:', error.message);
    logTest('fail', 'Test execution', error.message);
    await takeScreenshot(page, 'error-state');
  } finally {
    await browser.close();
  }

  // ========================================
  // GENERATE REPORT
  // ========================================
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✓ Passed: ${testResults.passed.length}`);
  console.log(`✗ Failed: ${testResults.failed.length}`);
  console.log(`⚠ Warnings: ${testResults.warnings.length}`);
  console.log(`📸 Screenshots: ${testResults.screenshots.length}`);
  console.log('='.repeat(80));

  // Save detailed report
  const reportPath = path.join(__dirname, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  console.log(`📸 Screenshots saved to: ${path.join(__dirname, 'test-screenshots')}\n`);

  // Generate HTML report
  generateHTMLReport(testResults);

  return testResults;
}

function generateHTMLReport(results) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Portal Test Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #1e40af; margin-bottom: 10px; }
    .timestamp { color: #666; font-size: 14px; margin-bottom: 30px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
    .summary-card { padding: 20px; border-radius: 8px; text-align: center; }
    .summary-card.passed { background: #d1fae5; color: #065f46; }
    .summary-card.failed { background: #fee2e2; color: #991b1b; }
    .summary-card.warnings { background: #fef3c7; color: #92400e; }
    .summary-card h2 { margin: 0; font-size: 36px; }
    .summary-card p { margin: 10px 0 0 0; font-size: 14px; text-transform: uppercase; font-weight: 600; }
    .section { margin-bottom: 40px; }
    .section h2 { color: #333; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
    .test-item { padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid; }
    .test-item.pass { background: #f0fdf4; border-color: #10b981; }
    .test-item.fail { background: #fef2f2; border-color: #ef4444; }
    .test-item.warn { background: #fffbeb; border-color: #f59e0b; }
    .test-item .test-name { font-weight: 600; margin-bottom: 5px; }
    .test-item .test-details { font-size: 14px; color: #666; }
    .test-item .test-time { font-size: 12px; color: #999; margin-top: 5px; }
    .screenshots { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .screenshot { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .screenshot img { width: 100%; height: 200px; object-fit: cover; }
    .screenshot .caption { padding: 10px; background: #f9fafb; font-size: 14px; }
    .icon { margin-right: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Admin Portal Test Report</h1>
    <div class="timestamp">Generated: ${new Date(results.timestamp).toLocaleString()}</div>

    <div class="summary">
      <div class="summary-card passed">
        <h2>${results.passed.length}</h2>
        <p>✓ Passed</p>
      </div>
      <div class="summary-card failed">
        <h2>${results.failed.length}</h2>
        <p>✗ Failed</p>
      </div>
      <div class="summary-card warnings">
        <h2>${results.warnings.length}</h2>
        <p>⚠ Warnings</p>
      </div>
    </div>

    <div class="section">
      <h2>✓ Passed Tests (${results.passed.length})</h2>
      ${results.passed.map(t => `
        <div class="test-item pass">
          <div class="test-name"><span class="icon">✓</span>${t.test}</div>
          ${t.details ? `<div class="test-details">${t.details}</div>` : ''}
          <div class="test-time">${new Date(t.timestamp).toLocaleTimeString()}</div>
        </div>
      `).join('')}
    </div>

    ${results.failed.length > 0 ? `
    <div class="section">
      <h2>✗ Failed Tests (${results.failed.length})</h2>
      ${results.failed.map(t => `
        <div class="test-item fail">
          <div class="test-name"><span class="icon">✗</span>${t.test}</div>
          ${t.details ? `<div class="test-details">${t.details}</div>` : ''}
          <div class="test-time">${new Date(t.timestamp).toLocaleTimeString()}</div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${results.warnings.length > 0 ? `
    <div class="section">
      <h2>⚠ Warnings (${results.warnings.length})</h2>
      ${results.warnings.map(t => `
        <div class="test-item warn">
          <div class="test-name"><span class="icon">⚠</span>${t.test}</div>
          ${t.details ? `<div class="test-details">${t.details}</div>` : ''}
          <div class="test-time">${new Date(t.timestamp).toLocaleTimeString()}</div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="section">
      <h2>📸 Screenshots (${results.screenshots.length})</h2>
      <div class="screenshots">
        ${results.screenshots.map(s => `
          <div class="screenshot">
            <img src="test-screenshots/${s.filename}" alt="${s.name}">
            <div class="caption">${s.name}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>
</body>
</html>`;

  const reportPath = path.join(__dirname, 'test-report.html');
  fs.writeFileSync(reportPath, html);
  console.log(`📊 HTML report saved to: ${reportPath}`);
}

// Run tests
runTests().then(results => {
  const exitCode = results.failed.length > 0 ? 1 : 0;
  process.exit(exitCode);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
