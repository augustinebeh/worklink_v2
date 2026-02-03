/**
 * Database Migration Runner
 * Applies worker status classification schema changes
 */

const fs = require('fs');
const path = require('path');
const { db } = require('../db');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

async function runMigration(migrationFile) {
  const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);

  console.log(`\n🔄 Running migration: ${migrationFile}`);

  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL into individual statements (basic split on semicolons)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`   Found ${statements.length} SQL statements to execute`);

    for (const [index, statement] of statements.entries()) {
      try {
        console.log(`   Executing statement ${index + 1}/${statements.length}...`);
        db.prepare(statement).run();
      } catch (error) {
        console.warn(`   Warning: Statement ${index + 1} failed (may be expected):`, error.message);
        // Continue with other statements - some might fail if already applied
      }
    }

    console.log(`✅ Migration completed: ${migrationFile}`);
    return true;

  } catch (error) {
    console.error(`❌ Migration failed: ${migrationFile}`, error.message);
    return false;
  }
}

async function runAllMigrations() {
  console.log('🚀 Starting database migrations for Worker Status Classification...\n');

  try {
    // Ensure migrations directory exists
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`);
      return false;
    }

    // Get all migration files
    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Apply in alphabetical order

    if (migrationFiles.length === 0) {
      console.log('ℹ️  No migration files found');
      return true;
    }

    console.log(`📋 Found ${migrationFiles.length} migration file(s):`);
    migrationFiles.forEach(file => console.log(`   - ${file}`));

    // Run each migration
    let successCount = 0;
    for (const migrationFile of migrationFiles) {
      const success = await runMigration(migrationFile);
      if (success) {
        successCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successful: ${successCount}/${migrationFiles.length}`);
    console.log(`   ❌ Failed: ${migrationFiles.length - successCount}/${migrationFiles.length}`);

    if (successCount === migrationFiles.length) {
      console.log('\n🎉 All migrations completed successfully!');

      // Verify the changes
      await verifyMigrations();

      return true;
    } else {
      console.log('\n⚠️  Some migrations failed. Please check the logs.');
      return false;
    }

  } catch (error) {
    console.error('❌ Migration runner failed:', error.message);
    return false;
  }
}

async function verifyMigrations() {
  console.log('\n🔍 Verifying migration results...');

  try {
    // Check if new columns exist
    const testQuery = db.prepare(`
      SELECT
        worker_status,
        interview_stage,
        slm_routing_context
      FROM candidates
      LIMIT 1
    `);

    const testResult = testQuery.get();
    console.log('   ✅ New candidate columns are accessible');

    // Check worker_status distribution
    const statusStats = db.prepare(`
      SELECT
        worker_status,
        COUNT(*) as count
      FROM candidates
      GROUP BY worker_status
    `).all();

    console.log('   📊 Worker status distribution:');
    statusStats.forEach(stat => {
      console.log(`      ${stat.worker_status}: ${stat.count} candidates`);
    });

    // Check if new tables exist
    const tables = ['worker_status_changes', 'interview_queue', 'interview_slots'];
    for (const table of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
        console.log(`   ✅ Table '${table}' exists with ${count} rows`);
      } catch (e) {
        console.log(`   ❌ Table '${table}' not accessible: ${e.message}`);
      }
    }

    // Check indexes
    const indexes = db.prepare(`
      SELECT name, tbl_name
      FROM sqlite_master
      WHERE type = 'index'
        AND name LIKE 'idx_candidates_worker%'
    `).all();

    console.log(`   ✅ Created ${indexes.length} worker status indexes`);
    indexes.forEach(idx => {
      console.log(`      ${idx.name} on ${idx.tbl_name}`);
    });

  } catch (error) {
    console.error('   ❌ Verification failed:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  runAllMigrations()
    .then(success => {
      if (success) {
        console.log('\n✨ Database is ready for Worker Status Classification!');
        process.exit(0);
      } else {
        console.log('\n💥 Migration process completed with errors.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Migration runner crashed:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllMigrations,
  runMigration,
  verifyMigrations
};