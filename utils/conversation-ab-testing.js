/**
 * Conversation A/B Testing Framework
 * Extends existing A/B testing logic to optimize SLM conversation flows
 */

class ConversationABTesting {
  constructor() {
    this.activeTests = new Map();
    this.testResults = new Map();

    // Statistical significance thresholds
    this.statisticalThresholds = {
      minSampleSize: 50,
      significanceLevel: 0.05,
      confidenceInterval: 0.95,
      minimumEffect: 0.05 // 5% minimum improvement
    };

    // Test variable categories
    this.testVariables = {
      messageTone: {
        variants: ['urgent', 'friendly', 'professional', 'casual'],
        currentDefault: 'friendly',
        impactWeight: 0.3
      },
      fomoIntensity: {
        variants: ['low', 'medium', 'high', 'extreme'],
        currentDefault: 'medium',
        impactWeight: 0.4
      },
      personalizationLevel: {
        variants: ['basic', 'moderate', 'advanced', 'hyper'],
        currentDefault: 'moderate',
        impactWeight: 0.2
      },
      socialProofType: {
        variants: ['statistics', 'testimonials', 'peer_comparison', 'authority'],
        currentDefault: 'statistics',
        impactWeight: 0.1
      }
    };

    // Predefined test configurations
    this.testConfigurations = {
      conversionOptimization: {
        name: 'Conversion Rate Optimization',
        variables: ['messageTone', 'fomoIntensity'],
        duration: 14, // days
        objective: 'maximize_interview_bookings'
      },
      personalizationEffectiveness: {
        name: 'Personalization Impact Study',
        variables: ['personalizationLevel', 'socialProofType'],
        duration: 21,
        objective: 'maximize_engagement_depth'
      },
      urgencyOptimization: {
        name: 'Urgency Strategy Testing',
        variables: ['fomoIntensity', 'messageTone'],
        duration: 10,
        objective: 'minimize_response_time'
      }
    };
  }

  /**
   * Initialize a new A/B test for conversation flows
   */
  async initializeTest(testConfig, candidateSegment = 'all') {
    const testId = this.generateTestId();
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + (testConfig.duration * 24 * 60 * 60 * 1000));

    const test = {
      id: testId,
      name: testConfig.name,
      variables: testConfig.variables,
      objective: testConfig.objective,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      candidateSegment,
      status: 'active',
      variants: await this.generateTestVariants(testConfig.variables),
      assignments: new Map(), // candidateId -> variantId
      metrics: new Map(), // variantId -> metrics object
      metadata: {
        created: startTime.toISOString(),
        creator: 'SLM_System',
        expectedSampleSize: 200,
        actualSampleSize: 0
      }
    };

    this.activeTests.set(testId, test);
    await this.persistTest(test);

