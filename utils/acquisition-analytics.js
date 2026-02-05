/**
 * Performance Analytics for Acquisition Campaigns
 * WorkLink v2 - Comprehensive campaign performance tracking and optimization
 *
 * Features:
 * - Campaign performance metrics and ROI analysis
 * - Conversion funnel tracking
 * - Channel effectiveness analysis
 * - Candidate lifecycle analytics
 * - Predictive modeling
 * - A/B testing insights
 * - Real-time dashboard data
 */

const { db } = require('../db');

/**
 * Key performance indicators for acquisition campaigns
 */
const KPI_DEFINITIONS = {
  REACH: 'Total candidates contacted',
  ENGAGEMENT_RATE: 'Percentage of candidates who engaged',
  RESPONSE_RATE: 'Percentage of candidates who responded',
  APPLICATION_RATE: 'Percentage who applied to jobs',
  CONVERSION_RATE: 'Percentage who accepted job offers',
  COST_PER_ACQUISITION: 'Cost per successful hire',
  LIFETIME_VALUE: 'Average lifetime value of acquired candidates',
  TIME_TO_CONVERSION: 'Average time from first contact to job acceptance',
  RETENTION_RATE: 'Percentage of candidates still active after 90 days',
  QUALITY_SCORE: 'Average performance rating of acquired candidates',
};

/**
 * Generate comprehensive campaign analytics
 */
function generateCampaignAnalytics(campaignId, options = {}) {
  const {
    includeComparisons = true,
    includePredictions = false,
    timeframe = '30_days',
  } = options;

  try {
    const campaign = getCampaignDetails(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Core metrics
    const coreMetrics = calculateCoreMetrics(campaignId);

    // Funnel analysis
    const funnelData = calculateConversionFunnel(campaignId);

    // Channel performance
    const channelPerformance = analyzeChannelPerformance(campaignId);

    // Time-based analysis
    const timeAnalysis = analyzeTimePatterns(campaignId);

    // Quality metrics
    const qualityMetrics = calculateQualityMetrics(campaignId);

    // Cost analysis
    const costAnalysis = calculateCostAnalysis(campaignId);

    let benchmarkComparison = null;
    let predictions = null;

    if (includeComparisons) {
      benchmarkComparison = getBenchmarkComparisons(campaign.type, coreMetrics);
    }

    if (includePredictions) {
      predictions = generatePerformancePredictions(campaignId, coreMetrics);
    }

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        createdAt: campaign.created_at,
        completedAt: campaign.completed_at,
      },
      coreMetrics,
      funnelData,
      channelPerformance,
      timeAnalysis,
      qualityMetrics,
      costAnalysis,
      benchmarkComparison,
      predictions,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating campaign analytics:', error);
    throw error;
  }
}

/**
 * Calculate core campaign metrics
 */
