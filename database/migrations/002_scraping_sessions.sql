-- Migration: Add scraping_sessions table
-- Description: Track RSS scraping sessions and status

CREATE TABLE IF NOT EXISTS scraping_sessions (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'datagovsg',
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed')),
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT,
    keywords TEXT, -- JSON array of keywords
    max_results INTEGER DEFAULT 1000,
    records_scraped INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    error_message TEXT,
    notes TEXT
);