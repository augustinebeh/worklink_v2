/**
 * Fix Database Schema for Worker Status Classification
 *
 * Handles SQLite limitations with adding columns with non-constant defaults
 */

const { db } = require('./db');

function fixDatabaseSchema() {
  console.log('🔧 Fixing database schema for Worker Status Classification...\n');

  try {
    // Check current schema
    console.log('1. Checking current candidates table schema...');
    const tableInfo = db.prepare("PRAGMA table_info(candidates)").all();
    const columnNames = tableInfo.map(col => col.name);

    console.log(`   Current columns: ${columnNames.join(', ')}`);

    // Check which new columns are missing
    const requiredColumns = [
      'worker_status',
      'interview_stage',
      'interview_completed_at',
      'slm_routing_context',
      'worker_status_changed_at'
    ];

    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    console.log(`   Missing columns: ${missingColumns.join(', ') || 'None'}`);

    if (missingColumns.length === 0) {
      console.log('✅ All required columns already exist!');
      return true;
    }

    // Add missing columns one by one with proper handling
    console.log('\n2. Adding missing columns...');

    if (missingColumns.includes('worker_status')) {
      console.log('   Adding worker_status column...');
      db.prepare(`ALTER TABLE candidates ADD COLUMN worker_status TEXT DEFAULT 'pending'`).run();
      console.log('   ✅ Added worker_status');
    }

    if (missingColumns.includes('interview_stage')) {
      console.log('   Adding interview_stage column...');
      db.prepare(`ALTER TABLE candidates ADD COLUMN interview_stage TEXT DEFAULT 'not_started'`).run();
      console.log('   ✅ Added interview_stage');
    }

    if (missingColumns.includes('interview_completed_at')) {
      console.log('   Adding interview_completed_at column...');
      db.prepare(`ALTER TABLE candidates ADD COLUMN interview_completed_at DATETIME`).run();
      console.log('   ✅ Added interview_completed_at');
    }

    if (missingColumns.includes('slm_routing_context')) {
      console.log('   Adding slm_routing_context column...');
      db.prepare(`ALTER TABLE candidates ADD COLUMN slm_routing_context TEXT DEFAULT '{}'`).run();
      console.log('   ✅ Added slm_routing_context');
    }

    if (missingColumns.includes('worker_status_changed_at')) {
      console.log('   Adding worker_status_changed_at column...');
      db.prepare(`ALTER TABLE candidates ADD COLUMN worker_status_changed_at DATETIME`).run();
      console.log('   ✅ Added worker_status_changed_at');
    }

    // Update existing records with default values
    console.log('\n3. Updating existing records with default values...');

    // Set worker_status_changed_at for existing records
    const updatedRows = db.prepare(`
      UPDATE candidates
      SET worker_status_changed_at = CURRENT_TIMESTAMP
      WHERE worker_status_changed_at IS NULL
    `).run();

    console.log(`   ✅ Updated ${updatedRows.changes} records with timestamp`);

    // Update worker_status based on existing status and job completion
    const statusUpdates = db.prepare(`
      UPDATE candidates
      SET worker_status = CASE
        WHEN status = 'active' OR total_jobs_completed > 0 THEN 'active'
        WHEN status = 'inactive' THEN 'inactive'
        ELSE 'pending'
      END
      WHERE worker_status IS NULL OR worker_status = ''
    `).run();

    console.log(`   ✅ Updated ${statusUpdates.changes} worker status records`);

    // Create indexes
    console.log('\n4. Creating indexes...');

    try {
      db.prepare('CREATE INDEX IF NOT EXISTS idx_candidates_worker_status ON candidates(worker_status)').run();
      console.log('   ✅ Created worker_status index');

      db.prepare('CREATE INDEX IF NOT EXISTS idx_candidates_interview_stage ON candidates(interview_stage)').run();
      console.log('   ✅ Created interview_stage index');

      db.prepare('CREATE INDEX IF NOT EXISTS idx_candidates_status_composite ON candidates(worker_status, interview_stage)').run();
      console.log('   ✅ Created composite status index');
    } catch (e) {
      console.log(`   ⚠️ Index creation warning: ${e.message}`);
    }

    // Verify the fix
    console.log('\n5. Verifying schema fix...');
    const newTableInfo = db.prepare("PRAGMA table_info(candidates)").all();
    const newColumnNames = newTableInfo.map(col => col.name);

    const stillMissing = requiredColumns.filter(col => !newColumnNames.includes(col));

    if (stillMissing.length === 0) {
      console.log('   ✅ All required columns are now present');

      // Test data access
      const testQuery = db.prepare(`
        SELECT
          id, name, worker_status, interview_stage, worker_status_changed_at
        FROM candidates
        LIMIT 1
      `).get();

      console.log('   ✅ Schema is accessible:', {
        id: testQuery?.id || 'N/A',
        name: testQuery?.name || 'N/A',
        worker_status: testQuery?.worker_status || 'N/A',
        interview_stage: testQuery?.interview_stage || 'N/A'
      });

      return true;
    } else {
      console.log(`   ❌ Still missing columns: ${stillMissing.join(', ')}`);
      return false;
    }

  } catch (error) {
    console.error('❌ Schema fix failed:', error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  const success = fixDatabaseSchema();

  if (success) {
    console.log('\n🎉 Database schema fix completed successfully!');
    console.log('The Worker Status Classification system is now ready to use.');
    process.exit(0);
  } else {
    console.log('\n💥 Database schema fix failed.');
    process.exit(1);
  }
}

module.exports = { fixDatabaseSchema };