function calculateCoreMetrics(campaignId) {
  try {
    // Basic reach and engagement metrics
    const basicMetrics = db.prepare(`
      SELECT
        COUNT(DISTINCT om.candidate_id) as total_reach,
        COUNT(om.id) as total_messages_sent,
        COUNT(DISTINCT CASE WHEN om.status IN ('delivered', 'read') THEN om.candidate_id END) as delivered_reach,
        COUNT(DISTINCT CASE WHEN om.read_at IS NOT NULL THEN om.candidate_id END) as engaged_candidates,
        COUNT(DISTINCT CASE WHEN om.replied_at IS NOT NULL THEN om.candidate_id END) as responding_candidates
      FROM outreach_messages om
      WHERE om.campaign_id = ?
    `).get(campaignId);

    // Job application and conversion metrics
    const conversionMetrics = db.prepare(`
      SELECT
        COUNT(DISTINCT CASE WHEN ce.engagement_type = 'JOB_VIEW' THEN ce.candidate_id END) as job_viewers,
        COUNT(DISTINCT CASE WHEN ce.engagement_type = 'JOB_APPLY' THEN ce.candidate_id END) as job_applicants,
        COUNT(DISTINCT CASE WHEN ce.engagement_type = 'JOB_ACCEPT' THEN ce.candidate_id END) as job_acceptors,
        COUNT(DISTINCT CASE WHEN ce.engagement_type = 'JOB_COMPLETE' THEN ce.candidate_id END) as job_completers
      FROM outreach_messages om
      LEFT JOIN candidate_engagement ce ON om.candidate_id = ce.candidate_id
        AND ce.created_at >= om.created_at
        AND ce.campaign_id = om.campaign_id
      WHERE om.campaign_id = ?
    `).get(campaignId);

    // Calculate percentages
    const totalReach = basicMetrics.total_reach || 0;
    const engagementRate = totalReach > 0 ? (basicMetrics.engaged_candidates / totalReach * 100) : 0;
    const responseRate = totalReach > 0 ? (basicMetrics.responding_candidates / totalReach * 100) : 0;
    const applicationRate = totalReach > 0 ? (conversionMetrics.job_applicants / totalReach * 100) : 0;
    const conversionRate = totalReach > 0 ? (conversionMetrics.job_acceptors / totalReach * 100) : 0;
    const completionRate = conversionMetrics.job_acceptors > 0 ? (conversionMetrics.job_completers / conversionMetrics.job_acceptors * 100) : 0;

    return {
      reach: {
        total: totalReach,
        delivered: basicMetrics.delivered_reach || 0,
        messagesSent: basicMetrics.total_messages_sent || 0,
      },
      engagement: {
        engaged: basicMetrics.engaged_candidates || 0,
        responding: basicMetrics.responding_candidates || 0,
        engagementRate: Math.round(engagementRate * 100) / 100,
        responseRate: Math.round(responseRate * 100) / 100,
      },
      conversion: {
        viewers: conversionMetrics.job_viewers || 0,
        applicants: conversionMetrics.job_applicants || 0,
        acceptors: conversionMetrics.job_acceptors || 0,
        completers: conversionMetrics.job_completers || 0,
        applicationRate: Math.round(applicationRate * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
      },
    };
  } catch (error) {
    console.error('Error calculating core metrics:', error);
    return null;
  }
}

/**
 * Calculate conversion funnel data
 */
function calculateConversionFunnel(campaignId) {
  try {
    const funnelSteps = db.prepare(`
      SELECT
        'Contacted' as step,
        COUNT(DISTINCT om.candidate_id) as count,
        1 as step_order
      FROM outreach_messages om
      WHERE om.campaign_id = ?

      UNION ALL

      SELECT
        'Delivered' as step,
        COUNT(DISTINCT om.candidate_id) as count,
        2 as step_order
      FROM outreach_messages om
      WHERE om.campaign_id = ? AND om.status IN ('delivered', 'read')

      UNION ALL

      SELECT
        'Engaged' as step,
        COUNT(DISTINCT om.candidate_id) as count,
        3 as step_order
      FROM outreach_messages om
      WHERE om.campaign_id = ? AND om.read_at IS NOT NULL

      UNION ALL

      SELECT
        'Responded' as step,
        COUNT(DISTINCT om.candidate_id) as count,
        4 as step_order
      FROM outreach_messages om
      WHERE om.campaign_id = ? AND om.replied_at IS NOT NULL

      UNION ALL

      SELECT
        'Applied' as step,
        COUNT(DISTINCT ce.candidate_id) as count,
        5 as step_order
      FROM outreach_messages om
      JOIN candidate_engagement ce ON om.candidate_id = ce.candidate_id
        AND ce.created_at >= om.created_at
        AND ce.engagement_type = 'JOB_APPLY'
      WHERE om.campaign_id = ?

      UNION ALL

      SELECT
        'Accepted' as step,
        COUNT(DISTINCT ce.candidate_id) as count,
        6 as step_order
      FROM outreach_messages om
      JOIN candidate_engagement ce ON om.candidate_id = ce.candidate_id
        AND ce.created_at >= om.created_at
        AND ce.engagement_type = 'JOB_ACCEPT'
      WHERE om.campaign_id = ?

      ORDER BY step_order
    `).all(campaignId, campaignId, campaignId, campaignId, campaignId, campaignId);

    // Calculate conversion rates between steps
    const funnelWithRates = funnelSteps.map((step, index) => {
      let conversionRate = 100; // First step is always 100%

      if (index > 0 && funnelSteps[0].count > 0) {
        conversionRate = (step.count / funnelSteps[0].count) * 100;
      }

      let stepConversionRate = 100;
      if (index > 0 && funnelSteps[index - 1].count > 0) {
        stepConversionRate = (step.count / funnelSteps[index - 1].count) * 100;
      }

      return {
        ...step,
        conversionRate: Math.round(conversionRate * 100) / 100,
        stepConversionRate: Math.round(stepConversionRate * 100) / 100,
      };
    });

    return {
      steps: funnelWithRates,
      totalDropoff: funnelSteps.length > 0 ? funnelSteps[0].count - funnelSteps[funnelSteps.length - 1].count : 0,
      overallConversionRate: funnelSteps.length > 0 && funnelSteps[0].count > 0 ?
        Math.round((funnelSteps[funnelSteps.length - 1].count / funnelSteps[0].count) * 10000) / 100 : 0,
    };
  } catch (error) {
    console.error('Error calculating conversion funnel:', error);
    return null;
  }
}

/**
 * Analyze channel performance
 */
function analyzeChannelPerformance(campaignId) {
  try {
    const channelStats = db.prepare(`
      SELECT
        om.channel,
        COUNT(DISTINCT om.candidate_id) as reach,
        COUNT(om.id) as messages_sent,
        COUNT(CASE WHEN om.status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN om.read_at IS NOT NULL THEN 1 END) as read,
        COUNT(CASE WHEN om.replied_at IS NOT NULL THEN 1 END) as replied,
        AVG(
          CASE
            WHEN om.replied_at IS NOT NULL AND om.created_at IS NOT NULL
            THEN (julianday(om.replied_at) - julianday(om.created_at)) * 24 * 60 * 60
            ELSE NULL
          END
        ) as avg_response_time_seconds
      FROM outreach_messages om
      WHERE om.campaign_id = ?
      GROUP BY om.channel
      ORDER BY reach DESC
    `).all(campaignId);

    // Calculate rates and format data
    const channelPerformance = channelStats.map(channel => {
      const deliveryRate = channel.messages_sent > 0 ? (channel.delivered / channel.messages_sent * 100) : 0;
      const readRate = channel.delivered > 0 ? (channel.read / channel.delivered * 100) : 0;
      const responseRate = channel.reach > 0 ? (channel.replied / channel.reach * 100) : 0;

      return {
        channel: channel.channel,
        metrics: {
          reach: channel.reach,
          messagesSent: channel.messages_sent,
          delivered: channel.delivered,
          read: channel.read,
          replied: channel.replied,
        },
        rates: {
          deliveryRate: Math.round(deliveryRate * 100) / 100,
          readRate: Math.round(readRate * 100) / 100,
          responseRate: Math.round(responseRate * 100) / 100,
        },
        avgResponseTime: channel.avg_response_time_seconds ?
          Math.round(channel.avg_response_time_seconds / 60) : null, // Convert to minutes
      };
    });

    return {
      channels: channelPerformance,
      bestPerformingChannel: channelPerformance.length > 0 ?
        channelPerformance.reduce((best, current) =>
          current.rates.responseRate > best.rates.responseRate ? current : best
        ).channel : null,
    };
  } catch (error) {
    console.error('Error analyzing channel performance:', error);
    return null;
  }
}

/**
 * Analyze time patterns in campaign performance
 */
function analyzeTimePatterns(campaignId) {
  try {
    // Daily performance
    const dailyPerformance = db.prepare(`
      SELECT
        date(om.created_at) as date,
        COUNT(DISTINCT om.candidate_id) as contacts,
        COUNT(CASE WHEN om.replied_at IS NOT NULL THEN 1 END) as responses,
        AVG(
          CASE
            WHEN om.replied_at IS NOT NULL
            THEN (julianday(om.replied_at) - julianday(om.created_at)) * 24
            ELSE NULL
          END
        ) as avg_response_time_hours
      FROM outreach_messages om
      WHERE om.campaign_id = ?
      GROUP BY date(om.created_at)
      ORDER BY date ASC
    `).all(campaignId);

    // Hourly performance
    const hourlyPerformance = db.prepare(`
      SELECT
        CAST(strftime('%H', om.created_at) AS INTEGER) as hour,
        COUNT(DISTINCT om.candidate_id) as contacts,
        COUNT(CASE WHEN om.replied_at IS NOT NULL THEN 1 END) as responses
      FROM outreach_messages om
      WHERE om.campaign_id = ?
      GROUP BY hour
      ORDER BY hour ASC
    `).all(campaignId);

    // Calculate best performing time slots
    const bestDay = dailyPerformance.length > 0 ?
      dailyPerformance.reduce((best, current) => {
        const currentRate = current.contacts > 0 ? current.responses / current.contacts : 0;
        const bestRate = best.contacts > 0 ? best.responses / best.contacts : 0;
        return currentRate > bestRate ? current : best;
      }) : null;

    const bestHour = hourlyPerformance.length > 0 ?
      hourlyPerformance.reduce((best, current) => {
        const currentRate = current.contacts > 0 ? current.responses / current.contacts : 0;
        const bestRate = best.contacts > 0 ? best.responses / best.contacts : 0;
        return currentRate > bestRate ? current : best;
      }) : null;

    return {
      daily: dailyPerformance.map(day => ({
        ...day,
        responseRate: day.contacts > 0 ? Math.round((day.responses / day.contacts) * 10000) / 100 : 0,
      })),
      hourly: hourlyPerformance.map(hour => ({
        ...hour,
        responseRate: hour.contacts > 0 ? Math.round((hour.responses / hour.contacts) * 10000) / 100 : 0,
      })),
      insights: {
        bestPerformingDay: bestDay?.date || null,
        bestPerformingHour: bestHour ? `${bestHour.hour}:00` : null,
        avgResponseTime: dailyPerformance.length > 0 ?
          Math.round(dailyPerformance.reduce((sum, day) => sum + (day.avg_response_time_hours || 0), 0) / dailyPerformance.length) : 0,
      },
    };
  } catch (error) {
    console.error('Error analyzing time patterns:', error);
    return null;
  }
}

/**
 * Calculate quality metrics for acquired candidates
 */
function calculateQualityMetrics(campaignId) {
  try {
    const qualityData = db.prepare(`
      SELECT
        AVG(c.rating) as avg_rating,
        AVG(c.total_jobs_completed) as avg_jobs_completed,
        AVG(c.engagement_score) as avg_engagement_score,
        COUNT(CASE WHEN c.status = 'active' THEN 1 END) as still_active,
        COUNT(DISTINCT om.candidate_id) as total_acquired
      FROM outreach_messages om
      JOIN candidates c ON om.candidate_id = c.id
      JOIN candidate_engagement ce ON om.candidate_id = ce.candidate_id
        AND ce.engagement_type IN ('JOB_APPLY', 'JOB_ACCEPT')
        AND ce.created_at >= om.created_at
      WHERE om.campaign_id = ?
    `).get(campaignId);

    // Calculate retention rate (candidates still active after 90 days)
    const retentionData = db.prepare(`
      SELECT
        COUNT(CASE
          WHEN c.status = 'active' AND c.last_seen >= datetime('now', '-90 days')
          THEN 1 END
        ) as retained_candidates,
        COUNT(DISTINCT om.candidate_id) as total_candidates
      FROM outreach_messages om
      JOIN candidates c ON om.candidate_id = c.id
      WHERE om.campaign_id = ?
        AND om.created_at <= datetime('now', '-90 days')
    `).get(campaignId);

    const retentionRate = retentionData.total_candidates > 0 ?
      (retentionData.retained_candidates / retentionData.total_candidates * 100) : 0;

    return {
      averageRating: qualityData.avg_rating ? Math.round(qualityData.avg_rating * 100) / 100 : null,
      averageJobsCompleted: qualityData.avg_jobs_completed ? Math.round(qualityData.avg_jobs_completed) : 0,
      averageEngagementScore: qualityData.avg_engagement_score ? Math.round(qualityData.avg_engagement_score) : 0,
      retentionRate: Math.round(retentionRate * 100) / 100,
      stillActive: qualityData.still_active || 0,
      totalAcquired: qualityData.total_acquired || 0,
    };
  } catch (error) {
    console.error('Error calculating quality metrics:', error);
    return null;
  }
}

/**
 * Calculate cost analysis and ROI
 */
function calculateCostAnalysis(campaignId) {
  try {
    // Estimate costs based on message volume and channels
    const costData = db.prepare(`
      SELECT
        channel,
        COUNT(*) as message_count
      FROM outreach_messages
      WHERE campaign_id = ?
      GROUP BY channel
    `).all(campaignId);

    // Estimated cost per message by channel (in USD)
    const channelCosts = {
      whatsapp: 0.005,  // $0.005 per message
      sms: 0.01,        // $0.01 per SMS
      email: 0.001,     // $0.001 per email
      push_notification: 0.0001, // $0.0001 per push
      in_app_message: 0.0001,    // $0.0001 per in-app
    };

    let totalCost = 0;
    const costBreakdown = costData.map(channel => {
      const unitCost = channelCosts[channel.channel] || 0.005;
      const channelCost = channel.message_count * unitCost;
      totalCost += channelCost;

      return {
        channel: channel.channel,
        messages: channel.message_count,
        unitCost,
        totalCost: Math.round(channelCost * 100) / 100,
      };
    });

    // Calculate revenue from successful placements
    const revenueData = db.prepare(`
      SELECT
        COUNT(DISTINCT d.candidate_id) as successful_placements,
        SUM(d.gross_revenue) as total_revenue,
        AVG(d.gross_revenue) as avg_revenue_per_placement
      FROM outreach_messages om
      JOIN candidate_engagement ce ON om.candidate_id = ce.candidate_id
        AND ce.engagement_type = 'JOB_ACCEPT'
        AND ce.created_at >= om.created_at
      JOIN deployments d ON ce.candidate_id = d.candidate_id
        AND d.status = 'completed'
        AND d.created_at >= om.created_at
      WHERE om.campaign_id = ?
    `).get(campaignId);

    const totalRevenue = revenueData.total_revenue || 0;
    const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost * 100) : 0;
    const costPerAcquisition = revenueData.successful_placements > 0 ?
      (totalCost / revenueData.successful_placements) : totalCost;

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      costBreakdown,
      revenue: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        successfulPlacements: revenueData.successful_placements || 0,
        avgRevenuePerPlacement: revenueData.avg_revenue_per_placement ?
          Math.round(revenueData.avg_revenue_per_placement * 100) / 100 : 0,
      },
      roi: Math.round(roi * 100) / 100,
      costPerAcquisition: Math.round(costPerAcquisition * 100) / 100,
    };
  } catch (error) {
    console.error('Error calculating cost analysis:', error);
    return null;
  }
}

