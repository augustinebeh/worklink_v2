/**
 * 🕷️ RSS SCRAPER API
 * Manual trigger and status monitoring for GeBIZ RSS scraping
 * Integrates with existing gebiz-scraping service
 */

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Import scraping services
const dataGovSGClient = require('../../../services/gebiz-scraping/datagovsg-client');

const DB_PATH = path.join(__dirname, '../../../database/gebiz_intelligence.db');

// ============================================================================
// POST /api/v1/scraping/run - Manual trigger RSS scraping
// ============================================================================
router.post('/run', async (req, res) => {
  try {
    const db = new Database(DB_PATH);

    const {
      source = 'datagovsg',
      keywords = ['manpower', 'services', 'BPO', 'administrative'],
      max_results = 1000,
      user_id = 'system'
    } = req.body;

    const sessionId = uuidv4();

    // Log scraping session start
    db.prepare(`
      INSERT INTO scraping_sessions (
        id, source, status, started_at, user_id, keywords, max_results
      ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
    `).run(
      sessionId,
      source,
      'running',
      user_id,
      JSON.stringify(keywords),
      max_results
    );

    db.close();

    // Start scraping in background
    res.status(202).json({
      success: true,
      data: {
        session_id: sessionId,
        status: 'started',
        message: 'Scraping initiated. Check status for progress.'
      }
    });

    // Run scraping asynchronously
    (async () => {
      const db = new Database(DB_PATH);
      let scraped = 0;
      let inserted = 0;
      let errors = 0;

      try {
        console.log(`🚀 Starting scraping session ${sessionId}`);

        // Update status to running
        db.prepare(`
          UPDATE scraping_sessions
          SET status = 'running', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(sessionId);

        if (source === 'datagovsg') {
          const records = await dataGovSGClient.searchByKeywords(keywords, max_results);
          scraped = records.length;

          console.log(`📊 Retrieved ${scraped} records from Data.gov.sg`);

          for (const record of records) {
            try {
              const normalized = dataGovSGClient.normalizeRecord(record);

              // Check if record already exists
              const existing = db.prepare(`
                SELECT id FROM gebiz_historical_tenders
                WHERE tender_no = ? OR (agency = ? AND description = ?)
              `).get(normalized.tender_no, normalized.agency, normalized.description);

              if (!existing) {
                // Insert new record
                const id = uuidv4();
                db.prepare(`
                  INSERT INTO gebiz_historical_tenders (
                    id, tender_no, description, awarded_amount, supplier_name,
                    award_date, agency, category, contract_period_start,
                    contract_period_end, data_source, raw_data
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                  id,
                  normalized.tender_no,
                  normalized.description,
                  normalized.awarded_amount,
                  normalized.supplier_name,
                  normalized.award_date,
                  normalized.agency,
                  normalized.category,
                  normalized.contract_period_start,
                  normalized.contract_period_end,
                  'datagovsg',
                  normalized.raw_data
                );
                inserted++;
              }
            } catch (recordError) {
              console.error(`❌ Error processing record:`, recordError.message);
              errors++;
            }
          }
        }

        // Update session as completed
        db.prepare(`
          UPDATE scraping_sessions
          SET status = 'completed',
              completed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP,
              records_scraped = ?,
              records_inserted = ?,
              error_count = ?
          WHERE id = ?
        `).run(scraped, inserted, errors, sessionId);

        console.log(`✅ Scraping session ${sessionId} completed: ${inserted}/${scraped} records inserted`);

      } catch (error) {
        console.error(`❌ Scraping session ${sessionId} failed:`, error);

        db.prepare(`
          UPDATE scraping_sessions
          SET status = 'failed',
              error_message = ?,
              completed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP,
              records_scraped = ?,
              records_inserted = ?,
              error_count = ?
          WHERE id = ?
        `).run(error.message, scraped, inserted, errors, sessionId);
      }

      db.close();
    })();

  } catch (error) {
    console.error('Error starting scraping session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /api/v1/scraping/status - Get scraper status and recent sessions
// ============================================================================
router.get('/status', (req, res) => {
  try {
    const db = new Database(DB_PATH, { readonly: true });

    const { session_id, limit = 10 } = req.query;

    if (session_id) {
      // Get specific session
      const session = db.prepare(`
        SELECT * FROM scraping_sessions WHERE id = ?
      `).get(session_id);

      if (!session) {
        db.close();
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      // Parse JSON fields
      if (session.keywords) session.keywords = JSON.parse(session.keywords);

      db.close();
      return res.json({ success: true, data: session });
    }

    // Get recent sessions
    const sessions = db.prepare(`
      SELECT * FROM scraping_sessions
      ORDER BY started_at DESC
      LIMIT ?
    `).all(limit);

    // Parse JSON fields
    sessions.forEach(session => {
      if (session.keywords) session.keywords = JSON.parse(session.keywords);
    });

    // Get overall stats
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_sessions,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running_sessions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_sessions,
        SUM(records_scraped) as total_scraped,
        SUM(records_inserted) as total_inserted,
        MAX(started_at) as last_run_date
      FROM scraping_sessions
    `).get();

    // Get current running session if any
    const runningSession = db.prepare(`
      SELECT id, started_at, records_scraped, records_inserted
      FROM scraping_sessions
      WHERE status = 'running'
      ORDER BY started_at DESC
      LIMIT 1
    `).get();

    db.close();

    res.json({
      success: true,
      data: {
        is_running: !!runningSession,
        current_session: runningSession,
        recent_sessions: sessions,
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Error fetching scraping status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /api/v1/scraping/sessions - List all scraping sessions with filters
// ============================================================================
router.get('/sessions', (req, res) => {
  try {
    const db = new Database(DB_PATH, { readonly: true });

    const {
      status,
      source,
      date_from,
      date_to,
      limit = 50,
      offset = 0
    } = req.query;

    let query = 'SELECT * FROM scraping_sessions WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (source) {
      query += ' AND source = ?';
      params.push(source);
    }

    if (date_from) {
      query += ' AND DATE(started_at) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND DATE(started_at) <= ?';
      params.push(date_to);
    }

    query += ' ORDER BY started_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const sessions = db.prepare(query).all(...params);

    // Parse JSON fields
    sessions.forEach(session => {
      if (session.keywords) session.keywords = JSON.parse(session.keywords);
    });

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM scraping_sessions WHERE 1=1';
    const countParams = [];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    if (source) {
      countQuery += ' AND source = ?';
      countParams.push(source);
    }

    if (date_from) {
      countQuery += ' AND DATE(started_at) >= ?';
      countParams.push(date_from);
    }

    if (date_to) {
      countQuery += ' AND DATE(started_at) <= ?';
      countParams.push(date_to);
    }

    const { total } = db.prepare(countQuery).get(...countParams);

    db.close();

    res.json({
      success: true,
      data: sessions,
      meta: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching scraping sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// DELETE /api/v1/scraping/sessions/:id - Delete scraping session
// ============================================================================
router.delete('/sessions/:id', (req, res) => {
  try {
    const db = new Database(DB_PATH);

    // Check if session is running
    const session = db.prepare('SELECT status FROM scraping_sessions WHERE id = ?').get(req.params.id);

    if (!session) {
      db.close();
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.status === 'running') {
      db.close();
      return res.status(400).json({
        success: false,
        error: 'Cannot delete running session'
      });
    }

    const result = db.prepare('DELETE FROM scraping_sessions WHERE id = ?').run(req.params.id);

    db.close();

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({
      success: true,
      message: 'Scraping session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting scraping session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;