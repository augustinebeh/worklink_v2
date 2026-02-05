#!/usr/bin/env node
/**
 * Quick Server Start Test
 * Tests if server can start without errors
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('\n🧪 TESTING SERVER STARTUP...\n');
console.log('Will run for 10 seconds to check for errors.\n');
console.log('=' .repeat(60));

const serverProcess = spawn('npm', ['start'], {
  cwd: path.join(__dirname),
  shell: true,
  stdio: 'pipe'
});

let output = '';
let errorOutput = '';
let templateErrors = 0;
let templateSuccess = 0;
let otherErrors = 0;

serverProcess.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text);
  
  // Count template successes
  if (text.includes('✅ [Template] Created template:')) {
    templateSuccess++;
  }
  
  // Count template errors
  if (text.includes('❌ [Template] Error creating template')) {
    templateErrors++;
  }
});

serverProcess.stderr.on('data', (data) => {
  const text = data.toString();
  errorOutput += text;
  process.stderr.write(text);
  
  if (text.includes('Error') || text.includes('SqliteError')) {
    otherErrors++;
  }
});

// Kill after 10 seconds
setTimeout(() => {
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 STARTUP TEST RESULTS:\n');
  console.log(`  Template Successes: ${templateSuccess}/12 ✅`);
  console.log(`  Template Errors:    ${templateErrors} ❌`);
  console.log(`  Other Errors:       ${otherErrors} ❌`);
  
  if (templateSuccess === 12 && templateErrors === 0 && otherErrors === 0) {
    console.log('\n✅ SERVER STARTED SUCCESSFULLY!\n');
    console.log('All 12 templates created without errors.');
    console.log('Server is ready to use.\n');
  } else if (templateErrors > 0) {
    console.log('\n❌ TEMPLATE ERRORS DETECTED\n');
    console.log('Some templates failed to create.');
    console.log('Check the error messages above.\n');
  } else if (otherErrors > 0) {
    console.log('\n⚠️  OTHER ERRORS DETECTED\n');
    console.log('Server may have started but with warnings.');
    console.log('Check the error messages above.\n');
  } else {
    console.log('\n⏳ SERVER STILL STARTING...\n');
    console.log('Give it a few more seconds.\n');
  }
  
  serverProcess.kill();
  process.exit(templateErrors > 0 || otherErrors > 0 ? 1 : 0);
}, 10000);

serverProcess.on('error', (error) => {
  console.error('\n❌ Failed to start server:', error.message);
  process.exit(1);
});
