/**
 * AI/ML Schema Tables
 * @param {Database} db - SQLite database instance
 */
function createAIMLTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversation_ai_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL UNIQUE,
      mode TEXT DEFAULT 'inherit',
      custom_instructions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS conversation_slm_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL UNIQUE,
      mode TEXT DEFAULT 'inherit',
      custom_instructions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS ai_response_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      message_id INTEGER,
      incoming_message TEXT,
      ai_response TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT DEFAULT 'generated',
      edited_response TEXT,
      admin_action TEXT,
      response_time_ms INTEGER,
      tokens_used INTEGER,
      intent_detected TEXT,
      source TEXT DEFAULT 'llm',
      kb_entry_id INTEGER,
      confidence REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS ai_faq (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      keywords TEXT,
      priority INTEGER DEFAULT 0,
      use_count INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ml_knowledge_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      question_normalized TEXT,
      question_tokens TEXT,
      answer TEXT NOT NULL,
      intent TEXT,
      category TEXT,
      confidence REAL DEFAULT 0.5,
      use_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      edit_count INTEGER DEFAULT 0,
      reject_count INTEGER DEFAULT 0,
      source TEXT DEFAULT 'llm',
      keywords TEXT,
      last_used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ml_training_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      input_text TEXT NOT NULL,
      output_text TEXT NOT NULL,
      context TEXT,
      intent TEXT,
      category TEXT,
      quality_score REAL DEFAULT 0.5,
      was_edited INTEGER DEFAULT 0,
      edited_output TEXT,
      admin_approved INTEGER DEFAULT 0,
      source TEXT DEFAULT 'production',
      exported INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ml_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_queries INTEGER DEFAULT 0,
      kb_hits INTEGER DEFAULT 0,
      llm_calls INTEGER DEFAULT 0,
      auto_replies_sent INTEGER DEFAULT 0,
      suggestions_shown INTEGER DEFAULT 0,
      suggestions_accepted INTEGER DEFAULT 0,
      suggestions_edited INTEGER DEFAULT 0,
      suggestions_rejected INTEGER DEFAULT 0,
      avg_confidence REAL,
      avg_response_time_ms INTEGER,
      estimated_cost_saved REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ml_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ad_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      variant_key TEXT NOT NULL,
      content TEXT NOT NULL,
      variables TEXT,
      variable_tested TEXT,
      variable_value TEXT,
      source TEXT DEFAULT 'llm',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ad_performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id INTEGER NOT NULL,
      job_id TEXT NOT NULL,
      group_id INTEGER,
      message_id TEXT,
      posted_at DATETIME,
      post_hour INTEGER,
      post_day INTEGER,
      impressions INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      responses INTEGER DEFAULT 0,
      response_rate REAL,
      is_winner INTEGER DEFAULT 0,
      measured_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ad_variable_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variable_name TEXT NOT NULL,
      variable_value TEXT NOT NULL,
      job_category TEXT,
      win_count INTEGER DEFAULT 0,
      lose_count INTEGER DEFAULT 0,
      total_tests INTEGER DEFAULT 0,
      total_responses INTEGER DEFAULT 0,
      avg_response_rate REAL DEFAULT 0,
      confidence REAL DEFAULT 0.5,
      last_tested_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(variable_name, variable_value, job_category)
    );

    CREATE TABLE IF NOT EXISTS ad_timing_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hour INTEGER NOT NULL,
      day_of_week INTEGER,
      job_category TEXT,
      post_count INTEGER DEFAULT 0,
      total_responses INTEGER DEFAULT 0,
      avg_response_rate REAL DEFAULT 0,
      score REAL DEFAULT 0.5,
      last_updated DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(hour, day_of_week, job_category)
    );

    CREATE TABLE IF NOT EXISTS ad_training_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_details TEXT NOT NULL,
      ad_content TEXT NOT NULL,
      variables TEXT,
      response_rate REAL,
      is_winner INTEGER DEFAULT 0,
      quality_score REAL DEFAULT 0.5,
      job_category TEXT,
      exported INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ad_ml_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

module.exports = { createAIMLTables };
