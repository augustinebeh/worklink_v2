/**
 * Server Startup Test
 * Verify newly enabled routes work correctly
 */

const http = require('http');

async function testEndpoint(path, method = 'GET') {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          success: res.statusCode < 400,
          data: data.substring(0, 200) // First 200 chars
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        path,
        status: 0,
        success: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        path,
        status: 0,
        success: false,
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Server Endpoints...\n');
  console.log('Note: Server must be running on port 3000\n');
  
  const endpoints = [
    '/api/v1/',
    '/api/v1/auth',
    '/api/v1/candidates',
    '/api/v1/jobs',
    '/api/v1/job-scheduler',
    '/api/v1/consultant-performance',
    '/api/v1/template-responses'
  ];

  const results = [];

  for (const endpoint of endpoints) {
    process.stdout.write(`Testing ${endpoint}... `);
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${result.status}`);
    } else {
      console.log(`❌ ${result.error || result.status}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\nFailed endpoints:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.path}: ${r.error || r.status}`);
    });
  }

  return { passed, failed, results };
}

// Check if server is running
async function checkServerRunning() {
  const result = await testEndpoint('/api/v1/');
  return result.success;
}

// Main
(async () => {
  const isRunning = await checkServerRunning();
  
  if (!isRunning) {
    console.log('❌ Server is not running on port 3000');
    console.log('\nTo start the server, run:');
    console.log('  npm start\n');
    console.log('Then run this test again.');
    process.exit(1);
  }
  
  const { passed, failed } = await runTests();
  
  if (failed === 0) {
    console.log('\n🎉 All endpoints working correctly!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some endpoints need attention');
    process.exit(1);
  }
})();
