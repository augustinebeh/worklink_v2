/**
 * Test Disabled Routes
 * Check if disabled routes can be safely re-enabled
 */

const path = require('path');

console.log('🔍 Testing Disabled Routes...\n');

const routesToTest = [
  { name: 'job-scheduler', path: './routes/api/v1/job-scheduler.js', reason: 'Temporarily disabled' },
  { name: 'consultant-performance', path: './routes/api/v1/consultant-performance', reason: 'Missing utils' },
  { name: 'template-responses', path: './routes/api/v1/template-responses.js', reason: 'Temporarily disabled' },
  { name: 'email-config', path: './routes/api/v1/email-config.js', reason: 'Prevents hanging' }
];

const results = {
  canEnable: [],
  needsFix: [],
  missing: []
};

routesToTest.forEach(route => {
  console.log(`\nTesting: ${route.name}`);
  console.log(`Reason disabled: ${route.reason}`);
  
  try {
    const resolvedPath = path.join(__dirname, route.path);
    console.log(`  Path: ${resolvedPath}`);
    
    // Try to require the route
    const routeModule = require(resolvedPath);
    
    if (routeModule && typeof routeModule === 'function') {
      console.log(`  ✅ Module loads successfully!`);
      console.log(`  ✅ Exports a valid Express router`);
      results.canEnable.push({
        ...route,
        status: 'SAFE TO ENABLE',
        message: 'No issues detected'
      });
    } else if (routeModule && typeof routeModule === 'object') {
      console.log(`  ✅ Module loads successfully!`);
      console.log(`  ⚠️  Exports an object (might need verification)`);
      results.canEnable.push({
        ...route,
        status: 'NEEDS VERIFICATION',
        message: 'Loads but exports unexpected format'
      });
    } else {
      console.log(`  ⚠️  Module loads but exports unexpected type`);
      results.needsFix.push({
        ...route,
        status: 'NEEDS FIX',
        error: 'Unexpected export type'
      });
    }
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log(`  ❌ File or dependency missing`);
      results.missing.push({
        ...route,
        status: 'MISSING',
        error: error.message
      });
    } else {
      console.log(`  ❌ Runtime error`);
      results.needsFix.push({
        ...route,
        status: 'NEEDS FIX',
        error: error.message
      });
    }
  }
});

console.log('\n' + '='.repeat(60));
console.log('📊 TEST RESULTS SUMMARY');
console.log('='.repeat(60));

console.log(`\n✅ Safe to enable (${results.canEnable.length}):`);
results.canEnable.forEach(r => {
  console.log(`  - ${r.name}: ${r.status}`);
});

console.log(`\n⚠️  Needs fix (${results.needsFix.length}):`);
results.needsFix.forEach(r => {
  console.log(`  - ${r.name}: ${r.error}`);
});

console.log(`\n❌ Missing (${results.missing.length}):`);
results.missing.forEach(r => {
  console.log(`  - ${r.name}: ${r.error}`);
});

console.log('\n' + '='.repeat(60));
console.log('RECOMMENDATIONS:');
console.log('='.repeat(60));

if (results.canEnable.length > 0) {
  console.log('\n✅ These routes can be safely re-enabled:');
  results.canEnable.forEach(r => {
    console.log(`  router.use('/${r.name}', ${r.name.replace(/-/g, '')}Routes);`);
  });
}

if (results.needsFix.length > 0) {
  console.log('\n⚠️  These routes need fixes before enabling:');
  results.needsFix.forEach(r => {
    console.log(`  ${r.name}: ${r.error}`);
  });
}

if (results.missing.length > 0) {
  console.log('\n❌ These routes have missing dependencies:');
  results.missing.forEach(r => {
    console.log(`  ${r.name}: ${r.error}`);
  });
}

// Export results
const fs = require('fs');
fs.writeFileSync(
  path.join(__dirname, 'disabled-routes-test-results.json'),
  JSON.stringify(results, null, 2)
);

console.log('\n📄 Full results saved to: disabled-routes-test-results.json');
