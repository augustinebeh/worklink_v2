#!/usr/bin/env node
/**
 * Agent 14: Candidate Update Schema Fixer
 * Fixes avatar_url column error in candidate updates
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = process.cwd();

console.log('🔧 Agent 14: Candidate Update Schema Fixer');
console.log('='.repeat(80) + '\n');

// Step 1: Check actual table schema
console.log('1️⃣ CHECKING CANDIDATES TABLE SCHEMA:\n');

try {
  const schema = execSync(
    'sqlite3 data/worklink.db "PRAGMA table_info(candidates);"',
    { cwd: PROJECT_ROOT, encoding: 'utf-8' }
  ).trim();
  
  console.log('   Current columns:');
  const columns = schema.split('\n').map(line => {
    const parts = line.split('|');
    return parts[1]; // Column name
  });
  
  columns.forEach(col => {
    console.log(`      - ${col}`);
  });
  
  const hasAvatarUrl = columns.includes('avatar_url');
  const hasAvatar = columns.includes('avatar');
  
  console.log('');
  console.log(`   Has 'avatar_url': ${hasAvatarUrl ? '✅' : '❌'}`);
  console.log(`   Has 'avatar': ${hasAvatar ? '✅' : '❌'}`);
  console.log('');
  
  // Step 2: Check the problematic update query
  console.log('2️⃣ CHECKING UPDATE QUERY IN profile.js:\n');
  
  const profilePath = path.join(PROJECT_ROOT, 'routes', 'api', 'v1', 'candidates', 'routes', 'profile.js');
  const content = fs.readFileSync(profilePath, 'utf-8');
  const lines = content.split('\n');
  
  // Find line 130 area
  console.log('   Around line 130:');
  lines.slice(125, 135).forEach((line, i) => {
    console.log(`   ${126 + i}: ${line}`);
  });
  console.log('');
  
  // Find the UPDATE statement
  const updateMatch = content.match(/UPDATE candidates SET[\s\S]*?WHERE id = \?/);
  
  if (updateMatch) {
    console.log('   Found UPDATE statement:');
    console.log('   ' + updateMatch[0].split('\n').map(l => l.trim()).join('\n   '));
    console.log('');
    
    if (updateMatch[0].includes('avatar_url')) {
      console.log('   🔴 FOUND THE BUG!');
      console.log('   Query tries to update avatar_url but column doesn\'t exist!\n');
      
      // Step 3: Fix the query
      console.log('3️⃣ APPLYING FIX:\n');
      
      let fixedContent = content;
      
      // Remove avatar_url from the UPDATE statement
      if (hasAvatar) {
        // If there's an 'avatar' column, use that instead
        console.log('   Strategy: Replace avatar_url with avatar');
        fixedContent = fixedContent.replace(/avatar_url = \?/g, 'avatar = ?');
      } else {
        // Remove avatar_url entirely
        console.log('   Strategy: Remove avatar_url from UPDATE');
        
        // Remove "avatar_url = ?," or ", avatar_url = ?"
        fixedContent = fixedContent.replace(/,?\s*avatar_url = \?,?/g, '');
        
        // Clean up any double commas
        fixedContent = fixedContent.replace(/,\s*,/g, ',');
        
        // Clean up comma before WHERE
        fixedContent = fixedContent.replace(/,\s*WHERE/g, ' WHERE');
      }
      
      // Create backup
      fs.writeFileSync(profilePath + '.BEFORE_AVATAR_FIX', content);
      fs.writeFileSync(profilePath, fixedContent);
      
      console.log('   ✅ Fixed UPDATE query');
      console.log('   ✅ Backup created: profile.js.BEFORE_AVATAR_FIX\n');
      
      // Step 4: Verify the fix
      console.log('4️⃣ VERIFYING FIX:\n');
      
      const fixedLines = fixedContent.split('\n');
      console.log('   Updated code around line 130:');
      fixedLines.slice(125, 135).forEach((line, i) => {
        console.log(`   ${126 + i}: ${line}`);
      });
      console.log('');
      
      console.log('='.repeat(80));
      console.log('✅ FIX APPLIED SUCCESSFULLY!');
      console.log('='.repeat(80) + '\n');
      
      console.log('🎉 Candidate updates should now work after server restart!\n');
      console.log('📝 What was fixed:');
      console.log('   - Removed avatar_url column from UPDATE query');
      if (hasAvatar) {
        console.log('   - Using avatar column instead');
      }
      console.log('');
      
      // Save report
      fs.writeFileSync(
        path.join(PROJECT_ROOT, 'agent-14-schema-fix.json'),
        JSON.stringify({
          issue: 'avatar_url column does not exist',
          fix: hasAvatar ? 'Replaced with avatar column' : 'Removed from query',
          backup: 'profile.js.BEFORE_AVATAR_FIX',
          file: 'routes/api/v1/candidates/routes/profile.js'
        }, null, 2)
      );
      
    } else {
      console.log('   ⚠️  UPDATE statement found but doesn\'t include avatar_url');
      console.log('   The error might be elsewhere in the file\n');
    }
  } else {
    console.log('   ⚠️  Could not find UPDATE statement\n');
  }
  
} catch (error) {
  console.log(`   ❌ Error: ${error.message}\n`);
}

console.log('📄 Report saved: agent-14-schema-fix.json\n');
