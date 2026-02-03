/**
 * CONSULTANT ANALYTICS DATABASE SCHEMA
 * Advanced performance tracking and analytics tables
 */

-- =====================================================
-- CONSULTANT PERFORMANCE TRACKING TABLES
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
    scheduling_speed_minutes REAL DEFAULT 0, -- Avg time to schedule
    capacity_utilization_percent REAL DEFAULT 0,

    -- Quality KPIs
    candidate_satisfaction_score REAL DEFAULT 0,
    interview_completion_rate REAL DEFAULT 0,
    conversion_to_hire_rate REAL DEFAULT 0,
    reliability_score REAL DEFAULT 0,
    feedback_quality_score REAL DEFAULT 0,

    -- Growth KPIs
    pipeline_velocity REAL DEFAULT 0, -- Candidates moved through pipeline
    skill_development_score REAL DEFAULT 0,
    coaching_implementation_score REAL DEFAULT 0,
    process_improvement_suggestions INTEGER DEFAULT 0,
    retention_contribution_score REAL DEFAULT 0,

    -- Volume metrics
    total_interactions INTEGER DEFAULT 0,
    total_hours_worked REAL DEFAULT 0,
    productivity_score REAL DEFAULT 0,

    -- Composite scores
    efficiency_score REAL DEFAULT 0, -- 0-100 weighted score
    quality_score REAL DEFAULT 0,
    growth_score REAL DEFAULT 0,
    overall_performance_score REAL DEFAULT 0,

    -- Contextual data
    workload_factor REAL DEFAULT 1.0, -- Adjustment for workload
    market_conditions_factor REAL DEFAULT 1.0, -- Market difficulty adjustment

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(consultant_id, date)
);

-- KPI scores for team comparison and ranking
CREATE TABLE IF NOT EXISTS consultant_kpi_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consultant_id TEXT NOT NULL,
    calculation_period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Core KPI categories with weighted scores
    efficiency_kpis TEXT DEFAULT '{}', -- JSON object with individual efficiency metrics
    quality_kpis TEXT DEFAULT '{}', -- JSON object with quality metrics
    growth_kpis TEXT DEFAULT '{}', -- JSON object with growth metrics

    -- Individual KPI scores (0-100)
    scheduling_efficiency_score REAL DEFAULT 0,
    conversion_rate_score REAL DEFAULT 0,
    reliability_score REAL DEFAULT 0,
    satisfaction_score REAL DEFAULT 0,
    innovation_score REAL DEFAULT 0,
    mentoring_score REAL DEFAULT 0,

    -- Composite scores
    weighted_efficiency_score REAL DEFAULT 0,
    weighted_quality_score REAL DEFAULT 0,
    weighted_growth_score REAL DEFAULT 0,
    overall_kpi_score REAL DEFAULT 0,

    -- Ranking data
    efficiency_rank INTEGER,
    quality_rank INTEGER,
    growth_rank INTEGER,
    overall_rank INTEGER,
    percentile_rank REAL DEFAULT 0, -- 0-100 percentile

    -- Comparative metrics
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
    alert_type TEXT NOT NULL, -- 'performance_drop', 'capacity_warning', 'quality_issue', 'opportunity', 'achievement'
    severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    title TEXT NOT NULL,
    description TEXT NOT NULL,

    -- Alert triggers
    trigger_metric TEXT, -- Which metric triggered the alert
    trigger_value REAL, -- Value that triggered
    threshold_value REAL, -- Threshold that was crossed

    -- Alert context
    time_period TEXT, -- Period over which alert was triggered
    comparison_baseline TEXT, -- What it was compared against
    affected_kpis TEXT DEFAULT '[]', -- JSON array of affected KPIs

    -- Alert metadata
    status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'dismissed'
    priority_score INTEGER DEFAULT 0, -- 0-100 priority ranking
    auto_generated INTEGER DEFAULT 1,

    -- Resolution tracking
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
    recommendation_type TEXT NOT NULL, -- 'skill_development', 'process_improvement', 'efficiency_boost', 'quality_enhancement', 'career_growth'
    category TEXT NOT NULL, -- 'scheduling', 'conversion', 'communication', 'technical', 'leadership'

    title TEXT NOT NULL,
    description TEXT NOT NULL,
    detailed_guidance TEXT, -- Comprehensive coaching instructions

    -- Recommendation targeting
    target_kpi TEXT, -- Which KPI this aims to improve
    current_performance REAL, -- Current score in target area
    target_performance REAL, -- Goal score
    estimated_impact_score REAL DEFAULT 0, -- Expected improvement (0-100)

    -- Implementation guidance
    action_steps TEXT DEFAULT '[]', -- JSON array of specific actions
    resources_needed TEXT DEFAULT '[]', -- JSON array of required resources
    estimated_time_to_implement_hours REAL DEFAULT 0,
    difficulty_level TEXT DEFAULT 'medium', -- 'easy', 'medium', 'hard'

    -- Tracking and results
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    priority INTEGER DEFAULT 50, -- 0-100 priority score
    implementation_deadline DATE,

    -- Performance tracking
    baseline_measurement REAL, -- Performance before implementation
    progress_measurements TEXT DEFAULT '[]', -- JSON array of progress tracking
    final_measurement REAL, -- Performance after implementation
    improvement_achieved REAL, -- Actual improvement gained

    -- Metadata
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
    period_type TEXT NOT NULL, -- 'weekly', 'monthly', 'quarterly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Team-wide statistics
    total_consultants INTEGER DEFAULT 0,
    active_consultants INTEGER DEFAULT 0,

    -- Performance distribution
    performance_distribution TEXT DEFAULT '{}', -- JSON: score ranges and consultant counts
    kpi_averages TEXT DEFAULT '{}', -- JSON: average scores for each KPI
    kpi_ranges TEXT DEFAULT '{}', -- JSON: min/max for each KPI

    -- Top performers
    top_efficiency_consultant_id TEXT,
    top_quality_consultant_id TEXT,
    top_growth_consultant_id TEXT,
    top_overall_consultant_id TEXT,

    -- Team trends
    team_efficiency_trend REAL DEFAULT 0, -- Change from last period
    team_quality_trend REAL DEFAULT 0,
    team_growth_trend REAL DEFAULT 0,
    overall_team_trend REAL DEFAULT 0,

    -- Insights
    improvement_opportunities TEXT DEFAULT '[]', -- JSON array of team-wide opportunities
    best_practices TEXT DEFAULT '[]', -- JSON array of practices to share
    risk_areas TEXT DEFAULT '[]', -- JSON array of areas needing attention

    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(calculation_date, period_type)
);

