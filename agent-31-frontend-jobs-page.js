#!/usr/bin/env node
/**
 * AGENT 31: Frontend Jobs Page Inspector
 * Examines how the frontend displays job statistics
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 AGENT 31: Frontend Jobs Page Inspector');
console.log('='.repeat(80) + '\n');

const PROJECT_ROOT = process.cwd();

console.log('1️⃣ LOCATING JOBS PAGE COMPONENT:\n');

const jobsPagePath = path.join(PROJECT_ROOT, 'admin/src/pages/Jobs.jsx');

if (fs.existsSync(jobsPagePath)) {
  console.log('   ✅ Found Jobs.jsx\n');
  
  const content = fs.readFileSync(jobsPagePath, 'utf-8');
  
  // Check how stats are fetched
  console.log('2️⃣ CHECKING STATS FETCHING:\n');
  
  if (content.includes('getStats') || content.includes('/stats')) {
    console.log('   ✅ Stats fetching code found');
    
    const statsMatches = content.match(/getStats|fetchStats|loadStats|api.*stats/gi);
    if (statsMatches) {
      console.log(`   Found ${statsMatches.length} stat-related calls`);
    }
  } else {
    console.log('   ⚠️  No explicit stats fetching found');
  }
  
  // Check state management for stats
  console.log('\n3️⃣ CHECKING STATE MANAGEMENT:\n');
  
  const stateMatches = content.match(/const\s+\[(\w+),\s*set\w+\]\s*=\s*useState/g);
  if (stateMatches) {
    console.log('   State variables:');
    stateMatches.forEach(match => {
      const varName = match.match(/\[(\w+),/)[1];
      if (varName.toLowerCase().includes('stat') || varName.toLowerCase().includes('count')) {
        console.log(`      ✅ ${varName}`);
      }
    });
  }
  
  // Check how stats are displayed
  console.log('\n4️⃣ CHECKING STATS DISPLAY:\n');
  
  // Look for the cards that show stats
  const cardMatches = content.match(/<StatCard|<Card.*?title.*?count/gi);
  if (cardMatches) {
    console.log(`   Found ${cardMatches.length} stat display components`);
  }
  
  // Check for specific status names
  const statusNames = ['open', 'closed', 'draft', 'pending', 'active', 'filled'];
  console.log('\n   Status references in component:');
  statusNames.forEach(status => {
    const regex = new RegExp(`['"\`]${status}['"\`]`, 'gi');
    const matches = content.match(regex);
    if (matches) {
      console.log(`      ${status}: ${matches.length} references`);
    }
  });
  
  // Check response data structure expectations
  console.log('\n5️⃣ CHECKING DATA STRUCTURE EXPECTATIONS:\n');
  
  if (content.includes('.data.')) {
    console.log('   ✅ Accesses response.data');
  }
  
  // Look for how stats object is accessed
  const accessMatches = content.match(/stats\[['"](\w+)['"]\]|stats\.(\w+)/g);
  if (accessMatches) {
    console.log('\n   Stats object access patterns:');
    const unique = [...new Set(accessMatches)];
    unique.slice(0, 10).forEach(match => {
      console.log(`      ${match}`);
    });
  }
  
} else {
  console.log('   ❌ Jobs.jsx not found');
}

// Check jobs service
console.log('\n6️⃣ CHECKING JOBS SERVICE:\n');

const jobsServicePath = path.join(PROJECT_ROOT, 'admin/src/shared/services/api/jobs.service.js');
if (fs.existsSync(jobsServicePath)) {
  const content = fs.readFileSync(jobsServicePath, 'utf-8');
  
  if (content.includes('getStats') || content.includes('stats')) {
    console.log('   ✅ Stats method found in service');
    
    // Extract the getStats method
    const getStatsMatch = content.match(/getStats.*?{[\s\S]*?return[\s\S]*?}/);
    if (getStatsMatch) {
      console.log('\n   getStats implementation:');
      getStatsMatch[0].split('\n').slice(0, 10).forEach(line => {
        console.log(`      ${line}`);
      });
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('FRONTEND FINDINGS');
console.log('='.repeat(80) + '\n');

console.log('🔍 Key Questions:\n');
console.log('1. How does frontend request stats?');
console.log('2. What data structure does it expect?');
console.log('3. How are different statuses mapped to display?');
console.log('4. Are there any default values or fallbacks?\n');
