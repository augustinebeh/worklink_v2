#!/usr/bin/env node

/**
 * Simple Browser Compatibility Test (No External Dependencies)
 * Tests for common browser compatibility issues causing white pages
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🔍 SIMPLE BROWSER COMPATIBILITY TEST');
console.log('=====================================\n');

// Test 1: Check if admin portal is accessible
async function testServerAccess() {
  console.log('1. 🌐 Testing Server Access');
  console.log('---------------------------');

  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:8080/admin/', (res) => {
      console.log(`   ✅ Server Response: ${res.statusCode} ${res.statusMessage}`);
      console.log(`   📄 Content-Type: ${res.headers['content-type']}`);
      console.log(`   📦 Content-Length: ${res.headers['content-length']} bytes`);

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Check if HTML contains expected elements
        const hasRoot = data.includes('<div id="root">');
        const hasModuleScript = data.includes('type="module"');
        const hasCrossorigin = data.includes('crossorigin');
        const hasCSS = data.includes('.css');

        console.log(`   🎯 Has #root element: ${hasRoot ? 'YES' : 'NO'}`);
        console.log(`   📦 Uses ES modules: ${hasModuleScript ? 'YES' : 'NO'}`);
        console.log(`   🌍 Has crossorigin: ${hasCrossorigin ? 'YES' : 'NO'}`);
        console.log(`   🎨 Has CSS: ${hasCSS ? 'YES' : 'NO'}`);

        if (!hasRoot) {
          console.log('   🚨 CRITICAL: Missing #root element!');
        }
        if (hasModuleScript) {
          console.log('   ⚠️  ES modules will fail in IE11 and older browsers');
        }

        resolve({
          accessible: res.statusCode === 200,
          hasRoot,
          hasModuleScript,
          hasCrossorigin,
          hasCSS,
          contentLength: res.headers['content-length'],
          html: data
        });
      });
    });

    req.on('error', (err) => {
      console.log(`   ❌ Server Error: ${err.message}`);
      console.log('   💡 Make sure the server is running: npm start');
      reject(err);
    });

    req.setTimeout(5000, () => {
      console.log('   ⏰ Request timeout - server may be slow or unresponsive');
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Test 2: Check asset files
async function testAssetFiles() {
  console.log('\n2. 📦 Testing Asset Files');
  console.log('--------------------------');

  const adminDistPath = path.join(__dirname, 'admin', 'dist');

  if (!fs.existsSync(adminDistPath)) {
    console.log('   ❌ Admin dist folder not found');
    console.log('   💡 Run: cd admin && npm run build');
    return { assetsExist: false };
  }

  console.log(`   ✅ Dist folder exists: ${adminDistPath}`);

  try {
    const assetsPath = path.join(adminDistPath, 'assets');
    const files = fs.readdirSync(assetsPath);

    const jsFiles = files.filter(f => f.endsWith('.js'));
    const cssFiles = files.filter(f => f.endsWith('.css'));

    console.log(`   📄 JS files: ${jsFiles.length} (${jsFiles.join(', ')})`);
    console.log(`   🎨 CSS files: ${cssFiles.length} (${cssFiles.join(', ')})`);

    // Check file sizes
    let totalSize = 0;
    files.forEach(file => {
      const filePath = path.join(assetsPath, file);
      const size = fs.statSync(filePath).size;
      totalSize += size;
      console.log(`   📊 ${file}: ${(size / 1024 / 1024).toFixed(2)} MB`);
    });

    console.log(`   📈 Total bundle size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

    if (totalSize > 5000000) { // 5MB
      console.log('   ⚠️  Large bundle size may cause loading issues');
    }

    // Check for modern JS features in the main bundle
    if (jsFiles.length > 0) {
      const mainJS = fs.readFileSync(path.join(assetsPath, jsFiles[0]), 'utf-8');

      const features = {
        hasSymbol: mainJS.includes('Symbol.for'),
        hasAsync: /async|await/.test(mainJS),
        hasPromise: mainJS.includes('Promise'),
        hasFetch: mainJS.includes('fetch('),
        hasArrowFunctions: /=>/.test(mainJS),
        hasModules: /import|export/.test(mainJS.substring(0, 1000)), // Check first 1KB
        hasConst: /\bconst\s/.test(mainJS)
      };

      console.log('\n   🚀 Modern JS Features Detected:');
      Object.entries(features).forEach(([feature, present]) => {
        console.log(`   ${present ? '⚠️' : '✅'} ${feature}: ${present ? 'YES' : 'NO'}`);
      });

      return {
        assetsExist: true,
        jsFiles: jsFiles.length,
        cssFiles: cssFiles.length,
        totalSize,
        features
      };
    }

    return {
      assetsExist: true,
      jsFiles: jsFiles.length,
      cssFiles: cssFiles.length,
      totalSize
    };

  } catch (error) {
    console.log(`   ❌ Error reading assets: ${error.message}`);
    return { assetsExist: false, error: error.message };
  }
}

// Test 3: Check for common compatibility issues
async function testCompatibilityIssues() {
  console.log('\n3. 🔧 Testing Compatibility Issues');
  console.log('-----------------------------------');

  const viteConfigPath = path.join(__dirname, 'admin', 'vite.config.js');
  const packageJsonPath = path.join(__dirname, 'admin', 'package.json');

  // Check Vite configuration
  if (fs.existsSync(viteConfigPath)) {
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');

    const hasLegacyPlugin = viteConfig.includes('@vitejs/plugin-legacy');
    const hasBrowserslist = viteConfig.includes('browserslist');
    const hasPolyfills = viteConfig.includes('polyfill');

    console.log(`   📝 Vite Config Analysis:`);
    console.log(`   ${hasLegacyPlugin ? '✅' : '❌'} Legacy plugin: ${hasLegacyPlugin ? 'YES' : 'NO'}`);
    console.log(`   ${hasBrowserslist ? '✅' : '⚠️'} Browserslist: ${hasBrowserslist ? 'YES' : 'NO'}`);
    console.log(`   ${hasPolyfills ? '✅' : '⚠️'} Polyfills: ${hasPolyfills ? 'YES' : 'NO'}`);

    if (!hasLegacyPlugin) {
      console.log('   💡 Consider adding @vitejs/plugin-legacy for IE11 support');
    }
  } else {
    console.log('   ❌ Vite config not found');
  }

  // Check package.json dependencies
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    console.log('\n   📦 Package Analysis:');

    // Check for problematic dependencies
    const problematicDeps = {
      'moment': 'Large bundle size - consider date-fns',
      'lodash': 'Large if not tree-shaken',
      'core-js': 'Polyfill library present'
    };

    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    Object.entries(problematicDeps).forEach(([dep, note]) => {
      const hasDep = deps[dep];
      console.log(`   ${hasDep ? '⚠️' : '✅'} ${dep}: ${hasDep ? `${hasDep} (${note})` : 'Not used'}`);
    });

    // Check for browserslist
    const hasBrowserslist = packageJson.browserslist || fs.existsSync(path.join(__dirname, 'admin', '.browserslistrc'));
    console.log(`   ${hasBrowserslist ? '✅' : '⚠️'} Browserslist config: ${hasBrowserslist ? 'YES' : 'NO'}`);

    // Check React version
    const reactVersion = deps.react;
    console.log(`   ⚛️  React version: ${reactVersion || 'Not found'}`);

    return {
      dependencies: deps,
      hasBrowserslist,
      reactVersion
    };
  }

  return {};
}

// Test 4: Simulate browser errors
function simulateBrowserErrors() {
  console.log('\n4. 🐛 Browser Error Simulation');
  console.log('-------------------------------');

  const scenarios = [
    {
      browser: 'Internet Explorer 11',
      errors: [
        'SyntaxError: Expected identifier (ES6 modules not supported)',
        'ReferenceError: \'Symbol\' is undefined',
        'ReferenceError: \'Promise\' is undefined',
        'ReferenceError: \'fetch\' is undefined'
      ],
      impact: 'Complete failure - white page',
      likelihood: 'High'
    },
    {
      browser: 'Chrome 50-60',
      errors: [
        'SyntaxError: Unexpected token \'export\'',
        'TypeError: Cannot read property of undefined (async/await)',
        'ReferenceError: \'fetch\' is undefined'
      ],
      impact: 'Partial failure - some features broken',
      likelihood: 'Medium'
    },
    {
      browser: 'Firefox 45-59',
      errors: [
        'SyntaxError: import declarations may only appear at top level',
        'TypeError: Assignment to constant variable',
        'ReferenceError: \'fetch\' is undefined'
      ],
      impact: 'Partial failure - some features broken',
      likelihood: 'Medium'
    },
    {
      browser: 'Safari 9-10',
      errors: [
        'SyntaxError: Unexpected keyword \'const\'',
        'TypeError: undefined is not a function (arrow functions)',
        'ReferenceError: \'Symbol\' is undefined'
      ],
      impact: 'Partial to complete failure',
      likelihood: 'Medium'
    },
    {
      browser: 'Network Issues',
      errors: [
        'ERR_NETWORK: Failed to load resource',
        'CORS error: Cross-origin resource sharing policy',
        'ERR_INTERNET_DISCONNECTED'
      ],
      impact: 'Complete failure - assets not loaded',
      likelihood: 'Low but possible'
    }
  ];

  scenarios.forEach((scenario, index) => {
    console.log(`\n   ${index + 1}. ${scenario.browser}`);
    console.log(`   Impact: ${scenario.impact}`);
    console.log(`   Likelihood: ${scenario.likelihood}`);
    console.log('   Common Errors:');
    scenario.errors.forEach(error => {
      console.log(`     • ${error}`);
    });
  });
}

// Test 5: Generate recommendations
function generateRecommendations(testResults) {
  console.log('\n5. 💡 Recommendations');
  console.log('----------------------');

  const recommendations = [];

  // Based on test results
  if (testResults.server && testResults.server.hasModuleScript) {
    recommendations.push({
      priority: 'HIGH',
      issue: 'ES modules without fallback',
      solution: 'Add <script nomodule> fallback for older browsers'
    });
  }

  if (testResults.assets && testResults.assets.features) {
    const features = testResults.assets.features;

    if (features.hasSymbol) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Symbol usage without polyfill',
        solution: 'Add Symbol polyfill or use @vitejs/plugin-legacy'
      });
    }

    if (features.hasFetch) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'fetch API without polyfill',
        solution: 'Add fetch polyfill for IE11 support'
      });
    }

    if (features.hasAsync) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'async/await without transpilation',
        solution: 'Add regenerator-runtime or configure Babel'
      });
    }
  }

  if (testResults.assets && testResults.assets.totalSize > 2000000) {
    recommendations.push({
      priority: 'MEDIUM',
      issue: 'Large bundle size',
      solution: 'Enable code splitting and tree shaking'
    });
  }

  // General recommendations
  recommendations.push(
    {
      priority: 'HIGH',
      issue: 'Browser compatibility detection',
      solution: 'Add browser detection script to show fallback UI'
    },
    {
      priority: 'MEDIUM',
      issue: 'Error boundaries',
      solution: 'Implement React error boundaries for graceful failures'
    },
    {
      priority: 'LOW',
      issue: 'Progressive enhancement',
      solution: 'Start with basic HTML/CSS, enhance with JavaScript'
    }
  );

  // Sort by priority
  const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

  recommendations.forEach((rec, index) => {
    const icon = rec.priority === 'HIGH' ? '🚨' : rec.priority === 'MEDIUM' ? '⚠️' : '💡';
    console.log(`\n   ${index + 1}. ${icon} ${rec.priority}: ${rec.issue}`);
    console.log(`   Solution: ${rec.solution}`);
  });

  return recommendations;
}

// Main test runner
async function runTests() {
  const testResults = {};

  try {
    testResults.server = await testServerAccess();
  } catch (error) {
    testResults.server = { accessible: false, error: error.message };
  }

  testResults.assets = await testAssetFiles();
  testResults.compatibility = await testCompatibilityIssues();

  simulateBrowserErrors();
  const recommendations = generateRecommendations(testResults);

  // Summary
  console.log('\n📊 SUMMARY');
  console.log('==========');

  const serverOK = testResults.server.accessible;
  const assetsOK = testResults.assets.assetsExist;
  const hasModernJS = testResults.assets.features && Object.values(testResults.assets.features).some(f => f);

  console.log(`✅ Server accessible: ${serverOK ? 'YES' : 'NO'}`);
  console.log(`✅ Assets built: ${assetsOK ? 'YES' : 'NO'}`);
  console.log(`⚠️  Uses modern JS: ${hasModernJS ? 'YES' : 'NO'}`);
  console.log(`📈 Bundle size: ${testResults.assets.totalSize ? (testResults.assets.totalSize / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}`);

  console.log('\n🎯 Browser Compatibility Estimate:');
  console.log('Chrome 87+, Firefox 78+, Safari 14+: ✅ Should work');
  console.log('Chrome 61-86, Firefox 60-77: ⚠️  Might work with issues');
  console.log('IE11, Chrome <61, Firefox <60: ❌ Will likely fail');

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    testResults,
    recommendations,
    summary: {
      serverAccessible: serverOK,
      assetsBuilt: assetsOK,
      usesModernJS: hasModernJS,
      estimatedCompatibility: {
        modern: 'Should work',
        intermediate: 'Might work with issues',
        legacy: 'Will likely fail'
      }
    }
  };

  try {
    fs.writeFileSync('simple-browser-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Report saved to simple-browser-test-report.json');
  } catch (error) {
    console.warn('Failed to save report:', error.message);
  }

  return report;
}

// Run if called directly
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\n✅ Simple browser compatibility test complete!');
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  runTests,
  testServerAccess,
  testAssetFiles,
  testCompatibilityIssues
};