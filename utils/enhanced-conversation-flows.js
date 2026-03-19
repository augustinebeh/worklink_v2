/**
 * Enhanced Conversation Flows with FOMO-Driven Templates
 * Integrates with existing SLM scheduling bridge to boost conversion rates
 */


const { createLogger } = require('./structured-logger');
const logger = createLogger('enhanced-conversation-flows');

class EnhancedConversationFlows {
  constructor(slmBridge = null) {
    this.slmBridge = slmBridge;
    this.currentConversions = 0;
    this.targetConversionRate = 85; // Target 85%+ from current 70%

    // FOMO strategy configurations
    this.fomoStrategies = {
      scarcity: {
        enabled: true,
        slotsRemaining: this.generateDynamicSlotCount(),
        timeWindow: '24 hours',
        urgencyLevel: 'medium'
      },
      socialProof: {
        enabled: true,
        recentHires: [],
        successRate: '94%',
        averageTimeToHire: '3 days'
      },
      timeDependent: {
        enabled: true,
        limitedOffer: true,
        fastTrackBonus: true,
        countdown: this.generateCountdown()
      }
    };

    // Dynamic conversation templates with FOMO integration
    this.conversationTemplates = {
      // Ultra-high conversion welcome flow
      ultraWelcome: {
        priority: 1,
        conversionBoost: 0.25,
        template: this.generateUltraWelcomeTemplate,
        triggers: ['first_contact', 'pending_status'],
        nextActions: ['immediate_scheduling', 'fomo_amplification']
      },

      // Scarcity-driven scheduling
      scarcityScheduling: {
        priority: 2,
        conversionBoost: 0.20,
        template: this.generateScarcitySchedulingTemplate,
        triggers: ['schedule_interest', 'availability_inquiry'],
        nextActions: ['countdown_pressure', 'social_proof']
      },

      // Social proof amplification
      socialProofFlow: {
        priority: 3,
        conversionBoost: 0.15,
        template: this.generateSocialProofTemplate,
        triggers: ['hesitation', 'questions_about_process'],
        nextActions: ['success_stories', 'urgency_creation']
      },

      // Last chance urgency
      lastChanceFlow: {
        priority: 4,
        conversionBoost: 0.30,
        template: this.generateLastChanceTemplate,
        triggers: ['abandonment_risk', 'delay_signals'],
        nextActions: ['immediate_action', 'escalation']
      }
    };

    // Personalization engines
    this.personalization = {
      timeBasedMessaging: true,
      geographicAdaptation: true,
      experienceLevelMatching: true,
      industrySpecificFOMO: true
    };
  }

  /**
   * Main orchestration method - analyzes context and selects optimal flow
   */
  async orchestrateConversation(candidateId, message, context = {}) {
    try {
      const candidate = await this.getCandidateProfile(candidateId);
      const conversationState = await this.analyzeConversationState(candidateId, context);
      const fomoContext = await this.generateFOMOContext(candidate, conversationState);

      // Select optimal conversation template based on AI analysis
      const selectedTemplate = await this.selectOptimalTemplate(
        candidate,
        message,
        conversationState,
        fomoContext
      );

      // Generate personalized response with FOMO elements
      const response = await this.generatePersonalizedResponse(
        selectedTemplate,
        candidate,
        message,
        fomoContext
      );

      // Track conversion metrics
      await this.trackConversionMetrics(candidateId, selectedTemplate, response);

      return response;

    } catch (error) {
      logger.error('Enhanced conversation flow error:', { error: error });
      return this.generateFallbackResponse();
    }
  }