-- Achievement badges and recognition system
CREATE TABLE IF NOT EXISTS consultant_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consultant_id TEXT NOT NULL,
    achievement_type TEXT NOT NULL, -- 'performance', 'improvement', 'milestone', 'innovation', 'teamwork'
    achievement_name TEXT NOT NULL,
    description TEXT,

    -- Achievement criteria
    criteria_met TEXT DEFAULT '{}', -- JSON: specific criteria that were met
    performance_period TEXT, -- Period over which achievement was earned

    -- Recognition details
    badge_icon TEXT,
    badge_color TEXT,
    rarity TEXT DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
    points_awarded INTEGER DEFAULT 0,

    -- Achievement metadata
    auto_awarded INTEGER DEFAULT 1,
    publicly_visible INTEGER DEFAULT 1,

    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance goals and targets
CREATE TABLE IF NOT EXISTS consultant_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consultant_id TEXT NOT NULL,
    goal_type TEXT NOT NULL, -- 'kpi_improvement', 'skill_development', 'productivity', 'quality'
    title TEXT NOT NULL,
    description TEXT,

    -- Goal specifications
    target_kpi TEXT,
    current_value REAL,
    target_value REAL,
    target_date DATE,

    -- Goal tracking
    status TEXT DEFAULT 'active', -- 'active', 'achieved', 'missed', 'cancelled'
    progress_percentage REAL DEFAULT 0,
    milestones TEXT DEFAULT '[]', -- JSON array of milestone tracking

    -- Support and coaching
    coaching_plan_id INTEGER, -- Links to coaching_recommendations
    support_provided TEXT DEFAULT '[]', -- JSON array of support given

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    achieved_at DATETIME,
    FOREIGN KEY (coaching_plan_id) REFERENCES coaching_recommendations(id)
);

-- =====================================================
-- PERFORMANCE ANALYTICS INDICES
-- =====================================================

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