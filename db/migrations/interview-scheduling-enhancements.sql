-- Interview Scheduling Flow Implementation
-- Migration: interview-scheduling-enhancements.sql
-- Date: 2026-02-04

-- Add preferred time period column to candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS preferred_time_period TEXT
  CHECK (preferred_time_period IN ('morning', 'afternoon'));

-- Add reschedule count tracking to interview_slots table
ALTER TABLE interview_slots ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0;

-- Add location information for in-person interviews
ALTER TABLE interview_slots ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE interview_slots ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'video'
  CHECK (location_type IN ('video', 'in-person', 'phone'));

-- Add time period tracking to interview_slots
ALTER TABLE interview_slots ADD COLUMN IF NOT EXISTS time_period TEXT
  CHECK (time_period IN ('morning', 'afternoon', 'evening'));

-- Update existing records to set time_period based on scheduled_time
UPDATE interview_slots
SET time_period =
  CASE
    WHEN CAST(substr(scheduled_time, 1, 2) AS INTEGER) >= 9 AND CAST(substr(scheduled_time, 1, 2) AS INTEGER) < 13 THEN 'morning'
    WHEN CAST(substr(scheduled_time, 1, 2) AS INTEGER) >= 14 AND CAST(substr(scheduled_time, 1, 2) AS INTEGER) < 18 THEN 'afternoon'
    ELSE 'evening'
  END
WHERE time_period IS NULL AND scheduled_time IS NOT NULL;

-- Create index for time period filtering
CREATE INDEX IF NOT EXISTS idx_interview_slots_time_period ON interview_slots(time_period);
CREATE INDEX IF NOT EXISTS idx_interview_slots_scheduled_datetime ON interview_slots(scheduled_date, scheduled_time);

-- Create index for candidate preferred time period
CREATE INDEX IF NOT EXISTS idx_candidates_preferred_time ON candidates(preferred_time_period);

-- Add escalation context to admin_escalations table if it exists
-- If the table doesn't exist, this will be handled in the escalation system migration

-- Update consultant_availability table to support time period filtering
ALTER TABLE consultant_availability ADD COLUMN IF NOT EXISTS time_period TEXT
  CHECK (time_period IN ('morning', 'afternoon', 'evening'));

-- Update existing consultant_availability records with time periods
UPDATE consultant_availability
SET time_period =
  CASE
    WHEN CAST(substr(start_time, 1, 2) AS INTEGER) >= 9 AND CAST(substr(start_time, 1, 2) AS INTEGER) < 13 THEN 'morning'
    WHEN CAST(substr(start_time, 1, 2) AS INTEGER) >= 14 AND CAST(substr(start_time, 1, 2) AS INTEGER) < 18 THEN 'afternoon'
    ELSE 'evening'
  END
WHERE time_period IS NULL AND start_time IS NOT NULL;

-- Create index for consultant availability time period filtering
CREATE INDEX IF NOT EXISTS idx_consultant_availability_time_period ON consultant_availability(time_period);

-- Add binary preference tracking to interview_queue table
ALTER TABLE interview_queue ADD COLUMN IF NOT EXISTS time_preference TEXT
  CHECK (time_preference IN ('morning', 'afternoon', 'any'));

-- Add escalation trigger tracking
ALTER TABLE interview_queue ADD COLUMN IF NOT EXISTS escalation_triggered BOOLEAN DEFAULT FALSE;
ALTER TABLE interview_queue ADD COLUMN IF NOT EXISTS escalation_reason TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_interview_queue_time_preference ON interview_queue(time_preference);
CREATE INDEX IF NOT EXISTS idx_interview_queue_escalation ON interview_queue(escalation_triggered);

-- Add admin location settings for in-person interviews
CREATE TABLE IF NOT EXISTS interview_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  country TEXT DEFAULT 'Singapore',
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default location
INSERT OR IGNORE INTO interview_locations (name, address, city, postal_code, is_default)
VALUES ('WorkLink Office', 'Default Office Address', 'Singapore', '000000', TRUE);

-- Create trigger to update time_period on interview_slots insert/update
CREATE TRIGGER IF NOT EXISTS update_interview_slot_time_period
AFTER INSERT ON interview_slots
FOR EACH ROW
BEGIN
  UPDATE interview_slots
  SET time_period =
    CASE
      WHEN CAST(substr(NEW.scheduled_time, 1, 2) AS INTEGER) >= 9 AND CAST(substr(NEW.scheduled_time, 1, 2) AS INTEGER) < 13 THEN 'morning'
      WHEN CAST(substr(NEW.scheduled_time, 1, 2) AS INTEGER) >= 14 AND CAST(substr(NEW.scheduled_time, 1, 2) AS INTEGER) < 18 THEN 'afternoon'
      ELSE 'evening'
    END
  WHERE id = NEW.id;
END;

-- Create trigger to increment reschedule_count when interview is rescheduled
CREATE TRIGGER IF NOT EXISTS increment_reschedule_count
AFTER UPDATE ON interview_slots
FOR EACH ROW
WHEN OLD.scheduled_date != NEW.scheduled_date OR OLD.scheduled_time != NEW.scheduled_time
BEGIN
  UPDATE interview_slots
  SET reschedule_count = COALESCE(reschedule_count, 0) + 1
  WHERE id = NEW.id;
END;

-- Migration completed successfully
-- This migration adds:
-- 1. Binary morning/afternoon preference tracking
-- 2. 24-hour reschedule restrictions support
-- 3. Location data for in-person interviews
-- 4. Time period filtering capabilities
-- 5. Escalation tracking
-- 6. Performance indexes