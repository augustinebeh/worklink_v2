-- Migration: Worker Status Classification System
-- Adds fields and indexes to support pending vs active worker routing

-- Add worker_status field to candidates table (separate from general status)
-- worker_status: 'pending' | 'active' | 'inactive' | 'suspended'
ALTER TABLE candidates ADD COLUMN worker_status TEXT DEFAULT 'pending';

-- Add interview_stage tracking
-- interview_stage: 'not_started' | 'scheduled' | 'completed' | 'passed' | 'failed'
ALTER TABLE candidates ADD COLUMN interview_stage TEXT DEFAULT 'not_started';

-- Add interview completion timestamp
ALTER TABLE candidates ADD COLUMN interview_completed_at DATETIME;

-- Add SLM routing metadata
ALTER TABLE candidates ADD COLUMN slm_routing_context TEXT DEFAULT '{}'; -- JSON field for SLM context

-- Add last status change timestamp for tracking
ALTER TABLE candidates ADD COLUMN worker_status_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for efficient status queries
CREATE INDEX IF NOT EXISTS idx_candidates_worker_status ON candidates(worker_status);
CREATE INDEX IF NOT EXISTS idx_candidates_interview_stage ON candidates(interview_stage);
CREATE INDEX IF NOT EXISTS idx_candidates_status_composite ON candidates(worker_status, interview_stage);
CREATE INDEX IF NOT EXISTS idx_candidates_status_changed ON candidates(worker_status_changed_at);

-- Create worker status change log table for audit trail
CREATE TABLE IF NOT EXISTS worker_status_changes (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT, -- 'system' | admin_id
  reason TEXT,
  metadata TEXT DEFAULT '{}', -- JSON for additional context
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_status_changes_candidate ON worker_status_changes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_status_changes_timestamp ON worker_status_changes(created_at);

-- Create interview scheduling queue table (enhanced version)
CREATE TABLE IF NOT EXISTS interview_queue (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL UNIQUE,
  priority_score REAL DEFAULT 0.5, -- 0.0 to 1.0 priority
  urgency_level TEXT DEFAULT 'normal', -- 'low' | 'normal' | 'high' | 'urgent'
  preferred_times TEXT DEFAULT '{}', -- JSON: preferred time slots
  availability_notes TEXT,
  queue_status TEXT DEFAULT 'waiting', -- 'waiting' | 'scheduled' | 'completed' | 'cancelled'
  scheduled_interview_id TEXT,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interview_queue_status ON interview_queue(queue_status);
CREATE INDEX IF NOT EXISTS idx_interview_queue_priority ON interview_queue(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_interview_queue_urgency ON interview_queue(urgency_level);

-- Create interview slots table
CREATE TABLE IF NOT EXISTS interview_slots (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  interviewer_id TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 15,
  meeting_link TEXT,
  status TEXT DEFAULT 'scheduled', -- 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  interview_type TEXT DEFAULT 'verification', -- 'verification' | 'skills' | 'final'
  notes TEXT,
  result TEXT, -- 'passed' | 'failed' | 'pending'
  score INTEGER, -- 0-100
  feedback TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interview_slots_candidate ON interview_slots(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interview_slots_date ON interview_slots(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_interview_slots_status ON interview_slots(status);
CREATE INDEX IF NOT EXISTS idx_interview_slots_composite ON interview_slots(candidate_id, status);

-- Update existing candidates to have proper worker_status based on current status
UPDATE candidates
SET worker_status = CASE
  WHEN status = 'active' THEN 'active'
  WHEN status = 'lead' OR status = 'pending' THEN 'pending'
  WHEN status = 'inactive' THEN 'inactive'
  ELSE 'pending'
END,
worker_status_changed_at = CURRENT_TIMESTAMP
WHERE worker_status IS NULL OR worker_status = 'pending';

-- Insert initial status change records for existing candidates
INSERT INTO worker_status_changes (id, candidate_id, from_status, to_status, changed_by, reason)
SELECT
  'INIT_' || id,
  id,
  NULL,
  CASE
    WHEN status = 'active' THEN 'active'
    WHEN status = 'lead' OR status = 'pending' THEN 'pending'
    WHEN status = 'inactive' THEN 'inactive'
    ELSE 'pending'
  END,
  'system',
  'Initial worker status classification migration'
FROM candidates
WHERE id NOT IN (SELECT candidate_id FROM worker_status_changes);