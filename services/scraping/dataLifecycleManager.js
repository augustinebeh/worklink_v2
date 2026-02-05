/**
 * Data Lifecycle Manager
 * Handles insertion of new tenders into bpo_tender_lifecycle table
 * Features: Auto-priority detection, source tracking, lifecycle stage management
 */

const { db } = require('../../db/database');
const { v4: uuidv4 } = require('uuid');

class DataLifecycleManager {
  constructor() {
    this.sourceType = 'gebiz_rss';
    this.defaultStage = 'new_opportunity';
  }

  /**
   * Create lifecycle cards for new tenders
   * @param {Array} validatedTenders Array of validated tender data
   * @returns {Object} Creation results
   */
  async createLifecycleCards(validatedTenders) {
    if (!validatedTenders || !Array.isArray(validatedTenders)) {
      throw new Error('Invalid tenders data provided');
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: 0,
      createdIds: [],
      errorDetails: []
    };

    console.log(`📝 Creating lifecycle cards for ${validatedTenders.length} tenders...`);

    for (const tender of validatedTenders) {
      try {
        const lifecycleCard = await this.createSingleLifecycleCard(tender);

        if (lifecycleCard) {
          results.created++;
          results.createdIds.push(lifecycleCard.id);
          console.log(`✅ Created lifecycle card: ${lifecycleCard.tender_no} (${lifecycleCard.id})`);
        } else {
          results.skipped++;
          console.log(`⏭️  Skipped tender: ${tender.tender_no} (already exists or invalid)`);
        }

      } catch (error) {
        results.errors++;
        results.errorDetails.push({
          tender_no: tender.tender_no || 'Unknown',
          error: error.message
        });
        console.error(`❌ Failed to create lifecycle card for ${tender.tender_no}: ${error.message}`);
      }
    }

    console.log(`📊 Lifecycle creation complete: ${results.created} created, ${results.skipped} skipped, ${results.errors} errors`);

    return results;
  }

  /**
   * Create a single lifecycle card
   * @param {Object} tenderData Validated tender data
   * @returns {Object|null} Created lifecycle card or null if skipped
   */
  async createSingleLifecycleCard(tenderData) {
    try {
      // Check if lifecycle card already exists
      if (await this.lifecycleCardExists(tenderData.tender_no)) {
        return null; // Skip existing
      }

      const id = uuidv4();
      const now = new Date().toISOString();

      // Prepare lifecycle data
      const lifecycleData = {
        id,
        source_type: this.sourceType,
        source_id: null, // RSS items don't have persistent IDs
        tender_no: tenderData.tender_no,
        title: tenderData.title,
        agency: tenderData.agency,
        description: tenderData.description,
        category: tenderData.category,
        published_date: tenderData.published_date,
        closing_date: tenderData.closing_date,
        contract_start_date: null,
        contract_end_date: null,
        estimated_value: this.estimateValue(tenderData),
        our_bid_amount: null,
        actual_contract_value: null,
        estimated_cost: null,
        estimated_margin: null,
        stage: this.defaultStage,
        stage_updated_at: now,
        qualification_score: null,
        qualification_details: null,
        decision: 'pending',
        decision_made_at: null,
        decision_made_by: null,
        decision_reasoning: null,
        assigned_to: null,
        assigned_team: null,
        is_urgent: this.determineUrgency(tenderData),
        is_featured: false,
        priority: tenderData.priority || 'medium',
        outcome: 'pending',
        outcome_date: null,
        winner: null,
        loss_reason: null,
        is_renewal: false,
        renewal_id: null,
        incumbent_supplier: null,
        external_url: tenderData.source_url,
        documents: JSON.stringify([]),
        tags: JSON.stringify(this.generateTags(tenderData)),
        notes: `Auto-imported from GeBIZ RSS feed on ${new Date().toLocaleDateString()}`,
        created_at: now,
        updated_at: now
      };

      // Insert into database
      const insertQuery = `
        INSERT INTO bpo_tender_lifecycle (
          id, source_type, source_id, tender_no, title, agency, description, category,
          published_date, closing_date, contract_start_date, contract_end_date,
          estimated_value, our_bid_amount, actual_contract_value, estimated_cost, estimated_margin,
          stage, stage_updated_at, qualification_score, qualification_details,
          decision, decision_made_at, decision_made_by, decision_reasoning,
          assigned_to, assigned_team, is_urgent, is_featured, priority,
          outcome, outcome_date, winner, loss_reason,
          is_renewal, renewal_id, incumbent_supplier,
          external_url, documents, tags, notes, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )
      `;

      const stmt = db.prepare(insertQuery);
      const result = stmt.run(
        lifecycleData.id, lifecycleData.source_type, lifecycleData.source_id,
        lifecycleData.tender_no, lifecycleData.title, lifecycleData.agency,
        lifecycleData.description, lifecycleData.category,
        lifecycleData.published_date, lifecycleData.closing_date,
        lifecycleData.contract_start_date, lifecycleData.contract_end_date,
        lifecycleData.estimated_value, lifecycleData.our_bid_amount,
        lifecycleData.actual_contract_value, lifecycleData.estimated_cost,
        lifecycleData.estimated_margin, lifecycleData.stage, lifecycleData.stage_updated_at,
        lifecycleData.qualification_score, lifecycleData.qualification_details,
        lifecycleData.decision, lifecycleData.decision_made_at,
        lifecycleData.decision_made_by, lifecycleData.decision_reasoning,
        lifecycleData.assigned_to, lifecycleData.assigned_team,
        lifecycleData.is_urgent ? 1 : 0, lifecycleData.is_featured ? 1 : 0,
        lifecycleData.priority, lifecycleData.outcome, lifecycleData.outcome_date,
        lifecycleData.winner, lifecycleData.loss_reason, lifecycleData.is_renewal ? 1 : 0,
        lifecycleData.renewal_id, lifecycleData.incumbent_supplier,
        lifecycleData.external_url, lifecycleData.documents, lifecycleData.tags,
        lifecycleData.notes, lifecycleData.created_at, lifecycleData.updated_at
      );

      if (result.changes === 1) {
        return lifecycleData;
      } else {
        throw new Error('Failed to insert lifecycle card');
      }

    } catch (error) {
      console.error('Error creating lifecycle card:', error);
      throw error;
    }
  }

