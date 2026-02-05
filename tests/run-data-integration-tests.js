#!/usr/bin/env node

/**
 * Data Integration Test Runner
 *
 * Comprehensive test suite runner for the data integration layer
 * with detailed reporting and performance metrics.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TestRunner {
  constructor() {
    this.testResults = {
      startTime: new Date(),
      endTime: null,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      suites: [],
      performance: {},
      coverage: null,
      errors: []
    };

    this.testSuites = [
      {
        name: 'Integration Layer Core',
        file: './data-integration/integration-layer.test.js',
        description: 'Core data integration layer functionality',
        timeout: 30000
      },
      {
        name: 'Response Formatter',
        file: './data-integration/response-formatter.test.js',
        description: 'Data formatting and template rendering',
        timeout: 15000
      },
      {
        name: 'API Endpoints',
        file: './data-integration/api-endpoints.test.js',
        description: 'REST API endpoint security and functionality',
        timeout: 45000
      },
      {
        name: 'Security Validation',
        file: './data-integration/security-validation.test.js',
        description: 'Comprehensive security testing',
        timeout: 60000
      }
    ];
  }

  /**
   * Run all test suites
   */
  async runAll() {
    console.log('🚀 Starting Data Integration Test Suite');
    console.log('=====================================\n');

    this.printEnvironmentInfo();

    try {
      // Setup test environment
      await this.setupTestEnvironment();

      // Run each test suite
      for (const suite of this.testSuites) {
        await this.runTestSuite(suite);
      }

      // Generate coverage report
      await this.generateCoverageReport();

      // Generate final report
      this.generateFinalReport();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.testResults.errors.push({
        type: 'suite_failure',
        message: error.message,
        stack: error.stack
      });
    } finally {
      // Cleanup
      await this.cleanup();
      this.testResults.endTime = new Date();
    }

    return this.testResults;
  }

  /**
   * Print environment information
   */
  printEnvironmentInfo() {
    console.log('📋 Environment Information:');
    console.log(`   Node.js: ${process.version}`);
    console.log(`   Platform: ${process.platform} ${process.arch}`);
    console.log(`   Memory: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB available`);
    console.log(`   Test Environment: ${process.env.NODE_ENV || 'test'}`);
    console.log(`   Database: ${this.checkDatabaseConnection() ? '✅ Connected' : '❌ Disconnected'}`);
    console.log('');
  }

  /**
   * Setup test environment
   */
  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');

    try {
      // Set environment variables
      process.env.NODE_ENV = 'test';
      process.env.JWT_SECRET = 'test-jwt-secret-key';

      // Ensure test database is ready
      await this.setupTestDatabase();

      // Clear any existing cache
      await this.clearCache();

      console.log('✅ Test environment ready\n');
    } catch (error) {
      throw new Error(`Test environment setup failed: ${error.message}`);
    }
  }

  /**
   * Run individual test suite
   */
  async runTestSuite(suite) {
    console.log(`🧪 Running ${suite.name}...`);
    console.log(`   Description: ${suite.description}`);

    const startTime = Date.now();
    let result;

    try {
      // Build Jest command
      const jestCommand = [
        'npx jest',
        suite.file,
        '--verbose',
        '--no-cache',
        '--forceExit',
        '--detectOpenHandles',
        `--testTimeout=${suite.timeout}`,
        '--json',
        '--outputFile=test-results.json'
      ].join(' ');

      // Run the test
      execSync(jestCommand, {
        stdio: 'pipe',
        cwd: path.resolve(__dirname),
        timeout: suite.timeout + 10000 // Add buffer to Jest timeout
      });

      // Read results
      const resultsFile = path.resolve(__dirname, 'test-results.json');
      if (fs.existsSync(resultsFile)) {
        const resultsData = fs.readFileSync(resultsFile, 'utf8');
        result = JSON.parse(resultsData);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Process results
      this.processSuiteResults(suite, result, duration);

      console.log(`   ✅ ${suite.name} completed in ${duration}ms`);

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`   ❌ ${suite.name} failed in ${duration}ms`);

      this.testResults.errors.push({
        suite: suite.name,
        type: 'suite_error',
        message: error.message,
        duration
      });

      // Try to parse partial results
      try {
        const resultsFile = path.resolve(__dirname, 'test-results.json');
        if (fs.existsSync(resultsFile)) {
          const resultsData = fs.readFileSync(resultsFile, 'utf8');
          result = JSON.parse(resultsData);
          this.processSuiteResults(suite, result, duration);
        }
      } catch (parseError) {
        // Could not parse results
        this.testResults.suites.push({
          name: suite.name,
          status: 'failed',
          tests: 0,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration,
          error: error.message
        });
      }
    }

    // Clean up results file
    const resultsFile = path.resolve(__dirname, 'test-results.json');
    if (fs.existsSync(resultsFile)) {
      fs.unlinkSync(resultsFile);
    }

    console.log('');
  }

  /**
   * Process test suite results
   */
  processSuiteResults(suite, result, duration) {
    if (!result || !result.testResults || result.testResults.length === 0) {
      this.testResults.suites.push({
        name: suite.name,
        status: 'unknown',
        tests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration,
        error: 'No test results found'
      });
      return;
    }

    const testResult = result.testResults[0];
    const suiteResult = {
      name: suite.name,
      status: result.success ? 'passed' : 'failed',
      tests: testResult.numPassingTests + testResult.numFailingTests + testResult.numPendingTests,
      passed: testResult.numPassingTests,
      failed: testResult.numFailingTests,
      skipped: testResult.numPendingTests,
      duration,
      coverage: testResult.coverage || null
    };

    // Add failed test details
    if (testResult.assertionResults && testResult.numFailingTests > 0) {
      suiteResult.failures = testResult.assertionResults
        .filter(test => test.status === 'failed')
        .map(test => ({
          title: test.title,
          fullName: test.fullName,
          failureMessages: test.failureMessages
        }));
    }

    this.testResults.suites.push(suiteResult);

    // Update totals
    this.testResults.totalTests += suiteResult.tests;
    this.testResults.passedTests += suiteResult.passed;
    this.testResults.failedTests += suiteResult.failed;
    this.testResults.skippedTests += suiteResult.skipped;
  }

  /**
   * Generate coverage report
   */
  async generateCoverageReport() {
    console.log('📊 Generating coverage report...');

    try {
      const coverageCommand = [
        'npx jest',
        '--coverage',
        '--coverageDirectory=coverage',
        '--coverageReporters=json-summary',
        '--coverageReporters=text',
        '--collectCoverageFrom=services/data-integration/**/*.js',
        '--collectCoverageFrom=routes/api/v1/data-integration.js',
        '--testPathPattern=data-integration',
        '--passWithNoTests'
      ].join(' ');

      execSync(coverageCommand, {
        stdio: 'pipe',
        cwd: path.resolve(__dirname, '..', '..')
      });

      // Read coverage summary
      const coveragePath = path.resolve(__dirname, '..', '..', 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverageData = fs.readFileSync(coveragePath, 'utf8');
        this.testResults.coverage = JSON.parse(coverageData);
      }

      console.log('✅ Coverage report generated\n');
    } catch (error) {
      console.log('⚠️  Coverage report generation failed:', error.message);
      console.log('');
    }
  }

  /**
   * Generate final test report
   */
  generateFinalReport() {
    console.log('📋 Test Results Summary');
    console.log('======================');

    const duration = this.testResults.endTime - this.testResults.startTime;
    const successRate = this.testResults.totalTests > 0 ?
      (this.testResults.passedTests / this.testResults.totalTests * 100).toFixed(1) : 0;

    console.log(`\n📊 Overall Statistics:`);
    console.log(`   Total Tests: ${this.testResults.totalTests}`);
    console.log(`   ✅ Passed: ${this.testResults.passedTests}`);
    console.log(`   ❌ Failed: ${this.testResults.failedTests}`);
    console.log(`   ⏭️  Skipped: ${this.testResults.skippedTests}`);
    console.log(`   Success Rate: ${successRate}%`);
    console.log(`   Total Duration: ${duration}ms`);

    console.log(`\n📁 Test Suites:`);
    this.testResults.suites.forEach(suite => {
      const status = suite.status === 'passed' ? '✅' : suite.status === 'failed' ? '❌' : '⚠️';
      console.log(`   ${status} ${suite.name}: ${suite.passed}/${suite.tests} tests passed (${suite.duration}ms)`);

      if (suite.failures && suite.failures.length > 0) {
        suite.failures.forEach(failure => {
          console.log(`      ❌ ${failure.title}`);
        });
      }
    });

    // Coverage report
    if (this.testResults.coverage && this.testResults.coverage.total) {
      const cov = this.testResults.coverage.total;
      console.log(`\n📈 Coverage Summary:`);
      console.log(`   Lines: ${cov.lines.pct}% (${cov.lines.covered}/${cov.lines.total})`);
      console.log(`   Functions: ${cov.functions.pct}% (${cov.functions.covered}/${cov.functions.total})`);
      console.log(`   Branches: ${cov.branches.pct}% (${cov.branches.covered}/${cov.branches.total})`);
      console.log(`   Statements: ${cov.statements.pct}% (${cov.statements.covered}/${cov.statements.total})`);
    }

    // Performance insights
    console.log(`\n⚡ Performance Insights:`);
    const avgDuration = this.testResults.suites.length > 0 ?
      this.testResults.suites.reduce((sum, s) => sum + s.duration, 0) / this.testResults.suites.length : 0;
    console.log(`   Average Suite Duration: ${avgDuration.toFixed(0)}ms`);

    const slowestSuite = this.testResults.suites.reduce((max, suite) =>
      suite.duration > (max?.duration || 0) ? suite : max, null);
    if (slowestSuite) {
      console.log(`   Slowest Suite: ${slowestSuite.name} (${slowestSuite.duration}ms)`);
    }

    // Errors
    if (this.testResults.errors.length > 0) {
      console.log(`\n🚨 Errors (${this.testResults.errors.length}):`);
      this.testResults.errors.forEach(error => {
        console.log(`   ${error.type}: ${error.message}`);
      });
    }

    // Final status
    console.log('\n' + '='.repeat(50));
    if (this.testResults.failedTests === 0 && this.testResults.errors.length === 0) {
      console.log('🎉 All tests passed! Data integration layer is ready for production.');
    } else {
      console.log('❌ Some tests failed. Please review the issues above before deployment.');
    }
    console.log('='.repeat(50));

    // Save detailed report
    this.saveDetailedReport();
  }

  /**
   * Save detailed report to file
   */
  saveDetailedReport() {
    try {
      const reportPath = path.resolve(__dirname, '..', '..', 'data-integration-test-report.json');
      const reportData = {
        ...this.testResults,
        generatedAt: new Date().toISOString(),
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          nodeEnv: process.env.NODE_ENV
        }
      };

      fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
      console.log(`\n💾 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      console.error('Failed to save detailed report:', error.message);
    }
  }

  /**
   * Setup test database
   */
  async setupTestDatabase() {
    try {
      // Import database module to ensure tables are created
      const { db } = require('../../db');

      // Verify database connection
      const testQuery = db.prepare('SELECT 1 as test').get();
      if (!testQuery || testQuery.test !== 1) {
        throw new Error('Database connection test failed');
      }

      return true;
    } catch (error) {
      throw new Error(`Database setup failed: ${error.message}`);
    }
  }

  /**
   * Check database connection
   */
  checkDatabaseConnection() {
    try {
      const { db } = require('../../db');
      const testQuery = db.prepare('SELECT 1 as test').get();
      return testQuery && testQuery.test === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear cache
   */
  async clearCache() {
    try {
      const CacheManager = require('../../services/data-integration/cache-manager');
      const cache = new CacheManager();
      await cache.clear();
      await cache.close();
    } catch (error) {
      console.warn('Cache clear failed:', error.message);
    }
  }

  /**
   * Cleanup after tests
   */
  async cleanup() {
    try {
      // Clean up any test files
      const tempFiles = [
        path.resolve(__dirname, 'test-results.json'),
        path.resolve(__dirname, '..', '..', 'coverage')
      ];

      tempFiles.forEach(file => {
        if (fs.existsSync(file)) {
          if (fs.statSync(file).isDirectory()) {
            // Keep coverage directory but could clean up if needed
          } else {
            fs.unlinkSync(file);
          }
        }
      });

    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  }

  /**
   * Run specific test suite by name
   */
  async runSpecific(suiteName) {
    const suite = this.testSuites.find(s => s.name.toLowerCase().includes(suiteName.toLowerCase()));

    if (!suite) {
      throw new Error(`Test suite '${suiteName}' not found. Available suites: ${this.testSuites.map(s => s.name).join(', ')}`);
    }

    console.log(`🚀 Running specific test suite: ${suite.name}`);
    console.log('==========================================\n');

    this.printEnvironmentInfo();
    await this.setupTestEnvironment();
    await this.runTestSuite(suite);
    await this.cleanup();

    return this.testResults;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new TestRunner();

  try {
    if (args.length > 0 && args[0] === '--suite') {
      if (args.length < 2) {
        console.error('Please specify a suite name after --suite');
        process.exit(1);
      }
      await runner.runSpecific(args[1]);
    } else {
      await runner.runAll();
    }

    // Exit with appropriate code
    const hasFailures = runner.testResults.failedTests > 0 || runner.testResults.errors.length > 0;
    process.exit(hasFailures ? 1 : 0);

  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = TestRunner;