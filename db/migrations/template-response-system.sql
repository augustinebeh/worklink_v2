-- Template Response System Schema
-- Creates tables for the fact-based template response system

-- Template categories for organizing response templates
CREATE TABLE IF NOT EXISTS template_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  priority INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Response templates with fact-based content
CREATE TABLE IF NOT EXISTS response_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL UNIQUE,
  triggers TEXT DEFAULT '[]', -- JSON array of trigger keywords
  content TEXT NOT NULL,
  requires_real_data INTEGER DEFAULT 0,
  variables TEXT DEFAULT '[]', -- JSON array of variable definitions
  usage_count INTEGER DEFAULT 0,
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category) REFERENCES template_categories(name)
);

-- Template usage tracking
CREATE TABLE IF NOT EXISTS template_usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER,
  candidate_id TEXT,
  context TEXT, -- JSON with message context
  success INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES response_templates(id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

-- Escalations queue for admin handoff
CREATE TABLE IF NOT EXISTS template_escalations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT NOT NULL,
  reason TEXT,
  context TEXT, -- JSON with conversation context
  priority TEXT DEFAULT 'normal', -- normal, high, urgent
  status TEXT DEFAULT 'pending', -- pending, assigned, resolved
  assigned_to TEXT,
  resolved_at DATETIME,
  resolution_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_response_templates_category ON response_templates(category);
CREATE INDEX IF NOT EXISTS idx_template_usage_template ON template_usage_log(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_candidate ON template_usage_log(candidate_id);
CREATE INDEX IF NOT EXISTS idx_template_escalations_candidate ON template_escalations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_template_escalations_status ON template_escalations(status);
CREATE INDEX IF NOT EXISTS idx_template_escalations_assigned ON template_escalations(assigned_to);
