-- Simple Interview Scheduling Flow Implementation
-- Migration: simple-scheduling-enhancements.sql
-- Date: 2026-02-04

-- Create candidates table if it doesn't exist
CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'active', 'inactive'
  preferred_time_period TEXT CHECK (preferred_time_period IN ('morning', 'afternoon')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to interview_slots (using separate ALTER TABLE commands for SQLite compatibility)
ALTER TABLE interview_slots ADD COLUMN reschedule_count INTEGER DEFAULT 0;
ALTER TABLE interview_slots ADD COLUMN location TEXT;
ALTER TABLE interview_slots ADD COLUMN location_type TEXT DEFAULT 'video';
ALTER TABLE interview_slots ADD COLUMN time_period TEXT;

-- Add missing columns to interview_queue
ALTER TABLE interview_queue ADD COLUMN time_preference TEXT;
ALTER TABLE interview_queue ADD COLUMN escalation_triggered INTEGER DEFAULT 0;
ALTER TABLE interview_queue ADD COLUMN escalation_reason TEXT;

-- Add missing columns to consultant_availability
ALTER TABLE consultant_availability ADD COLUMN time_period TEXT;

-- Create interview_locations table
CREATE TABLE IF NOT EXISTS interview_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  country TEXT DEFAULT 'Singapore',
  is_default INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default location
INSERT OR IGNORE INTO interview_locations (name, address, city, postal_code, is_default)
VALUES ('WorkLink Office', 'Default Office Address', 'Singapore', '000000', 1);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_interview_slots_time_period ON interview_slots(time_period);
CREATE INDEX IF NOT EXISTS idx_candidates_preferred_time ON candidates(preferred_time_period);
CREATE INDEX IF NOT EXISTS idx_consultant_availability_time_period ON consultant_availability(time_period);
CREATE INDEX IF NOT EXISTS idx_interview_queue_time_preference ON interview_queue(time_preference);
CREATE INDEX IF NOT EXISTS idx_interview_queue_escalation ON interview_queue(escalation_triggered);

-- Update existing records to set time_period based on scheduled_time
UPDATE interview_slots
SET time_period =
  CASE
    WHEN CAST(substr(scheduled_time, 1, 2) AS INTEGER) >= 9 AND CAST(substr(scheduled_time, 1, 2) AS INTEGER) < 13 THEN 'morning'
    WHEN CAST(substr(scheduled_time, 1, 2) AS INTEGER) >= 14 AND CAST(substr(scheduled_time, 1, 2) AS INTEGER) < 18 THEN 'afternoon'
    ELSE 'evening'
  END
WHERE time_period IS NULL AND scheduled_time IS NOT NULL;

-- Update existing consultant_availability records with time periods
UPDATE consultant_availability
SET time_period =
  CASE
    WHEN CAST(substr(start_time, 1, 2) AS INTEGER) >= 9 AND CAST(substr(start_time, 1, 2) AS INTEGER) < 13 THEN 'morning'
    WHEN CAST(substr(start_time, 1, 2) AS INTEGER) >= 14 AND CAST(substr(start_time, 1, 2) AS INTEGER) < 18 THEN 'afternoon'
    ELSE 'evening'
  END
WHERE time_period IS NULL AND start_time IS NOT NULL;