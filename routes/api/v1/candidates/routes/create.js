/**
 * Candidate Creation Routes
 * Handles creating new candidates
 * @module candidates/routes/create
 */

const express = require('express');
const { db } = require('../../../../../db');
const { authenticateAdmin } = require('../../../../../middleware/auth');
const { createValidationMiddleware } = require('../../../../../middleware/database-validation');
const { parseJSONFields, prepareCandidateForDB } = require('../helpers/avatar-utils');

const router = express.Router();

// Validation middleware for candidate creation
const validateCandidate = createValidationMiddleware('candidates');

/**
 * POST /
 * Create new candidate
 */
router.post('/', authenticateAdmin, validateCandidate, (req, res) => {
  try {
    const candidateData = req.body;

    // Check if email already exists
    const existingCandidate = db.prepare('SELECT id, email FROM candidates WHERE email = ?').get(candidateData.email);
    if (existingCandidate) {
      return res.status(409).json({
        success: false,
        error: 'Email already exists',
        conflictId: existingCandidate.id
      });
    }

    // Prepare candidate data for database
    const preparedData = prepareCandidateForDB({
      ...candidateData,
      status: candidateData.status || 'pending',
      tier: candidateData.tier || 1,
      level: candidateData.level || 1,
      xp: candidateData.xp || 0,
      available: candidateData.available !== undefined ? candidateData.available : true,
      interview_status: candidateData.interview_status || 'not_scheduled'
    }, true); // true = isNewCandidate, will generate avatar

    // Build insert query
    const fields = Object.keys(preparedData);
    const placeholders = fields.map(() => '?').join(', ');
    const values = fields.map(field => preparedData[field]);

    const insertQuery = `INSERT INTO candidates (${fields.join(', ')}) VALUES (${placeholders})`;
    const stmt = db.prepare(insertQuery);
    const result = stmt.run(...values);

    if (!result.lastInsertRowid) {
      return res.status(400).json({
        success: false,
        error: 'Failed to create candidate'
      });
    }

    // Get created candidate
    const newCandidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      data: parseJSONFields(newCandidate),
      message: 'Candidate created successfully',
      candidateId: result.lastInsertRowid
    });

  } catch (error) {
    console.error('Error creating candidate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create candidate',
      details: error.message
    });
  }
});

/**
 * POST /bulk
 * Create multiple candidates
 */
router.post('/bulk', authenticateAdmin, (req, res) => {
  try {
    const { candidates } = req.body;

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Candidates array is required and must not be empty'
      });
    }

    if (candidates.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 candidates can be created at once'
      });
    }

    const results = [];
    const errors = [];
    const transaction = db.transaction(() => {
      for (let i = 0; i < candidates.length; i++) {
        try {
          const candidateData = candidates[i];

          // Check email uniqueness
          const existingCandidate = db.prepare('SELECT id, email FROM candidates WHERE email = ?').get(candidateData.email);
          if (existingCandidate) {
            errors.push({
              index: i,
              email: candidateData.email,
              error: 'Email already exists',
              conflictId: existingCandidate.id
            });
            continue;
          }

          // Prepare data
          const preparedData = prepareCandidateForDB({
            ...candidateData,
            status: candidateData.status || 'pending',
            tier: candidateData.tier || 1,
            level: candidateData.level || 1,
            xp: candidateData.xp || 0,
            available: candidateData.available !== undefined ? candidateData.available : true,
            interview_status: candidateData.interview_status || 'not_scheduled'
          }, true); // true = isNewCandidate, will generate avatar for each

          // Insert candidate
          const fields = Object.keys(preparedData);
          const placeholders = fields.map(() => '?').join(', ');
          const values = fields.map(field => preparedData[field]);

          const insertQuery = `INSERT INTO candidates (${fields.join(', ')}) VALUES (${placeholders})`;
          const result = db.prepare(insertQuery).run(...values);

          results.push({
            index: i,
            candidateId: result.lastInsertRowid,
            email: candidateData.email,
            name: candidateData.name
          });

        } catch (error) {
          errors.push({
            index: i,
            email: candidateData.email || 'unknown',
            error: error.message
          });
        }
      }
    });

    // Execute transaction
    try {
      transaction();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Transaction failed',
        details: error.message
      });
    }

    res.status(201).json({
      success: true,
      message: `Bulk creation completed. ${results.length} candidates created, ${errors.length} errors.`,
      results: {
        created: results,
        errors: errors,
        summary: {
          total_requested: candidates.length,
          created: results.length,
          errors: errors.length
        }
      }
    });

  } catch (error) {
    console.error('Error in bulk candidate creation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process bulk candidate creation',
      details: error.message
    });
  }
});

/**
 * POST /:id/notes
 * Add note to candidate
 */
router.post('/:id/notes', authenticateAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { note, private: isPrivate = false } = req.body;

    if (!note || note.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Note content is required'
      });
    }

    // Check if candidate exists
    const candidate = db.prepare('SELECT id FROM candidates WHERE id = ?').get(id);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Create notes table if it doesn't exist
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS candidate_notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          candidate_id INTEGER NOT NULL,
          note TEXT NOT NULL,
          private BOOLEAN DEFAULT FALSE,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (candidate_id) REFERENCES candidates (id) ON DELETE CASCADE
        )
      `);
    } catch (tableError) {
      console.warn('Notes table may already exist:', tableError);
    }

    // Add note
    const result = db.prepare(`
      INSERT INTO candidate_notes (candidate_id, note, private, created_by, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, note.trim(), isPrivate ? 1 : 0, req.user?.id || req.user?.email || 'admin', new Date().toISOString());

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      noteId: result.lastInsertRowid,
      candidateId: id
    });

  } catch (error) {
    console.error('Error adding candidate note:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add note',
      details: error.message
    });
  }
});

module.exports = router;