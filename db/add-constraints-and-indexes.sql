-- Database Constraints and Indexes Migration
-- This file adds missing constraints and indexes for data integrity and performance

-- ====================================
-- ADD CHECK CONSTRAINTS
-- ====================================

-- Jobs table constraints
-- Ensure rates are positive and charge_rate >= pay_rate for profitability
ALTER TABLE jobs
ADD CONSTRAINT check_charge_rate CHECK (charge_rate > 0);

ALTER TABLE jobs
ADD CONSTRAINT check_pay_rate CHECK (pay_rate > 0);

ALTER TABLE jobs
ADD CONSTRAINT check_rate_markup CHECK (charge_rate >= pay_rate);

ALTER TABLE jobs
ADD CONSTRAINT check_slots CHECK (total_slots > 0 AND filled_slots >= 0 AND filled_slots <= total_slots);

-- Deployments table constraints
ALTER TABLE deployments
ADD CONSTRAINT check_deployment_charge_rate CHECK (charge_rate IS NULL OR charge_rate > 0);

ALTER TABLE deployments
ADD CONSTRAINT check_deployment_pay_rate CHECK (pay_rate IS NULL OR pay_rate > 0);

ALTER TABLE deployments
ADD CONSTRAINT check_deployment_hours CHECK (hours_worked IS NULL OR hours_worked >= 0);

-- Payments table constraints
ALTER TABLE payments
ADD CONSTRAINT check_base_amount CHECK (base_amount >= 0);

ALTER TABLE payments
ADD CONSTRAINT check_incentive_amount CHECK (incentive_amount >= 0);

ALTER TABLE payments
ADD CONSTRAINT check_total_amount CHECK (total_amount >= base_amount);

ALTER TABLE payments
ADD CONSTRAINT check_hours_worked CHECK (hours_worked > 0);

-- Candidates table constraints
ALTER TABLE candidates
ADD CONSTRAINT check_xp CHECK (xp >= 0);

ALTER TABLE candidates
ADD CONSTRAINT check_lifetime_xp CHECK (lifetime_xp >= 0);

ALTER TABLE candidates
ADD CONSTRAINT check_level CHECK (level >= 1);

ALTER TABLE candidates
ADD CONSTRAINT check_rating CHECK (rating IS NULL OR (rating >= 1.0 AND rating <= 5.0));

ALTER TABLE candidates
ADD CONSTRAINT check_total_earnings CHECK (total_earnings >= 0);

-- XP transactions constraints
ALTER TABLE xp_transactions
ADD CONSTRAINT check_xp_amount CHECK (
  (transaction_type = 'earned' AND amount > 0) OR
  (transaction_type = 'spent' AND amount < 0) OR
  (transaction_type = 'adjusted' AND amount != 0)
);

-- ====================================
-- ADD UNIQUE CONSTRAINTS
-- ====================================

-- Prevent duplicate payments for the same deployment
ALTER TABLE payments
ADD CONSTRAINT unique_deployment_payment UNIQUE (deployment_id);

-- Prevent duplicate deployments for same job/candidate
ALTER TABLE deployments
ADD CONSTRAINT unique_job_candidate UNIQUE (job_id, candidate_id);

-- ====================================
-- ADD MISSING INDEXES FOR PERFORMANCE
-- ====================================

-- Jobs table indexes - common query patterns
CREATE INDEX IF NOT EXISTS idx_jobs_status_date ON jobs(status, job_date DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_client_status ON jobs(client_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_featured ON jobs(featured, urgent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);

-- Deployments table indexes
CREATE INDEX IF NOT EXISTS idx_deployments_candidate_status ON deployments(candidate_id, status);
CREATE INDEX IF NOT EXISTS idx_deployments_job_status ON deployments(job_id, status);
CREATE INDEX IF NOT EXISTS idx_deployments_status_created ON deployments(status, created_at DESC);

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_candidate_status ON payments(candidate_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at DESC);

-- Candidates table indexes
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_source ON candidates(source);
CREATE INDEX IF NOT EXISTS idx_candidates_level ON candidates(level DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_xp ON candidates(xp DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_rating ON candidates(rating DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_phone ON candidates(phone);
CREATE INDEX IF NOT EXISTS idx_candidates_referral_code ON candidates(referral_code);

-- Messages table indexes - for chat performance
CREATE INDEX IF NOT EXISTS idx_messages_candidate_created ON messages(candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read, candidate_id);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_candidate_read ON notifications(candidate_id, read, created_at DESC);

-- XP transactions indexes
CREATE INDEX IF NOT EXISTS idx_xp_transactions_candidate ON xp_transactions(candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_type ON xp_transactions(transaction_type, created_at DESC);

-- Achievements and quests indexes
CREATE INDEX IF NOT EXISTS idx_candidate_achievements_candidate ON candidate_achievements(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_quests_candidate ON candidate_quests(candidate_id, status);

-- Training table indexes
CREATE INDEX IF NOT EXISTS idx_training_duration ON training(duration_minutes);

-- Tenders table indexes
CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status);
CREATE INDEX IF NOT EXISTS idx_tenders_closing_date ON tenders(closing_date);
CREATE INDEX IF NOT EXISTS idx_tenders_value ON tenders(estimated_value DESC);

-- ====================================
-- ADDITIONAL DATA INTEGRITY IMPROVEMENTS
-- ====================================

-- Add ON DELETE CASCADE for better referential integrity
-- Note: SQLite doesn't support adding foreign keys to existing tables,
-- so these would need to be implemented during table recreation

-- Example for future reference:
-- FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
-- FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE