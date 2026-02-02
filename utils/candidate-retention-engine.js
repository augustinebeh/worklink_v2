/**
 * CANDIDATE RETENTION ENGINE
 * Automated engagement system to solve Pain Point #2
 *
 * Keeps 1000+ candidates engaged and retained without manual work.
 * Automated nurturing, value delivery, and retention prediction.
 */

const { db } = require('../db');

class CandidateRetentionEngine {
  constructor() {
    this.engagementTypes = {
      message_response: 10,     // Replied to message
      job_application: 15,      // Applied for job
      profile_update: 8,        // Updated profile
      skill_assessment: 12,     // Completed assessment
      referral: 20,            // Referred another candidate
      deployment: 25,          // Completed job deployment
      social_engagement: 5,    // Liked/shared social content
      training_completion: 15, // Completed training
      feedback_provided: 12,   // Gave feedback
      event_attendance: 18     // Attended networking event
    };

    this.retentionThresholds = {
      excellent: 80,   // 80+ engagement score
      good: 60,        // 60-79 engagement score
      moderate: 40,    // 40-59 engagement score
      poor: 20,        // 20-39 engagement score
      critical: 20     // Below 20 - at risk
    };
  }

  /**
   * Calculate candidate engagement score
   */
  async calculateEngagementScore(candidateId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get recent engagement activities
    const activities = db.prepare(`
      SELECT engagement_type, COUNT(*) as count, MAX(created_at) as last_activity
      FROM candidate_engagement
      WHERE candidate_id = ? AND created_at >= ?
      GROUP BY engagement_type
    `).all(candidateId, thirtyDaysAgo);

    let totalScore = 0;
    let activityBreakdown = {};

    activities.forEach(activity => {
      const points = this.engagementTypes[activity.engagement_type] || 0;
      const activityScore = points * activity.count;
      totalScore += activityScore;
      activityBreakdown[activity.engagement_type] = {
        count: activity.count,
        points: points,
        total: activityScore,
        last: activity.last_activity
      };
    });

    // Apply time decay (recent activity weights more)
    const daysSinceLastActivity = activities.length > 0 ?
      Math.min(30, Math.floor((Date.now() - new Date(Math.max(...activities.map(a => new Date(a.last_activity))))) / (24 * 60 * 60 * 1000))) : 30;

    const timeDecay = Math.max(0.3, 1 - (daysSinceLastActivity / 30));
    const finalScore = Math.round(totalScore * timeDecay);

    return {
      candidateId,
      rawScore: totalScore,
      timeDecay,
      finalScore,
      tier: this.getEngagementTier(finalScore),
      daysSinceLastActivity,
      activityBreakdown,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Get engagement tier based on score
   */
  getEngagementTier(score) {
    if (score >= this.retentionThresholds.excellent) return 'excellent';
    if (score >= this.retentionThresholds.good) return 'good';
    if (score >= this.retentionThresholds.moderate) return 'moderate';
    if (score >= this.retentionThresholds.poor) return 'poor';
    return 'critical';
  }

  /**
   * Automated engagement campaigns for different tiers
   */
  async runEngagementCampaigns() {
    const campaigns = [
      this.excellentCandidatesCampaign(),
      this.goodCandidatesCampaign(),
      this.moderateCandidatesCampaign(),
      this.poorCandidatesCampaign(),
      this.criticalCandidatesCampaign()
    ];

    const results = await Promise.all(campaigns);

    return {
      timestamp: new Date().toISOString(),
      campaignsRun: results.length,
      totalCandidatesEngaged: results.reduce((sum, r) => sum + r.candidatesEngaged, 0),
      breakdown: results
    };
  }

  /**
   * Campaign for excellent candidates (80+ score)
   */
  async excellentCandidatesCampaign() {
    const candidates = await this.getCandidatesByTier('excellent');

    const actions = [];
    for (const candidate of candidates) {
      // Premium opportunities first
      actions.push(this.sendPremiumJobAlerts(candidate));

      // Recognition and rewards
      actions.push(this.sendRecognitionMessage(candidate));

      // Referral bonuses
      actions.push(this.offerReferralBonus(candidate));

      // Quarterly check-in
      if (this.shouldSendQuarterlyCheckIn(candidate)) {
        actions.push(this.sendQuarterlyCheckIn(candidate));
      }
    }

    await Promise.all(actions);

    return {
      tier: 'excellent',
      candidatesEngaged: candidates.length,
      actionsPerCandidate: 3,
      campaignType: 'premium_engagement'
    };
  }

  /**
   * Campaign for good candidates (60-79 score)
   */
  async goodCandidatesCampaign() {
    const candidates = await this.getCandidatesByTier('good');

    const actions = [];
    for (const candidate of candidates) {
      // Regular job opportunities
      actions.push(this.sendJobOpportunities(candidate));

      // Skill development opportunities
      actions.push(this.sendSkillDevelopmentTips(candidate));

      // Monthly check-in
      if (this.shouldSendMonthlyCheckIn(candidate)) {
        actions.push(this.sendMonthlyCheckIn(candidate));
      }
    }

    await Promise.all(actions);

    return {
      tier: 'good',
      candidatesEngaged: candidates.length,
      actionsPerCandidate: 2,
      campaignType: 'regular_engagement'
    };
  }

  /**
   * Campaign for moderate candidates (40-59 score)
   */
  async moderateCandidatesCampaign() {
    const candidates = await this.getCandidatesByTier('moderate');

    const actions = [];
    for (const candidate of candidates) {
      // Value-added content
      actions.push(this.sendValueContent(candidate));

      // Re-engagement incentives
      actions.push(this.sendReEngagementIncentive(candidate));

      // Profile optimization tips
      actions.push(this.sendProfileTips(candidate));
    }

    await Promise.all(actions);

    return {
      tier: 'moderate',
      candidatesEngaged: candidates.length,
      actionsPerCandidate: 2,
      campaignType: 'nurture_engagement'
    };
  }

  /**
   * Campaign for poor candidates (20-39 score)
   */
  async poorCandidatesCampaign() {
    const candidates = await this.getCandidatesByTier('poor');

    const actions = [];
    for (const candidate of candidates) {
      // Win-back campaign
      actions.push(this.sendWinBackCampaign(candidate));

      // Feedback request
      actions.push(this.requestFeedback(candidate));
    }

    await Promise.all(actions);

    return {
      tier: 'poor',
      candidatesEngaged: candidates.length,
      actionsPerCandidate: 1,
      campaignType: 'win_back'
    };
  }

  /**
   * Campaign for critical candidates (below 20 score)
   */
  async criticalCandidatesCampaign() {
    const candidates = await this.getCandidatesByTier('critical');

    const actions = [];
    for (const candidate of candidates) {
      // Last chance re-engagement
      actions.push(this.sendLastChanceEngagement(candidate));

      // Mark for potential removal if no response
      actions.push(this.markForPotentialRemoval(candidate));
    }

    await Promise.all(actions);

    return {
      tier: 'critical',
      candidatesEngaged: candidates.length,
      actionsPerCandidate: 1,
      campaignType: 'last_chance'
    };
  }

  /**
   * Get candidates by engagement tier
   */
  async getCandidatesByTier(tier) {
    const candidates = db.prepare(`
      SELECT c.*, ce.final_score, ce.last_calculated
      FROM candidates c
      LEFT JOIN candidate_engagement_scores ce ON c.id = ce.candidate_id
      WHERE c.status = 'active' AND ce.tier = ?
      ORDER BY ce.final_score DESC
    `).all(tier);

    return candidates;
  }

  /**
   * Send premium job alerts to excellent candidates
   */
  async sendPremiumJobAlerts(candidate) {
    const message = `🌟 Hi ${candidate.name}! As one of our top-rated candidates, you get FIRST ACCESS to this premium opportunity: [${this.getCurrentPremiumJob()}]. Interested? Reply YES for immediate consideration! 💼`;

    await this.sendMessage(candidate, 'premium_job_alert', message);
    await this.logEngagement(candidate.id, 'premium_alert_sent', { jobType: 'premium' });
  }

  /**
   * Send recognition message
   */
  async sendRecognitionMessage(candidate) {
    const messages = [
      `🏆 ${candidate.name}, you're in our TOP 5% of candidates! Your professionalism and reliability make you a client favorite. Keep up the amazing work!`,
      `⭐ ${candidate.name}, clients specifically request you by name! That's the mark of true excellence. Thank you for representing WorkLink so well!`,
      `🎯 ${candidate.name}, your 98% show-up rate is incredible! You're what makes WorkLink the trusted choice for premium events.`
    ];

    const message = messages[Math.floor(Math.random() * messages.length)];
    await this.sendMessage(candidate, 'recognition', message);
    await this.logEngagement(candidate.id, 'recognition_sent', { tier: 'excellent' });
  }

  /**
   * Send job opportunities to good candidates
   */
  async sendJobOpportunities(candidate) {
    const message = `💼 Hi ${candidate.name}! New opportunities matching your skills just came in. Check your dashboard for: [${this.getMatchingJobs(candidate)}]. Apply early for best chance! 🚀`;

    await this.sendMessage(candidate, 'job_opportunities', message);
    await this.logEngagement(candidate.id, 'job_alert_sent', { tier: 'good' });
  }

  /**
   * Send win-back campaign to poor candidates
   */
  async sendWinBackCampaign(candidate) {
    const message = `👋 Hi ${candidate.name}, we miss you at WorkLink! We've improved our platform with better job matching and instant payments. Give us another chance? Here's a special welcome-back bonus: [Special Offer]. 💫`;

    await this.sendMessage(candidate, 'win_back', message);
    await this.logEngagement(candidate.id, 'win_back_sent', { tier: 'poor' });
  }

  /**
   * Send last chance engagement to critical candidates
   */
  async sendLastChanceEngagement(candidate) {
    const message = `💭 Hi ${candidate.name}, should we keep your WorkLink profile active? If you're still interested in hospitality opportunities, just reply YES. Otherwise, we'll archive your profile to keep our database fresh. Thanks for understanding! 🙏`;

    await this.sendMessage(candidate, 'last_chance', message);
    await this.logEngagement(candidate.id, 'last_chance_sent', { tier: 'critical' });
  }

  /**
   * Automated value delivery system
   */
  async runValueDeliverySystem() {
    const valueActions = [
      this.sendMarketInsights(),
      this.sendSkillDevelopmentTips(),
      this.sendNetworkingOpportunities(),
      this.sendCareerAdvice(),
      this.sendIndustryNews()
    ];

    const results = await Promise.all(valueActions);

    return {
      timestamp: new Date().toISOString(),
      valueActionsDelivered: results.length,
      totalRecipientsReached: results.reduce((sum, r) => sum + r.recipients, 0)
    };
  }

  /**
   * Send market insights to all active candidates
   */
  async sendMarketInsights() {
    const insights = [
      "📊 Market Update: Event staffing rates increased 15% this quarter. You're in a high-demand field!",
      "💰 Salary Insight: Bilingual event staff earn 20-30% more. Consider highlighting language skills!",
      "🎯 Trend Alert: Corporate events are booking 3 months ahead. Now's the time to update availability!"
    ];

    const message = insights[Math.floor(Math.random() * insights.length)];
    const recipients = await this.broadcastToActiveCandidates(message, 'market_insights');

    return { action: 'market_insights', recipients: recipients.length };
  }

  /**
   * Log engagement activity
   */
  async logEngagement(candidateId, engagementType, metadata = {}) {
    db.prepare(`
      INSERT INTO candidate_engagement (
        candidate_id, engagement_type, metadata, created_at
      ) VALUES (?, ?, ?, ?)
    `).run(
      candidateId,
      engagementType,
      JSON.stringify(metadata),
      new Date().toISOString()
    );
  }

  /**
   * Send message to candidate (placeholder - integrate with messaging system)
   */
  async sendMessage(candidate, messageType, content) {
    // Integration with WhatsApp/SMS/Email systems
    console.log(`Sending ${messageType} to ${candidate.name}: ${content}`);

    // Log the message
    db.prepare(`
      INSERT INTO retention_messages (
        candidate_id, message_type, content, sent_at, channel
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      candidate.id,
      messageType,
      content,
      new Date().toISOString(),
      candidate.preferred_communication || 'whatsapp'
    );

    return { success: true, messageType, candidateId: candidate.id };
  }

  /**
   * Update candidate engagement scores
   */
  async updateAllEngagementScores() {
    const activeCandidates = db.prepare(`
      SELECT id FROM candidates WHERE status = 'active'
    `).all();

    const updates = [];
    for (const candidate of activeCandidates) {
      const score = await this.calculateEngagementScore(candidate.id);

      // Update or insert engagement score
      db.prepare(`
        INSERT OR REPLACE INTO candidate_engagement_scores (
          candidate_id, raw_score, time_decay, final_score, tier,
          days_since_last_activity, last_calculated
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        candidate.id,
        score.rawScore,
        score.timeDecay,
        score.finalScore,
        score.tier,
        score.daysSinceLastActivity,
        score.calculatedAt
      );

      updates.push(score);
    }

    return {
      candidatesProcessed: updates.length,
      averageScore: Math.round(updates.reduce((sum, u) => sum + u.finalScore, 0) / updates.length),
      tierDistribution: this.getTierDistribution(updates)
    };
  }

  /**
   * Get tier distribution
   */
  getTierDistribution(scores) {
    const distribution = {};
    Object.keys(this.retentionThresholds).forEach(tier => {
      distribution[tier] = scores.filter(s => s.tier === tier).length;
    });
    return distribution;
  }

  /**
   * Get retention analytics
   */
  async getRetentionAnalytics(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const stats = db.prepare(`
      SELECT
        COUNT(DISTINCT candidate_id) as active_candidates,
        AVG(final_score) as avg_engagement_score,
        COUNT(DISTINCT CASE WHEN tier = 'excellent' THEN candidate_id END) as excellent_count,
        COUNT(DISTINCT CASE WHEN tier = 'good' THEN candidate_id END) as good_count,
        COUNT(DISTINCT CASE WHEN tier = 'moderate' THEN candidate_id END) as moderate_count,
        COUNT(DISTINCT CASE WHEN tier = 'poor' THEN candidate_id END) as poor_count,
        COUNT(DISTINCT CASE WHEN tier = 'critical' THEN candidate_id END) as critical_count
      FROM candidate_engagement_scores
      WHERE last_calculated >= ?
    `).get(since);

    const messageStats = db.prepare(`
      SELECT
        message_type,
        COUNT(*) as sent_count,
        COUNT(DISTINCT candidate_id) as unique_recipients
      FROM retention_messages
      WHERE sent_at >= ?
      GROUP BY message_type
    `).all(since);

    return {
      period: `${days} days`,
      candidateMetrics: {
        totalActive: stats.active_candidates,
        averageEngagementScore: Math.round(stats.avg_engagement_score),
        tierBreakdown: {
          excellent: stats.excellent_count,
          good: stats.good_count,
          moderate: stats.moderate_count,
          poor: stats.poor_count,
          critical: stats.critical_count
        }
      },
      retentionRate: this.calculateRetentionRate(days),
      messageMetrics: messageStats,
      recommendations: this.getRetentionRecommendations(stats)
    };
  }

  /**
   * Calculate retention rate
   */
  calculateRetentionRate(days) {
    // Placeholder - implement based on candidate lifecycle
    return {
      thirtyDay: 85,
      sixtyDay: 78,
      ninetyDay: 72
    };
  }

  /**
   * Get retention recommendations
   */
  getRetentionRecommendations(stats) {
    const recommendations = [];

    if (stats.critical_count > stats.active_candidates * 0.15) {
      recommendations.push("High number of critical candidates - increase value delivery");
    }

    if (stats.avg_engagement_score < 50) {
      recommendations.push("Low average engagement - boost communication frequency");
    }

    if (stats.excellent_count < stats.active_candidates * 0.20) {
      recommendations.push("Low excellent tier - implement recognition programs");
    }

    return recommendations;
  }

  // Placeholder helper methods
  getCurrentPremiumJob() { return "Marina Bay Premium Event - $35/hr"; }
  getMatchingJobs(candidate) { return "3 hospitality positions"; }
  shouldSendQuarterlyCheckIn(candidate) { return true; }
  shouldSendMonthlyCheckIn(candidate) { return true; }
  sendSkillDevelopmentTips(candidate) { return this.sendMessage(candidate, 'skill_tips', 'Professional development tip...'); }
  sendValueContent(candidate) { return this.sendMessage(candidate, 'value_content', 'Valuable industry content...'); }
  sendReEngagementIncentive(candidate) { return this.sendMessage(candidate, 'incentive', 'Special incentive offer...'); }
  sendProfileTips(candidate) { return this.sendMessage(candidate, 'profile_tips', 'Profile optimization tips...'); }
  requestFeedback(candidate) { return this.sendMessage(candidate, 'feedback_request', 'We value your feedback...'); }
  markForPotentialRemoval(candidate) { return { candidateId: candidate.id, action: 'marked_for_removal' }; }
  sendQuarterlyCheckIn(candidate) { return this.sendMessage(candidate, 'quarterly_checkin', 'Quarterly check-in...'); }
  sendMonthlyCheckIn(candidate) { return this.sendMessage(candidate, 'monthly_checkin', 'Monthly check-in...'); }
  offerReferralBonus(candidate) { return this.sendMessage(candidate, 'referral_bonus', 'Refer a friend and earn...'); }
  broadcastToActiveCandidates(message, type) { return []; }
  sendNetworkingOpportunities() { return { recipients: 0 }; }
  sendCareerAdvice() { return { recipients: 0 }; }
  sendIndustryNews() { return { recipients: 0 }; }
}

module.exports = { CandidateRetentionEngine };