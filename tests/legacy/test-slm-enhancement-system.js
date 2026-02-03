#!/usr/bin/env node

/**
 * SLM Conversion Funnel Enhancement System Test Suite
 * Comprehensive testing of all enhancement components
 */

const path = require('path');

// Import enhancement components
const EnhancedConversationFlows = require('./utils/enhanced-conversation-flows');
const ConversationABTesting = require('./utils/conversation-ab-testing');
const SLMConversionAnalytics = require('./utils/slm-conversion-analytics');
const MultilingualConversationEngine = require('./utils/multilingual-conversation-engine');

class SLMEnhancementTester {
  constructor() {
    this.enhancedFlows = new EnhancedConversationFlows();
    this.abTesting = new ConversationABTesting();
    this.analytics = new SLMConversionAnalytics();
    this.multilingualEngine = new MultilingualConversationEngine();

    this.testResults = {
      enhancedFlows: { passed: 0, failed: 0, tests: [] },
      abTesting: { passed: 0, failed: 0, tests: [] },
      analytics: { passed: 0, failed: 0, tests: [] },
      multilingual: { passed: 0, failed: 0, tests: [] },
      integration: { passed: 0, failed: 0, tests: [] }
    };

    // Test data
    this.testCandidate = {
      id: 'test_candidate_123',
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+65 9123 4567',
      location: 'Singapore',
      status: 'pending',
      experience: '3 years',
      source: 'direct'
    };

    this.testMessage = "Hi, I'm interested in job opportunities";
    this.testContext = {
      currentStage: 'pending',
      sessionId: 'session_123',
      lastMessageTime: new Date().toISOString()
    };
  }

  /**
   * Run all test suites
   */
  async runAllTests() {
    console.log('🧪 Starting SLM Enhancement System Test Suite');
    console.log('='.repeat(60));

    try {
      // Test Enhanced Conversation Flows
      console.log('\n📝 Testing Enhanced Conversation Flows...');
      await this.testEnhancedFlows();

      // Test A/B Testing Framework
      console.log('\n🔬 Testing A/B Testing Framework...');
      await this.testABTesting();

      // Test Analytics Engine
      console.log('\n📊 Testing Analytics Engine...');
      await this.testAnalytics();

      // Test Multilingual Engine
      console.log('\n🌍 Testing Multilingual Engine...');
      await this.testMultilingualEngine();

      // Test System Integration
      console.log('\n🔗 Testing System Integration...');
      await this.testIntegration();

      // Generate final report
      this.generateTestReport();

    } catch (error) {
      console.error('❌ Test suite error:', error);
    }
  }

  /**
   * Test Enhanced Conversation Flows
   */
  async testEnhancedFlows() {
    const tests = [
      {
        name: 'Ultra-Welcome Template Generation',
        test: async () => {
          const fomoContext = await this.enhancedFlows.generateFOMOContext(
            this.testCandidate,
            this.testContext
          );
          const template = this.enhancedFlows.generateUltraWelcomeTemplate(
            this.testCandidate,
            fomoContext
          );

          return template &&
                 template.type === 'ultra_welcome' &&
                 template.content.includes('PRIORITY ACCESS') &&
                 template.metadata.expectedConversionLift === 0.25;
        }
      },
      {
        name: 'Scarcity Scheduling Template',
        test: async () => {
          const fomoContext = await this.enhancedFlows.generateFOMOContext(
            this.testCandidate,
            this.testContext
          );
          const template = this.enhancedFlows.generateScarcitySchedulingTemplate(
            this.testCandidate,
            fomoContext
          );

          return template &&
                 template.type === 'scarcity_scheduling' &&
                 template.content.includes('HIGH DEMAND ALERT') &&
                 template.conversionTactic === 'slot_scarcity';
        }
      },
      {
        name: 'Social Proof Template',
        test: async () => {
          const fomoContext = await this.enhancedFlows.generateFOMOContext(
            this.testCandidate,
            this.testContext
          );
          const template = this.enhancedFlows.generateSocialProofTemplate(
            this.testCandidate,
            fomoContext
          );

          return template &&
                 template.type === 'social_proof' &&
                 template.content.includes('RECENT SUCCESS STORIES') &&
                 template.conversionTactic === 'peer_validation';
        }
      },
      {
        name: 'Last Chance Urgency Template',
        test: async () => {
          const fomoContext = await this.enhancedFlows.generateFOMOContext(
            this.testCandidate,
            this.testContext
          );
          const template = this.enhancedFlows.generateLastChanceTemplate(
            this.testCandidate,
            fomoContext
          );

          return template &&
                 template.type === 'last_chance' &&
                 template.content.includes('FINAL NOTICE') &&
                 template.conversionTactic === 'deadline_urgency';
        }
      },
      {
        name: 'Conversation Orchestration',
        test: async () => {
          const response = await this.enhancedFlows.orchestrateConversation(
            this.testCandidate.id,
            this.testMessage,
            this.testContext
          );

          return response &&
                 response.type &&
                 response.content &&
                 response.metadata &&
                 response.metadata.candidateId === this.testCandidate.id;
        }
      }
    ];

    await this.runTestSuite('enhancedFlows', tests);
  }