  /**
   * Ultra-high conversion welcome template with immediate FOMO
   */
  generateUltraWelcomeTemplate(candidate, fomoContext) {
    const firstName = candidate.name.split(' ')[0];
    const slotsRemaining = fomoContext.scarcity.slotsRemaining;
    const countdown = fomoContext.timeDependent.countdown;
    const recentHire = fomoContext.socialProof.recentHire;

    return {
      type: 'ultra_welcome',
      conversionTactic: 'immediate_fomo',
      content: `🚨 **PRIORITY ACCESS** - ${firstName}!

⚡ **BREAKING**: Only ${slotsRemaining} interview slots remain for this week!

Your WorkLink application just triggered our **FAST-TRACK ALERT**:

🎯 **IMMEDIATE OPPORTUNITY**:
• Skip the queue - interview slot reserved for next ${countdown}
• ${recentHire.name} (${recentHire.experience}) just got hired in ${recentHire.timeToHire}
• 94% of candidates who interview within 24hrs get job offers
• Average salary increase: ${fomoContext.salaryIncrease}

⏰ **YOUR WINDOW**: ${countdown} to secure your spot

**INSTANT ACTION REQUIRED**:
Type "**BOOK NOW**" to claim your priority slot, or
Type "**TIMES**" to see available slots

⚠️ Warning: Slots are being claimed every 3 minutes. Your priority access expires in ${countdown}.

Ready to fast-track your career? 🚀`,

      metadata: {
        candidateId: candidate.id,
        template: 'ultra_welcome',
        fomoLevel: 'maximum',
        urgencyScore: 0.95,
        expectedConversionLift: 0.25
      },

      schedulingContext: {
        priority: 'maximum',
        fastTrack: true,
        countdownActive: true,
        socialProofActive: true
      }
    };
  }

  /**
   * Scarcity-driven scheduling template
   */
  generateScarcitySchedulingTemplate(candidate, fomoContext) {
    const firstName = candidate.name.split(' ')[0];
    const timeSlots = fomoContext.availableSlots;
    const competitorCount = fomoContext.scarcity.competitorCount;

    return {
      type: 'scarcity_scheduling',
      conversionTactic: 'slot_scarcity',
      content: `🔥 **HIGH DEMAND ALERT** - ${firstName}!

**SITUATION**: ${competitorCount} other candidates are viewing these exact same time slots RIGHT NOW.

📅 **PREMIUM SLOTS AVAILABLE** (updating in real-time):
${this.formatAvailableSlots(timeSlots)}

⚡ **COMPETITIVE ADVANTAGE**:
• Book now = Skip 48hr processing queue
• These slots won't last - 7 booked in the last hour
• Interview today = Start work this week

🎯 **EXCLUSIVE BENEFITS** (only available for immediate booking):
• Priority job matching
• Salary negotiation support
• Fast-track certification access

**⏰ CLAIM YOUR SLOT**: Choose a number (1-3) or type "BOOK [NUMBER]"

Note: While you're reading this, other candidates are booking. Secure your future now! 🚀

*${this.getLiveBookingAlert()}*`,

      metadata: {
        candidateId: candidate.id,
        template: 'scarcity_scheduling',
        availableSlots: timeSlots,
        competitorCount: competitorCount,
        urgencyScore: 0.85
      }
    };
  }

  /**
   * Social proof amplification template
   */
  generateSocialProofTemplate(candidate, fomoContext) {
    const firstName = candidate.name.split(' ')[0];
    const successStories = fomoContext.socialProof.successStories;
    const industryStats = fomoContext.industrySpecific;

    return {
      type: 'social_proof',
      conversionTactic: 'peer_validation',
      content: `💼 **${firstName}, see what others achieved this week**:

🌟 **RECENT SUCCESS STORIES**:
${this.formatSuccessStories(successStories)}

📊 **${industryStats.industry} INDUSTRY INSIGHTS**:
• Average salary increase: ${industryStats.salaryIncrease}
• Job placement rate: ${industryStats.placementRate}
• Time to placement: ${industryStats.avgPlacement}

🚀 **WHAT MAKES THE DIFFERENCE**?
Candidates who schedule interviews within 24hrs are:
• 3x more likely to receive multiple offers
• Earn $${industryStats.bonusEarnings} more on average
• Get hired ${industryStats.fasterPlacement} faster

**Ready to join them?**
📅 "**SCHEDULE**" - Book your success interview
💬 "**STORIES**" - See more success stories
❓ "**DETAILS**" - Learn about the process

Your future colleagues are waiting! 🤝`,

      metadata: {
        candidateId: candidate.id,
        template: 'social_proof',
        successStories: successStories.length,
        industryFocus: industryStats.industry
      }
    };
  }

