/**
 * WorkLink PWA - Comprehensive Navigation & Routing Test
 *
 * This script tests:
 * 1. All 16 main routes load correctly
 * 2. Bottom navigation functionality (4 tabs)
 * 3. Sidebar navigation (3 sections with all items)
 * 4. Header navigation (chat and notifications)
 * 5. Route protection and authentication
 * 6. Navigation context and back button functionality
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const TEST_EMAIL = 'test@worklink.com';

// Test results storage
const results = {
  timestamp: new Date().toISOString(),
  baseUrl: BASE_URL,
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  },
  tests: []
};

// Helper to add test result
function addResult(category, test, status, details = '') {
  const result = { category, test, status, details };
  results.tests.push(result);
  results.summary.total++;

  if (status === 'PASS') {
    results.summary.passed++;
    console.log(`✅ [${category}] ${test}`);
  } else if (status === 'FAIL') {
    results.summary.failed++;
    console.error(`❌ [${category}] ${test}: ${details}`);
  } else if (status === 'WARN') {
    results.summary.warnings++;
    console.warn(`⚠️  [${category}] ${test}: ${details}`);
  }

  if (details) {
    console.log(`   ${details}`);
  }
}

// All routes to test
const ROUTES = {
  public: ['/login'],
  protected: [
    '/',
    '/jobs',
    '/wallet',
    '/profile',
    '/calendar',
    '/chat',
    '/notifications',
    '/quests',
    '/achievements',
    '/rewards',
    '/leaderboard',
    '/training',
    '/referrals',
    '/complete-profile'
  ]
};

// Bottom nav items
const BOTTOM_NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'Jobs', path: '/jobs' },
  { label: 'Wallet', path: '/wallet' },
  { label: 'Profile', path: '/profile' }
];

// Sidebar menu items (3 sections)
const SIDEBAR_SECTIONS = {
  main: [
    { label: 'Home', path: '/' },
    { label: 'Find Jobs', path: '/jobs' },
    { label: 'Wallet', path: '/wallet' },
    { label: 'Availability', path: '/calendar' }
  ],
  rewards: [
    { label: 'Quests', path: '/quests' },
    { label: 'Achievements', path: '/achievements' },
    { label: 'Rewards Shop', path: '/rewards' },
    { label: 'Leaderboard', path: '/leaderboard' },
    { label: 'Refer & Earn', path: '/referrals' }
  ],
  more: [
    { label: 'Training', path: '/training' },
    { label: 'Edit Profile', path: '/complete-profile' },
    { label: 'Notifications', path: '/notifications' },
    { label: 'Profile', path: '/profile' }
  ]
};

// Helper functions
async function login(page) {
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 10000 });
    await delay(1000);

    // Click "Or continue with email" button to expand email login section
    const emailToggleButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Or continue with email'));
    });

    if (emailToggleButton.asElement()) {
      await emailToggleButton.asElement().click();
      await delay(500);
    }

    // Wait for and fill email input
    await page.waitForSelector('input[type="email"]', { visible: true, timeout: 5000 });
    await page.type('input[type="email"]', TEST_EMAIL);
    await delay(300);

    // Find and click submit button
    const loginButton = await page.$('button[type="submit"]');
    if (!loginButton) {
      throw new Error('Login button not found');
    }

    await loginButton.click();
    await delay(2000); // Wait for login to process

    // Check if navigation happened or if we're still on login
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      // Check for error messages
      const errorMessage = await page.evaluate(() => {
        const errorDiv = document.querySelector('[class*="red-500"]');
        return errorDiv ? errorDiv.textContent : null;
      });
      if (errorMessage) {
        throw new Error(`Login error: ${errorMessage}`);
      }
    }

    // Verify we're logged in by checking for user data in localStorage
    const user = await page.evaluate(() => localStorage.getItem('worker_user'));
    if (!user) {
      throw new Error('User not found in localStorage after login');
    }

    return true;
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
}

async function isElementVisible(page, selector, timeout = 2000) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout });
    return true;
  } catch {
    return false;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForPageLoad(page, timeout = 5000) {
  try {
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout }),
      delay(timeout)
    ]);
    await delay(500); // Additional time for animations
    return true;
  } catch {
    return false;
  }
}

// Test 1: Route Loading Tests
async function testRoutes(page) {
  console.log('\n📍 Testing Route Loading...\n');

  // Test public route (login)
  for (const route of ROUTES.public) {
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle0', timeout: 10000 });
      const title = await page.title();
      addResult('Routes', `Public route ${route} loads`, 'PASS', `Title: ${title}`);
    } catch (error) {
      addResult('Routes', `Public route ${route} loads`, 'FAIL', error.message);
    }
  }

  // Login before testing protected routes
  try {
    await login(page);
    addResult('Authentication', 'Login successful', 'PASS');
  } catch (error) {
    addResult('Authentication', 'Login successful', 'FAIL', error.message);
    return; // Can't continue without auth
  }

  // Test protected routes
  for (const route of ROUTES.protected) {
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await delay(1000); // Wait for lazy loading

      // Check if we're still on the expected route (not redirected to login)
      const currentUrl = page.url();
      if (currentUrl.includes('/login') && route !== '/login') {
        addResult('Routes', `Protected route ${route} loads`, 'FAIL', 'Redirected to login');
        continue;
      }

      // Check for error messages
      const hasError = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return text.includes('error') || text.includes('not found') || text.includes('failed to load');
      });

      if (hasError) {
        const pageText = await page.evaluate(() => document.body.innerText);
        addResult('Routes', `Protected route ${route} loads`, 'WARN', `Possible error on page: ${pageText.substring(0, 100)}`);
      } else {
        addResult('Routes', `Protected route ${route} loads`, 'PASS');
      }
    } catch (error) {
      addResult('Routes', `Protected route ${route} loads`, 'FAIL', error.message);
    }
  }
}

// Test 2: Bottom Navigation
async function testBottomNavigation(page) {
  console.log('\n🔽 Testing Bottom Navigation...\n');

  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await delay(1000);

    // Check if bottom nav is visible
    const bottomNavVisible = await isElementVisible(page, 'nav[class*="bottom"]');
    if (!bottomNavVisible) {
      addResult('Bottom Nav', 'Bottom nav is visible on home page', 'FAIL', 'Bottom nav not found');
      return;
    }
    addResult('Bottom Nav', 'Bottom nav is visible on home page', 'PASS');

    // Test each bottom nav item
    for (const item of BOTTOM_NAV_ITEMS) {
      try {
        // Find and click the nav item
        const navLink = await page.evaluateHandle((label) => {
          const links = Array.from(document.querySelectorAll('nav a'));
          return links.find(link => link.textContent.includes(label));
        }, item.label);

        if (!navLink.asElement()) {
          addResult('Bottom Nav', `Navigate to ${item.label} (${item.path})`, 'FAIL', 'Nav link not found');
          continue;
        }

        await navLink.asElement().click();
        await delay(500);

        const currentUrl = page.url();
        const isCorrectPath = currentUrl.endsWith(item.path) || (item.path === '/' && currentUrl.endsWith('/'));

        if (isCorrectPath) {
          addResult('Bottom Nav', `Navigate to ${item.label} (${item.path})`, 'PASS');

          // Check for active state
          const hasActiveState = await page.evaluate((label) => {
            const links = Array.from(document.querySelectorAll('nav a'));
            const link = links.find(link => link.textContent.includes(label));
            if (!link) return false;

            // Check for active classes or styles
            const classes = link.className || '';
            const styles = window.getComputedStyle(link);
            return classes.includes('active') ||
                   link.getAttribute('aria-current') === 'page' ||
                   styles.color !== 'rgb(255, 255, 255)'; // Not default white
          }, item.label);

          if (hasActiveState) {
            addResult('Bottom Nav', `${item.label} has active state indicator`, 'PASS');
          } else {
            addResult('Bottom Nav', `${item.label} has active state indicator`, 'WARN', 'Active state not detected');
          }
        } else {
          addResult('Bottom Nav', `Navigate to ${item.label} (${item.path})`, 'FAIL', `Expected ${item.path}, got ${currentUrl}`);
        }
      } catch (error) {
        addResult('Bottom Nav', `Navigate to ${item.label} (${item.path})`, 'FAIL', error.message);
      }
    }

    // Test that bottom nav is hidden on login page
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await delay(500);
    const bottomNavHiddenOnLogin = !(await isElementVisible(page, 'nav[class*="bottom"]', 1000));
    if (bottomNavHiddenOnLogin) {
      addResult('Bottom Nav', 'Bottom nav hidden on login page', 'PASS');
    } else {
      addResult('Bottom Nav', 'Bottom nav hidden on login page', 'FAIL', 'Bottom nav still visible on login page');
    }

    // Test that bottom nav is hidden on chat page
    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await delay(500);
    const bottomNavHiddenOnChat = !(await isElementVisible(page, 'nav[class*="bottom"]', 1000));
    if (bottomNavHiddenOnChat) {
      addResult('Bottom Nav', 'Bottom nav hidden on chat page', 'PASS');
    } else {
      addResult('Bottom Nav', 'Bottom nav hidden on chat page', 'FAIL', 'Bottom nav still visible on chat page');
    }

  } catch (error) {
    addResult('Bottom Nav', 'Bottom navigation tests', 'FAIL', error.message);
  }
}

// Test 3: Sidebar Navigation
async function testSidebarNavigation(page) {
  console.log('\n📱 Testing Sidebar Navigation...\n');

  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await delay(1000);

    // Find and click menu button
    const menuButton = await page.$('button[class*="MenuIcon"], button svg[class*="MenuIcon"]');
    if (!menuButton) {
      // Try alternative selector
      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) {
        await headerButtons[0].click();
      } else {
        addResult('Sidebar', 'Open sidebar via menu button', 'FAIL', 'Menu button not found');
        return;
      }
    } else {
      await menuButton.click();
    }

    await delay(500);

    // Check if sidebar is visible
    const sidebarVisible = await page.evaluate(() => {
      const sidebar = document.querySelector('[class*="sidebar"], div[class*="fixed"][class*="left-0"]');
      if (!sidebar) return false;
      const styles = window.getComputedStyle(sidebar);
      return styles.transform !== 'matrix(1, 0, 0, 1, -288, 0)' && // Not translated out
             styles.display !== 'none' &&
             styles.visibility !== 'hidden';
    });

    if (sidebarVisible) {
      addResult('Sidebar', 'Open sidebar via menu button', 'PASS');
    } else {
      addResult('Sidebar', 'Open sidebar via menu button', 'FAIL', 'Sidebar not visible after clicking menu');
      return;
    }

    // Test all sidebar sections
    const allSidebarItems = [
      ...SIDEBAR_SECTIONS.main,
      ...SIDEBAR_SECTIONS.rewards,
      ...SIDEBAR_SECTIONS.more
    ];

    for (const item of allSidebarItems) {
      try {
        // Re-open sidebar for each test
        const menuBtn = await page.$('button[class*="MenuIcon"], button svg[class*="MenuIcon"]');
        if (menuBtn) {
          const sidebarOpen = await page.evaluate(() => {
            const sidebar = document.querySelector('[class*="sidebar"], div[class*="fixed"][class*="left-0"]');
            if (!sidebar) return false;
            const styles = window.getComputedStyle(sidebar);
            return styles.transform !== 'matrix(1, 0, 0, 1, -288, 0)';
          });

          if (!sidebarOpen) {
            await menuBtn.click();
            await delay(500);
          }
        }

        // Find and click sidebar item
        const sidebarLink = await page.evaluateHandle((label) => {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          return buttons.find(btn => btn.textContent.includes(label) &&
                             btn.closest('[class*="sidebar"], div[class*="fixed"][class*="left-0"]'));
        }, item.label);

        if (!sidebarLink.asElement()) {
          addResult('Sidebar', `Navigate to ${item.label} (${item.path})`, 'FAIL', 'Sidebar item not found');
          continue;
        }

        await sidebarLink.asElement().click();
        await delay(1000);

        const currentUrl = page.url();
        const isCorrectPath = currentUrl.endsWith(item.path) || (item.path === '/' && currentUrl.endsWith('/'));

        if (isCorrectPath) {
          addResult('Sidebar', `Navigate to ${item.label} (${item.path})`, 'PASS');

          // Verify sidebar closes after navigation
          await delay(500);
          const sidebarClosed = await page.evaluate(() => {
            const sidebar = document.querySelector('[class*="sidebar"], div[class*="fixed"][class*="left-0"]');
            if (!sidebar) return true;
            const styles = window.getComputedStyle(sidebar);
            return styles.transform === 'matrix(1, 0, 0, 1, -288, 0)' || // Translated out
                   styles.display === 'none';
          });

          if (sidebarClosed) {
            addResult('Sidebar', `Sidebar closes after navigating to ${item.label}`, 'PASS');
          } else {
            addResult('Sidebar', `Sidebar closes after navigating to ${item.label}`, 'WARN', 'Sidebar still open');
          }
        } else {
          addResult('Sidebar', `Navigate to ${item.label} (${item.path})`, 'FAIL', `Expected ${item.path}, got ${currentUrl}`);
        }
      } catch (error) {
        addResult('Sidebar', `Navigate to ${item.label} (${item.path})`, 'FAIL', error.message);
      }
    }

    // Test backdrop closes sidebar
    try {
      const menuBtn = await page.$('button[class*="MenuIcon"], button svg[class*="MenuIcon"]');
      if (menuBtn) {
        await menuBtn.click();
        await delay(500);

        // Click backdrop
        const backdrop = await page.$('[class*="backdrop"], div[class*="fixed"][class*="inset-0"][class*="bg-black"]');
        if (backdrop) {
          await backdrop.click();
          await delay(500);

          const sidebarClosed = await page.evaluate(() => {
            const sidebar = document.querySelector('[class*="sidebar"], div[class*="fixed"][class*="left-0"]');
            if (!sidebar) return true;
            const styles = window.getComputedStyle(sidebar);
            return styles.transform === 'matrix(1, 0, 0, 1, -288, 0)';
          });

          if (sidebarClosed) {
            addResult('Sidebar', 'Backdrop closes sidebar', 'PASS');
          } else {
            addResult('Sidebar', 'Backdrop closes sidebar', 'FAIL', 'Sidebar still open after clicking backdrop');
          }
        } else {
          addResult('Sidebar', 'Backdrop closes sidebar', 'WARN', 'Backdrop not found');
        }
      }
    } catch (error) {
      addResult('Sidebar', 'Backdrop closes sidebar', 'FAIL', error.message);
    }

  } catch (error) {
    addResult('Sidebar', 'Sidebar navigation tests', 'FAIL', error.message);
  }
}

// Test 4: Header Navigation
async function testHeaderNavigation(page) {
  console.log('\n🔝 Testing Header Navigation...\n');

  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await delay(1000);

    // Check header is visible
    const headerVisible = await isElementVisible(page, 'header');
    if (headerVisible) {
      addResult('Header', 'Header visible on home page', 'PASS');
    } else {
      addResult('Header', 'Header visible on home page', 'FAIL', 'Header not found');
      return;
    }

    // Test chat button
    try {
      const chatButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('header button'));
        return buttons.find(btn => {
          const svg = btn.querySelector('svg');
          return svg && (svg.classList.contains('MessageCircleIcon') ||
                        btn.getAttribute('aria-label')?.toLowerCase().includes('chat'));
        });
      });

      if (chatButton.asElement()) {
        await chatButton.asElement().click();
        await delay(1000);

        const currentUrl = page.url();
        if (currentUrl.includes('/chat')) {
          addResult('Header', 'Chat button navigates to /chat', 'PASS');
        } else {
          addResult('Header', 'Chat button navigates to /chat', 'FAIL', `Current URL: ${currentUrl}`);
        }
      } else {
        addResult('Header', 'Chat button navigates to /chat', 'FAIL', 'Chat button not found');
      }
    } catch (error) {
      addResult('Header', 'Chat button navigates to /chat', 'FAIL', error.message);
    }

    // Test notifications button
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await delay(1000);

      const notifButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('header button'));
        return buttons.find(btn => {
          const svg = btn.querySelector('svg');
          return svg && (svg.classList.contains('BellIcon') ||
                        btn.getAttribute('aria-label')?.toLowerCase().includes('notification'));
        });
      });

      if (notifButton.asElement()) {
        await notifButton.asElement().click();
        await delay(1000);

        const currentUrl = page.url();
        if (currentUrl.includes('/notifications')) {
          addResult('Header', 'Notifications button navigates to /notifications', 'PASS');
        } else {
          addResult('Header', 'Notifications button navigates to /notifications', 'FAIL', `Current URL: ${currentUrl}`);
        }
      } else {
        addResult('Header', 'Notifications button navigates to /notifications', 'FAIL', 'Notifications button not found');
      }
    } catch (error) {
      addResult('Header', 'Notifications button navigates to /notifications', 'FAIL', error.message);
    }

    // Test header is hidden on login page
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await delay(500);
    const headerHiddenOnLogin = !(await isElementVisible(page, 'header', 1000));
    if (headerHiddenOnLogin) {
      addResult('Header', 'Header hidden on login page', 'PASS');
    } else {
      addResult('Header', 'Header hidden on login page', 'FAIL', 'Header still visible on login page');
    }

    // Test header is hidden on chat page
    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await delay(500);
    const headerHiddenOnChat = !(await isElementVisible(page, 'header', 1000));
    if (headerHiddenOnChat) {
      addResult('Header', 'Header hidden on chat page', 'PASS');
    } else {
      addResult('Header', 'Header hidden on chat page', 'FAIL', 'Header still visible on chat page');
    }

  } catch (error) {
    addResult('Header', 'Header navigation tests', 'FAIL', error.message);
  }
}

// Test 5: Route Protection
async function testRouteProtection(page) {
  console.log('\n🔒 Testing Route Protection...\n');

  try {
    // Clear authentication
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.evaluate(() => {
      localStorage.removeItem('worker_user');
      localStorage.removeItem('token');
    });

    // Try accessing protected routes
    for (const route of ROUTES.protected.slice(0, 5)) { // Test a few routes
      try {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await delay(1000);

        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
          addResult('Route Protection', `Protected route ${route} redirects to login`, 'PASS');
        } else {
          addResult('Route Protection', `Protected route ${route} redirects to login`, 'FAIL', `Not redirected, current URL: ${currentUrl}`);
        }
      } catch (error) {
        addResult('Route Protection', `Protected route ${route} redirects to login`, 'FAIL', error.message);
      }
    }

    // Test catch-all route
    try {
      await page.goto(`${BASE_URL}/nonexistent-route`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await delay(1000);

      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl === `${BASE_URL}/`) {
        addResult('Route Protection', 'Catch-all route redirects to home/login', 'PASS');
      } else {
        addResult('Route Protection', 'Catch-all route redirects to home/login', 'WARN', `Current URL: ${currentUrl}`);
      }
    } catch (error) {
      addResult('Route Protection', 'Catch-all route redirects to home/login', 'FAIL', error.message);
    }

    // Re-login for next tests
    await login(page);

  } catch (error) {
    addResult('Route Protection', 'Route protection tests', 'FAIL', error.message);
  }
}

// Test 6: Back Button Navigation
async function testBackButtonNavigation(page) {
  console.log('\n⬅️  Testing Back Button Navigation...\n');

  try {
    // Navigate to jobs list
    await page.goto(`${BASE_URL}/jobs`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await delay(1000);

    // Find a job and get its ID (or use a test job)
    const jobLinks = await page.$$('a[href*="/jobs/"]');
    if (jobLinks.length > 0) {
      await jobLinks[0].click();
      await delay(1000);

      const jobDetailUrl = page.url();
      if (jobDetailUrl.includes('/jobs/')) {
        addResult('Back Button', 'Navigate to job detail page', 'PASS');

        // Look for back button
        const backButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn =>
            btn.textContent.toLowerCase().includes('back') ||
            btn.querySelector('svg[class*="ArrowLeft"]')
          );
        });

        if (backButton.asElement()) {
          await backButton.asElement().click();
          await delay(1000);

          const currentUrl = page.url();
          if (currentUrl.includes('/jobs') && !currentUrl.match(/\/jobs\/\d+/)) {
            addResult('Back Button', 'Back button returns to jobs list', 'PASS');
          } else {
            addResult('Back Button', 'Back button returns to jobs list', 'FAIL', `Current URL: ${currentUrl}`);
          }
        } else {
          addResult('Back Button', 'Back button exists on job detail page', 'FAIL', 'Back button not found');
        }
      } else {
        addResult('Back Button', 'Navigate to job detail page', 'FAIL', 'Could not navigate to job detail');
      }
    } else {
      addResult('Back Button', 'Navigate to job detail page', 'WARN', 'No job links found to test');
    }

  } catch (error) {
    addResult('Back Button', 'Back button navigation tests', 'FAIL', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting WorkLink Navigation & Routing Tests\n');
  console.log(`📍 Base URL: ${BASE_URL}\n`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 667 }); // Mobile viewport

    // Set a longer default timeout
    page.setDefaultTimeout(10000);

    // Run all test suites
    await testRoutes(page);
    await testBottomNavigation(page);
    await testSidebarNavigation(page);
    await testHeaderNavigation(page);
    await testRouteProtection(page);
    await testBackButtonNavigation(page);

  } catch (error) {
    console.error('\n❌ Fatal error running tests:', error);
    results.fatalError = error.message;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.summary.total}`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`⚠️  Warnings: ${results.summary.warnings}`);

  const passRate = results.summary.total > 0
    ? ((results.summary.passed / results.summary.total) * 100).toFixed(1)
    : 0;
  console.log(`\n📈 Pass Rate: ${passRate}%`);

  // Save detailed results
  const reportPath = '/home/augustine/Augustine_Projects/worklink_v2/NAVIGATION_ROUTING_TEST_REPORT.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Detailed report saved to: ${reportPath}`);

  // Generate markdown report
  generateMarkdownReport();

  // Exit with appropriate code
  process.exit(results.summary.failed > 0 ? 1 : 0);
}

function generateMarkdownReport() {
  const report = [];

  report.push('# WorkLink PWA - Navigation & Routing Test Report');
  report.push('');
  report.push(`**Test Date:** ${new Date(results.timestamp).toLocaleString()}`);
  report.push(`**Base URL:** ${results.baseUrl}`);
  report.push('');

  report.push('## Summary');
  report.push('');
  report.push(`- **Total Tests:** ${results.summary.total}`);
  report.push(`- **Passed:** ${results.summary.passed} ✅`);
  report.push(`- **Failed:** ${results.summary.failed} ❌`);
  report.push(`- **Warnings:** ${results.summary.warnings} ⚠️`);
  report.push(`- **Pass Rate:** ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
  report.push('');

  // Group results by category
  const categories = {};
  results.tests.forEach(test => {
    if (!categories[test.category]) {
      categories[test.category] = [];
    }
    categories[test.category].push(test);
  });

  report.push('## Test Results by Category');
  report.push('');

  Object.keys(categories).forEach(category => {
    const tests = categories[category];
    const passed = tests.filter(t => t.status === 'PASS').length;
    const failed = tests.filter(t => t.status === 'FAIL').length;
    const warnings = tests.filter(t => t.status === 'WARN').length;

    report.push(`### ${category}`);
    report.push('');
    report.push(`**Results:** ${passed} passed, ${failed} failed, ${warnings} warnings`);
    report.push('');
    report.push('| Test | Status | Details |');
    report.push('|------|--------|---------|');

    tests.forEach(test => {
      const status = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️';
      const details = test.details.replace(/\|/g, '\\|').substring(0, 100);
      report.push(`| ${test.test} | ${status} ${test.status} | ${details} |`);
    });

    report.push('');
  });

  report.push('## Key Findings');
  report.push('');

  const failedTests = results.tests.filter(t => t.status === 'FAIL');
  if (failedTests.length > 0) {
    report.push('### Failed Tests');
    report.push('');
    failedTests.forEach(test => {
      report.push(`- **[${test.category}]** ${test.test}`);
      if (test.details) {
        report.push(`  - ${test.details}`);
      }
    });
    report.push('');
  }

  const warnings = results.tests.filter(t => t.status === 'WARN');
  if (warnings.length > 0) {
    report.push('### Warnings');
    report.push('');
    warnings.forEach(test => {
      report.push(`- **[${test.category}]** ${test.test}`);
      if (test.details) {
        report.push(`  - ${test.details}`);
      }
    });
    report.push('');
  }

  report.push('## Conclusion');
  report.push('');
  if (results.summary.failed === 0) {
    report.push('✅ All navigation and routing tests passed successfully. The PWA navigation system is working as expected.');
  } else {
    report.push(`❌ ${results.summary.failed} test(s) failed. Please review the failed tests above and address the issues.`);
  }

  const mdPath = '/home/augustine/Augustine_Projects/worklink_v2/NAVIGATION_ROUTING_TEST_REPORT.md';
  fs.writeFileSync(mdPath, report.join('\n'));
  console.log(`📄 Markdown report saved to: ${mdPath}`);
}

// Run tests
runTests();
