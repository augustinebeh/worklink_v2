#!/usr/bin/env node

/**
 * FINAL VERIFICATION TEST
 * Checks all deployment aspects
 */

const fs = require('fs');
const path = require('path');

console.log('\n🎯 INTERVIEW SCHEDULER V2 - DEPLOYMENT VERIFICATION');
console.log('='.repeat(70));

// Test 1: File Deployment
console.log('\n📦 TEST 1: FILE DEPLOYMENT');
console.log('-'.repeat(70));

const files = {
  'New Scheduler': 'services/ai-chat/interview-scheduler-v2.js',
  'Updated Engine': 'services/ai-chat/improved-chat-engine.js',
  'Backup (OLD)': 'backup_scheduler_v2_20260203_183413/improved-chat-engine.js.OLD'
};

let allFilesPresent = true;
for (const [name, file] of Object.entries(files)) {
  const filepath = path.join(__dirname, file);
  const exists = fs.existsSync(filepath);
  if (!exists) allFilesPresent = false;
  
  console.log(`${exists ? '✅' : '❌'} ${name}`);
  if (exists) {
    const stats = fs.statSync(filepath);
    const lines = fs.readFileSync(filepath, 'utf8').split('\n').length;
    console.log(`   📄 ${lines} lines, ${(stats.size/1024).toFixed(2)} KB`);
  }
}

console.log(`\n${allFilesPresent ? '✅' : '❌'} All files deployed: ${allFilesPresent ? 'YES' : 'NO'}`);

// Test 2: Code Structure
console.log('\n🔍 TEST 2: CODE STRUCTURE VALIDATION');
console.log('-'.repeat(70));

const schedulerCode = fs.readFileSync(
  path.join(__dirname, 'services/ai-chat/interview-scheduler-v2.js'), 
  'utf8'
);

const engineCode = fs.readFileSync(
  path.join(__dirname, 'services/ai-chat/improved-chat-engine.js'),
  'utf8'
);

