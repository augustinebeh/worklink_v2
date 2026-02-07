/**
 * EPU/SER/19 Competitor Analysis System
 * Advanced competitor intelligence and market positioning analysis
 *
 * Features:
 * - Competitor identification and profiling
 * - Win/loss pattern analysis
 * - Pricing strategy analysis
 * - Market share calculation
 * - Threat level assessment
 * - Competitive positioning recommendations
 * - Bidding strategy optimization
 */

const EPUSer19Monitor = require('./epu-ser-19-monitor');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class EPUCompetitorAnalyzer {
  constructor() {
    this.monitor = new EPUSer19Monitor();
    this.db = null;

    // Competitor classification categories
    this.competitorCategories = {
      TIER_1: 'tier_1', // Large established players
      TIER_2: 'tier_2', // Medium-sized specialized companies
      TIER_3: 'tier_3', // Small local providers
      NICHE: 'niche',   // Specialized service providers
      NEW_ENTRANT: 'new_entrant' // Recently entered market
    };

    // Threat levels
    this.threatLevels = {
      CRITICAL: 'critical',  // Direct threat to market share
      HIGH: 'high',         // Strong competitor
      MEDIUM: 'medium',     // Moderate threat
      LOW: 'low',          // Limited threat
      MINIMAL: 'minimal'    // Negligible threat
    };

    // Analysis dimensions
    this.analysisDimensions = {
      FINANCIAL_STRENGTH: 'financial_strength',
      SERVICE_QUALITY: 'service_quality',
      PRICE_COMPETITIVENESS: 'price_competitiveness',
      AGENCY_RELATIONSHIPS: 'agency_relationships',
      TECHNICAL_CAPABILITY: 'technical_capability',
      MARKET_PRESENCE: 'market_presence',
      INNOVATION: 'innovation',
      RELIABILITY: 'reliability'
    };
  }

  /**
   * Initialize database with competitor analysis tables
   */
  initDB() {
    if (!this.db) {
      const IS_RAILWAY = !!process.env.RAILWAY_ENVIRONMENT;
      const DB_DIR = IS_RAILWAY
        ? (process.env.RAILWAY_VOLUME_MOUNT_PATH || '/app/data')
        : path.join(__dirname, '../../database');

      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      const dbPath = path.join(DB_DIR, 'gebiz_intelligence.db');
      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');

      this.ensureCompetitorTables();
    }
  }

  /**
   * Create comprehensive competitor analysis tables
   */
  ensureCompetitorTables() {
    try {
      // Enhanced competitor profiles table
      const createCompetitorProfilesSQL = `
        CREATE TABLE IF NOT EXISTS epu_competitor_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_name TEXT UNIQUE NOT NULL,
          company_registration_no TEXT,
          company_size TEXT, -- 'small', 'medium', 'large', 'enterprise'
          competitor_tier TEXT, -- 'tier_1', 'tier_2', 'tier_3', 'niche', 'new_entrant'
          threat_level TEXT DEFAULT 'medium',
          total_epu_contracts INTEGER DEFAULT 0,
          total_epu_value REAL DEFAULT 0,
          avg_contract_value REAL DEFAULT 0,
          win_rate REAL DEFAULT 0,
          bid_success_rate REAL DEFAULT 0,
          market_share_percentage REAL DEFAULT 0,
          first_contract_date DATE,
          latest_contract_date DATE,
          preferred_agencies TEXT, -- JSON array of agencies they frequently win
          service_specializations TEXT, -- JSON array of service types
          geographical_focus TEXT, -- JSON array of locations/regions
          typical_contract_size TEXT, -- 'small', 'medium', 'large', 'enterprise'
          pricing_strategy TEXT, -- 'premium', 'competitive', 'value', 'low_cost'
          pricing_patterns TEXT, -- JSON with pricing analysis
          competitive_advantages TEXT, -- JSON array of strengths
          weaknesses TEXT, -- JSON array of vulnerabilities
          financial_indicators TEXT, -- JSON with financial health data
          performance_metrics TEXT, -- JSON with service delivery metrics
          innovation_score INTEGER DEFAULT 0, -- 0-100
          reliability_score INTEGER DEFAULT 0, -- 0-100
          agency_relationship_score INTEGER DEFAULT 0, -- 0-100
          overall_threat_score INTEGER DEFAULT 0, -- 0-100
          last_analyzed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_comp_profiles_threat ON epu_competitor_profiles(threat_level);
        CREATE INDEX IF NOT EXISTS idx_comp_profiles_tier ON epu_competitor_profiles(competitor_tier);
        CREATE INDEX IF NOT EXISTS idx_comp_profiles_win_rate ON epu_competitor_profiles(win_rate);
        CREATE INDEX IF NOT EXISTS idx_comp_profiles_threat_score ON epu_competitor_profiles(overall_threat_score);
      `;

      // Competitor bidding history
      const createBiddingHistorySQL = `
        CREATE TABLE IF NOT EXISTS epu_competitor_bids (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          competitor_id INTEGER,
          competitor_name TEXT,
          tender_id INTEGER,
          tender_no TEXT,
          agency TEXT,
          service_type TEXT,
          bid_amount REAL,
          won_contract BOOLEAN DEFAULT 0,
          award_amount REAL,
          bid_date DATE,
          award_date DATE,
          contract_duration_months INTEGER,
          bid_ranking INTEGER, -- Position in bid evaluation (if available)
          price_competitiveness REAL, -- How competitive was their pricing
          technical_score REAL, -- Technical evaluation score (if available)
          total_score REAL, -- Overall bid score (if available)
          win_factors TEXT, -- JSON array of factors that led to win/loss
          pricing_analysis TEXT, -- JSON with pricing breakdown analysis
          lessons_learned TEXT, -- Strategic insights from this bid
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(competitor_id) REFERENCES epu_competitor_profiles(id),
          FOREIGN KEY(tender_id) REFERENCES epu_ser_19_tenders(id)
        );

        CREATE INDEX IF NOT EXISTS idx_comp_bids_competitor ON epu_competitor_bids(competitor_id);
        CREATE INDEX IF NOT EXISTS idx_comp_bids_tender ON epu_competitor_bids(tender_id);
        CREATE INDEX IF NOT EXISTS idx_comp_bids_won ON epu_competitor_bids(won_contract);
        CREATE INDEX IF NOT EXISTS idx_comp_bids_date ON epu_competitor_bids(bid_date);
      `;

      // Market positioning analysis
      const createPositioningSQL = `
        CREATE TABLE IF NOT EXISTS epu_market_positioning (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          analysis_date DATE,
          market_segment TEXT, -- 'data_entry', 'administrative', 'event_support', etc.
          competitor_id INTEGER,
          competitor_name TEXT,
          market_position INTEGER, -- 1 = market leader, 2 = strong competitor, etc.
          market_share_rank INTEGER,
          competitive_strengths TEXT, -- JSON array
          competitive_weaknesses TEXT, -- JSON array
          differentiation_factors TEXT, -- JSON array
          pricing_position TEXT, -- 'premium', 'competitive', 'value', 'discount'
          service_quality_rating REAL, -- 1.0 to 5.0
          innovation_rating REAL, -- 1.0 to 5.0
          customer_satisfaction REAL, -- 1.0 to 5.0
          strategic_recommendations TEXT, -- JSON with recommended strategies against this competitor
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(competitor_id) REFERENCES epu_competitor_profiles(id)
        );

        CREATE INDEX IF NOT EXISTS idx_positioning_segment ON epu_market_positioning(market_segment);
        CREATE INDEX IF NOT EXISTS idx_positioning_competitor ON epu_market_positioning(competitor_id);
        CREATE INDEX IF NOT EXISTS idx_positioning_date ON epu_market_positioning(analysis_date);
      `;

      // Competitive intelligence alerts
      const createCompetitiveAlertsSQL = `
        CREATE TABLE IF NOT EXISTS epu_competitive_alerts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          alert_type TEXT, -- 'new_competitor', 'pricing_change', 'market_expansion', 'contract_win'
          competitor_id INTEGER,
          competitor_name TEXT,
          alert_priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
          alert_title TEXT,
          alert_description TEXT,
          impact_assessment TEXT,
          recommended_actions TEXT, -- JSON array
          data_source TEXT, -- 'tender_analysis', 'market_research', 'manual_input'
          confidence_level REAL, -- 0.0 to 1.0
          expires_at DATE,
          acknowledged BOOLEAN DEFAULT 0,
          acknowledged_at DATETIME,
          acknowledged_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(competitor_id) REFERENCES epu_competitor_profiles(id)
        );

        CREATE INDEX IF NOT EXISTS idx_comp_alerts_type ON epu_competitive_alerts(alert_type);
        CREATE INDEX IF NOT EXISTS idx_comp_alerts_priority ON epu_competitive_alerts(alert_priority);
        CREATE INDEX IF NOT EXISTS idx_comp_alerts_acknowledged ON epu_competitive_alerts(acknowledged);
      `;

      this.db.exec(createCompetitorProfilesSQL);
      this.db.exec(createBiddingHistorySQL);
      this.db.exec(createPositioningSQL);
      this.db.exec(createCompetitiveAlertsSQL);

      console.log('✅ EPU competitor analysis tables created');
    } catch (error) {
      console.error('❌ Failed to create competitor tables:', error.message);
      throw error;
    }
  }

  /**
   * Analyze tender for competitor intelligence
   */
  async analyzeTenderCompetitors(tender) {
    this.initDB();

    try {
      // If tender is awarded, analyze the winning supplier
      if (tender.awarded_supplier && tender.award_date) {
        await this.analyzeWinningSupplier(tender);
      }

      // Identify likely competitors for active tenders
      if (tender.status === 'active') {
        const likelyCompetitors = await this.identifyLikelyCompetitors(tender);
        await this.updateCompetitorThreatLevels(tender, likelyCompetitors);
      }

      // Generate competitive intelligence alerts
      await this.generateCompetitiveAlerts(tender);

      return true;

    } catch (error) {
      console.error('Failed to analyze tender competitors:', error.message);
      return false;
    }
  }

  /**
   * Analyze winning supplier and update competitor profile
   */
  async analyzeWinningSupplier(tender) {
    const supplierName = tender.awarded_supplier;
    if (!supplierName || supplierName === 'TBD') return;

    // Get or create competitor profile
    let competitorId = await this.getOrCreateCompetitorProfile(supplierName);

    // Update competitor statistics
    await this.updateCompetitorStats(competitorId, tender, true); // true = won

    // Analyze pricing strategy
    await this.analyzePricingStrategy(competitorId, tender);

    // Update market positioning
    await this.updateMarketPositioning(competitorId, tender);

    // Record bid history
    await this.recordBidHistory(competitorId, tender, true);

    console.log(`🏆 Analyzed winning supplier: ${supplierName} for ${tender.tender_no}`);
  }

  /**
   * Get or create competitor profile
   */
  async getOrCreateCompetitorProfile(supplierName) {
    const existingStmt = this.db.prepare(`
      SELECT id FROM epu_competitor_profiles WHERE company_name = ?
    `);
    const existing = existingStmt.get(supplierName);

    if (existing) {
      return existing.id;
    }

    // Create new competitor profile
    const insertStmt = this.db.prepare(`
      INSERT INTO epu_competitor_profiles (
        company_name, competitor_tier, threat_level, company_size
      ) VALUES (?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      supplierName,
      this.competitorCategories.TIER_2, // Default classification
      this.threatLevels.MEDIUM, // Default threat level
      'medium' // Default size
    );

    console.log(`👤 Created new competitor profile: ${supplierName}`);
    return result.lastInsertRowid;
  }

  /**
   * Update competitor statistics
   */
  async updateCompetitorStats(competitorId, tender, won) {
    const updateStmt = this.db.prepare(`
      UPDATE epu_competitor_profiles
      SET
        total_epu_contracts = total_epu_contracts + ?,
        total_epu_value = total_epu_value + ?,
        latest_contract_date = COALESCE(MAX(latest_contract_date, ?), ?),
        last_analyzed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const contractValue = tender.awarded_amount || tender.estimated_value || 0;
    const contractDate = tender.award_date || new Date().toISOString().split('T')[0];

    updateStmt.run(
      won ? 1 : 0,
      won ? contractValue : 0,
      contractDate,
      contractDate,
      competitorId
    );

    // Calculate win rate
    await this.calculateWinRate(competitorId);

    // Update average contract value
    await this.updateAverageContractValue(competitorId);

    // Update threat score
    await this.calculateThreatScore(competitorId);
  }

  /**
   * Calculate competitor win rate
   */
  async calculateWinRate(competitorId) {
    const statsStmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_bids,
        SUM(CASE WHEN won_contract = 1 THEN 1 ELSE 0 END) as wins
      FROM epu_competitor_bids
      WHERE competitor_id = ?
    `);

    const stats = statsStmt.get(competitorId);
    const winRate = stats.total_bids > 0 ? stats.wins / stats.total_bids : 0;

    const updateStmt = this.db.prepare(`
      UPDATE epu_competitor_profiles
      SET win_rate = ?, bid_success_rate = ?
      WHERE id = ?
    `);

    updateStmt.run(winRate, winRate, competitorId);
  }

  /**
   * Update average contract value
   */
  async updateAverageContractValue(competitorId) {
    const avgStmt = this.db.prepare(`
      SELECT AVG(award_amount) as avg_value
      FROM epu_competitor_bids
      WHERE competitor_id = ? AND won_contract = 1 AND award_amount > 0
    `);

    const result = avgStmt.get(competitorId);
    const avgValue = result.avg_value || 0;

    const updateStmt = this.db.prepare(`
      UPDATE epu_competitor_profiles
      SET avg_contract_value = ?
      WHERE id = ?
    `);

    updateStmt.run(avgValue, competitorId);
  }

  /**
   * Analyze competitor pricing strategy
   */
  async analyzePricingStrategy(competitorId, tender) {
    // Get competitor's recent bids for pricing analysis
    const bidsStmt = this.db.prepare(`
      SELECT bid_amount, award_amount, won_contract, service_type
      FROM epu_competitor_bids
      WHERE competitor_id = ?
      ORDER BY bid_date DESC
      LIMIT 10
    `);

    const recentBids = bidsStmt.all(competitorId);

    if (recentBids.length === 0) return;

    // Analyze pricing patterns
    const pricingAnalysis = {
      average_bid_amount: 0,
      average_win_amount: 0,
      pricing_aggressiveness: 'moderate',
      preferred_contract_sizes: [],
      service_type_pricing: {}
    };

    const bidAmounts = recentBids.filter(b => b.bid_amount > 0).map(b => b.bid_amount);
    const winAmounts = recentBids.filter(b => b.won_contract && b.award_amount > 0).map(b => b.award_amount);

    if (bidAmounts.length > 0) {
      pricingAnalysis.average_bid_amount = bidAmounts.reduce((a, b) => a + b, 0) / bidAmounts.length;
    }

    if (winAmounts.length > 0) {
      pricingAnalysis.average_win_amount = winAmounts.reduce((a, b) => a + b, 0) / winAmounts.length;
    }

    // Determine pricing aggressiveness
    const winRate = recentBids.filter(b => b.won_contract).length / recentBids.length;
    if (winRate > 0.7) {
      pricingAnalysis.pricing_aggressiveness = 'competitive';
    } else if (winRate < 0.3) {
      pricingAnalysis.pricing_aggressiveness = 'premium';
    }

    // Update competitor profile with pricing analysis
    const updateStmt = this.db.prepare(`
      UPDATE epu_competitor_profiles
      SET pricing_patterns = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(pricingAnalysis), competitorId);
  }

  /**
   * Identify likely competitors for active tender
   */
  async identifyLikelyCompetitors(tender) {
    const likelyCompetitors = [];

    // Find competitors who have won similar contracts
    const similarStmt = this.db.prepare(`
      SELECT DISTINCT cp.id, cp.company_name, cp.threat_level,
             COUNT(cb.id) as similar_contracts
      FROM epu_competitor_profiles cp
      JOIN epu_competitor_bids cb ON cp.id = cb.competitor_id
      WHERE cb.service_type = ? AND cb.agency = ? AND cb.won_contract = 1
      GROUP BY cp.id
      ORDER BY similar_contracts DESC, cp.overall_threat_score DESC
      LIMIT 10
    `);

    const serviceType = tender.service_type || 'general';
    const agency = tender.agency || '';

    const similarCompetitors = similarStmt.all(serviceType, agency);

    for (const comp of similarCompetitors) {
      likelyCompetitors.push({
        id: comp.id,
        name: comp.company_name,
        threat_level: comp.threat_level,
        similar_contracts: comp.similar_contracts,
        likelihood: comp.similar_contracts * 0.2 + (comp.threat_level === 'high' ? 0.3 : 0.1)
      });
    }

    // Find competitors in same contract value range
    const valueRangeStmt = this.db.prepare(`
      SELECT DISTINCT cp.id, cp.company_name, cp.avg_contract_value
      FROM epu_competitor_profiles cp
      WHERE cp.avg_contract_value BETWEEN ? AND ?
        AND cp.id NOT IN (${likelyCompetitors.map(() => '?').join(',')})
      ORDER BY cp.overall_threat_score DESC
      LIMIT 5
    `);

    const contractValue = tender.estimated_value || 100000;
    const valueLower = contractValue * 0.5;
    const valueUpper = contractValue * 2;
    const excludeIds = likelyCompetitors.map(c => c.id);

    if (excludeIds.length === 0) excludeIds.push(0); // Avoid SQL error

    const valueCompetitors = valueRangeStmt.all(valueLower, valueUpper, ...excludeIds);

    for (const comp of valueCompetitors) {
      likelyCompetitors.push({
        id: comp.id,
        name: comp.company_name,
        threat_level: 'medium',
        similar_contracts: 0,
        likelihood: 0.3
      });
    }

    return likelyCompetitors;
  }

  /**
   * Update competitor threat levels for specific tender
   */
  async updateCompetitorThreatLevels(tender, likelyCompetitors) {
    for (const competitor of likelyCompetitors) {
      // Create competitive alert if high-threat competitor is likely to bid
      if (competitor.likelihood > 0.6 && competitor.threat_level === 'high') {
        await this.createCompetitiveAlert({
          type: 'high_threat_competitor',
          competitor_id: competitor.id,
          competitor_name: competitor.name,
          priority: 'high',
          title: `High-Threat Competitor Likely to Bid: ${competitor.name}`,
          description: `${competitor.name} has ${competitor.similar_contracts} similar contract wins and is likely to bid on ${tender.tender_no}`,
          impact_assessment: 'May require enhanced proposal strategy and competitive pricing',
          recommended_actions: [
            'Review competitor\'s previous winning proposals',
            'Analyze pricing strategy against this competitor',
            'Strengthen technical differentiation',
            'Consider strategic partnerships'
          ],
          tender: tender
        });
      }
    }
  }

  /**
   * Calculate overall threat score for competitor
   */
  async calculateThreatScore(competitorId) {
    // Get competitor data
    const competitorStmt = this.db.prepare(`
      SELECT * FROM epu_competitor_profiles WHERE id = ?
    `);
    const competitor = competitorStmt.get(competitorId);

    if (!competitor) return;

    // Calculate threat score based on multiple factors
    let threatScore = 0;

    // Win rate factor (0-25 points)
    threatScore += (competitor.win_rate || 0) * 25;

    // Contract value factor (0-20 points)
    if (competitor.avg_contract_value > 500000) {
      threatScore += 20;
    } else if (competitor.avg_contract_value > 200000) {
      threatScore += 15;
    } else if (competitor.avg_contract_value > 100000) {
      threatScore += 10;
    } else {
      threatScore += 5;
    }

    // Market presence factor (0-20 points)
    threatScore += Math.min(20, (competitor.total_epu_contracts || 0) * 2);

    // Recent activity factor (0-15 points)
    if (competitor.latest_contract_date) {
      const latestDate = new Date(competitor.latest_contract_date);
      const monthsAgo = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo < 6) {
        threatScore += 15;
      } else if (monthsAgo < 12) {
        threatScore += 10;
      } else {
        threatScore += 5;
      }
    }

    // Financial strength factor (0-10 points)
    threatScore += Math.min(10, (competitor.total_epu_value || 0) / 1000000);

    // Innovation and reliability scores (0-10 points)
    threatScore += Math.min(10, ((competitor.innovation_score || 0) + (competitor.reliability_score || 0)) / 20);

    // Cap at 100
    threatScore = Math.min(100, Math.round(threatScore));

    // Update threat level based on score
    let threatLevel = this.threatLevels.LOW;
    if (threatScore >= 80) {
      threatLevel = this.threatLevels.CRITICAL;
    } else if (threatScore >= 60) {
      threatLevel = this.threatLevels.HIGH;
    } else if (threatScore >= 40) {
      threatLevel = this.threatLevels.MEDIUM;
    } else if (threatScore >= 20) {
      threatLevel = this.threatLevels.LOW;
    } else {
      threatLevel = this.threatLevels.MINIMAL;
    }

    // Update competitor profile
    const updateStmt = this.db.prepare(`
      UPDATE epu_competitor_profiles
      SET overall_threat_score = ?, threat_level = ?
      WHERE id = ?
    `);

    updateStmt.run(threatScore, threatLevel, competitorId);

    console.log(`🎯 Updated threat score for competitor ${competitorId}: ${threatScore}/100 (${threatLevel})`);
  }

  /**
   * Record bidding history
   */
  async recordBidHistory(competitorId, tender, won) {
    const insertStmt = this.db.prepare(`
      INSERT INTO epu_competitor_bids (
        competitor_id, competitor_name, tender_id, tender_no,
        agency, service_type, bid_amount, won_contract, award_amount,
        bid_date, award_date, contract_duration_months
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      competitorId,
      tender.awarded_supplier || 'Unknown',
      tender.id || null,
      tender.tender_no,
      tender.agency,
      tender.service_type || 'general',
      tender.estimated_value,
      won ? 1 : 0,
      tender.awarded_amount || tender.estimated_value,
      tender.published_date || new Date().toISOString().split('T')[0],
      tender.award_date,
      tender.contract_duration_months || 12
    );
  }

  /**
   * Create competitive alert
   */
  async createCompetitiveAlert(alertData) {
    const insertStmt = this.db.prepare(`
      INSERT INTO epu_competitive_alerts (
        alert_type, competitor_id, competitor_name, alert_priority,
        alert_title, alert_description, impact_assessment,
        recommended_actions, data_source, confidence_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      alertData.type,
      alertData.competitor_id,
      alertData.competitor_name,
      alertData.priority,
      alertData.title,
      alertData.description,
      alertData.impact_assessment,
      JSON.stringify(alertData.recommended_actions || []),
      'tender_analysis',
      0.8
    );

    console.log(`🚨 Created competitive alert: ${alertData.title}`);
  }

  /**
   * Generate competitive intelligence alerts
   */
  async generateCompetitiveAlerts(tender) {
    // Alert for new competitors
    if (tender.awarded_supplier && tender.award_date) {
      const competitorStmt = this.db.prepare(`
        SELECT * FROM epu_competitor_profiles
        WHERE company_name = ? AND first_contract_date IS NULL
      `);
      const newCompetitor = competitorStmt.get(tender.awarded_supplier);

      if (newCompetitor) {
        await this.createCompetitiveAlert({
          type: 'new_competitor',
          competitor_id: newCompetitor.id,
          competitor_name: newCompetitor.company_name,
          priority: 'medium',
          title: `New Competitor Detected: ${newCompetitor.company_name}`,
          description: `${newCompetitor.company_name} won their first EPU/SER/19 contract: ${tender.tender_no}`,
          impact_assessment: 'Monitor new market entrant for pricing and service strategies',
          recommended_actions: [
            'Research company background and capabilities',
            'Monitor future bidding activities',
            'Assess potential market impact'
          ],
          tender: tender
        });
      }
    }
  }

  /**
   * Get competitive intelligence report
   */
  getCompetitiveIntelligenceReport() {
    this.initDB();

    const report = {
      generated_at: new Date().toISOString(),
      market_overview: {},
      top_competitors: [],
      threat_analysis: {},
      competitive_alerts: [],
      market_positioning: {}
    };

    // Market overview
    const marketStmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_competitors,
        AVG(win_rate) as avg_win_rate,
        AVG(overall_threat_score) as avg_threat_score,
        SUM(total_epu_value) as total_market_value
      FROM epu_competitor_profiles
    `);
    report.market_overview = marketStmt.get();

    // Top competitors by threat score
    const topStmt = this.db.prepare(`
      SELECT * FROM epu_competitor_profiles
      ORDER BY overall_threat_score DESC
      LIMIT 10
    `);
    report.top_competitors = topStmt.all();

    // Threat level distribution
    const threatStmt = this.db.prepare(`
      SELECT threat_level, COUNT(*) as count
      FROM epu_competitor_profiles
      GROUP BY threat_level
      ORDER BY count DESC
    `);
    report.threat_analysis.distribution = threatStmt.all();

    // Recent competitive alerts
    const alertsStmt = this.db.prepare(`
      SELECT * FROM epu_competitive_alerts
      WHERE acknowledged = 0
      ORDER BY created_at DESC
      LIMIT 20
    `);
    report.competitive_alerts = alertsStmt.all();

    return report;
  }

  /**
   * Close database connection
   */
  closeDB() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

module.exports = EPUCompetitorAnalyzer;