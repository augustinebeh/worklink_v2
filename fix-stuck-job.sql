-- Update job with ID JOBML8IVOVJ to "filled" status
UPDATE jobs 
SET status = 'filled' 
WHERE id = 'JOBML8IVOVJ' 
  AND filled_slots >= total_slots;

-- Verify the update
SELECT id, title, status, filled_slots, total_slots 
FROM jobs 
WHERE id = 'JOBML8IVOVJ';
