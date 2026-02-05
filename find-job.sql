-- Find job with title "1"
SELECT id, title, status, filled_slots, total_slots, client_id 
FROM jobs 
WHERE title = '1';
