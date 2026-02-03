-- Add conversation state table for persistent interview scheduling flows
-- This table tracks conversation context between messages to prevent infinite loops
-- and ensure proper slot filtering and booking confirmations

CREATE TABLE IF NOT EXISTS candidate_conversation_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT NOT NULL,
  conversation_flow TEXT NOT NULL,           -- 'scheduling_morning', 'scheduling_afternoon', etc.
  current_stage TEXT NOT NULL,               -- 'initial_offer', 'slots_offered', 'slot_selected', 'confirmed'
  time_preference TEXT,                      -- 'morning', 'afternoon', null
  shown_slots TEXT,                          -- JSON array of slots shown to user
  selected_slot_index INTEGER,               -- 0-based index of selected slot
  scheduling_context TEXT,                   -- Full JSON context
  last_message_content TEXT,                 -- Last user message for debugging
  expires_at DATETIME,                       -- Auto-cleanup after 24 hours
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_state_candidate ON candidate_conversation_state(candidate_id);
CREATE INDEX IF NOT EXISTS idx_conversation_state_expires ON candidate_conversation_state(expires_at);

-- Add columns to existing tables for enhanced functionality
-- Store user preference for future use
ALTER TABLE candidates ADD COLUMN preferred_time_period TEXT
  CHECK (preferred_time_period IN ('morning', 'afternoon'));

-- Track reschedule attempts
ALTER TABLE interview_slots ADD COLUMN reschedule_count INTEGER DEFAULT 0;

-- Store location for in-person interviews
ALTER TABLE interview_slots ADD COLUMN location TEXT;
ALTER TABLE interview_slots ADD COLUMN location_type TEXT DEFAULT 'in-person';