/**
 * EPU/SER/19 Master Orchestrator
 * Central coordination system for all EPU/SER/19 intelligence services
 *
 * This is the "holy grail" EPU/SER/19 monitoring system that integrates:
 * - Real-time tender monitoring and scraping
 * - Comprehensive competitor analysis
 * - Lifecycle tracking and alerts
 * - Market intelligence and reporting
 * - Automated notification system
 * - Strategic recommendations
 */

const EPUSer19Monitor = require('./epu-ser-19-monitor');
const EPUSer19Scraper = require('./epu-ser-19-scraper');
const EPUAlertSystem = require('./epu-alert-system');
const EPULifecycleTracker = require('./epu-lifecycle-tracker');
const EPUCompetitorAnalyzer = require('./epu-competitor-analyzer');
const cron = require('node-cron');

class EPUMasterOrchestrator {
  constructor(options = {}) {
    this.config = {
      realTimeMonitoring: options.realTimeMonitoring !== false,
      dailyScans: options.dailyScans !== false,
      competitorAnalysis: options.competitorAnalysis !== false,
      lifecycleTracking: options.lifecycleTracking !== false,
      alertSystem: options.alertSystem !== false,
      marketReports: options.marketReports !== false,
      scanIntervalMinutes: options.scanIntervalMinutes || 30,
      ...options
    };

    // Initialize all EPU/SER/19 services
    this.monitor = new EPUSer19Monitor();
    this.scraper = new EPUSer19Scraper();
    this.alertSystem = new EPUAlertSystem({
      scanInterval: this.config.scanIntervalMinutes,
      ...options.alertConfig
    });
    this.lifecycleTracker = new EPULifecycleTracker();
    this.competitorAnalyzer = new EPUCompetitorAnalyzer();

    this.isRunning = false;
    this.scheduledJobs = [];
    this.stats = {
      systemStartTime: null,
      totalScansCompleted: 0,
      tendersProcessed: 0,
      alertsSent: 0,
      competitorsAnalyzed: 0,
      lifecycleEventsTracked: 0,
      lastFullScanTime: null,
      systemUptime: 0,
      errorCount: 0,
      lastError: null
    };

    console.log('🎯 EPU/SER/19 Master Orchestrator initialized');
  }

