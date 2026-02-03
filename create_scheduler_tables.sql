-- Interview Scheduler V2 Database Tables

-- Table 1: Conversation State (tracks scheduling flow)
CREATE TABLE IF NOT EXISTS interview_conversation_state (
  candidate_id TEXT PRIMARY KEY,
  current_stage TEXT NOT NULL,
  time_preference TEXT,
  shown_slots TEXT,
  selected_slot_index INTEGER,
  selected_date TEXT,
  selected_time TEXT,
  conversation_context TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_interview_state_expires 
ON interview_conversation_state(expires_at);

-- Table 2: Interview Slots (stores actual bookings)
CREATE TABLE IF NOT EXISTS interview_slots (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 15,
  status TEXT DEFAULT 'confirmed',
  zoom_link TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_interview_slots_candidate 
ON interview_slots(candidate_id);

CREATE INDEX IF NOT EXISTS idx_interview_slots_date 
ON interview_slots(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_interview_slots_status 
ON interview_slots(status);
