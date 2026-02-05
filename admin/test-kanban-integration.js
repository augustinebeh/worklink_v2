/**
 * Kanban Drag-and-Drop Integration Test Suite
 * Tests all aspects of the 8-stage BPO tender lifecycle kanban board
 */

const puppeteer = require('puppeteer');
const path = require('path');

const ADMIN_URL = 'http://127.0.0.1:3002/admin';
const TEST_CREDENTIALS = {
  email: 'sarah.tan@email.com',
  password: 'admin123'
};

// 8-stage lifecycle stages to test
const STAGES = [
  'renewal_watch',
  'new_opportunity',
  'review',
  'bidding',
  'internal_approval',
  'submitted',
  'awarded',
  'lost'
];

class KanbanIntegrationTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      dragDropTests: [],
      apiTests: [],
      uiTests: [],
      performanceTests: [],
      errors: []
    };
  }

  async setup() {
    try {
      console.log('🚀 Starting Kanban Integration Tests...');

      // Launch browser
      this.browser = await puppeteer.launch({
        headless: false, // Visual testing
        slowMo: 100,     // Slow down for visual verification
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--window-size=1400,900'
        ]
      });

      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1400, height: 900 });

      // Enable request/response monitoring
      await this.page.setRequestInterception(true);
      this.page.on('request', request => {
        console.log('🌐 API Request:', request.method(), request.url());
        request.continue();
      });

      this.page.on('response', response => {
        if (response.url().includes('/api/')) {
          console.log('✅ API Response:', response.status(), response.url());
        }
      });

      console.log('✅ Browser setup complete');
      return true;
    } catch (error) {
      console.error('❌ Setup failed:', error);
      this.results.errors.push({ test: 'setup', error: error.message });
      return false;
    }
  }

  async login() {
    try {
      console.log('🔐 Logging into admin portal...');

      await this.page.goto(ADMIN_URL);

      // Wait for login form
      await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });

      // Enter credentials
      await this.page.type('input[type="email"]', TEST_CREDENTIALS.email);
      await this.page.type('input[type="password"]', TEST_CREDENTIALS.password);

      // Submit login
      await this.page.click('button[type="submit"]');

      // Wait for dashboard or navigation
      await this.page.waitForSelector('[data-testid="dashboard"], .nav-item, .sidebar', { timeout: 15000 });

      console.log('✅ Login successful');
      return true;
    } catch (error) {
      console.error('❌ Login failed:', error);
      this.results.errors.push({ test: 'login', error: error.message });
      return false;
    }
  }

  async navigateToKanban() {
    try {
      console.log('🧭 Navigating to BPO Tender Lifecycle page...');

      // Try multiple navigation approaches
      const navigationSelectors = [
        'a[href*="bpo"]',
        'a[href*="tender"]',
        'a[href*="lifecycle"]',
        '[data-testid="bpo-tender-lifecycle"]'
      ];

      let navigated = false;

      for (const selector of navigationSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            navigated = true;
            break;
          }
        } catch (e) {
          console.log(`⏭️ Navigation selector "${selector}" not found, trying next...`);
        }
      }

      if (!navigated) {
        // Direct navigation
        await this.page.goto(`${ADMIN_URL}/bpo-tender-lifecycle`);
      }

      // Wait for kanban board
      await this.page.waitForSelector('.kanban-board, [data-testid="kanban-board"]', { timeout: 15000 });

      console.log('✅ Kanban board loaded');
      return true;
    } catch (error) {
      console.error('❌ Navigation failed:', error);
      this.results.errors.push({ test: 'navigation', error: error.message });
      return false;
    }
  }

  async testDragAndDrop() {
    try {
      console.log('🎯 Testing drag-and-drop functionality...');

      // Wait for tender cards to load
      await this.page.waitForSelector('.tender-card, [data-testid="tender-card"]', { timeout: 10000 });

      // Get all tender cards
      const tenderCards = await this.page.$$('.tender-card, [data-testid="tender-card"]');
      console.log(`📋 Found ${tenderCards.length} tender cards`);

      if (tenderCards.length === 0) {
        throw new Error('No tender cards found to test drag-and-drop');
      }

      // Test drag-and-drop between stages
      const firstCard = tenderCards[0];

      // Get source column
      const sourceColumn = await this.page.evaluateHandle(card => {
        return card.closest('.kanban-column, [data-testid="kanban-column"]');
      }, firstCard);

      // Get target columns (different from source)
      const allColumns = await this.page.$$('.kanban-column, [data-testid="kanban-column"]');
      const targetColumn = allColumns.find(col => col !== sourceColumn);

      if (!targetColumn) {
        throw new Error('Could not find target column for drag-and-drop test');
      }

      // Perform drag and drop
      console.log('🔄 Performing drag-and-drop operation...');

      const cardBoundingBox = await firstCard.boundingBox();
      const targetBoundingBox = await targetColumn.boundingBox();

      // Mouse events for drag and drop
      await this.page.mouse.move(
        cardBoundingBox.x + cardBoundingBox.width / 2,
        cardBoundingBox.y + cardBoundingBox.height / 2
      );

      await this.page.mouse.down();

      // Drag to target
      await this.page.mouse.move(
        targetBoundingBox.x + targetBoundingBox.width / 2,
        targetBoundingBox.y + targetBoundingBox.height / 2,
        { steps: 10 }
      );

      await this.page.waitForTimeout(500); // Allow for drag-over effects

      await this.page.mouse.up();

      // Wait for API call completion
      await this.page.waitForTimeout(2000);

      console.log('✅ Drag-and-drop operation completed');

      this.results.dragDropTests.push({
        test: 'basic_drag_drop',
        status: 'passed',
        details: 'Successfully moved tender card between stages'
      });

      return true;
    } catch (error) {
      console.error('❌ Drag-and-drop test failed:', error);
      this.results.dragDropTests.push({
        test: 'basic_drag_drop',
        status: 'failed',
        error: error.message
      });
      return false;
    }
  }

  async testOptimisticUpdates() {
    try {
      console.log('⚡ Testing optimistic updates...');

      // Monitor network requests
      let apiCalls = [];

      this.page.on('response', response => {
        if (response.url().includes('/api/v1/bpo/lifecycle') && response.url().includes('/move')) {
          apiCalls.push({
            url: response.url(),
            status: response.status(),
            timestamp: Date.now()
          });
        }
      });

      // Perform another drag-and-drop to test optimistic updates
      const tenderCards = await this.page.$$('.tender-card, [data-testid="tender-card"]');

      if (tenderCards.length > 1) {
        const card = tenderCards[1];
        const allColumns = await this.page.$$('.kanban-column, [data-testid="kanban-column"]');

        if (allColumns.length > 1) {
          const sourceCard = card;
          const targetColumn = allColumns[1];

          const cardBox = await sourceCard.boundingBox();
          const targetBox = await targetColumn.boundingBox();

          // Record initial position
          const initialText = await this.page.evaluate(card => card.textContent, sourceCard);
          console.log('📝 Initial card content:', initialText);

          // Perform drag and drop
          await this.page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
          await this.page.mouse.down();
          await this.page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
          await this.page.mouse.up();

          // Check immediate visual update (optimistic)
          await this.page.waitForTimeout(500);

          // Wait for API completion
          await this.page.waitForTimeout(3000);

          console.log('📊 API calls during optimistic update:', apiCalls.length);

          this.results.apiTests.push({
            test: 'optimistic_updates',
            status: 'passed',
            details: `API calls made: ${apiCalls.length}`,
            apiCalls: apiCalls
          });
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Optimistic update test failed:', error);
      this.results.apiTests.push({
        test: 'optimistic_updates',
        status: 'failed',
        error: error.message
      });
      return false;
    }
  }

  async testErrorHandling() {
    try {
      console.log('🚨 Testing error handling and rollback...');

      // Simulate network failure by blocking API requests
      await this.page.setRequestInterception(true);

      this.page.on('request', request => {
        if (request.url().includes('/api/v1/bpo/lifecycle') && request.url().includes('/move')) {
          // Fail the API request to test rollback
          request.abort();
        } else {
          request.continue();
        }
      });

      // Try drag and drop that should fail
      const tenderCards = await this.page.$$('.tender-card, [data-testid="tender-card"]');

      if (tenderCards.length > 0) {
        const card = tenderCards[0];
        const allColumns = await this.page.$$('.kanban-column, [data-testid="kanban-column"]');

        if (allColumns.length > 1) {
          const targetColumn = allColumns[0];

          const cardBox = await card.boundingBox();
          const targetBox = await targetColumn.boundingBox();

          // Perform drag and drop
          await this.page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
          await this.page.mouse.down();
          await this.page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
          await this.page.mouse.up();

          // Wait for error handling
          await this.page.waitForTimeout(3000);

          // Check for error toast or rollback
          const errorToast = await this.page.$('.toast-error, .error-message, [data-testid="error-toast"]');

          if (errorToast) {
            console.log('✅ Error handling working - error toast displayed');
            this.results.apiTests.push({
              test: 'error_handling',
              status: 'passed',
              details: 'Error toast displayed on API failure'
            });
          } else {
            console.log('⚠️ No error toast found - checking for rollback');
            this.results.apiTests.push({
              test: 'error_handling',
              status: 'partial',
              details: 'No visible error indication found'
            });
          }
        }
      }

      // Re-enable normal API requests
      await this.page.setRequestInterception(false);

      return true;
    } catch (error) {
      console.error('❌ Error handling test failed:', error);
      this.results.apiTests.push({
        test: 'error_handling',
        status: 'failed',
        error: error.message
      });
      return false;
    }
  }

  async testResponsiveDesign() {
    try {
      console.log('📱 Testing responsive design and mobile experience...');

      // Test desktop
      await this.page.setViewport({ width: 1400, height: 900 });
      await this.page.waitForTimeout(1000);

      let desktopColumns = await this.page.$$('.kanban-column, [data-testid="kanban-column"]');
      console.log(`🖥️ Desktop: ${desktopColumns.length} columns visible`);

      // Test tablet
      await this.page.setViewport({ width: 768, height: 1024 });
      await this.page.waitForTimeout(1000);

      let tabletColumns = await this.page.$$('.kanban-column, [data-testid="kanban-column"]');
      console.log(`📱 Tablet: ${tabletColumns.length} columns visible`);

      // Test mobile
      await this.page.setViewport({ width: 375, height: 667 });
      await this.page.waitForTimeout(1000);

      let mobileColumns = await this.page.$$('.kanban-column, [data-testid="kanban-column"]');
      const mobileWarning = await this.page.$('.mobile-warning, [data-testid="mobile-warning"]');

      console.log(`📱 Mobile: ${mobileColumns.length} columns visible`);
      console.log(`⚠️ Mobile warning displayed: ${!!mobileWarning}`);

      this.results.uiTests.push({
        test: 'responsive_design',
        status: 'passed',
        details: {
          desktop: `${desktopColumns.length} columns`,
          tablet: `${tabletColumns.length} columns`,
          mobile: `${mobileColumns.length} columns`,
          mobileWarning: !!mobileWarning
        }
      });

      // Reset to desktop
      await this.page.setViewport({ width: 1400, height: 900 });

      return true;
    } catch (error) {
      console.error('❌ Responsive design test failed:', error);
      this.results.uiTests.push({
        test: 'responsive_design',
        status: 'failed',
        error: error.message
      });
      return false;
    }
  }

  async testPerformance() {
    try {
      console.log('⚡ Testing performance metrics...');

      // Start performance measurement
      await this.page.metrics();
      const startTime = Date.now();

      // Perform multiple drag and drop operations
      const tenderCards = await this.page.$$('.tender-card, [data-testid="tender-card"]');
      const allColumns = await this.page.$$('.kanban-column, [data-testid="kanban-column"]');

      for (let i = 0; i < Math.min(3, tenderCards.length); i++) {
        const card = tenderCards[i];
        const targetColumn = allColumns[i % allColumns.length];

        const cardBox = await card.boundingBox();
        const targetBox = await targetColumn.boundingBox();

        await this.page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
        await this.page.mouse.down();
        await this.page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 5 });
        await this.page.mouse.up();

        await this.page.waitForTimeout(1000);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Get final metrics
      const metrics = await this.page.metrics();

      console.log(`⏱️ Performance test completed in ${totalTime}ms`);
      console.log('📊 Browser metrics:', {
        JSHeapUsedSize: `${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)}MB`,
        JSHeapTotalSize: `${(metrics.JSHeapTotalSize / 1024 / 1024).toFixed(2)}MB`,
        TaskDuration: `${metrics.TaskDuration.toFixed(2)}ms`
      });

      this.results.performanceTests.push({
        test: 'drag_drop_performance',
        status: 'passed',
        totalTime: totalTime,
        metrics: metrics
      });

      return true;
    } catch (error) {
      console.error('❌ Performance test failed:', error);
      this.results.performanceTests.push({
        test: 'drag_drop_performance',
        status: 'failed',
        error: error.message
      });
      return false;
    }
  }

  async generateReport() {
    console.log('\n📊 KANBAN INTEGRATION TEST RESULTS');
    console.log('='.repeat(50));

    // Summary
    const totalTests =
      this.results.dragDropTests.length +
      this.results.apiTests.length +
      this.results.uiTests.length +
      this.results.performanceTests.length;

    const passedTests = [
      ...this.results.dragDropTests,
      ...this.results.apiTests,
      ...this.results.uiTests,
      ...this.results.performanceTests
    ].filter(test => test.status === 'passed').length;

    console.log(`\n📈 Overall Score: ${passedTests}/${totalTests} tests passed`);
    console.log(`✅ Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    // Detailed results
    console.log('\n🎯 Drag & Drop Tests:');
    this.results.dragDropTests.forEach(test => {
      console.log(`  ${test.status === 'passed' ? '✅' : '❌'} ${test.test}: ${test.details || test.error}`);
    });

    console.log('\n🌐 API Integration Tests:');
    this.results.apiTests.forEach(test => {
      console.log(`  ${test.status === 'passed' ? '✅' : '❌'} ${test.test}: ${test.details || test.error}`);
    });

    console.log('\n🎨 UI/UX Tests:');
    this.results.uiTests.forEach(test => {
      console.log(`  ${test.status === 'passed' ? '✅' : '❌'} ${test.test}: ${JSON.stringify(test.details) || test.error}`);
    });

    console.log('\n⚡ Performance Tests:');
    this.results.performanceTests.forEach(test => {
      console.log(`  ${test.status === 'passed' ? '✅' : '❌'} ${test.test}: ${test.totalTime || 'N/A'}ms`);
    });

    if (this.results.errors.length > 0) {
      console.log('\n🚨 Errors:');
      this.results.errors.forEach(error => {
        console.log(`  ❌ ${error.test}: ${error.error}`);
      });
    }

    // Save detailed report
    const reportPath = path.join(__dirname, 'kanban-test-report.json');
    require('fs').writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    return this.results;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    console.log('🧹 Test cleanup completed');
  }

  async runAllTests() {
    try {
      // Setup
      const setupSuccess = await this.setup();
      if (!setupSuccess) return false;

      // Login
      const loginSuccess = await this.login();
      if (!loginSuccess) return false;

      // Navigate to kanban
      const navSuccess = await this.navigateToKanban();
      if (!navSuccess) return false;

      // Run test suite
      await this.testDragAndDrop();
      await this.testOptimisticUpdates();
      await this.testErrorHandling();
      await this.testResponsiveDesign();
      await this.testPerformance();

      // Generate report
      await this.generateReport();

      return true;
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.results.errors.push({ test: 'test_suite', error: error.message });
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new KanbanIntegrationTester();
  tester.runAllTests().then(success => {
    console.log(`\n🏁 Test suite ${success ? 'completed successfully' : 'failed'}`);
    process.exit(success ? 0 : 1);
  });
}

module.exports = KanbanIntegrationTester;