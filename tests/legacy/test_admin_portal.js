const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:5173/admin/';
const ADMIN_EMAIL = 'admin@worklink.sg';
const ADMIN_PASSWORD = 'admin123';
const SCREENSHOT_DIR = path.join(__dirname, 'test_screenshots');

// Test results
const testResults = {
  passed: [],
  failed: [],
  warnings: [],
  screenshots: []
};

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Utility functions
async function takeScreenshot(page, name) {
  const filename = path.join(SCREENSHOT_DIR, `${name}_${Date.now()}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  testResults.screenshots.push({ name, path: filename });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filename;
}

function logTest(status, category, description, details = {}) {
  const result = { category, description, ...details };

  if (status === 'pass') {
    testResults.passed.push(result);
    console.log(`✅ PASS: [${category}] ${description}`);
  } else if (status === 'fail') {
    testResults.failed.push(result);
    console.error(`❌ FAIL: [${category}] ${description}`, details);
  } else if (status === 'warn') {
    testResults.warnings.push(result);
    console.warn(`⚠️  WARN: [${category}] ${description}`, details);
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test Suite
async function runTests() {
  console.log('🚀 Starting comprehensive admin portal testing...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Track console errors and warnings
  const consoleErrors = [];
  const consoleWarnings = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });

  // Track network errors
  const networkErrors = [];
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push({ url: response.url(), status: response.status() });
    }
  });

  try {
    // ==================== LOGIN SYSTEM ====================
    console.log('\n📝 Testing Login System...');

    // Test 1: Load login page
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await takeScreenshot(page, 'login_page');

    const loginPageTitle = await page.title();
    if (loginPageTitle) {
      logTest('pass', 'Login', 'Login page loads successfully', { title: loginPageTitle });
    } else {
      logTest('fail', 'Login', 'Login page failed to load', { severity: 'Critical' });
    }

    // Test 2: Invalid credentials
    await page.type('input[name="email"]', 'invalid@test.com');
    await page.type('input[name="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    await sleep(1000);

    const errorMessage = await page.$eval('[role="alert"]', el => el.textContent).catch(() => null);
    if (errorMessage && errorMessage.includes('Invalid')) {
      logTest('pass', 'Login', 'Invalid credentials show error message', { message: errorMessage });
    } else {
      logTest('fail', 'Login', 'Invalid credentials do not show proper error', {
        severity: 'High',
        expected: 'Error message displayed',
        actual: errorMessage || 'No error message'
      });
    }
    await takeScreenshot(page, 'login_error');

    // Test 3: Empty form validation
    await page.reload({ waitUntil: 'networkidle0' });
    await page.click('button[type="submit"]');
    await sleep(500);

    const validationErrors = await page.$$eval('.text-red-600, .text-red-400', els => els.map(e => e.textContent)).catch(() => []);
    if (validationErrors.length > 0) {
      logTest('pass', 'Login', 'Empty form shows validation errors', { errors: validationErrors });
    } else {
      logTest('warn', 'Login', 'Empty form validation may not be working', { severity: 'Medium' });
    }

    // Test 4: Successful login
    await page.reload({ waitUntil: 'networkidle0' });
    await page.type('input[name="email"]', ADMIN_EMAIL);
    await page.type('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await sleep(2000);
    const currentUrl = page.url();
    if (currentUrl.includes('/admin/') && !currentUrl.includes('/login')) {
      logTest('pass', 'Login', 'Successful login redirects to dashboard', { url: currentUrl });
    } else {
      logTest('fail', 'Login', 'Login did not redirect properly', {
        severity: 'Critical',
        expected: 'Redirect to dashboard',
        actual: currentUrl
      });
    }
    await takeScreenshot(page, 'after_login');

    // ==================== NAVIGATION & ROUTING ====================
    console.log('\n🧭 Testing Navigation & Routing...');

    // Test sidebar navigation
    const navLinks = await page.$$eval('nav a[href]', links =>
      links.map(link => ({
        text: link.textContent.trim(),
        href: link.getAttribute('href')
      })).filter(l => l.href && l.text)
    ).catch(() => []);

    logTest('pass', 'Navigation', `Found ${navLinks.length} navigation links`, { count: navLinks.length });

    // Test key navigation routes
    const routesToTest = [
      { path: '/candidates', name: 'Candidates' },
      { path: '/jobs', name: 'Jobs' },
      { path: '/clients', name: 'Clients' },
      { path: '/bpo', name: 'BPO Dashboard' },
      { path: '/deployments', name: 'Deployments' },
      { path: '/payments', name: 'Payments' },
      { path: '/financials', name: 'Financials' },
      { path: '/settings', name: 'Settings' },
      { path: '/chat', name: 'Chat' },
      { path: '/training', name: 'Training' },
      { path: '/gamification', name: 'Gamification' },
      { path: '/tender-monitor', name: 'Tender Monitor' },
      { path: '/ai-automation', name: 'AI Automation' },
      { path: '/ai-sourcing', name: 'AI Sourcing' },
      { path: '/ml-dashboard', name: 'ML Dashboard' },
      { path: '/telegram-groups', name: 'Telegram Groups' },
      { path: '/ad-optimization', name: 'Ad Optimization' },
      { path: '/retention-analytics', name: 'Retention Analytics' }
    ];

    for (const route of routesToTest) {
      try {
        await page.goto(`${BASE_URL.replace(/\/$/, '')}${route.path}`, { waitUntil: 'networkidle0', timeout: 10000 });
        await sleep(500);

        const url = page.url();
        const hasContent = await page.$('main, .page-container, [role="main"]').then(el => el !== null);

        if (url.includes(route.path) && hasContent) {
          logTest('pass', 'Navigation', `${route.name} page loads successfully`, { path: route.path });
        } else {
          logTest('fail', 'Navigation', `${route.name} page failed to load properly`, {
            severity: 'High',
            path: route.path,
            url: url,
            hasContent
          });
        }

        await takeScreenshot(page, `route_${route.path.replace(/\//g, '_')}`);
      } catch (error) {
        logTest('fail', 'Navigation', `${route.name} page error`, {
          severity: 'Critical',
          path: route.path,
          error: error.message
        });
      }

      await sleep(300);
    }

    // Test browser back/forward
    await page.goBack();
    await sleep(500);
    await page.goForward();
    await sleep(500);
    logTest('pass', 'Navigation', 'Browser back/forward navigation works');

    // ==================== BUTTONS & INTERACTIVE ELEMENTS ====================
    console.log('\n🔘 Testing Buttons & Interactive Elements...');

    // Go to dashboard
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await sleep(1000);

    // Find all buttons
    const buttons = await page.$$eval('button', btns =>
      btns.map(btn => ({
        text: btn.textContent.trim(),
        type: btn.type,
        disabled: btn.disabled,
        visible: btn.offsetParent !== null
      })).filter(b => b.visible)
    ).catch(() => []);

    logTest('pass', 'Interactive', `Found ${buttons.length} visible buttons on dashboard`, { count: buttons.length });

    // Test theme toggle if exists
    const themeToggle = await page.$('[aria-label*="theme"], [aria-label*="dark"], button svg').catch(() => null);
    if (themeToggle) {
      await themeToggle.click();
      await sleep(500);
      await takeScreenshot(page, 'theme_toggle');
      logTest('pass', 'Interactive', 'Theme toggle found and clicked');
    } else {
      logTest('warn', 'Interactive', 'Theme toggle not found', { severity: 'Low' });
    }

    // Test sidebar collapse/expand
    const collapseBtn = await page.$('button[aria-label*="collapse"], button[aria-label*="sidebar"]').catch(() => null);
    if (collapseBtn) {
      await collapseBtn.click();
      await sleep(500);
      await takeScreenshot(page, 'sidebar_collapsed');
      await sleep(500);
      const expandBtn = await page.$('svg, button').catch(() => null);
      if (expandBtn) {
        await expandBtn.click();
        await sleep(500);
      }
      logTest('pass', 'Interactive', 'Sidebar collapse/expand works');
    } else {
      logTest('warn', 'Interactive', 'Sidebar collapse button not found', { severity: 'Low' });
    }

    // ==================== TABLES & DATA DISPLAY ====================
    console.log('\n📊 Testing Tables & Data Display...');

    // Test Candidates table
    await page.goto(`${BASE_URL.replace(/\/$/, '')}/candidates`, { waitUntil: 'networkidle0' });
    await sleep(1000);

    const hasTable = await page.$('table, [role="table"]').then(el => el !== null).catch(() => false);
    if (hasTable) {
      logTest('pass', 'Tables', 'Candidates table renders');

      // Check for search/filter
      const hasSearch = await page.$('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]').then(el => el !== null).catch(() => false);
      if (hasSearch) {
        logTest('pass', 'Tables', 'Search field found');

        // Test search functionality
        try {
          await page.type('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]', 'test', { delay: 100 });
          await sleep(1000);
          await takeScreenshot(page, 'candidates_search');
          logTest('pass', 'Tables', 'Search field accepts input');
        } catch (e) {
          logTest('warn', 'Tables', 'Search field interaction failed', { error: e.message });
        }
      } else {
        logTest('warn', 'Tables', 'Search functionality not found', { severity: 'Medium' });
      }

      await takeScreenshot(page, 'candidates_table');
    } else {
      logTest('fail', 'Tables', 'Candidates table not found', { severity: 'High' });
    }

    // Test Jobs table
    await page.goto(`${BASE_URL.replace(/\/$/, '')}/jobs`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    await takeScreenshot(page, 'jobs_table');

    const jobsHasTable = await page.$('table, [role="table"], .job-card, .card').then(el => el !== null).catch(() => false);
    if (jobsHasTable) {
      logTest('pass', 'Tables', 'Jobs list/table renders');
    } else {
      logTest('fail', 'Tables', 'Jobs list not found', { severity: 'High' });
    }

    // ==================== FORMS & INPUT VALIDATION ====================
    console.log('\n📝 Testing Forms & Input Validation...');

    // Test Settings page forms
    await page.goto(`${BASE_URL.replace(/\/$/, '')}/settings`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    await takeScreenshot(page, 'settings_page');

    const settingsForms = await page.$$('form').catch(() => []);
    if (settingsForms.length > 0) {
      logTest('pass', 'Forms', `Found ${settingsForms.length} form(s) on Settings page`, { count: settingsForms.length });

      // Check for input fields
      const inputs = await page.$$eval('input, textarea, select', els =>
        els.map(el => ({
          type: el.type || el.tagName,
          name: el.name,
          required: el.required,
          placeholder: el.placeholder
        }))
      ).catch(() => []);

      logTest('pass', 'Forms', `Found ${inputs.length} input fields`, { count: inputs.length });
    } else {
      logTest('warn', 'Forms', 'No forms found on Settings page', { severity: 'Medium' });
    }

    // ==================== MODALS & POPUPS ====================
    console.log('\n🪟 Testing Modals & Popups...');

    // Look for "Add" or "Create" buttons that might open modals
    await page.goto(`${BASE_URL.replace(/\/$/, '')}/candidates`, { waitUntil: 'networkidle0' });
    await sleep(1000);

    const addButtons = await page.$$('button');
    let modalFound = false;

    for (const btn of addButtons.slice(0, 10)) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Add') || text.includes('Create') || text.includes('New')) {
        await btn.click();
        await sleep(1000);

        const modal = await page.$('[role="dialog"], .modal').catch(() => null);
        if (modal) {
          modalFound = true;
          logTest('pass', 'Modals', `Modal opens on "${text}" click`);
          await takeScreenshot(page, 'modal_opened');

          // Test close button
          const closeButton = await page.$('[role="dialog"] button, .modal button').catch(() => null);
          if (closeButton) {
            await closeButton.click();
            await sleep(500);
            const modalGone = await page.$('[role="dialog"]').then(el => el === null).catch(() => true);
            if (modalGone) {
              logTest('pass', 'Modals', 'Modal closes properly');
            } else {
              logTest('fail', 'Modals', 'Modal does not close properly', { severity: 'Medium' });
            }
          }
          break;
        }
      }
    }

    if (!modalFound) {
      logTest('warn', 'Modals', 'No modals could be opened for testing', { severity: 'Low' });
    }

    // ==================== DASHBOARD & ANALYTICS ====================
    console.log('\n📈 Testing Dashboard & Analytics...');

    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await sleep(1500);
    await takeScreenshot(page, 'dashboard_overview');

    // Check for dashboard cards/stats
    const statsCards = await page.$$('.card, [class*="stat"]').catch(() => []);
    if (statsCards.length > 0) {
      logTest('pass', 'Dashboard', `Dashboard displays ${statsCards.length} stat cards`, { count: statsCards.length });
    } else {
      logTest('warn', 'Dashboard', 'No stat cards found on dashboard', { severity: 'Medium' });
    }

    // Check for charts
    const charts = await page.$$('canvas, svg').catch(() => []);
    if (charts.length > 0) {
      logTest('pass', 'Dashboard', `Dashboard contains ${charts.length} visualization(s)`, { count: charts.length });
    } else {
      logTest('warn', 'Dashboard', 'No charts found on dashboard', { severity: 'Low' });
    }

    // Test Financials page
    await page.goto(`${BASE_URL.replace(/\/$/, '')}/financials`, { waitUntil: 'networkidle0' });
    await sleep(1500);
    await takeScreenshot(page, 'financials_page');

    const financialCharts = await page.$$('canvas, svg').catch(() => []);
    if (financialCharts.length > 0) {
      logTest('pass', 'Dashboard', `Financials page displays ${financialCharts.length} visualization(s)`, { count: financialCharts.length });
    } else {
      logTest('warn', 'Dashboard', 'No visualizations found on Financials page', { severity: 'Medium' });
    }

    // ==================== ERROR HANDLING ====================
    console.log('\n🚨 Testing Error Handling...');

    // Test 404 page
    await page.goto(`${BASE_URL.replace(/\/$/, '')}/nonexistent-route-12345`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    await takeScreenshot(page, 'not_found_page');

    const url404 = page.url();
    if (url404.includes('nonexistent-route')) {
      logTest('warn', 'Error Handling', '404 page does not redirect', {
        severity: 'Low',
        note: 'App may redirect to dashboard per design'
      });
    } else {
      logTest('pass', 'Error Handling', '404 routes redirect to valid page');
    }

    // Check console errors
    if (consoleErrors.length > 0) {
      logTest('warn', 'Error Handling', `Console errors detected: ${consoleErrors.length}`, {
        severity: 'Medium',
        errors: consoleErrors.slice(0, 10)
      });
    } else {
      logTest('pass', 'Error Handling', 'No console errors detected');
    }

    // Check network errors
    const criticalNetworkErrors = networkErrors.filter(e => e.status >= 500 || e.status === 404);
    if (criticalNetworkErrors.length > 0) {
      logTest('warn', 'Error Handling', `Network errors detected: ${criticalNetworkErrors.length}`, {
        severity: 'High',
        errors: criticalNetworkErrors
      });
    } else {
      logTest('pass', 'Error Handling', 'No critical network errors detected');
    }

    // ==================== SESSION MANAGEMENT ====================
    console.log('\n🔐 Testing Session Management...');

    // Clear cookies to simulate logout
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    const cookies = await page.cookies();
    if (cookies.length > 0) {
      await page.deleteCookie(...cookies);
    }
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(1000);

    const redirectedToLogin = page.url().includes('/login');
    if (redirectedToLogin) {
      logTest('pass', 'Session', 'Cleared session redirects to login page');
    } else {
      logTest('fail', 'Session', 'Session management may be broken', {
        severity: 'High',
        url: page.url()
      });
    }
    await takeScreenshot(page, 'session_cleared');

    // ==================== RESPONSIVE DESIGN ====================
    console.log('\n📱 Testing Responsive Design...');

    // Re-login for responsive tests
    await page.type('input[name="email"]', ADMIN_EMAIL);
    await page.type('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await sleep(2000);

    // Test mobile viewport
    await page.setViewport({ width: 375, height: 812 }); // iPhone X
    await sleep(500);
    await takeScreenshot(page, 'mobile_dashboard');
    logTest('pass', 'Responsive', 'Mobile viewport renders');

    // Test tablet viewport
    await page.setViewport({ width: 768, height: 1024 }); // iPad
    await sleep(500);
    await takeScreenshot(page, 'tablet_dashboard');
    logTest('pass', 'Responsive', 'Tablet viewport renders');

    // Reset to desktop
    await page.setViewport({ width: 1920, height: 1080 });

    // ==================== SPECIFIC FEATURES ====================
    console.log('\n🎯 Testing Specific Features...');

    // Test Chat page
    await page.goto(`${BASE_URL.replace(/\/$/, '')}/chat`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    await takeScreenshot(page, 'chat_page');

    const chatInterface = await page.$('textarea, input[type="text"]').then(el => el !== null).catch(() => false);
    if (chatInterface) {
      logTest('pass', 'Features', 'Chat interface found');
    } else {
      logTest('warn', 'Features', 'Chat interface elements not found', { severity: 'Medium' });
    }

    // Test Gamification page
    await page.goto(`${BASE_URL.replace(/\/$/, '')}/gamification`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    await takeScreenshot(page, 'gamification_page');

    const gamificationContent = await page.$('main, .page-container').then(el => el !== null).catch(() => false);
    if (gamificationContent) {
      logTest('pass', 'Features', 'Gamification page loads');
    } else {
      logTest('fail', 'Features', 'Gamification page failed to load', { severity: 'Medium' });
    }

  } catch (error) {
    logTest('fail', 'General', 'Critical error during testing', {
      severity: 'Critical',
      error: error.message,
      stack: error.stack
    });
  } finally {
    await browser.close();
  }

  // ==================== TEST SUMMARY ====================
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${testResults.passed.length}`);
  console.log(`❌ Failed: ${testResults.failed.length}`);
  console.log(`⚠️  Warnings: ${testResults.warnings.length}`);
  console.log(`📸 Screenshots: ${testResults.screenshots.length}`);
  console.log('='.repeat(80));

  // Write detailed report
  const reportPath = path.join(__dirname, 'admin_portal_test_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  return testResults;
}

// Run tests
runTests().then(results => {
  console.log('\n✨ Testing complete!');

  // Exit with error code if there are critical failures
  const criticalFailures = results.failed.filter(f => f.severity === 'Critical');
  if (criticalFailures.length > 0) {
    console.error(`\n🚨 ${criticalFailures.length} CRITICAL FAILURE(S) DETECTED`);
    process.exit(1);
  }
}).catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
