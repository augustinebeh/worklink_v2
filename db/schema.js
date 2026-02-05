/**
 * Database Schema Definitions
 * Contains all table creation statements and migrations
 */

/**
 * Create all database tables and indexes
 * @param {Database} db - SQLite database instance
 */
function createSchema(db) {
  db.exec(`
    -- Core tables
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      date_of_birth DATE,
      nric_last4 TEXT,
      status TEXT DEFAULT 'lead',
      source TEXT DEFAULT 'direct',
      xp INTEGER DEFAULT 0,
      lifetime_xp INTEGER DEFAULT 0,
      current_points INTEGER DEFAULT 0,
      current_tier TEXT DEFAULT 'bronze',
      level INTEGER DEFAULT 1,
      streak_days INTEGER DEFAULT 0,
      streak_last_date DATE,
      streak_protected_until DATETIME,
      profile_flair TEXT,
      selected_border_id TEXT,
      total_jobs_completed INTEGER DEFAULT 0,
      certifications TEXT DEFAULT '[]',
      skills TEXT DEFAULT '[]',
      preferred_locations TEXT DEFAULT '[]',
      referral_code TEXT UNIQUE,
      referred_by TEXT,
      referral_tier INTEGER DEFAULT 1,
      total_referral_earnings REAL DEFAULT 0,
      total_incentives_earned REAL DEFAULT 0,
      total_earnings REAL DEFAULT 0,
      rating REAL DEFAULT 0,
      profile_photo TEXT,
      bank_name TEXT,
      bank_account TEXT,
      address TEXT,
      availability_mode TEXT DEFAULT 'weekdays',
      online_status TEXT DEFAULT 'offline',
      last_seen DATETIME,
      push_token TEXT,
      whatsapp_opted_in INTEGER DEFAULT 0,
      telegram_chat_id TEXT,
      telegram_username TEXT,
      google_id TEXT,
      preferred_contact TEXT DEFAULT 'app',
      theme_preference TEXT DEFAULT 'default',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      uen TEXT,
      industry TEXT,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      logo_url TEXT,
      payment_terms INTEGER DEFAULT 30,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      job_date DATE,
      start_time TEXT,
      end_time TEXT,
      break_minutes INTEGER DEFAULT 0,
      location TEXT,
      location_lat REAL,
      location_lng REAL,
      charge_rate REAL NOT NULL,
      pay_rate REAL NOT NULL,
      total_slots INTEGER DEFAULT 1,
      filled_slots INTEGER DEFAULT 0,
      required_skills TEXT DEFAULT '[]',
      xp_bonus INTEGER DEFAULT 0,
      status TEXT DEFAULT 'open',
      featured INTEGER DEFAULT 0,
      urgent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      candidate_id TEXT,
      status TEXT DEFAULT 'assigned',
      hours_worked REAL,
      charge_rate REAL,
      pay_rate REAL,
      gross_revenue REAL,
      candidate_pay REAL,
      gross_profit REAL,
      incentive_amount REAL DEFAULT 0,
      rating INTEGER,
      feedback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      candidate_id TEXT,
      deployment_id TEXT,
      base_amount REAL,
      incentive_amount REAL DEFAULT 0,
      total_amount REAL,
      hours_worked REAL,
      status TEXT DEFAULT 'pending',
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Availability calendar
    CREATE TABLE IF NOT EXISTS candidate_availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      date DATE NOT NULL,
      status TEXT DEFAULT 'available',
      start_time TEXT,
      end_time TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(candidate_id, date),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Enhanced referrals with tiers
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT,
      referred_id TEXT,
      status TEXT DEFAULT 'pending',
      tier INTEGER DEFAULT 1,
      bonus_amount REAL,
      jobs_completed_by_referred INTEGER DEFAULT 0,
      total_bonus_paid REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES candidates(id),
      FOREIGN KEY (referred_id) REFERENCES candidates(id)
    );

    -- Referral bonus tiers
    CREATE TABLE IF NOT EXISTS referral_tiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tier_level INTEGER UNIQUE,
      jobs_required INTEGER,
      bonus_amount REAL,
      description TEXT
    );

    -- Incentive schemes
    CREATE TABLE IF NOT EXISTS incentive_schemes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT,
      trigger_type TEXT,
      trigger_value INTEGER,
      reward_type TEXT,
      reward_value REAL,
      max_reward REAL,
      min_gross_margin_percent REAL DEFAULT 20,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tenders
    CREATE TABLE IF NOT EXISTS tenders (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      external_id TEXT,
      title TEXT NOT NULL,
      agency TEXT,
      category TEXT,
      estimated_value REAL,
      closing_date DATETIME,
      status TEXT DEFAULT 'new',
      manpower_required INTEGER,
      duration_months INTEGER,
      location TEXT,
      estimated_charge_rate REAL,
      estimated_pay_rate REAL,
      estimated_monthly_revenue REAL,
      our_bid_amount REAL,
      win_probability INTEGER,
      recommended_action TEXT,
      notes TEXT,
      assigned_to TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tender alerts/keywords
    CREATE TABLE IF NOT EXISTS tender_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      source TEXT DEFAULT 'all',
      email_notify INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1,
      last_checked DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tender matches (from RSS/scraping)
    CREATE TABLE IF NOT EXISTS tender_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id INTEGER,
      tender_id TEXT,
      external_url TEXT,
      title TEXT,
      matched_keyword TEXT,
      notified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (alert_id) REFERENCES tender_alerts(id)
    );

    -- Gamification
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      category TEXT,
      requirement_type TEXT,
      requirement_value INTEGER,
      xp_reward INTEGER DEFAULT 0,
      rarity TEXT DEFAULT 'common'
    );

    CREATE TABLE IF NOT EXISTS candidate_achievements (
      candidate_id TEXT,
      achievement_id TEXT,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      claimed INTEGER DEFAULT 0,
      claimed_at DATETIME,
      PRIMARY KEY (candidate_id, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS quests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT,
      requirement TEXT,
      xp_reward INTEGER DEFAULT 0,
      bonus_reward REAL DEFAULT 0,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS candidate_quests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      quest_id TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      target INTEGER DEFAULT 1,
      completed INTEGER DEFAULT 0,
      claimed INTEGER DEFAULT 0,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      claimed_at DATETIME,
      UNIQUE(candidate_id, quest_id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (quest_id) REFERENCES quests(id)
    );

    CREATE TABLE IF NOT EXISTS xp_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      action_type TEXT,
      amount INTEGER NOT NULL,
      reason TEXT,
      reference_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS training (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER,
      certification_name TEXT,
      xp_reward INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS candidate_training (
      candidate_id TEXT,
      training_id TEXT,
      status TEXT DEFAULT 'enrolled',
      score INTEGER,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      PRIMARY KEY (candidate_id, training_id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (training_id) REFERENCES training(id)
    );

    -- Rewards Shop (The Sink)
    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      category TEXT,  -- 'feature' | 'operational' | 'physical'
      points_cost INTEGER NOT NULL,
      tier_required TEXT DEFAULT 'bronze',
      stock INTEGER,  -- NULL = unlimited
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reward_purchases (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      reward_id TEXT NOT NULL,
      points_spent INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',  -- 'pending' | 'fulfilled' | 'cancelled'
      fulfilled_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (reward_id) REFERENCES rewards(id)
    );

    CREATE TABLE IF NOT EXISTS profile_borders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      tier TEXT NOT NULL, -- bronze, silver, gold, platinum, diamond, mythic, special
      rarity TEXT DEFAULT 'common', -- common, rare, epic, legendary
      gradient TEXT, -- CSS gradient
      glow TEXT, -- CSS glow effect
      animation TEXT, -- CSS animation class
      unlock_type TEXT, -- level, achievement, special
      unlock_requirement TEXT, -- JSON with requirements
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS candidate_borders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      border_id TEXT NOT NULL,
      is_selected INTEGER DEFAULT 0,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(candidate_id, border_id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (border_id) REFERENCES profile_borders(id)
    );

    -- Financial
    CREATE TABLE IF NOT EXISTS financial_projections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT,
      year INTEGER,
      projected_revenue REAL,
      projected_costs REAL,
      projected_profit REAL,
      actual_revenue REAL,
      actual_costs REAL,
      actual_profit REAL
    );

    -- Messaging
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT,
      sender TEXT,
      content TEXT,
      template_id TEXT,
      channel TEXT DEFAULT 'app',
      ai_generated INTEGER DEFAULT 0,
      ai_log_id INTEGER,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS message_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      content TEXT NOT NULL,
      whatsapp_content TEXT,
      variables TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT,
      type TEXT,
      title TEXT,
      message TEXT,
      data TEXT,
      read INTEGER DEFAULT 0,
      push_sent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Push notification queue
    CREATE TABLE IF NOT EXISTS push_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT,
      title TEXT,
      body TEXT,
      data TEXT,
      status TEXT DEFAULT 'pending',
      sent_at DATETIME,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Job matching scores
    CREATE TABLE IF NOT EXISTS job_match_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT,
      candidate_id TEXT,
      score REAL,
      factors TEXT,
      notified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(job_id, candidate_id),
      FOREIGN KEY (job_id) REFERENCES jobs(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Push subscription storage for retention notifications
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT UNIQUE,
      subscription_endpoint TEXT NOT NULL,
      subscription_p256dh TEXT NOT NULL,
      subscription_auth TEXT NOT NULL,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Notification log for retention tracking
    CREATE TABLE IF NOT EXISTS notification_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT,
      notification_type TEXT,
      status TEXT,
      response_action TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Streak protection tokens
    CREATE TABLE IF NOT EXISTS streak_protection (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT,
      freeze_tokens INTEGER DEFAULT 0,
      recovery_tokens INTEGER DEFAULT 0,
      last_protection_used DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- =====================================================
    -- SLM CONVERSION FUNNEL ENHANCEMENT TABLES
    -- =====================================================

    -- A/B testing for conversations
    CREATE TABLE IF NOT EXISTS conversation_ab_tests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      variables TEXT, -- JSON array of test variables
      objective TEXT,
      status TEXT DEFAULT 'active',
      start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      end_date DATETIME,
      expected_sample_size INTEGER,
      actual_sample_size INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- A/B test variants
    CREATE TABLE IF NOT EXISTS conversation_test_variants (
      id TEXT PRIMARY KEY,
      test_id TEXT NOT NULL,
      name TEXT NOT NULL,
      parameters TEXT, -- JSON object with variant parameters
      description TEXT,
      weight REAL DEFAULT 1.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_id) REFERENCES conversation_ab_tests(id)
    );

    -- Candidate assignments to test variants
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

    -- Conversation performance tracking
    CREATE TABLE IF NOT EXISTS conversation_performance_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id TEXT,
      variant_id TEXT,
      candidate_id TEXT NOT NULL,
      event_type TEXT NOT NULL, -- 'message_sent', 'replied', 'scheduled', 'confirmed'
      event_data TEXT, -- JSON with event-specific data
      response_time_ms INTEGER,
      session_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_id) REFERENCES conversation_ab_tests(id),
      FOREIGN KEY (variant_id) REFERENCES conversation_test_variants(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Language preferences for candidates
    CREATE TABLE IF NOT EXISTS candidate_language_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL UNIQUE,
      primary_language TEXT, -- 'en', 'zh', 'ms', 'ta', 'hi'
      region TEXT, -- 'SG', 'MY', 'CN', etc.
      detected_language TEXT, -- Auto-detected language
      detection_confidence REAL,
      detection_sources TEXT, -- JSON array of detection sources
      cultural_adaptation TEXT, -- JSON object with cultural settings
      manual_override INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- SLM conversation analytics
    CREATE TABLE IF NOT EXISTS slm_conversation_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      session_id TEXT,
      conversation_stage TEXT, -- 'pending', 'contacted', 'engaged', 'scheduled', 'interviewed', 'active'
      previous_stage TEXT,
      stage_duration_ms INTEGER,
      conversion_tactic TEXT, -- Type of FOMO/conversion tactic used
      template_type TEXT,
      language_used TEXT,
      cultural_adaptation TEXT,
      prediction_score REAL, -- Conversion likelihood prediction
      actual_conversion INTEGER DEFAULT 0,
      metadata TEXT, -- JSON with additional analytics data
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Conversion funnel tracking
    CREATE TABLE IF NOT EXISTS conversion_funnel_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      stage_from TEXT,
      stage_to TEXT,
      duration_ms INTEGER,
      success INTEGER DEFAULT 1,
      metadata TEXT, -- JSON with event-specific data
      session_id TEXT,
      conversion_id TEXT, -- Links related events
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Predictive model training data
    CREATE TABLE IF NOT EXISTS conversation_prediction_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      feature_set TEXT, -- JSON object with all prediction features
      predicted_likelihood REAL,
      prediction_confidence REAL,
      actual_outcome INTEGER, -- 0 = no conversion, 1 = conversion
      prediction_accuracy REAL,
      model_version TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- FOMO campaign performance tracking
    CREATE TABLE IF NOT EXISTS fomo_campaign_performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_type TEXT, -- 'scarcity', 'social_proof', 'urgency', 'last_chance'
      intensity_level TEXT, -- 'low', 'medium', 'high', 'extreme'
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

    -- Real-time conversation monitoring
    CREATE TABLE IF NOT EXISTS conversation_monitoring (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      conversation_status TEXT, -- 'active', 'waiting_response', 'stalled', 'converted'
      last_message_sent DATETIME,
      last_response_received DATETIME,
      response_time_ms INTEGER,
      engagement_score REAL,
      urgency_level INTEGER, -- 1-10 scale
      requires_intervention INTEGER DEFAULT 0,
      hot_lead_score REAL,
      next_action TEXT,
      escalation_needed INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- =====================================================
    -- AI CHAT AUTO-REPLY SYSTEM
    -- =====================================================

    -- Global AI settings
    CREATE TABLE IF NOT EXISTS ai_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Per-conversation AI settings (overrides global)
    CREATE TABLE IF NOT EXISTS conversation_ai_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL UNIQUE,
      mode TEXT DEFAULT 'inherit', -- inherit | off | auto | suggest
      custom_instructions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Per-conversation SLM settings (overrides global)
    CREATE TABLE IF NOT EXISTS conversation_slm_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL UNIQUE,
      mode TEXT DEFAULT 'inherit', -- inherit | off | auto | interview_only
      custom_instructions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- AI response logs for quality monitoring
    CREATE TABLE IF NOT EXISTS ai_response_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      message_id INTEGER,
      incoming_message TEXT,
      ai_response TEXT NOT NULL,
      mode TEXT NOT NULL, -- auto | suggest
      status TEXT DEFAULT 'generated', -- generated | sent | edited | rejected | dismissed
      edited_response TEXT,
      admin_action TEXT, -- sent_as_is | edited | rejected | dismissed
      response_time_ms INTEGER,
      tokens_used INTEGER,
      intent_detected TEXT,
      source TEXT DEFAULT 'llm', -- llm | knowledge_base
      kb_entry_id INTEGER,
      confidence REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- FAQ knowledge base (manually curated)
    CREATE TABLE IF NOT EXISTS ai_faq (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL, -- pay | schedule | availability | general | onboarding | jobs
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      keywords TEXT, -- JSON array of trigger keywords
      priority INTEGER DEFAULT 0,
      use_count INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- =====================================================
    -- CHAT ML LEARNING SYSTEM (Path to SLM)
    -- =====================================================

    -- Knowledge base of learned Q&A pairs
    CREATE TABLE IF NOT EXISTS ml_knowledge_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      question_normalized TEXT, -- Lowercase, stripped punctuation for matching
      question_tokens TEXT, -- JSON array of tokens for TF-IDF
      answer TEXT NOT NULL,
      intent TEXT,
      category TEXT,
      confidence REAL DEFAULT 0.5,
      use_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0, -- Times admin approved as-is
      edit_count INTEGER DEFAULT 0, -- Times admin edited before sending
      reject_count INTEGER DEFAULT 0, -- Times admin rejected
      source TEXT DEFAULT 'llm', -- llm | admin | faq
      keywords TEXT,
      last_used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Store all interactions for training data export
    CREATE TABLE IF NOT EXISTS ml_training_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      input_text TEXT NOT NULL,
      output_text TEXT NOT NULL,
      context TEXT, -- JSON: conversation history, candidate info
      intent TEXT,
      category TEXT,
      quality_score REAL DEFAULT 0.5, -- 0-1 based on admin feedback
      was_edited INTEGER DEFAULT 0,
      edited_output TEXT,
      admin_approved INTEGER DEFAULT 0,
      source TEXT DEFAULT 'production', -- production | synthetic | faq
      exported INTEGER DEFAULT 0, -- Whether included in training export
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Track ML system performance daily
    CREATE TABLE IF NOT EXISTS ml_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_queries INTEGER DEFAULT 0,
      kb_hits INTEGER DEFAULT 0, -- Answered from knowledge base
      llm_calls INTEGER DEFAULT 0, -- Had to call Claude
      auto_replies_sent INTEGER DEFAULT 0,
      suggestions_shown INTEGER DEFAULT 0,
      suggestions_accepted INTEGER DEFAULT 0,
      suggestions_edited INTEGER DEFAULT 0,
      suggestions_rejected INTEGER DEFAULT 0,
      avg_confidence REAL,
      avg_response_time_ms INTEGER,
      estimated_cost_saved REAL, -- Estimated $ saved from KB hits
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ML system settings
    CREATE TABLE IF NOT EXISTS ml_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- =====================================================
    -- TELEGRAM GROUP POSTING
    -- =====================================================

    -- Telegram groups for job posting
    CREATE TABLE IF NOT EXISTS telegram_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'job_posting', -- job_posting | announcement | general
      member_count INTEGER,
      active INTEGER DEFAULT 1,
      last_post_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Track job posts to groups
    CREATE TABLE IF NOT EXISTS telegram_job_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      group_id INTEGER NOT NULL,
      variant_id INTEGER, -- Links to ad_variants for A/B testing
      message_id TEXT, -- Telegram message ID
      content TEXT, -- The actual ad content posted
      posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      post_hour INTEGER, -- 0-23 for timing analysis
      post_day INTEGER, -- 0=Sun, 6=Sat
      status TEXT DEFAULT 'sent', -- sent | deleted | failed
      views INTEGER DEFAULT 0,
      responses INTEGER DEFAULT 0, -- Candidate applications from this post
      FOREIGN KEY (job_id) REFERENCES jobs(id),
      FOREIGN KEY (group_id) REFERENCES telegram_groups(id)
    );

    -- Auto-post settings (key-value style)
    CREATE TABLE IF NOT EXISTS telegram_post_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Telegram auto-post settings (used by telegram-posting service)
    CREATE TABLE IF NOT EXISTS telegram_auto_post_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enabled INTEGER DEFAULT 0,
      post_on_job_create INTEGER DEFAULT 1,
      default_groups TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- =====================================================
    -- AD OPTIMIZATION ML (A/B Testing + Learning)
    -- =====================================================

    -- Ad variants generated for A/B testing
    CREATE TABLE IF NOT EXISTS ad_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      variant_key TEXT NOT NULL, -- 'A', 'B', 'C'
      content TEXT NOT NULL,
      variables TEXT, -- JSON: {"tone": "casual", "emoji_count": 3, "length": "short", "cta_style": "urgent"}
      variable_tested TEXT, -- The specific variable being tested in this A/B test
      variable_value TEXT, -- The value of that variable for this variant
      source TEXT DEFAULT 'llm', -- llm | optimized | manual
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      -- Note: No FK to jobs since ad training data should persist after jobs deleted
    );

    -- Track ad performance for each variant
    CREATE TABLE IF NOT EXISTS ad_performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id INTEGER NOT NULL,
      job_id TEXT NOT NULL,
      group_id INTEGER,
      message_id TEXT,
      posted_at DATETIME,
      post_hour INTEGER, -- 0-23
      post_day INTEGER, -- 0=Sun, 6=Sat
      impressions INTEGER DEFAULT 0, -- Estimated views
      clicks INTEGER DEFAULT 0, -- Link clicks if trackable
      responses INTEGER DEFAULT 0, -- Candidate applications/replies
      response_rate REAL, -- responses / impressions
      is_winner INTEGER DEFAULT 0, -- Won the A/B test
      measured_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      -- Note: No FKs since training data should persist even if variants/groups deleted
    );

    -- Learned variable preferences (updated after each A/B test)
    CREATE TABLE IF NOT EXISTS ad_variable_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variable_name TEXT NOT NULL, -- 'tone', 'emoji_count', 'length', 'cta_style', etc.
      variable_value TEXT NOT NULL, -- 'casual', '3', 'short', 'urgent', etc.
      job_category TEXT, -- Optional: different preferences per job type (null = global)
      win_count INTEGER DEFAULT 0,
      lose_count INTEGER DEFAULT 0,
      total_tests INTEGER DEFAULT 0,
      total_responses INTEGER DEFAULT 0,
      avg_response_rate REAL DEFAULT 0,
      confidence REAL DEFAULT 0.5, -- 0-1, higher = more confident
      last_tested_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(variable_name, variable_value, job_category)
    );

    -- Optimal posting times learned from data
    CREATE TABLE IF NOT EXISTS ad_timing_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hour INTEGER NOT NULL, -- 0-23
      day_of_week INTEGER, -- 0=Sun, 6=Sat (NULL = any day)
      job_category TEXT, -- Optional: different times for different job types
      post_count INTEGER DEFAULT 0,
      total_responses INTEGER DEFAULT 0,
      avg_response_rate REAL DEFAULT 0,
      score REAL DEFAULT 0.5, -- 0-1, higher = better time to post
      last_updated DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(hour, day_of_week, job_category)
    );

    -- Training data for Ad-generation SLM
    CREATE TABLE IF NOT EXISTS ad_training_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_details TEXT NOT NULL, -- JSON: job title, pay, location, requirements, slots
      ad_content TEXT NOT NULL, -- The ad text
      variables TEXT, -- JSON: what variables were used
      response_rate REAL, -- Performance score
      is_winner INTEGER DEFAULT 0, -- Won A/B test
      quality_score REAL DEFAULT 0.5, -- Calculated from response_rate + other factors
      job_category TEXT,
      exported INTEGER DEFAULT 0, -- Whether included in training export
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Ad ML settings
    CREATE TABLE IF NOT EXISTS ad_ml_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- =====================================================
    -- CANDIDATE OUTREACH SYSTEM
    -- =====================================================

    -- Outreach campaigns
    CREATE TABLE IF NOT EXISTS outreach_campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- job_invitation, bulk_opportunity, follow_up, re_engagement, skill_match, urgent_fill
      job_id TEXT, -- Optional: for job-specific campaigns
      target_criteria TEXT, -- JSON: criteria for candidate selection
      channels TEXT, -- JSON: ['whatsapp', 'email', 'sms', 'push_notification', 'in_app_message']
      priority INTEGER DEFAULT 2, -- 1=low, 2=medium, 3=high, 4=urgent
      status TEXT DEFAULT 'draft', -- draft, active, completed, failed, cancelled
      scheduled_at DATETIME,
      template_data TEXT, -- JSON: message templates and personalization data
      candidates_targeted INTEGER DEFAULT 0,
      messages_sent INTEGER DEFAULT 0,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    );

    -- Individual outreach messages log
    CREATE TABLE IF NOT EXISTS outreach_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      channel TEXT NOT NULL, -- whatsapp, email, sms, push_notification, in_app_message
      message TEXT NOT NULL,
      status TEXT DEFAULT 'pending', -- pending, sent, delivered, read, replied, failed
      error TEXT,
      campaign_type TEXT, -- For analytics
      external_message_id TEXT, -- Provider message ID
      delivered_at DATETIME,
      read_at DATETIME,
      replied_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES outreach_campaigns(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Candidate engagement tracking
    CREATE TABLE IF NOT EXISTS candidate_engagement (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      engagement_type TEXT NOT NULL, -- message_open, message_reply, job_view, job_apply, app_login, profile_update
      engagement_data TEXT, -- JSON: additional data about the engagement
      source TEXT, -- whatsapp, email, app, etc.
      campaign_id TEXT, -- If engagement is from a campaign
      job_id TEXT, -- If engagement is job-related
      engagement_score INTEGER DEFAULT 1, -- Weight of this engagement (1-10)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (campaign_id) REFERENCES outreach_campaigns(id),
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    );

    -- Follow-up sequences
    CREATE TABLE IF NOT EXISTS follow_up_sequences (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      trigger_type TEXT NOT NULL, -- no_response, job_declined, job_completed, onboarding_incomplete
      trigger_conditions TEXT, -- JSON: conditions for triggering
      sequence_data TEXT, -- JSON: array of follow-up steps
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Follow-up sequence instances (active follow-ups for specific candidates)
    CREATE TABLE IF NOT EXISTS follow_up_instances (
      id TEXT PRIMARY KEY,
      sequence_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      trigger_event TEXT, -- What triggered this sequence
      trigger_data TEXT, -- JSON: data about the trigger event
      current_step INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active', -- active, paused, completed, cancelled
      next_action_at DATETIME,
      completed_steps TEXT DEFAULT '[]', -- JSON: array of completed step IDs
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (sequence_id) REFERENCES follow_up_sequences(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Candidate communication preferences
    CREATE TABLE IF NOT EXISTS candidate_communication_preferences (
      candidate_id TEXT PRIMARY KEY,
      whatsapp_enabled INTEGER DEFAULT 1,
      email_enabled INTEGER DEFAULT 1,
      sms_enabled INTEGER DEFAULT 1,
      push_enabled INTEGER DEFAULT 1,
      job_alerts_enabled INTEGER DEFAULT 1,
      marketing_enabled INTEGER DEFAULT 1,
      frequency_preference TEXT DEFAULT 'normal', -- low, normal, high
      best_contact_time TEXT DEFAULT 'anytime', -- morning, afternoon, evening, anytime
      timezone TEXT DEFAULT 'Asia/Singapore',
      do_not_contact_until DATETIME, -- Temporary communication pause
      unsubscribed_channels TEXT DEFAULT '[]', -- JSON: array of unsubscribed channels
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- Campaign analytics and performance
    CREATE TABLE IF NOT EXISTS campaign_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id TEXT NOT NULL,
      metric_name TEXT NOT NULL, -- sent_count, delivered_count, open_rate, response_rate, conversion_rate, etc.
      metric_value REAL NOT NULL,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES outreach_campaigns(id)
    );

    -- =====================================================
    -- END OF OUTREACH SYSTEM TABLES
    -- =====================================================

    -- =====================================================
    -- END OF AI/ML TABLES
    -- =====================================================

    -- Admin onboarding progress
    CREATE TABLE IF NOT EXISTS admin_onboarding (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT DEFAULT 'admin',
      step_id TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at DATETIME,
      UNIQUE(user_id, step_id)
    );

    -- Admin achievements (gamify the admin experience)
    CREATE TABLE IF NOT EXISTS admin_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT DEFAULT 'admin',
      achievement_id TEXT NOT NULL,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indices for performance
    CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
    CREATE INDEX IF NOT EXISTS idx_candidates_referral_code ON candidates(referral_code);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(job_date);
    CREATE INDEX IF NOT EXISTS idx_deployments_candidate ON deployments(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_deployments_job ON deployments(job_id);
    CREATE INDEX IF NOT EXISTS idx_availability_candidate_date ON candidate_availability(candidate_id, date);
    CREATE INDEX IF NOT EXISTS idx_notifications_candidate ON notifications(candidate_id, read);
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
    CREATE INDEX IF NOT EXISTS idx_tender_alerts_active ON tender_alerts(active);
    CREATE INDEX IF NOT EXISTS idx_job_match_scores ON job_match_scores(candidate_id, score);

    -- Additional indexes for query performance
    CREATE INDEX IF NOT EXISTS idx_payments_candidate ON payments(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);
    CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
    CREATE INDEX IF NOT EXISTS idx_xp_transactions_candidate ON xp_transactions(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_messages_candidate_created ON messages(candidate_id, created_at);

    -- AI/ML indexes for performance
    CREATE INDEX IF NOT EXISTS idx_ai_response_logs_candidate ON ai_response_logs(candidate_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_response_logs_status ON ai_response_logs(status);
    CREATE INDEX IF NOT EXISTS idx_ml_knowledge_base_confidence ON ml_knowledge_base(confidence);
    CREATE INDEX IF NOT EXISTS idx_ml_knowledge_base_category ON ml_knowledge_base(category);
    CREATE INDEX IF NOT EXISTS idx_ml_training_data_quality ON ml_training_data(quality_score);
    CREATE INDEX IF NOT EXISTS idx_ml_metrics_date ON ml_metrics(date);
    CREATE INDEX IF NOT EXISTS idx_telegram_job_posts_job ON telegram_job_posts(job_id);
    CREATE INDEX IF NOT EXISTS idx_telegram_job_posts_group ON telegram_job_posts(group_id);
    CREATE INDEX IF NOT EXISTS idx_ad_variants_job ON ad_variants(job_id);
    CREATE INDEX IF NOT EXISTS idx_ad_performance_variant ON ad_performance(variant_id);
    CREATE INDEX IF NOT EXISTS idx_ad_performance_job ON ad_performance(job_id);
    CREATE INDEX IF NOT EXISTS idx_ad_variable_scores_variable ON ad_variable_scores(variable_name, variable_value);
    CREATE INDEX IF NOT EXISTS idx_ad_timing_scores_hour ON ad_timing_scores(hour, day_of_week);

    -- =====================================================
    -- CONSULTANT ANALYTICS TABLES
    -- =====================================================

    -- Daily performance metrics for individual consultants
    CREATE TABLE IF NOT EXISTS consultant_performance_daily (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        consultant_id TEXT NOT NULL,
        date DATE NOT NULL,

        -- Efficiency KPIs
        candidates_scheduled INTEGER DEFAULT 0,
        candidates_converted INTEGER DEFAULT 0,
        interviews_conducted INTEGER DEFAULT 0,
        no_show_rate REAL DEFAULT 0,
        scheduling_speed_minutes REAL DEFAULT 0,
        capacity_utilization_percent REAL DEFAULT 0,

        -- Quality KPIs
        candidate_satisfaction_score REAL DEFAULT 0,
        interview_completion_rate REAL DEFAULT 0,
        conversion_to_hire_rate REAL DEFAULT 0,
        reliability_score REAL DEFAULT 0,
        feedback_quality_score REAL DEFAULT 0,

        -- Growth KPIs
        pipeline_velocity REAL DEFAULT 0,
        skill_development_score REAL DEFAULT 0,
        coaching_implementation_score REAL DEFAULT 0,
        process_improvement_suggestions INTEGER DEFAULT 0,
        retention_contribution_score REAL DEFAULT 0,

        -- Volume metrics
        total_interactions INTEGER DEFAULT 0,
        total_hours_worked REAL DEFAULT 0,
        productivity_score REAL DEFAULT 0,

        -- Composite scores
        efficiency_score REAL DEFAULT 0,
        quality_score REAL DEFAULT 0,
        growth_score REAL DEFAULT 0,
        overall_performance_score REAL DEFAULT 0,

        -- Contextual data
        workload_factor REAL DEFAULT 1.0,
        market_conditions_factor REAL DEFAULT 1.0,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(consultant_id, date)
    );

    -- KPI scores for team comparison and ranking
    CREATE TABLE IF NOT EXISTS consultant_kpi_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        consultant_id TEXT NOT NULL,
        calculation_period TEXT NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,

        efficiency_kpis TEXT DEFAULT '{}',
        quality_kpis TEXT DEFAULT '{}',
        growth_kpis TEXT DEFAULT '{}',

        scheduling_efficiency_score REAL DEFAULT 0,
        conversion_rate_score REAL DEFAULT 0,
        reliability_score REAL DEFAULT 0,
        satisfaction_score REAL DEFAULT 0,
        innovation_score REAL DEFAULT 0,
        mentoring_score REAL DEFAULT 0,

        weighted_efficiency_score REAL DEFAULT 0,
        weighted_quality_score REAL DEFAULT 0,
        weighted_growth_score REAL DEFAULT 0,
        overall_kpi_score REAL DEFAULT 0,

        efficiency_rank INTEGER,
        quality_rank INTEGER,
        growth_rank INTEGER,
        overall_rank INTEGER,
        percentile_rank REAL DEFAULT 0,

        team_average_score REAL DEFAULT 0,
        score_vs_team_average REAL DEFAULT 0,
        improvement_from_last_period REAL DEFAULT 0,

        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(consultant_id, calculation_period, period_start)
    );

    -- Performance alerts and threshold monitoring
    CREATE TABLE IF NOT EXISTS consultant_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        consultant_id TEXT,
        alert_type TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        title TEXT NOT NULL,
        description TEXT NOT NULL,

        trigger_metric TEXT,
        trigger_value REAL,
        threshold_value REAL,

        time_period TEXT,
        comparison_baseline TEXT,
        affected_kpis TEXT DEFAULT '[]',

        status TEXT DEFAULT 'active',
        priority_score INTEGER DEFAULT 0,
        auto_generated INTEGER DEFAULT 1,

        acknowledged_at DATETIME,
        acknowledged_by TEXT,
        resolved_at DATETIME,
        resolution_notes TEXT,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Coaching recommendations and improvement suggestions
    CREATE TABLE IF NOT EXISTS coaching_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        consultant_id TEXT NOT NULL,
        recommendation_type TEXT NOT NULL,
        category TEXT NOT NULL,

        title TEXT NOT NULL,
        description TEXT NOT NULL,
        detailed_guidance TEXT,

        target_kpi TEXT,
        current_performance REAL,
        target_performance REAL,
        estimated_impact_score REAL DEFAULT 0,

        action_steps TEXT DEFAULT '[]',
        resources_needed TEXT DEFAULT '[]',
        estimated_time_to_implement_hours REAL DEFAULT 0,
        difficulty_level TEXT DEFAULT 'medium',

        status TEXT DEFAULT 'pending',
        priority INTEGER DEFAULT 50,
        implementation_deadline DATE,

        baseline_measurement REAL,
        progress_measurements TEXT DEFAULT '[]',
        final_measurement REAL,
        improvement_achieved REAL,

        auto_generated INTEGER DEFAULT 1,
        generated_by TEXT DEFAULT 'analytics_engine',
        coach_assigned TEXT,
        consultant_feedback TEXT,
        coach_notes TEXT,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME
    );

    -- Team comparison and benchmarking data
    CREATE TABLE IF NOT EXISTS consultant_team_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        calculation_date DATE NOT NULL,
        period_type TEXT NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,

        total_consultants INTEGER DEFAULT 0,
        active_consultants INTEGER DEFAULT 0,

        performance_distribution TEXT DEFAULT '{}',
        kpi_averages TEXT DEFAULT '{}',
        kpi_ranges TEXT DEFAULT '{}',

        top_efficiency_consultant_id TEXT,
        top_quality_consultant_id TEXT,
        top_growth_consultant_id TEXT,
        top_overall_consultant_id TEXT,

        team_efficiency_trend REAL DEFAULT 0,
        team_quality_trend REAL DEFAULT 0,
        team_growth_trend REAL DEFAULT 0,
        overall_team_trend REAL DEFAULT 0,

        improvement_opportunities TEXT DEFAULT '[]',
        best_practices TEXT DEFAULT '[]',
        risk_areas TEXT DEFAULT '[]',

        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(calculation_date, period_type)
    );

    -- Achievement badges and recognition system
    CREATE TABLE IF NOT EXISTS consultant_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        consultant_id TEXT NOT NULL,
        achievement_type TEXT NOT NULL,
        achievement_name TEXT NOT NULL,
        description TEXT,

        criteria_met TEXT DEFAULT '{}',
        performance_period TEXT,

        badge_icon TEXT,
        badge_color TEXT,
        rarity TEXT DEFAULT 'common',
        points_awarded INTEGER DEFAULT 0,

        auto_awarded INTEGER DEFAULT 1,
        publicly_visible INTEGER DEFAULT 1,

        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Performance goals and targets
    CREATE TABLE IF NOT EXISTS consultant_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        consultant_id TEXT NOT NULL,
        goal_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,

        target_kpi TEXT,
        current_value REAL,
        target_value REAL,
        target_date DATE,

        status TEXT DEFAULT 'active',
        progress_percentage REAL DEFAULT 0,
        milestones TEXT DEFAULT '[]',

        coaching_plan_id INTEGER,
        support_provided TEXT DEFAULT '[]',

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        achieved_at DATETIME,
        FOREIGN KEY (coaching_plan_id) REFERENCES coaching_recommendations(id)
    );

    -- Consultant analytics performance indices
    CREATE INDEX IF NOT EXISTS idx_consultant_performance_daily_consultant_date ON consultant_performance_daily(consultant_id, date);
    CREATE INDEX IF NOT EXISTS idx_consultant_performance_daily_overall_score ON consultant_performance_daily(overall_performance_score);
    CREATE INDEX IF NOT EXISTS idx_consultant_kpi_scores_consultant_period ON consultant_kpi_scores(consultant_id, calculation_period, period_start);
    CREATE INDEX IF NOT EXISTS idx_consultant_kpi_scores_overall_rank ON consultant_kpi_scores(overall_rank);
    CREATE INDEX IF NOT EXISTS idx_consultant_alerts_consultant_status ON consultant_alerts(consultant_id, status);
    CREATE INDEX IF NOT EXISTS idx_consultant_alerts_severity_created ON consultant_alerts(severity, created_at);
    CREATE INDEX IF NOT EXISTS idx_coaching_recommendations_consultant_status ON coaching_recommendations(consultant_id, status);
    CREATE INDEX IF NOT EXISTS idx_coaching_recommendations_priority ON coaching_recommendations(priority);
    CREATE INDEX IF NOT EXISTS idx_consultant_team_analytics_date ON consultant_team_analytics(calculation_date);
    CREATE INDEX IF NOT EXISTS idx_consultant_achievements_consultant ON consultant_achievements(consultant_id, earned_at);
    CREATE INDEX IF NOT EXISTS idx_consultant_goals_consultant_status ON consultant_goals(consultant_id, status);

    -- ============================================================================
    -- BPO TENDER LIFECYCLE TABLE (7-stage pipeline management)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS bpo_tender_lifecycle (
      id TEXT PRIMARY KEY, -- UUID

      -- Source Tracking
      source_type TEXT NOT NULL, -- 'gebiz_active', 'gebiz_historical_renewal', 'manual_entry', 'competitor_intel'
      source_id INTEGER, -- ID from source table
      tender_no TEXT UNIQUE,

      -- Basic Info
      title TEXT NOT NULL,
      agency TEXT,
      description TEXT,
      category TEXT,

      -- Dates
      published_date DATE,
      closing_date DATE,
      contract_start_date DATE,
      contract_end_date DATE,

      -- Financial
      estimated_value REAL,
      our_bid_amount REAL,
      actual_contract_value REAL,
      estimated_cost REAL,
      estimated_margin REAL, -- Percentage

      -- Pipeline Stage
      stage TEXT DEFAULT 'new_opportunity',
      -- 'renewal_watch', 'new_opportunity', 'review', 'bidding', 'internal_approval', 'submitted', 'awarded', 'lost'

      stage_updated_at DATETIME,

      -- Go/No-Go Decision
      qualification_score INTEGER, -- 0-100 from Go/No-Go checklist
      qualification_details TEXT, -- JSON with checklist answers
      decision TEXT, -- 'go', 'no-go', 'maybe', 'pending'
      decision_made_at DATETIME,
      decision_made_by TEXT,
      decision_reasoning TEXT,

      -- Assignment
      assigned_to TEXT, -- User ID or name
      assigned_team TEXT, -- JSON array of team members

      -- Status Tracking
      is_urgent BOOLEAN DEFAULT 0,
      is_featured BOOLEAN DEFAULT 0,
      priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

      -- Win/Loss
      outcome TEXT, -- 'won', 'lost', 'pending'
      outcome_date DATE,
      winner TEXT, -- Supplier name if we lost
      loss_reason TEXT,

      -- Renewal Tracking (if this is a renewal opportunity)
      is_renewal BOOLEAN DEFAULT 0,
      renewal_id TEXT, -- References contract_renewals.id
      incumbent_supplier TEXT,

      -- Documents & Links
      external_url TEXT,
      documents TEXT, -- JSON array of document URLs

      -- Metadata
      tags TEXT, -- JSON array of tags
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_lifecycle_stage ON bpo_tender_lifecycle(stage);
    CREATE INDEX IF NOT EXISTS idx_lifecycle_closing ON bpo_tender_lifecycle(closing_date);
    CREATE INDEX IF NOT EXISTS idx_lifecycle_agency ON bpo_tender_lifecycle(agency);
    CREATE INDEX IF NOT EXISTS idx_lifecycle_assigned ON bpo_tender_lifecycle(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_lifecycle_outcome ON bpo_tender_lifecycle(outcome);
    CREATE INDEX IF NOT EXISTS idx_lifecycle_priority ON bpo_tender_lifecycle(priority);
    CREATE INDEX IF NOT EXISTS idx_lifecycle_renewal ON bpo_tender_lifecycle(is_renewal);
    CREATE INDEX IF NOT EXISTS idx_lifecycle_tender_no ON bpo_tender_lifecycle(tender_no);
  `);

  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Schema created successfully');
  }
}

