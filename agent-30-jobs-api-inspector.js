#!/usr/bin/env node
/**
 * Agent 30: Jobs API Endpoint Inspector
 * Examines the API endpoint that returns job statistics
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Agent 30: Jobs API Endpoint Inspector');
console.log('='.repeat(80) + '\n');

const PROJECT_ROOT = process.cwd();

console.log('1️⃣ LOCATING JOBS API ROUTES:\n');

const jobsRoutePath = path.join(PROJECT_ROOT, 'routes/api/v1/jobs');

if (fs.existsSync(jobsRoutePath)) {
  const files = fs.readdirSync(jobsRoutePath);
  console.log(`   Found jobs route files: ${files.join(', ')}\n`);
  
  // Check main index
  const indexPath = path.join(jobsRoutePath, 'index.js');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf-8');
    
    console.log('2️⃣ CHECKING FOR /stats ENDPOINT:\n');
    
    if (content.includes('/stats')) {
      console.log('   ✅ /stats endpoint found');
      
      // Extract the stats endpoint code
      const statsMatch = content.match(/router\.get\(['"`]\/stats['"`][\s\S]*?}\);/);
      if (statsMatch) {
        console.log('\n   Stats endpoint code preview:');
        const lines = statsMatch[0].split('\n').slice(0, 20);
        lines.forEach(line => console.log(`      ${line}`));
      }
    } else {
      console.log('   ⚠️  No /stats endpoint found in index.js');
    }
    
    console.log('\n3️⃣ CHECKING STATUS GROUPING LOGIC:\n');
    
    if (content.includes('GROUP BY status')) {
      console.log('   ✅ Status grouping found in query');
    } else {
      console.log('   ⚠️  No GROUP BY status found');
    }
    
    // Check for status mapping
    if (content.includes('CASE') && content.includes('status')) {
      console.log('   ✅ Status mapping/transformation found');
      
      const caseMatches = content.match(/CASE[\s\S]*?END/g);
      if (caseMatches) {
        console.log('\n   Status transformation logic:');
        caseMatches.forEach(match => {
          const lines = match.split('\n').slice(0, 10);
          lines.forEach(line => console.log(`      ${line.trim()}`));
        });
      }
    } else {
      console.log('   ℹ️  No status transformation detected');
    }
  }
  
  // Check for separate stats file
  console.log('\n4️⃣ CHECKING FOR SEPARATE STATS ROUTE:\n');
  
  const statsFiles = files.filter(f => f.toLowerCase().includes('stat'));
  if (statsFiles.length > 0) {
    console.log(`   Found: ${statsFiles.join(', ')}`);
    
    statsFiles.forEach(file => {
      const filePath = path.join(jobsRoutePath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      console.log(`\n   Content preview of ${file}:`);
      const lines = content.split('\n').slice(0, 30);
      lines.forEach((line, i) => {
        if (line.includes('SELECT') || line.includes('GROUP BY') || line.includes('status')) {
          console.log(`      ${i + 1}: ${line.trim()}`);
        }
      });
    });
  } else {
    console.log('   No separate stats file found');
  }
  
} else {
  console.log('   ❌ Jobs route directory not found');
}

console.log('\n' + '='.repeat(80));
console.log('API ENDPOINT FINDINGS');
console.log('='.repeat(80) + '\n');

console.log('📋 Key Things to Check:\n');
console.log('1. Does the stats query GROUP BY status?');
console.log('2. Are there any status transformations (CASE statements)?');
console.log('3. Does the response format match frontend expectations?');
console.log('4. Are all job statuses included in the result?\n');
