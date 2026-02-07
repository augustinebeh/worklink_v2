/**
 * EPU/SER/19 Tender Lifecycle Tracker
 * Comprehensive tracking of tender lifecycle stages and key dates
 *
 * Features:
 * - Complete lifecycle mapping from publication to contract renewal
 * - Critical date tracking and alerts
 * - Renewal opportunity identification
 * - Performance milestone tracking
 * - Contract variation monitoring
 * - Market intelligence throughout lifecycle
 */

const EPUSer19Monitor = require('./epu-ser-19-monitor');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class EPULifecycleTracker {
  constructor() {
    this.monitor = new EPUSer19Monitor();
    this.db = null;

    // Tender lifecycle stages
    this.lifecycleStages = {
      PLANNING: 'planning',           // Internal planning phase (estimated)
      PUBLISHED: 'published',         // Tender published on GeBIZ
      CLARIFICATION: 'clarification', // Clarification period
      SUBMISSION: 'submission',       // Submission deadline approaching
      CLOSED: 'closed',              // Submission closed
      EVALUATION: 'evaluation',      // Under evaluation
      AWARDED: 'awarded',            // Contract awarded
      MOBILIZATION: 'mobilization',  // Contract mobilization period
      ACTIVE: 'active',              // Contract active/execution
      REVIEW: 'review',              // Performance review periods
      RENEWAL_NOTICE: 'renewal_notice', // Renewal notification period
      RENEWAL: 'renewal',            // Renewal tender process
      EXTENSION: 'extension',        // Contract extension
      COMPLETION: 'completion'       // Contract completed
    };

    // Critical dates for each stage
    this.criticalDates = {
      PUBLISHED: ['publication_date', 'clarification_deadline'],
      CLARIFICATION: ['clarification_deadline', 'submission_deadline'],
      SUBMISSION: ['submission_deadline'],
      EVALUATION: ['evaluation_completion_target'],
      AWARDED: ['award_date', 'mobilization_deadline'],
      MOBILIZATION: ['service_commencement_date'],
      ACTIVE: ['performance_review_dates', 'milestone_dates'],
      RENEWAL_NOTICE: ['renewal_notification_date', 'renewal_tender_launch'],
      RENEWAL: ['renewal_submission_deadline'],
      COMPLETION: ['contract_end_date', 'handover_date']
    };

    // Typical timelines for EPU/SER/19 contracts (in days)
    this.typicalTimelines = {
      publication_to_clarification: 7,
      clarification_to_submission: 14,
      submission_to_evaluation: 30,
      evaluation_to_award: 14,
      award_to_mobilization: 30,
      mobilization_to_active: 7,
      active_to_review: 90,
      contract_to_renewal_notice: -180, // 6 months before end
      renewal_notice_to_renewal_tender: 90
    };
  }

  /**
   * Initialize database with lifecycle tracking tables
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

      this.ensureLifecycleTables();
    }
  }

  /**
   * Create lifecycle tracking tables
   */
  ensureLifecycleTables() {
    try {
      // Tender lifecycle tracking table
      const createLifecycleTableSQL = `
        CREATE TABLE IF NOT EXISTS epu_tender_lifecycle (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tender_id INTEGER,
          tender_no TEXT,
          current_stage TEXT NOT NULL,
          stage_entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expected_next_stage TEXT,
          expected_next_stage_date DATE,
          lifecycle_data TEXT, -- JSON with all stage dates and milestones
          estimated_timeline TEXT, -- JSON with projected dates
          actual_timeline TEXT, -- JSON with actual dates
          delays_identified TEXT, -- JSON with any delays and reasons
          opportunities_identified TEXT, -- JSON with lifecycle opportunities
          risk_factors TEXT, -- JSON with identified risks
          last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(tender_id) REFERENCES epu_ser_19_tenders(id)
        );

        CREATE INDEX IF NOT EXISTS idx_lifecycle_tender_id ON epu_tender_lifecycle(tender_id);
        CREATE INDEX IF NOT EXISTS idx_lifecycle_stage ON epu_tender_lifecycle(current_stage);
        CREATE INDEX IF NOT EXISTS idx_lifecycle_next_stage_date ON epu_tender_lifecycle(expected_next_stage_date);
      `;

      // Critical dates tracking table
      const createDatesTableSQL = `
        CREATE TABLE IF NOT EXISTS epu_critical_dates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lifecycle_id INTEGER,
          tender_id INTEGER,
          date_type TEXT NOT NULL, -- 'publication', 'clarification_deadline', 'submission_deadline', etc.
          scheduled_date DATE,
          actual_date DATE,
          estimated_date DATE,
          alert_sent BOOLEAN DEFAULT 0,
          alert_priority TEXT, -- 'low', 'medium', 'high', 'urgent'
          days_notice INTEGER, -- Days before to send alert
          description TEXT,
          impact_assessment TEXT, -- Impact if date is missed
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(lifecycle_id) REFERENCES epu_tender_lifecycle(id),
          FOREIGN KEY(tender_id) REFERENCES epu_ser_19_tenders(id)
        );

        CREATE INDEX IF NOT EXISTS idx_critical_dates_tender ON epu_critical_dates(tender_id);
        CREATE INDEX IF NOT EXISTS idx_critical_dates_type ON epu_critical_dates(date_type);
        CREATE INDEX IF NOT EXISTS idx_critical_dates_scheduled ON epu_critical_dates(scheduled_date);
      `;

      // Renewal opportunities tracking table
      const createRenewalTableSQL = `
        CREATE TABLE IF NOT EXISTS epu_renewal_opportunities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          original_tender_id INTEGER,
          original_tender_no TEXT,
          agency TEXT,
          service_type TEXT,
          contract_start_date DATE,
          contract_end_date DATE,
          contract_value REAL,
          incumbent_supplier TEXT,
          renewal_probability REAL, -- 0.0 to 1.0
          renewal_notification_date DATE,
          renewal_tender_expected_date DATE,
          renewal_strategy TEXT, -- JSON with recommended approach
          competitive_assessment TEXT, -- JSON with market analysis
          pricing_intelligence TEXT, -- JSON with pricing recommendations
          renewal_status TEXT DEFAULT 'monitoring', -- 'monitoring', 'notified', 'tender_live', 'decided'
          intelligence_score INTEGER DEFAULT 0,
          last_analyzed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(original_tender_id) REFERENCES epu_ser_19_tenders(id)
        );

        CREATE INDEX IF NOT EXISTS idx_renewal_end_date ON epu_renewal_opportunities(contract_end_date);
        CREATE INDEX IF NOT EXISTS idx_renewal_notification_date ON epu_renewal_opportunities(renewal_notification_date);
        CREATE INDEX IF NOT EXISTS idx_renewal_status ON epu_renewal_opportunities(renewal_status);
      `;

      // Performance milestones tracking
      const createMilestonesTableSQL = `
        CREATE TABLE IF NOT EXISTS epu_performance_milestones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lifecycle_id INTEGER,
          tender_id INTEGER,
          milestone_type TEXT NOT NULL, -- 'performance_review', 'kpi_assessment', 'service_expansion', 'variation'
          milestone_date DATE,
          milestone_description TEXT,
          completion_status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'overdue', 'cancelled'
          performance_data TEXT, -- JSON with performance metrics
          impact_on_renewal REAL, -- Impact score on renewal probability
          lessons_learned TEXT, -- Key insights for future bids
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(lifecycle_id) REFERENCES epu_tender_lifecycle(id),
          FOREIGN KEY(tender_id) REFERENCES epu_ser_19_tenders(id)
        );

        CREATE INDEX IF NOT EXISTS idx_milestones_tender ON epu_performance_milestones(tender_id);
        CREATE INDEX IF NOT EXISTS idx_milestones_date ON epu_performance_milestones(milestone_date);
        CREATE INDEX IF NOT EXISTS idx_milestones_status ON epu_performance_milestones(completion_status);
      `;

      this.db.exec(createLifecycleTableSQL);
      this.db.exec(createDatesTableSQL);
      this.db.exec(createRenewalTableSQL);
      this.db.exec(createMilestonesTableSQL);

      console.log('✅ EPU lifecycle tracking tables created');
    } catch (error) {
      console.error('❌ Failed to create lifecycle tables:', error.message);
      throw error;
    }
  }

  /**
   * Track tender lifecycle from initial detection
   */
  async initializeTenderLifecycle(tender) {
    this.initDB();

    try {
      // Determine current stage based on tender data
      const currentStage = this.determineTenderStage(tender);

      // Create lifecycle entry
      const lifecycleStmt = this.db.prepare(`
        INSERT INTO epu_tender_lifecycle (
          tender_id, tender_no, current_stage, expected_next_stage,
          expected_next_stage_date, lifecycle_data, estimated_timeline
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      // Generate estimated timeline
      const estimatedTimeline = this.generateEstimatedTimeline(tender, currentStage);

      // Determine next stage
      const nextStage = this.getNextStage(currentStage);
      const nextStageDate = this.calculateNextStageDate(tender, currentStage, nextStage);

      const lifecycleResult = lifecycleStmt.run(
        tender.id,
        tender.tender_no,
        currentStage,
        nextStage,
        nextStageDate,
        JSON.stringify({
          current_stage: currentStage,
          detected_at: new Date().toISOString(),
          tender_data: tender
        }),
        JSON.stringify(estimatedTimeline)
      );

      const lifecycleId = lifecycleResult.lastInsertRowid;

      // Create critical dates
      await this.createCriticalDates(lifecycleId, tender, currentStage, estimatedTimeline);

      // Check for renewal opportunities if this is an active contract
      if (currentStage === this.lifecycleStages.ACTIVE) {
        await this.createRenewalOpportunity(tender);
      }

      console.log(`📋 Lifecycle tracking initialized for tender ${tender.tender_no}`);
      return lifecycleId;

    } catch (error) {
      console.error('Failed to initialize tender lifecycle:', error.message);
      throw error;
    }
  }

  /**
   * Determine current tender stage based on available data
   */
  determineTenderStage(tender) {
    // If award date exists, determine post-award stage
    if (tender.award_date) {
      const awardDate = new Date(tender.award_date);
      const today = new Date();
      const daysFromAward = Math.ceil((today - awardDate) / (1000 * 60 * 60 * 24));

      if (daysFromAward < 30) {
        return this.lifecycleStages.MOBILIZATION;
      } else {
        return this.lifecycleStages.ACTIVE;
      }
    }

    // If closing date has passed, tender is in evaluation
    if (tender.closing_date) {
      const closingDate = new Date(tender.closing_date);
      const today = new Date();

      if (today > closingDate) {
        return this.lifecycleStages.EVALUATION;
      } else {
        const daysToClose = Math.ceil((closingDate - today) / (1000 * 60 * 60 * 24));

        if (daysToClose <= 7) {
          return this.lifecycleStages.SUBMISSION;
        } else if (daysToClose <= 14) {
          return this.lifecycleStages.CLARIFICATION;
        } else {
          return this.lifecycleStages.PUBLISHED;
        }
      }
    }

    // Default to published if tender is detected
    return this.lifecycleStages.PUBLISHED;
  }

  /**
   * Generate estimated timeline for tender
   */
  generateEstimatedTimeline(tender, currentStage) {
    const timeline = {};
    const baseDate = tender.published_date ? new Date(tender.published_date) : new Date();

    // Calculate all estimated dates based on typical timelines
    timeline.publication_date = tender.published_date || baseDate.toISOString().split('T')[0];

    // Clarification deadline
    const clarificationDate = new Date(baseDate);
    clarificationDate.setDate(clarificationDate.getDate() + this.typicalTimelines.publication_to_clarification);
    timeline.clarification_deadline = clarificationDate.toISOString().split('T')[0];

    // Submission deadline
    const submissionDate = new Date(clarificationDate);
    submissionDate.setDate(submissionDate.getDate() + this.typicalTimelines.clarification_to_submission);
    timeline.submission_deadline = tender.closing_date || submissionDate.toISOString().split('T')[0];

    // Evaluation completion
    const evaluationDate = new Date(submissionDate);
    evaluationDate.setDate(evaluationDate.getDate() + this.typicalTimelines.submission_to_evaluation);
    timeline.evaluation_completion = evaluationDate.toISOString().split('T')[0];

    // Award date
    const awardDate = new Date(evaluationDate);
    awardDate.setDate(awardDate.getDate() + this.typicalTimelines.evaluation_to_award);
    timeline.award_date = tender.award_date || awardDate.toISOString().split('T')[0];

    // Mobilization period
    const mobilizationDate = new Date(awardDate);
    mobilizationDate.setDate(mobilizationDate.getDate() + this.typicalTimelines.award_to_mobilization);
    timeline.service_commencement = mobilizationDate.toISOString().split('T')[0];

    // Contract duration and end date
    const contractDuration = tender.contract_duration_months || 12;
    const contractEndDate = new Date(mobilizationDate);
    contractEndDate.setMonth(contractEndDate.getMonth() + contractDuration);
    timeline.contract_end_date = contractEndDate.toISOString().split('T')[0];

    // Renewal notification (6 months before end)
    const renewalNotificationDate = new Date(contractEndDate);
    renewalNotificationDate.setMonth(renewalNotificationDate.getMonth() - 6);
    timeline.renewal_notification_date = renewalNotificationDate.toISOString().split('T')[0];

    return timeline;
  }

  /**
   * Get next lifecycle stage
   */
  getNextStage(currentStage) {
    const stageOrder = [
      this.lifecycleStages.PLANNING,
      this.lifecycleStages.PUBLISHED,
      this.lifecycleStages.CLARIFICATION,
      this.lifecycleStages.SUBMISSION,
      this.lifecycleStages.CLOSED,
      this.lifecycleStages.EVALUATION,
      this.lifecycleStages.AWARDED,
      this.lifecycleStages.MOBILIZATION,
      this.lifecycleStages.ACTIVE,
      this.lifecycleStages.RENEWAL_NOTICE,
      this.lifecycleStages.COMPLETION
    ];

    const currentIndex = stageOrder.indexOf(currentStage);
    return currentIndex < stageOrder.length - 1 ? stageOrder[currentIndex + 1] : null;
  }

  /**
   * Calculate expected date for next stage
   */
  calculateNextStageDate(tender, currentStage, nextStage) {
    if (!nextStage) return null;

    const today = new Date();

    switch (nextStage) {
      case this.lifecycleStages.CLARIFICATION:
        if (tender.published_date) {
          const pubDate = new Date(tender.published_date);
          pubDate.setDate(pubDate.getDate() + this.typicalTimelines.publication_to_clarification);
          return pubDate.toISOString().split('T')[0];
        }
        break;

      case this.lifecycleStages.SUBMISSION:
        if (tender.closing_date) {
          return tender.closing_date;
        }
        break;

      case this.lifecycleStages.EVALUATION:
        if (tender.closing_date) {
          return tender.closing_date;
        }
        break;

      case this.lifecycleStages.AWARDED:
        if (tender.closing_date) {
          const closingDate = new Date(tender.closing_date);
          closingDate.setDate(closingDate.getDate() + this.typicalTimelines.submission_to_evaluation);
          return closingDate.toISOString().split('T')[0];
        }
        break;

      case this.lifecycleStages.ACTIVE:
        if (tender.award_date) {
          const awardDate = new Date(tender.award_date);
          awardDate.setDate(awardDate.getDate() + this.typicalTimelines.award_to_mobilization);
          return awardDate.toISOString().split('T')[0];
        }
        break;
    }

    // Default to 30 days from now
    const defaultDate = new Date(today);
    defaultDate.setDate(defaultDate.getDate() + 30);
    return defaultDate.toISOString().split('T')[0];
  }

  /**
   * Create critical dates for tracking
   */
  async createCriticalDates(lifecycleId, tender, currentStage, estimatedTimeline) {
    const criticalDatesStmt = this.db.prepare(`
      INSERT INTO epu_critical_dates (
        lifecycle_id, tender_id, date_type, scheduled_date, estimated_date,
        alert_priority, days_notice, description, impact_assessment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Create critical dates based on current stage and timeline
    const datesToCreate = [
      {
        type: 'clarification_deadline',
        scheduled: estimatedTimeline.clarification_deadline,
        priority: 'medium',
        notice: 2,
        description: 'Deadline for clarification questions',
        impact: 'Missing this deadline may result in unclear requirements'
      },
      {
        type: 'submission_deadline',
        scheduled: estimatedTimeline.submission_deadline,
        priority: 'urgent',
        notice: 7,
        description: 'Tender submission deadline',
        impact: 'Missing this deadline disqualifies the bid'
      },
      {
        type: 'evaluation_completion',
        scheduled: estimatedTimeline.evaluation_completion,
        priority: 'high',
        notice: 5,
        description: 'Expected evaluation completion',
        impact: 'Delays may indicate evaluation issues'
      },
      {
        type: 'award_notification',
        scheduled: estimatedTimeline.award_date,
        priority: 'high',
        notice: 3,
        description: 'Expected award notification',
        impact: 'No notification may indicate re-tendering'
      },
      {
        type: 'service_commencement',
        scheduled: estimatedTimeline.service_commencement,
        priority: 'high',
        notice: 14,
        description: 'Service commencement date',
        impact: 'Delays affect contract performance and penalties'
      },
      {
        type: 'contract_end',
        scheduled: estimatedTimeline.contract_end_date,
        priority: 'medium',
        notice: 90,
        description: 'Contract end date',
        impact: 'Plan for renewal or transition'
      },
      {
        type: 'renewal_notification',
        scheduled: estimatedTimeline.renewal_notification_date,
        priority: 'high',
        notice: 30,
        description: 'Expected renewal notification',
        impact: 'Prepare renewal strategy and pricing'
      }
    ];

    for (const dateInfo of datesToCreate) {
      try {
        criticalDatesStmt.run(
          lifecycleId,
          tender.id,
          dateInfo.type,
          dateInfo.scheduled,
          dateInfo.scheduled, // Use same as estimated initially
          dateInfo.priority,
          dateInfo.notice,
          dateInfo.description,
          dateInfo.impact
        );
      } catch (error) {
        console.log(`Warning: Could not create critical date ${dateInfo.type}:`, error.message);
      }
    }
  }

  /**
   * Create renewal opportunity for active contracts
   */
  async createRenewalOpportunity(tender) {
    try {
      const renewalStmt = this.db.prepare(`
        INSERT OR IGNORE INTO epu_renewal_opportunities (
          original_tender_id, original_tender_no, agency, service_type,
          contract_start_date, contract_end_date, contract_value,
          incumbent_supplier, renewal_probability, renewal_notification_date,
          renewal_tender_expected_date, intelligence_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Calculate contract dates
      const contractStartDate = tender.award_date || new Date().toISOString().split('T')[0];
      const contractEnd = new Date(contractStartDate);
      contractEnd.setMonth(contractEnd.getMonth() + (tender.contract_duration_months || 12));

      const renewalNotificationDate = new Date(contractEnd);
      renewalNotificationDate.setMonth(renewalNotificationDate.getMonth() - 6);

      const renewalTenderDate = new Date(renewalNotificationDate);
      renewalTenderDate.setDate(renewalTenderDate.getDate() + 90);

      renewalStmt.run(
        tender.id,
        tender.tender_no,
        tender.agency,
        tender.service_type || 'general',
        contractStartDate,
        contractEnd.toISOString().split('T')[0],
        tender.estimated_value,
        tender.awarded_supplier || 'TBD',
        tender.renewal_probability || 0.5,
        renewalNotificationDate.toISOString().split('T')[0],
        renewalTenderDate.toISOString().split('T')[0],
        tender.intelligence_score || 50
      );

      console.log(`🔄 Renewal opportunity created for ${tender.tender_no}`);

    } catch (error) {
      console.log('Warning: Could not create renewal opportunity:', error.message);
    }
  }

  /**
   * Update tender lifecycle stage
   */
  async updateTenderStage(tenderId, newStage, actualDate = null) {
    this.initDB();

    try {
      const updateStmt = this.db.prepare(`
        UPDATE epu_tender_lifecycle
        SET current_stage = ?, stage_entered_at = ?, last_updated_at = CURRENT_TIMESTAMP
        WHERE tender_id = ?
      `);

      updateStmt.run(
        newStage,
        actualDate || new Date().toISOString(),
        tenderId
      );

      // Update next stage
      const nextStage = this.getNextStage(newStage);
      if (nextStage) {
        const nextStageUpdateStmt = this.db.prepare(`
          UPDATE epu_tender_lifecycle
          SET expected_next_stage = ?, expected_next_stage_date = ?
          WHERE tender_id = ?
        `);

        // Calculate next stage date (simplified)
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 30);

        nextStageUpdateStmt.run(
          nextStage,
          nextDate.toISOString().split('T')[0],
          tenderId
        );
      }

      console.log(`📅 Tender ${tenderId} stage updated to ${newStage}`);

    } catch (error) {
      console.error('Failed to update tender stage:', error.message);
      throw error;
    }
  }

  /**
   * Get upcoming critical dates for alerts
   */
  getUpcomingCriticalDates(daysAhead = 30) {
    this.initDB();

    const stmt = this.db.prepare(`
      SELECT cd.*, tl.tender_no, t.title, t.agency
      FROM epu_critical_dates cd
      JOIN epu_tender_lifecycle tl ON cd.lifecycle_id = tl.id
      LEFT JOIN epu_ser_19_tenders t ON cd.tender_id = t.id
      WHERE cd.scheduled_date BETWEEN date('now') AND date('now', '+' || ? || ' days')
        AND cd.alert_sent = 0
      ORDER BY cd.scheduled_date ASC
    `);

    return stmt.all(daysAhead);
  }

  /**
   * Get renewal opportunities due for action
   */
  getRenewalOpportunities(monthsAhead = 12) {
    this.initDB();

    const stmt = this.db.prepare(`
      SELECT *
      FROM epu_renewal_opportunities
      WHERE renewal_notification_date BETWEEN date('now') AND date('now', '+' || ? || ' months')
        AND renewal_status IN ('monitoring', 'notified')
      ORDER BY renewal_notification_date ASC
    `);

    return stmt.all(monthsAhead);
  }

  /**
   * Get lifecycle analytics
   */
  getLifecycleAnalytics() {
    this.initDB();

    const analytics = {};

    // Stage distribution
    const stageStmt = this.db.prepare(`
      SELECT current_stage, COUNT(*) as count
      FROM epu_tender_lifecycle
      GROUP BY current_stage
      ORDER BY count DESC
    `);
    analytics.stage_distribution = stageStmt.all();

    // Average timelines
    const timelineStmt = this.db.prepare(`
      SELECT
        AVG(JULIANDAY('now') - JULIANDAY(stage_entered_at)) as avg_days_in_current_stage,
        current_stage
      FROM epu_tender_lifecycle
      GROUP BY current_stage
    `);
    analytics.average_stage_durations = timelineStmt.all();

    // Upcoming renewals
    const renewalStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM epu_renewal_opportunities
      WHERE renewal_notification_date BETWEEN date('now') AND date('now', '+6 months')
    `);
    analytics.upcoming_renewals = renewalStmt.get().count;

    // Critical dates due
    const criticalStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM epu_critical_dates
      WHERE scheduled_date BETWEEN date('now') AND date('now', '+14 days')
        AND alert_sent = 0
    `);
    analytics.upcoming_critical_dates = criticalStmt.get().count;

    return analytics;
  }

  /**
   * Generate lifecycle report for specific tender
   */
  getTenderLifecycleReport(tenderId) {
    this.initDB();

    // Get lifecycle data
    const lifecycleStmt = this.db.prepare(`
      SELECT * FROM epu_tender_lifecycle WHERE tender_id = ?
    `);
    const lifecycle = lifecycleStmt.get(tenderId);

    if (!lifecycle) {
      return null;
    }

    // Get critical dates
    const datesStmt = this.db.prepare(`
      SELECT * FROM epu_critical_dates
      WHERE tender_id = ?
      ORDER BY scheduled_date ASC
    `);
    const criticalDates = datesStmt.all(tenderId);

    // Get renewal opportunities
    const renewalStmt = this.db.prepare(`
      SELECT * FROM epu_renewal_opportunities
      WHERE original_tender_id = ?
    `);
    const renewalOpportunities = renewalStmt.all(tenderId);

    // Get performance milestones
    const milestonesStmt = this.db.prepare(`
      SELECT * FROM epu_performance_milestones
      WHERE tender_id = ?
      ORDER BY milestone_date ASC
    `);
    const milestones = milestonesStmt.all(tenderId);

    return {
      lifecycle: {
        ...lifecycle,
        lifecycle_data: lifecycle.lifecycle_data ? JSON.parse(lifecycle.lifecycle_data) : null,
        estimated_timeline: lifecycle.estimated_timeline ? JSON.parse(lifecycle.estimated_timeline) : null
      },
      critical_dates: criticalDates,
      renewal_opportunities: renewalOpportunities,
      performance_milestones: milestones
    };
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

module.exports = EPULifecycleTracker;