/**
 * Database Schema Definitions
 * Thin orchestrator that delegates to modular schema files in ./schema/
 *
 * Original monolith: 2,047 lines → Now ~100 lines orchestrator + 12 modular files
 * Table definitions live in db/schema/*.js, organized by domain
 */

const { createLogger } = require('../utils/structured-logger');
const schemaLogger = createLogger('db-schema');

// Schema modules
const { createCoreTables } = require('./schema/core');
const { createReferralTables } = require('./schema/referrals');
const { createGamificationTables } = require('./schema/gamification');
const { createCommunicationTables } = require('./schema/communication');
const { createAIMLTables } = require('./schema/ai-ml');
const { createConversationTables } = require('./schema/conversation');
const { createOutreachTables } = require('./schema/outreach');
const { createTenderTables } = require('./schema/tenders');
const { createConsultantTables } = require('./schema/consultant');
const { createScrapingTables } = require('./schema/scraping');
const { createAdminTables } = require('./schema/admin');
const { createIndexes } = require('./schema/indexes');

/**
 * Create all database tables and indexes
 * @param {Database} db - SQLite database instance
 */
function createSchema(db) {
  createCoreTables(db);
  createReferralTables(db);
  createGamificationTables(db);
  createCommunicationTables(db);
  createAIMLTables(db);
  createConversationTables(db);
  createOutreachTables(db);
  createTenderTables(db);
  createConsultantTables(db);
  createScrapingTables(db);
  createAdminTables(db);
  createIndexes(db);

  // Schema creation is silent; server.js logs startup status
}

/**
 * Run migration operations to add missing columns
 * Migrations are sequential and idempotent - safe to run multiple times
 * @param {Database} db - SQLite database instance
 */