  /**
   * Check if lifecycle card already exists
   * @param {string} tenderNo Tender number
   * @returns {boolean} True if exists
   */
  async lifecycleCardExists(tenderNo) {
    try {
      const existing = db.prepare(`
        SELECT COUNT(*) as count
        FROM bpo_tender_lifecycle
        WHERE tender_no = ?
      `).get(tenderNo);

      return existing.count > 0;
    } catch (error) {
      console.error('Error checking lifecycle card existence:', error);
      return false;
    }
  }

  /**
   * Estimate tender value based on content analysis
   * @param {Object} tenderData Tender data
   * @returns {number|null} Estimated value in SGD
   */
  estimateValue(tenderData) {
    const { title, description, category } = tenderData;
    const text = `${title} ${description}`.toLowerCase();

    // Base values by category
    const categoryBaseValues = {
      'manpower_services': 200000,
      'cleaning_services': 120000,
      'security_services': 180000,
      'facility_management': 300000,
      'catering_services': 150000,
      'event_management': 80000,
      'transport_services': 100000,
      'general_services': 100000
    };

    let baseValue = categoryBaseValues[category] || 100000;

    // Multipliers based on keywords
    const multipliers = {
      'island-wide': 3.0,
      'nationwide': 3.0,
      'multiple locations': 2.5,
      'regional': 2.0,
      '24/7': 2.5,
      'round the clock': 2.5,
      '24 hours': 2.5,
      'urgent': 1.5,
      'immediate': 1.5,
      'large scale': 2.0,
      'bulk': 1.8,
      'senior': 1.3,
      'supervisor': 1.4,
      'manager': 1.6,
      'specialist': 1.5
    };

    // Duration indicators
    const durationMultipliers = {
      'year': 12,
      'years': 24,
      '12 month': 12,
      '24 month': 24,
      '36 month': 36,
      'long term': 18,
      'permanent': 36
    };

    let finalValue = baseValue;

    // Apply keyword multipliers
    Object.entries(multipliers).forEach(([keyword, multiplier]) => {
      if (text.includes(keyword)) {
        finalValue *= multiplier;
      }
    });

    // Apply duration multipliers
    let durationApplied = false;
    Object.entries(durationMultipliers).forEach(([keyword, months]) => {
      if (text.includes(keyword) && !durationApplied) {
        finalValue = (finalValue / 12) * months;
        durationApplied = true;
      }
    });

    // Agency-based adjustments
    const highValueAgencies = ['MOH', 'MOE', 'MINDEF', 'HDB', 'GovTech'];
    if (highValueAgencies.includes(tenderData.agency)) {
      finalValue *= 1.5;
    }

    // Cap the estimation
    const maxEstimate = 10000000; // 10M SGD
    const minEstimate = 20000;    // 20K SGD

    finalValue = Math.min(Math.max(finalValue, minEstimate), maxEstimate);

    return Math.round(finalValue);
  }

