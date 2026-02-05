#!/usr/bin/env node
/**
 * Agent 15: Authentication Persistence Fixer
 * Fixes token not persisting and constant login redirects
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();

console.log('🔧 Agent 15: Authentication Persistence Fixer');
console.log('='.repeat(80) + '\n');

// Check auth middleware
console.log('1️⃣ CHECKING AUTH MIDDLEWARE:\n');

const authPath = path.join(PROJECT_ROOT, 'middleware', 'auth.js');
const authContent = fs.readFileSync(authPath, 'utf-8');

// Check for JWT secret
const hasJwtSecret = authContent.includes('JWT_SECRET') || authContent.includes('process.env.JWT_SECRET');
console.log(`   JWT_SECRET configured: ${hasJwtSecret ? '✅' : '❌'}`);

// Check token expiration
const expiresInMatch = authContent.match(/expiresIn:\s*['"]([^'"]+)['"]/);
if (expiresInMatch) {
  console.log(`   Token expiration: ${expiresInMatch[1]}`);
} else {
  console.log(`   Token expiration: Not found ⚠️`);
}

// Check .env file
console.log('\n2️⃣ CHECKING .ENV FILE:\n');

const envPath = path.join(PROJECT_ROOT, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  const hasJwtSecret = envContent.includes('JWT_SECRET=');
  console.log(`   JWT_SECRET in .env: ${hasJwtSecret ? '✅' : '❌'}`);
  
  if (!hasJwtSecret) {
    console.log('\n   🔴 PROBLEM FOUND: No JWT_SECRET in .env!');
    console.log('   This causes auth tokens to fail on server restart\n');
  }
  
  // Check session secret
  const hasSessionSecret = envContent.includes('SESSION_SECRET=');
  console.log(`   SESSION_SECRET in .env: ${hasSessionSecret ? '✅' : '❌'}`);
  
} else {
  console.log('   ❌ .env file not found!\n');
}

// Check auth routes
console.log('\n3️⃣ CHECKING AUTH ROUTES:\n');

const authRoutesPath = path.join(PROJECT_ROOT, 'routes', 'api', 'v1', 'auth');
let loginPath = null;

if (fs.existsSync(authRoutesPath) && fs.statSync(authRoutesPath).isDirectory()) {
  console.log('   Auth is modular');
  
  // Check for login route
  const routesDir = path.join(authRoutesPath, 'routes');
  if (fs.existsSync(routesDir)) {
    const files = fs.readdirSync(routesDir);
    const loginFile = files.find(f => f.includes('login'));
    
    if (loginFile) {
      loginPath = path.join(routesDir, loginFile);
      console.log(`   Login route: ${loginFile} ✅`);
    }
  }
} else {
  const authFilePath = path.join(PROJECT_ROOT, 'routes', 'api', 'v1', 'auth.js');
  if (fs.existsSync(authFilePath)) {
    console.log('   Auth is monolithic');
    loginPath = authFilePath;
  }
}

if (loginPath) {
  const loginContent = fs.readFileSync(loginPath, 'utf-8');
  
  // Check if token is returned in response
  const hasTokenInResponse = loginContent.includes('token:') || loginContent.includes('accessToken:');
  console.log(`   Returns token in response: ${hasTokenInResponse ? '✅' : '❌'}`);
  
  // Check if using httpOnly cookies (bad for SPA)
  const usesHttpOnlyCookie = loginContent.includes('httpOnly: true');
  if (usesHttpOnlyCookie) {
    console.log('   ⚠️  Using httpOnly cookies - can\'t be read by JavaScript!');
    console.log('   This prevents frontend from accessing token\n');
  }
  
  // Check token generation
  const jwtSignMatch = loginContent.match(/jwt\.sign\(([\s\S]*?)\)/);
  if (jwtSignMatch) {
    console.log('\n   JWT signing found:');
    console.log('   ' + jwtSignMatch[0].split('\n').map(l => l.trim()).slice(0, 5).join('\n   '));
    console.log('');
  }
}

// Check for common issues
console.log('\n4️⃣ COMMON AUTHENTICATION ISSUES:\n');

const issues = [];

// Issue 1: No JWT_SECRET
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
if (!envContent.includes('JWT_SECRET=')) {
  issues.push({
    issue: 'Missing JWT_SECRET in .env',
    impact: 'Tokens become invalid on server restart',
    fix: 'Add JWT_SECRET=your-super-secret-key-here to .env'
  });
}

// Issue 2: Token expiration too short
if (expiresInMatch && expiresInMatch[1].includes('5m')) {
  issues.push({
    issue: 'Token expires in 5 minutes',
    impact: 'User gets logged out too quickly',
    fix: 'Change expiresIn to "24h" or "7d"'
  });
}

// Issue 3: httpOnly cookies
if (loginPath) {
  const loginContent = fs.readFileSync(loginPath, 'utf-8');
  if (loginContent.includes('httpOnly: true')) {
    issues.push({
      issue: 'Using httpOnly cookies',
      impact: 'Frontend JavaScript cannot access token',
      fix: 'Return token in JSON response instead'
    });
  }
}

if (issues.length > 0) {
  console.log(`   Found ${issues.length} issues:\n`);
  issues.forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue.issue}`);
    console.log(`      Impact: ${issue.impact}`);
    console.log(`      Fix: ${issue.fix}`);
    console.log('');
  });
} else {
  console.log('   ✅ No obvious issues found\n');
}

// Generate fix recommendations
console.log('\n' + '='.repeat(80));
console.log('AUTHENTICATION FIX RECOMMENDATIONS');
console.log('='.repeat(80) + '\n');

console.log('🔧 IMMEDIATE FIXES:\n');

console.log('1. Add JWT_SECRET to .env:');
console.log('   echo "JWT_SECRET=worklink-super-secret-jwt-key-2024" >> .env\n');

console.log('2. Check token expiration (should be long enough):');
console.log('   Current: ' + (expiresInMatch ? expiresInMatch[1] : 'Unknown'));
console.log('   Recommended: 24h or 7d\n');

console.log('3. Verify token is returned to frontend:');
console.log('   Login response should include:');
console.log('   {');
console.log('     "success": true,');
console.log('     "token": "eyJhbGciOiJIUzI1NiIsInR...",');
console.log('     "user": { ... }');
console.log('   }\n');

console.log('4. Check frontend stores token:');
console.log('   localStorage.setItem("token", response.token)\n');

console.log('5. Check frontend sends token:');
console.log('   headers: {');
console.log('     "Authorization": `Bearer ${localStorage.getItem("token")}`');
console.log('   }\n');

// Save report
const report = {
  issues,
  recommendations: [
    'Add JWT_SECRET to .env',
    'Increase token expiration time',
    'Return token in JSON (not httpOnly cookie)',
    'Frontend must store token in localStorage',
    'Frontend must send token in Authorization header'
  ]
};

fs.writeFileSync(
  path.join(PROJECT_ROOT, 'agent-15-auth-fix.json'),
  JSON.stringify(report, null, 2)
);

console.log('📄 Report saved: agent-15-auth-fix.json\n');
