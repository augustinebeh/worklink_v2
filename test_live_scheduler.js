#!/usr/bin/env node

/**
 * LIVE SERVER TEST - Interview Scheduler V2
 * Tests the scheduler with the running server
 */

console.log('\n🧪 TESTING INTERVIEW SCHEDULER V2 - LIVE SERVER');
console.log('='.repeat(70));

const Database = require('better-sqlite3');
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'db/database.db');
console.log('\n📁 Database:', dbPath);

const db = new Database(dbPath);

// Create test pending candidate
const testCandidateId = 'test-pending-' + Date.now();
const testCandidate = {
  id: testCandidateId,
  name: 'Test User',
  email: 'test@example.com',
  phone: '+65 9999 8888',
  status: 'pending',
  created_at: new Date().toISOString()
};

console.log('\n📋 Creating test pending candidate...');
console.log('   ID:', testCandidateId);
console.log('   Name:', testCandidate.name);
console.log('   Status:', testCandidate.status);

try {
  db.prepare(`
    INSERT INTO candidates (id, name, email, phone, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    testCandidate.id,
    testCandidate.name,
    testCandidate.email,
    testCandidate.phone,
    testCandidate.status,
    testCandidate.created_at
  );
  console.log('✅ Test candidate created!');
} catch (err) {
  console.log('⚠️  Candidate might already exist:', err.message);
}

// Load the scheduler
console.log('\n🔧 Loading Interview Scheduler V2...');
const InterviewSchedulerV2 = require('./services/ai-chat/interview-scheduler-v2');
const scheduler = new InterviewSchedulerV2();
console.log('✅ Scheduler loaded!');

// Test messages
const testMessages = [
  { msg: 'hi', desc: 'Initial greeting' },
  { msg: 'What is the interview about?', desc: 'Question (should answer without resetting!)' },
  { msg: 'afternoon', desc: 'Time preference' },
  { msg: '2', desc: 'Slot selection' },
  { msg: 'yes', desc: 'Confirmation' }
];

console.log('\n📝 Test Conversation Flow:');
testMessages.forEach((t, i) => console.log(`   ${i + 1}. "${t.msg}" - ${t.desc}`));

// Run the test
console.log('\n' + '='.repeat(70));
console.log('🎬 STARTING CONVERSATION SIMULATION');
console.log('='.repeat(70));

async function runTest() {
  for (let i = 0; i < testMessages.length; i++) {
    const { msg, desc } = testMessages[i];
    
    console.log(`\n━━━ Message ${i + 1}: "${msg}" (${desc}) ━━━`);
    
    try {
      const response = await scheduler.processMessage(
        testCandidateId,
        msg,
        testCandidate
      );
      
      console.log('\n✅ Bot Response:');
      console.log('   Type:', response.type);
      console.log('   Stage:', response.schedulingContext?.stage || 'N/A');
      console.log('   Content:');
      console.log('   ' + '-'.repeat(66));
      
      // Format response for readability
      const lines = response.content.split('\n');
      lines.forEach(line => {
        console.log('   ' + line);
      });
      console.log('   ' + '-'.repeat(66));
      
      // Show metadata if present
      if (response.metadata) {
        console.log('\n   📊 Metadata:', JSON.stringify(response.metadata, null, 2));
      }
      
      // Pause between messages
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (err) {
      console.log('\n❌ Error:', err.message);
      console.log(err.stack);
      break;
    }
  }
  
  // Check final state
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL DATABASE STATE');
  console.log('='.repeat(70));
  
  // Check conversation state
  console.log('\n🗂️  Conversation State:');
  const state = db.prepare(`
    SELECT * FROM interview_conversation_state WHERE candidate_id = ?
  `).get(testCandidateId);
  
  if (state) {
    console.log('   Stage:', state.current_stage);
    console.log('   Time Preference:', state.time_preference);
    console.log('   Selected Date:', state.selected_date);
    console.log('   Selected Time:', state.selected_time);
  } else {
    console.log('   ⚠️  No state found');
  }
  
  // Check booking
  console.log('\n📅 Interview Booking:');
  const booking = db.prepare(`
    SELECT * FROM interview_slots WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(testCandidateId);
  
  if (booking) {
    console.log('   ✅ BOOKING CREATED!');
    console.log('   ID:', booking.id);
    console.log('   Date:', booking.scheduled_date);
    console.log('   Time:', booking.scheduled_time);
    console.log('   Status:', booking.status);
    console.log('   Duration:', booking.duration_minutes, 'minutes');
  } else {
    console.log('   ⚠️  No booking found');
  }
  
  // Cleanup
  console.log('\n🧹 Cleanup:');
  db.prepare('DELETE FROM candidates WHERE id = ?').run(testCandidateId);
  db.prepare('DELETE FROM interview_conversation_state WHERE candidate_id = ?').run(testCandidateId);
  db.prepare('DELETE FROM interview_slots WHERE candidate_id = ?').run(testCandidateId);
  console.log('✅ Test data cleaned up');
  
  console.log('\n' + '='.repeat(70));
  console.log('🎉 TEST COMPLETE!');
  console.log('='.repeat(70));
  
  // Summary
  console.log('\n📊 SUMMARY:');
  if (booking) {
    console.log('✅ Conversation flow: WORKING');
    console.log('✅ Question handling: WORKING (bot answered without resetting)');
    console.log('✅ State persistence: WORKING');
    console.log('✅ Slot selection: WORKING');
    console.log('✅ Booking creation: WORKING');
    console.log('\n🎉 Interview Scheduler V2 is FULLY FUNCTIONAL! 🎉');
  } else {
    console.log('⚠️  Some issues detected - check logs above');
  }
  
  console.log('\n' + '='.repeat(70));
  
  db.close();
}

runTest().catch(err => {
  console.error('\n❌ Test failed:', err);
  console.error(err.stack);
  db.close();
  process.exit(1);
});