  /**
   * Determine urgency based on closing date and keywords
   * @param {Object} tenderData Tender data
   * @returns {boolean} True if urgent
   */
  determineUrgency(tenderData) {
    const { title, description, closing_date } = tenderData;
    const text = `${title} ${description}`.toLowerCase();

    // Urgent keywords
    const urgentKeywords = [
      'urgent', 'immediate', 'asap', 'rush', 'emergency',
      'critical', 'time-sensitive', 'expedite'
    ];

    // Check for urgent keywords
    const hasUrgentKeywords = urgentKeywords.some(keyword => text.includes(keyword));

    // Check closing date urgency
    let closingDateUrgent = false;
    if (closing_date) {
      const daysUntilClose = Math.ceil((new Date(closing_date) - new Date()) / (1000 * 60 * 60 * 24));
      closingDateUrgent = daysUntilClose <= 10;
    }

    return hasUrgentKeywords || closingDateUrgent;
  }

  /**
   * Generate relevant tags for the tender
   * @param {Object} tenderData Tender data
   * @returns {Array} Array of tags
   */
  generateTags(tenderData) {
    const { title, description, category, agency, priority } = tenderData;
    const text = `${title} ${description}`.toLowerCase();

    const tags = [];

    // Add category as base tag
    if (category) {
      tags.push(category.replace('_', ' '));
    }

    // Add agency tag
    if (agency && agency !== 'Unknown') {
      tags.push(agency);
    }

    // Add priority tag
    if (priority) {
      tags.push(`priority-${priority}`);
    }

    // Add source tag
    tags.push('rss-import');

    // Industry/service tags based on keywords
    const keywordTags = {
      'manpower': 'manpower',
      'cleaning': 'cleaning',
      'security': 'security',
      'catering': 'catering',
      'event': 'events',
      'transport': 'transport',
      'facility': 'facility-management',
      'maintenance': 'maintenance',
      'outsourcing': 'outsourcing',
      'bpo': 'bpo',
      'staffing': 'staffing',
      'hr': 'human-resources',
      'temporary': 'temporary-staff',
      'contract': 'contract-staff',
      'part-time': 'part-time',
      'full-time': 'full-time',
      'shift': 'shift-work',
      'weekend': 'weekend-work',
      'night': 'night-shift',
      '24/7': '24-7-service'
    };

    Object.entries(keywordTags).forEach(([keyword, tag]) => {
      if (text.includes(keyword)) {
        tags.push(tag);
      }
    });

    // Location tags (if detectable)
    const locations = [
      'cbd', 'jurong', 'tampines', 'woodlands', 'changi', 'marina bay',
      'orchard', 'bugis', 'raffles place', 'tanjong pagar', 'clarke quay'
    ];

    locations.forEach(location => {
      if (text.includes(location)) {
        tags.push(`location-${location.replace(' ', '-')}`);
      }
    });

    // Remove duplicates and limit tags
    const uniqueTags = [...new Set(tags)];
    return uniqueTags.slice(0, 10); // Limit to 10 tags
  }

  /**
   * Get lifecycle statistics
   * @returns {Object} Statistics
   */
  async getStats() {
    try {
      const stats = db.prepare(`
        SELECT
          COUNT(*) as total_cards,
          COUNT(CASE WHEN source_type = 'gebiz_rss' THEN 1 END) as rss_imports,
          COUNT(CASE WHEN stage = 'new_opportunity' THEN 1 END) as new_opportunities,
          COUNT(CASE WHEN is_urgent = 1 THEN 1 END) as urgent_tenders,
          COUNT(CASE WHEN priority = 'high' OR priority = 'critical' THEN 1 END) as high_priority,
          COUNT(CASE WHEN created_at >= datetime('now', '-1 day') THEN 1 END) as created_today,
          COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as created_this_week
        FROM bpo_tender_lifecycle
      `).get();

      return {
        ...stats,
        last_updated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting lifecycle stats:', error);
      return {
        total_cards: 0,
        rss_imports: 0,
        new_opportunities: 0,
        urgent_tenders: 0,
        high_priority: 0,
        created_today: 0,
        created_this_week: 0,
        last_updated: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Update lifecycle card stage
   * @param {string} tenderId Tender ID
   * @param {string} newStage New stage
   * @param {string} updatedBy User who updated
   * @returns {boolean} Success status
   */
  async updateLifecycleStage(tenderId, newStage, updatedBy = 'system') {
    try {
      const stmt = db.prepare(`
        UPDATE bpo_tender_lifecycle
        SET stage = ?,
            stage_updated_at = ?,
            updated_at = ?,
            notes = notes || CHAR(10) || ?
        WHERE id = ?
      `);

      const now = new Date().toISOString();
      const note = `Stage updated to '${newStage}' by ${updatedBy} on ${new Date().toLocaleDateString()}`;

      const result = stmt.run(newStage, now, now, note, tenderId);
      return result.changes === 1;

    } catch (error) {
      console.error('Error updating lifecycle stage:', error);
      return false;
    }
  }
}

module.exports = DataLifecycleManager;