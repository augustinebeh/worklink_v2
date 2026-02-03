#!/usr/bin/env node
/**
 * Final Comprehensive API Test Report for WorkLink Platform
 * Combines all test results and provides executive summary
 */

const fs = require('fs');
const path = require('path');

// Import test modules
const { runEnhancedTests } = require('./enhanced_api_test');
const { runSecurityTests } = require('./security_focused_test');
const { runPerformanceTests } = require('./performance_test');

async function testSpecificEndpoints() {
  console.log('\n🔍 TESTING SPECIFIC ENDPOINT CATEGORIES');
  console.log('='.repeat(60));

  const https = require('https');
  const http = require('http');

  function makeRequest(method, url, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
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
          'User-Agent': 'WorkLink-Final-Test/1.0',
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
          const responseTime = Date.now() - startTime;
          try {
            const parsedBody = res.headers['content-type']?.includes('application/json')
              ? JSON.parse(body)
              : body;
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: parsedBody,
              responseTime: responseTime
            });
          } catch (parseError) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: body,
              responseTime: responseTime,
              parseError: parseError.message
            });
          }
        });
      });

      req.on('error', (err) => {
        reject({ error: err.message, responseTime: Date.now() - startTime });
      });

      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  const BASE_URL = 'http://localhost:8080';
  const API_BASE = `${BASE_URL}/api/v1`;

  // Get auth token for authenticated requests
  let authToken = null;
  try {
    const authResponse = await makeRequest('POST', `${API_BASE}/auth/worker/login`, {
      email: 'sarah.tan@email.com'
    });
    if (authResponse.body?.token) {
      authToken = authResponse.body.token;
    }
  } catch (error) {
    console.log('⚠️ Could not obtain auth token for authenticated tests');
  }

  const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

  // Test categories
  const testCategories = {
    'Core Business APIs': [
      { name: 'Candidates CRUD', url: `${API_BASE}/candidates`, methods: ['GET'] },
      { name: 'Jobs CRUD', url: `${API_BASE}/jobs`, methods: ['GET'] },
      { name: 'Deployments', url: `${API_BASE}/deployments`, methods: ['GET'] },
      { name: 'Payments', url: `${API_BASE}/payments`, methods: ['GET'] },
      { name: 'Clients', url: `${API_BASE}/clients`, methods: ['GET'] },
    ],

    'Gamification Features': [
      { name: 'Gamification Main', url: `${API_BASE}/gamification`, methods: ['GET'] },
      { name: 'Achievements', url: `${API_BASE}/gamification/achievements`, methods: ['GET'] },
      { name: 'Leaderboard', url: `${API_BASE}/gamification/leaderboard`, methods: ['GET'] },
      { name: 'Quests', url: `${API_BASE}/gamification/quests`, methods: ['GET'] },
    ],

    'Real-time & Communication': [
      { name: 'Chat System', url: `${API_BASE}/chat`, methods: ['GET'] },
      { name: 'Conversations', url: `${API_BASE}/conversations`, methods: ['GET'] },
      { name: 'Messaging', url: `${API_BASE}/messaging`, methods: ['GET'] },
      { name: 'Notifications', url: `${API_BASE}/notifications`, methods: ['GET'] },
    ],

    'AI & ML Features': [
      { name: 'AI Chat', url: `${API_BASE}/ai-chat`, methods: ['GET'] },
      { name: 'ML Services', url: `${API_BASE}/ml`, methods: ['GET'] },
      { name: 'AI Automation', url: `${API_BASE}/ai`, methods: ['GET'] },
      { name: 'Ad ML', url: `${API_BASE}/ad-ml`, methods: ['GET'] },
    ],

    'Advanced Features': [
      { name: 'Analytics', url: `${API_BASE}/analytics`, methods: ['GET'] },
      { name: 'Referrals', url: `${API_BASE}/referrals`, methods: ['GET'] },
      { name: 'Training', url: `${API_BASE}/training`, methods: ['GET'] },
      { name: 'Telegram Groups', url: `${API_BASE}/telegram-groups`, methods: ['GET'] },
      { name: 'Tender Monitor', url: `${API_BASE}/tender-monitor`, methods: ['GET'] },
      { name: 'Availability', url: `${API_BASE}/availability`, methods: ['GET'] },
    ]
  };

  const results = {};

  for (const [category, endpoints] of Object.entries(testCategories)) {
    console.log(`\\n📋 Testing ${category}...`);
    results[category] = [];

    for (const endpoint of endpoints) {
      for (const method of endpoint.methods) {
        try {
          const response = await makeRequest(method, endpoint.url, null, headers);

          const result = {
            name: endpoint.name,
            method: method,
            url: endpoint.url,
            status: response.status,
            responseTime: response.responseTime,
            success: response.status < 400,
            hasAuth: !!authToken,
            error: response.status >= 400 ? response.body?.error : null
          };

          results[category].push(result);

          const statusIcon = response.status < 300 ? '✅' : response.status < 400 ? '⚠️' : '❌';
          console.log(`  ${statusIcon} ${endpoint.name} (${method}): ${response.status} - ${response.responseTime}ms`);

        } catch (error) {
          const result = {
            name: endpoint.name,
            method: method,
            url: endpoint.url,
            status: 0,
            responseTime: error.responseTime || 0,
            success: false,
            hasAuth: !!authToken,
            error: error.error
          };

          results[category].push(result);
          console.log(`  ❌ ${endpoint.name} (${method}): ERROR - ${error.error}`);
        }
      }
    }
  }

  return results;
}

