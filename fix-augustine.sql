-- Quick fix for Augustine Beh Google login issue
-- This changes status from 'pending' to 'verified' so you appear in candidates list

UPDATE candidates 
SET status = 'verified', 
    updated_at = datetime('now')
WHERE (name LIKE '%Augustine%' OR email LIKE '%augustine%')
  AND status = 'pending';

-- Verify it worked
SELECT id, name, email, status, source, created_at 
FROM candidates 
WHERE name LIKE '%Augustine%' OR email LIKE '%augustine%';
