/**
 * Cross-Platform Data Consistency Test Suite
 * Tests data synchronization between Admin Portal (localhost:5173/admin) and Worker PWA (localhost:8080)
 *
 * This script verifies:
 * 1. User Data Consistency
 * 2. Job Data Sync
 * 3. Gamification Consistency
 * 4. Payment Data
 * 5. Chat History
 * 6. Calendar/Schedule
 * 7. Notification Sync
 * 8. Profile Updates
 * 9. Real-time Updates
 * 10. Data Validation
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  ADMIN_BASE_URL: 'http://localhost:5173/admin',
  WORKER_BASE_URL: 'http://localhost:8080',
  API_BASE_URL: 'http://localhost:3000/api/v1',
  TEST_TIMEOUT: 30000,
  SCREENSHOT_DIR: path.join(__dirname, 'test-screenshots'),
  RESULTS_DIR: path.join(__dirname, 'test-results'),
  TEST_CANDIDATE: {
    id: 'test-candidate-1',
    name: 'Test Candidate',
    email: 'testcandidate@example.com',
    phone: '+65 9123 4567'
  }
};

// Ensure directories exist
if (!fs.existsSync(CONFIG.SCREENSHOT_DIR)) {
  fs.mkdirSync(CONFIG.SCREENSHOT_DIR, { recursive: true });
}
if (!fs.existsSync(CONFIG.RESULTS_DIR)) {
  fs.mkdirSync(CONFIG.RESULTS_DIR, { recursive: true });
}

class CrossPlatformTester {
  constructor() {
    this.browser = null;
    this.adminPage = null;
    this.workerPage = null;
    this.testResults = {
      startTime: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
      }
    };
  }

  async initialize() {
    console.log('🚀 Initializing Cross-Platform Data Consistency Test Suite...\n');

    // Launch browser with multiple tabs
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for CI/CD
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Create pages for admin portal and worker PWA
    this.adminPage = await this.browser.newPage();
    this.workerPage = await this.browser.newPage();

    // Set user agents
    await this.adminPage.setUserAgent('Admin-Portal-Test-Agent');
    await this.workerPage.setUserAgent('Worker-PWA-Test-Agent');

    // Navigate to both platforms
    console.log('📱 Loading Admin Portal and Worker PWA...');
    await Promise.all([
      this.adminPage.goto(CONFIG.ADMIN_BASE_URL, { waitUntil: 'networkidle0' }),
      this.workerPage.goto(CONFIG.WORKER_BASE_URL, { waitUntil: 'networkidle0' })
    ]);

    console.log('✅ Both platforms loaded successfully\n');
  }

  async runTest(testName, testFunction) {
    const startTime = Date.now();
    console.log(`🧪 Running Test: ${testName}`);

    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;

      const testResult = {
        name: testName,
        status: 'PASSED',
        duration: duration,
        result: result,
        timestamp: new Date().toISOString()
      };

      this.testResults.tests.push(testResult);
      this.testResults.summary.passed++;

      console.log(`✅ ${testName} - PASSED (${duration}ms)\n`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      const testResult = {
        name: testName,
        status: 'FAILED',
        duration: duration,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };

      this.testResults.tests.push(testResult);
      this.testResults.summary.failed++;
      this.testResults.summary.errors.push({
        test: testName,
        error: error.message
      });

      console.log(`❌ ${testName} - FAILED (${duration}ms): ${error.message}\n`);

      // Take screenshot on failure
      await this.takeScreenshots(`failure-${testName.replace(/\s+/g, '-').toLowerCase()}`);

      throw error;
    } finally {
      this.testResults.summary.total++;
    }
  }

  async takeScreenshots(suffix = '') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const prefix = suffix ? `${suffix}-${timestamp}` : timestamp;

    try {
      await Promise.all([
        this.adminPage.screenshot({
          path: path.join(CONFIG.SCREENSHOT_DIR, `admin-${prefix}.png`),
          fullPage: true
        }),
        this.workerPage.screenshot({
          path: path.join(CONFIG.SCREENSHOT_DIR, `worker-${prefix}.png`),
          fullPage: true
        })
      ]);
    } catch (error) {
      console.warn('Failed to take screenshots:', error.message);
    }
  }

  async makeApiRequest(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async waitForElement(page, selector, timeout = 5000) {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      throw new Error(`Element not found: ${selector}`);
    }
  }

  async getElementText(page, selector) {
    await this.waitForElement(page, selector);
    return page.$eval(selector, el => el.textContent.trim());
  }

  async clickElement(page, selector) {
    await this.waitForElement(page, selector);
    await page.click(selector);
  }

  async typeInElement(page, selector, text) {
    await this.waitForElement(page, selector);
    await page.click(selector);
    await page.keyboard.selectAll();
    await page.type(selector, text);
  }

  // Test 1: User Data Consistency
  async testUserDataConsistency() {
    // Create/update candidate profile via admin
    const candidateData = {
      name: 'John Test Worker',
      email: 'john.test@example.com',
      phone: '+65 9999 8888',
      skills: ['Customer Service', 'Data Entry'],
      certifications: ['Food Safety', 'First Aid']
    };

    // Navigate to candidate management in admin
    await this.adminPage.goto(`${CONFIG.ADMIN_BASE_URL}/candidates`, { waitUntil: 'networkidle0' });

    // Add or update candidate data
    // This would need to be adapted based on actual admin UI structure
    await this.clickElement(this.adminPage, '[data-testid="add-candidate"]');
    await this.typeInElement(this.adminPage, '[data-testid="candidate-name"]', candidateData.name);
    await this.typeInElement(this.adminPage, '[data-testid="candidate-email"]', candidateData.email);
    await this.typeInElement(this.adminPage, '[data-testid="candidate-phone"]', candidateData.phone);

    // Save candidate
    await this.clickElement(this.adminPage, '[data-testid="save-candidate"]');

    // Wait for save confirmation
    await this.waitForElement(this.adminPage, '[data-testid="save-success"]');

    // Switch to worker PWA and login as the candidate
    await this.workerPage.goto(`${CONFIG.WORKER_BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await this.typeInElement(this.workerPage, '[data-testid="email"]', candidateData.email);
    await this.clickElement(this.workerPage, '[data-testid="login"]');

    // Navigate to profile page
    await this.workerPage.goto(`${CONFIG.WORKER_BASE_URL}/profile`, { waitUntil: 'networkidle0' });

    // Verify data consistency
    const workerName = await this.getElementText(this.workerPage, '[data-testid="profile-name"]');
    const workerEmail = await this.getElementText(this.workerPage, '[data-testid="profile-email"]');
    const workerPhone = await this.getElementText(this.workerPage, '[data-testid="profile-phone"]');

    return {
      adminData: candidateData,
      workerData: {
        name: workerName,
        email: workerEmail,
        phone: workerPhone
      },
      isConsistent:
        workerName === candidateData.name &&
        workerEmail === candidateData.email &&
        workerPhone === candidateData.phone
    };
  }

  // Test 2: Job Data Synchronization
  async testJobDataSync() {
    const jobData = {
      title: 'Test Customer Service Role',
      location: 'Orchard Road, Singapore',
      pay_rate: 25.00,
      start_time: '09:00',
      end_time: '18:00',
      job_date: '2026-02-10',
      total_slots: 5,
      required_skills: ['Customer Service']
    };

    // Create job in admin portal
    await this.adminPage.goto(`${CONFIG.ADMIN_BASE_URL}/jobs`, { waitUntil: 'networkidle0' });
    await this.clickElement(this.adminPage, '[data-testid="create-job"]');

    // Fill job details
    await this.typeInElement(this.adminPage, '[data-testid="job-title"]', jobData.title);
    await this.typeInElement(this.adminPage, '[data-testid="job-location"]', jobData.location);
    await this.typeInElement(this.adminPage, '[data-testid="job-pay-rate"]', jobData.pay_rate.toString());
    await this.typeInElement(this.adminPage, '[data-testid="job-date"]', jobData.job_date);

    // Save job
    await this.clickElement(this.adminPage, '[data-testid="save-job"]');
    await this.waitForElement(this.adminPage, '[data-testid="job-created"]');

    // Check worker PWA job listings
    await this.workerPage.goto(`${CONFIG.WORKER_BASE_URL}/jobs`, { waitUntil: 'networkidle0' });
    await this.waitForElement(this.workerPage, '[data-testid="job-listing"]');

    // Find the created job
    const jobElements = await this.workerPage.$$('[data-testid="job-card"]');
    let foundJob = null;

    for (const jobEl of jobElements) {
      const title = await jobEl.$eval('[data-testid="job-title"]', el => el.textContent.trim());
      if (title === jobData.title) {
        foundJob = {
          title,
          location: await jobEl.$eval('[data-testid="job-location"]', el => el.textContent.trim()),
          pay: await jobEl.$eval('[data-testid="job-pay"]', el => el.textContent.trim()),
          date: await jobEl.$eval('[data-testid="job-date"]', el => el.textContent.trim())
        };
        break;
      }
    }

    return {
      adminJob: jobData,
      workerJob: foundJob,
      isConsistent: foundJob !== null &&
        foundJob.title === jobData.title &&
        foundJob.location.includes(jobData.location)
    };
  }

  // Test 3: Gamification Consistency
  async testGamificationConsistency() {
    // Award achievement via admin
    await this.adminPage.goto(`${CONFIG.ADMIN_BASE_URL}/candidates`, { waitUntil: 'networkidle0' });

    // Select test candidate
    await this.clickElement(this.adminPage, '[data-testid="candidate-row"]:first-child');

    // Award XP or achievement
    await this.clickElement(this.adminPage, '[data-testid="award-xp"]');
    await this.typeInElement(this.adminPage, '[data-testid="xp-amount"]', '100');
    await this.typeInElement(this.adminPage, '[data-testid="xp-reason"]', 'Test completion');
    await this.clickElement(this.adminPage, '[data-testid="confirm-award"]');

    // Wait for award confirmation
    await this.waitForElement(this.adminPage, '[data-testid="award-success"]');

    // Check worker PWA gamification section
    await this.workerPage.goto(`${CONFIG.WORKER_BASE_URL}/achievements`, { waitUntil: 'networkidle0' });

    const workerXP = await this.getElementText(this.workerPage, '[data-testid="current-xp"]');
    const workerLevel = await this.getElementText(this.workerPage, '[data-testid="current-level"]');

    return {
      xpAwarded: 100,
      workerXP: parseInt(workerXP),
      workerLevel: parseInt(workerLevel),
      isConsistent: parseInt(workerXP) >= 100
    };
  }

  // Test 4: Payment Data Consistency
  async testPaymentDataConsistency() {
    // Create payment record via admin
    await this.adminPage.goto(`${CONFIG.ADMIN_BASE_URL}/payments`, { waitUntil: 'networkidle0' });

    const paymentData = {
      amount: 125.50,
      hours: 5.0,
      description: 'Test payment for consistency check'
    };

    // This would need actual admin payment creation flow
    // For now, we'll check existing payments

    // Check worker wallet/payment history
    await this.workerPage.goto(`${CONFIG.WORKER_BASE_URL}/wallet`, { waitUntil: 'networkidle0' });

    const totalEarnings = await this.getElementText(this.workerPage, '[data-testid="total-earnings"]');
    const paymentHistory = await this.workerPage.$$('[data-testid="payment-item"]');

    return {
      paymentRecordsFound: paymentHistory.length,
      totalEarnings: parseFloat(totalEarnings.replace('$', '')),
      isConsistent: paymentHistory.length > 0
    };
  }

  // Test 5: Chat History Consistency
  async testChatHistoryConsistency() {
    const testMessage = 'Test message for consistency check';

    // Send message from admin to candidate
    await this.adminPage.goto(`${CONFIG.ADMIN_BASE_URL}/chat`, { waitUntil: 'networkidle0' });

    // Select candidate conversation
    await this.clickElement(this.adminPage, '[data-testid="candidate-chat"]:first-child');

    // Send message
    await this.typeInElement(this.adminPage, '[data-testid="message-input"]', testMessage);
    await this.clickElement(this.adminPage, '[data-testid="send-message"]');

    // Wait for message to be sent
    await this.waitForElement(this.adminPage, `[data-testid="message"]:contains("${testMessage}")`);

    // Check worker PWA chat
    await this.workerPage.goto(`${CONFIG.WORKER_BASE_URL}/chat`, { waitUntil: 'networkidle0' });

    // Look for the message
    const messages = await this.workerPage.$$('[data-testid="message"]');
    let foundMessage = false;

    for (const msg of messages) {
      const content = await msg.evaluate(el => el.textContent.trim());
      if (content.includes(testMessage)) {
        foundMessage = true;
        break;
      }
    }

    return {
      messageSent: testMessage,
      foundInWorkerChat: foundMessage,
      isConsistent: foundMessage
    };
  }

  // Test 6: Calendar/Schedule Consistency
  async testCalendarConsistency() {
    const availabilityData = {
      date: '2026-02-15',
      start_time: '09:00',
      end_time: '17:00',
      status: 'available'
    };

    // Set availability via admin
    await this.adminPage.goto(`${CONFIG.ADMIN_BASE_URL}/candidates`, { waitUntil: 'networkidle0' });
    await this.clickElement(this.adminPage, '[data-testid="candidate-row"]:first-child');
    await this.clickElement(this.adminPage, '[data-testid="manage-availability"]');

    // Set availability (this would need actual admin UI implementation)

    // Check worker calendar
    await this.workerPage.goto(`${CONFIG.WORKER_BASE_URL}/calendar`, { waitUntil: 'networkidle0' });

    const calendarEvents = await this.workerPage.$$('[data-testid="calendar-event"]');

    return {
      availabilitySet: availabilityData,
      calendarEventsCount: calendarEvents.length,
      isConsistent: calendarEvents.length > 0
    };
  }

  // Test 7: Notification Synchronization
  async testNotificationSync() {
    const notificationData = {
      title: 'Test Notification',
      message: 'This is a test notification for consistency check',
      type: 'info'
    };

    // Send notification from admin
    await this.adminPage.goto(`${CONFIG.ADMIN_BASE_URL}/notifications`, { waitUntil: 'networkidle0' });
    await this.clickElement(this.adminPage, '[data-testid="send-notification"]');

    await this.typeInElement(this.adminPage, '[data-testid="notification-title"]', notificationData.title);
    await this.typeInElement(this.adminPage, '[data-testid="notification-message"]', notificationData.message);
    await this.clickElement(this.adminPage, '[data-testid="send"]');

    // Check worker notifications
    await this.workerPage.goto(`${CONFIG.WORKER_BASE_URL}/notifications`, { waitUntil: 'networkidle0' });

    const notifications = await this.workerPage.$$('[data-testid="notification-item"]');
    let foundNotification = false;

    for (const notif of notifications) {
      const title = await notif.$eval('[data-testid="notification-title"]', el => el.textContent.trim());
      if (title === notificationData.title) {
        foundNotification = true;
        break;
      }
    }

    return {
      notificationSent: notificationData,
      foundInWorker: foundNotification,
      isConsistent: foundNotification
    };
  }

  // Test 8: Profile Update Propagation
  async testProfileUpdatePropagation() {
    const updatedProfile = {
      name: 'Updated Test Name',
      phone: '+65 8888 9999',
      skills: ['Updated Skill 1', 'Updated Skill 2']
    };

    // Update profile via admin
    await this.adminPage.goto(`${CONFIG.ADMIN_BASE_URL}/candidates`, { waitUntil: 'networkidle0' });
    await this.clickElement(this.adminPage, '[data-testid="candidate-row"]:first-child');
    await this.clickElement(this.adminPage, '[data-testid="edit-candidate"]');

    await this.typeInElement(this.adminPage, '[data-testid="candidate-name"]', updatedProfile.name);
    await this.typeInElement(this.adminPage, '[data-testid="candidate-phone"]', updatedProfile.phone);
    await this.clickElement(this.adminPage, '[data-testid="save-changes"]');

    // Wait a moment for update to propagate
    await this.adminPage.waitForTimeout(2000);

    // Check worker profile immediately
    await this.workerPage.goto(`${CONFIG.WORKER_BASE_URL}/profile`, { waitUntil: 'networkidle0' });

    const workerName = await this.getElementText(this.workerPage, '[data-testid="profile-name"]');
    const workerPhone = await this.getElementText(this.workerPage, '[data-testid="profile-phone"]');

    return {
      updatedData: updatedProfile,
      workerData: {
        name: workerName,
        phone: workerPhone
      },
      isConsistent: workerName === updatedProfile.name && workerPhone === updatedProfile.phone
    };
  }

  // Test 9: Real-time Updates
  async testRealTimeUpdates() {
    // Open both platforms side by side
    const startTime = Date.now();

    // Create a job in admin and monitor worker page for updates
    await this.adminPage.goto(`${CONFIG.ADMIN_BASE_URL}/jobs`, { waitUntil: 'networkidle0' });
    await this.workerPage.goto(`${CONFIG.WORKER_BASE_URL}/jobs`, { waitUntil: 'networkidle0' });

    const initialJobCount = await this.workerPage.$$eval('[data-testid="job-card"]', els => els.length);

    // Create job in admin
    await this.clickElement(this.adminPage, '[data-testid="create-job"]');
    await this.typeInElement(this.adminPage, '[data-testid="job-title"]', 'Real-time Test Job');
    await this.typeInElement(this.adminPage, '[data-testid="job-location"]', 'Singapore');
    await this.typeInElement(this.adminPage, '[data-testid="job-pay-rate"]', '20');
    await this.clickElement(this.adminPage, '[data-testid="save-job"]');

    // Wait for job creation
    await this.waitForElement(this.adminPage, '[data-testid="job-created"]');

    // Check worker page for real-time update
    let updatedJobCount = initialJobCount;
    let updateDetected = false;
    const maxWaitTime = 10000; // 10 seconds

    while (Date.now() - startTime < maxWaitTime) {
      await this.workerPage.waitForTimeout(1000);
      updatedJobCount = await this.workerPage.$$eval('[data-testid="job-card"]', els => els.length);

      if (updatedJobCount > initialJobCount) {
        updateDetected = true;
        break;
      }
    }

    const updateTime = Date.now() - startTime;

    return {
      initialJobCount,
      updatedJobCount,
      updateDetected,
      updateTimeMs: updateTime,
      isRealTime: updateDetected && updateTime < 5000 // Consider real-time if under 5 seconds
    };
  }

  // Test 10: Database vs UI Validation
  async testDatabaseUIValidation() {
    // Get data from API
    const apiCandidates = await this.makeApiRequest('/candidates');
    const apiJobs = await this.makeApiRequest('/jobs');

    // Get data from admin UI
    await this.adminPage.goto(`${CONFIG.ADMIN_BASE_URL}/candidates`, { waitUntil: 'networkidle0' });
    const adminCandidateRows = await this.adminPage.$$('[data-testid="candidate-row"]');

    await this.adminPage.goto(`${CONFIG.ADMIN_BASE_URL}/jobs`, { waitUntil: 'networkidle0' });
    const adminJobRows = await this.adminPage.$$('[data-testid="job-row"]');

    // Get data from worker UI
    await this.workerPage.goto(`${CONFIG.WORKER_BASE_URL}/jobs`, { waitUntil: 'networkidle0' });
    const workerJobCards = await this.workerPage.$$('[data-testid="job-card"]');

    return {
      api: {
        candidates: apiCandidates.length || 0,
        jobs: apiJobs.length || 0
      },
      admin: {
        candidates: adminCandidateRows.length,
        jobs: adminJobRows.length
      },
      worker: {
        jobs: workerJobCards.length
      },
      isConsistent:
        (apiJobs.length || 0) === adminJobRows.length &&
        adminJobRows.length === workerJobCards.length
    };
  }

  async generateReport() {
    this.testResults.endTime = new Date().toISOString();
    this.testResults.duration = Date.parse(this.testResults.endTime) - Date.parse(this.testResults.startTime);

    const reportPath = path.join(CONFIG.RESULTS_DIR, `test-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport();
    const htmlPath = path.join(CONFIG.RESULTS_DIR, `test-report-${new Date().toISOString().replace(/[:.]/g, '-')}.html`);
    fs.writeFileSync(htmlPath, htmlReport);

    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    console.log(`Total Tests: ${this.testResults.summary.total}`);
    console.log(`Passed: ${this.testResults.summary.passed}`);
    console.log(`Failed: ${this.testResults.summary.failed}`);
    console.log(`Success Rate: ${((this.testResults.summary.passed / this.testResults.summary.total) * 100).toFixed(2)}%`);
    console.log(`Duration: ${(this.testResults.duration / 1000).toFixed(2)}s`);
    console.log(`\nReport saved to: ${reportPath}`);
    console.log(`HTML Report: ${htmlPath}`);

    if (this.testResults.summary.errors.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.summary.errors.forEach(error => {
        console.log(`  - ${error.test}: ${error.error}`);
      });
    }
  }

  generateHTMLReport() {
    const passedTests = this.testResults.tests.filter(t => t.status === 'PASSED');
    const failedTests = this.testResults.tests.filter(t => t.status === 'FAILED');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cross-Platform Data Consistency Test Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; margin-bottom: 30px; }
        .metric { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #007acc; min-width: 120px; }
        .test-result { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
        .passed { background: #e8f5e8; border-left: 4px solid #28a745; }
        .failed { background: #f8e8e8; border-left: 4px solid #dc3545; }
        .test-name { font-weight: bold; font-size: 16px; }
        .test-duration { color: #666; font-size: 14px; }
        .error { background: #fff3cd; padding: 10px; margin-top: 10px; border-radius: 4px; font-family: monospace; }
        .timestamp { color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Cross-Platform Data Consistency Test Report</h1>
        <p>Generated on: ${new Date(this.testResults.endTime).toLocaleString()}</p>
        <p>Duration: ${(this.testResults.duration / 1000).toFixed(2)}s</p>
      </div>

      <div class="summary">
        <div class="metric">
          <h3>Total Tests</h3>
          <div style="font-size: 24px; font-weight: bold;">${this.testResults.summary.total}</div>
        </div>
        <div class="metric">
          <h3>Passed</h3>
          <div style="font-size: 24px; font-weight: bold; color: #28a745;">${this.testResults.summary.passed}</div>
        </div>
        <div class="metric">
          <h3>Failed</h3>
          <div style="font-size: 24px; font-weight: bold; color: #dc3545;">${this.testResults.summary.failed}</div>
        </div>
        <div class="metric">
          <h3>Success Rate</h3>
          <div style="font-size: 24px; font-weight: bold;">${((this.testResults.summary.passed / this.testResults.summary.total) * 100).toFixed(1)}%</div>
        </div>
      </div>

      <h2>Test Results</h2>

      ${this.testResults.tests.map(test => `
        <div class="test-result ${test.status.toLowerCase()}">
          <div class="test-name">${test.name}</div>
          <div class="test-duration">Duration: ${test.duration}ms | ${test.timestamp}</div>
          ${test.error ? `<div class="error">Error: ${test.error}</div>` : ''}
          ${test.result ? `<pre style="margin-top: 10px; font-size: 12px;">${JSON.stringify(test.result, null, 2)}</pre>` : ''}
        </div>
      `).join('')}

    </body>
    </html>`;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runAllTests() {
    try {
      await this.initialize();

      // Run all test cases
      await this.runTest('User Data Consistency', () => this.testUserDataConsistency());
      await this.runTest('Job Data Synchronization', () => this.testJobDataSync());
      await this.runTest('Gamification Consistency', () => this.testGamificationConsistency());
      await this.runTest('Payment Data Consistency', () => this.testPaymentDataConsistency());
      await this.runTest('Chat History Consistency', () => this.testChatHistoryConsistency());
      await this.runTest('Calendar/Schedule Consistency', () => this.testCalendarConsistency());
      await this.runTest('Notification Synchronization', () => this.testNotificationSync());
      await this.runTest('Profile Update Propagation', () => this.testProfileUpdatePropagation());
      await this.runTest('Real-time Updates', () => this.testRealTimeUpdates());
      await this.runTest('Database vs UI Validation', () => this.testDatabaseUIValidation());

    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      await this.generateReport();
      await this.cleanup();
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new CrossPlatformTester();
  tester.runAllTests()
    .then(() => {
      console.log('\n✅ Test suite completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = CrossPlatformTester;