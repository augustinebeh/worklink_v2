/**
 * Availability Calendar API
 * Manage candidate availability for better job matching
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');

// Get candidate availability for a date range
router.get('/:candidateId', (req, res) => {
  try {
    const { start_date, end_date, days = 30 } = req.query;
    const candidateId = req.params.candidateId;

    // Verify candidate exists
    const candidate = db.prepare('SELECT id, name FROM candidates WHERE id = ?').get(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    // Calculate date range
    const startDate = start_date || new Date().toISOString().split('T')[0];
    const endDate = end_date || addDays(startDate, parseInt(days));

    // Get availability
    const availability = db.prepare(`
      SELECT * FROM candidate_availability 
      WHERE candidate_id = ? AND date BETWEEN ? AND ?
      ORDER BY date ASC
    `).all(candidateId, startDate, endDate);

    // Get scheduled jobs in this range
    const scheduledJobs = db.prepare(`
      SELECT d.*, j.title, j.job_date, j.start_time, j.end_time, j.location
      FROM deployments d
      JOIN jobs j ON d.job_id = j.id
      WHERE d.candidate_id = ? AND j.job_date BETWEEN ? AND ?
      AND d.status IN ('assigned', 'confirmed')
      ORDER BY j.job_date ASC
    `).all(candidateId, startDate, endDate);

    // Build calendar view
    const calendar = buildCalendar(startDate, endDate, availability, scheduledJobs);

    res.json({
      success: true,
      data: {
        candidate: { id: candidate.id, name: candidate.name },
        dateRange: { start: startDate, end: endDate },
        availability,
        scheduledJobs,
        calendar,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Set availability for specific dates
router.post('/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const { dates } = req.body; // Array of { date, status, start_time?, end_time?, notes? }

    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ success: false, error: 'dates array required' });
    }

    const insertStmt = db.prepare(`
      INSERT INTO candidate_availability (candidate_id, date, status, start_time, end_time, notes)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(candidate_id, date) DO UPDATE SET
        status = excluded.status,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        notes = excluded.notes
    `);

    const results = [];
    for (const d of dates) {
      insertStmt.run(
        candidateId,
        d.date,
        d.status || 'available',
        d.start_time || null,
        d.end_time || null,
        d.notes || null
      );
      results.push({ date: d.date, status: d.status || 'available' });
    }

    // Trigger job matching for available dates
    const availableDates = dates.filter(d => d.status === 'available').map(d => d.date);
    if (availableDates.length > 0) {
      triggerJobMatching(candidateId, availableDates);
    }

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Set availability for a date range (bulk)
router.post('/:candidateId/range', (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const { start_date, end_date, status, start_time, end_time, exclude_days = [] } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, error: 'start_date and end_date required' });
    }

    const dates = [];
    let current = new Date(start_date);
    const end = new Date(end_date);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (!exclude_days.includes(dayOfWeek)) {
        dates.push({
          date: current.toISOString().split('T')[0],
          status: status || 'available',
          start_time,
          end_time,
        });
      }
      current.setDate(current.getDate() + 1);
    }

    const insertStmt = db.prepare(`
      INSERT INTO candidate_availability (candidate_id, date, status, start_time, end_time)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(candidate_id, date) DO UPDATE SET
        status = excluded.status,
        start_time = excluded.start_time,
        end_time = excluded.end_time
    `);

    for (const d of dates) {
      insertStmt.run(candidateId, d.date, d.status, d.start_time || null, d.end_time || null);
    }

    res.json({ success: true, data: { datesSet: dates.length, dates } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete availability for a date
router.delete('/:candidateId/:date', (req, res) => {
  try {
    db.prepare('DELETE FROM candidate_availability WHERE candidate_id = ? AND date = ?')
      .run(req.params.candidateId, req.params.date);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get available candidates for a specific job date
router.get('/match/job/:jobId', (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    // Find candidates available on job date
    const availableCandidates = db.prepare(`
      SELECT c.*, ca.status as availability_status, ca.start_time, ca.end_time
      FROM candidates c
      JOIN candidate_availability ca ON c.id = ca.candidate_id
      WHERE ca.date = ? AND ca.status = 'available' AND c.status = 'active'
      ORDER BY c.rating DESC, c.total_jobs_completed DESC
    `).all(job.job_date);

    // Also get candidates without explicit unavailability (assume available)
    const candidatesNoEntry = db.prepare(`
      SELECT c.*, 'default_available' as availability_status
      FROM candidates c
      WHERE c.status = 'active'
      AND c.id NOT IN (
        SELECT candidate_id FROM candidate_availability WHERE date = ?
      )
      AND c.id NOT IN (
        SELECT candidate_id FROM deployments d
        JOIN jobs j ON d.job_id = j.id
        WHERE j.job_date = ? AND d.status IN ('assigned', 'confirmed')
      )
      ORDER BY c.rating DESC
    `).all(job.job_date, job.job_date);

    const allAvailable = [...availableCandidates, ...candidatesNoEntry];

    res.json({
      success: true,
      data: {
        job: { id: job.id, title: job.title, date: job.job_date, slots: job.total_slots - job.filled_slots },
        availableCandidates: allAvailable,
        totalAvailable: allAvailable.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper: Build calendar view
function buildCalendar(startDate, endDate, availability, scheduledJobs) {
  const calendar = [];
  let current = new Date(startDate);
  const end = new Date(endDate);

  const availMap = {};
  availability.forEach(a => { availMap[a.date] = a; });

  const jobMap = {};
  scheduledJobs.forEach(j => {
    if (!jobMap[j.job_date]) jobMap[j.job_date] = [];
    jobMap[j.job_date].push(j);
  });

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const avail = availMap[dateStr];
    const jobs = jobMap[dateStr] || [];

    calendar.push({
      date: dateStr,
      dayOfWeek: current.getDay(),
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][current.getDay()],
      status: jobs.length > 0 ? 'booked' : (avail?.status || 'unset'),
      availability: avail || null,
      jobs,
    });

    current.setDate(current.getDate() + 1);
  }

  return calendar;
}

// Helper: Add days to date
function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

// Helper: Trigger job matching (async)
function triggerJobMatching(candidateId, dates) {
  // Find jobs on available dates that need workers
  const jobs = db.prepare(`
    SELECT * FROM jobs 
    WHERE job_date IN (${dates.map(() => '?').join(',')})
    AND status = 'open'
    AND filled_slots < total_slots
  `).all(...dates);

  if (jobs.length === 0) return;

  // Get candidate profile for matching
  const candidate = db.prepare(`
    SELECT *, 
      json_extract(skills, '$') as skills_list,
      json_extract(preferred_locations, '$') as locations_list
    FROM candidates WHERE id = ?
  `).get(candidateId);

  // Calculate match scores
  const insertMatch = db.prepare(`
    INSERT INTO job_match_scores (job_id, candidate_id, score, factors)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(job_id, candidate_id) DO UPDATE SET
      score = excluded.score,
      factors = excluded.factors,
      notified = 0
  `);

  for (const job of jobs) {
    const { score, factors } = calculateMatchScore(candidate, job);
    if (score >= 50) { // Only store good matches
      insertMatch.run(job.id, candidateId, score, JSON.stringify(factors));
    }
  }
}

// Helper: Calculate job match score
function calculateMatchScore(candidate, job) {
  const factors = {};
  let score = 50; // Base score

  // Rating bonus (up to +20)
  if (candidate.rating >= 4.5) {
    factors.rating = '+20 (Excellent rating)';
    score += 20;
  } else if (candidate.rating >= 4) {
    factors.rating = '+10 (Good rating)';
    score += 10;
  }

  // Experience bonus (up to +15)
  if (candidate.total_jobs_completed >= 50) {
    factors.experience = '+15 (50+ jobs)';
    score += 15;
  } else if (candidate.total_jobs_completed >= 20) {
    factors.experience = '+10 (20+ jobs)';
    score += 10;
  } else if (candidate.total_jobs_completed >= 5) {
    factors.experience = '+5 (5+ jobs)';
    score += 5;
  }

  // Streak bonus (up to +10)
  if (candidate.streak_days >= 7) {
    factors.streak = '+10 (7+ day streak)';
    score += 10;
  } else if (candidate.streak_days >= 3) {
    factors.streak = '+5 (3+ day streak)';
    score += 5;
  }

  // Level bonus (up to +5)
  if (candidate.level >= 5) {
    factors.level = '+5 (Level 5+)';
    score += 5;
  }

  return { score: Math.min(100, score), factors };
}

module.exports = router;