  /**
   * Start the complete EPU/SER/19 intelligence system
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️  EPU Master Orchestrator is already running');
      return;
    }

    try {
      console.log('🚀 Starting EPU/SER/19 Master Intelligence System...');
      this.stats.systemStartTime = new Date();
      this.isRunning = true;

      // Initialize all databases
      console.log('📊 Initializing databases...');
      this.monitor.initDB();
      this.lifecycleTracker.initDB();
      this.competitorAnalyzer.initDB();

      // Start real-time monitoring if enabled
      if (this.config.realTimeMonitoring && this.config.alertSystem) {
        console.log('🔍 Starting real-time monitoring...');
        this.alertSystem.start();
      }

      // Schedule regular comprehensive scans
      if (this.config.dailyScans) {
        this.scheduleComprehensiveScans();
      }

      // Schedule competitor analysis
      if (this.config.competitorAnalysis) {
        this.scheduleCompetitorAnalysis();
      }

      // Schedule lifecycle tracking updates
      if (this.config.lifecycleTracking) {
        this.scheduleLifecycleUpdates();
      }

      // Schedule market reports
      if (this.config.marketReports) {
        this.scheduleMarketReports();
      }

      // Start system health monitoring
      this.startHealthMonitoring();

      // Perform initial comprehensive scan
      console.log('🔄 Performing initial comprehensive scan...');
      await this.performComprehensiveScan();

      console.log('✅ EPU/SER/19 Master Intelligence System started successfully');

      // Emit startup notification
      this.emitSystemEvent('system_started', {
        timestamp: new Date().toISOString(),
        configuration: this.config,
        message: 'EPU/SER/19 Master Intelligence System is now active'
      });

    } catch (error) {
      console.error('❌ Failed to start EPU Master Orchestrator:', error.message);
      this.stats.errorCount++;
      this.stats.lastError = error.message;
      throw error;
    }
  }

  /**
   * Stop the EPU/SER/19 intelligence system
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping EPU/SER/19 Master Intelligence System...');

    try {
      // Stop alert system
      if (this.alertSystem) {
        this.alertSystem.stop();
      }

      // Stop all scheduled jobs
      for (const job of this.scheduledJobs) {
        if (job && job.stop) {
          job.stop();
        }
      }
      this.scheduledJobs = [];

      // Close database connections
      this.monitor.closeDB();
      this.lifecycleTracker.closeDB();
      this.competitorAnalyzer.closeDB();

      // Cleanup scrapers
      if (this.scraper) {
        await this.scraper.cleanup();
      }

      this.isRunning = false;
      console.log('✅ EPU Master Orchestrator stopped successfully');

      // Emit shutdown notification
      this.emitSystemEvent('system_stopped', {
        timestamp: new Date().toISOString(),
        uptime_hours: this.getSystemUptime(),
        stats: this.getSystemStats()
      });

    } catch (error) {
      console.error('Error stopping EPU Master Orchestrator:', error.message);
    }
  }

  /**
   * Perform comprehensive EPU/SER/19 scan and analysis
   */
  async performComprehensiveScan() {
    const scanStartTime = Date.now();

    try {
      console.log('🔍 Starting comprehensive EPU/SER/19 scan...');

      // Step 1: Scrape latest EPU/SER/19 tenders
      console.log('📡 Scraping EPU/SER/19 tenders...');
      const scrapedTenders = await this.scraper.scrapeEPUTenders();

      this.stats.tendersProcessed += scrapedTenders.length;
      console.log(`✅ Processed ${scrapedTenders.length} EPU tenders`);

      // Step 2: Analyze each tender for lifecycle and competitive intelligence
      for (const tender of scrapedTenders) {
        await this.processTenderComprehensively(tender);
      }

      // Step 3: Update market intelligence
      console.log('📈 Updating market intelligence...');
      await this.updateMarketIntelligence();

      // Step 4: Generate insights and recommendations
      console.log('💡 Generating strategic insights...');
      const insights = await this.generateStrategicInsights();

      // Step 5: Update system statistics
      this.stats.totalScansCompleted++;
      this.stats.lastFullScanTime = new Date().toISOString();

      const scanDuration = Date.now() - scanStartTime;
      console.log(`✅ Comprehensive scan completed in ${scanDuration}ms`);

      // Emit scan completion event
      this.emitSystemEvent('comprehensive_scan_completed', {
        timestamp: new Date().toISOString(),
        duration_ms: scanDuration,
        tenders_processed: scrapedTenders.length,
        insights_generated: insights.length
      });

      return {
        success: true,
        tenders_processed: scrapedTenders.length,
        duration_ms: scanDuration,
        insights: insights
      };

    } catch (error) {
      console.error('❌ Comprehensive scan failed:', error.message);
      this.stats.errorCount++;
      this.stats.lastError = error.message;

      this.emitSystemEvent('scan_failed', {
        timestamp: new Date().toISOString(),
        error: error.message,
        duration_ms: Date.now() - scanStartTime
      });

      throw error;
    }
  }

  /**
   * Process individual tender through all analysis systems
   */
  async processTenderComprehensively(tender) {
    try {
      // Lifecycle tracking
      if (this.config.lifecycleTracking) {
        await this.lifecycleTracker.initializeTenderLifecycle(tender);
        this.stats.lifecycleEventsTracked++;
      }

      // Competitor analysis
      if (this.config.competitorAnalysis) {
        const competitorAnalyzed = await this.competitorAnalyzer.analyzeTenderCompetitors(tender);
        if (competitorAnalyzed) {
          this.stats.competitorsAnalyzed++;
        }
      }

      // Generate opportunity alerts if high value
      if (tender.intelligence_score > 70 || tender.estimated_value > 300000) {
        await this.generateOpportunityAlert(tender);
      }

    } catch (error) {
      console.error(`Error processing tender ${tender.tender_no}:`, error.message);
    }
  }

