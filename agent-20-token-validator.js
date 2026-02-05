#!/usr/bin/env node
/**
 * Agent 20: Token Storage Validator
 * Checks if authentication token is properly stored and accessible
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Agent 20: Token Storage Validator');
console.log('='.repeat(80) + '\n');

const PROJECT_ROOT = process.cwd();

// Check how token is stored after login
console.log('1️⃣ CHECKING LOGIN PAGE TOKEN STORAGE:\n');

const loginPath = path.join(PROJECT_ROOT, 'admin/src/pages/Login.jsx');
if (fs.existsSync(loginPath)) {
  const content = fs.readFileSync(loginPath, 'utf-8');
  
  // Find where token is stored
  const storageMatches = content.match(/(sessionStorage|localStorage)\.setItem\([^)]+\)/g);
  if (storageMatches) {
    console.log('   Token storage found:');
    storageMatches.forEach(match => {
      console.log(`      ${match}`);
    });
  } else {
    console.log('   ⚠️  No token storage found in Login page');
  }
  
  // Check if token comes from response
  if (content.includes('response.data.token') || content.includes('response.token')) {
    console.log('   ✅ Token extracted from API response');
  } else {
    console.log('   ⚠️  Token extraction not found');
  }
  
  console.log('');
} else {
  console.log('   ❌ Login.jsx not found\n');
}

// Check AuthContext token management
console.log('2️⃣ CHECKING AUTHCONTEXT TOKEN MANAGEMENT:\n');

const authContextPath = path.join(PROJECT_ROOT, 'admin/src/contexts/AuthContext.jsx');
if (fs.existsSync(authContextPath)) {
  const content = fs.readFileSync(authContextPath, 'utf-8');
  
  // Check token retrieval
  const getItemMatches = content.match(/(sessionStorage|localStorage)\.getItem\([^)]+\)/g);
  if (getItemMatches) {
    console.log('   Token retrieval methods:');
    getItemMatches.slice(0, 5).forEach(match => {
      console.log(`      ${match}`);
    });
  }
  
  // Check token validation
  if (content.includes('/verify') || content.includes('/auth/verify')) {
    console.log('   ✅ Token verification endpoint used');
  } else {
    console.log('   ⚠️  No token verification found');
  }
  
  console.log('');
} else {
  console.log('   ❌ AuthContext.jsx not found\n');
}

// Check if token key is consistent
console.log('3️⃣ CHECKING TOKEN KEY CONSISTENCY:\n');

const files = [
  'admin/src/pages/Login.jsx',
  'admin/src/contexts/AuthContext.jsx',
  'admin/src/shared/services/api/ApiClient.js'
];

const tokenKeys = new Set();
files.forEach(file => {
  const filePath = path.join(PROJECT_ROOT, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const matches = content.match(/['"`](admin_token|token|auth_token|access_token)['"`]/g);
    if (matches) {
      matches.forEach(m => tokenKeys.add(m.replace(/['"`]/g, '')));
    }
  }
});

if (tokenKeys.size === 1) {
  console.log(`   ✅ Consistent token key: ${Array.from(tokenKeys)[0]}`);
} else if (tokenKeys.size > 1) {
  console.log('   ⚠️  Multiple token keys found:');
  tokenKeys.forEach(key => console.log(`      - ${key}`));
} else {
  console.log('   ❌ No token keys found');
}

console.log('\n' + '='.repeat(80));
console.log('DIAGNOSIS');
console.log('='.repeat(80) + '\n');

console.log('🔧 Token should be stored with key: admin_token');
console.log('🔧 Token should be stored in: sessionStorage');
console.log('🔧 Token should be sent as: Authorization: Bearer <token>\n');