  /**
   * Last chance urgency template
   */
  generateLastChanceTemplate(candidate, fomoContext) {
    const firstName = candidate.name.split(' ')[0];
    const finalCountdown = fomoContext.timeDependent.finalCountdown;
    const lastSlots = fomoContext.scarcity.lastSlots;

    return {
      type: 'last_chance',
      conversionTactic: 'deadline_urgency',
      content: `🚨 **FINAL NOTICE** - ${firstName}

**CRITICAL DEADLINE**: ${finalCountdown} until interview slots close for this cycle.

⚠️ **LAST CHANCE STATUS**:
• Only ${lastSlots} slots remain (down from 50 this morning)
• Next available slots: 2 weeks from now
• 12 candidates currently in queue for remaining spots

🎯 **WHAT YOU'RE ABOUT TO LOSE**:
❌ Fast-track processing (normally 2-week wait)
❌ Priority job matching
❌ Immediate start opportunities
❌ $2,000 average salary premium for quick-start candidates

**⏰ IMMEDIATE ACTION REQUIRED**:

Type "**FINAL SLOT**" to claim the last available interview time, or risk waiting until ${fomoContext.nextAvailability}.

This is your final opportunity to:
✅ Skip the standard queue
✅ Interview this week
✅ Start earning immediately

**Decide now**: Career acceleration or standard processing?

⚡ **BOOK FINAL SLOT** - Claim your spot
🔄 **WAIT 2 WEEKS** - Join standard queue

Time remaining: ${finalCountdown} ⏳`,

      metadata: {
        candidateId: candidate.id,
        template: 'last_chance',
        urgencyLevel: 'critical',
        finalWarning: true,
        timeRemaining: finalCountdown
      },

      schedulingContext: {
        priority: 'critical',
        lastChance: true,
        escalationReady: true
      }
    };
  }

  /**
   * Dynamic branching based on candidate behavior patterns
   */
  async selectOptimalTemplate(candidate, message, conversationState, fomoContext) {
    const behaviorAnalysis = await this.analyzeBehaviorPatterns(candidate, message, conversationState);

    // AI-driven template selection logic
    if (behaviorAnalysis.abandonmentRisk > 0.7) {
      return this.conversationTemplates.lastChanceFlow;
    }

    if (behaviorAnalysis.hesitationSignals > 0.5) {
      return this.conversationTemplates.socialProofFlow;
    }

    if (behaviorAnalysis.immediacyIndicators > 0.6) {
      return this.conversationTemplates.scarcityScheduling;
    }

    // Default to ultra-welcome for new candidates
    return this.conversationTemplates.ultraWelcome;
  }

  /**
   * Generate dynamic FOMO context based on real-time data
   */
  async generateFOMOContext(candidate, conversationState) {
    const currentTime = new Date();
    const timeOfDay = currentTime.getHours();

    return {
      scarcity: {
        slotsRemaining: this.generateDynamicSlotCount(),
        competitorCount: Math.floor(Math.random() * 8) + 3, // 3-10 competitors
        lastSlots: Math.floor(Math.random() * 3) + 1, // 1-3 final slots
        recentBookings: this.generateRecentBookingActivity()
      },

      timeDependent: {
        countdown: this.generateUrgentCountdown(),
        finalCountdown: this.generateFinalCountdown(),
        timeOfDayBonus: this.getTimeOfDayBonus(timeOfDay)
      },

      socialProof: {
        recentHire: this.selectRandomSuccessStory(),
        successStories: this.getRecentSuccessStories(3),
        industryStats: await this.getIndustrySpecificStats(candidate)
      },

      availableSlots: await this.getFormattedAvailableSlots(),
      industrySpecific: await this.getIndustryFOMO(candidate),
      salaryIncrease: this.calculateSalaryIncrease(candidate),
      nextAvailability: this.getNextStandardAvailability()
    };
  }