  /**
   * Update overall market intelligence
   */
  async updateMarketIntelligence() {
    try {
      // Generate market report
      const marketReport = this.monitor.generateMarketReport();

      // Analyze market trends
      const trendAnalysis = await this.analyzeMarketTrends();

      // Update competitive landscape
      const competitiveReport = this.competitorAnalyzer.getCompetitiveIntelligenceReport();

      return {
        market_report: marketReport,
        trend_analysis: trendAnalysis,
        competitive_landscape: competitiveReport
      };

    } catch (error) {
      console.error('Failed to update market intelligence:', error.message);
      return null;
    }
  }

  /**
   * Analyze market trends for strategic insights
   */
  async analyzeMarketTrends() {
    this.monitor.initDB();

    try {
      const trends = {
        contract_value_trends: {},
        service_type_trends: {},
        agency_activity_trends: {},
        seasonal_patterns: {},
        renewal_patterns: {}
      };

      // Analyze contract value trends over time
      const valueStmt = this.monitor.db.prepare(`
        SELECT
          strftime('%Y-%m', created_at) as month,
          AVG(estimated_value) as avg_value,
          COUNT(*) as tender_count,
          SUM(estimated_value) as total_value
        FROM epu_ser_19_tenders
        WHERE created_at >= date('now', '-12 months')
          AND estimated_value > 0
        GROUP BY month
        ORDER BY month ASC
      `);
      trends.contract_value_trends = valueStmt.all();

      // Service type growth analysis
      const serviceStmt = this.monitor.db.prepare(`
        SELECT
          service_type,
          COUNT(*) as current_count,
          (
            SELECT COUNT(*)
            FROM epu_ser_19_tenders t2
            WHERE t2.service_type = t1.service_type
              AND t2.created_at >= date('now', '-12 months')
              AND t2.created_at < date('now', '-6 months')
          ) as previous_count
        FROM epu_ser_19_tenders t1
        WHERE t1.created_at >= date('now', '-6 months')
        GROUP BY service_type
        ORDER BY current_count DESC
      `);
      trends.service_type_trends = serviceStmt.all();

      // Agency activity trends
      const agencyStmt = this.monitor.db.prepare(`
        SELECT
          agency,
          COUNT(*) as tender_count,
          AVG(estimated_value) as avg_value,
          SUM(estimated_value) as total_value
        FROM epu_ser_19_tenders
        WHERE created_at >= date('now', '-6 months')
          AND agency IS NOT NULL
        GROUP BY agency
        ORDER BY tender_count DESC
        LIMIT 15
      `);
      trends.agency_activity_trends = agencyStmt.all();

      return trends;

    } catch (error) {
      console.error('Failed to analyze market trends:', error.message);
      return {};
    }
  }

  /**
   * Generate strategic insights and recommendations
   */
  async generateStrategicInsights() {
    const insights = [];

    try {
      // Get recent high-value opportunities
      const highValueTenders = this.monitor.getActiveEPUTenders({
        limit: 10,
        minIntelligenceScore: 70
      });

      for (const tender of highValueTenders) {
        const insight = {
          type: 'high_value_opportunity',
          priority: 'high',
          tender_no: tender.tender_no,
          title: tender.title,
          estimated_value: tender.estimated_value,
          intelligence_score: tender.intelligence_score,
          recommendations: this.generateTenderRecommendations(tender),
          competitive_assessment: await this.assessCompetitivePosition(tender),
          timeline_critical_dates: this.getTimelineCriticalDates(tender)
        };

        insights.push(insight);
      }

      // Market opportunity insights
      const marketInsights = await this.generateMarketOpportunityInsights();
      insights.push(...marketInsights);

      // Competitive threat insights
      const competitiveInsights = await this.generateCompetitiveThreatInsights();
      insights.push(...competitiveInsights);

      return insights;

    } catch (error) {
      console.error('Failed to generate strategic insights:', error.message);
      return [];
    }
  }

