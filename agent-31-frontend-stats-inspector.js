#!/usr/bin/env node
/**
 * AGENT 31: Frontend Jobs Page Stats Inspector
 * Checks how frontend displays and expects stats
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 AGENT 31: Frontend Jobs Page Stats Inspector');
console.log('='.repeat(80) + '\n');

const PROJECT_ROOT = process.cwd();
const jobsPagePath = path.join(PROJECT_ROOT, 'admin/src/pages/Jobs.jsx');

if (fs.existsSync(jobsPagePath)) {
  console.log('1️⃣ FOUND JOBS PAGE COMPONENT:\n');
  console.log(`   ✅ ${jobsPagePath}\n`);
  
  const content = fs.readFileSync(jobsPagePath, 'utf-8');
  
  console.log('2️⃣ SEARCHING FOR STATS DISPLAY:\n');
  
  // Look for StatCard or similar components
  const statCardMatches = content.match(/<Card[\s\S]*?(?:total|open|filled|completed|closed)[\s\S]*?<\/Card>/gi);
  
  if (statCardMatches && statCardMatches.length > 0) {
    console.log(`   Found ${statCardMatches.length} stat display cards\n`);
    
    statCardMatches.forEach((card, i) => {
      console.log(`   Card ${i + 1}:`);
      // Extract key info
      const titleMatch = card.match(/title=["']([^"']+)["']/i);
      const valueMatch = card.match(/stats\.(\w+)/);
      
      if (titleMatch) console.log(`      Title: ${titleMatch[1]}`);
      if (valueMatch) console.log(`      Value: stats.${valueMatch[1]}`);
      console.log('');
    });
  }
  
  console.log('3️⃣ CHECKING STATS STATE VARIABLE:\n');
  
  const statsStateMatch = content.match(/const\s+\[stats,\s*setStats\]\s*=\s*useState\(([\s\S]*?)\)/);
  if (statsStateMatch) {
    console.log('   Initial stats state:');
    console.log(`      ${statsStateMatch[1].trim()}`);
  } else {
    console.log('   ⚠️  No stats state variable found');
  }
  
  console.log('\n4️⃣ CHECKING STATS FETCHING:\n');
  
  // Look for stats API calls
  const fetchStatsMatch = content.match(/api\.jobs\.getStats|fetchStats|loadStats/g);
  if (fetchStatsMatch) {
    console.log(`   ✅ Found ${fetchStatsMatch.length} stats fetch call(s)`);
  } else {
    console.log('   ⚠️  No explicit stats fetching found');
    console.log('   Checking if stats come from jobs data...');
    
    // Check if stats are computed from jobs array
    const computeMatch = content.match(/jobs\.filter|jobs\.reduce.*status/);
    if (computeMatch) {
      console.log('   ✅ Stats computed from jobs array');
    }
  }
  
  console.log('\n5️⃣ CHECKING STATUS REFERENCES:\n');
  
  // Find all references to stats properties
  const statsAccess = content.match(/stats\.(\w+)/g);
  if (statsAccess) {
    const unique = [...new Set(statsAccess)];
    console.log('   Stats properties accessed:');
    unique.forEach(prop => {
      console.log(`      ${prop}`);
    });
  }
  
  console.log('\n6️⃣ CHECKING STATUS FILTER OPTIONS:\n');
  
  // Look for status filter dropdown
  const filterOptions = content.match(/value:\s*['"](\w+)['"][\s\S]*?label:\s*['"]([^'"]+)['"]/g);
  if (filterOptions) {
    console.log('   Filter options:');
    filterOptions.slice(0, 5).forEach(option => {
      const match = option.match(/value:\s*['"](\w+)['"][\s\S]*?label:\s*['"]([^'"]+)['"]/);
      if (match) {
        console.log(`      ${match[1]} → "${match[2]}"`);
      }
    });
  }
  
} else {
  console.log('❌ Jobs page not found');
}

console.log('\n' + '='.repeat(80));
console.log('FRONTEND ANALYSIS COMPLETE');
console.log('='.repeat(80) + '\n');

console.log('🔍 Key Questions:\n');
console.log('1. Which stats properties does frontend expect?');
console.log('2. Does frontend fetch stats separately or compute from jobs?');
console.log('3. What are the initial/default stat values?\n');
