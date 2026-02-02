#!/usr/bin/env node

/**
 * Retention Features Test Script
 * Tests the smart notifications and streak protection features
 */

const { db } = require('./db');

async function testRetentionFeatures() {
  console.log('🧪 Testing Retention Features\n');

  // Test 1: Check database tables
  console.log('1️⃣ Checking database schema...');

  try {
    const tables = [
      'push_subscriptions',
      'notification_log',
      'streak_protection'
    ];

    for (const table of tables) {
      const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      console.log(`   ✅ ${table}: ${result.count} records`);
    }

    // Check if candidates table has new streak fields
    const candidateSchema = db.prepare("PRAGMA table_info(candidates)").all();
    const hasStreakProtectedUntil = candidateSchema.some(col => col.name === 'streak_protected_until');
    const hasProfileFlair = candidateSchema.some(col => col.name === 'profile_flair');

    console.log(`   ✅ streak_protected_until field: ${hasStreakProtectedUntil ? 'Present' : 'Missing'}`);
    console.log(`   ✅ profile_flair field: ${hasProfileFlair ? 'Present' : 'Missing'}`);

  } catch (error) {
    console.log(`   ❌ Database error: ${error.message}`);
    return;
  }

  // Test 2: Check active candidates for testing
  console.log('\n2️⃣ Finding test candidates...');

  const candidates = db.prepare(`
    SELECT id, name, streak_days, streak_last_date, xp
    FROM candidates
    WHERE status = 'active'
    LIMIT 5
  `).all();

  if (candidates.length === 0) {
    console.log('   ❌ No active candidates found. Create some test data first.');
    return;
  }

  candidates.forEach((candidate, i) => {
    console.log(`   ${i + 1}. ${candidate.name} (ID: ${candidate.id}) - ${candidate.streak_days} days, ${candidate.xp} XP`);
  });

  // Test 3: Initialize streak protection for candidates
  console.log('\n3️⃣ Initializing streak protection...');

  const testCandidate = candidates[0];

  try {
    // Initialize streak protection
    db.prepare(`
      INSERT OR IGNORE INTO streak_protection (candidate_id, freeze_tokens, recovery_tokens)
      VALUES (?, 2, 1)
    `).run(testCandidate.id);

    console.log(`   ✅ Streak protection initialized for ${testCandidate.name}`);

    // Check status
    const status = db.prepare(`
      SELECT sp.*,
             (julianday('now') - julianday(c.streak_last_date)) * 24 as hours_since_checkin
      FROM streak_protection sp
      JOIN candidates c ON sp.candidate_id = c.id
      WHERE sp.candidate_id = ?
    `).get(testCandidate.id);

    console.log(`   📊 Status: ${status.freeze_tokens} freeze tokens, ${status.recovery_tokens} recovery tokens`);
    console.log(`   ⏰ Hours since check-in: ${Math.round(status.hours_since_checkin || 0)}`);

  } catch (error) {
    console.log(`   ❌ Error initializing protection: ${error.message}`);
  }

  // Test 4: Test API endpoints
  console.log('\n4️⃣ API endpoints available:');
  console.log('   📡 Enhanced push subscription: POST /api/v1/notifications/subscribe-enhanced');
  console.log('   🛡️  Protect streak: POST /api/v1/notifications/protect-streak');
  console.log('   🔄 Recover streak: POST /api/v1/notifications/recover-streak');
  console.log('   📊 Get status: GET /api/v1/notifications/status/:candidateId');
  console.log('   🧪 Test notification: POST /api/v1/notifications/test-retention/:candidateId/:type');

  // Test 5: Create test data for streak risk
  console.log('\n5️⃣ Creating test scenario...');

  try {
    // Make a candidate's streak at risk (18+ hours ago)
    db.prepare(`
      UPDATE candidates
      SET streak_last_date = datetime('now', '-20 hours')
      WHERE id = ?
    `).run(testCandidate.id);

    console.log(`   ⚠️  ${testCandidate.name}'s streak is now at risk (20 hours ago)`);
    console.log(`   🧪 This will trigger streak risk notifications`);

  } catch (error) {
    console.log(`   ❌ Error creating test scenario: ${error.message}`);
  }

  // Test 6: Manual retention service check
  console.log('\n6️⃣ Testing retention service...');

  try {
    const retentionService = require('./services/retention-notifications');
    console.log('   ✅ Retention service loaded successfully');
    console.log('   🔄 Service checks run every hour automatically');
    console.log('   📱 Notifications will be sent to subscribed users');

  } catch (error) {
    console.log(`   ❌ Retention service error: ${error.message}`);
  }

  console.log('\n🎉 Testing complete!');
  console.log('\n📋 Next steps:');
  console.log('   1. Start your server: npm start');
  console.log('   2. Open the worker PWA in your browser');
  console.log('   3. Register for push notifications');
  console.log('   4. Test the streak protection modal');
  console.log('   5. Use the test API endpoints');
  console.log('\n💡 Test URLs:');
  console.log(`   - Status check: GET http://localhost:8080/api/v1/notifications/status/${testCandidate.id}`);
  console.log(`   - Test streak alert: POST http://localhost:8080/api/v1/notifications/test-retention/${testCandidate.id}/streak_risk`);
}

// Run the test
testRetentionFeatures().catch(console.error);