  /**
   * Generate recommendations for specific tender
   */
  generateTenderRecommendations(tender) {
    const recommendations = [];

    // Value-based recommendations
    if (tender.estimated_value > 500000) {
      recommendations.push({
        category: 'strategic',
        priority: 'high',
        action: 'Consider strategic partnership for large-scale delivery',
        rationale: 'High-value contract may require enhanced capabilities'
      });
    }

    // Service-type recommendations
    if (tender.service_type === 'data_entry') {
      recommendations.push({
        category: 'technical',
        priority: 'medium',
        action: 'Highlight automation and accuracy capabilities',
        rationale: 'Data entry services increasingly value automation and quality'
      });
    }

    // Timeline recommendations
    if (tender.closing_date) {
      const closingDate = new Date(tender.closing_date);
      const daysToClose = Math.ceil((closingDate - new Date()) / (1000 * 60 * 60 * 24));

      if (daysToClose <= 14) {
        recommendations.push({
          category: 'timeline',
          priority: 'urgent',
          action: 'Expedite proposal preparation and resource allocation',
          rationale: `Tender closes in ${daysToClose} days - immediate action required`
        });
      }
    }

    // Win probability recommendations
    if (tender.win_probability > 0.7) {
      recommendations.push({
        category: 'strategic',
        priority: 'high',
        action: 'Prioritize this opportunity for dedicated team assignment',
        rationale: `High win probability (${(tender.win_probability * 100).toFixed(0)}%) identified`
      });
    }

    return recommendations;
  }

  /**
   * Assess competitive position for tender
   */
  async assessCompetitivePosition(tender) {
    try {
      this.competitorAnalyzer.initDB();

      // Find competitors who have won similar contracts
      const competitorStmt = this.competitorAnalyzer.db.prepare(`
        SELECT cp.company_name, cp.threat_level, cp.win_rate, cp.avg_contract_value
        FROM epu_competitor_profiles cp
        JOIN epu_competitor_bids cb ON cp.id = cb.competitor_id
        WHERE cb.service_type = ? AND cb.agency = ? AND cb.won_contract = 1
        ORDER BY cp.overall_threat_score DESC
        LIMIT 5
      `);

      const competitors = competitorStmt.all(tender.service_type || 'general', tender.agency || '');

      return {
        likely_competitors: competitors.length,
        top_threats: competitors.slice(0, 3),
        competitive_intensity: this.calculateCompetitiveIntensity(competitors),
        recommendation: this.getCompetitiveRecommendation(competitors)
      };

    } catch (error) {
      console.error('Failed to assess competitive position:', error.message);
      return {};
    }
  }

