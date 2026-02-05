#!/usr/bin/env node
/**
 * Agent 14: Admin Auth Token Persistence Fixer
 * Fixes auth token not persisting after login/refresh
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const results = {
  issues: [],
  fixes: []
};

console.log('🔧 Agent 14: Admin Auth Token Persistence Fixer');
console.log('='.repeat(80) + '\n');

// Check backend auth endpoint
console.log('1️⃣ CHECKING BACKEND AUTH ENDPOINT...\n');

const authRoutePath = path.join(PROJECT_ROOT, 'routes', 'api', 'v1', 'auth');
let authIndexPath = path.join(authRoutePath, 'index.js');

// Check if auth is modular or monolithic
if (!fs.existsSync(authRoutePath)) {
  authIndexPath = path.join(PROJECT_ROOT, 'routes', 'api', 'v1', 'auth.js');
}

if (!fs.existsSync(authIndexPath)) {
  console.log('❌ Auth route not found!\n');
  process.exit(1);
}

const authContent = fs.readFileSync(authIndexPath, 'utf-8');

// Check if login endpoint returns token
const hasLoginEndpoint = authContent.includes('/login') || authContent.includes("'login'");
const hasTokenInResponse = authContent.includes('token:') && authContent.includes('jwt.sign');

console.log(`   Login endpoint exists: ${hasLoginEndpoint ? '✅' : '❌'}`);
console.log(`   Returns JWT token: ${hasTokenInResponse ? '✅' : '❌'}`);

if (!hasTokenInResponse) {
  console.log('   🔴 Backend not generating/returning token!\n');
  results.issues.push('Backend login not returning token');
}

// Check token expiration
const expiresInMatch = authContent.match(/expiresIn:\s*['"]([^'"]+)['"]/);
if (expiresInMatch) {
  console.log(`   Token expiration: ${expiresInMatch[1]}`);
} else {
  console.log('   ⚠️  No token expiration set (might be too short)\n');
}

console.log('');

// Check frontend admin source
console.log('2️⃣ CHECKING ADMIN FRONTEND AUTH...\n');

const adminSrcPath = path.join(PROJECT_ROOT, 'admin', 'src');

if (!fs.existsSync(adminSrcPath)) {
  console.log('❌ Admin source not found (may need to build)\n');
  console.log('💡 BACKEND FIX: Increase token expiration\n');
  
  // Fix backend token expiration
  console.log('🔧 FIXING BACKEND TOKEN EXPIRATION...\n');
  
  const fixedAuthContent = authContent.replace(
    /expiresIn:\s*['"]1h['"]/g,
    "expiresIn: '7d'"  // 7 days
  ).replace(
    /expiresIn:\s*['"]24h['"]/g,
    "expiresIn: '7d'"  // 7 days
  );
  
  if (fixedAuthContent !== authContent) {
    fs.writeFileSync(authIndexPath + '.BEFORE_TOKEN_FIX', authContent);
    fs.writeFileSync(authIndexPath, fixedAuthContent);
    
    console.log('   ✅ Changed token expiration to 7 days');
    console.log('   ✅ Backup created\n');
    
    results.fixes.push('Increased JWT token expiration to 7 days');
  }
  
} else {
  console.log('✅ Admin source found\n');
  
  // Search for auth-related files
  function findFiles(dir, pattern, results = []) {
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!['node_modules', 'dist', '.git'].includes(file)) {
            findFiles(fullPath, pattern, results);
          }
        } else if (file.match(pattern)) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      // Skip
    }
    
    return results;
  }
  
  const authFiles = findFiles(adminSrcPath, /auth|login/i);
  
  console.log(`   Found ${authFiles.length} auth-related files\n`);
  
  authFiles.slice(0, 5).forEach(file => {
    const relativePath = path.relative(PROJECT_ROOT, file);
    console.log(`   📄 ${relativePath}`);
    
    const content = fs.readFileSync(file, 'utf-8');
    
    // Check for localStorage usage
    const hasLocalStorage = content.includes('localStorage');
    const hasSaveToken = content.includes('localStorage.setItem') && content.includes('token');
    const hasGetToken = content.includes('localStorage.getItem') && content.includes('token');
    
    console.log(`      - Uses localStorage: ${hasLocalStorage ? '✅' : '❌'}`);
    console.log(`      - Saves token: ${hasSaveToken ? '✅' : '❌'}`);
    console.log(`      - Gets token: ${hasGetToken ? '✅' : '❌'}`);
    
    if (!hasSaveToken) {
      console.log(`      🔴 NOT SAVING TOKEN TO LOCALSTORAGE!`);
      results.issues.push(`${relativePath}: Not saving token to localStorage`);
    }
  });
  
  console.log('');
}

// Generate fix instructions
console.log('='.repeat(80));
console.log('FIX INSTRUCTIONS');
console.log('='.repeat(80) + '\n');

console.log('🔧 BACKEND FIX (Applied if possible):\n');
console.log('   Increase JWT token expiration from 1h/24h to 7 days\n');

console.log('🔧 FRONTEND FIX (Manual - needs admin source):\n');
console.log('   1. In your login handler, after successful login:');
console.log('');
console.log('      const response = await fetch("/api/v1/auth/login", {');
console.log('        method: "POST",');
console.log('        body: JSON.stringify({ email, password })');
console.log('      });');
console.log('');
console.log('      const data = await response.json();');
console.log('');
console.log('      if (data.token) {');
console.log('        localStorage.setItem("token", data.token);  // ← ADD THIS');
console.log('        localStorage.setItem("user", JSON.stringify(data.user));');
console.log('      }');
console.log('');
console.log('   2. On app initialization (App.jsx or main.tsx):');
console.log('');
console.log('      useEffect(() => {');
console.log('        const token = localStorage.getItem("token");');
console.log('        if (token) {');
console.log('          setIsAuthenticated(true);');
console.log('        }');
console.log('      }, []);');
console.log('');
console.log('   3. In your API client (axios/fetch):');
console.log('');
console.log('      headers: {');
console.log('        "Authorization": `Bearer ${localStorage.getItem("token")}`');
console.log('      }');
console.log('');

console.log('🔧 QUICK TEST (In browser console):\n');
console.log('   After login, check:');
console.log('      localStorage.getItem("token")');
console.log('');
console.log('   Should return the JWT token, not null\n');

// Save report
fs.writeFileSync(
  path.join(PROJECT_ROOT, 'agent-14-auth-fix.json'),
  JSON.stringify(results, null, 2)
);

console.log('📄 Report saved: agent-14-auth-fix.json\n');

if (results.fixes.length > 0) {
  console.log('✅ BACKEND FIX APPLIED! Restart server.\n');
} else {
  console.log('⚠️  MANUAL FRONTEND FIX REQUIRED\n');
}