/**
 * Get benchmark comparisons
 */
function getBenchmarkComparisons(campaignType, currentMetrics) {
  try {
    // Get historical averages for this campaign type
    const benchmarks = db.prepare(`
      SELECT
        AVG(
          CASE WHEN om.replied_at IS NOT NULL THEN 1.0 ELSE 0.0 END
        ) * 100 as avg_response_rate,
        AVG(
          CASE
            WHEN ce.engagement_type = 'JOB_ACCEPT' THEN 1.0
            ELSE 0.0
          END
        ) * 100 as avg_conversion_rate
      FROM outreach_campaigns oc
      JOIN outreach_messages om ON oc.id = om.campaign_id
      LEFT JOIN candidate_engagement ce ON om.candidate_id = ce.candidate_id
        AND ce.created_at >= om.created_at
        AND ce.engagement_type = 'JOB_ACCEPT'
      WHERE oc.type = ?
        AND oc.status = 'completed'
        AND oc.created_at >= datetime('now', '-6 months')
    `).get(campaignType);

    if (!benchmarks) {
      return null;
    }

    const responseRateComparison = currentMetrics.engagement.responseRate - (benchmarks.avg_response_rate || 0);
    const conversionRateComparison = currentMetrics.conversion.conversionRate - (benchmarks.avg_conversion_rate || 0);

    return {
      benchmarks: {
        responseRate: benchmarks.avg_response_rate ? Math.round(benchmarks.avg_response_rate * 100) / 100 : null,
        conversionRate: benchmarks.avg_conversion_rate ? Math.round(benchmarks.avg_conversion_rate * 100) / 100 : null,
      },
      comparisons: {
        responseRate: {
          difference: Math.round(responseRateComparison * 100) / 100,
          performance: responseRateComparison > 0 ? 'above_average' :
                      responseRateComparison < 0 ? 'below_average' : 'average',
        },
        conversionRate: {
          difference: Math.round(conversionRateComparison * 100) / 100,
          performance: conversionRateComparison > 0 ? 'above_average' :
                      conversionRateComparison < 0 ? 'below_average' : 'average',
        },
      },
    };
  } catch (error) {
    console.error('Error getting benchmark comparisons:', error);
    return null;
  }
}