  /**
   * Track and analyze conversation behavior patterns
   */
  async analyzeBehaviorPatterns(candidate, message, conversationState) {
    const patterns = {
      abandonmentRisk: 0,
      hesitationSignals: 0,
      immediacyIndicators: 0,
      engagementLevel: 0
    };

    // Analyze message sentiment and urgency
    const messageAnalysis = this.analyzeMessage(message);

    // Check conversation timing
    if (conversationState.timeSinceLastMessage > 1800000) { // 30 minutes
      patterns.abandonmentRisk += 0.3;
    }

    // Look for hesitation keywords
    const hesitationWords = ['think', 'maybe', 'later', 'consider', 'not sure'];
    if (hesitationWords.some(word => message.toLowerCase().includes(word))) {
      patterns.hesitationSignals += 0.4;
    }

    // Look for immediacy indicators
    const urgencyWords = ['now', 'today', 'asap', 'immediately', 'quick'];
    if (urgencyWords.some(word => message.toLowerCase().includes(word))) {
      patterns.immediacyIndicators += 0.5;
    }

    // Calculate engagement based on response time and message length
    patterns.engagementLevel = Math.min(1.0, message.length / 50);

    return patterns;
  }

  /**
   * Helper methods for dynamic content generation
   */

  generateDynamicSlotCount() {
    const now = new Date();
    const hour = now.getHours();

    // Create natural scarcity based on time of day
    if (hour >= 9 && hour <= 17) { // Business hours
      return Math.floor(Math.random() * 5) + 2; // 2-6 slots
    } else {
      return Math.floor(Math.random() * 3) + 1; // 1-3 slots
    }
  }

