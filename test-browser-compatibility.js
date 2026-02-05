#!/usr/bin/env node

/**
 * Browser Compatibility Test Suite
 * Simulates various browser environments to test compatibility issues
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Browser configurations to test
const browserConfigs = [
  {
    name: 'Chrome Modern',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    expected: 'success'
  },
  {
    name: 'Chrome Old',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    expected: 'partial'
  },
  {
    name: 'Firefox Modern',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    viewport: { width: 1920, height: 1080 },
    expected: 'success'
  },
  {
    name: 'Firefox Old',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:59.0) Gecko/20100101 Firefox/59.0',
    viewport: { width: 1920, height: 1080 },
    expected: 'partial'
  },
  {
    name: 'Safari Modern',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    viewport: { width: 1920, height: 1080 },
    expected: 'success'
  },
  {
    name: 'Safari Old',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/10.0.3 Safari/602.4.8',
    viewport: { width: 1920, height: 1080 },
    expected: 'failure'
  },
  {
    name: 'Mobile Chrome',
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    viewport: { width: 375, height: 667 },
    expected: 'success'
  },
  {
    name: 'Mobile Safari',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 375, height: 812 },
    expected: 'success'
  },
  {
    name: 'Edge Modern',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    viewport: { width: 1920, height: 1080 },
    expected: 'success'
  }
];

async function testBrowserCompatibility() {
  console.log('🧪 BROWSER COMPATIBILITY TEST SUITE');
  console.log('====================================\n');

  const results = [];

  for (const config of browserConfigs) {
    console.log(`🔍 Testing: ${config.name}`);
    console.log(`   User Agent: ${config.userAgent.substring(0, 80)}...`);

    try {
      const result = await testSingleBrowser(config);
      results.push(result);

      console.log(`   ✅ Status: ${result.status}`);
      console.log(`   ⏱️  Load Time: ${result.loadTime}ms`);
      console.log(`   📊 Errors: ${result.errors.length}`);
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(`      - ${error}`);
        });
      }
      console.log();

    } catch (error) {
      const result = {
        browser: config.name,
        status: 'test-failed',
        error: error.message,
        loadTime: 0,
        errors: [error.message],
        warnings: [],
        features: {}
      };
      results.push(result);

      console.log(`   ❌ Test Failed: ${error.message}`);
      console.log();
    }
  }

  // Generate report
  generateCompatibilityReport(results);

  return results;
}

async function testSingleBrowser(config) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set user agent and viewport
    await page.setUserAgent(config.userAgent);
    await page.setViewport(config.viewport);

    const errors = [];
    const warnings = [];
    const features = {};

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`Console Error: ${msg.text()}`);
      } else if (msg.type() === 'warn') {
        warnings.push(`Console Warning: ${msg.text()}`);
      }
    });

    // Capture JavaScript errors
    page.on('pageerror', error => {
      errors.push(`Page Error: ${error.message}`);
    });

    // Capture failed requests
    page.on('requestfailed', request => {
      errors.push(`Request Failed: ${request.url()} - ${request.failure().errorText}`);
    });

    const startTime = Date.now();

    // Navigate to the admin portal
    await page.goto('http://localhost:8080/admin/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    const loadTime = Date.now() - startTime;

    // Wait a bit for JavaScript to execute
    await page.waitForTimeout(2000);

    // Test for React app mounting
    const hasReactRoot = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    });

    // Test for specific elements
    const hasLoginForm = await page.$('.login-form, [data-testid="login-form"], form') !== null;
    const hasDashboard = await page.$('.dashboard, [data-testid="dashboard"]') !== null;
    const hasErrorMessage = await page.$('.error, [data-testid="error"]') !== null;

    // Test JavaScript features
    features.hasReact = hasReactRoot;
    features.hasLoginForm = hasLoginForm;
    features.hasDashboard = hasDashboard;
    features.hasErrorMessage = hasErrorMessage;

    // Test browser capabilities
    const browserCapabilities = await page.evaluate(() => {
      return {
        hasSymbol: typeof Symbol !== 'undefined',
        hasPromise: typeof Promise !== 'undefined',
        hasFetch: typeof fetch !== 'undefined',
        hasArrowFunctions: (() => { try { eval('() => {}'); return true; } catch { return false; } })(),
        hasModules: 'noModule' in document.createElement('script'),
        hasFlexbox: CSS.supports && CSS.supports('display', 'flex'),
        hasGrid: CSS.supports && CSS.supports('display', 'grid'),
        hasAsyncAwait: (() => { try { eval('async function test() { await Promise.resolve(); }'); return true; } catch { return false; } })()
      };
    });

    features.browserCapabilities = browserCapabilities;

    // Determine overall status
    let status;
    if (errors.length === 0 && hasReactRoot) {
      status = 'success';
    } else if (errors.length > 0 && hasReactRoot) {
      status = 'partial';
    } else if (hasErrorMessage) {
      status = 'graceful-failure';
    } else {
      status = 'failure';
    }

    // Take screenshot for visual verification
    const screenshotPath = path.join(__dirname, `screenshots/browser-test-${config.name.replace(/\s+/g, '-').toLowerCase()}.png`);
    try {
      await fs.promises.mkdir(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: false });
    } catch (screenshotError) {
      warnings.push(`Screenshot failed: ${screenshotError.message}`);
    }

    return {
      browser: config.name,
      userAgent: config.userAgent,
      viewport: config.viewport,
      status,
      loadTime,
      errors,
      warnings,
      features,
      expected: config.expected,
      passed: (status === config.expected) ||
              (config.expected === 'success' && status === 'partial') ||
              (config.expected === 'partial' && (status === 'success' || status === 'graceful-failure'))
    };

  } finally {
    await browser.close();
  }
}

function generateCompatibilityReport(results) {
  console.log('📊 BROWSER COMPATIBILITY REPORT');
  console.log('=================================\n');

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`✅ Passed: ${passed}/${total} (${(passed/total*100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed}/${total} (${(failed/total*100).toFixed(1)}%)`);
  console.log();

  // Detailed results
  console.log('📋 Detailed Results:');
  console.log('-------------------');
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.browser.padEnd(20)} ${result.status.padEnd(15)} ${result.loadTime}ms`);

    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.slice(0, 2).join(', ')}`);
      if (result.errors.length > 2) {
        console.log(`   ... and ${result.errors.length - 2} more`);
      }
    }
  });
  console.log();

  // Feature support matrix
  console.log('🎯 Feature Support Matrix:');
  console.log('--------------------------');
  const featureNames = [
    'hasSymbol', 'hasPromise', 'hasFetch', 'hasArrowFunctions',
    'hasModules', 'hasFlexbox', 'hasGrid', 'hasAsyncAwait'
  ];

  console.log('Browser'.padEnd(20) + featureNames.map(f => f.substring(3, 6)).join(' '));
  console.log('-'.repeat(20 + featureNames.length * 4));

  results.forEach(result => {
    if (result.features && result.features.browserCapabilities) {
      const caps = result.features.browserCapabilities;
      const line = result.browser.substring(0, 19).padEnd(20) +
        featureNames.map(feature => caps[feature] ? ' ✓ ' : ' ✗ ').join('');
      console.log(line);
    }
  });
  console.log();

  // Common issues
  const allErrors = results.flatMap(r => r.errors);
  const errorCounts = {};
  allErrors.forEach(error => {
    const key = error.substring(0, 50);
    errorCounts[key] = (errorCounts[key] || 0) + 1;
  });

  if (Object.keys(errorCounts).length > 0) {
    console.log('🚨 Common Issues:');
    console.log('-----------------');
    Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([error, count]) => {
        console.log(`${count}x ${error}...`);
      });
    console.log();
  }

  // Recommendations
  console.log('💡 Recommendations:');
  console.log('-------------------');

  const failedBrowsers = results.filter(r => !r.passed);
  const hasModuleErrors = allErrors.some(e => e.includes('module') || e.includes('import'));
  const hasSymbolErrors = allErrors.some(e => e.includes('Symbol'));
  const hasFetchErrors = allErrors.some(e => e.includes('fetch'));

  if (hasModuleErrors) {
    console.log('• Add ES module fallback with <script nomodule> tags');
  }
  if (hasSymbolErrors) {
    console.log('• Add Symbol polyfill for older browsers');
  }
  if (hasFetchErrors) {
    console.log('• Add fetch polyfill for IE11 and older browsers');
  }
  if (failedBrowsers.length > 0) {
    console.log('• Consider adding browser detection and fallback UI');
    console.log('• Test with @vitejs/plugin-legacy for automatic polyfills');
  }
  if (results.some(r => r.loadTime > 5000)) {
    console.log('• Optimize bundle size for faster loading');
  }

  console.log();

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed,
      failed,
      passRate: (passed/total*100).toFixed(1) + '%'
    },
    results,
    recommendations: []
  };

  try {
    fs.writeFileSync('browser-compatibility-test-report.json', JSON.stringify(report, null, 2));
    console.log('📄 Detailed report saved to browser-compatibility-test-report.json');
  } catch (error) {
    console.error('Failed to save report:', error.message);
  }
}

// CLI interface
if (require.main === module) {
  console.log('Starting browser compatibility tests...');
  console.log('Make sure the admin portal server is running on http://localhost:8080\n');

  testBrowserCompatibility()
    .then(() => {
      console.log('✅ Browser compatibility testing complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Browser compatibility testing failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testBrowserCompatibility,
  testSingleBrowser,
  browserConfigs
};