  /**
   * Test A/B Testing Framework
   */
  async testABTesting() {
    const tests = [
      {
        name: 'Test Configuration Loading',
        test: async () => {
          const testConfig = this.abTesting.testConfigurations.conversionOptimization;
          return testConfig &&
                 testConfig.name === 'Conversion Rate Optimization' &&
                 testConfig.variables.includes('messageTone');
        }
      },
      {
        name: 'Test Variant Generation',
        test: async () => {
          const variants = await this.abTesting.generateTestVariants(['messageTone', 'fomoIntensity']);
          return variants.size > 0 &&
                 Array.from(variants.values())[0].parameters.messageTone &&
                 Array.from(variants.values())[0].parameters.fomoIntensity;
        }
      },
      {
        name: 'Candidate Assignment',
        test: async () => {
          const assignment = await this.abTesting.assignCandidateToVariant(this.testCandidate.id);
          return assignment &&
                 assignment.id &&
                 assignment.parameters;
        }
      },
      {
        name: 'Conversion Tracking',
        test: async () => {
          try {
            await this.abTesting.trackConversionEvent(
              this.testCandidate.id,
              'message_sent',
              { responseTimeMs: 30000 }
            );
            return true;
          } catch (error) {
            console.error('Tracking error:', error);
            return false;
          }
        }
      },
      {
        name: 'Statistical Analysis',
        test: async () => {
          // Initialize a test first
          const testId = await this.abTesting.initializeTest(
            this.abTesting.testConfigurations.conversionOptimization
          );

          const analysis = await this.abTesting.analyzeTestResults(testId);
          return analysis &&
                 analysis.testId === testId &&
                 Array.isArray(analysis.variants) &&
                 Array.isArray(analysis.recommendations);
        }
      }
    ];

    await this.runTestSuite('abTesting', tests);
  }

  /**
   * Test Analytics Engine
   */
  async testAnalytics() {
    const tests = [
      {
        name: 'Funnel Progression Tracking',
        test: async () => {
          const progression = await this.analytics.trackFunnelProgression(
            this.testCandidate.id,
            'pending',
            'contacted',
            { template: 'ultra_welcome' }
          );

          return progression &&
                 progression.candidateId === this.testCandidate.id &&
                 progression.fromStage === 'pending' &&
                 progression.toStage === 'contacted';
        }
      },
      {
        name: 'Real-Time Metrics',
        test: async () => {
          const metrics = await this.analytics.getRealTimeMetrics();
          return metrics &&
                 metrics.timestamp &&
                 metrics.live &&
                 typeof metrics.live.activeConversations === 'number';
        }
      },
      {
        name: 'Conversion Prediction',
        test: async () => {
          const prediction = await this.analytics.predictConversionLikelihood(
            this.testCandidate.id,
            this.testContext
          );

          return prediction &&
                 prediction.candidateId === this.testCandidate.id &&
                 typeof prediction.likelihood === 'number' &&
                 prediction.likelihood >= 0 && prediction.likelihood <= 1 &&
                 Array.isArray(prediction.recommendations);
        }
      },
      {
        name: 'Hot Lead Identification',
        test: async () => {
          const hotLeads = await this.analytics.identifyHotLeads();
          return Array.isArray(hotLeads);
        }
      },
      {
        name: 'Performance Dashboard',
        test: async () => {
          const dashboard = await this.analytics.getPerformanceDashboard();
          return dashboard &&
                 dashboard.realTime &&
                 dashboard.funnel &&
                 dashboard.predictions;
        }
      }
    ];

    await this.runTestSuite('analytics', tests);
  }

