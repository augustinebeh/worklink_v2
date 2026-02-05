#!/usr/bin/env node
/**
 * AGENT 23-28: Multi-Agent Diagnostic Suite
 * Comprehensive frontend debugging
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 AGENTS 23-28: Multi-Agent Diagnostic Suite');
console.log('='.repeat(80) + '\n');

// AGENT 23: Check if server is running
console.log('👤 AGENT 23: Server Status Check\n');
try {
  const result = execSync('lsof -ti:8080', { encoding: 'utf-8', stdio: 'pipe' });
  if (result.trim()) {
    console.log('   ✅ Server running on port 8080');
    console.log(`   PID: ${result.trim()}\n`);
  }
} catch {
  console.log('   ❌ Server NOT running on port 8080!\n');
}

// AGENT 24: Check admin/dist exists and has files
console.log('👤 AGENT 24: Build Output Check\n');
const distPath = path.join(process.cwd(), 'admin/dist');
if (fs.existsSync(distPath)) {
  const files = fs.readdirSync(distPath);
  console.log(`   ✅ admin/dist exists (${files.length} files)`);
  
  const hasIndex = fs.existsSync(path.join(distPath, 'index.html'));
  const hasAssets = fs.existsSync(path.join(distPath, 'assets'));
  
  console.log(`   Index.html: ${hasIndex ? '✅' : '❌'}`);
  console.log(`   Assets folder: ${hasAssets ? '✅' : '❌'}\n`);
} else {
  console.log('   ❌ admin/dist does NOT exist!\n');
}

// AGENT 25: Check if AuthContext uses correct verification
console.log('👤 AGENT 25: AuthContext Verification Check\n');
const authContextPath = path.join(process.cwd(), 'admin/src/contexts/AuthContext.jsx');
if (fs.existsSync(authContextPath)) {
  const content = fs.readFileSync(authContextPath, 'utf-8');
  
  if (content.includes('/api/v1/auth/verify')) {
    console.log('   ✅ Uses /verify endpoint');
  } else {
    console.log('   ⚠️  Does not use /verify endpoint');
  }
  
  if (content.includes('optimistic') || content.includes('immediately')) {
    console.log('   ✅ Has optimistic loading');
  } else {
    console.log('   ⚠️  No optimistic loading');
  }
  
  console.log('');
} else {
  console.log('   ❌ AuthContext not found!\n');
}

// AGENT 26: Check API base URL configuration
console.log('👤 AGENT 26: API Configuration Check\n');
const apiClientPath = path.join(process.cwd(), 'admin/src/shared/services/api/ApiClient.js');
if (fs.existsSync(apiClientPath)) {
  const content = fs.readFileSync(apiClientPath, 'utf-8');
  
  // Check for baseURL
  const baseURLMatch = content.match(/baseURL[:\s=]+['"`]([^'"`]+)['"`]/);
  if (baseURLMatch) {
    console.log(`   ✅ Base URL: ${baseURLMatch[1]}`);
  } else {
    console.log('   ⚠️  No baseURL found');
  }
  
  // Check if it uses window.location
  if (content.includes('window.location')) {
    console.log('   ✅ Uses window.location (dynamic)');
  }
  
  console.log('');
} else {
  console.log('   ❌ ApiClient not found!\n');
}

// AGENT 27: Check routes configuration
console.log('👤 AGENT 27: Routes Configuration Check\n');
const appPath = path.join(process.cwd(), 'admin/src/App.jsx');
if (fs.existsSync(appPath)) {
  const content = fs.readFileSync(appPath, 'utf-8');
  
  if (content.includes('/candidates')) {
    console.log('   ✅ /candidates route exists');
  } else {
    console.log('   ❌ /candidates route missing!');
  }
  
  if (content.includes('AuthProvider') || content.includes('AuthContext')) {
    console.log('   ✅ Auth provider configured');
  } else {
    console.log('   ⚠️  Auth provider not found');
  }
  
  console.log('');
} else {
  console.log('   ❌ App.jsx not found!\n');
}

// AGENT 28: Check if login page exists
console.log('👤 AGENT 28: Login Page Check\n');
const loginPath = path.join(process.cwd(), 'admin/src/pages/Login.jsx');
if (fs.existsSync(loginPath)) {
  const content = fs.readFileSync(loginPath, 'utf-8');
  
  if (content.includes('admin@worklink.sg')) {
    console.log('   ✅ Uses correct email (admin@worklink.sg)');
  } else if (content.includes('admin@talentvis.com')) {
    console.log('   ⚠️  Uses OLD email (admin@talentvis.com)');
  } else {
    console.log('   ℹ️  No hardcoded email');
  }
  
  if (content.includes('/api/v1/auth/login')) {
    console.log('   ✅ Uses correct login endpoint');
  }
  
  console.log('');
} else {
  console.log('   ❌ Login.jsx not found!\n');
}

console.log('='.repeat(80));
console.log('CRITICAL FINDINGS');
console.log('='.repeat(80) + '\n');

// Generate final report
const issues = [];
if (!fs.existsSync(distPath)) issues.push('❌ Build output missing');
if (!fs.existsSync(authContextPath)) issues.push('❌ AuthContext missing');
if (!fs.existsSync(apiClientPath)) issues.push('❌ ApiClient missing');

if (issues.length > 0) {
  console.log('🔴 CRITICAL ISSUES:\n');
  issues.forEach(i => console.log(`   ${i}`));
  console.log('');
} else {
  console.log('✅ All core files present\n');
}

console.log('🔧 DEBUGGING CHECKLIST:\n');
console.log('[ ] 1. Server is running (check port 8080)');
console.log('[ ] 2. Frontend is built (npm run build:admin)');
console.log('[ ] 3. Browser cache cleared (Ctrl+Shift+R)');
console.log('[ ] 4. Logged in with admin@worklink.sg');
console.log('[ ] 5. Check browser console for errors');
console.log('[ ] 6. Check Network tab for API calls\n');
