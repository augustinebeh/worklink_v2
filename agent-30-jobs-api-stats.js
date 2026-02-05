#!/usr/bin/env node
/**
 * AGENT 30: Jobs API Stats Endpoint Inspector
 * Examines the /stats endpoint logic
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 AGENT 30: Jobs API Stats Endpoint Inspector');
console.log('='.repeat(80) + '\n');

const PROJECT_ROOT = process.cwd();

// Find jobs routes
console.log('1️⃣ LOCATING JOBS STATS ENDPOINT:\n');

const jobsIndexPath = path.join(PROJECT_ROOT, 'routes/api/v1/jobs/index.js');

if (fs.existsSync(jobsIndexPath)) {
  const content = fs.readFileSync(jobsIndexPath, 'utf-8');
  
  // Check if stats endpoint exists
  if (content.includes('/stats')) {
    console.log('   ✅ Found /stats endpoint\n');
    
    // Extract the stats endpoint code
    console.log('2️⃣ STATS ENDPOINT IMPLEMENTATION:\n');
    
    const statsMatch = content.match(/router\.get\(['"`]\/stats['"`][\s\S]*?}\);/);
    if (statsMatch) {
      const statsCode = statsMatch[0];
      console.log('   Code:');
      statsCode.split('\n').forEach(line => {
        console.log(`      ${line}`);
      });
      console.log('');
      
      // Check for GROUP BY
      console.log('3️⃣ CHECKING SQL QUERY:\n');
      
      if (statsCode.includes('GROUP BY status')) {
        console.log('   ✅ Query groups by status');
      } else if (statsCode.includes('GROUP BY')) {
        console.log('   ⚠️  Query has GROUP BY but NOT by status');
        const groupByMatch = statsCode.match(/GROUP BY ([^\n]+)/);
        if (groupByMatch) {
          console.log(`      Grouping by: ${groupByMatch[1]}`);
        }
      } else {
        console.log('   ❌ No GROUP BY found');
      }
      
      // Check for CASE statement (status mapping)
      console.log('\n4️⃣ CHECKING FOR STATUS MAPPING:\n');
      
      if (statsCode.includes('CASE')) {
        console.log('   ✅ Found CASE statement for status mapping');
        
        const caseMatch = statsCode.match(/CASE[\s\S]*?END/);
        if (caseMatch) {
          console.log('\n   Status mapping logic:');
          caseMatch[0].split('\n').forEach(line => {
            console.log(`      ${line.trim()}`);
          });
        }
      } else {
        console.log('   ℹ️  No CASE statement (direct status use)');
      }
      
      // Check response structure
      console.log('\n5️⃣ CHECKING RESPONSE STRUCTURE:\n');
      
      const resJsonMatch = statsCode.match(/res\.json\([\s\S]*?\}\);/);
      if (resJsonMatch) {
        console.log('   Response structure:');
        resJsonMatch[0].split('\n').slice(0, 15).forEach(line => {
          console.log(`      ${line.trim()}`);
        });
      }
      
    } else {
      console.log('   ⚠️  Could not extract stats endpoint code');
    }
  } else {
    console.log('   ❌ No /stats endpoint found in jobs routes');
  }
} else {
  console.log('   ❌ Jobs index.js not found');
}

console.log('\n' + '='.repeat(80));
console.log('API FINDINGS');
console.log('='.repeat(80) + '\n');

console.log('🔍 What to look for:\n');
console.log('1. Does the query GROUP BY status?');
console.log('2. Is there a CASE statement that maps statuses?');
console.log('3. Does the response format match what frontend expects?');
console.log('4. Are all statuses being returned or only some?\n');
