/**
 * Candidate Scoring & Ranking Handler
 */

const { logger } = require('../../utils/structured-logger');
const { db } = require('../../db');

async function updateCandidateScoring() {
  logger.info('Starting candidate scoring updates', { module: 'job-scheduler' });

  try {
    const candidates = db.prepare(`
      SELECT c.*,
        COUNT(DISTINCT ja.id) as application_count,
        AVG(CASE WHEN ja.status = 'hired' THEN 1 ELSE 0 END) as hire_rate,
        COUNT(DISTINCT m.id) as message_count,
        MAX(c.last_login) as last_activity
      FROM candidates c
      LEFT JOIN job_applications ja ON c.id = ja.candidate_id
      LEFT JOIN messages m ON c.user_id = m.sender_id
      WHERE c.status = 'active'
      GROUP BY c.id
    `).all();

    let scoresUpdated = 0;
    let candidatesRanked = 0;

    for (const candidate of candidates) {
      try {
        const newScore = calculateCandidateScore(candidate);

        db.prepare(`
          UPDATE candidates
          SET score = ?, last_score_update = CURRENT_TIMESTAMP,
            ranking = (SELECT COUNT(*) + 1 FROM candidates c2 WHERE c2.score > ? AND c2.status = 'active')
          WHERE id = ?
        `).run(newScore, newScore, candidate.id);

        scoresUpdated++;
        candidatesRanked++;
      } catch (error) {
        logger.error('Failed to update candidate score', {
          module: 'job-scheduler', candidate_id: candidate.id, error: error.message
        });
      }
    }

    const stats = db.prepare(`
      SELECT AVG(score) as avg_score, MAX(score) as max_score, MIN(score) as min_score, COUNT(*) as total_candidates
      FROM candidates WHERE status = 'active' AND score IS NOT NULL
    `).get();

    return {
      type: 'candidate_scoring', status: 'completed',
      candidates_processed: candidates.length,
      scores_updated: scoresUpdated, candidates_ranked: candidatesRanked,
      statistics: stats, timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { type: 'candidate_scoring', status: 'error', error: error.message, timestamp: new Date().toISOString() };
  }
}

function calculateCandidateScore(candidate) {
  let score = 0;

  score += candidate.profile_picture ? 10 : 0;
  score += candidate.resume_path ? 15 : 0;
  score += candidate.skills ? 10 : 0;

  const daysSinceLogin = Math.floor((Date.now() - new Date(candidate.last_login).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceLogin <= 7) score += 20;
  else if (daysSinceLogin <= 30) score += 10;

  score += Math.min(candidate.application_count * 5, 25);
  score += candidate.hire_rate * 30;
  score += Math.min(candidate.message_count * 2, 20);

  return Math.min(Math.round(score), 100);
}

module.exports = { updateCandidateScoring };