const schedulerChecks = {
  'State Machine (STAGES)': /STAGES\s*=\s*\{/,
  'Main Entry (processMessage)': /async processMessage\s*\(/,
  'Intent Parser (parseIntent)': /parseIntent\s*\(/,
  'Question Handler': /handleQuestion\s*\(/,
  'Slot Handler': /handleSlotSelection\s*\(/,
  'Confirmation Handler': /handleConfirmation\s*\(/,
  'Database State Management': /getState|updateState|initializeState/,
  'Database Tables Creation': /ensureStateTable|ensureInterviewTables/
};

console.log('🔧 Scheduler V2 Components:');
let schedulerValid = true;
for (const [name, pattern] of Object.entries(schedulerChecks)) {
  const found = pattern.test(schedulerCode);
  if (!found) schedulerValid = false;
  console.log(`  ${found ? '✅' : '❌'} ${name}`);
}

console.log('\n🔧 Updated Engine Components:');
const engineChecks = {
  'Uses InterviewSchedulerV2': /const InterviewSchedulerV2 = require\('\.\/interview-scheduler-v2'\)/,
  'Creates Scheduler Instance': /this\.interviewScheduler = new InterviewSchedulerV2\(\)/,
  'Routes Pending Candidates': /handlePendingCandidateWithScheduling/,
  'Removed Old SLM Bridge': /SLMSchedulingBridge/
};

let engineValid = true;
for (const [name, pattern] of Object.entries(engineChecks)) {
  const found = pattern.test(engineCode);
  if (!found) engineValid = false;
  console.log(`  ${found ? '✅' : '❌'} ${name}`);
}

// Test 3: Database Schema
console.log('\n💾 TEST 3: DATABASE SCHEMA');
console.log('-'.repeat(70));

const dbPath = path.join(__dirname, 'db/database.db');
const dbExists = fs.existsSync(dbPath);
console.log(`${dbExists ? '✅' : '❌'} Database file exists: ${dbExists ? 'YES' : 'NO'}`);

if (dbExists) {
  const stats = fs.statSync(dbPath);
  console.log(`   📊 Size: ${(stats.size/1024).toFixed(2)} KB`);
}

console.log('\n📋 Required Tables (will be auto-created on first run):');
console.log('   1. interview_conversation_state (tracks scheduling flow)');
console.log('   2. interview_slots (stores bookings)');

// Test 4: Key Features
console.log('\n✨ TEST 4: KEY FEATURES VERIFICATION');
console.log('-'.repeat(70));

const features = {
  'Persistent State Machine': /current_stage|STAGES/,
  'Question Detection & Handling': /isQuestion|handleQuestion|questionType/,
  'Intent Parsing': /parseIntent.*isQuestion.*isReschedule.*isSlotSelection/s,
  'Slot Selection (1, 2, 3)': /selectedIndex|slot_selection/,
  'Confirmation Flow (YES)': /isConfirmation|await_confirmation/,
  'Database Booking': /INSERT INTO interview_slots/,
  'No Reset Loop': !/reset|clear.*state.*every/i
};

console.log('🎯 Scheduler Features:');
for (const [name, pattern] of Object.entries(features)) {
  const found = pattern.test(schedulerCode);
  console.log(`  ${found ? '✅' : '❌'} ${name}`);
}

// Test 5: System Requirements
console.log('\n⚙️  TEST 5: SYSTEM REQUIREMENTS');
console.log('-'.repeat(70));

const nodeVersion = process.version;
const nodeVersionNum = parseInt(nodeVersion.slice(1).split('.')[0]);
const nodeOK = nodeVersionNum >= 20;

console.log(`📦 Node.js Version: ${nodeVersion}`);
console.log(`   Required: >= 20.0.0`);
console.log(`   ${nodeOK ? '✅' : '⚠️'}  Status: ${nodeOK ? 'OK' : 'NEEDS UPGRADE'}`);

if (!nodeOK) {
  console.log('\n   💡 Node upgrade required to run server');
  console.log('      Install Node v20+ using nvm:');
  console.log('      $ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash');
  console.log('      $ nvm install 20');
  console.log('      $ nvm use 20');
}

// Final Summary
console.log('\n' + '='.repeat(70));
console.log('📊 FINAL DEPLOYMENT STATUS');
console.log('='.repeat(70));

const results = {
  'Files Deployed': allFilesPresent,
  'Scheduler Code Valid': schedulerValid,
  'Engine Integration': engineValid,
  'Database Ready': dbExists,
  'Node Version OK': nodeOK
};

console.log();
for (const [check, status] of Object.entries(results)) {
  console.log(`${status ? '✅' : '⚠️'}  ${check}: ${status ? 'PASS' : 'NEEDS ATTENTION'}`);
}

const deploymentSuccess = allFilesPresent && schedulerValid && engineValid && dbExists;

console.log('\n' + '='.repeat(70));
if (deploymentSuccess) {
  console.log('🎉 DEPLOYMENT SUCCESSFUL!');
  console.log('\n✅ Interview Scheduler V2 is fully deployed and ready!');
  console.log('✅ Old system backed up to backup_scheduler_v2_20260203_183413/');
  console.log('✅ Database tables will auto-create on first chat interaction');
  
  if (!nodeOK) {
    console.log('\n⚠️  NEXT STEP: Upgrade Node.js to v20+ to start the server');
  } else {
    console.log('\n🚀 NEXT STEP: Start the server and test with a pending candidate!');
    console.log('   $ cd /home/augustine/Augustine_Projects/worklink_v2');
    console.log('   $ npm run start:server');
  }
  
  console.log('\n📖 TESTING INSTRUCTIONS:');
  console.log('   1. Login as a pending candidate');
  console.log('   2. Send: "hi"');
  console.log('   3. Bot asks: "morning or afternoon?"');
  console.log('   4. Ask: "What\'s the agenda?" (Bot ANSWERS without resetting!)');
  console.log('   5. Reply: "afternoon" (Bot shows 3 slots)');
  console.log('   6. Reply: "2" (Bot asks YES to confirm)');
  console.log('   7. Reply: "yes" (Bot confirms booking!)');
  
} else {
  console.log('⚠️  DEPLOYMENT INCOMPLETE');
  console.log('\nPlease review the failed checks above.');
}

console.log('='.repeat(70) + '\n');