/**
 * Run migration operations to add missing columns
 * @param {Database} db - SQLite database instance
 */
function runMigrations(db) {
  const migrations = [
    // Add ai_generated column to messages if not exists
    () => {
      try {
        db.exec(`ALTER TABLE messages ADD COLUMN ai_generated INTEGER DEFAULT 0`);
      } catch (e) {
        // Column already exists, ignore
      }
    },

    // Add ai_log_id column to messages if not exists
    () => {
      try {
        db.exec(`ALTER TABLE messages ADD COLUMN ai_log_id INTEGER`);
      } catch (e) {
        // Column already exists, ignore
      }
    },

    // Add missing columns to telegram_groups if not exists
    () => {
      try {
        db.exec(`ALTER TABLE telegram_groups ADD COLUMN type TEXT DEFAULT 'job_posting'`);
      } catch (e) {}
      try {
        db.exec(`ALTER TABLE telegram_groups ADD COLUMN active INTEGER DEFAULT 1`);
      } catch (e) {}
      try {
        db.exec(`ALTER TABLE telegram_groups ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
      } catch (e) {}
    },

    // Add keywords column to ml_knowledge_base if not exists
    () => {
      try {
        db.exec(`ALTER TABLE ml_knowledge_base ADD COLUMN keywords TEXT`);
      } catch (e) {}
    },

    // Add telegram_username column to candidates if not exists
    () => {
      try {
        db.exec(`ALTER TABLE candidates ADD COLUMN telegram_username TEXT`);
      } catch (e) {}
    },

    // Add google_id column to candidates if not exists
    () => {
      try {
        db.exec(`ALTER TABLE candidates ADD COLUMN google_id TEXT`);
      } catch (e) {}
    },

    // Add claimed columns to candidate_achievements if not exists
    () => {
      try {
        db.exec(`ALTER TABLE candidate_achievements ADD COLUMN claimed INTEGER DEFAULT 0`);
      } catch (e) {}
      try {
        db.exec(`ALTER TABLE candidate_achievements ADD COLUMN claimed_at DATETIME`);
      } catch (e) {}
    },

    // Add new gamification columns to candidates if not exists
    () => {
      try {
        db.exec(`ALTER TABLE candidates ADD COLUMN lifetime_xp INTEGER DEFAULT 0`);
      } catch (e) {}
      try {
        db.exec(`ALTER TABLE candidates ADD COLUMN current_points INTEGER DEFAULT 0`);
      } catch (e) {}
      try {
        db.exec(`ALTER TABLE candidates ADD COLUMN current_tier TEXT DEFAULT 'bronze'`);
      } catch (e) {}
    },

    // Add profile_flair column for Profile Flair reward
    () => {
      try {
        db.exec(`ALTER TABLE candidates ADD COLUMN profile_flair TEXT`);
      } catch (e) {}
    },

    // Add theme_preference column for Dark Mode Pro reward
    () => {
      try {
        db.exec(`ALTER TABLE candidates ADD COLUMN theme_preference TEXT DEFAULT 'default'`);
      } catch (e) {}
    },

    // Add action_type column to xp_transactions if not exists
    () => {
      try {
        db.exec(`ALTER TABLE xp_transactions ADD COLUMN action_type TEXT`);
      } catch (e) {}
    },

    // Add engagement tracking columns to candidates if not exists
    () => {
      try {
        db.exec(`ALTER TABLE candidates ADD COLUMN engagement_score INTEGER DEFAULT 0`);
      } catch (e) {}
      try {
        db.exec(`ALTER TABLE candidates ADD COLUMN engagement_tier TEXT DEFAULT 'inactive'`);
      } catch (e) {}
      try {
        db.exec(`ALTER TABLE candidates ADD COLUMN response_rate INTEGER DEFAULT 0`);
      } catch (e) {}
      try {
        db.exec(`ALTER TABLE candidates ADD COLUMN total_engagements INTEGER DEFAULT 0`);
      } catch (e) {}
      try {
        db.exec(`ALTER TABLE candidates ADD COLUMN last_engagement DATETIME`);
      } catch (e) {}
    },

    // Add SLM conversation settings table if not exists
    () => {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS conversation_slm_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_id TEXT NOT NULL UNIQUE,
            mode TEXT DEFAULT 'inherit',
            custom_instructions TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (candidate_id) REFERENCES candidates(id)
          )
        `);
      } catch (e) {
        console.warn('SLM conversation settings table creation warning:', e.message);
      }
    },

    // Add template response system tables if not exist
    () => {
      try {
        // Check if response_templates exists with old schema
        const tableInfo = db.prepare("PRAGMA table_info(response_templates)").all();
        const hasOldSchema = tableInfo.some(col => col.name === 'category'); // Old schema has 'category' not 'category_id'
        
        if (hasOldSchema) {
          console.warn('⚠️  Detected old template schema, recreating tables...');
          // Drop old tables
          db.exec(`
            DROP TABLE IF EXISTS template_variables;
            DROP TABLE IF EXISTS template_usage_log;
            DROP TABLE IF EXISTS template_escalations;
            DROP TABLE IF EXISTS response_templates;
            DROP TABLE IF EXISTS template_categories;
          `);
        }
        
        // Template categories table
        db.exec(`
          CREATE TABLE IF NOT EXISTS template_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            priority INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Response templates table
        db.exec(`
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
          )
        `);

        // Template variables table
        db.exec(`
          CREATE TABLE IF NOT EXISTS template_variables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER NOT NULL,
            variable_name TEXT NOT NULL,
            data_source TEXT NOT NULL,
            field_path TEXT NOT NULL,
            fallback_value TEXT DEFAULT '',
            format_type TEXT DEFAULT 'text',
            FOREIGN KEY (template_id) REFERENCES response_templates(id) ON DELETE CASCADE
          )
        `);

        // Template usage log table
        db.exec(`
          CREATE TABLE IF NOT EXISTS template_usage_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER,
            candidate_id TEXT,
            context TEXT,
            success INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Template escalations table
        db.exec(`
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
          )
        `);

        // Create indexes for performance
        db.exec(`CREATE INDEX IF NOT EXISTS idx_response_templates_category ON response_templates(category)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_template_usage_template ON template_usage_log(template_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_template_usage_candidate ON template_usage_log(candidate_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_template_escalations_candidate ON template_escalations(candidate_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_template_escalations_status ON template_escalations(status)`);
      } catch (e) {
        console.warn('Template tables creation warning:', e.message);
      }
    }
  ];

  // Run all migrations
  migrations.forEach((migration, index) => {
    try {
      migration();
    } catch (error) {
      console.warn(`Migration ${index + 1} warning:`, error.message);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Migrations completed');
  }
}

module.exports = {
  createSchema,
  runMigrations
};