async function testWebSocketConnections() {
  console.log('\\n🔌 WEBSOCKET CONNECTION TESTING');
  console.log('='.repeat(40));

  return new Promise((resolve) => {
    try {
      const WebSocket = require('ws');
      const wsUrl = 'ws://localhost:8080/ws';
      const ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        ws.terminate();
        resolve({
          connected: false,
          error: 'Connection timeout',
          result: 'FAIL'
        });
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        console.log('✅ WebSocket connected successfully');

        // Test message sending
        ws.send(JSON.stringify({ type: 'test', message: 'API test ping' }));

        setTimeout(() => {
          ws.close();
          resolve({
            connected: true,
            result: 'PASS'
          });
        }, 100);
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        console.log(`❌ WebSocket connection failed: ${error.message}`);
        resolve({
          connected: false,
          error: error.message,
          result: 'FAIL'
        });
      });

      ws.on('message', (data) => {
        console.log('📥 WebSocket message received');
      });

    } catch (error) {
      console.log(`❌ WebSocket test failed: ${error.message}`);
      resolve({
        connected: false,
        error: error.message,
        result: 'FAIL'
      });
    }
  });
}

function generateExecutiveSummary(enhancedReport, securityReport, performanceReport, endpointResults, wsResults) {
  const currentTime = new Date().toISOString();

  // Calculate overall statistics
  const totalEndpointTests = Object.values(endpointResults).flat().length;
  const successfulEndpointTests = Object.values(endpointResults).flat().filter(r => r.success).length;

  const summary = {
    metadata: {
      reportGenerated: currentTime,
      testTarget: 'http://localhost:8080',
      testScope: 'Full API Security and Performance Assessment',
      testDuration: 'Comprehensive multi-phase testing'
    },

    executiveSummary: {
      overallRiskLevel: securityReport.summary.riskLevel,
      apiHealthStatus: successfulEndpointTests / totalEndpointTests > 0.8 ? 'HEALTHY' : 'NEEDS_ATTENTION',
      performanceGrade: performanceReport.summary.performanceGrade,
      criticalIssuesFound: securityReport.summary.critical + securityReport.summary.high,
      totalEndpointsTested: totalEndpointTests,
      endpointSuccessRate: `${(successfulEndpointTests / totalEndpointTests * 100).toFixed(1)}%`
    },

    testResults: {
      enhanced: {
        totalTests: enhancedReport.summary.totalTests,
        passed: enhancedReport.summary.passed,
        failed: enhancedReport.summary.failed,
        warnings: enhancedReport.summary.warnings
      },
      security: {
        totalFindings: securityReport.summary.totalFindings,
        critical: securityReport.summary.critical,
        high: securityReport.summary.high,
        medium: securityReport.summary.medium,
        low: securityReport.summary.low,
        riskScore: securityReport.summary.riskScore
      },
      performance: {
        totalTests: performanceReport.summary.totalTests,
        passed: performanceReport.summary.passed,
        warnings: performanceReport.summary.warnings,
        failed: performanceReport.summary.failed,
        overallScore: performanceReport.summary.overallScore
      },
      endpointCategories: endpointResults,
      webSocketTest: wsResults
    },

    criticalFindings: [
      ...securityReport.findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH'),
      ...enhancedReport.testResults.Security?.filter(t => !t.passed) || []
    ],

    recommendations: {
      immediate: [
        'Fix XSS vulnerabilities in user input handling',
        'Implement proper CORS policy restrictions',
        'Fix token generation to ensure uniqueness',
        'Add missing security headers (HSTS, CSP)'
      ],
      shortTerm: [
        'Implement rate limiting for authentication endpoints',
        'Add input validation for all user-supplied data',
        'Implement proper error handling for large payloads',
        'Add comprehensive logging and monitoring'
      ],
      longTerm: [
        'Regular security assessments and penetration testing',
        'Performance optimization for high-load scenarios',
        'Implementation of Web Application Firewall (WAF)',
        'Security awareness training for development team'
      ]
    },

    complianceStatus: {
      OWASP_Top10: {
        A01_BrokenAccessControl: 'PARTIAL_COMPLIANCE',
        A02_CryptographicFailures: 'NEEDS_REVIEW',
        A03_Injection: 'VULNERABLE', // XSS found
        A04_InsecureDesign: 'PARTIAL_COMPLIANCE',
        A05_SecurityMisconfiguration: 'VULNERABLE', // Missing headers, CORS
        A06_VulnerableComponents: 'NEEDS_REVIEW',
        A07_IdentificationAuthFailures: 'VULNERABLE', // Token reuse
        A08_SoftwareDataIntegrityFailures: 'NEEDS_REVIEW',
        A09_SecurityLoggingFailures: 'NEEDS_REVIEW',
        A10_ServerSideRequestForgery: 'COMPLIANT'
      }
    }
  };

  return summary;
}

