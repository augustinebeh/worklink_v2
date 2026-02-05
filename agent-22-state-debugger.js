#!/usr/bin/env node
/**
 * AGENT 22: Frontend State Debugger
 * Checks state management in Candidates page
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 AGENT 22: Frontend State Debugger');
console.log('='.repeat(80) + '\n');

const candidatesPage = path.join(process.cwd(), 'admin/src/pages/Candidates.jsx');

if (fs.existsSync(candidatesPage)) {
  const content = fs.readFileSync(candidatesPage, 'utf-8');
  
  console.log('1️⃣ STATE VARIABLES:\n');
  
  // Find all useState declarations
  const stateRegex = /const\s+\[(\w+),\s*set\w+\]\s*=\s*useState\(([^)]+)\)/g;
  let match;
  const states = [];
  
  while ((match = stateRegex.exec(content)) !== null) {
    states.push({ name: match[1], initial: match[2] });
  }
  
  states.forEach(s => {
    console.log(`   ${s.name}: ${s.initial}`);
  });
  
  console.log('\n2️⃣ DATA FETCHING:\n');
  
  // Check useEffect for data loading
  if (content.includes('useEffect')) {
    console.log('   ✅ useEffect found');
    
    // Count useEffect calls
    const effectCount = (content.match(/useEffect\(/g) || []).length;
    console.log(`   Found ${effectCount} useEffect hooks`);
  }
  
  // Check for loading state
  if (content.includes('isLoading') || content.includes('loading')) {
    console.log('   ✅ Loading state managed');
  } else {
    console.log('   ⚠️  No loading state found');
  }
  
  console.log('\n3️⃣ ERROR HANDLING:\n');
  
  if (content.includes('error') || content.includes('Error')) {
    console.log('   ✅ Error handling present');
  } else {
    console.log('   ⚠️  No error handling found');
  }
  
  console.log('\n4️⃣ CANDIDATES DATA:\n');
  
  // Check if candidates state exists
  if (content.includes('candidates')) {
    console.log('   ✅ Candidates state found');
    
    // Check how it's initialized
    const candidatesState = content.match(/const\s+\[candidates,\s*setCandidates\]\s*=\s*useState\(([^)]+)\)/);
    if (candidatesState) {
      console.log(`   Initial value: ${candidatesState[1]}`);
    }
  } else {
    console.log('   ❌ No candidates state!');
  }
  
  console.log('');
} else {
  console.log('❌ Candidates.jsx not found!\n');
}

console.log('='.repeat(80));
console.log('RECOMMENDATIONS');
console.log('='.repeat(80) + '\n');
console.log('Add console.log statements to debug:');
console.log('1. console.log("Fetching candidates...")');
console.log('2. console.log("Response:", response)');
console.log('3. console.log("Candidates:", candidates)\n');
