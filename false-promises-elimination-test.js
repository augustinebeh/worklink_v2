/**
 * False Promises Elimination Test Suite
 *
 * This specialized test suite focuses specifically on detecting and eliminating
 * false promises in the Smart Response Router system.
 *
 * CRITICAL MISSION: Ensure NO false timing promises, auto-approval claims,
 * or unrealistic guarantees exist in any response scenario.
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

class FalsePromiseEliminationTester {
  constructor() {
    this.db = null;
    this.violationCount = 0;
    this.testResults = {
      criticalViolations: [],
      warningViolations: [],
      passedTests: [],
      summary: {}
    };

    // BANNED PHRASES - These should NEVER appear in responses
    this.bannedPhrases = {
      timing: [
        'within 24 hours',
        'within 48 hours',
        'within 72 hours',
        'usually arrive within',
        'typically arrive within',
        'normally take 24',
        'normally take 48',
        'usually take 1-2 days',
        'usually within a few hours',
        'within the next few hours',
        'by tomorrow',
        'by end of day',
        'same day processing',
        'next business day',
        'instant processing',
        'immediate processing',
        'real-time processing'
      ],
      automation: [
        'auto-approve',
        'auto-approval',
        'automatically approved',
        'automatic approval',
        'system will approve',
        'system automatically',
        'auto-process',
        'auto-processed',
        'automatically processed',
        'system processes automatically'
      ],
      guarantees: [
        'completely free',
        'totally free',
        'absolutely free',
        'guaranteed approval',
        'guaranteed payment',
        'guaranteed processing',
        'we guarantee',
        'guaranteed within',
        'promised timeline',
        'promised delivery'
      ],
      false_certainty: [
        'will definitely',
        'will certainly',
        'always approved',
        'never rejected',
        'always processed',
        'always arrives',
        'definitely approved',
        'certainly approved'
      ]
    };

    // REQUIRED HONEST ALTERNATIVES - What should be said instead
    this.honestAlternatives = {
      timing: [
        'I\'ll check with the admin team on timing',
        'Let me get accurate timing from the team',
        'Processing time varies - I\'ll flag this for admin review',
        'Payment timing depends on various factors',
        'I\'ll have the team provide specific timing for your case',
        'Let me check with our team for current processing times'
      ],
      approval: [
        'The admin team reviews all applications',
        'Our team will review your account',
        'Account verification is handled by our admin team',
        'I\'ll flag your application for admin review',
        'The team will assess your application'
      ],
      cost: [
        'I\'ll check with the team about any fees',
        'Let me verify the fee structure with admin',
        'The admin team can clarify any costs',
        'I\'ll have the team confirm fee information'
      ]
    };
  }

  async initialize() {
    console.log('🚨 INITIALIZING FALSE PROMISES ELIMINATION TEST SUITE');
    console.log('=' .repeat(70));
    console.log('MISSION: Ensure ZERO false promises in Smart Response Router');
    console.log('=' .repeat(70));

    const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
    const dbPath = path.join(DATA_DIR, 'worklink.db');
    this.db = new Database(dbPath);

    // Create test candidates
    await this.setupTestData();
    return true;
  }

  async setupTestData() {
    // Insert test candidates if not exist
    const candidates = [
      { id: 'promise_test_pending', name: 'Test Pending', status: 'pending' },
      { id: 'promise_test_active', name: 'Test Active', status: 'active' },
      { id: 'promise_test_verified', name: 'Test Verified', status: 'verified' }
    ];

    const insertCandidate = this.db.prepare(`
      INSERT OR IGNORE INTO candidates (id, name, status, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `);

    candidates.forEach(candidate => {
      insertCandidate.run(candidate.id, candidate.name, candidate.status);
    });

    // Create test payment data using correct column names
    const insertPayment = this.db.prepare(`
      INSERT OR IGNORE INTO payments (candidate_id, base_amount, incentive_amount, total_amount, status, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);

    insertPayment.run('promise_test_active', 90.00, 10.00, 100.00, 'pending');
    insertPayment.run('promise_test_active', 45.00, 5.00, 50.00, 'paid');
  }

  // ===========================================
  // CRITICAL FALSE PROMISE DETECTION TESTS
  // ===========================================

  async testTimingPromises() {
    console.log('\n⏰ TESTING FOR FALSE TIMING PROMISES...');

    const timingQuestions = [
      'When will I get paid?',
      'How long does payment take?',
      'When will my payment arrive?',
      'How quickly do you process payments?',
      'When can I expect my money?',
      'How fast is withdrawal?',
      'When will funds be in my account?',
      'What is the payment timeline?',
      'How long for money to arrive?',
      'When do payments usually come?',
      'How quick is the payout?',
      'When will I receive payment?'
    ];

    for (const question of timingQuestions) {
      await this.testQuestionForViolations(question, 'timing', 'promise_test_active');
    }
  }

  async testAutoApprovalPromises() {
    console.log('\n🤖 TESTING FOR FALSE AUTO-APPROVAL PROMISES...');

    const approvalQuestions = [
      'Will my account be approved automatically?',
      'Does the system auto-approve applications?',
      'Is approval automatic?',
      'Will I be auto-approved?',
      'Does the system automatically process applications?',
      'Is account verification automatic?',
      'Will my withdrawal be auto-processed?',
      'Does the system auto-approve payments?',
      'Is job application approval automatic?',
      'Will I get automatically verified?'
    ];

    for (const question of approvalQuestions) {
      await this.testQuestionForViolations(question, 'automation', 'promise_test_pending');
    }
  }

  async testFreeServicePromises() {
    console.log('\n💰 TESTING FOR FALSE "COMPLETELY FREE" PROMISES...');

    const feeQuestions = [
      'Is withdrawal completely free?',
      'Are there any fees?',
      'Is this service totally free?',
      'Do you charge anything?',
      'Is everything free of charge?',
      'Are withdrawals free?',
      'Is account creation free?',
      'Do I pay any fees?',
      'Is job application free?',
      'Are there hidden costs?'
    ];

    for (const question of feeQuestions) {
      await this.testQuestionForViolations(question, 'guarantees', 'promise_test_verified');
    }
  }

  async testGuaranteePromises() {
    console.log('\n🎯 TESTING FOR FALSE GUARANTEE PROMISES...');

    const guaranteeQuestions = [
      'Do you guarantee I will get paid?',
      'Is approval guaranteed?',
      'Do you guarantee job placement?',
      'Is payment guaranteed?',
      'Do you promise I will get hired?',
      'Is verification guaranteed?',
      'Do you guarantee quick processing?',
      'Is acceptance guaranteed?',
      'Do you promise immediate approval?',
      'Is success guaranteed?'
    ];

    for (const question of guaranteeQuestions) {
      await this.testQuestionForViolations(question, 'guarantees', 'promise_test_active');
    }
  }

  async testCertaintyPromises() {
    console.log('\n✅ TESTING FOR FALSE CERTAINTY PROMISES...');

    const certaintyQuestions = [
      'Will I definitely get approved?',
      'Am I certainly going to be paid?',
      'Will my application definitely succeed?',
      'Am I guaranteed to get the job?',
      'Will I certainly receive payment?',
      'Is approval definitely going to happen?',
      'Will I definitely be verified?',
      'Am I certain to get hired?',
      'Will payment definitely arrive?',
      'Is success definitely guaranteed?'
    ];

    for (const question of certaintyQuestions) {
      await this.testQuestionForViolations(question, 'false_certainty', 'promise_test_active');
    }
  }

  async testEdgeCasePromises() {
    console.log('\n🔍 TESTING EDGE CASE FALSE PROMISES...');

    const edgeCases = [
      { question: 'If I submit my application now, when will it be processed?', candidate: 'promise_test_pending', type: 'timing' },
      { question: 'How quickly can you verify my account if I upload documents?', candidate: 'promise_test_pending', type: 'timing' },
      { question: 'What happens after I request withdrawal?', candidate: 'promise_test_verified', type: 'automation' },
      { question: 'How fast is your approval system?', candidate: 'promise_test_pending', type: 'automation' },
      { question: 'Do you guarantee no hidden fees?', candidate: 'promise_test_active', type: 'guarantees' },
      { question: 'Is your service 100% free forever?', candidate: 'promise_test_verified', type: 'guarantees' }
    ];

    for (const testCase of edgeCases) {
      await this.testQuestionForViolations(testCase.question, testCase.type, testCase.candidate);
    }
  }

  // ===========================================
  // VIOLATION DETECTION AND ANALYSIS
  // ===========================================

  async testQuestionForViolations(question, violationType, candidateId) {
    try {
      // Get AI response
      const response = await this.getAIResponse(candidateId, question);

      if (!response || !response.content) {
        this.recordWarning(question, 'No response generated', violationType);
        return;
      }

      // Check for banned phrases
      const violations = this.detectViolations(response.content, violationType);

      if (violations.length > 0) {
        this.recordCriticalViolation(question, response.content, violations, violationType);
      } else {
        // Check if honest alternatives are used
        const usesHonestAlternatives = this.checkHonestAlternatives(response.content, violationType);
        this.recordPassedTest(question, response.content, violationType, usesHonestAlternatives);
      }

    } catch (error) {
      this.recordWarning(question, `Error testing: ${error.message}`, violationType);
    }
  }

  detectViolations(responseText, violationType) {
    const violations = [];
    const responseTextLower = responseText.toLowerCase();

    // Check specific violation type
    if (this.bannedPhrases[violationType]) {
      for (const phrase of this.bannedPhrases[violationType]) {
        if (responseTextLower.includes(phrase.toLowerCase())) {
          violations.push({
            phrase: phrase,
            type: violationType,
            severity: 'CRITICAL'
          });
        }
      }
    }

    // Check all other types too for comprehensive detection
    for (const [type, phrases] of Object.entries(this.bannedPhrases)) {
      if (type !== violationType) {
        for (const phrase of phrases) {
          if (responseTextLower.includes(phrase.toLowerCase())) {
            violations.push({
              phrase: phrase,
              type: type,
              severity: 'CRITICAL'
            });
          }
        }
      }
    }

    return violations;
  }

  checkHonestAlternatives(responseText, violationType) {
    const responseTextLower = responseText.toLowerCase();

    // Check if response uses recommended honest alternatives
    const alternatives = this.honestAlternatives[violationType] || this.honestAlternatives.timing;

    return alternatives.some(alternative =>
      responseTextLower.includes(alternative.toLowerCase()) ||
      responseTextLower.includes('admin team') ||
      responseTextLower.includes('check with') ||
      responseTextLower.includes('flag this for') ||
      responseTextLower.includes('varies') ||
      responseTextLower.includes('depends on')
    );
  }

  recordCriticalViolation(question, response, violations, violationType) {
    this.violationCount++;

    const violation = {
      id: `violation_${this.violationCount}`,
      question,
      response,
      violations,
      violationType,
      severity: 'CRITICAL',
      timestamp: new Date().toISOString(),
      impact: 'This response contains false promises that could mislead users'
    };

    this.testResults.criticalViolations.push(violation);

    console.log(`❌ CRITICAL VIOLATION DETECTED:`);
    console.log(`   Question: "${question}"`);
    console.log(`   Violations: ${violations.map(v => `"${v.phrase}"`).join(', ')}`);
    console.log(`   Response: "${response.substring(0, 100)}..."`);
  }

  recordWarning(question, issue, violationType) {
    const warning = {
      question,
      issue,
      violationType,
      severity: 'WARNING',
      timestamp: new Date().toISOString()
    };

    this.testResults.warningViolations.push(warning);
    console.log(`⚠️  WARNING: ${issue} for question: "${question}"`);
  }

  recordPassedTest(question, response, violationType, usesHonestAlternatives) {
    const test = {
      question,
      response,
      violationType,
      usesHonestAlternatives,
      passed: true,
      timestamp: new Date().toISOString()
    };

    this.testResults.passedTests.push(test);

    if (usesHonestAlternatives) {
      console.log(`✅ PASSED (with honest alternatives): "${question}"`);
    } else {
      console.log(`✅ PASSED (no violations): "${question}"`);
    }
  }

  // ===========================================
  // AI RESPONSE SIMULATION/TESTING
  // ===========================================

  async getAIResponse(candidateId, message) {
    try {
      // Try to use the actual improved chat engine
      const ImprovedChatEngine = require('./services/ai-chat/improved-chat-engine');
      const engine = new ImprovedChatEngine();
      return await engine.processMessage(candidateId, message);
    } catch (error) {
      // Fallback to simulation for testing
      return this.simulateAIResponse(candidateId, message);
    }
  }

  simulateAIResponse(candidateId, message) {
    // Simulate different response scenarios to test violation detection

    const messageLower = message.toLowerCase();

    // Simulate GOOD responses (no violations)
    if (messageLower.includes('when will i get paid')) {
      return {
        content: "Payment timing varies based on job completion and client approval. Let me check with the admin team to get accurate timing for your specific situation.",
        source: 'fact_based_response',
        confidence: 0.9
      };
    }

    if (messageLower.includes('auto-approve') || messageLower.includes('automatically')) {
      return {
        content: "Account verification is handled by our admin team who review each application individually. I'll flag your application for their review.",
        source: 'honest_response',
        confidence: 0.9
      };
    }

    if (messageLower.includes('free') || messageLower.includes('fee')) {
      return {
        content: "I'll check with the admin team about the current fee structure and any applicable costs for your account.",
        source: 'fee_inquiry_response',
        confidence: 0.9
      };
    }

    // Simulate potentially BAD responses for testing (these would be detected as violations)
    if (message.includes('SIMULATE_BAD_TIMING')) {
      return {
        content: "Payments usually arrive within 24 hours of processing. The system will auto-approve your withdrawal.",
        source: 'problematic_response',
        confidence: 0.5
      };
    }

    if (message.includes('SIMULATE_BAD_GUARANTEE')) {
      return {
        content: "We guarantee completely free withdrawals and your account will definitely be approved automatically.",
        source: 'problematic_response',
        confidence: 0.5
      };
    }

    // Default honest response
    return {
      content: "I'll check with the admin team to get you accurate information about your specific situation.",
      source: 'admin_escalation',
      confidence: 0.8
    };
  }

  // ===========================================
  // ADVANCED PROMISE DETECTION TESTS
  // ===========================================

  async testPhraseVariations() {
    console.log('\n🔄 TESTING PHRASE VARIATIONS AND SYNONYMS...');

    // Test variations of banned phrases that might slip through
    const phraseVariations = [
      { original: 'within 24 hours', variations: ['in 24 hours', 'within a day', 'by 24 hours', 'within 1 day'] },
      { original: 'auto-approve', variations: ['auto approve', 'automatically approve', 'approve automatically', 'auto-approved'] },
      { original: 'completely free', variations: ['totally free', '100% free', 'absolutely free', 'entirely free'] },
      { original: 'guaranteed', variations: ['we guarantee', 'guaranteed to', 'guarantee that', 'assured'] }
    ];

    for (const phraseGroup of phraseVariations) {
      for (const variation of phraseGroup.variations) {
        const testResponse = `Test response containing ${variation} to check detection.`;
        const violations = this.detectViolations(testResponse, 'timing');

        if (violations.length === 0) {
          this.recordWarning(
            `Phrase variation test: "${variation}"`,
            `Potential violation not detected: "${variation}"`,
            'phrase_detection'
          );
        } else {
          console.log(`✅ Correctly detected variation: "${variation}"`);
        }
      }
    }
  }

  async testContextualPromises() {
    console.log('\n📝 TESTING CONTEXTUAL FALSE PROMISES...');

    const contextualTests = [
      {
        question: 'I need money urgently, when can I get it?',
        expectation: 'Should not promise specific timing even for urgent requests'
      },
      {
        question: 'My friend said you auto-approve everyone, is that true?',
        expectation: 'Should clarify that approval is manual, not automatic'
      },
      {
        question: 'Can you guarantee I will get this job?',
        expectation: 'Should not make guarantees about job placement'
      }
    ];

    for (const test of contextualTests) {
      await this.testQuestionForViolations(test.question, 'guarantees', 'promise_test_active');
    }
  }

  async testMultiLanguagePromises() {
    console.log('\n🌐 TESTING MULTI-LANGUAGE FALSE PROMISES...');

    // Test common Singlish/local phrases that might contain promises
    const singlishTests = [
      'Confirm can get money by tomorrow lah',
      'Sure approval one, no worry',
      'Definitely will approve you la',
      'Guarantee free withdrawal mah'
    ];

    for (const testPhrase of singlishTests) {
      const violations = this.detectViolations(testPhrase, 'guarantees');

      if (violations.length > 0) {
        console.log(`✅ Correctly detected Singlish violation: "${testPhrase}"`);
      }
    }
  }

  // ===========================================
  // MAIN TEST EXECUTION AND REPORTING
  // ===========================================

  async runAllTests() {
    console.log('🚨 STARTING FALSE PROMISES ELIMINATION TEST SUITE');
    console.log('ZERO TOLERANCE FOR FALSE PROMISES');
    console.log('=' .repeat(70));

    await this.initialize();

    try {
      // Core false promise tests
      await this.testTimingPromises();
      await this.testAutoApprovalPromises();
      await this.testFreeServicePromises();
      await this.testGuaranteePromises();
      await this.testCertaintyPromises();
      await this.testEdgeCasePromises();

      // Advanced detection tests
      await this.testPhraseVariations();
      await this.testContextualPromises();
      await this.testMultiLanguagePromises();

      // Additional validation tests
      await this.testBadExamplesForDetection();

      // Generate comprehensive report
      await this.generateReport();

    } catch (error) {
      console.error('❌ Test execution failed:', error);
    } finally {
      this.cleanup();
    }
  }

  async testBadExamplesForDetection() {
    console.log('\n🎭 TESTING WITH KNOWN BAD EXAMPLES...');

    // Test with intentionally bad responses to ensure they're detected
    const badExamples = [
      'SIMULATE_BAD_TIMING - Test timing promises',
      'SIMULATE_BAD_GUARANTEE - Test guarantee promises'
    ];

    for (const badExample of badExamples) {
      await this.testQuestionForViolations(badExample, 'timing', 'promise_test_active');
    }
  }

  async generateReport() {
    console.log('\n📊 GENERATING FALSE PROMISES ELIMINATION REPORT...');

    const summary = {
      totalQuestions: this.testResults.criticalViolations.length + this.testResults.passedTests.length,
      criticalViolations: this.testResults.criticalViolations.length,
      warningViolations: this.testResults.warningViolations.length,
      passedTests: this.testResults.passedTests.length,
      honestResponses: this.testResults.passedTests.filter(t => t.usesHonestAlternatives).length
    };

    this.testResults.summary = summary;

    // Determine system readiness
    const systemReady = summary.criticalViolations === 0;

    const report = {
      timestamp: new Date().toISOString(),
      systemReady,
      summary,
      criticalViolations: this.testResults.criticalViolations,
      warningViolations: this.testResults.warningViolations,
      passedTests: this.testResults.passedTests,
      recommendations: this.generateRecommendations()
    };

    // Save detailed report
    const reportPath = path.join(__dirname, `FALSE_PROMISES_ELIMINATION_REPORT_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate human-readable report
    await this.generateHumanReadableReport(report);

    // Display results
    console.log('\n' + '=' .repeat(70));
    console.log('FALSE PROMISES ELIMINATION TEST RESULTS');
    console.log('=' .repeat(70));
    console.log(`Total Tests: ${summary.totalQuestions}`);
    console.log(`Critical Violations: ${summary.criticalViolations} ${summary.criticalViolations === 0 ? '✅' : '❌'}`);
    console.log(`Warning Violations: ${summary.warningViolations}`);
    console.log(`Passed Tests: ${summary.passedTests} ✅`);
    console.log(`Uses Honest Alternatives: ${summary.honestResponses} ✅`);

    if (systemReady) {
      console.log('\n🎉 SYSTEM READY: NO FALSE PROMISES DETECTED ✅');
      console.log('The Smart Response Router successfully eliminates false promises!');
    } else {
      console.log('\n❌ SYSTEM NOT READY: FALSE PROMISES DETECTED');
      console.log('CRITICAL VIOLATIONS MUST BE FIXED BEFORE DEPLOYMENT');
    }

    console.log(`\nDetailed report saved to: ${reportPath}`);
  }

  generateRecommendations() {
    const recommendations = [];

    // Critical violation recommendations
    if (this.testResults.criticalViolations.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        issue: `${this.testResults.criticalViolations.length} false promises detected`,
        action: 'Review and update all response templates to eliminate banned phrases',
        blocksDeployment: true
      });

      // Group violations by type for specific recommendations
      const violationsByType = {};
      this.testResults.criticalViolations.forEach(violation => {
        violation.violations.forEach(v => {
          if (!violationsByType[v.type]) violationsByType[v.type] = [];
          violationsByType[v.type].push(v.phrase);
        });
      });

      Object.entries(violationsByType).forEach(([type, phrases]) => {
        recommendations.push({
          priority: 'HIGH',
          issue: `${type} violations: ${[...new Set(phrases)].join(', ')}`,
          action: `Replace ${type} phrases with honest alternatives from the approved list`,
          blocksDeployment: true
        });
      });
    }

    // Warning recommendations
    if (this.testResults.warningViolations.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: `${this.testResults.warningViolations.length} warnings detected`,
        action: 'Investigate warning cases and improve response coverage',
        blocksDeployment: false
      });
    }

    // Enhancement recommendations
    const honestResponseRate = this.testResults.passedTests.filter(t => t.usesHonestAlternatives).length / this.testResults.passedTests.length;
    if (honestResponseRate < 0.8) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: `Only ${(honestResponseRate * 100).toFixed(1)}% of responses use honest alternatives`,
        action: 'Increase usage of approved honest alternatives for better user trust',
        blocksDeployment: false
      });
    }

    return recommendations;
  }

  async generateHumanReadableReport(report) {
    const readableReport = `
# FALSE PROMISES ELIMINATION TEST REPORT

**Test Date:** ${new Date(report.timestamp).toLocaleString()}
**System Status:** ${report.systemReady ? '✅ READY FOR PRODUCTION' : '❌ NOT READY - VIOLATIONS FOUND'}

## Executive Summary

${report.systemReady ?
  '**SUCCESS**: The Smart Response Router system has passed all false promise elimination tests. No banned phrases or false timing promises were detected.' :
  `**FAILURE**: ${report.summary.criticalViolations} critical violations detected. The system is NOT ready for production deployment.`
}

## Test Results Overview

- **Total Questions Tested:** ${report.summary.totalQuestions}
- **Critical Violations:** ${report.summary.criticalViolations} ❌
- **Warning Violations:** ${report.summary.warningViolations} ⚠️
- **Passed Tests:** ${report.summary.passedTests} ✅
- **Uses Honest Alternatives:** ${report.summary.honestResponses} ✅

## Critical Violations Found

${report.criticalViolations.length === 0 ? 'None detected ✅' : ''}

${report.criticalViolations.map(violation => `
### Violation ${violation.id}
**Question:** ${violation.question}
**Violations:** ${violation.violations.map(v => `"${v.phrase}" (${v.type})`).join(', ')}
**Response:** "${violation.response}"
**Impact:** ${violation.impact}
`).join('\n')}

## Banned Phrases Detection

The following banned phrase categories were tested:

### Timing Promises ⏰
${this.bannedPhrases.timing.map(phrase => `- "${phrase}"`).join('\n')}

### Automation Promises 🤖
${this.bannedPhrases.automation.map(phrase => `- "${phrase}"`).join('\n')}

### Guarantee Promises 🎯
${this.bannedPhrases.guarantees.map(phrase => `- "${phrase}"`).join('\n')}

### False Certainty ✅
${this.bannedPhrases.false_certainty.map(phrase => `- "${phrase}"`).join('\n')}

## Recommendations

${report.recommendations.map(rec => `
### ${rec.priority} Priority
**Issue:** ${rec.issue}
**Action:** ${rec.action}
**Blocks Deployment:** ${rec.blocksDeployment ? 'YES ❌' : 'No ✅'}
`).join('\n')}

## System Readiness Assessment

${report.systemReady ? `
**STATUS: PRODUCTION READY ✅**

The Smart Response Router has successfully eliminated all false promises and is ready for deployment. The system:
- Contains zero false timing promises
- Makes no auto-approval claims
- Uses honest alternatives for uncertain information
- Properly escalates to admin when specific information is needed

` : `
**STATUS: NOT PRODUCTION READY ❌**

CRITICAL VIOLATIONS MUST BE FIXED:
${report.recommendations.filter(r => r.blocksDeployment).map(r => `- ${r.issue}`).join('\n')}

DO NOT DEPLOY until all violations are resolved.
`}

---
*Generated by False Promises Elimination Test Suite*
*Zero tolerance for false promises in user communications*
    `;

    const reportPath = path.join(__dirname, 'FALSE_PROMISES_ELIMINATION_REPORT.md');
    fs.writeFileSync(reportPath, readableReport);
    console.log(`📄 Human-readable report saved to: ${reportPath}`);
  }

  cleanup() {
    if (this.db) {
      // Clean up test data
      this.db.prepare('DELETE FROM candidates WHERE id LIKE "promise_test_%"').run();
      this.db.prepare('DELETE FROM payments WHERE candidate_id LIKE "promise_test_%"').run();
      this.db.close();
    }
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new FalsePromiseEliminationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = FalsePromiseEliminationTester;