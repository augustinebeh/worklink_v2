#!/usr/bin/env node
/**
 * AGENT 20: Build Verification Agent
 * Verifies frontend build includes latest changes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = process.cwd();

console.log('🔍 AGENT 20: Build Verification Agent');
console.log('='.repeat(80) + '\n');

console.log('1️⃣ CHECKING BUILD TIMESTAMPS:\n');

const srcAuthContext = path.join(PROJECT_ROOT, 'admin/src/contexts/AuthContext.jsx');
const distIndex = path.join(PROJECT_ROOT, 'admin/dist/index.html');
const distAssets = path.join(PROJECT_ROOT, 'admin/dist/assets');

if (fs.existsSync(srcAuthContext)) {
  const srcStat = fs.statSync(srcAuthContext);
  console.log(`   Source AuthContext.jsx: ${srcStat.mtime.toLocaleString()}`);
}

if (fs.existsSync(distIndex)) {
  const distStat = fs.statSync(distIndex);
  console.log(`   Built index.html: ${distStat.mtime.toLocaleString()}`);
}

if (fs.existsSync(distAssets)) {
  const files = fs.readdirSync(distAssets);
  const jsFiles = files.filter(f => f.endsWith('.js'));
  
  console.log(`\n   📦 Built JS files: ${jsFiles.length}`);
  
  if (jsFiles.length > 0) {
    const newestFile = jsFiles[0];
    const stat = fs.statSync(path.join(distAssets, newestFile));
    console.log(`   Latest build: ${stat.mtime.toLocaleString()}`);
  }
}

console.log('\n2️⃣ CHECKING IF ADMIN@WORKLINK.SG IS IN BUILD:\n');

try {
  const result = execSync(
    `grep -r "admin@worklink.sg" admin/dist 2>/dev/null || echo "NOT FOUND"`,
    { cwd: PROJECT_ROOT, encoding: 'utf-8' }
  );
  
  if (result.includes('NOT FOUND')) {
    console.log('   ❌ admin@worklink.sg NOT found in build!');
    console.log('   ⚠️  Build may be outdated!\n');
  } else {
    console.log('   ✅ admin@worklink.sg found in build');
    console.log(`   ${result.split('\n')[0]}\n`);
  }
} catch (error) {
  console.log('   ⚠️  Could not check build\n');
}

console.log('3️⃣ CHECKING IF OLD EMAIL IS IN BUILD:\n');

try {
  const result = execSync(
    `grep -r "admin@talentvis.com" admin/dist 2>/dev/null || echo "NOT FOUND"`,
    { cwd: PROJECT_ROOT, encoding: 'utf-8' }
  );
  
  if (!result.includes('NOT FOUND')) {
    console.log('   ⚠️  OLD EMAIL STILL IN BUILD!');
    console.log('   🔴 REBUILD REQUIRED!\n');
    console.log(result.split('\n').slice(0, 3).join('\n') + '\n');
  } else {
    console.log('   ✅ Old email not in build\n');
  }
} catch (error) {
  console.log('   Could not check\n');
}

console.log('='.repeat(80));
console.log('RECOMMENDATION');
console.log('='.repeat(80) + '\n');

console.log('If old email found in build:');
console.log('   npm run build:admin');
console.log('   Hard refresh browser (Ctrl+Shift+R)\n');