  /**
   * Calculate competitive intensity for tender
   */
  calculateCompetitiveIntensity(competitors) {
    if (competitors.length === 0) return 'low';

    const highThreatCount = competitors.filter(c => c.threat_level === 'high' || c.threat_level === 'critical').length;
    const avgWinRate = competitors.reduce((sum, c) => sum + (c.win_rate || 0), 0) / competitors.length;

    if (highThreatCount >= 3 || avgWinRate > 0.7) {
      return 'very_high';
    } else if (highThreatCount >= 2 || avgWinRate > 0.5) {
      return 'high';
    } else if (competitors.length >= 3) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get competitive recommendation
   */
  getCompetitiveRecommendation(competitors) {
    if (competitors.length === 0) {
      return 'Favorable competitive environment - focus on technical excellence';
    }

    const highThreatCompetitors = competitors.filter(c =>
      c.threat_level === 'high' || c.threat_level === 'critical'
    );

    if (highThreatCompetitors.length >= 2) {
      return 'Highly competitive - require differentiation strategy and aggressive pricing';
    } else if (highThreatCompetitors.length === 1) {
      return `Monitor ${highThreatCompetitors[0].company_name} closely - develop counter-strategy`;
    } else {
      return 'Moderately competitive - focus on value proposition and service quality';
    }
  }

  /**
   * Get timeline critical dates for tender
   */
  getTimelineCriticalDates(tender) {
    const criticalDates = [];

    if (tender.closing_date) {
      const closingDate = new Date(tender.closing_date);
      const today = new Date();
      const daysToClose = Math.ceil((closingDate - today) / (1000 * 60 * 60 * 24));

      criticalDates.push({
        date: tender.closing_date,
        type: 'submission_deadline',
        days_from_now: daysToClose,
        urgency: daysToClose <= 7 ? 'urgent' : daysToClose <= 14 ? 'high' : 'medium'
      });
    }

    return criticalDates;
  }

  /**
   * Schedule comprehensive scans
   */
  scheduleComprehensiveScans() {
    // Daily comprehensive scan at 6 AM
    const dailyScanJob = cron.schedule('0 6 * * *', async () => {
      console.log('🕕 Running scheduled daily EPU/SER/19 scan...');
      try {
        await this.performComprehensiveScan();
      } catch (error) {
        console.error('Scheduled scan failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Singapore'
    });

    this.scheduledJobs.push(dailyScanJob);

    // Additional scans during business hours (every 2 hours from 9 AM to 5 PM)
    const businessHoursScanJob = cron.schedule('0 9-17/2 * * 1-5', async () => {
      console.log('🕘 Running business hours EPU scan...');
      try {
        await this.performComprehensiveScan();
      } catch (error) {
        console.error('Business hours scan failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Singapore'
    });

    this.scheduledJobs.push(businessHoursScanJob);

    console.log('📅 Comprehensive scan schedule configured');
  }

  /**
   * Schedule competitor analysis updates
   */
  scheduleCompetitorAnalysis() {
    // Weekly competitor analysis on Monday at 7 AM
    const weeklyCompetitorJob = cron.schedule('0 7 * * 1', async () => {
      console.log('📊 Running weekly competitor analysis...');
      try {
        const report = this.competitorAnalyzer.getCompetitiveIntelligenceReport();
        console.log(`Competitor analysis complete: ${report.top_competitors.length} competitors analyzed`);
      } catch (error) {
        console.error('Competitor analysis failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Singapore'
    });

    this.scheduledJobs.push(weeklyCompetitorJob);
    console.log('📅 Competitor analysis schedule configured');
  }

  /**
   * Schedule lifecycle tracking updates
   */
  scheduleLifecycleUpdates() {
    // Daily lifecycle updates at 8 AM
    const lifecycleJob = cron.schedule('0 8 * * *', async () => {
      console.log('📋 Running lifecycle tracking updates...');
      try {
        const upcomingDates = this.lifecycleTracker.getUpcomingCriticalDates(30);
        const renewals = this.lifecycleTracker.getRenewalOpportunities(12);
        console.log(`Lifecycle update: ${upcomingDates.length} upcoming dates, ${renewals.length} renewal opportunities`);
      } catch (error) {
        console.error('Lifecycle update failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Singapore'
    });

    this.scheduledJobs.push(lifecycleJob);
    console.log('📅 Lifecycle tracking schedule configured');
  }

  /**
   * Schedule market reports
   */
  scheduleMarketReports() {
    // Weekly market report on Friday at 5 PM
    const weeklyReportJob = cron.schedule('0 17 * * 5', async () => {
      console.log('📈 Generating weekly EPU/SER/19 market report...');
      try {
        const report = this.monitor.generateMarketReport();
        console.log(`Weekly report: ${report.active_opportunities} active opportunities, $${report.total_estimated_value.toLocaleString()} total value`);
      } catch (error) {
        console.error('Market report generation failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Singapore'
    });

    this.scheduledJobs.push(weeklyReportJob);
    console.log('📅 Market report schedule configured');
  }

  /**
   * Start system health monitoring
   */
  startHealthMonitoring() {
    const healthJob = cron.schedule('*/15 * * * *', () => {
      this.updateSystemHealth();
    });

    this.scheduledJobs.push(healthJob);
  }

  /**
   * Update system health statistics
   */
  updateSystemHealth() {
    if (this.stats.systemStartTime) {
      this.stats.systemUptime = Math.floor((Date.now() - this.stats.systemStartTime.getTime()) / 1000);
    }
  }

  /**
   * Generate opportunity alert
   */
  async generateOpportunityAlert(tender) {
    try {
      this.stats.alertsSent++;

      this.emitSystemEvent('high_value_opportunity_detected', {
        timestamp: new Date().toISOString(),
        tender: {
          tender_no: tender.tender_no,
          title: tender.title,
          agency: tender.agency,
          estimated_value: tender.estimated_value,
          intelligence_score: tender.intelligence_score,
          closing_date: tender.closing_date
        }
      });

    } catch (error) {
      console.error('Failed to generate opportunity alert:', error.message);
    }
  }

  /**
   * Emit system events for monitoring and notifications
   */
  emitSystemEvent(eventType, eventData) {
    try {
      // Try to use existing WebSocket broadcaster
      let broadcastToAdmins;
      try {
        const { broadcast } = require('../../websocket');
        broadcastToAdmins = broadcast.broadcastToAdmins;
      } catch (error) {
        return; // WebSocket not available
      }

      broadcastToAdmins({
        type: 'epu_system_event',
        event_type: eventType,
        data: eventData
      });

    } catch (error) {
      console.error('Failed to emit system event:', error.message);
    }
  }

  /**
   * Get system uptime in hours
   */
  getSystemUptime() {
    return this.stats.systemUptime / 3600;
  }

  /**
   * Get comprehensive system statistics
   */
  getSystemStats() {
    return {
      ...this.stats,
      system_uptime_hours: this.getSystemUptime(),
      is_running: this.isRunning,
      configuration: this.config,
      scheduled_jobs_count: this.scheduledJobs.length,
      services_status: {
        monitor: !!this.monitor,
        scraper: !!this.scraper,
        alert_system: this.alertSystem?.isRunning || false,
        lifecycle_tracker: !!this.lifecycleTracker,
        competitor_analyzer: !!this.competitorAnalyzer
      }
    };
  }

  /**
   * Generate market opportunity insights
   */
  async generateMarketOpportunityInsights() {
    const insights = [];

    try {
      this.monitor.initDB();

      // Identify growth opportunities by service type
      const growthStmt = this.monitor.db.prepare(`
        SELECT
          service_type,
          COUNT(*) as recent_count,
          AVG(estimated_value) as avg_value,
          SUM(estimated_value) as total_value
        FROM epu_ser_19_tenders
        WHERE created_at >= date('now', '-3 months')
        GROUP BY service_type
        HAVING recent_count >= 3
        ORDER BY total_value DESC
      `);

      const growthOpportunities = growthStmt.all();

      for (const opp of growthOpportunities) {
        insights.push({
          type: 'market_opportunity',
          priority: 'medium',
          category: 'service_growth',
          service_type: opp.service_type,
          insight: `${opp.service_type} shows strong market activity with ${opp.recent_count} recent tenders worth $${opp.total_value.toLocaleString()}`,
          recommendation: `Consider specializing or expanding capabilities in ${opp.service_type} services`,
          market_value: opp.total_value
        });
      }

    } catch (error) {
      console.error('Failed to generate market opportunity insights:', error.message);
    }

    return insights;
  }

  /**
   * Generate competitive threat insights
   */
  async generateCompetitiveThreatInsights() {
    const insights = [];

    try {
      this.competitorAnalyzer.initDB();

      // Identify emerging threats
      const threatStmt = this.competitorAnalyzer.db.prepare(`
        SELECT
          cp.company_name,
          cp.overall_threat_score,
          cp.win_rate,
          COUNT(cb.id) as recent_wins
        FROM epu_competitor_profiles cp
        JOIN epu_competitor_bids cb ON cp.id = cb.competitor_id
        WHERE cb.won_contract = 1
          AND cb.award_date >= date('now', '-6 months')
          AND cp.overall_threat_score >= 60
        GROUP BY cp.id
        HAVING recent_wins >= 2
        ORDER BY cp.overall_threat_score DESC
      `);

      const threats = threatStmt.all();

      for (const threat of threats) {
        insights.push({
          type: 'competitive_threat',
          priority: threat.overall_threat_score >= 80 ? 'high' : 'medium',
          category: 'competitor_activity',
          competitor_name: threat.company_name,
          threat_score: threat.overall_threat_score,
          insight: `${threat.company_name} has won ${threat.recent_wins} contracts recently with ${(threat.win_rate * 100).toFixed(0)}% win rate`,
          recommendation: `Monitor ${threat.company_name}'s bidding strategies and develop counter-measures`,
          threat_level: threat.overall_threat_score >= 80 ? 'critical' : 'high'
        });
      }

    } catch (error) {
      console.error('Failed to generate competitive threat insights:', error.message);
    }

    return insights;
  }
}

module.exports = EPUMasterOrchestrator;