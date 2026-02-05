/**
 * BPO Intelligence System - Final Database Verification
 * Complete verification with corrected test data
 */

const Database = require('better-sqlite3');
const fs = require('fs');

async function finalVerification() {
  console.log('='.repeat(80));
  console.log('BPO INTELLIGENCE SYSTEM - FINAL DATABASE VERIFICATION');
  console.log('='.repeat(80));

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0
  };

  function log(level, message, details = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${level.toUpperCase()}] ${message}`);
    if (details) console.log('  Details:', JSON.stringify(details, null, 2));

    if (level === 'pass') results.passed++;
    else if (level === 'fail') results.failed++;
    else if (level === 'warn') results.warnings++;
  }

  // 1. Database File Verification
  console.log('\n1. DATABASE FILE VERIFICATION');
  console.log('-'.repeat(40));

  const databases = [
    { name: 'Main WorkLink DB', path: './data/worklink.db' },
    { name: 'GeBiz Intelligence DB', path: './database/gebiz_intelligence.db' },
    { name: 'Legacy DB', path: './db/database.db' }
  ];

  databases.forEach(({ name, path }) => {
    if (fs.existsSync(path)) {
      const stats = fs.statSync(path);
      log('pass', `${name} exists and accessible`, {
        path: path,
        size: `${(stats.size / 1024).toFixed(2)} KB`,
        lastModified: stats.mtime.toISOString()
      });
    } else {
      log('fail', `${name} not found`, { path });
    }
  });

  // 2. Schema Validation
  console.log('\n2. SCHEMA VALIDATION');
  console.log('-'.repeat(40));

  const gebizPath = './database/gebiz_intelligence.db';
  if (fs.existsSync(gebizPath)) {
    const db = new Database(gebizPath, { readonly: true });

    // Check required BPO tables
    const bpoTables = [
      'bpo_tender_lifecycle',
      'contract_renewals',
      'alert_rules',
      'alert_history',
      'user_alert_preferences',
      'renewal_engagement_activities',
      'audit_log'
    ];

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const foundTables = tables.map(t => t.name);

    bpoTables.forEach(table => {
      if (foundTables.includes(table)) {
        const columns = db.prepare(`PRAGMA table_info(${table})`).all();
        log('pass', `Table ${table} exists with ${columns.length} columns`);
      } else {
        log('fail', `Required table ${table} missing`);
      }
    });

    // Check views
    const views = db.prepare("SELECT name FROM sqlite_master WHERE type='view'").all();
    log('pass', `Found ${views.length} database views`, {
      views: views.map(v => v.name)
    });

    db.close();
  }

  // 3. Migration Status
  console.log('\n3. MIGRATION STATUS');
  console.log('-'.repeat(40));

  const migrationFile = './database/migrations/001_renewal_alert_system.sql';
  if (fs.existsSync(migrationFile)) {
    log('pass', 'Migration file exists');

    // Check if migration applied
    const db = new Database(gebizPath, { readonly: true });
    const bpoTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bpo_tender_lifecycle'").get();

    if (bpoTable) {
      log('pass', 'Migration successfully applied - BPO tables exist');
    } else {
      log('fail', 'Migration not applied - BPO tables missing');
    }
    db.close();
  } else {
    log('fail', 'Migration file not found');
  }

  // 4. Data Connectivity Test (Corrected)
  console.log('\n4. DATA CONNECTIVITY TEST');
  console.log('-'.repeat(40));

  try {
    const db = new Database(gebizPath);

    // Corrected test data with required source_type
    const testData = {
      id: `TEST_${Date.now()}`,
      source_type: 'manual_entry', // Required field
      tender_no: `TEST_TENDER_${Date.now()}`,
      title: 'Database Verification Test Tender',
      agency: 'TEST_AGENCY',
      stage: 'new_opportunity'
    };

    // Test INSERT
    const insertSQL = `
      INSERT INTO bpo_tender_lifecycle (id, source_type, tender_no, title, agency, stage, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    const insertStmt = db.prepare(insertSQL);
    const insertResult = insertStmt.run(
      testData.id,
      testData.source_type,
      testData.tender_no,
      testData.title,
      testData.agency,
      testData.stage
    );

    if (insertResult.changes > 0) {
      log('pass', 'INSERT operation successful');

      // Test SELECT
      const selectStmt = db.prepare('SELECT * FROM bpo_tender_lifecycle WHERE id = ?');
      const row = selectStmt.get(testData.id);

      if (row) {
        log('pass', 'SELECT operation successful');

        // Test UPDATE
        const updateStmt = db.prepare('UPDATE bpo_tender_lifecycle SET stage = ? WHERE id = ?');
        const updateResult = updateStmt.run('review', testData.id);

        if (updateResult.changes > 0) {
          log('pass', 'UPDATE operation successful');
        } else {
          log('fail', 'UPDATE operation failed');
        }

        // Test DELETE (cleanup)
        const deleteStmt = db.prepare('DELETE FROM bpo_tender_lifecycle WHERE id = ?');
        const deleteResult = deleteStmt.run(testData.id);

        if (deleteResult.changes > 0) {
          log('pass', 'DELETE operation successful (cleanup completed)');
        } else {
          log('warn', 'DELETE operation failed (cleanup incomplete)');
        }
      } else {
        log('fail', 'SELECT operation failed - test data not found');
      }
    } else {
      log('fail', 'INSERT operation failed');
    }

    db.close();
  } catch (error) {
    log('fail', 'Database connectivity test failed', { error: error.message });
  }

  // 5. Service Integration
  console.log('\n5. SERVICE INTEGRATION');
  console.log('-'.repeat(40));

  // Check API service files
  const serviceFiles = [
    './admin/src/shared/services/api/lifecycle.service.js',
    './admin/src/shared/services/api/alert.service.js',
    './admin/src/shared/services/api/tender.service.js'
  ];

  serviceFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log('pass', `Service file exists: ${file}`);
    } else {
      log('warn', `Service file missing: ${file}`);
    }
  });

  // Check alert engine
  const alertEngine = './services/alerts/engine.js';
  if (fs.existsSync(alertEngine)) {
    log('pass', 'Alert engine service exists');
  } else {
    log('warn', 'Alert engine service missing');
  }

  // 6. Existing Data Analysis
  console.log('\n6. EXISTING DATA ANALYSIS');
  console.log('-'.repeat(40));

  try {
    const db = new Database(gebizPath, { readonly: true });

    // Check existing data counts
    const counts = {
      bpoTenders: db.prepare('SELECT COUNT(*) as count FROM bpo_tender_lifecycle').get().count,
      alertRules: db.prepare('SELECT COUNT(*) as count FROM alert_rules').get().count,
      renewals: db.prepare('SELECT COUNT(*) as count FROM contract_renewals').get().count,
      scrapingSessions: db.prepare('SELECT COUNT(*) as count FROM scraping_sessions').get().count
    };

    Object.entries(counts).forEach(([table, count]) => {
      if (count > 0) {
        log('pass', `${table}: ${count} records found`);
      } else {
        log('warn', `${table}: No data (expected for new system)`);
      }
    });

    // Check alert rules configuration
    const activeRules = db.prepare('SELECT COUNT(*) as count FROM alert_rules WHERE active = 1').get().count;
    log('pass', `Alert system: ${activeRules} active rules configured`);

    // Test views
    try {
      const pipelineStats = db.prepare('SELECT * FROM v_pipeline_summary').all();
      log('pass', 'Pipeline summary view working');
    } catch (error) {
      log('warn', 'Pipeline summary view has issues', { error: error.message });
    }

    db.close();
  } catch (error) {
    log('fail', 'Data analysis failed', { error: error.message });
  }

  // 7. Performance Test
  console.log('\n7. PERFORMANCE TEST');
  console.log('-'.repeat(40));

  try {
    const db = new Database(gebizPath, { readonly: true });

    // Test query performance
    const start = Date.now();
    const result = db.prepare(`
      SELECT
        COUNT(*) as total_records,
        COUNT(DISTINCT agency) as unique_agencies,
        COUNT(DISTINCT stage) as unique_stages
      FROM bpo_tender_lifecycle
    `).get();
    const duration = Date.now() - start;

    log('pass', `Performance test completed in ${duration}ms`, result);

    db.close();
  } catch (error) {
    log('fail', 'Performance test failed', { error: error.message });
  }

  // 8. Final Summary
  console.log('\n' + '='.repeat(80));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ PASSED: ${results.passed}`);
  console.log(`❌ FAILED: ${results.failed}`);
  console.log(`⚠️  WARNINGS: ${results.warnings}`);
  console.log(`📊 TOTAL: ${results.passed + results.failed + results.warnings}`);

  if (results.failed === 0) {
    console.log('\n🎉 BPO Intelligence System database is FULLY OPERATIONAL!');
  } else {
    console.log('\n⚠️  BPO Intelligence System has some issues that need attention.');
  }

  console.log('\n' + '='.repeat(80));

  return {
    success: results.failed === 0,
    summary: results
  };
}

// Run verification
if (require.main === module) {
  finalVerification().then((result) => {
    process.exit(result.success ? 0 : 1);
  }).catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
}

module.exports = { finalVerification };