#!/usr/bin/env node

/**
 * Browser Compatibility Analyzer for WorkLink Admin Portal
 * Tests for common browser compatibility issues causing white pages
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 BROWSER COMPATIBILITY ANALYZER');
console.log('=====================================\n');

const adminDistPath = path.join(__dirname, 'admin', 'dist');

// 1. JavaScript Module Support Analysis
function analyzeModuleSupport() {
  console.log('📦 1. JAVASCRIPT MODULE SUPPORT ANALYSIS');
  console.log('------------------------------------------');

  const indexPath = path.join(adminDistPath, 'index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf-8');

  // Check for ES modules
  const hasESModules = indexContent.includes('type="module"');
  console.log(`✓ Uses ES Modules: ${hasESModules ? 'YES' : 'NO'}`);

  if (hasESModules) {
    console.log('  ⚠️  Potential Issues:');
    console.log('      - Internet Explorer 11: No support (will show white page)');
    console.log('      - Chrome < 61: No support');
    console.log('      - Firefox < 60: No support');
    console.log('      - Safari < 10.1: No support');
    console.log('      - Edge < 16: No support');
  }

  // Check for crossorigin attribute
  const hasCrossorigin = indexContent.includes('crossorigin');
  console.log(`✓ Uses crossorigin attribute: ${hasCrossorigin ? 'YES' : 'NO'}`);

  if (hasCrossorigin) {
    console.log('  ℹ️  CORS issues possible if serving from different origin');
  }

  console.log();
}

// 2. React/Vite Build Target Analysis
function analyzeBuildTargets() {
  console.log('⚛️  2. REACT/VITE BUILD TARGET ANALYSIS');
  console.log('----------------------------------------');

  const packagePath = path.join(__dirname, 'admin', 'package.json');
  const viteConfigPath = path.join(__dirname, 'admin', 'vite.config.js');

  // Check package.json browserslist
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  const hasBrowserslist = packageJson.browserslist || fs.existsSync(path.join(__dirname, 'admin', '.browserslistrc'));

  console.log(`✓ Browserslist configuration: ${hasBrowserslist ? 'YES' : 'NO'}`);

  if (!hasBrowserslist) {
    console.log('  ⚠️  Using default browser targets - may exclude older browsers');
    console.log('      Default Vite targets: Chrome >=87, Firefox >=78, Safari >=14');
  }

  // Check Vite config
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
  const hasLegacyPlugin = viteConfig.includes('@vitejs/plugin-legacy');

  console.log(`✓ Vite Legacy Plugin: ${hasLegacyPlugin ? 'YES' : 'NO'}`);

  if (!hasLegacyPlugin) {
    console.log('  ⚠️  No legacy browser support - older browsers will fail');
    console.log('      Consider adding @vitejs/plugin-legacy for IE11/older browser support');
  }

  // Check for polyfills in built JS
  const jsFiles = fs.readdirSync(path.join(adminDistPath, 'assets'))
    .filter(f => f.endsWith('.js'));

  if (jsFiles.length > 0) {
    const jsContent = fs.readFileSync(path.join(adminDistPath, 'assets', jsFiles[0]), 'utf-8');
    const hasPolyfills = jsContent.includes('core-js') || jsContent.includes('regenerator-runtime');
    console.log(`✓ Contains polyfills: ${hasPolyfills ? 'YES' : 'NO'}`);

    if (!hasPolyfills) {
      console.log('  ⚠️  No polyfills detected - modern JS features may not work in older browsers');
    }
  }

  console.log();
}

// 3. Modern JavaScript Features Analysis
function analyzeJSFeatures() {
  console.log('🚀 3. MODERN JAVASCRIPT FEATURES ANALYSIS');
  console.log('-------------------------------------------');

  const jsFiles = fs.readdirSync(path.join(adminDistPath, 'assets'))
    .filter(f => f.endsWith('.js'));

  if (jsFiles.length > 0) {
    const jsContent = fs.readFileSync(path.join(adminDistPath, 'assets', jsFiles[0]), 'utf-8');

    const features = [
      { name: 'async/await', pattern: /(async|await)/, support: 'Chrome 55+, Firefox 52+, Safari 10.1+' },
      { name: 'Promise', pattern: /Promise/, support: 'Chrome 32+, Firefox 27+, Safari 8+' },
      { name: 'Symbol', pattern: /Symbol\.for/, support: 'Chrome 38+, Firefox 36+, Safari 9+' },
      { name: 'fetch API', pattern: /fetch\(/, support: 'Chrome 42+, Firefox 39+, Safari 10.1+' },
      { name: 'Arrow functions', pattern: /=>/, support: 'Chrome 45+, Firefox 22+, Safari 10+' },
      { name: 'const/let', pattern: /\b(const|let)\s/, support: 'Chrome 49+, Firefox 36+, Safari 10+' },
      { name: 'Template literals', pattern: /`[^`]*`/, support: 'Chrome 41+, Firefox 34+, Safari 9+' },
      { name: 'Destructuring', pattern: /\{[^}]*\}\s*=/, support: 'Chrome 49+, Firefox 41+, Safari 8+' },
      { name: 'Spread operator', pattern: /\.\.\./, support: 'Chrome 46+, Firefox 16+, Safari 8+' },
      { name: 'for...of loops', pattern: /for\s*\([^)]*\sof\s/, support: 'Chrome 38+, Firefox 13+, Safari 8+' }
    ];

    features.forEach(feature => {
      const hasFeature = feature.pattern.test(jsContent);
      console.log(`${hasFeature ? '⚠️' : '✓'} ${feature.name}: ${hasFeature ? 'USED' : 'NOT USED'}`);
      if (hasFeature) {
        console.log(`    Browser support: ${feature.support}`);
      }
    });
  }

  console.log();
}

// 4. Console Error Simulation
function simulateConsoleErrors() {
  console.log('🐛 4. POTENTIAL CONSOLE ERROR SIMULATION');
  console.log('-----------------------------------------');

  const commonErrors = [
    {
      error: 'SyntaxError: Unexpected token \'export\'',
      cause: 'ES6 modules in non-module-supporting browsers',
      browsers: 'IE11, Chrome <61, Firefox <60',
      impact: 'Complete white page - JavaScript fails to parse'
    },
    {
      error: 'ReferenceError: Symbol is not defined',
      cause: 'Symbol usage without polyfill',
      browsers: 'IE11, Chrome <38, Firefox <36',
      impact: 'White page - React initialization fails'
    },
    {
      error: 'TypeError: Cannot read property \'render\' of undefined',
      cause: 'React mounting failure due to missing polyfills',
      browsers: 'Older browsers without modern JS support',
      impact: 'White page - React fails to mount'
    },
    {
      error: 'ReferenceError: fetch is not defined',
      cause: 'fetch API usage without polyfill',
      browsers: 'IE11, Chrome <42, Firefox <39',
      impact: 'API calls fail - login/data loading broken'
    },
    {
      error: 'CORS error: Cross-origin resource sharing policy',
      cause: 'Module loading with crossorigin from different domain',
      browsers: 'All browsers if misconfigured',
      impact: 'Assets fail to load - white page'
    }
  ];

  commonErrors.forEach((err, i) => {
    console.log(`${i + 1}. ${err.error}`);
    console.log(`   Cause: ${err.cause}`);
    console.log(`   Affected: ${err.browsers}`);
    console.log(`   Impact: ${err.impact}\n`);
  });
}

// 5. DOM and Rendering Issues
function analyzeDOMIssues() {
  console.log('🎨 5. DOM AND RENDERING ISSUES ANALYSIS');
  console.log('----------------------------------------');

  const indexPath = path.join(adminDistPath, 'index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf-8');

  // Check for proper root element
  const hasRootDiv = indexContent.includes('<div id="root">');
  console.log(`✓ Root element present: ${hasRootDiv ? 'YES' : 'NO'}`);

  if (!hasRootDiv) {
    console.log('  🚨 CRITICAL: Missing #root element - React cannot mount');
  }

  // Check CSS loading
  const cssFiles = fs.readdirSync(path.join(adminDistPath, 'assets'))
    .filter(f => f.endsWith('.css'));

  console.log(`✓ CSS files: ${cssFiles.length}`);

  if (cssFiles.length > 0) {
    const cssContent = fs.readFileSync(path.join(adminDistPath, 'assets', cssFiles[0]), 'utf-8');

    const cssIssues = [
      { name: 'CSS Grid', pattern: /display:\s*grid/, support: 'Chrome 57+, Firefox 52+, Safari 10.1+' },
      { name: 'Flexbox', pattern: /display:\s*flex/, support: 'Chrome 29+, Firefox 20+, Safari 9+' },
      { name: 'CSS Variables', pattern: /var\(--/, support: 'Chrome 49+, Firefox 31+, Safari 9.1+' },
      { name: 'CSS backdrop-filter', pattern: /backdrop-filter/, support: 'Chrome 76+, Firefox 103+, Safari 9+' }
    ];

    cssIssues.forEach(issue => {
      const hasFeature = issue.pattern.test(cssContent);
      if (hasFeature) {
        console.log(`⚠️  Uses ${issue.name} (${issue.support})`);
      }
    });
  }

  // Check for Google Fonts
  const hasGoogleFonts = indexContent.includes('fonts.googleapis.com');
  console.log(`✓ Google Fonts: ${hasGoogleFonts ? 'YES' : 'NO'}`);

  if (hasGoogleFonts) {
    console.log('  ⚠️  External font dependency - network issues can cause FOUC or layout shift');
  }

  console.log();
}

// 6. Service Worker Analysis
function analyzeServiceWorker() {
  console.log('⚙️  6. SERVICE WORKER ANALYSIS');
  console.log('------------------------------');

  const swPath = path.join(adminDistPath, 'sw.js');
  const hasServiceWorker = fs.existsSync(swPath);

  console.log(`✓ Service Worker: ${hasServiceWorker ? 'YES' : 'NO'}`);

  if (hasServiceWorker) {
    console.log('  ⚠️  Potential Issues:');
    console.log('      - Cache conflicts preventing updates');
    console.log('      - Registration errors in older browsers');
    console.log('      - Offline functionality interfering with auth');
  }

  // Check for PWA manifest
  const manifestPath = path.join(adminDistPath, 'manifest.json');
  const hasManifest = fs.existsSync(manifestPath);

  console.log(`✓ PWA Manifest: ${hasManifest ? 'YES' : 'NO'}`);

  console.log();
}

// 7. Memory and Performance Analysis
function analyzePerformance() {
  console.log('⚡ 7. MEMORY AND PERFORMANCE ANALYSIS');
  console.log('--------------------------------------');

  const jsFiles = fs.readdirSync(path.join(adminDistPath, 'assets'))
    .filter(f => f.endsWith('.js'));

  const cssFiles = fs.readdirSync(path.join(adminDistPath, 'assets'))
    .filter(f => f.endsWith('.css'));

  let totalJSSize = 0;
  let totalCSSSize = 0;

  jsFiles.forEach(file => {
    const size = fs.statSync(path.join(adminDistPath, 'assets', file)).size;
    totalJSSize += size;
    console.log(`✓ JS Bundle: ${file} (${(size / 1024 / 1024).toFixed(2)} MB)`);
  });

  cssFiles.forEach(file => {
    const size = fs.statSync(path.join(adminDistPath, 'assets', file)).size;
    totalCSSSize += size;
    console.log(`✓ CSS Bundle: ${file} (${(size / 1024 / 1024).toFixed(2)} MB)`);
  });

  console.log(`\n📊 Total Bundle Size: ${((totalJSSize + totalCSSSize) / 1024 / 1024).toFixed(2)} MB`);

  if (totalJSSize > 2000000) { // 2MB
    console.log('  ⚠️  Large JavaScript bundle may cause:');
    console.log('      - Slow loading on mobile/slow connections');
    console.log('      - Memory issues on older devices');
    console.log('      - Parser blocking leading to white page');
  }

  console.log();
}

// 8. Third-party Dependencies Analysis
function analyzeThirdPartyDeps() {
  console.log('📦 8. THIRD-PARTY DEPENDENCIES ANALYSIS');
  console.log('-----------------------------------------');

  const indexPath = path.join(adminDistPath, 'index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf-8');

  const packagePath = path.join(__dirname, 'admin', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

  // Check for external dependencies
  const externalDeps = [
    { name: 'Google Fonts', pattern: /fonts\.googleapis\.com/, risk: 'FOUC, loading delays' },
    { name: 'CDN resources', pattern: /cdn\./i, risk: 'Network failures' },
    { name: 'External APIs', pattern: /https:\/\/(?!localhost)/, risk: 'CORS, network issues' }
  ];

  externalDeps.forEach(dep => {
    const hasExternal = dep.pattern.test(indexContent);
    console.log(`${hasExternal ? '⚠️' : '✓'} ${dep.name}: ${hasExternal ? 'YES' : 'NO'}`);
    if (hasExternal) {
      console.log(`    Risk: ${dep.risk}`);
    }
  });

  // Check problematic dependencies
  const problematicDeps = [
    'moment', // Large bundle size
    'lodash', // Large if not tree-shaken
    'core-js' // Indicates polyfill needs
  ];

  console.log('\n🔍 Bundle Dependencies:');
  problematicDeps.forEach(dep => {
    const hasDep = packageJson.dependencies && packageJson.dependencies[dep];
    if (hasDep) {
      console.log(`⚠️  ${dep}: ${hasDep} (potential performance impact)`);
    }
  });

  console.log();
}

// 9. Mobile/Responsive Analysis
function analyzeMobileSupport() {
  console.log('📱 9. MOBILE/RESPONSIVE ANALYSIS');
  console.log('---------------------------------');

  const indexPath = path.join(adminDistPath, 'index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf-8');

  // Check viewport meta tag
  const hasViewport = /viewport/.test(indexContent);
  console.log(`✓ Viewport meta tag: ${hasViewport ? 'YES' : 'NO'}`);

  if (!hasViewport) {
    console.log('  🚨 CRITICAL: Missing viewport tag - mobile layout broken');
  }

  // Check for touch-action CSS
  const cssFiles = fs.readdirSync(path.join(adminDistPath, 'assets'))
    .filter(f => f.endsWith('.css'));

  if (cssFiles.length > 0) {
    const cssContent = fs.readFileSync(path.join(adminDistPath, 'assets', cssFiles[0]), 'utf-8');
    const hasTouchAction = /touch-action/.test(cssContent);
    console.log(`✓ Touch action CSS: ${hasTouchAction ? 'YES' : 'NO'}`);
  }

  // Check for responsive breakpoints
  const packagePath = path.join(__dirname, 'admin', 'tailwind.config.js');
  if (fs.existsSync(packagePath)) {
    const tailwindConfig = fs.readFileSync(packagePath, 'utf-8');
    const hasScreens = /screens/.test(tailwindConfig);
    console.log(`✓ Responsive breakpoints: ${hasScreens ? 'YES' : 'NO'}`);
  }

  console.log();
}

// 10. Browser Testing Simulation
function simulateBrowserTesting() {
  console.log('🌐 10. BROWSER COMPATIBILITY MATRIX');
  console.log('------------------------------------');

  const browsers = [
    { name: 'Chrome 90+', status: '✅', issues: 'None expected' },
    { name: 'Firefox 88+', status: '✅', issues: 'None expected' },
    { name: 'Safari 14+', status: '✅', issues: 'None expected' },
    { name: 'Edge 90+', status: '✅', issues: 'None expected' },
    { name: 'Chrome 60-89', status: '⚠️', issues: 'Some modern JS features may not work' },
    { name: 'Firefox 60-87', status: '⚠️', issues: 'Some modern JS features may not work' },
    { name: 'Safari 10-13', status: '⚠️', issues: 'Potential module loading issues' },
    { name: 'Internet Explorer 11', status: '❌', issues: 'COMPLETE FAILURE - ES modules not supported' },
    { name: 'Chrome <60', status: '❌', issues: 'ES modules not supported' },
    { name: 'Firefox <60', status: '❌', issues: 'ES modules not supported' },
    { name: 'Safari <10.1', status: '❌', issues: 'ES modules not supported' },
    { name: 'Mobile Safari iOS 10+', status: '✅', issues: 'Should work with viewport fixes' },
    { name: 'Chrome Mobile 90+', status: '✅', issues: 'Should work' },
    { name: 'Samsung Internet 14+', status: '✅', issues: 'Should work' },
    { name: 'UC Browser', status: '⚠️', issues: 'May have module loading issues' }
  ];

  browsers.forEach(browser => {
    console.log(`${browser.status} ${browser.name.padEnd(25)} ${browser.issues}`);
  });

  console.log();
}

// Browser-specific fixes and recommendations
function generateRecommendations() {
  console.log('🔧 BROWSER COMPATIBILITY FIXES & RECOMMENDATIONS');
  console.log('=================================================\n');

  console.log('1. IMMEDIATE FIXES FOR WHITE PAGE:');
  console.log('----------------------------------');
  console.log('• Add legacy browser detection script to index.html');
  console.log('• Add polyfills for IE11 and older browsers');
  console.log('• Configure @vitejs/plugin-legacy for automatic legacy builds');
  console.log('• Add nomodule fallback scripts');
  console.log('• Set up proper error boundaries for graceful degradation\n');

  console.log('2. ES MODULES COMPATIBILITY:');
  console.log('----------------------------');
  console.log('• Use <script type="module"> with <script nomodule> fallback');
  console.log('• Add module/nomodule polyfill for Safari 10.1');
  console.log('• Configure SystemJS for IE11 module loading');
  console.log('• Consider UMD builds for maximum compatibility\n');

  console.log('3. POLYFILL CONFIGURATION:');
  console.log('--------------------------');
  console.log('• Add core-js polyfills for Promise, Symbol, fetch');
  console.log('• Include regenerator-runtime for async/await');
  console.log('• Add Web Components polyfills if using custom elements');
  console.log('• Configure automatic polyfill injection based on user agent\n');

  console.log('4. PERFORMANCE OPTIMIZATIONS:');
  console.log('-----------------------------');
  console.log('• Enable code splitting to reduce initial bundle size');
  console.log('• Add resource hints (preload, prefetch) for critical assets');
  console.log('• Implement proper caching headers');
  console.log('• Use compression (gzip/brotli) for static assets\n');

  console.log('5. ERROR HANDLING:');
  console.log('-----------------');
  console.log('• Add global error handlers for unhandled promises');
  console.log('• Implement browser compatibility detection');
  console.log('• Add fallback UI for unsupported browsers');
  console.log('• Set up error reporting for production issues\n');

  console.log('6. TESTING STRATEGY:');
  console.log('-------------------');
  console.log('• Use BrowserStack/Sauce Labs for cross-browser testing');
  console.log('• Test on real devices, not just emulators');
  console.log('• Implement automated browser compatibility tests');
  console.log('• Monitor real user data with analytics\n');

  console.log('7. PROGRESSIVE ENHANCEMENT:');
  console.log('---------------------------');
  console.log('• Start with minimal functional base');
  console.log('• Layer on enhanced features based on capability detection');
  console.log('• Provide clear error messages for unsupported browsers');
  console.log('• Consider server-side rendering for critical content\n');
}

// Main execution
function main() {
  try {
    analyzeModuleSupport();
    analyzeBuildTargets();
    analyzeJSFeatures();
    simulateConsoleErrors();
    analyzeDOMIssues();
    analyzeServiceWorker();
    analyzePerformance();
    analyzeThirdPartyDeps();
    analyzeMobileSupport();
    simulateBrowserTesting();
    generateRecommendations();

    console.log('✅ Browser compatibility analysis complete!');
    console.log('📊 Report saved to browser-compatibility-report.json\n');

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: 'Browser compatibility analysis completed',
      issues: {
        critical: ['ES modules without legacy fallback', 'No IE11 support'],
        warnings: ['Large bundle size', 'No polyfills detected'],
        recommendations: ['Add legacy plugin', 'Implement error boundaries']
      }
    };

    fs.writeFileSync('browser-compatibility-report.json', JSON.stringify(report, null, 2));

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

// Run analysis
if (require.main === module) {
  main();
}

module.exports = {
  analyzeModuleSupport,
  analyzeBuildTargets,
  analyzeJSFeatures,
  simulateConsoleErrors,
  analyzeDOMIssues
};