/**
 * Generate performance predictions
 */
function generatePerformancePredictions(campaignId, currentMetrics) {
  try {
    // Simple trend-based predictions
    const campaign = getCampaignDetails(campaignId);

    if (campaign.status !== 'active') {
      return null; // Only predict for active campaigns
    }

    // Get recent performance trends
    const trendData = db.prepare(`
      SELECT
        date(created_at) as date,
        COUNT(DISTINCT candidate_id) as contacts,
        COUNT(CASE WHEN replied_at IS NOT NULL THEN 1 END) as responses
      FROM outreach_messages
      WHERE campaign_id = ?
        AND created_at >= datetime('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all(campaignId);

    if (trendData.length < 3) {
      return null; // Not enough data for prediction
    }

    // Simple linear trend calculation
    const dailyResponses = trendData.map(day => day.responses);
    const avgDailyGrowth = (dailyResponses[dailyResponses.length - 1] - dailyResponses[0]) / (dailyResponses.length - 1);

    // Predict next 7 days
    const predictions = {
      expectedResponses: Math.max(0, Math.round(currentMetrics.engagement.responding + (avgDailyGrowth * 7))),
      expectedConversions: Math.max(0, Math.round(currentMetrics.conversion.acceptors + (avgDailyGrowth * 0.1 * 7))),
      confidence: trendData.length >= 7 ? 'high' : 'medium',
      basedOnDays: trendData.length,
    };

    return predictions;
  } catch (error) {
    console.error('Error generating predictions:', error);
    return null;
  }
}

/**
 * Get campaign details
 */
function getCampaignDetails(campaignId) {
  try {
    return db.prepare('SELECT * FROM outreach_campaigns WHERE id = ?').get(campaignId);
  } catch (error) {
    console.error('Error getting campaign details:', error);
    return null;
  }
}

/**
 * Generate acquisition dashboard data
 */
function generateAcquisitionDashboard(options = {}) {
  const {
    timeframe = '30_days',
    includeComparisons = true,
  } = options;

  try {
    const days = timeframe.includes('days') ? parseInt(timeframe) : 30;

    // Overall acquisition metrics
    const overallMetrics = db.prepare(`
      SELECT
        COUNT(DISTINCT oc.id) as total_campaigns,
        COUNT(DISTINCT CASE WHEN oc.status = 'active' THEN oc.id END) as active_campaigns,
        COUNT(DISTINCT om.candidate_id) as total_candidates_contacted,
        COUNT(DISTINCT CASE WHEN om.replied_at IS NOT NULL THEN om.candidate_id END) as responding_candidates,
        COUNT(DISTINCT CASE WHEN ce.engagement_type = 'JOB_ACCEPT' THEN ce.candidate_id END) as converted_candidates,
        SUM(oc.messages_sent) as total_messages_sent
      FROM outreach_campaigns oc
      LEFT JOIN outreach_messages om ON oc.id = om.campaign_id
      LEFT JOIN candidate_engagement ce ON om.candidate_id = ce.candidate_id
        AND ce.created_at >= om.created_at
        AND ce.engagement_type = 'JOB_ACCEPT'
      WHERE oc.created_at >= datetime('now', '-' || ? || ' days')
    `).get(days);

    // Campaign performance by type
    const campaignTypePerformance = db.prepare(`
      SELECT
        oc.type,
        COUNT(DISTINCT oc.id) as campaign_count,
        COUNT(DISTINCT om.candidate_id) as candidates_contacted,
        COUNT(DISTINCT CASE WHEN om.replied_at IS NOT NULL THEN om.candidate_id END) as responses,
        COUNT(DISTINCT CASE WHEN ce.engagement_type = 'JOB_ACCEPT' THEN ce.candidate_id END) as conversions
      FROM outreach_campaigns oc
      LEFT JOIN outreach_messages om ON oc.id = om.campaign_id
      LEFT JOIN candidate_engagement ce ON om.candidate_id = ce.candidate_id
        AND ce.created_at >= om.created_at
        AND ce.engagement_type = 'JOB_ACCEPT'
      WHERE oc.created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY oc.type
      ORDER BY conversions DESC
    `).all(days);

    // Daily acquisition trends
    const dailyTrends = db.prepare(`
      SELECT
        date(oc.created_at) as date,
        COUNT(DISTINCT oc.id) as campaigns_started,
        COUNT(DISTINCT om.candidate_id) as candidates_contacted,
        COUNT(DISTINCT CASE WHEN om.replied_at IS NOT NULL THEN om.candidate_id END) as responses
      FROM outreach_campaigns oc
      LEFT JOIN outreach_messages om ON oc.id = om.campaign_id
      WHERE oc.created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY date(oc.created_at)
      ORDER BY date ASC
    `).all(days);

    // Top performing campaigns
    const topCampaigns = db.prepare(`
      SELECT
        oc.id,
        oc.name,
        oc.type,
        oc.candidates_targeted,
        oc.messages_sent,
        COUNT(DISTINCT CASE WHEN om.replied_at IS NOT NULL THEN om.candidate_id END) as responses,
        COUNT(DISTINCT CASE WHEN ce.engagement_type = 'JOB_ACCEPT' THEN ce.candidate_id END) as conversions,
        ROUND(
          COUNT(DISTINCT CASE WHEN om.replied_at IS NOT NULL THEN om.candidate_id END) * 100.0 /
          NULLIF(oc.candidates_targeted, 0), 2
        ) as response_rate
      FROM outreach_campaigns oc
      LEFT JOIN outreach_messages om ON oc.id = om.campaign_id
      LEFT JOIN candidate_engagement ce ON om.candidate_id = ce.candidate_id
        AND ce.created_at >= om.created_at
        AND ce.engagement_type = 'JOB_ACCEPT'
      WHERE oc.created_at >= datetime('now', '-' || ? || ' days')
        AND oc.candidates_targeted > 0
      GROUP BY oc.id
      ORDER BY response_rate DESC
      LIMIT 10
    `).all(days);

    return {
      timeframe: `${days} days`,
      overview: {
        totalCampaigns: overallMetrics.total_campaigns || 0,
        activeCampaigns: overallMetrics.active_campaigns || 0,
        candidatesContacted: overallMetrics.total_candidates_contacted || 0,
        responseRate: overallMetrics.total_candidates_contacted > 0 ?
          Math.round((overallMetrics.responding_candidates / overallMetrics.total_candidates_contacted) * 10000) / 100 : 0,
        conversionRate: overallMetrics.total_candidates_contacted > 0 ?
          Math.round((overallMetrics.converted_candidates / overallMetrics.total_candidates_contacted) * 10000) / 100 : 0,
        totalMessagesSent: overallMetrics.total_messages_sent || 0,
      },
      campaignTypes: campaignTypePerformance.map(type => ({
        ...type,
        responseRate: type.candidates_contacted > 0 ?
          Math.round((type.responses / type.candidates_contacted) * 10000) / 100 : 0,
        conversionRate: type.candidates_contacted > 0 ?
          Math.round((type.conversions / type.candidates_contacted) * 10000) / 100 : 0,
      })),
      dailyTrends,
      topCampaigns,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating acquisition dashboard:', error);
    throw error;
  }
}

module.exports = {
  generateCampaignAnalytics,
  generateAcquisitionDashboard,
  calculateCoreMetrics,
  calculateConversionFunnel,
  analyzeChannelPerformance,
  analyzeTimePatterns,
  calculateQualityMetrics,
  calculateCostAnalysis,
  KPI_DEFINITIONS,
};