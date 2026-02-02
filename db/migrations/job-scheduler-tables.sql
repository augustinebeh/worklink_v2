-- Job scheduler database tables

-- Monthly reports table
CREATE TABLE IF NOT EXISTS monthly_reports (
  id TEXT PRIMARY KEY,
  month_year TEXT NOT NULL,
  report_data TEXT NOT NULL, -- JSON data
  generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- System statistics table
CREATE TABLE IF NOT EXISTS system_statistics (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON data
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Job execution logs table
CREATE TABLE IF NOT EXISTS job_execution_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success', 'error'
  duration_ms INTEGER,
  result TEXT, -- JSON data
  error_message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for job execution logs
CREATE INDEX IF NOT EXISTS idx_job_logs_name ON job_execution_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_job_logs_created ON job_execution_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_job_logs_status ON job_execution_logs(status);