/**
 * Database Indexes
 * Performance optimization indexes for all tables
 * 
 * @module database/schema/indexes
 */

const { db } = require('../config');

/**
 * Create database indexes for performance
 */
function createIndexes() {
  db.exec(`
    -- =====================================================
    -- PERFORMANCE INDEXES
    -- =====================================================

    -- Core table indexes
    CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
    CREATE INDEX IF NOT EXISTS idx_candidates_referral_code ON candidates(referral_code);
    CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
    
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(job_date);
    
    CREATE INDEX IF NOT EXISTS idx_deployments_candidate ON deployments(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_deployments_job ON deployments(job_id);
    
    CREATE INDEX IF NOT EXISTS idx_payments_candidate ON payments(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);
    
    CREATE INDEX IF NOT EXISTS idx_availability_candidate_date ON candidate_availability(candidate_id, date);
    
    -- Gamification indexes
    CREATE INDEX IF NOT EXISTS idx_xp_transactions_candidate ON xp_transactions(candidate_id);
    
    -- Messaging indexes
    CREATE INDEX IF NOT EXISTS idx_messages_candidate_created ON messages(candidate_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_candidate ON notifications(candidate_id, read);
    
    -- Referral indexes
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
    
    -- Tender indexes
    CREATE INDEX IF NOT EXISTS idx_tender_alerts_active ON tender_alerts(active);
    
    -- Matching indexes
    CREATE INDEX IF NOT EXISTS idx_job_match_scores ON job_match_scores(candidate_id, score);
    
    -- AI/ML indexes
    CREATE INDEX IF NOT EXISTS idx_ai_response_logs_candidate ON ai_response_logs(candidate_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_response_logs_status ON ai_response_logs(status);
    CREATE INDEX IF NOT EXISTS idx_ml_knowledge_base_confidence ON ml_knowledge_base(confidence);
    CREATE INDEX IF NOT EXISTS idx_ml_knowledge_base_category ON ml_knowledge_base(category);
    CREATE INDEX IF NOT EXISTS idx_ml_training_data_quality ON ml_training_data(quality_score);
    CREATE INDEX IF NOT EXISTS idx_ml_metrics_date ON ml_metrics(date);
    
    -- Telegram indexes
    CREATE INDEX IF NOT EXISTS idx_telegram_job_posts_job ON telegram_job_posts(job_id);
    CREATE INDEX IF NOT EXISTS idx_telegram_job_posts_group ON telegram_job_posts(group_id);
    
    -- Ad optimization indexes
    CREATE INDEX IF NOT EXISTS idx_ad_variants_job ON ad_variants(job_id);
    CREATE INDEX IF NOT EXISTS idx_ad_performance_variant ON ad_performance(variant_id);
    CREATE INDEX IF NOT EXISTS idx_ad_performance_job ON ad_performance(job_id);
    CREATE INDEX IF NOT EXISTS idx_ad_variable_scores_variable ON ad_variable_scores(variable_name, variable_value);
    CREATE INDEX IF NOT EXISTS idx_ad_timing_scores_hour ON ad_timing_scores(hour, day_of_week);

    -- =====================================================
    -- COMPOSITE & MISSING FK INDEXES
    -- =====================================================

    -- Composite index for deployment lookups (candidate + job pairs)
    CREATE INDEX IF NOT EXISTS idx_deployments_candidate_job ON deployments(candidate_id, job_id);
    CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);

    -- Jobs FK column (client lookups / joins)
    CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs(client_id);

    -- Referrals: referred_id for reverse lookups
    CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);

    -- Messages: unread filtering
    CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);

    -- Reward purchases: candidate lookups
    CREATE INDEX IF NOT EXISTS idx_reward_purchases_candidate ON reward_purchases(candidate_id);

    -- Candidate borders: candidate lookups
    CREATE INDEX IF NOT EXISTS idx_candidate_borders_candidate ON candidate_borders(candidate_id);

    -- Notification log: candidate lookups
    CREATE INDEX IF NOT EXISTS idx_notification_log_candidate ON notification_log(candidate_id);

    -- Streak protection: candidate lookups
    CREATE INDEX IF NOT EXISTS idx_streak_protection_candidate ON streak_protection(candidate_id);

    -- Push queue: status for processing pending notifications
    CREATE INDEX IF NOT EXISTS idx_push_queue_status ON push_queue(status);
    CREATE INDEX IF NOT EXISTS idx_push_queue_candidate ON push_queue(candidate_id);
  `);

  console.log('  ✅ Database indexes created');
}

module.exports = { createIndexes };