  /**
   * Test Multilingual Engine
   */
  async testMultilingualEngine() {
    const tests = [
      {
        name: 'Language Detection from Name',
        test: async () => {
          const chineseName = this.multilingualEngine.detectLanguageFromName('Li Wei Ming');
          const malayName = this.multilingualEngine.detectLanguageFromName('Muhammad Hassan bin Ahmad');
          const tamilName = this.multilingualEngine.detectLanguageFromName('Rajesh Kumar');

          return chineseName?.language === 'zh' &&
                 malayName?.language === 'ms' &&
                 tamilName?.language === 'ta';
        }
      },
      {
        name: 'Language Detection from Message',
        test: async () => {
          const chineseText = await this.multilingualEngine.detectLanguageFromMessages([
            { sender: 'candidate', content: '你好，我想了解工作机会' }
          ]);
          const malayText = await this.multilingualEngine.detectLanguageFromMessages([
            { sender: 'candidate', content: 'Saya berminat dengan peluang kerja' }
          ]);

          return chineseText?.language === 'zh' &&
                 malayText?.language === 'ms';
        }
      },
      {
        name: 'Cultural Adaptation',
        test: async () => {
          const baseTemplate = {
            type: 'welcome',
            tone: 'urgent',
            content: 'Hi {firstName}! We have urgent opportunities available.'
          };

          const culturalAdaptation = this.multilingualEngine.culturalAdaptations['zh-SG'];
          const adaptedTemplate = await this.multilingualEngine.applyCulturalFOMO(
            this.testCandidate.id,
            baseTemplate,
            culturalAdaptation,
            { primaryLanguage: 'zh', region: 'SG' }
          );

          return adaptedTemplate && adaptedTemplate.content;
        }
      },
      {
        name: 'Content Localization',
        test: async () => {
          const template = {
            content: 'Salary: $5000 per month. Interview time: 2:00 PM'
          };

          const localized = await this.multilingualEngine.localizeContent(
            template,
            'zh',
            'SG',
            { currencyFormat: 'SGD', timeFormat: '24h' }
          );

          return localized.content.includes('S$') &&
                 localized.content.includes('14:00');
        }
      },
      {
        name: 'Full Multilingual Response Generation',
        test: async () => {
          const baseTemplate = {
            type: 'welcome',
            tone: 'friendly',
            content: 'Hi John! Welcome to WorkLink opportunities.'
          };

          const multilingualResponse = await this.multilingualEngine.generateMultilingualResponse(
            this.testCandidate.id,
            baseTemplate,
            this.testContext
          );

          return multilingualResponse &&
                 multilingualResponse.type === 'culturally_adapted' &&
                 multilingualResponse.content &&
                 multilingualResponse.metadata;
        }
      }
    ];

    await this.runTestSuite('multilingual', tests);
  }

  /**
   * Test System Integration
   */
  async testIntegration() {
    const tests = [
      {
        name: 'Enhanced Flow + A/B Testing Integration',
        test: async () => {
          // Get A/B testing parameters
          const abParams = await this.abTesting.getConversationParameters(this.testCandidate.id);

          // Generate enhanced conversation with A/B testing
          const enhancedResponse = await this.enhancedFlows.orchestrateConversation(
            this.testCandidate.id,
            this.testMessage,
            { ...this.testContext, abTestParams: abParams }
          );

          return enhancedResponse &&
                 enhancedResponse.content &&
                 enhancedResponse.type;
        }
      },
      {
        name: 'Enhanced Flow + Multilingual Integration',
        test: async () => {
          // Generate base enhanced response
          const baseResponse = await this.enhancedFlows.orchestrateConversation(
            this.testCandidate.id,
            this.testMessage,
            this.testContext
          );

          // Apply multilingual enhancement
          const multilingualResponse = await this.multilingualEngine.generateMultilingualResponse(
            this.testCandidate.id,
            baseResponse,
            this.testContext
          );

          return multilingualResponse &&
                 multilingualResponse.type === 'culturally_adapted' &&
                 multilingualResponse.content;
        }
      },
      {
        name: 'Full Pipeline Integration',
        test: async () => {
          // 1. Get A/B testing parameters
          const abParams = await this.abTesting.getConversationParameters(this.testCandidate.id);

          // 2. Generate enhanced conversation
          const baseResponse = await this.enhancedFlows.orchestrateConversation(
            this.testCandidate.id,
            this.testMessage,
            { ...this.testContext, abTestParams: abParams }
          );

          // 3. Apply multilingual enhancement
          const finalResponse = await this.multilingualEngine.generateMultilingualResponse(
            this.testCandidate.id,
            baseResponse,
            this.testContext
          );

          // 4. Track analytics
          await this.analytics.trackFunnelProgression(
            this.testCandidate.id,
            'pending',
            'contacted',
            {
              template: finalResponse.type,
              abVariant: abParams?.id,
              language: finalResponse.language
            }
          );

          // 5. Track A/B test event
          await this.abTesting.trackConversionEvent(
            this.testCandidate.id,
            'message_sent',
            { template: finalResponse.type }
          );

          return finalResponse &&
                 finalResponse.content &&
                 finalResponse.metadata;
        }
      },
      {
        name: 'Performance Under Load',
        test: async () => {
          const startTime = Date.now();
          const promises = [];

          // Simulate 10 concurrent conversation generations
          for (let i = 0; i < 10; i++) {
            promises.push(
              this.enhancedFlows.orchestrateConversation(
                `test_candidate_${i}`,
                this.testMessage,
                this.testContext
              )
            );
          }

          const responses = await Promise.all(promises);
          const endTime = Date.now();
          const avgResponseTime = (endTime - startTime) / 10;

          console.log(`   ⏱️  Average response time: ${avgResponseTime}ms`);

          return responses.every(r => r && r.content) &&
                 avgResponseTime < 5000; // Should complete within 5 seconds per conversation
        }
      }
    ];

    await this.runTestSuite('integration', tests);
  }