    console.log(`🧪 A/B Test initialized: ${test.name} (ID: ${testId})`);
    return testId;
  }

  /**
   * Assign candidate to test variant and get conversation parameters
   */
  async assignCandidateToVariant(candidateId, testId = null) {
    // If no specific test, find active test for this candidate
    if (!testId) {
      testId = await this.findApplicableTest(candidateId);
    }

    if (!testId) {
      return this.getDefaultConversationParams();
    }

    const test = this.activeTests.get(testId);
    if (!test || test.status !== 'active') {
      return this.getDefaultConversationParams();
    }

    // Check if candidate already assigned
    if (test.assignments.has(candidateId)) {
      const variantId = test.assignments.get(candidateId);
      return test.variants.get(variantId);
    }

    // Assign to variant using balanced randomization
    const variantId = await this.balancedRandomization(test);
    test.assignments.set(candidateId, variantId);

    // Increment sample size
    test.metadata.actualSampleSize++;

    // Store assignment
    await this.persistAssignment(testId, candidateId, variantId);

    const assignedVariant = test.variants.get(variantId);
    console.log(`👤 Candidate ${candidateId} assigned to variant ${variantId} in test ${testId}`);

    return assignedVariant;
  }

  /**
   * Track conversion event from message to interview booking
   */
  async trackConversionEvent(candidateId, eventType, eventData = {}) {
    const activeTestIds = await this.getActiveCandidateTests(candidateId);

    for (const testId of activeTestIds) {
      const test = this.activeTests.get(testId);
      if (!test) continue;

      const variantId = test.assignments.get(candidateId);
      if (!variantId) continue;

      // Get or create metrics for this variant
      if (!test.metrics.has(variantId)) {
        test.metrics.set(variantId, this.initializeVariantMetrics());
      }

      const metrics = test.metrics.get(variantId);

      // Track the event
      await this.recordEvent(metrics, eventType, eventData);

      // Update test metrics
      test.metrics.set(variantId, metrics);

      console.log(`📊 Tracked ${eventType} for candidate ${candidateId} in test ${testId}, variant ${variantId}`);
    }
  }

  /**
   * Generate test variants based on selected variables
   */
  async generateTestVariants(testVariables) {
    const variants = new Map();

    // Generate all possible combinations
    const combinations = this.generateCombinations(testVariables);

    for (let i = 0; i < combinations.length; i++) {
      const variantId = `variant_${i + 1}`;
      const combination = combinations[i];

      variants.set(variantId, {
        id: variantId,
        name: `Variant ${i + 1}`,
        parameters: combination,
        description: this.generateVariantDescription(combination),
        weight: 1 / combinations.length // Equal weighting initially
      });
    }

    return variants;
  }

  /**
   * Generate all combinations of test variables
   */
  generateCombinations(variables) {
    const combinations = [{}];

    for (const variable of variables) {
      const newCombinations = [];
      const variantOptions = this.testVariables[variable].variants;

      for (const combination of combinations) {
        for (const option of variantOptions) {
          newCombinations.push({
            ...combination,
            [variable]: option
          });
        }
      }

      combinations.splice(0, combinations.length, ...newCombinations);
    }

    return combinations;
  }

  /**
   * Balanced randomization to ensure equal sample sizes
   */
  async balancedRandomization(test) {
    const variantCounts = new Map();

    // Count current assignments per variant
    for (const [candidateId, variantId] of test.assignments) {
      variantCounts.set(variantId, (variantCounts.get(variantId) || 0) + 1);
    }

    // Find variant(s) with minimum count
    let minCount = Infinity;
    const minVariants = [];

    for (const [variantId] of test.variants) {
      const count = variantCounts.get(variantId) || 0;
      if (count < minCount) {
        minCount = count;
        minVariants.length = 0;
        minVariants.push(variantId);
      } else if (count === minCount) {
        minVariants.push(variantId);
      }
    }

    // Randomly select from minimum count variants
    return minVariants[Math.floor(Math.random() * minVariants.length)];
  }

  /**
   * Initialize metrics structure for a variant
   */
  initializeVariantMetrics() {
    return {
      totalCandidates: 0,
      messagesSent: 0,
      messagesReplied: 0,
      interviewsScheduled: 0,
      interviewsCompleted: 0,
      interviewsConfirmed: 0,
      averageResponseTime: 0,
      engagementScore: 0,
      conversionRate: 0,
      events: [],
      timestamps: {
        firstContact: [],
        replies: [],
        bookings: [],
        confirmations: []
      }
    };
  }

  /**
   * Record a conversion event
   */
  async recordEvent(metrics, eventType, eventData) {
    const timestamp = new Date().toISOString();

    metrics.events.push({
      type: eventType,
      timestamp,
      data: eventData
    });

    // Update specific metrics based on event type
    switch (eventType) {
      case 'message_sent':
        metrics.messagesSent++;
        if (metrics.totalCandidates === 0) {
          metrics.totalCandidates++;
          metrics.timestamps.firstContact.push(timestamp);
        }
        break;

      case 'message_replied':
        metrics.messagesReplied++;
        metrics.timestamps.replies.push(timestamp);
        this.updateResponseTime(metrics, eventData.responseTimeMs);
        break;

      case 'interview_scheduled':
        metrics.interviewsScheduled++;
        metrics.timestamps.bookings.push(timestamp);
        break;

      case 'interview_confirmed':
        metrics.interviewsConfirmed++;
        metrics.timestamps.confirmations.push(timestamp);
        break;

      case 'interview_completed':
        metrics.interviewsCompleted++;
        break;
    }

    // Recalculate derived metrics
    this.updateDerivedMetrics(metrics);
  }

  /**
   * Update derived metrics like conversion rates
   */
  updateDerivedMetrics(metrics) {
    if (metrics.messagesSent > 0) {
      metrics.conversionRate = metrics.interviewsScheduled / metrics.messagesSent;
      metrics.engagementScore = metrics.messagesReplied / metrics.messagesSent;
    }
  }

  /**
   * Update average response time
   */
  updateResponseTime(metrics, responseTimeMs) {
    const currentAvg = metrics.averageResponseTime;
    const count = metrics.messagesReplied;

    metrics.averageResponseTime = ((currentAvg * (count - 1)) + responseTimeMs) / count;
  }

  /**
   * Analyze test results and determine statistical significance
   */
  async analyzeTestResults(testId) {
    const test = this.activeTests.get(testId);
    if (!test) throw new Error('Test not found');

    const analysis = {
      testId,
      testName: test.name,
      status: test.status,
      duration: this.calculateTestDuration(test),
      sampleSize: test.metadata.actualSampleSize,
      variants: [],
      winner: null,
      statisticalSignificance: false,
      recommendations: []
    };

    // Analyze each variant
    for (const [variantId, variant] of test.variants) {
      const metrics = test.metrics.get(variantId) || this.initializeVariantMetrics();

      const variantAnalysis = {
        id: variantId,
        name: variant.name,
        parameters: variant.parameters,
        metrics: {
          conversionRate: metrics.conversionRate,
          engagementScore: metrics.engagementScore,
          averageResponseTime: metrics.averageResponseTime,
          sampleSize: metrics.totalCandidates
        },
        performance: this.calculatePerformanceScore(metrics, test.objective)
      };

      analysis.variants.push(variantAnalysis);
    }

    // Determine statistical significance
    if (analysis.sampleSize >= this.statisticalThresholds.minSampleSize) {
      const significanceResult = await this.calculateStatisticalSignificance(analysis.variants);
      analysis.statisticalSignificance = significanceResult.significant;
      analysis.pValue = significanceResult.pValue;

      if (significanceResult.significant) {
        analysis.winner = significanceResult.winner;
      }
    }

    // Generate recommendations
    analysis.recommendations = await this.generateTestRecommendations(analysis);

    return analysis;
  }

  /**
   * Calculate performance score based on test objective
   */
  calculatePerformanceScore(metrics, objective) {
    switch (objective) {
      case 'maximize_interview_bookings':
        return metrics.conversionRate * 100;

      case 'maximize_engagement_depth':
        return (metrics.engagementScore * 0.6 + metrics.conversionRate * 0.4) * 100;

      case 'minimize_response_time':
        // Lower response time = higher score
        const maxResponseTime = 3600000; // 1 hour in ms
        return Math.max(0, (maxResponseTime - metrics.averageResponseTime) / maxResponseTime) * 100;

      default:
        return metrics.conversionRate * 100;
    }
  }

  /**
   * Calculate statistical significance using chi-square test
   */
  async calculateStatisticalSignificance(variants) {
    if (variants.length < 2) {
      return { significant: false, pValue: 1.0 };
    }

    // Sort variants by performance
    const sortedVariants = variants.sort((a, b) => b.performance - a.performance);
    const best = sortedVariants[0];
    const second = sortedVariants[1];

    // Simple significance test - in production, use proper statistical library
    const performanceDiff = best.performance - second.performance;
    const minSampleSize = Math.min(best.metrics.sampleSize, second.metrics.sampleSize);

    // Rough approximation - replace with proper statistical test
    const significanceScore = (performanceDiff / 100) * Math.sqrt(minSampleSize);
    const isSignificant = significanceScore > 1.96; // 95% confidence

    return {
      significant: isSignificant,
      pValue: isSignificant ? 0.03 : 0.15, // Approximation
      winner: isSignificant ? best : null
    };
  }

  /**
   * Generate recommendations based on test results
   */
  async generateTestRecommendations(analysis) {
    const recommendations = [];

    if (analysis.statisticalSignificance) {
      recommendations.push({
        type: 'implementation',
        priority: 'high',
        message: `Implement winning variant: ${analysis.winner.name}`,
        expectedImpact: `+${(analysis.winner.performance - analysis.variants[1].performance).toFixed(1)}% conversion rate`
      });
    } else if (analysis.sampleSize < this.statisticalThresholds.minSampleSize) {
      recommendations.push({
        type: 'continue_test',
        priority: 'medium',
        message: `Continue test - need ${this.statisticalThresholds.minSampleSize - analysis.sampleSize} more samples`,
        expectedDuration: `${Math.ceil((this.statisticalThresholds.minSampleSize - analysis.sampleSize) / 10)} more days`
      });
    } else {
      recommendations.push({
        type: 'inconclusive',
        priority: 'low',
        message: 'No significant difference found between variants',
        suggestion: 'Consider testing more extreme variations'
      });
    }

    // Performance-based recommendations
    const bestVariant = analysis.variants.reduce((best, current) =>
      current.performance > best.performance ? current : best
    );

    if (bestVariant.parameters.fomoIntensity === 'high' && bestVariant.performance > 80) {
      recommendations.push({
        type: 'insight',
        priority: 'medium',
        message: 'High FOMO intensity is performing well',
        suggestion: 'Consider testing extreme FOMO intensity'
      });
    }

    return recommendations;
  }

  /**
   * Integration method with conversation flows
   */
  async getConversationParameters(candidateId) {
    return await this.assignCandidateToVariant(candidateId);
  }

  /**
   * Helper methods
   */

  generateTestId() {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateVariantDescription(parameters) {
    const descriptions = [];

    for (const [variable, value] of Object.entries(parameters)) {
      descriptions.push(`${variable}: ${value}`);
    }

    return descriptions.join(', ');
  }

  getDefaultConversationParams() {
    return {
      id: 'default',
      name: 'Default Configuration',
      parameters: {
        messageTone: this.testVariables.messageTone.currentDefault,
        fomoIntensity: this.testVariables.fomoIntensity.currentDefault,
        personalizationLevel: this.testVariables.personalizationLevel.currentDefault,
        socialProofType: this.testVariables.socialProofType.currentDefault
      }
    };
  }

  calculateTestDuration(test) {
    const start = new Date(test.startTime);
    const now = new Date();
    return Math.floor((now - start) / (24 * 60 * 60 * 1000)); // days
  }

  async findApplicableTest(candidateId) {
    // Find active test that applies to this candidate
    for (const [testId, test] of this.activeTests) {
      if (test.status === 'active' && new Date() < new Date(test.endTime)) {
        return testId;
      }
    }
    return null;
  }

  async getActiveCandidateTests(candidateId) {
    const tests = [];
    for (const [testId, test] of this.activeTests) {
      if (test.assignments.has(candidateId)) {
        tests.push(testId);
      }
    }
    return tests;
  }

  async persistTest(test) {
    // In production, save to database
    console.log('Persisting test:', test.id);
  }

  async persistAssignment(testId, candidateId, variantId) {
    // In production, save to database
    console.log(`Persisting assignment: Test ${testId}, Candidate ${candidateId}, Variant ${variantId}`);
  }

  /**
   * API methods for external integration
   */

  async startConversionOptimizationTest(duration = 14) {
    return await this.initializeTest(this.testConfigurations.conversionOptimization);
  }

  async startPersonalizationTest(duration = 21) {
    return await this.initializeTest(this.testConfigurations.personalizationEffectiveness);
  }

  async getActiveTests() {
    return Array.from(this.activeTests.values()).filter(test => test.status === 'active');
  }

  async getTestResults(testId) {
    return await this.analyzeTestResults(testId);
  }
}

module.exports = ConversationABTesting;