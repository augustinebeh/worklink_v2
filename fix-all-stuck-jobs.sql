-- Fix all jobs where filled_slots >= total_slots but status is not 'filled'
UPDATE jobs 
SET status = 'filled' 
WHERE filled_slots >= total_slots 
  AND status != 'filled'
  AND status != 'completed';

-- Show all updated jobs
SELECT id, title, status, filled_slots, total_slots, client_id
FROM jobs 
WHERE filled_slots >= total_slots;
