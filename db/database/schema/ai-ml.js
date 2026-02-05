/**
 * AI/ML Schema
 * Tables for AI conversation, machine learning, and ad optimization systems
 * 
 * @module database/schema/ai-ml
 */

const { db } = require('../config');

/**
 * Create AI/ML and ad optimization tables
 */
function createAIMLTables() {
  db.exec(`
    -- =====================================================
    -- AI CONVERSATION SYSTEM
    -- =====================================================

    -- Conversation AI Settings (Per-Candidate)
    CREATE TABLE IF NOT EXISTS conversation_ai_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL UNIQUE,
      mode TEXT DEFAULT 'inherit',  -- 'inherit' | 'off' | 'auto' | 'suggest'
      custom_instructions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- AI Response Logs (Quality Monitoring)
    CREATE TABLE IF NOT EXISTS ai_response_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      message_id INTEGER,
      incoming_message TEXT,
      ai_response TEXT NOT NULL,
      mode TEXT NOT NULL,  -- 'auto' | 'suggest'
      status TEXT DEFAULT 'generated',  -- 'generated' | 'sent' | 'edited' | 'rejected' | 'dismissed'
      edited_response TEXT,
      admin_action TEXT,  -- 'sent_as_is' | 'edited' | 'rejected' | 'dismissed'
      response_time_ms INTEGER,
      tokens_used INTEGER,
      intent_detected TEXT,
      source TEXT DEFAULT 'llm',  -- 'llm' | 'knowledge_base'
      kb_entry_id INTEGER,
      confidence REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- FAQ Knowledge Base (Manually Curated)
    CREATE TABLE IF NOT EXISTS ai_faq (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,  -- 'pay' | 'schedule' | 'availability' | 'general' | 'onboarding' | 'jobs'
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      keywords TEXT,  -- JSON array of trigger keywords
      priority INTEGER DEFAULT 0,
      use_count INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- =====================================================
    -- MACHINE LEARNING SYSTEM (Path to SLM)
    -- =====================================================

    -- ML Knowledge Base (Learned Q&A Pairs)
    CREATE TABLE IF NOT EXISTS ml_knowledge_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      question_normalized TEXT,  -- Lowercase, stripped punctuation for matching
      question_tokens TEXT,  -- JSON array of tokens for TF-IDF
      answer TEXT NOT NULL,
      intent TEXT,
      category TEXT,
      confidence REAL DEFAULT 0.5,
      use_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,  -- Times admin approved as-is
      edit_count INTEGER DEFAULT 0,  -- Times admin edited before sending
      reject_count INTEGER DEFAULT 0,  -- Times admin rejected
      keywords TEXT,  -- JSON array for matching
      source TEXT DEFAULT 'llm',  -- 'llm' | 'admin' | 'faq'
      last_used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ML Training Data (All Interactions for Export)
    CREATE TABLE IF NOT EXISTS ml_training_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      input_text TEXT NOT NULL,
      output_text TEXT NOT NULL,
      context TEXT,  -- JSON: conversation history, candidate info
      intent TEXT,
      category TEXT,
      quality_score REAL DEFAULT 0.5,  -- 0-1 based on admin feedback
      was_edited INTEGER DEFAULT 0,
      edited_output TEXT,
      admin_approved INTEGER DEFAULT 0,
      source TEXT DEFAULT 'production',  -- 'production' | 'synthetic' | 'faq'
      exported INTEGER DEFAULT 0,  -- Whether included in training export
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ML Performance Metrics (Daily Tracking)
    CREATE TABLE IF NOT EXISTS ml_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_queries INTEGER DEFAULT 0,
      kb_hits INTEGER DEFAULT 0,  -- Answered from knowledge base
      llm_calls INTEGER DEFAULT 0,  -- Had to call Claude
      auto_replies_sent INTEGER DEFAULT 0,
      suggestions_shown INTEGER DEFAULT 0,
      suggestions_accepted INTEGER DEFAULT 0,
      suggestions_edited INTEGER DEFAULT 0,
      suggestions_rejected INTEGER DEFAULT 0,
      avg_confidence REAL,
      avg_response_time_ms INTEGER,
      estimated_cost_saved REAL,  -- Estimated $ saved from KB hits
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ML System Settings
    CREATE TABLE IF NOT EXISTS ml_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- =====================================================
    -- AD OPTIMIZATION ML (A/B Testing + Learning)
    -- =====================================================

    -- Ad Variants (A/B Testing)
    CREATE TABLE IF NOT EXISTS ad_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      variant_key TEXT NOT NULL,  -- 'A', 'B', 'C'
      content TEXT NOT NULL,
      variables TEXT,  -- JSON: {"tone": "casual", "emoji_count": 3, "length": "short", "cta_style": "urgent"}
      variable_tested TEXT,  -- The specific variable being tested
      variable_value TEXT,  -- The value of that variable for this variant
      source TEXT DEFAULT 'llm',  -- 'llm' | 'optimized' | 'manual'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      -- Note: No FK to jobs since ad training data should persist after jobs deleted
    );

    -- Ad Performance Tracking
    CREATE TABLE IF NOT EXISTS ad_performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id INTEGER NOT NULL,
      job_id TEXT NOT NULL,
      group_id INTEGER,
      message_id TEXT,
      posted_at DATETIME,
      post_hour INTEGER,  -- 0-23
      post_day INTEGER,  -- 0=Sun, 6=Sat
      impressions INTEGER DEFAULT 0,  -- Estimated views
      clicks INTEGER DEFAULT 0,  -- Link clicks if trackable
      responses INTEGER DEFAULT 0,  -- Candidate applications/replies
      response_rate REAL,  -- responses / impressions
      is_winner INTEGER DEFAULT 0,  -- Won the A/B test
      measured_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      -- Note: No FKs since training data should persist even if variants/groups deleted
    );

    -- Learned Variable Preferences
    CREATE TABLE IF NOT EXISTS ad_variable_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variable_name TEXT NOT NULL,  -- 'tone', 'emoji_count', 'length', 'cta_style', etc.
      variable_value TEXT NOT NULL,  -- 'casual', '3', 'short', 'urgent', etc.
      job_category TEXT,  -- Optional: different preferences per job type (null = global)
      win_count INTEGER DEFAULT 0,
      lose_count INTEGER DEFAULT 0,
      total_tests INTEGER DEFAULT 0,
      total_responses INTEGER DEFAULT 0,
      avg_response_rate REAL DEFAULT 0,
      confidence REAL DEFAULT 0.5,  -- 0-1, higher = more confident
      last_tested_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(variable_name, variable_value, job_category)
    );

    -- Optimal Posting Times (Learned from Data)
    CREATE TABLE IF NOT EXISTS ad_timing_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hour INTEGER NOT NULL,  -- 0-23
      day_of_week INTEGER,  -- 0=Sun, 6=Sat (NULL = any day)
      job_category TEXT,  -- Optional: different times for different job types
      post_count INTEGER DEFAULT 0,
      total_responses INTEGER DEFAULT 0,
      avg_response_rate REAL DEFAULT 0,
      score REAL DEFAULT 0.5,  -- 0-1, higher = better time to post
      last_updated DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(hour, day_of_week, job_category)
    );

    -- Ad Training Data (For SLM Development)
    CREATE TABLE IF NOT EXISTS ad_training_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_details TEXT NOT NULL,  -- JSON: job title, pay, location, requirements, slots
      ad_content TEXT NOT NULL,  -- The ad text
      variables TEXT,  -- JSON: what variables were used
      response_rate REAL,  -- Performance score
      is_winner INTEGER DEFAULT 0,  -- Won A/B test
      quality_score REAL DEFAULT 0.5,  -- Calculated from response_rate + other factors
      job_category TEXT,
      exported INTEGER DEFAULT 0,  -- Whether included in training export
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Ad ML Settings
    CREATE TABLE IF NOT EXISTS ad_ml_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('  ✅ AI/ML & ad optimization tables created');
}

module.exports = { createAIMLTables };
