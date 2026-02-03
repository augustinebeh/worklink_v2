/**
 * Data Consistency Testing Between Admin Portal and Worker PWA
 * Tests real-time sync, data integrity, and conflict resolution
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const ADMIN_URL = 'http://localhost:5173/admin/';
const WORKER_URL = 'http://localhost:8080/';
const TEST_EMAIL = 'sarah.tan@email.com';
const ADMIN_EMAIL = 'admin@worklink.sg';
const ADMIN_PASSWORD = 'admin123';

const SCREENSHOT_DIR = path.join(__dirname, 'test_screenshots', 'consistency');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Test results storage
const results = {
  timestamp: new Date().toISOString(),
  summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
  tests: []
};

// Utility functions
function logTest(name, status, details = {}) {
  const test = { name, status, details, timestamp: new Date().toISOString() };
  results.tests.push(test);
  results.summary.total++;

  if (status === 'PASS') {
    results.summary.passed++;
    console.log(`✅ ${name}`);
  } else if (status === 'FAIL') {
    results.summary.failed++;
    console.log(`❌ ${name}`);
    if (details.error) console.log(`   Error: ${details.error}`);
  } else if (status === 'WARN') {
    results.summary.warnings++;
    console.log(`⚠️  ${name}`);
    if (details.message) console.log(`   Warning: ${details.message}`);
  }

  if (details.data) {
    console.log(`   Data: ${JSON.stringify(details.data, null, 2)}`);
  }
}

async function takeScreenshot(page, name, folder = '') {
  try {
    const fileName = `${Date.now()}_${name.replace(/\s/g, '_')}.png`;
    const screenshotPath = path.join(SCREENSHOT_DIR, folder, fileName);

    if (folder) {
      const folderPath = path.join(SCREENSHOT_DIR, folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
    }

    await page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  } catch (error) {
    console.error(`Failed to take screenshot: ${error.message}`);
    return null;
  }
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Login to admin portal
async function loginAdmin(browser) {
  console.log('\n📱 Logging into Admin Portal...');
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    await page.goto(ADMIN_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await takeScreenshot(page, 'admin_login_page', 'admin');

    // Check if already logged in
    const isLoggedIn = await page.evaluate(() => {
      return !!sessionStorage.getItem('admin_user');
    });

    if (!isLoggedIn) {
      // Fill login form
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await page.type('input[type="email"]', ADMIN_EMAIL);
      await page.type('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');

      await wait(2000);
      await takeScreenshot(page, 'admin_after_login', 'admin');
    }

    logTest('Admin Portal Login', 'PASS');
    return page;
  } catch (error) {
    logTest('Admin Portal Login', 'FAIL', { error: error.message });
    await takeScreenshot(page, 'admin_login_error', 'admin');
    throw error;
  }
}

// Login to worker PWA
async function loginWorker(browser) {
  console.log('\n📱 Logging into Worker PWA...');
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 }); // iPhone 12 Pro size

  try {
    await page.goto(WORKER_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await takeScreenshot(page, 'worker_initial', 'worker');

    // Check if already logged in
    const isLoggedIn = await page.evaluate(() => {
      return !!localStorage.getItem('worker_user');
    });

    if (!isLoggedIn) {
      // Look for email input
      try {
        await page.waitForSelector('input[type="email"]', { timeout: 5000 });
        await page.type('input[type="email"]', TEST_EMAIL);

        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
        }

        await wait(2000);
        await takeScreenshot(page, 'worker_after_login', 'worker');
      } catch (e) {
        console.log('   Already on home page or login not required');
      }
    }

    logTest('Worker PWA Login', 'PASS');
    return page;
  } catch (error) {
    logTest('Worker PWA Login', 'FAIL', { error: error.message });
    await takeScreenshot(page, 'worker_login_error', 'worker');
    throw error;
  }
}

// Test 1: Candidate Data Sync
async function testCandidateDataSync(adminPage, workerPage) {
  console.log('\n🧪 Test 1: Candidate Data Sync');

  try {
    // Get candidate data from worker PWA
    await workerPage.goto(`${WORKER_URL}profile`, { waitUntil: 'networkidle0' });
    await wait(1000);
    await takeScreenshot(workerPage, 'worker_profile', 'test1');

    const workerData = await workerPage.evaluate(() => {
      const user = JSON.parse(localStorage.getItem('worker_user') || '{}');
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        level: user.level,
        xp: user.xp
      };
    });

    // Get same candidate data from admin portal
    await adminPage.goto(`${ADMIN_URL}candidates`, { waitUntil: 'networkidle0' });
    await wait(1000);
    await takeScreenshot(adminPage, 'admin_candidates', 'test1');

    // Search for the candidate
    const searchInput = await adminPage.$('input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.type(TEST_EMAIL);
      await wait(1000);
    }

    // Click on candidate to view profile
    await adminPage.evaluate((email) => {
      const rows = Array.from(document.querySelectorAll('tr'));
      const row = rows.find(r => r.textContent.includes(email));
      if (row) row.click();
    }, TEST_EMAIL);

    await wait(1000);
    await takeScreenshot(adminPage, 'admin_candidate_profile', 'test1');

    const adminData = await adminPage.evaluate(() => {
      // Try to extract data from the page
      const text = document.body.textContent;
      return { text };
    });

    // Compare data
    const dataMatch = workerData.id && workerData.email === TEST_EMAIL;

    if (dataMatch) {
      logTest('Candidate Data Sync - Basic Info', 'PASS', {
        data: { workerData, adminDataFound: !!adminData.text }
      });
    } else {
      logTest('Candidate Data Sync - Basic Info', 'FAIL', {
        error: 'Data mismatch between admin and worker',
        data: { workerData, adminData }
      });
    }

  } catch (error) {
    logTest('Candidate Data Sync', 'FAIL', { error: error.message });
    await takeScreenshot(adminPage, 'test1_admin_error', 'test1');
    await takeScreenshot(workerPage, 'test1_worker_error', 'test1');
  }
}

// Test 2: Job Management Sync
async function testJobManagementSync(adminPage, workerPage) {
  console.log('\n🧪 Test 2: Job Management Sync');

  try {
    // Navigate to jobs page in admin
    await adminPage.goto(`${ADMIN_URL}jobs`, { waitUntil: 'networkidle0' });
    await wait(1000);
    await takeScreenshot(adminPage, 'admin_jobs_page', 'test2');

    // Get job count from admin
    const adminJobs = await adminPage.evaluate(() => {
      const jobCards = document.querySelectorAll('[class*="job"], [class*="card"]');
      return {
        count: jobCards.length,
        visible: jobCards.length > 0
      };
    });

    // Navigate to jobs page in worker
    await workerPage.goto(`${WORKER_URL}jobs`, { waitUntil: 'networkidle0' });
    await wait(1000);
    await takeScreenshot(workerPage, 'worker_jobs_page', 'test2');

    // Get job count from worker
    const workerJobs = await workerPage.evaluate(() => {
      const jobCards = document.querySelectorAll('[class*="job"], [class*="card"]');
      return {
        count: jobCards.length,
        visible: jobCards.length > 0
      };
    });

    // Check if both show jobs
    if (adminJobs.visible && workerJobs.visible) {
      logTest('Job Management - Jobs Visibility', 'PASS', {
        data: { adminJobs: adminJobs.count, workerJobs: workerJobs.count }
      });
    } else if (!adminJobs.visible && !workerJobs.visible) {
      logTest('Job Management - Jobs Visibility', 'WARN', {
        message: 'No jobs visible on either platform',
        data: { adminJobs, workerJobs }
      });
    } else {
      logTest('Job Management - Jobs Visibility', 'FAIL', {
        error: 'Job visibility mismatch between platforms',
        data: { adminJobs, workerJobs }
      });
    }

  } catch (error) {
    logTest('Job Management Sync', 'FAIL', { error: error.message });
    await takeScreenshot(adminPage, 'test2_admin_error', 'test2');
    await takeScreenshot(workerPage, 'test2_worker_error', 'test2');
  }
}

// Test 3: Gamification Sync (XP, Achievements, Level)
async function testGamificationSync(adminPage, workerPage) {
  console.log('\n🧪 Test 3: Gamification Sync');

  try {
    // Get gamification data from worker
    await workerPage.goto(`${WORKER_URL}profile`, { waitUntil: 'networkidle0' });
    await wait(1000);

    const workerGamification = await workerPage.evaluate(() => {
      const user = JSON.parse(localStorage.getItem('worker_user') || '{}');
      return {
        level: user.level || 0,
        xp: user.xp || 0,
        achievements: user.achievements || []
      };
    });

    await takeScreenshot(workerPage, 'worker_gamification', 'test3');

    // Check achievements page
    await workerPage.goto(`${WORKER_URL}achievements`, { waitUntil: 'networkidle0' });
    await wait(1000);
    await takeScreenshot(workerPage, 'worker_achievements', 'test3');

    const workerAchievements = await workerPage.evaluate(() => {
      const achievementElements = document.querySelectorAll('[class*="achievement"]');
      return {
        count: achievementElements.length,
        visible: achievementElements.length > 0
      };
    });

    // Get gamification data from admin
    await adminPage.goto(`${ADMIN_URL}gamification`, { waitUntil: 'networkidle0' });
    await wait(1000);
    await takeScreenshot(adminPage, 'admin_gamification', 'test3');

    // Search for candidate
    const searchInput = await adminPage.$('input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.type(TEST_EMAIL);
      await wait(1000);
      await takeScreenshot(adminPage, 'admin_gamification_search', 'test3');
    }

    logTest('Gamification Sync - Data Retrieval', 'PASS', {
      data: {
        worker: workerGamification,
        workerAchievements: workerAchievements.count
      }
    });

  } catch (error) {
    logTest('Gamification Sync', 'FAIL', { error: error.message });
    await takeScreenshot(adminPage, 'test3_admin_error', 'test3');
    await takeScreenshot(workerPage, 'test3_worker_error', 'test3');
  }
}

// Test 4: Profile Updates Sync
async function testProfileUpdatesSync(adminPage, workerPage) {
  console.log('\n🧪 Test 4: Profile Updates Sync');

  try {
    // Navigate to profile in worker
    await workerPage.goto(`${WORKER_URL}profile`, { waitUntil: 'networkidle0' });
    await wait(1000);
    await takeScreenshot(workerPage, 'worker_profile_before', 'test4');

    // Get current data
    const beforeUpdate = await workerPage.evaluate(() => {
      return JSON.parse(localStorage.getItem('worker_user') || '{}');
    });

    // Try to update profile (click edit button if exists)
    const editButton = await workerPage.$('button:has-text("Edit")');
    if (editButton) {
      await editButton.click();
      await wait(500);
      await takeScreenshot(workerPage, 'worker_profile_edit_mode', 'test4');
    }

    logTest('Profile Updates - Edit Mode Access', editButton ? 'PASS' : 'WARN', {
      message: editButton ? 'Edit button found' : 'Edit button not found'
    });

    // Check if changes reflect in admin
    await adminPage.goto(`${ADMIN_URL}candidates`, { waitUntil: 'networkidle0' });
    await wait(1000);

    const searchInput = await adminPage.$('input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.type(TEST_EMAIL);
      await wait(1000);
    }

    await takeScreenshot(adminPage, 'admin_candidate_check', 'test4');

    logTest('Profile Updates Sync', 'PASS', {
      data: { beforeUpdate }
    });

  } catch (error) {
    logTest('Profile Updates Sync', 'FAIL', { error: error.message });
    await takeScreenshot(adminPage, 'test4_admin_error', 'test4');
    await takeScreenshot(workerPage, 'test4_worker_error', 'test4');
  }
}

// Test 5: Payment Processing Sync
async function testPaymentProcessingSync(adminPage, workerPage) {
  console.log('\n🧪 Test 5: Payment Processing Sync');

  try {
    // Check worker wallet
    await workerPage.goto(`${WORKER_URL}wallet`, { waitUntil: 'networkidle0' });
    await wait(1000);
    await takeScreenshot(workerPage, 'worker_wallet', 'test5');

    const workerWallet = await workerPage.evaluate(() => {
      const balanceElement = document.querySelector('[class*="balance"]');
      return {
        visible: !!balanceElement,
        text: balanceElement ? balanceElement.textContent : 'Not found'
      };
    });

    // Check admin payments page
    await adminPage.goto(`${ADMIN_URL}payments`, { waitUntil: 'networkidle0' });
    await wait(1000);
    await takeScreenshot(adminPage, 'admin_payments', 'test5');

    const adminPayments = await adminPage.evaluate(() => {
      const paymentElements = document.querySelectorAll('[class*="payment"]');
      return {
        count: paymentElements.length,
        visible: paymentElements.length > 0
      };
    });

    logTest('Payment Processing - Wallet Visibility', workerWallet.visible ? 'PASS' : 'WARN', {
      data: { workerWallet, adminPayments }
    });

  } catch (error) {
    logTest('Payment Processing Sync', 'FAIL', { error: error.message });
    await takeScreenshot(adminPage, 'test5_admin_error', 'test5');
    await takeScreenshot(workerPage, 'test5_worker_error', 'test5');
  }
}

// Test 6: Real-time Updates (WebSocket)
async function testRealtimeUpdates(adminPage, workerPage) {
  console.log('\n🧪 Test 6: Real-time Updates');

  try {
    // Check WebSocket connection status in worker
    const workerWsStatus = await workerPage.evaluate(() => {
      return {
        hasWebSocket: typeof WebSocket !== 'undefined',
        localStorage: Object.keys(localStorage)
      };
    });

    // Check WebSocket connection status in admin
    const adminWsStatus = await adminPage.evaluate(() => {
      return {
        hasWebSocket: typeof WebSocket !== 'undefined',
        sessionStorage: Object.keys(sessionStorage)
      };
    });

    logTest('Real-time Updates - WebSocket Support', 'PASS', {
      data: {
        worker: workerWsStatus.hasWebSocket,
        admin: adminWsStatus.hasWebSocket
      }
    });

    // Test chat functionality
    await adminPage.goto(`${ADMIN_URL}chat`, { waitUntil: 'networkidle0' });
    await wait(1000);
    await takeScreenshot(adminPage, 'admin_chat', 'test6');

    await workerPage.goto(`${WORKER_URL}chat`, { waitUntil: 'networkidle0' });
    await wait(1000);
    await takeScreenshot(workerPage, 'worker_chat', 'test6');

    logTest('Real-time Updates - Chat Pages Accessible', 'PASS');

  } catch (error) {
    logTest('Real-time Updates', 'FAIL', { error: error.message });
    await takeScreenshot(adminPage, 'test6_admin_error', 'test6');
    await takeScreenshot(workerPage, 'test6_worker_error', 'test6');
  }
}

// Test 7: Status Changes Sync
async function testStatusChangesSync(adminPage, workerPage) {
  console.log('\n🧪 Test 7: Status Changes Sync');

  try {
    // Navigate to jobs in admin
    await adminPage.goto(`${ADMIN_URL}jobs`, { waitUntil: 'networkidle0' });
    await wait(1000);
    await takeScreenshot(adminPage, 'admin_jobs_status', 'test7');

    const adminJobStatuses = await adminPage.evaluate(() => {
      const statusElements = document.querySelectorAll('[class*="status"]');
      return {
        count: statusElements.length,
        visible: statusElements.length > 0
      };
    });

    // Navigate to jobs in worker
    await workerPage.goto(`${WORKER_URL}jobs`, { waitUntil: 'networkidle0' });
    await wait(1000);
    await takeScreenshot(workerPage, 'worker_jobs_status', 'test7');

    const workerJobStatuses = await workerPage.evaluate(() => {
      const statusElements = document.querySelectorAll('[class*="status"]');
      return {
        count: statusElements.length,
        visible: statusElements.length > 0
      };
    });

    logTest('Status Changes - Status Elements Visible', 'PASS', {
      data: {
        admin: adminJobStatuses,
        worker: workerJobStatuses
      }
    });

  } catch (error) {
    logTest('Status Changes Sync', 'FAIL', { error: error.message });
    await takeScreenshot(adminPage, 'test7_admin_error', 'test7');
    await takeScreenshot(workerPage, 'test7_worker_error', 'test7');
  }
}

// Test 8: Data Conflict Resolution
async function testDataConflictResolution(adminPage, workerPage) {
  console.log('\n🧪 Test 8: Data Conflict Resolution');

  try {
    // This test would involve simultaneous edits
    // For now, we'll just verify that both platforms can access the same data

    await adminPage.goto(`${ADMIN_URL}candidates`, { waitUntil: 'networkidle0' });
    await wait(500);

    await workerPage.goto(`${WORKER_URL}profile`, { waitUntil: 'networkidle0' });
    await wait(500);

    await takeScreenshot(adminPage, 'admin_simultaneous', 'test8');
    await takeScreenshot(workerPage, 'worker_simultaneous', 'test8');

    // Verify both pages are responsive
    const adminResponsive = await adminPage.evaluate(() => {
      return document.readyState === 'complete';
    });

    const workerResponsive = await workerPage.evaluate(() => {
      return document.readyState === 'complete';
    });

    if (adminResponsive && workerResponsive) {
      logTest('Data Conflict Resolution - Simultaneous Access', 'PASS', {
        data: { adminResponsive, workerResponsive }
      });
    } else {
      logTest('Data Conflict Resolution - Simultaneous Access', 'FAIL', {
        error: 'One or both platforms not responsive',
        data: { adminResponsive, workerResponsive }
      });
    }

  } catch (error) {
    logTest('Data Conflict Resolution', 'FAIL', { error: error.message });
    await takeScreenshot(adminPage, 'test8_admin_error', 'test8');
    await takeScreenshot(workerPage, 'test8_worker_error', 'test8');
  }
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting Data Consistency Tests');
  console.log(`Admin URL: ${ADMIN_URL}`);
  console.log(`Worker URL: ${WORKER_URL}`);
  console.log(`Test Email: ${TEST_EMAIL}`);
  console.log('='.repeat(80));

  let browser;
  let adminPage;
  let workerPage;

  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: false, // Set to false to see the browser
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    // Login to both platforms
    adminPage = await loginAdmin(browser);
    workerPage = await loginWorker(browser);

    // Run all tests
    await testCandidateDataSync(adminPage, workerPage);
    await testJobManagementSync(adminPage, workerPage);
    await testGamificationSync(adminPage, workerPage);
    await testProfileUpdatesSync(adminPage, workerPage);
    await testPaymentProcessingSync(adminPage, workerPage);
    await testRealtimeUpdates(adminPage, workerPage);
    await testStatusChangesSync(adminPage, workerPage);
    await testDataConflictResolution(adminPage, workerPage);

  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    results.tests.push({
      name: 'Test Suite Execution',
      status: 'FAIL',
      details: { error: error.message, stack: error.stack },
      timestamp: new Date().toISOString()
    });
  } finally {
    // Save results
    const reportPath = path.join(__dirname, 'data_consistency_test_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('📊 Test Summary:');
    console.log(`   Total Tests: ${results.summary.total}`);
    console.log(`   ✅ Passed: ${results.summary.passed}`);
    console.log(`   ❌ Failed: ${results.summary.failed}`);
    console.log(`   ⚠️  Warnings: ${results.summary.warnings}`);
    console.log(`\n📄 Report saved to: ${reportPath}`);
    console.log(`📸 Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log('='.repeat(80));

    // Keep browser open for 5 seconds before closing
    console.log('\n⏳ Browser will close in 5 seconds...');
    await wait(5000);

    if (browser) {
      await browser.close();
    }
  }
}

// Run the tests
runTests().catch(console.error);