  generateUrgentCountdown() {
    const minutes = Math.floor(Math.random() * 45) + 15; // 15-60 minutes
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes} minutes`;
  }

  generateFinalCountdown() {
    const hours = Math.floor(Math.random() * 8) + 2; // 2-10 hours
    return `${hours} hours`;
  }

  generateRecentHires() {
    const sampleHires = [
      { name: "Sarah L.", experience: "2 years marketing", timeToHire: "48 hours" },
      { name: "Mike C.", experience: "5 years tech", timeToHire: "24 hours" },
      { name: "Jessica R.", experience: "3 years finance", timeToHire: "72 hours" },
      { name: "David K.", experience: "4 years operations", timeToHire: "36 hours" }
    ];
    return sampleHires.slice(0, 3); // Return first 3
  }

  generateCountdown() {
    const minutes = Math.floor(Math.random() * 120) + 30; // 30-150 minutes
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  getTimeOfDayBonus(hour) {
    if (hour >= 9 && hour <= 11) return "Morning Fast-Track Bonus";
    if (hour >= 14 && hour <= 16) return "Afternoon Priority Bonus";
    if (hour >= 19 && hour <= 21) return "Evening Express Bonus";
    return "Off-Hours Premium Access";
  }

  selectRandomSuccessStory() {
    const stories = [
      { name: "Sarah L.", experience: "2 years marketing", timeToHire: "48 hours" },
      { name: "Mike C.", experience: "5 years tech", timeToHire: "24 hours" },
      { name: "Jessica R.", experience: "3 years finance", timeToHire: "72 hours" },
      { name: "David K.", experience: "4 years operations", timeToHire: "36 hours" }
    ];
    return stories[Math.floor(Math.random() * stories.length)];
  }

  async getIndustrySpecificStats(candidate) {
    // This would normally fetch from database based on candidate profile
    return {
      industry: "Technology", // Placeholder - should be derived from candidate
      salaryIncrease: "$8,500",
      placementRate: "94%",
      avgPlacement: "2.3 days",
      bonusEarnings: "3,200",
      fasterPlacement: "40%"
    };
  }

  formatAvailableSlots(slots) {
    return slots.map((slot, index) => {
      const urgencyTag = index === 0 ? "🔥 MOST POPULAR" :
                        index === 1 ? "⚡ HIGH DEMAND" : "📅 AVAILABLE";
      return `${index + 1}. ${slot.time} - ${urgencyTag}`;
    }).join('\n');
  }

  formatSuccessStories(stories) {
    return stories.map(story =>
      `✅ ${story.name}: "${story.quote}" - Hired in ${story.timeframe}`
    ).join('\n');
  }

  getLiveBookingAlert() {
    const timings = ["2 minutes ago", "5 minutes ago", "8 minutes ago"];
    const timing = timings[Math.floor(Math.random() * timings.length)];
    return `🔴 LIVE: Interview slot booked ${timing}`;
  }

  async getCandidateProfile(candidateId) {
    // Integration with existing database
    const { db } = require('../db');
    return db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
  }

  async trackConversionMetrics(candidateId, template, response) {
    // Track conversion performance for A/B testing
    const metrics = {
      candidateId,
      templateType: template.type,
      conversionTactic: response.conversionTactic,
      urgencyScore: response.metadata?.urgencyScore || 0,
      timestamp: new Date().toISOString()
    };

    // Store in analytics table (to be created)
    logger.info('Tracking conversion metrics:', { data: metrics });
  }

  generateFallbackResponse() {
    return {
      type: 'fallback',
      content: 'Thanks for your interest! Let me connect you with our team to discuss opportunities.',
      metadata: { fallback: true }
    };
  }

  /**
   * Integration method with existing SLM bridge
   */
  async enhanceExistingFlow(candidateId, message, existingResponse, context) {
    if (!existingResponse || existingResponse.type === 'error') {
      return await this.orchestrateConversation(candidateId, message, context);
    }

    // Enhance existing response with FOMO elements
    const candidate = await this.getCandidateProfile(candidateId);
    const fomoContext = await this.generateFOMOContext(candidate, context);

    return this.addFOMOEnhancements(existingResponse, fomoContext);
  }

  addFOMOEnhancements(response, fomoContext) {
    const fomoSuffix = `\n\n⚡ **LIMITED TIME**: ${fomoContext.scarcity.slotsRemaining} slots remaining today!`;

    return {
      ...response,
      content: response.content + fomoSuffix,
      metadata: {
        ...response.metadata,
        fomoEnhanced: true,
        originalType: response.type,
        enhancementType: 'scarcity_suffix'
      }
    };
  }

  async getFormattedAvailableSlots() {
    // This would normally fetch from scheduling system
    return [
      { time: "Today 2:00 PM", urgencyTag: "🔥 MOST POPULAR" },
      { time: "Today 4:00 PM", urgencyTag: "⚡ HIGH DEMAND" },
      { time: "Tomorrow 10:00 AM", urgencyTag: "📅 AVAILABLE" }
    ];
  }

  async getIndustryFOMO(candidate) {
    // Sample industry-specific FOMO data
    return {
      industry: "Technology",
      salaryIncrease: "$8,500",
      placementRate: "94%",
      avgPlacement: "2.3 days",
      bonusEarnings: "3,200",
      fasterPlacement: "40%"
    };
  }

  calculateSalaryIncrease(candidate) {
    // Calculate based on candidate profile
    const baseIncrease = 5000;
    const experienceMultiplier = candidate.experience ? parseInt(candidate.experience) * 500 : 1000;
    return `$${(baseIncrease + experienceMultiplier).toLocaleString()}`;
  }

  getNextStandardAvailability() {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 14);
    return nextWeek.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }

  generateRecentBookingActivity() {
    const activities = [
      "Interview booked 2 minutes ago",
      "Slot claimed 5 minutes ago",
      "Priority booking 8 minutes ago"
    ];
    return activities[Math.floor(Math.random() * activities.length)];
  }

  getRecentSuccessStories(count = 3) {
    const stories = [
      {
        name: "Sarah M.",
        quote: "Got my dream job in 48 hours!",
        timeframe: "2 days"
      },
      {
        name: "James L.",
        quote: "Amazing support throughout the process.",
        timeframe: "3 days"
      },
      {
        name: "Priya K.",
        quote: "They found the perfect match for my skills.",
        timeframe: "1 day"
      }
    ];
    return stories.slice(0, count);
  }
}

module.exports = EnhancedConversationFlows;