function runMigrations(db) {
  const migrations = [
    // Add ai_generated column to messages if not exists
    () => {
      try {
        db.exec(`ALTER TABLE messages ADD COLUMN ai_generated INTEGER DEFAULT 0`);
      } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
    },

    // Add ai_log_id column to messages if not exists
    () => {
      try {
        db.exec(`ALTER TABLE messages ADD COLUMN ai_log_id INTEGER`);
      } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
    },

    // Add missing columns to telegram_groups if not exists
    () => {
      try { db.exec(`ALTER TABLE telegram_groups ADD COLUMN type TEXT DEFAULT 'job_posting'`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
      try { db.exec(`ALTER TABLE telegram_groups ADD COLUMN active INTEGER DEFAULT 1`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
      try { db.exec(`ALTER TABLE telegram_groups ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
    },

    // Add keywords column to ml_knowledge_base if not exists
    () => {
      try { db.exec(`ALTER TABLE ml_knowledge_base ADD COLUMN keywords TEXT`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
    },

    // Add telegram_username column to candidates if not exists
    () => {
      try { db.exec(`ALTER TABLE candidates ADD COLUMN telegram_username TEXT`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
    },

    // Add google_id column to candidates if not exists
    () => {
      try { db.exec(`ALTER TABLE candidates ADD COLUMN google_id TEXT`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
    },

    // Add claimed columns to candidate_achievements if not exists
    () => {
      try { db.exec(`ALTER TABLE candidate_achievements ADD COLUMN claimed INTEGER DEFAULT 0`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
      try { db.exec(`ALTER TABLE candidate_achievements ADD COLUMN claimed_at DATETIME`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
    },

    // Add code column to achievements if not exists
    () => {
      try { db.exec(`ALTER TABLE achievements ADD COLUMN code TEXT`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
      try { db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_code ON achievements(code)`); } catch (e) {
        if (!e.message.includes('already exists')) throw e;
      }
    },

    // Add new gamification columns to candidates if not exists
    () => {
      try { db.exec(`ALTER TABLE candidates ADD COLUMN lifetime_xp INTEGER DEFAULT 0`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
      try { db.exec(`ALTER TABLE candidates ADD COLUMN current_points INTEGER DEFAULT 0`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
      try { db.exec(`ALTER TABLE candidates ADD COLUMN current_tier TEXT DEFAULT 'bronze'`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
    },

    // Add profile_flair column
    () => {
      try { db.exec(`ALTER TABLE candidates ADD COLUMN profile_flair TEXT`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
    },

    // Add theme_preference column
    () => {
      try { db.exec(`ALTER TABLE candidates ADD COLUMN theme_preference TEXT DEFAULT 'default'`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
    },

    // Add action_type column to xp_transactions
    () => {
      try { db.exec(`ALTER TABLE xp_transactions ADD COLUMN action_type TEXT`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
    },

    // Add engagement tracking columns to candidates
    () => {
      try { db.exec(`ALTER TABLE candidates ADD COLUMN engagement_score INTEGER DEFAULT 0`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
      try { db.exec(`ALTER TABLE candidates ADD COLUMN engagement_tier TEXT DEFAULT 'inactive'`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
      try { db.exec(`ALTER TABLE candidates ADD COLUMN response_rate INTEGER DEFAULT 0`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
      try { db.exec(`ALTER TABLE candidates ADD COLUMN total_engagements INTEGER DEFAULT 0`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
      try { db.exec(`ALTER TABLE candidates ADD COLUMN last_engagement DATETIME`); } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
    },

    // Add template response system tables
    () => {
      try {
        const tableInfo = db.prepare("PRAGMA table_info(response_templates)").all();
        const hasOldSchema = tableInfo.some(col => col.name === 'category');

        if (hasOldSchema) {
          db.exec(`
            DROP TABLE IF EXISTS template_variables;
            DROP TABLE IF EXISTS template_usage_log;
            DROP TABLE IF EXISTS template_escalations;
            DROP TABLE IF EXISTS response_templates;
            DROP TABLE IF EXISTS template_categories;
          `);
        }

        db.exec(`
          CREATE TABLE IF NOT EXISTS template_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            priority INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS response_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            name TEXT NOT NULL UNIQUE,
            trigger_patterns TEXT DEFAULT '[]',
            template_content TEXT NOT NULL,
            requires_real_data INTEGER DEFAULT 0,
            confidence_score REAL DEFAULT 0.8,
            language TEXT DEFAULT 'en',
            active INTEGER DEFAULT 1,
            usage_count INTEGER DEFAULT 0,
            last_used_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES template_categories(id)
          );
          CREATE TABLE IF NOT EXISTS template_variables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER NOT NULL,
            variable_name TEXT NOT NULL,
            data_source TEXT NOT NULL,
            field_path TEXT NOT NULL,
            fallback_value TEXT DEFAULT '',
            format_type TEXT DEFAULT 'text',
            FOREIGN KEY (template_id) REFERENCES response_templates(id) ON DELETE CASCADE
          );
          CREATE TABLE IF NOT EXISTS template_usage_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER,
            candidate_id TEXT,
            context TEXT,
            success INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS template_escalations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_id TEXT NOT NULL,
            reason TEXT,
            context TEXT,
            priority TEXT DEFAULT 'normal',
            status TEXT DEFAULT 'pending',
            assigned_to TEXT,
            resolved_at DATETIME,
            resolution_notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_response_templates_category ON response_templates(category_id);
          CREATE INDEX IF NOT EXISTS idx_template_usage_template ON template_usage_log(template_id);
          CREATE INDEX IF NOT EXISTS idx_template_usage_candidate ON template_usage_log(candidate_id);
          CREATE INDEX IF NOT EXISTS idx_template_escalations_candidate ON template_escalations(candidate_id);
          CREATE INDEX IF NOT EXISTS idx_template_escalations_status ON template_escalations(status);
        `);
      } catch (e) {
        if (!e.message.includes('already exists')) throw e;
      }
    },

    // Add in_pipeline and dismissed columns to gebiz_active_tenders
    () => {
      try {
        const tableInfo = db.prepare("PRAGMA table_info('gebiz_active_tenders')").all();
        const columns = tableInfo.map(c => c.name);
        if (!columns.includes('in_pipeline')) {
          db.exec(`ALTER TABLE gebiz_active_tenders ADD COLUMN in_pipeline BOOLEAN DEFAULT 0`);
          db.exec(`CREATE INDEX IF NOT EXISTS idx_active_tenders_pipeline ON gebiz_active_tenders(in_pipeline)`);
        }
        if (!columns.includes('dismissed')) {
          db.exec(`ALTER TABLE gebiz_active_tenders ADD COLUMN dismissed BOOLEAN DEFAULT 0`);
          db.exec(`CREATE INDEX IF NOT EXISTS idx_active_tenders_dismissed ON gebiz_active_tenders(dismissed)`);
        }
      } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
    },

    // Add win_probability column to bpo_tender_lifecycle
    () => {
      try {
        const tableInfo = db.prepare("PRAGMA table_info('bpo_tender_lifecycle')").all();
        const columns = tableInfo.map(c => c.name);
        if (!columns.includes('win_probability')) {
          db.exec(`ALTER TABLE bpo_tender_lifecycle ADD COLUMN win_probability REAL`);
        }
      } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
    },

    // Add missing columns to escalation_queue
    () => {
      try {
        const tableInfo = db.prepare("PRAGMA table_info('escalation_queue')").all();
        if (tableInfo.length === 0) return;
        const columns = tableInfo.map(c => c.name);

        const newColumns = [
          { name: 'trigger_type', sql: "ALTER TABLE escalation_queue ADD COLUMN trigger_type TEXT NOT NULL DEFAULT 'manual'" },
          { name: 'trigger_reason', sql: "ALTER TABLE escalation_queue ADD COLUMN trigger_reason TEXT" },
          { name: 'context_data', sql: "ALTER TABLE escalation_queue ADD COLUMN context_data TEXT" },
          { name: 'assigned_admin', sql: "ALTER TABLE escalation_queue ADD COLUMN assigned_admin TEXT" },
          { name: 'assigned_at', sql: "ALTER TABLE escalation_queue ADD COLUMN assigned_at DATETIME" },
          { name: 'first_response_at', sql: "ALTER TABLE escalation_queue ADD COLUMN first_response_at DATETIME" },
          { name: 'sla_breach', sql: "ALTER TABLE escalation_queue ADD COLUMN sla_breach BOOLEAN DEFAULT FALSE" },
          { name: 'sla_deadline', sql: "ALTER TABLE escalation_queue ADD COLUMN sla_deadline DATETIME" },
          { name: 'escalation_count', sql: "ALTER TABLE escalation_queue ADD COLUMN escalation_count INTEGER DEFAULT 1" },
          { name: 'user_satisfaction_score', sql: "ALTER TABLE escalation_queue ADD COLUMN user_satisfaction_score INTEGER" },
        ];

        for (const col of newColumns) {
          if (!columns.includes(col.name)) {
            db.exec(col.sql);
          }
        }
      } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
    },

    // Deduplicate tender_alerts and add UNIQUE constraint
    () => {
      try {
        const tableInfo = db.prepare("PRAGMA table_info('tender_alerts')").all();
        if (tableInfo.length === 0) return;

        const dupeCount = db.prepare(`
          SELECT COUNT(*) as c FROM tender_alerts
          WHERE id NOT IN (SELECT MIN(id) FROM tender_alerts GROUP BY keyword)
        `).get().c;

        if (dupeCount > 0) {
          db.exec(`
            DELETE FROM tender_alerts
            WHERE id NOT IN (SELECT MIN(id) FROM tender_alerts GROUP BY keyword)
          `);
        }

        db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tender_alerts_keyword ON tender_alerts(keyword)`);
      } catch (e) {
        if (!e.message.includes('already exists')) throw e;
      }
    },

    // Add source column to gebiz_active_tenders
    () => {
      try {
        const tableInfo = db.prepare("PRAGMA table_info('gebiz_active_tenders')").all();
        if (tableInfo.length === 0) return;
        const columns = tableInfo.map(c => c.name);
        if (!columns.includes('source')) {
          db.exec(`ALTER TABLE gebiz_active_tenders ADD COLUMN source TEXT DEFAULT 'gebiz'`);
          db.exec(`CREATE INDEX IF NOT EXISTS idx_active_tenders_source ON gebiz_active_tenders(source)`);
        }
      } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
    },

    // Seed scraping_portals table
    () => {
      try {
        const tableInfo = db.prepare("PRAGMA table_info('scraping_portals')").all();
        if (tableInfo.length === 0) return;

        const count = db.prepare('SELECT COUNT(*) as c FROM scraping_portals').get().c;
        if (count === 0) {
          const insert = db.prepare(`
            INSERT OR IGNORE INTO scraping_portals
            (portal_key, name, url, description, type, enabled, scraper_available)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);

          const portals = [
            ['gebiz', 'GeBIZ', 'https://www.gebiz.gov.sg', 'Singapore Government Electronic Business portal', 'government', 1, 1],
            ['alps', 'ALPS Healthcare', 'https://alps.sg', 'Healthcare Supply Chain Network', 'government', 0, 0],
            ['mohh_ariba', 'MOHH eProcurement', 'https://www.ariba.com', 'MOH Holdings sourcing via SAP Ariba', 'government', 0, 0],
            ['tenderboard', 'TenderBoard', 'https://www.tenderboard.biz', 'Singapore private sector tender aggregator', 'aggregator', 0, 0],
            ['tendersgo', 'TendersGo', 'https://www.tendersgo.com', 'Global tender search engine', 'aggregator', 0, 0],
            ['mbs_supplier', 'MBS Supplier Portal', 'https://www.marinabaysands.com', 'Marina Bay Sands vendor registration', 'hospitality', 0, 0],
            ['ariba_discovery', 'Ariba Discovery', 'https://discovery.ariba.com', 'SAP Ariba Discovery', 'hospitality', 0, 0],
            ['procurehere', 'Procurehere', 'https://www.procurehere.com', 'Private invitational tender platform', 'hospitality', 0, 0],
          ];

          for (const p of portals) {
            insert.run(...p);
          }
        }
      } catch (e) {
        if (!e.message.includes('already exists')) throw e;
      }
    },

    // Replace old portals with business-aligned portals
    () => {
      try {
        const tableInfo = db.prepare("PRAGMA table_info('scraping_portals')").all();
        if (tableInfo.length === 0) return;

        const hasOldPortals = db.prepare("SELECT portal_key FROM scraping_portals WHERE portal_key IN ('epu', 'hdb', 'lta', 'mom', 'nea', 'dgmarket')").get();
        if (!hasOldPortals) return;

        db.prepare('DELETE FROM scraping_portals').run();

        const insert = db.prepare(`
          INSERT OR IGNORE INTO scraping_portals
          (portal_key, name, url, description, type, enabled, scraper_available)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const portals = [
          ['gebiz', 'GeBIZ', 'https://www.gebiz.gov.sg', 'Singapore Government Electronic Business portal', 'government', 1, 1],
          ['alps', 'ALPS Healthcare', 'https://alps.sg', 'Healthcare Supply Chain Network', 'government', 0, 0],
          ['mohh_ariba', 'MOHH eProcurement', 'https://www.ariba.com', 'MOH Holdings sourcing via SAP Ariba', 'government', 0, 0],
          ['tenderboard', 'TenderBoard', 'https://www.tenderboard.biz', 'Singapore private sector tender aggregator', 'aggregator', 0, 0],
          ['tendersgo', 'TendersGo', 'https://www.tendersgo.com', 'Global tender search engine', 'aggregator', 0, 0],
          ['mbs_supplier', 'MBS Supplier Portal', 'https://www.marinabaysands.com', 'Marina Bay Sands vendor registration', 'hospitality', 0, 0],
          ['ariba_discovery', 'Ariba Discovery', 'https://discovery.ariba.com', 'SAP Ariba Discovery', 'hospitality', 0, 0],
          ['procurehere', 'Procurehere', 'https://www.procurehere.com', 'Private invitational tender platform', 'hospitality', 0, 0],
        ];

        for (const p of portals) {
          insert.run(...p);
        }
      } catch (e) {
        if (!e.message.includes('already exists')) throw e;
      }
    },

    // Add password_hash column to candidates for secure authentication
    () => {
      try {
        const cols = db.prepare("PRAGMA table_info('candidates')").all();
        if (!cols.find(c => c.name === 'password_hash')) {
          db.exec('ALTER TABLE candidates ADD COLUMN password_hash TEXT');
        }
      } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) throw e;
      }
    },

    // Seed scanner_settings defaults
    () => {
      try {
        const tableInfo = db.prepare("PRAGMA table_info('scanner_settings')").all();
        if (tableInfo.length === 0) return;

        const existing = db.prepare("SELECT key FROM scanner_settings WHERE key = 'feed_categories'").get();
        if (!existing) {
          db.prepare(`
            INSERT OR IGNORE INTO scanner_settings (key, value)
            VALUES ('feed_categories', ?)
          `).run('manpower_services,cleaning_services,security_services,healthcare_staffing,hospitality_services,catering_services,event_management');
        }
      } catch (e) {
        if (!e.message.includes('already exists')) throw e;
      }
    },
  ];

  // Run all migrations
  let succeeded = 0;
  let failed = 0;
  migrations.forEach((migration, index) => {
    try {
      migration();
      succeeded++;
    } catch (error) {
      failed++;
      schemaLogger.error(`Migration ${index + 1} failed`, { error: error.message });
    }
  });

  // Migration completion is silent; server.js logs startup status
}

module.exports = {
  createSchema,
  runMigrations
};
