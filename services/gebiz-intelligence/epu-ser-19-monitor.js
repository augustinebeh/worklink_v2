/**
 * EPU/SER/19 Specialized Intelligence Monitor
 * Focused monitoring and analysis for Service - Manpower Supply category tenders
 *
 * This module provides specialized intelligence for the "holy grail" category
 * of government procurement - EPU/SER/19 (Service - Manpower Supply)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

class EPUSer19Monitor {
  constructor() {
    this.db = null;
    this.category = 'EPU/SER/19';
    this.categoryDescription = 'Service - Manpower Supply';

    // EPU/SER/19 specific keywords for enhanced detection
    this.keywords = [
      'manpower supply',
      'temporary staff',
      'outsourcing services',
      'data entry',
      'administrative support',
      'clerical services',
      'event manpower',
      'contract staff',
      'human resource services',
      'temporary workers',
      'staffing solutions',
      'workforce outsourcing',
      'personnel supply',
      'EPU/SER/19',
      'manpower outsourcing',
      'temporary employment'
    ];

    // Government agencies likely to need manpower supply
    this.targetAgencies = [
      'Ministry of Education',
      'Ministry of Health',
      'Ministry of Manpower',
      'Ministry of National Development',
      'Ministry of Culture, Community and Youth',
      'Housing and Development Board',
      'National Environment Agency',
      'National Parks Board',
      'Inland Revenue Authority of Singapore',
      'Central Provident Fund Board',
      'Public Utilities Board',
      'Singapore Tourism Board',
      'Urban Redevelopment Authority',
      'Building and Construction Authority',
      'Singapore Land Authority',
      'Government Technology Agency',
      'Civil Service College',
      'Statutory boards',
      'People\'s Association'
    ];

    this.stats = {
      total_epu_ser_19_tenders: 0,
      active_tenders: 0,
      total_value: 0,
      avg_contract_duration: 0,
      top_winning_agencies: [],
      contract_renewal_patterns: {},
      pricing_trends: {},
      market_leaders: []
    };
  }

  /**
   * Initialize database connection with EPU/SER/19 specific tables
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

      this.ensureEPUTables();
    }
  }

  /**
   * Create EPU/SER/19 specific database tables
   */
  ensureEPUTables() {
    try {
      // Enhanced EPU/SER/19 tender tracking table
      const createEPUTableSQL = `
        CREATE TABLE IF NOT EXISTS epu_ser_19_tenders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tender_no TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          agency TEXT,
          estimated_value REAL,
          contract_duration_months INTEGER,
          manpower_count INTEGER,
          service_type TEXT, -- 'data_entry', 'administrative', 'event_support', 'general'
          locations TEXT, -- JSON array of service locations
          closing_date DATE,
          published_date DATE,
          award_date DATE,
          awarded_supplier TEXT,
          awarded_amount REAL,
          status TEXT DEFAULT 'active', -- 'active', 'closed', 'awarded'
          renewal_eligibility BOOLEAN DEFAULT 0,
          renewal_probability REAL, -- 0.0 to 1.0
          competitor_count INTEGER DEFAULT 0,
          win_probability REAL, -- Based on historical analysis
          recommended_bid_range TEXT, -- JSON with min/max pricing
          market_intelligence TEXT, -- JSON with competitive insights
          requirements_summary TEXT,
          tender_url TEXT,
          source_data TEXT, -- JSON blob with raw data
          intelligence_score INTEGER DEFAULT 0, -- 0-100 scoring
          alert_priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_epu_status ON epu_ser_19_tenders(status);
        CREATE INDEX IF NOT EXISTS idx_epu_agency ON epu_ser_19_tenders(agency);
        CREATE INDEX IF NOT EXISTS idx_epu_closing_date ON epu_ser_19_tenders(closing_date);
        CREATE INDEX IF NOT EXISTS idx_epu_value ON epu_ser_19_tenders(estimated_value);
        CREATE INDEX IF NOT EXISTS idx_epu_priority ON epu_ser_19_tenders(alert_priority);
        CREATE INDEX IF NOT EXISTS idx_epu_intelligence_score ON epu_ser_19_tenders(intelligence_score);
      `;

      // EPU/SER/19 market intelligence table
      const createIntelTableSQL = `
        CREATE TABLE IF NOT EXISTS epu_market_intelligence (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tender_id INTEGER,
          intelligence_type TEXT NOT NULL, -- 'pricing', 'competitor', 'renewal', 'requirement'
          data_point TEXT, -- Specific insight or data point
          confidence_level REAL, -- 0.0 to 1.0
          source TEXT, -- 'historical_data', 'pattern_analysis', 'manual_research'
          impact_level TEXT, -- 'low', 'medium', 'high'
          actionable_insight TEXT, -- Specific recommendation
          validity_period DATE, -- When this intelligence expires
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(tender_id) REFERENCES epu_ser_19_tenders(id)
        );

        CREATE INDEX IF NOT EXISTS idx_intel_type ON epu_market_intelligence(intelligence_type);
        CREATE INDEX IF NOT EXISTS idx_intel_confidence ON epu_market_intelligence(confidence_level);
        CREATE INDEX IF NOT EXISTS idx_intel_impact ON epu_market_intelligence(impact_level);
      `;

      // EPU/SER/19 competitor tracking table
      const createCompetitorTableSQL = `
        CREATE TABLE IF NOT EXISTS epu_competitors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          competitor_name TEXT NOT NULL,
          registration_status TEXT, -- 'active', 'expired', 'pending'
          specializations TEXT, -- JSON array of service types they excel at
          total_epu_wins INTEGER DEFAULT 0,
          total_epu_value REAL DEFAULT 0,
          avg_contract_value REAL,
          win_rate REAL, -- Percentage
          typical_pricing_range TEXT, -- JSON with pricing patterns
          agency_preferences TEXT, -- JSON with agencies they frequently win with
          service_quality_indicators TEXT, -- JSON with performance metrics
          last_win_date DATE,
          market_share_percentage REAL,
          threat_level TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
          competitive_advantages TEXT, -- JSON array of strengths
          weaknesses TEXT, -- JSON array of areas where they can be beaten
          last_analyzed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_comp_name ON epu_competitors(competitor_name);
        CREATE INDEX IF NOT EXISTS idx_comp_win_rate ON epu_competitors(win_rate);
        CREATE INDEX IF NOT EXISTS idx_comp_threat ON epu_competitors(threat_level);
      `;

      // EPU/SER/19 pricing intelligence table
      const createPricingTableSQL = `
        CREATE TABLE IF NOT EXISTS epu_pricing_intelligence (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          service_type TEXT NOT NULL,
          agency TEXT,
          location TEXT,
          manpower_count INTEGER,
          contract_duration_months INTEGER,
          hourly_rate_min REAL,
          hourly_rate_max REAL,
          hourly_rate_avg REAL,
          monthly_cost_per_person REAL,
          total_contract_value REAL,
          award_date DATE,
          supplier_name TEXT,
          performance_bond_required BOOLEAN DEFAULT 0,
          performance_bond_percentage REAL,
          payment_terms TEXT,
          contract_variations TEXT, -- JSON with any special terms
          price_per_sqm REAL, -- For location-based services
          overtime_rates TEXT, -- JSON with overtime pricing
          holiday_rates TEXT, -- JSON with holiday pricing
          data_quality TEXT DEFAULT 'high', -- 'low', 'medium', 'high'
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_pricing_service_type ON epu_pricing_intelligence(service_type);
        CREATE INDEX IF NOT EXISTS idx_pricing_agency ON epu_pricing_intelligence(agency);
        CREATE INDEX IF NOT EXISTS idx_pricing_award_date ON epu_pricing_intelligence(award_date);
      `;

      this.db.exec(createEPUTableSQL);
      this.db.exec(createIntelTableSQL);
      this.db.exec(createCompetitorTableSQL);
      this.db.exec(createPricingTableSQL);

      console.log('✅ EPU/SER/19 specialized tables created');
    } catch (error) {
      console.error('❌ Failed to create EPU/SER/19 tables:', error.message);
      throw error;
    }
  }

  /**
   * Detect if a tender belongs to EPU/SER/19 category
   */
  isEPUSerTender(tender) {
    const text = (
      (tender.title || '') + ' ' +
      (tender.description || '') + ' ' +
      (tender.category || '')
    ).toLowerCase();

    // Direct category match
    if (text.includes('epu/ser/19') || text.includes('epu-ser-19')) {
      return { match: true, confidence: 1.0, reason: 'direct_category_match' };
    }

    // Keyword-based detection
    let keywordMatches = 0;
    let matchedKeywords = [];

    for (const keyword of this.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        keywordMatches++;
        matchedKeywords.push(keyword);
      }
    }

    if (keywordMatches >= 2) {
      return {
        match: true,
        confidence: Math.min(1.0, keywordMatches / 5),
        reason: 'keyword_match',
        keywords: matchedKeywords
      };
    }

    // Service type patterns
    const servicePatterns = [
      /manpower.{0,20}supply/i,
      /temporary.{0,20}staff/i,
      /data.{0,10}entry/i,
      /administrative.{0,20}support/i,
      /outsourc.{0,20}service/i,
      /contract.{0,20}staff/i
    ];

    for (const pattern of servicePatterns) {
      if (pattern.test(text)) {
        return {
          match: true,
          confidence: 0.8,
          reason: 'service_pattern_match',
          pattern: pattern.toString()
        };
      }
    }

    return { match: false, confidence: 0.0 };
  }

  /**
   * Analyze EPU/SER/19 tender for intelligence value
   */
  analyzeEPUTender(tender) {
    const analysis = {
      intelligence_score: 0,
      service_type: 'general',
      estimated_manpower: null,
      estimated_duration: 12,
      win_probability: 0.5,
      competitive_factors: [],
      pricing_insights: {},
      renewal_probability: 0.3,
      alert_priority: 'medium'
    };

    const text = ((tender.title || '') + ' ' + (tender.description || '')).toLowerCase();

    // Service type classification
    if (text.includes('data entry') || text.includes('data processing')) {
      analysis.service_type = 'data_entry';
      analysis.intelligence_score += 20;
    } else if (text.includes('administrative') || text.includes('clerical')) {
      analysis.service_type = 'administrative';
      analysis.intelligence_score += 15;
    } else if (text.includes('event') || text.includes('function')) {
      analysis.service_type = 'event_support';
      analysis.intelligence_score += 25; // High value events
    } else if (text.includes('security') || text.includes('guard')) {
      analysis.service_type = 'security_support';
      analysis.intelligence_score += 18;
    }

    // Manpower estimation
    const manpowerNumbers = text.match(/(\d+)\s*(person|personnel|staff|worker|employee)/gi);
    if (manpowerNumbers) {
      const numbers = manpowerNumbers.map(match => parseInt(match.match(/\d+/)[0]));
      analysis.estimated_manpower = Math.max(...numbers);
      analysis.intelligence_score += 10;
    }

    // Duration estimation
    const durationMatches = text.match(/(\d+)\s*(month|year)/gi);
    if (durationMatches) {
      const durations = durationMatches.map(match => {
        const num = parseInt(match.match(/\d+/)[0]);
        const unit = match.toLowerCase().includes('year') ? num * 12 : num;
        return unit;
      });
      analysis.estimated_duration = Math.max(...durations);
      analysis.intelligence_score += 5;
    }

    // Value indicators
    const valueIndicators = [
      'urgent', 'immediate', 'critical', 'essential',
      'weekend', 'overtime', 'shift', '24/7',
      'senior', 'experienced', 'qualified', 'certified'
    ];

    for (const indicator of valueIndicators) {
      if (text.includes(indicator)) {
        analysis.intelligence_score += 8;
        analysis.competitive_factors.push(indicator);
      }
    }

    // Renewal indicators
    const renewalKeywords = ['renewal', 'extension', 'option', 'continue'];
    for (const keyword of renewalKeywords) {
      if (text.includes(keyword)) {
        analysis.renewal_probability = Math.min(1.0, analysis.renewal_probability + 0.2);
        analysis.intelligence_score += 12;
      }
    }

    // Large contract indicators
    if (analysis.estimated_manpower > 20) {
      analysis.intelligence_score += 15;
      analysis.alert_priority = 'high';
    }

    if (analysis.estimated_duration > 24) {
      analysis.intelligence_score += 10;
    }

    // Agency value assessment
    const highValueAgencies = [
      'ministry of health', 'ministry of education', 'hdb',
      'nea', 'nparks', 'iras', 'cpf', 'pub'
    ];

    const agencyText = (tender.agency || '').toLowerCase();
    for (const agency of highValueAgencies) {
      if (agencyText.includes(agency)) {
        analysis.intelligence_score += 20;
        analysis.alert_priority = 'high';
        break;
      }
    }

    // Set final priority
    if (analysis.intelligence_score >= 80) {
      analysis.alert_priority = 'urgent';
    } else if (analysis.intelligence_score >= 60) {
      analysis.alert_priority = 'high';
    } else if (analysis.intelligence_score >= 40) {
      analysis.alert_priority = 'medium';
    } else {
      analysis.alert_priority = 'low';
    }

    // Win probability assessment based on complexity
    if (analysis.service_type === 'data_entry') {
      analysis.win_probability = 0.7; // High win probability for data entry
    } else if (analysis.service_type === 'event_support') {
      analysis.win_probability = 0.6; // Good for events
    } else if (analysis.competitive_factors.length > 3) {
      analysis.win_probability = 0.3; // Complex requirements = lower probability
    }

    return analysis;
  }

  /**
   * Store EPU/SER/19 tender with intelligence
   */
  storeEPUTender(tender, analysis) {
    this.initDB();

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO epu_ser_19_tenders (
          tender_no, title, agency, estimated_value, contract_duration_months,
          manpower_count, service_type, closing_date, published_date,
          status, renewal_probability, win_probability,
          requirements_summary, tender_url, source_data,
          intelligence_score, alert_priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        tender.tender_no || `EPU-${Date.now()}`,
        tender.title,
        tender.agency,
        tender.estimated_value || analysis.estimated_value || null,
        analysis.estimated_duration,
        analysis.estimated_manpower,
        analysis.service_type,
        tender.closing_date,
        tender.published_date || new Date().toISOString().split('T')[0],
        'active',
        analysis.renewal_probability,
        analysis.win_probability,
        tender.description?.substring(0, 1000) || '',
        tender.url || '',
        JSON.stringify(tender),
        analysis.intelligence_score,
        analysis.alert_priority
      );

      // Store market intelligence
      if (analysis.competitive_factors.length > 0) {
        const intelStmt = this.db.prepare(`
          INSERT INTO epu_market_intelligence (
            tender_id, intelligence_type, data_point, confidence_level,
            source, impact_level, actionable_insight
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const factor of analysis.competitive_factors) {
          intelStmt.run(
            result.lastInsertRowid,
            'competitive_factor',
            factor,
            0.8,
            'pattern_analysis',
            'medium',
            `Consider ${factor} requirements in proposal`
          );
        }
      }

      console.log(`✅ Stored EPU/SER/19 tender: ${tender.title} (Score: ${analysis.intelligence_score})`);
      return result.lastInsertRowid;
    } catch (error) {
      console.error('❌ Failed to store EPU tender:', error.message);
      throw error;
    }
  }

  /**
   * Get active EPU/SER/19 tenders with intelligence
   */
  getActiveEPUTenders(options = {}) {
    this.initDB();

    const {
      limit = 50,
      offset = 0,
      minIntelligenceScore = 0,
      alertPriority = null,
      serviceType = null,
      agency = null
    } = options;

    let whereClause = 'WHERE status = "active"';
    const params = [];

    if (minIntelligenceScore > 0) {
      whereClause += ' AND intelligence_score >= ?';
      params.push(minIntelligenceScore);
    }

    if (alertPriority) {
      whereClause += ' AND alert_priority = ?';
      params.push(alertPriority);
    }

    if (serviceType) {
      whereClause += ' AND service_type = ?';
      params.push(serviceType);
    }

    if (agency) {
      whereClause += ' AND agency LIKE ?';
      params.push(`%${agency}%`);
    }

    const stmt = this.db.prepare(`
      SELECT * FROM epu_ser_19_tenders
      ${whereClause}
      ORDER BY intelligence_score DESC, closing_date ASC
      LIMIT ? OFFSET ?
    `);

    params.push(limit, offset);
    const tenders = stmt.all(...params);

    // Enrich with market intelligence
    for (const tender of tenders) {
      const intelStmt = this.db.prepare(`
        SELECT * FROM epu_market_intelligence
        WHERE tender_id = ?
        ORDER BY confidence_level DESC
      `);
      tender.market_intelligence = intelStmt.all(tender.id);
    }

    return tenders;
  }

  /**
   * Generate EPU/SER/19 market report
   */
  generateMarketReport() {
    this.initDB();

    const report = {
      generated_at: new Date().toISOString(),
      category: this.category,
      active_opportunities: 0,
      total_estimated_value: 0,
      service_type_breakdown: {},
      agency_breakdown: {},
      intelligence_insights: [],
      high_priority_alerts: [],
      competitive_landscape: {},
      pricing_intelligence: {}
    };

    // Active opportunities
    const activeStmt = this.db.prepare(`
      SELECT COUNT(*) as count, SUM(estimated_value) as total_value
      FROM epu_ser_19_tenders
      WHERE status = 'active'
    `);
    const activeData = activeStmt.get();
    report.active_opportunities = activeData.count || 0;
    report.total_estimated_value = activeData.total_value || 0;

    // Service type breakdown
    const serviceTypeStmt = this.db.prepare(`
      SELECT service_type, COUNT(*) as count, SUM(estimated_value) as value
      FROM epu_ser_19_tenders
      WHERE status = 'active'
      GROUP BY service_type
      ORDER BY count DESC
    `);
    const serviceTypes = serviceTypeStmt.all();
    for (const type of serviceTypes) {
      report.service_type_breakdown[type.service_type] = {
        count: type.count,
        estimated_value: type.value || 0
      };
    }

    // Agency breakdown
    const agencyStmt = this.db.prepare(`
      SELECT agency, COUNT(*) as count, SUM(estimated_value) as value
      FROM epu_ser_19_tenders
      WHERE status = 'active' AND agency IS NOT NULL
      GROUP BY agency
      ORDER BY count DESC
      LIMIT 10
    `);
    const agencies = agencyStmt.all();
    for (const agency of agencies) {
      report.agency_breakdown[agency.agency] = {
        count: agency.count,
        estimated_value: agency.value || 0
      };
    }

    // High priority alerts
    const alertStmt = this.db.prepare(`
      SELECT * FROM epu_ser_19_tenders
      WHERE status = 'active' AND alert_priority IN ('high', 'urgent')
      ORDER BY intelligence_score DESC
      LIMIT 10
    `);
    report.high_priority_alerts = alertStmt.all();

    // Intelligence insights
    const insightStmt = this.db.prepare(`
      SELECT intelligence_type, COUNT(*) as frequency,
             AVG(confidence_level) as avg_confidence
      FROM epu_market_intelligence mi
      JOIN epu_ser_19_tenders t ON mi.tender_id = t.id
      WHERE t.status = 'active'
      GROUP BY intelligence_type
      ORDER BY frequency DESC
    `);
    report.intelligence_insights = insightStmt.all();

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

module.exports = EPUSer19Monitor;