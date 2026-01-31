-- Seed Demo Account: Sarah Tan
-- Run this on the live server to create the demo account with test data

-- Create Sarah Tan candidate (or update if exists)
INSERT OR REPLACE INTO candidates (
  id, name, email, phone, status, source,
  xp, level, streak_days, total_jobs_completed,
  certifications, skills, preferred_locations,
  referral_code, referral_tier, total_referral_earnings,
  total_incentives_earned, total_earnings, rating,
  online_status, created_at, updated_at
) VALUES (
  'CND001',
  'Sarah Tan',
  'sarah.tan@email.com',
  '+6591234567',
  'active',
  'direct',
  15383,  -- XP for level 10
  10,     -- Level
  5,      -- Active streak
  42,     -- Jobs completed
  '["Food Safety", "First Aid"]',
  '["Customer Service", "Cash Handling", "Event Support"]',
  '["Central", "East", "West"]',
  'SARAH001',
  2,      -- Silver tier
  180.00, -- Referral earnings
  250.00, -- Incentives
  8750.00, -- Total earnings
  4.8,    -- Rating
  'online',
  datetime('now', '-180 days'),
  datetime('now')
);

-- Create some completed deployments with payments
-- Deployment 1: Last week job
INSERT OR IGNORE INTO deployments (id, job_id, candidate_id, status, hours_worked, pay_rate, candidate_pay, created_at)
VALUES ('DEP_SARAH_001', 'JOB0001', 'CND001', 'completed', 8.0, 15.00, 120.00, datetime('now', '-7 days'));

INSERT OR IGNORE INTO payments (id, candidate_id, deployment_id, base_amount, incentive_amount, total_amount, hours_worked, status, paid_at, created_at)
VALUES ('PAY_SARAH_001', 'CND001', 'DEP_SARAH_001', 120.00, 0, 120.00, 8.0, 'paid', datetime('now', '-5 days'), datetime('now', '-7 days'));

-- Deployment 2: Two weeks ago
INSERT OR IGNORE INTO deployments (id, job_id, candidate_id, status, hours_worked, pay_rate, candidate_pay, created_at)
VALUES ('DEP_SARAH_002', 'JOB0002', 'CND001', 'completed', 6.0, 18.00, 108.00, datetime('now', '-14 days'));

INSERT OR IGNORE INTO payments (id, candidate_id, deployment_id, base_amount, incentive_amount, total_amount, hours_worked, status, paid_at, created_at)
VALUES ('PAY_SARAH_002', 'CND001', 'DEP_SARAH_002', 108.00, 20.00, 128.00, 6.0, 'paid', datetime('now', '-12 days'), datetime('now', '-14 days'));

-- Deployment 3: Three weeks ago
INSERT OR IGNORE INTO deployments (id, job_id, candidate_id, status, hours_worked, pay_rate, candidate_pay, created_at)
VALUES ('DEP_SARAH_003', 'JOB0004', 'CND001', 'completed', 8.0, 20.00, 160.00, datetime('now', '-21 days'));

INSERT OR IGNORE INTO payments (id, candidate_id, deployment_id, base_amount, incentive_amount, total_amount, hours_worked, status, paid_at, created_at)
VALUES ('PAY_SARAH_003', 'CND001', 'DEP_SARAH_003', 160.00, 0, 160.00, 8.0, 'paid', datetime('now', '-19 days'), datetime('now', '-21 days'));

-- Deployment 4: This month - pending payment
INSERT OR IGNORE INTO deployments (id, job_id, candidate_id, status, hours_worked, pay_rate, candidate_pay, created_at)
VALUES ('DEP_SARAH_004', 'JOB0005', 'CND001', 'completed', 5.0, 22.00, 110.00, datetime('now', '-3 days'));

INSERT OR IGNORE INTO payments (id, candidate_id, deployment_id, base_amount, incentive_amount, total_amount, hours_worked, status, created_at)
VALUES ('PAY_SARAH_004', 'CND001', 'DEP_SARAH_004', 110.00, 15.00, 125.00, 5.0, 'pending', datetime('now', '-3 days'));

-- Deployment 5: Yesterday - approved payment
INSERT OR IGNORE INTO deployments (id, job_id, candidate_id, status, hours_worked, pay_rate, candidate_pay, created_at)
VALUES ('DEP_SARAH_005', 'JOB0006', 'CND001', 'completed', 8.0, 16.00, 128.00, datetime('now', '-1 days'));

INSERT OR IGNORE INTO payments (id, candidate_id, deployment_id, base_amount, incentive_amount, total_amount, hours_worked, status, created_at)
VALUES ('PAY_SARAH_005', 'CND001', 'DEP_SARAH_005', 128.00, 0, 128.00, 8.0, 'approved', datetime('now', '-1 days'));

-- Add some XP transactions
INSERT OR IGNORE INTO xp_transactions (candidate_id, amount, reason, reference_id, created_at)
VALUES
  ('CND001', 100, 'Job Completed', 'DEP_SARAH_001', datetime('now', '-7 days')),
  ('CND001', 100, 'Job Completed', 'DEP_SARAH_002', datetime('now', '-14 days')),
  ('CND001', 150, 'Job Completed + Bonus', 'DEP_SARAH_003', datetime('now', '-21 days')),
  ('CND001', 100, 'Job Completed', 'DEP_SARAH_004', datetime('now', '-3 days')),
  ('CND001', 100, 'Job Completed', 'DEP_SARAH_005', datetime('now', '-1 days')),
  ('CND001', 50, 'Daily Login Streak', NULL, datetime('now', '-1 days')),
  ('CND001', 200, 'Referral Bonus', NULL, datetime('now', '-10 days'));

-- Verify the data was created
SELECT 'Created Sarah Tan:' as status;
SELECT id, name, email, level, xp, total_jobs_completed, total_earnings FROM candidates WHERE id = 'CND001';

SELECT 'Deployments:' as status;
SELECT COUNT(*) as count FROM deployments WHERE candidate_id = 'CND001';

SELECT 'Payments:' as status;
SELECT COUNT(*) as total, SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending FROM payments WHERE candidate_id = 'CND001';
