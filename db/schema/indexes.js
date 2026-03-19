/**
 * Database Indexes
 * @param {Database} db - SQLite database instance
 */
function createIndexes(db) {
  db.exec(`
    -- Core indexes
    CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
    CREATE INDEX IF NOT EXISTS idx_candidates_referral_code ON candidates(referral_code);
    CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(job_date);
    CREATE INDEX IF NOT EXISTS idx_deployments_candidate ON deployments(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_deployments_job ON deployments(job_id);
    CREATE INDEX IF NOT EXISTS idx_availability_candidate_date ON candidate_availability(candidate_id, date);
    CREATE INDEX IF NOT EXISTS idx_notifications_candidate ON notifications(candidate_id, read);
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
    CREATE INDEX IF NOT EXISTS idx_tender_alerts_active ON tender_alerts(active);
    CREATE INDEX IF NOT EXISTS idx_job_match_scores ON job_match_scores(candidate_id, score);
    CREATE INDEX IF NOT EXISTS idx_payments_candidate ON payments(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);
    CREATE INDEX IF NOT EXISTS idx_payments_deployment ON payments(deployment_id);
    CREATE INDEX IF NOT EXISTS idx_xp_transactions_candidate ON xp_transactions(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_messages_candidate_created ON messages(candidate_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_sender_read ON messages(sender, read);

    -- AI/ML indexes
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

    -- Consultant indexes
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

    -- Scraping indexes
    CREATE INDEX IF NOT EXISTS idx_active_tenders_status ON gebiz_active_tenders(status);
    CREATE INDEX IF NOT EXISTS idx_active_tenders_agency ON gebiz_active_tenders(agency);
    CREATE INDEX IF NOT EXISTS idx_active_tenders_closing ON gebiz_active_tenders(closing_date);
    CREATE INDEX IF NOT EXISTS idx_scraping_portals_key ON scraping_portals(portal_key);
    CREATE INDEX IF NOT EXISTS idx_scraping_portals_enabled ON scraping_portals(enabled);
    CREATE INDEX IF NOT EXISTS idx_scraping_jobs_type ON scraping_jobs_log(job_type);
    CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs_log(status);
    CREATE INDEX IF NOT EXISTS idx_scraping_alerts_type ON scraping_alerts(alert_type);
    CREATE INDEX IF NOT EXISTS idx_scraping_alerts_status ON scraping_alerts(status);

    -- BPO lifecycle indexes
    CREATE INDEX IF NOT EXISTS idx_lifecycle_stage ON bpo_tender_lifecycle(stage);
    CREATE INDEX IF NOT EXISTS idx_lifecycle_closing ON bpo_tender_lifecycle(closing_date);
    CREATE INDEX IF NOT EXISTS idx_lifecycle_agency ON bpo_tender_lifecycle(agency);
    CREATE INDEX IF NOT EXISTS idx_lifecycle_assigned ON bpo_tender_lifecycle(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_lifecycle_outcome ON bpo_tender_lifecycle(outcome);
    CREATE INDEX IF NOT EXISTS idx_lifecycle_priority ON bpo_tender_lifecycle(priority);
    CREATE INDEX IF NOT EXISTS idx_lifecycle_renewal ON bpo_tender_lifecycle(is_renewal);
    CREATE INDEX IF NOT EXISTS idx_lifecycle_tender_no ON bpo_tender_lifecycle(tender_no);

    -- Contract renewal indexes
    CREATE INDEX IF NOT EXISTS idx_contract_renewals_agency ON contract_renewals(agency);
    CREATE INDEX IF NOT EXISTS idx_contract_renewals_end_date ON contract_renewals(contract_end_date);
    CREATE INDEX IF NOT EXISTS idx_contract_renewals_status ON contract_renewals(engagement_status);
    CREATE INDEX IF NOT EXISTS idx_contract_renewals_probability ON contract_renewals(renewal_probability);
  `);

  // Performance indexes for tenders, gamification, and candidates
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status);
    CREATE INDEX IF NOT EXISTS idx_tenders_closing_date ON tenders(closing_date);
    CREATE INDEX IF NOT EXISTS idx_candidate_achievements_candidate ON candidate_achievements(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_candidate_quests_candidate ON candidate_quests(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_quests_active ON quests(active);
    CREATE INDEX IF NOT EXISTS idx_candidates_telegram_chat_id ON candidates(telegram_chat_id);
    CREATE INDEX IF NOT EXISTS idx_candidates_online_status ON candidates(online_status);
  `);
}

module.exports = { createIndexes };