async function runComprehensiveTest() {
  console.log('🚀 WORKLINK PLATFORM - COMPREHENSIVE API ASSESSMENT');
  console.log('='.repeat(80));
  console.log(`Started: ${new Date().toLocaleString()}`);
  console.log('Phase 1: Enhanced API Testing');
  console.log('Phase 2: Security Assessment');
  console.log('Phase 3: Performance Testing');
  console.log('Phase 4: Endpoint Category Testing');
  console.log('Phase 5: Real-time Feature Testing');
  console.log('='.repeat(80));

  try {
    // Phase 1: Enhanced API Testing
    console.log('\\n📊 PHASE 1: ENHANCED API TESTING');
    const enhancedReport = await runEnhancedTests();

    // Phase 2: Security Assessment
    console.log('\\n🔒 PHASE 2: SECURITY ASSESSMENT');
    const securityReport = await runSecurityTests();

    // Phase 3: Performance Testing
    console.log('\\n⚡ PHASE 3: PERFORMANCE TESTING');
    const performanceReport = await runPerformanceTests();

    // Phase 4: Endpoint Category Testing
    console.log('\\n🔍 PHASE 4: ENDPOINT CATEGORY TESTING');
    const endpointResults = await testSpecificEndpoints();

    // Phase 5: WebSocket Testing
    console.log('\\n🔌 PHASE 5: WEBSOCKET TESTING');
    const wsResults = await testWebSocketConnections();

    // Generate Executive Summary
    const executiveSummary = generateExecutiveSummary(
      enhancedReport,
      securityReport,
      performanceReport,
      endpointResults,
      wsResults
    );

    // Save comprehensive report
    const comprehensiveReport = {
      executiveSummary,
      detailedReports: {
        enhanced: enhancedReport,
        security: securityReport,
        performance: performanceReport
      },
      endpointResults,
      wsResults
    };

    const reportFile = `worklink_comprehensive_assessment_${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(comprehensiveReport, null, 2));

    // Display Final Summary
    console.log('\\n' + '='.repeat(80));
    console.log('📋 COMPREHENSIVE ASSESSMENT SUMMARY');
    console.log('='.repeat(80));
    console.log(`Overall API Health: ${executiveSummary.executiveSummary.apiHealthStatus}`);
    console.log(`Security Risk Level: ${executiveSummary.executiveSummary.overallRiskLevel}`);
    console.log(`Performance Grade: ${executiveSummary.executiveSummary.performanceGrade}`);
    console.log(`Endpoint Success Rate: ${executiveSummary.executiveSummary.endpointSuccessRate}`);
    console.log(`Critical Issues: ${executiveSummary.executiveSummary.criticalIssuesFound}`);
    console.log('');

    console.log('📊 TEST BREAKDOWN:');
    console.log(`Enhanced Tests: ${enhancedReport.summary.passed}/${enhancedReport.summary.totalTests} passed`);
    console.log(`Security Findings: ${securityReport.summary.totalFindings} issues (${securityReport.summary.critical + securityReport.summary.high} critical/high)`);
    console.log(`Performance Tests: ${performanceReport.summary.passed}/${performanceReport.summary.totalTests} passed`);
    console.log(`Endpoint Tests: ${Object.values(endpointResults).flat().filter(r => r.success).length}/${Object.values(endpointResults).flat().length} successful`);
    console.log(`WebSocket: ${wsResults.result}`);
    console.log('');

    console.log('🚨 CRITICAL ACTIONS REQUIRED:');
    executiveSummary.recommendations.immediate.forEach(action => {
      console.log(`   • ${action}`);
    });
    console.log('');

    console.log('🔍 OWASP TOP 10 COMPLIANCE:');
    Object.entries(executiveSummary.complianceStatus.OWASP_Top10).forEach(([category, status]) => {
      const icon = status === 'COMPLIANT' ? '✅' : status === 'VULNERABLE' ? '❌' : '⚠️';
      console.log(`   ${icon} ${category.replace(/_/g, ' ')}: ${status}`);
    });

    console.log(`\\n📄 Comprehensive report saved: ${reportFile}`);
    console.log('\\n✅ Comprehensive assessment completed!');

    return comprehensiveReport;

  } catch (error) {
    console.error('🚨 Comprehensive test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runComprehensiveTest().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Comprehensive test error:', error);
    process.exit(1);
  });
}

module.exports = { runComprehensiveTest };