  /**
   * Run a test suite
   */
  async runTestSuite(suiteName, tests) {
    const suite = this.testResults[suiteName];

    for (const test of tests) {
      try {
        console.log(`  🧪 ${test.name}...`);
        const result = await test.test();

        if (result) {
          console.log(`    ✅ PASS`);
          suite.passed++;
          suite.tests.push({ name: test.name, status: 'PASS' });
        } else {
          console.log(`    ❌ FAIL`);
          suite.failed++;
          suite.tests.push({ name: test.name, status: 'FAIL' });
        }
      } catch (error) {
        console.log(`    💥 ERROR: ${error.message}`);
        suite.failed++;
        suite.tests.push({ name: test.name, status: 'ERROR', error: error.message });
      }
    }
  }

  /**
   * Generate final test report
   */
  generateTestReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SLM Enhancement System Test Report');
    console.log('='.repeat(60));

    let totalPassed = 0;
    let totalFailed = 0;

    for (const [suiteName, results] of Object.entries(this.testResults)) {
      const total = results.passed + results.failed;
      const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : '0.0';

      console.log(`\n📝 ${suiteName.toUpperCase()}`);
      console.log(`   Passed: ${results.passed}`);
      console.log(`   Failed: ${results.failed}`);
      console.log(`   Pass Rate: ${passRate}%`);

      totalPassed += results.passed;
      totalFailed += results.failed;

      // Show failed tests
      const failedTests = results.tests.filter(t => t.status !== 'PASS');
      if (failedTests.length > 0) {
        console.log(`   Failed Tests:`);
        failedTests.forEach(test => {
          console.log(`     - ${test.name}: ${test.status}${test.error ? ' (' + test.error + ')' : ''}`);
        });
      }
    }

    const totalTests = totalPassed + totalFailed;
    const overallPassRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0.0';

    console.log('\n' + '='.repeat(60));
    console.log('🎯 OVERALL RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Pass Rate: ${overallPassRate}%`);

    if (overallPassRate >= 80) {
      console.log('\n🎉 SLM Enhancement System is ready for deployment!');
    } else if (overallPassRate >= 60) {
      console.log('\n⚠️  SLM Enhancement System needs optimization before deployment.');
    } else {
      console.log('\n❌ SLM Enhancement System requires significant fixes before deployment.');
    }

    console.log('\n📋 Deployment Readiness:');
    console.log(`   Enhanced Flows: ${this.getDeploymentStatus('enhancedFlows')}`);
    console.log(`   A/B Testing: ${this.getDeploymentStatus('abTesting')}`);
    console.log(`   Analytics: ${this.getDeploymentStatus('analytics')}`);
    console.log(`   Multilingual: ${this.getDeploymentStatus('multilingual')}`);
    console.log(`   Integration: ${this.getDeploymentStatus('integration')}`);
  }

  /**
   * Get deployment status for a component
   */
  getDeploymentStatus(component) {
    const results = this.testResults[component];
    const total = results.passed + results.failed;
    const passRate = total > 0 ? (results.passed / total) : 0;

    if (passRate >= 0.8) return '✅ Ready';
    if (passRate >= 0.6) return '⚠️ Needs optimization';
    return '❌ Not ready';
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SLMEnhancementTester();
  tester.runAllTests().catch(console.error);
}

module.exports = SLMEnhancementTester;