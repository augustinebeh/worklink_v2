#!/usr/bin/env node

/**
 * Admin Portal Route Testing Script
 * Tests all admin portal pages for functionality after API refactoring
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://127.0.0.1:3002';
const ADMIN_BASE = `${BASE_URL}/admin`;

// Test credentials - using dev environment
const TEST_CREDENTIALS = {
  username: 'admin@worklink.com',
  password: 'password123'
};

// Define all routes to test with priority levels
const ROUTES_TO_TEST = {
  high: [
    { path: '/', name: 'Dashboard', description: 'Main analytics dashboard' },
    { path: '/jobs', name: 'Jobs', description: 'Job management interface' },
    { path: '/clients', name: 'Clients', description: 'Client management' },
    { path: '/candidates', name: 'Candidates', description: 'Candidate management' }
  ],
  medium: [
    { path: '/financials', name: 'FinancialDashboard', description: 'Financial metrics' },
    { path: '/chat', name: 'Chat', description: 'Real-time messaging' },
    { path: '/payments', name: 'Payments', description: 'Payment processing' },
    { path: '/deployments', name: 'Deployments', description: 'Deployment management' }
  ],
  lower: [
    { path: '/escalation-queue', name: 'EscalationQueue', description: 'Support escalations' },
    { path: '/ai-sourcing', name: 'AISourcing', description: 'AI-powered sourcing' },
    { path: '/retention-analytics', name: 'RetentionAnalytics', description: 'Retention metrics' },
    { path: '/gamification', name: 'Gamification', description: 'Gamification system' },
    { path: '/ad-optimization', name: 'AdOptimization', description: 'Ad optimization' },
    { path: '/telegram-groups', name: 'TelegramGroups', description: 'Telegram integration' },
    { path: '/ml-dashboard', name: 'MLDashboard', description: 'Machine learning dashboard' },
    { path: '/ai-automation', name: 'AIAutomation', description: 'AI automation controls' },
    { path: '/tender-monitor', name: 'TenderMonitor', description: 'Tender monitoring' },
    { path: '/training', name: 'Training', description: 'Training modules' },
    { path: '/bpo', name: 'BPODashboard', description: 'BPO dashboard' },
    { path: '/settings', name: 'Settings', description: 'System settings' },
    { path: '/consultant-performance', name: 'ConsultantPerformance', description: 'Performance metrics' },
    { path: '/interview-scheduling', name: 'InterviewScheduling', description: 'Interview scheduling' }
  ]
};

// Known pages with raw fetch() calls that need special attention
const PAGES_WITH_RAW_FETCH = [
  'AIAutomation.jsx', 'AdOptimization.jsx', 'BPODashboard.jsx', 'Chat.jsx',
  'ConsultantPerformance.jsx', 'MLDashboard.jsx', 'Settings.jsx',
  'TelegramGroups.jsx', 'TenderMonitor.jsx', 'Training.jsx'
];

class AdminPortalTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      summary: {
        totalTested: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      pages: []
    };
  }

  async init() {
    console.log('🚀 Starting Admin Portal Testing...');
    this.browser = await chromium.launch({ headless: false, slowMo: 1000 });
    this.page = await this.browser.newPage();

    // Enable request/response logging
    this.page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`🌐 API Request: ${request.method()} ${request.url()}`);
      }
    });

    this.page.on('response', response => {
      if (response.url().includes('/api/')) {
        const status = response.status();
        const icon = status >= 400 ? '❌' : status >= 300 ? '⚠️' : '✅';
        console.log(`${icon} API Response: ${status} ${response.url()}`);
      }
    });

    // Capture console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🔴 Console Error: ${msg.text()}`);
      }
    });
  }

  async login() {
    console.log('🔑 Attempting login...');
    try {
      await this.page.goto(`${ADMIN_BASE}/login`);
      await this.page.waitForLoadState('networkidle');

      // Fill login form
      await this.page.fill('input[name="email"], input[type="email"]', TEST_CREDENTIALS.username);
      await this.page.fill('input[name="password"], input[type="password"]', TEST_CREDENTIALS.password);

      // Submit form
      await this.page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

      // Wait for redirect to dashboard
      await this.page.waitForURL(`${ADMIN_BASE}/`, { timeout: 10000 });
      console.log('✅ Login successful');
      return true;
    } catch (error) {
      console.log('❌ Login failed:', error.message);
      return false;
    }
  }

  async testPage(route) {
    const pageUrl = `${ADMIN_BASE}${route.path}`;
    const testResult = {
      path: route.path,
      name: route.name,
      description: route.description,
      status: 'UNKNOWN',
      loadTime: 0,
      errors: [],
      warnings: [],
      apiCalls: [],
      hasRawFetch: PAGES_WITH_RAW_FETCH.some(page => page.includes(route.name)),
      notes: []
    };

    console.log(`\n📊 Testing: ${route.name} (${route.path})`);

    const startTime = Date.now();

    try {
      // Track API calls during page load
      const apiCalls = [];
      const responseListener = response => {
        if (response.url().includes('/api/')) {
          apiCalls.push({
            url: response.url(),
            status: response.status(),
            method: response.request().method()
          });
        }
      };
      this.page.on('response', responseListener);

      // Navigate to the page
      await this.page.goto(pageUrl);
      await this.page.waitForLoadState('networkidle', { timeout: 15000 });

      testResult.loadTime = Date.now() - startTime;
      testResult.apiCalls = apiCalls;

      // Remove the response listener
      this.page.off('response', responseListener);

      // Check for basic page elements
      const hasContent = await this.page.locator('body').count() > 0;
      const hasHeader = await this.page.locator('header, .header, h1, h2').count() > 0;

      if (!hasContent) {
        testResult.errors.push('Page has no content');
      }

      if (!hasHeader) {
        testResult.warnings.push('Page has no visible header/title');
      }

      // Check for error states
      const hasErrorMessage = await this.page.locator('[class*="error"], .error, .alert-error').count() > 0;
      if (hasErrorMessage) {
        testResult.warnings.push('Page shows error state');
      }

      // Check for loading states
      const hasLoadingIndicator = await this.page.locator('[class*="loading"], [class*="spinner"], .loading').count() > 0;
      if (hasLoadingIndicator) {
        testResult.warnings.push('Page still showing loading state');
      }

      // Special checks for pages with raw fetch calls
      if (testResult.hasRawFetch) {
        testResult.warnings.push('Page uses raw fetch() calls - may have API integration issues');
      }

      // Check for failed API calls
      const failedCalls = apiCalls.filter(call => call.status >= 400);
      if (failedCalls.length > 0) {
        testResult.errors.push(`Failed API calls: ${failedCalls.map(c => `${c.method} ${c.url} (${c.status})`).join(', ')}`);
      }

      // Determine overall status
      if (testResult.errors.length > 0) {
        testResult.status = 'FAIL';
      } else if (testResult.warnings.length > 0) {
        testResult.status = 'WARN';
      } else {
        testResult.status = 'PASS';
      }

      console.log(`${testResult.status === 'PASS' ? '✅' : testResult.status === 'WARN' ? '⚠️' : '❌'} ${route.name}: ${testResult.status}`);
      if (testResult.loadTime > 5000) {
        console.log(`⚠️ Slow load time: ${testResult.loadTime}ms`);
      }

    } catch (error) {
      testResult.status = 'FAIL';
      testResult.errors.push(`Navigation failed: ${error.message}`);
      console.log(`❌ ${route.name}: FAIL - ${error.message}`);
    }

    this.results.pages.push(testResult);
    this.results.summary.totalTested++;

    switch (testResult.status) {
      case 'PASS': this.results.summary.passed++; break;
      case 'WARN': this.results.summary.warnings++; break;
      case 'FAIL': this.results.summary.failed++; break;
    }

    return testResult;
  }

  async runTests() {
    if (!(await this.login())) {
      throw new Error('Could not login to admin portal');
    }

    console.log('\n🎯 Testing High Priority Pages...');
    for (const route of ROUTES_TO_TEST.high) {
      await this.testPage(route);
    }

    console.log('\n🎯 Testing Medium Priority Pages...');
    for (const route of ROUTES_TO_TEST.medium) {
      await this.testPage(route);
    }

    console.log('\n🎯 Testing Lower Priority Pages...');
    for (const route of ROUTES_TO_TEST.lower) {
      await this.testPage(route);
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.results.summary,
      pages: this.results.pages,
      recommendations: []
    };

    // Generate recommendations
    const pagesWithRawFetch = this.results.pages.filter(p => p.hasRawFetch);
    if (pagesWithRawFetch.length > 0) {
      report.recommendations.push({
        priority: 'HIGH',
        category: 'API Migration',
        description: `${pagesWithRawFetch.length} pages still use raw fetch() calls and should be migrated to centralized API services`,
        pages: pagesWithRawFetch.map(p => p.name)
      });
    }

    const failedPages = this.results.pages.filter(p => p.status === 'FAIL');
    if (failedPages.length > 0) {
      report.recommendations.push({
        priority: 'HIGH',
        category: 'Critical Fixes',
        description: `${failedPages.length} pages failed to load or have critical errors`,
        pages: failedPages.map(p => p.name)
      });
    }

    const slowPages = this.results.pages.filter(p => p.loadTime > 5000);
    if (slowPages.length > 0) {
      report.recommendations.push({
        priority: 'MEDIUM',
        category: 'Performance',
        description: `${slowPages.length} pages have slow load times (>5s)`,
        pages: slowPages.map(p => `${p.name} (${p.loadTime}ms)`)
      });
    }

    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  printSummary() {
    const { summary } = this.results;
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    console.log(`Total Pages Tested: ${summary.totalTested}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`⚠️ Warnings: ${summary.warnings}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`📈 Success Rate: ${((summary.passed / summary.totalTested) * 100).toFixed(1)}%`);
  }
}

async function main() {
  const tester = new AdminPortalTester();

  try {
    await tester.init();
    await tester.runTests();

    const report = tester.generateReport();

    // Save detailed report
    fs.writeFileSync('./admin-portal-test-results.json', JSON.stringify(report, null, 2));

    tester.printSummary();

    console.log('\n📋 Detailed results saved to: admin-portal-test-results.json');

  } catch (error) {
    console.error('❌ Test run failed:', error);
  } finally {
    await tester.cleanup();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default AdminPortalTester;