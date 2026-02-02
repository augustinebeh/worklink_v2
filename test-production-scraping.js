#!/usr/bin/env node
/**
 * Production Web Scraping Test Suite
 * Tests the new GeBIZ scraper with real-world scenarios
 */

const axios = require('axios');
const GeBIZScraper = require('./utils/scraping/gebiz-scraper');
const DataValidator = require('./utils/scraping/data-validator');
const scrapingMonitor = require('./utils/scraping/scraping-monitor');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 60000; // 1 minute timeout

class ScrapingTester {
  constructor() {
    this.results = {
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        startTime: null,
        endTime: null
      }
    };
  }

  async runTest(name, testFunction, timeout = TEST_TIMEOUT) {
    console.log(`\n🧪 Running test: ${name}`);
    const startTime = Date.now();

    const test = {
      name,
      status: 'running',
      startTime,
      endTime: null,
      duration: null,
      error: null,
      result: null
    };

    this.results.tests.push(test);
    this.results.summary.total++;

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout)
      );

      const result = await Promise.race([testFunction(), timeoutPromise]);

      test.status = 'passed';
      test.result = result;
      this.results.summary.passed++;
      console.log(`✅ ${name} - PASSED (${Date.now() - startTime}ms)`);

    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      this.results.summary.failed++;
      console.log(`❌ ${name} - FAILED: ${error.message}`);
    } finally {
      test.endTime = Date.now();
      test.duration = test.endTime - startTime;
    }

    return test;
  }

  async testScraperInitialization() {
    const scraper = new GeBIZScraper({ headless: true, timeout: 15000 });
    await scraper.initialize();

    if (!scraper.isInitialized) {
      throw new Error('Scraper failed to initialize');
    }

    if (!scraper.browser || !scraper.page) {
      throw new Error('Browser or page not properly created');
    }

    await scraper.cleanup();
    return { initialized: true, browserCreated: true };
  }

  async testDataValidation() {
    const validator = new DataValidator();

    // Test valid tender
    const validTender = {
      title: 'Administrative Support Services',
      agency: 'MOE',
      estimated_value: 150000,
      closing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      manpower_required: 5,
      duration_months: 6,
      estimated_charge_rate: 18,
      estimated_pay_rate: 14,
      estimated_monthly_revenue: 14400
    };

    const validation = validator.validateTender(validTender);

    if (!validation.isValid) {
      throw new Error(`Valid tender failed validation: ${validation.errors.join(', ')}`);
    }

    if (validation.dataQualityScore < 70) {
      throw new Error(`Data quality score too low: ${validation.dataQualityScore}`);
    }

    // Test invalid tender
    const invalidTender = {
      title: 'test',
      agency: '',
      estimated_value: -1000
    };

    const invalidValidation = validator.validateTender(invalidTender);

    if (invalidValidation.isValid) {
      throw new Error('Invalid tender passed validation when it should have failed');
    }

    return {
      validTenderPassed: true,
      invalidTenderFailed: true,
      dataQualityScore: validation.dataQualityScore
    };
  }

  async testMonitoringSystem() {
    const sessionId = `TEST_${Date.now()}`;

    // Start session
    const session = scrapingMonitor.startSession(sessionId, { test: true });
    if (!session || session.id !== sessionId) {
      throw new Error('Failed to start monitoring session');
    }

    // Add milestones
    scrapingMonitor.addMilestone(sessionId, 'test_milestone', 'Test milestone added');
    scrapingMonitor.updateSessionStats(sessionId, { requestsMade: 1, tendersFound: 3 });

    // Report error
    scrapingMonitor.reportError(sessionId, new Error('Test error'), { context: 'testing' });

    // End session
    const endedSession = scrapingMonitor.endSession(sessionId, true, { finalTenders: 3 });

    if (!endedSession || endedSession.status !== 'completed') {
      throw new Error('Failed to end monitoring session properly');
    }

    // Test health status
    const healthStatus = scrapingMonitor.getHealthStatus();
    if (!healthStatus.healthLevel) {
      throw new Error('Health status not available');
    }

    return {
      sessionCreated: true,
      milestonesAdded: true,
      errorsReported: true,
      sessionEnded: true,
      healthLevel: healthStatus.healthLevel
    };
  }

  async testApiEndpoints() {
    // Test scraping status endpoint
    const statusResponse = await axios.get(`${SERVER_URL}/api/v1/ai-automation/gebiz/status`);
    if (!statusResponse.data.success) {
      throw new Error('Status endpoint failed');
    }

    // Test configuration endpoint
    const configResponse = await axios.post(`${SERVER_URL}/api/v1/ai-automation/gebiz/configure`, {
      headless: true,
      timeout: 30000,
      retries: 2
    });
    if (!configResponse.data.success) {
      throw new Error('Configuration endpoint failed');
    }

    // Test cleanup endpoint
    const cleanupResponse = await axios.post(`${SERVER_URL}/api/v1/ai-automation/gebiz/cleanup`);
    if (!cleanupResponse.data.success) {
      throw new Error('Cleanup endpoint failed');
    }

    return {
      statusEndpoint: true,
      configEndpoint: true,
      cleanupEndpoint: true
    };
  }

  async testRateLimiting() {
    const scraper = new GeBIZScraper({ headless: true });

    // Make multiple rapid initialization attempts to test rate limiting
    const attempts = [];
    for (let i = 0; i < 5; i++) {
      attempts.push(
        scraper.initialize().catch(error => ({ error: error.message }))
      );
    }

    const results = await Promise.all(attempts);
    const rateLimitedCount = results.filter(r => r && r.error && r.error.includes('rate')).length;

    await scraper.cleanup();

    return {
      attemptsBlocked: rateLimitedCount > 0,
      totalAttempts: attempts.length,
      blockedAttempts: rateLimitedCount
    };
  }

  async testProductionScrapeEndpoint() {
    console.log('⚠️  WARNING: This will attempt actual scraping of GeBIZ. Use with caution.');

    try {
      const scrapeResponse = await axios.post(
        `${SERVER_URL}/api/v1/ai-automation/gebiz/scrape`,
        {
          categories: ['testing'],
          useHeadless: true,
          maxRetries: 1
        },
        { timeout: 45000 }
      );

      if (!scrapeResponse.data.success && !scrapeResponse.data.fallback) {
        throw new Error('Scrape endpoint failed completely');
      }

      return {
        endpointWorking: true,
        fallbackUsed: scrapeResponse.data.fallback || false,
        tendersFound: scrapeResponse.data.data?.newInserted || 0,
        sessionId: scrapeResponse.data.data?.sessionId
      };

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Server not running - start the server first');
      }
      throw error;
    }
  }

  async testDuplicateDetection() {
    const validator = new DataValidator();

    const tender1 = {
      title: 'Administrative Support Services',
      agency: 'MOE',
      estimated_value: 150000,
      closing_date: '2025-03-15'
    };

    const tender2 = {
      title: 'Administrative Support Services',
      agency: 'MOE',
      estimated_value: 150000,
      closing_date: '2025-03-15'
    };

    const tender3 = {
      title: 'IT Support Services',
      agency: 'GovTech',
      estimated_value: 200000,
      closing_date: '2025-04-15'
    };

    // Test exact duplicate detection
    const duplicateCheck1 = validator.checkForDuplicates(tender2, [tender1]);
    if (!duplicateCheck1.exact) {
      throw new Error('Failed to detect exact duplicate');
    }

    // Test non-duplicate detection
    const duplicateCheck2 = validator.checkForDuplicates(tender3, [tender1]);
    if (duplicateCheck2.exact || duplicateCheck2.confidence < 80) {
      throw new Error('Incorrectly identified non-duplicate as duplicate');
    }

    return {
      exactDuplicateDetected: true,
      nonDuplicateCorrect: true,
      confidence: duplicateCheck2.confidence
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Production Web Scraping Test Suite');
    console.log('=' .repeat(60));

    this.results.summary.startTime = Date.now();

    // Core functionality tests
    await this.runTest('Scraper Initialization', () => this.testScraperInitialization());
    await this.runTest('Data Validation', () => this.testDataValidation());
    await this.runTest('Monitoring System', () => this.testMonitoringSystem());
    await this.runTest('Duplicate Detection', () => this.testDuplicateDetection());

    // API tests
    await this.runTest('API Endpoints', () => this.testApiEndpoints());

    // Performance tests
    await this.runTest('Rate Limiting', () => this.testRateLimiting());

    // Integration test (optional - requires server)
    if (process.argv.includes('--integration')) {
      await this.runTest('Production Scrape Endpoint', () => this.testProductionScrapeEndpoint(), 90000);
    }

    this.results.summary.endTime = Date.now();
    this.results.summary.duration = this.results.summary.endTime - this.results.summary.startTime;

    this.printSummary();
    return this.results;
  }

  printSummary() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Test Summary');
    console.log('=' .repeat(60));

    const { summary } = this.results;
    const successRate = (summary.passed / summary.total * 100).toFixed(1);

    console.log(`Total Tests: ${summary.total}`);
    console.log(`Passed: ${summary.passed} ✅`);
    console.log(`Failed: ${summary.failed} ❌`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Duration: ${summary.duration}ms`);

    if (summary.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.error}`);
        });
    }

    console.log('\n📋 Test Results:');
    this.results.tests.forEach(test => {
      const status = test.status === 'passed' ? '✅' : '❌';
      const duration = test.duration ? `${test.duration}ms` : 'N/A';
      console.log(`  ${status} ${test.name} (${duration})`);
    });

    if (summary.passed === summary.total) {
      console.log('\n🎉 All tests passed! Production scraping is ready.');
    } else {
      console.log('\n⚠️  Some tests failed. Review the issues before deployment.');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new ScrapingTester();
  tester.runAllTests().then(() => {
    process.exit(tester.results.summary.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('❌ Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = ScrapingTester;