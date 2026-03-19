/**
 * Conversation Schema Tables
 * @param {Database} db - SQLite database instance
 */
function createConversationTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_ab_tests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      variables TEXT,
      objective TEXT,
      status TEXT DEFAULT 'active',
      start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      end_date DATETIME,
      expected_sample_size INTEGER,
      actual_sample_size INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversation_test_variants (
      id TEXT PRIMARY KEY,
      test_id TEXT NOT NULL,
      name TEXT NOT NULL,
      parameters TEXT,
      description TEXT,
      weight REAL DEFAULT 1.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_id) REFERENCES conversation_ab_tests(id)
    );

    CREATE TABLE IF NOT EXISTS conversation_test_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(test_id, candidate_id),
      FOREIGN KEY (test_id) REFERENCES conversation_ab_tests(id),
      FOREIGN KEY (variant_id) REFERENCES conversation_test_variants(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS conversation_performance_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id TEXT,
      variant_id TEXT,
      candidate_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_data TEXT,
      response_time_ms INTEGER,
      session_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_id) REFERENCES conversation_ab_tests(id),
      FOREIGN KEY (variant_id) REFERENCES conversation_test_variants(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS candidate_language_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL UNIQUE,
      primary_language TEXT,
      region TEXT,
      detected_language TEXT,
      detection_confidence REAL,
      detection_sources TEXT,
      cultural_adaptation TEXT,
      manual_override INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS slm_conversation_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      session_id TEXT,
      conversation_stage TEXT,
      previous_stage TEXT,
      stage_duration_ms INTEGER,
      conversion_tactic TEXT,
      template_type TEXT,
      language_used TEXT,
      cultural_adaptation TEXT,
      prediction_score REAL,
      actual_conversion INTEGER DEFAULT 0,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS conversion_funnel_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      stage_from TEXT,
      stage_to TEXT,
      duration_ms INTEGER,
      success INTEGER DEFAULT 1,
      metadata TEXT,
      session_id TEXT,
      conversion_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS conversation_prediction_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      feature_set TEXT,
      predicted_likelihood REAL,
      prediction_confidence REAL,
      actual_outcome INTEGER,
      prediction_accuracy REAL,
      model_version TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS fomo_campaign_performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_type TEXT,
      intensity_level TEXT,
      target_segment TEXT,
      language_variant TEXT,
      cultural_adaptation TEXT,
      candidates_reached INTEGER DEFAULT 0,
      responses_received INTEGER DEFAULT 0,
      interviews_scheduled INTEGER DEFAULT 0,
      conversion_rate REAL,
      avg_response_time_ms INTEGER,
      campaign_start DATETIME,
      campaign_end DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversation_monitoring (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      conversation_status TEXT,
      last_message_sent DATETIME,
      last_response_received DATETIME,
      response_time_ms INTEGER,
      engagement_score REAL,
      urgency_level INTEGER,
      requires_intervention INTEGER DEFAULT 0,
      hot_lead_score REAL,
      next_action TEXT,
      escalation_needed INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );
  `);
}

module.exports = { createConversationTables };
