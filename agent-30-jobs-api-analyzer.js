#!/usr/bin/env node
/**
 * AGENT 30: Jobs API Stats Endpoint Analyzer
 * Examines the /stats endpoint logic
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 AGENT 30: Jobs API Stats Endpoint Analyzer');
console.log('='.repeat(80) + '\n');

const PROJECT_ROOT = process.cwd();
const jobsApiPath = path.join(PROJECT_ROOT, 'routes/api/v1/jobs.js');

if (fs.existsSync(jobsApiPath)) {
  console.log('1️⃣ FOUND JOBS API FILE:\n');
  console.log(`   ✅ ${jobsApiPath}\n`);
  
  const content = fs.readFileSync(jobsApiPath, 'utf-8');
  
  console.log('2️⃣ EXTRACTING /stats ENDPOINT CODE:\n');
  
  // Extract the stats endpoint
  const statsMatch = content.match(/router\.get\(['"`]\/stats['"`][\s\S]*?}\);/);
  
  if (statsMatch) {
    const statsCode = statsMatch[0];
    console.log('   Stats endpoint implementation:');
    console.log('   ' + '─'.repeat(76));
    statsCode.split('\n').forEach((line, i) => {
      console.log(`   ${String(i + 1).padStart(3, ' ')} │ ${line}`);
    });
    console.log('   ' + '─'.repeat(76) + '\n');
    
    console.log('3️⃣ ANALYZING STATS LOGIC:\n');
    
    // Check the query
    if (statsCode.includes('GROUP BY status')) {
      console.log('   ✅ Groups by status');
    }
    
    // Check status mapping
    const statusMapping = statsCode.match(/stats\s*=\s*{[\s\S]*?}/);
    if (statusMapping) {
      console.log('\n   📊 Status mapping object:');
      statusMapping[0].split('\n').forEach(line => {
        console.log(`      ${line.trim()}`);
      });
    }
    
    // Check the mapping logic
    console.log('\n4️⃣ STATUS MAPPING LOGIC:\n');
    
    const mappingLines = statsCode.match(/if\s*\(.*?status.*?\).*?stats\.\w+/g);
    if (mappingLines) {
      console.log('   Conditions:');
      mappingLines.forEach(line => {
        console.log(`      ${line.trim()}`);
      });
    }
    
    console.log('\n5️⃣ RETURN STRUCTURE:\n');
    
    const returnMatch = statsCode.match(/res\.json\([\s\S]*?\}\);/);
    if (returnMatch) {
      console.log('   Response format:');
      returnMatch[0].split('\n').forEach(line => {
        console.log(`      ${line.trim()}`);
      });
    }
    
  } else {
    console.log('   ❌ Could not find /stats endpoint');
  }
  
} else {
  console.log('❌ Jobs API file not found');
}

console.log('\n' + '='.repeat(80));
console.log('API ENDPOINT ANALYSIS COMPLETE');
console.log('='.repeat(80) + '\n');

console.log('🔍 Key Observations:\n');
console.log('1. Check what statuses are initialized in the stats object');
console.log('2. Verify which database statuses map to which stats properties');
console.log('3. Confirm response structure matches frontend expectations\n');
