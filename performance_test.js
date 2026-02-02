#!/usr/bin/env node
/**
 * Performance and Load Testing for WorkLink API
 * Tests response times, throughput, and rate limiting
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/v1`;

let performanceResults = [];

function makeRequest(method, url, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const startTime = process.hrtime.bigint();
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WorkLink-Perf-Test/1.0',
        ...headers
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const endTime = process.hrtime.bigint();
        const responseTimeNs = endTime - startTime;
        const responseTimeMs = Number(responseTimeNs / 1000000n);

        try {
          const parsedBody = res.headers['content-type']?.includes('application/json')
            ? JSON.parse(body)
            : body;

          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsedBody,
            responseTime: responseTimeMs,
            size: Buffer.byteLength(body),
            timestamp: Date.now()
          });
        } catch (parseError) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            responseTime: responseTimeMs,
            size: Buffer.byteLength(body),
            timestamp: Date.now(),
            parseError: parseError.message
          });
        }
      });
    });

    req.on('error', (err) => {
      const endTime = process.hrtime.bigint();
      const responseTimeMs = Number((endTime - startTime) / 1000000n);
      reject({
        error: err.message,
        responseTime: responseTimeMs,
        timestamp: Date.now()
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

function logPerformance(test, result) {
  performanceResults.push({
    test,
    result,
    timestamp: new Date().toISOString()
  });

  const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${status} [PERF] ${test}`);

  if (result.details) {
    Object.entries(result.details).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
  }
  console.log('');
}

// Response Time Testing
async function testResponseTimes() {
  console.log('⚡ RESPONSE TIME ANALYSIS');
  console.log('='.repeat(40));

  const endpoints = [
    { name: 'API Info', url: `${API_BASE}/`, method: 'GET' },
    { name: 'Health Check', url: `${BASE_URL}/health`, method: 'GET' },
    { name: 'Demo Login', url: `${API_BASE}/auth/worker/login`, method: 'POST',
      data: { email: 'sarah.tan@email.com' }},
    { name: 'Gamification Data', url: `${API_BASE}/gamification`, method: 'GET' },
  ];

  for (const endpoint of endpoints) {
    const responseTimes = [];
    const errors = [];

    console.log(`Testing ${endpoint.name} (${endpoint.method})...`);

    // Run 20 requests to get statistical significance
    for (let i = 0; i < 20; i++) {
      try {
        const response = await makeRequest(endpoint.method, endpoint.url, endpoint.data);
        responseTimes.push(response.responseTime);
      } catch (error) {
        errors.push(error);
      }
    }

    if (responseTimes.length > 0) {
      const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const min = Math.min(...responseTimes);
      const max = Math.max(...responseTimes);
      const p50 = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)];
      const p95 = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];
      const p99 = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.99)];

      const status = avg < 200 ? 'PASS' : avg < 1000 ? 'WARN' : 'FAIL';

      logPerformance(`${endpoint.name} Response Times`, {
        status,
        details: {
          'Average': `${avg.toFixed(2)}ms`,
          'Minimum': `${min}ms`,
          'Maximum': `${max}ms`,
          'P50 (Median)': `${p50}ms`,
          'P95': `${p95}ms`,
          'P99': `${p99}ms`,
          'Successful Requests': `${responseTimes.length}/20`,
          'Error Rate': `${(errors.length / 20 * 100).toFixed(1)}%`
        }
      });
    } else {
      logPerformance(`${endpoint.name} Response Times`, {
        status: 'FAIL',
        details: {
          'Error': 'All requests failed',
          'Errors': errors.length
        }
      });
    }
  }
}

// Throughput Testing
async function testThroughput() {
  console.log('⚡ THROUGHPUT ANALYSIS');
  console.log('='.repeat(40));

  const testUrl = `${API_BASE}/`;
  const concurrencyLevels = [1, 5, 10, 25, 50];

  for (const concurrency of concurrencyLevels) {
    console.log(`Testing with ${concurrency} concurrent requests...`);

    const startTime = Date.now();
    const requests = [];

    // Create concurrent requests
    for (let i = 0; i < concurrency; i++) {
      requests.push(makeRequest('GET', testUrl));
    }

    try {
      const results = await Promise.allSettled(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
      const failed = results.filter(r => r.status === 'rejected' || r.value.status !== 200).length;

      const throughput = (successful / duration * 1000).toFixed(2);
      const avgResponseTime = successful > 0 ?
        results
          .filter(r => r.status === 'fulfilled')
          .reduce((sum, r) => sum + r.value.responseTime, 0) / successful
        : 0;

      const status = successful / concurrency >= 0.95 ? 'PASS' :
                    successful / concurrency >= 0.8 ? 'WARN' : 'FAIL';

      logPerformance(`Concurrency ${concurrency}`, {
        status,
        details: {
          'Requests': concurrency,
          'Successful': successful,
          'Failed': failed,
          'Success Rate': `${(successful/concurrency*100).toFixed(1)}%`,
          'Duration': `${duration}ms`,
          'Throughput': `${throughput} req/s`,
          'Avg Response Time': `${avgResponseTime.toFixed(2)}ms`
        }
      });

    } catch (error) {
      logPerformance(`Concurrency ${concurrency}`, {
        status: 'FAIL',
        details: {
          'Error': error.message
        }
      });
    }

    // Add delay between tests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Rate Limiting Testing
async function testRateLimiting() {
  console.log('⚡ RATE LIMITING ANALYSIS');
  console.log('='.repeat(40));

  const testUrl = `${API_BASE}/auth/login`;
  const maxRequests = 150; // Try to exceed the 500 requests per minute limit
  const timeWindow = 10000; // 10 seconds

  console.log(`Sending ${maxRequests} requests in ${timeWindow/1000} seconds...`);

  const startTime = Date.now();
  const results = [];
  const requests = [];

  for (let i = 0; i < maxRequests; i++) {
    requests.push(
      makeRequest('POST', testUrl, { email: 'test@test.com', password: 'invalid' })
        .then(result => ({ success: true, status: result.status, timestamp: Date.now() }))
        .catch(error => ({ success: false, error: error.error, timestamp: Date.now() }))
    );

    // Small delay to spread requests over time
    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  try {
    const allResults = await Promise.all(requests);
    const endTime = Date.now();
    const actualDuration = endTime - startTime;

    const successfulRequests = allResults.filter(r => r.success).length;
    const rateLimitedRequests = allResults.filter(r => r.success && r.status === 429).length;
    const errorRequests = allResults.filter(r => !r.success).length;

    const requestsPerSecond = (maxRequests / actualDuration * 1000).toFixed(2);

    const status = rateLimitedRequests > 0 ? 'PASS' : 'WARN';

    logPerformance('Rate Limiting Test', {
      status,
      details: {
        'Total Requests': maxRequests,
        'Duration': `${actualDuration}ms`,
        'Request Rate': `${requestsPerSecond} req/s`,
        'Successful': successfulRequests,
        'Rate Limited (429)': rateLimitedRequests,
        'Errors': errorRequests,
        'Rate Limiting Active': rateLimitedRequests > 0 ? 'Yes' : 'No'
      }
    });

  } catch (error) {
    logPerformance('Rate Limiting Test', {
      status: 'FAIL',
      details: {
        'Error': error.message
      }
    });
  }
}

// Memory and Resource Usage Testing
async function testResourceUsage() {
  console.log('⚡ RESOURCE USAGE ANALYSIS');
  console.log('='.repeat(40));

  // Test with large payloads
  const largeSizes = [1024, 10240, 102400]; // 1KB, 10KB, 100KB

  for (const size of largeSizes) {
    console.log(`Testing ${size} byte payload...`);

    const largeData = {
      name: 'Test User',
      email: `large${Date.now()}@test.com`,
      phone: '+65 9123 4567',
      description: 'A'.repeat(size)
    };

    try {
      const response = await makeRequest('POST', `${API_BASE}/auth/register`, largeData);

      const status = response.status === 200 || response.status === 201 ? 'PASS' :
                    response.status === 413 ? 'WARN' : 'FAIL';

      logPerformance(`Large Payload ${size}B`, {
        status,
        details: {
          'Payload Size': `${size} bytes`,
          'Response Status': response.status,
          'Response Time': `${response.responseTime}ms`,
          'Response Size': `${response.size} bytes`,
          'Handled': response.status < 400 ? 'Yes' : 'No'
        }
      });

    } catch (error) {
      logPerformance(`Large Payload ${size}B`, {
        status: 'WARN',
        details: {
          'Payload Size': `${size} bytes`,
          'Error': error.error,
          'Response Time': `${error.responseTime}ms`
        }
      });
    }
  }

  // Test many small requests
  console.log('Testing many small requests...');
  const smallRequests = 100;
  const startTime = Date.now();

  try {
    const requests = Array(smallRequests).fill().map(() =>
      makeRequest('GET', `${API_BASE}/`)
    );

    const results = await Promise.all(requests);
    const endTime = Date.now();

    const successful = results.filter(r => r.status === 200).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const totalDuration = endTime - startTime;

    logPerformance(`${smallRequests} Small Requests`, {
      status: successful >= smallRequests * 0.95 ? 'PASS' : 'WARN',
      details: {
        'Total Requests': smallRequests,
        'Successful': successful,
        'Total Duration': `${totalDuration}ms`,
        'Avg Response Time': `${avgResponseTime.toFixed(2)}ms`,
        'Throughput': `${(smallRequests / totalDuration * 1000).toFixed(2)} req/s`
      }
    });

  } catch (error) {
    logPerformance(`${smallRequests} Small Requests`, {
      status: 'FAIL',
      details: {
        'Error': error.message
      }
    });
  }
}

// Connection Testing
async function testConnections() {
  console.log('⚡ CONNECTION ANALYSIS');
  console.log('='.repeat(40));

  // Test connection reuse vs new connections
  const iterations = 10;

  // Test with connection reuse (using same agent)
  const startTimeReuse = Date.now();
  for (let i = 0; i < iterations; i++) {
    try {
      await makeRequest('GET', `${API_BASE}/`);
    } catch (error) {
      // Ignore individual errors for this test
    }
  }
  const endTimeReuse = Date.now();
  const reuseTime = endTimeReuse - startTimeReuse;

  logPerformance('Connection Management', {
    status: reuseTime < 5000 ? 'PASS' : 'WARN',
    details: {
      'Sequential Requests': iterations,
      'Total Time': `${reuseTime}ms`,
      'Avg Per Request': `${(reuseTime / iterations).toFixed(2)}ms`,
      'Efficiency': reuseTime < 5000 ? 'Good' : 'Poor'
    }
  });
}

// Generate Performance Report
function generatePerformanceReport() {
  const passedTests = performanceResults.filter(r => r.result.status === 'PASS').length;
  const warnTests = performanceResults.filter(r => r.result.status === 'WARN').length;
  const failedTests = performanceResults.filter(r => r.result.status === 'FAIL').length;

  const overallScore = (passedTests * 3 + warnTests * 1) / (performanceResults.length * 3) * 100;

  let performanceGrade;
  if (overallScore >= 90) performanceGrade = 'EXCELLENT';
  else if (overallScore >= 75) performanceGrade = 'GOOD';
  else if (overallScore >= 60) performanceGrade = 'FAIR';
  else if (overallScore >= 40) performanceGrade = 'POOR';
  else performanceGrade = 'CRITICAL';

  return {
    metadata: {
      timestamp: new Date().toISOString(),
      target: BASE_URL,
      testsPerformed: performanceResults.length
    },
    summary: {
      totalTests: performanceResults.length,
      passed: passedTests,
      warnings: warnTests,
      failed: failedTests,
      overallScore: overallScore.toFixed(2),
      performanceGrade
    },
    results: performanceResults,
    recommendations: [
      {
        category: 'Response Times',
        recommendation: 'Aim for average response times under 200ms for optimal user experience'
      },
      {
        category: 'Concurrency',
        recommendation: 'Ensure 95%+ success rate under concurrent load'
      },
      {
        category: 'Rate Limiting',
        recommendation: 'Implement progressive rate limiting to prevent abuse'
      }
    ]
  };
}

// Main execution
async function runPerformanceTests() {
  console.log('⚡ WORKLINK API PERFORMANCE TESTING');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Started: ${new Date().toLocaleString()}`);
  console.log('='.repeat(60));
  console.log('');

  try {
    await testResponseTimes();
    await testThroughput();
    await testRateLimiting();
    await testResourceUsage();
    await testConnections();

    const report = generatePerformanceReport();

    console.log('='.repeat(60));
    console.log('📊 PERFORMANCE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Performance Grade: ${report.summary.performanceGrade}`);
    console.log(`Overall Score: ${report.summary.overallScore}%`);
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`⚠️ Warnings: ${report.summary.warnings}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log('');

    // Save detailed report
    const reportFile = `performance_test_report_${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed performance report saved: ${reportFile}`);

    console.log('\n✅ Performance testing completed!');
    return report;

  } catch (error) {
    console.error('🚨 Performance test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runPerformanceTests().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Performance test error:', error);
    process.exit(1);
  });
}

module.exports = { runPerformanceTests };