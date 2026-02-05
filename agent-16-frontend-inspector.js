#!/usr/bin/env node
/**
 * Agent 16: Frontend Auth Flow Inspector
 * Checks if frontend is storing and sending tokens correctly
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();

console.log('🔧 Agent 16: Frontend Auth Flow Inspector');
console.log('='.repeat(80) + '\n');

// Check admin frontend source
console.log('1️⃣ CHECKING ADMIN FRONTEND SOURCE:\n');

const adminSrc = path.join(PROJECT_ROOT, 'admin', 'src');

if (!fs.existsSync(adminSrc)) {
  console.log('   ❌ Admin source not found at admin/src');
  console.log('   Checking if it\'s a built app...\n');
  
  const adminDist = path.join(PROJECT_ROOT, 'admin', 'dist');
  if (fs.existsSync(adminDist)) {
    console.log('   ✅ Admin dist found - app is built');
    console.log('   Cannot inspect source code (compiled)\n');
    
    console.log('   🔍 CHECKING STATIC FILE SERVING:\n');
    
    // Check if server serves admin correctly
    const serverPath = path.join(PROJECT_ROOT, 'server.js');
    const serverContent = fs.readFileSync(serverPath, 'utf-8');
    
    const servesAdmin = serverContent.includes('admin/dist') || serverContent.includes('admin');
    console.log(`   Server serves admin: ${servesAdmin ? '✅' : '❌'}`);
    
    if (servesAdmin) {
      const adminStaticMatch = serverContent.match(/app\.use\(['"]\/admin['"],\s*express\.static\(['"]([^'"]+)['"]\)\)/);
      if (adminStaticMatch) {
        console.log(`   Admin path: ${adminStaticMatch[1]}`);
      }
    }
    console.log('');
  }
  
  console.log('='.repeat(80));
  console.log('FRONTEND TROUBLESHOOTING STEPS');
  console.log('='.repeat(80) + '\n');
  
  console.log('Since we can\'t inspect source, debug via browser:\n');
  
  console.log('1️⃣ CHECK IF TOKEN IS SAVED AFTER LOGIN:\n');
  console.log('   a) Open admin: http://localhost:8080/admin');
  console.log('   b) Open DevTools (F12) → Console');
  console.log('   c) Login as admin');
  console.log('   d) In console, type: localStorage.getItem("token")');
  console.log('   e) Should show a token like "eyJhbGciOiJIUzI1NiIsInR..."');
  console.log('   f) If null/undefined → FRONTEND NOT SAVING TOKEN\n');
  
  console.log('2️⃣ CHECK IF TOKEN IS SENT WITH REQUESTS:\n');
  console.log('   a) DevTools → Network tab');
  console.log('   b) After login, navigate to Candidates page');
  console.log('   c) Find request to /api/v1/candidates/stats');
  console.log('   d) Click it → Headers → Request Headers');
  console.log('   e) Look for: Authorization: Bearer <token>');
  console.log('   f) If missing → FRONTEND NOT SENDING TOKEN\n');
  
  console.log('3️⃣ CHECK BROWSER CONSOLE FOR ERRORS:\n');
  console.log('   a) DevTools → Console');
  console.log('   b) Look for red errors');
  console.log('   c) Common issues:');
  console.log('      - "localStorage is not defined"');
  console.log('      - "Cannot read property token"');
  console.log('      - CORS errors');
  console.log('      - 401 Unauthorized\n');
  
  console.log('4️⃣ MANUAL TOKEN TEST:\n');
  console.log('   a) Login and copy token from localStorage');
  console.log('   b) In console, run:');
  console.log('      fetch("/api/v1/candidates/stats", {');
  console.log('        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }');
  console.log('      }).then(r => r.json()).then(console.log)');
  console.log('   c) Should return candidate stats');
  console.log('   d) If 401 → Token invalid or not being sent\n');
  
  console.log('5️⃣ CHECK ADMIN CREDENTIALS:\n');
  console.log('   Check your .env for ADMIN_PASSWORD and ADMIN_EMAIL\n');
  
  const envPath = path.join(PROJECT_ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const hasAdminPassword = envContent.includes('ADMIN_PASSWORD=');
    const hasAdminEmail = envContent.includes('ADMIN_EMAIL=');
    
    console.log(`   ADMIN_PASSWORD in .env: ${hasAdminPassword ? '✅' : '❌'}`);
    console.log(`   ADMIN_EMAIL in .env: ${hasAdminEmail ? '✅' : '❌'}`);
    
    if (!hasAdminPassword) {
      console.log('\n   🔴 ADMIN_PASSWORD NOT SET!');
      console.log('   Add to .env: ADMIN_PASSWORD=your-secure-password\n');
    }
  }
  
  console.log('');
  console.log('='.repeat(80));
  console.log('POSSIBLE ISSUES');
  console.log('='.repeat(80) + '\n');
  
  console.log('1. Frontend not saving token to localStorage');
  console.log('   Fix: Check login success handler saves token\n');
  
  console.log('2. Frontend not sending token with API requests');
  console.log('   Fix: Check axios/fetch interceptors add Authorization header\n');
  
  console.log('3. Frontend redirecting before checking auth');
  console.log('   Fix: Check route guards wait for auth check\n');
  
  console.log('4. CORS blocking requests');
  console.log('   Fix: Check server CORS configuration\n');
  
  console.log('5. Admin credentials wrong');
  console.log('   Fix: Check ADMIN_EMAIL and ADMIN_PASSWORD in .env\n');
  
  console.log('📄 Report saved: agent-16-frontend-debug.txt\n');
  
  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'agent-16-frontend-debug.txt'),
    'Frontend auth debugging steps - see console output'
  );
  
  process.exit(0);
}

// If we get here, we have source code
console.log('   ✅ Admin source found\n');

// Search for auth-related files
function searchFiles(dir, patterns) {
  const results = [];
  
  function scan(currentDir) {
    try {
      const files = fs.readdirSync(currentDir);
      
      for (const file of files) {
        const fullPath = path.join(currentDir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!['node_modules', 'dist', '.git'].includes(file)) {
            scan(fullPath);
          }
        } else {
          for (const pattern of patterns) {
            if (file.match(pattern)) {
              results.push(fullPath);
              break;
            }
          }
        }
      }
    } catch (error) {
      // Skip
    }
  }
  
  scan(dir);
  return results;
}

console.log('2️⃣ SEARCHING FOR AUTH FILES:\n');

const authFiles = searchFiles(adminSrc, [/auth/i, /login/i, /token/i]);

console.log(`   Found ${authFiles.length} auth-related files:\n`);

authFiles.forEach(file => {
  const relativePath = path.relative(PROJECT_ROOT, file);
  console.log(`   📄 ${relativePath}`);
  
  const content = fs.readFileSync(file, 'utf-8');
  
  // Check if it saves token
  const savesToken = content.includes('localStorage.setItem') && 
                     (content.includes('token') || content.includes('accessToken'));
  
  if (savesToken) {
    console.log(`      ✅ Saves token to localStorage`);
    
    // Find the exact line
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('localStorage.setItem') && (line.includes('token') || line.includes('Token'))) {
        console.log(`      Line ${i + 1}: ${line.trim()}`);
      }
    });
  }
  
  // Check if it sends token
  const sendsToken = content.includes('Authorization') && content.includes('Bearer');
  if (sendsToken) {
    console.log(`      ✅ Sends token in requests`);
  }
  
  console.log('');
});

console.log('3️⃣ CHECKING API CLIENT CONFIGURATION:\n');

const apiFiles = searchFiles(adminSrc, [/api/i, /axios/i, /fetch/i, /http/i]);

apiFiles.slice(0, 3).forEach(file => {
  const relativePath = path.relative(PROJECT_ROOT, file);
  console.log(`   📄 ${relativePath}`);
  
  const content = fs.readFileSync(file, 'utf-8');
  
  // Check for Authorization header
  if (content.includes('Authorization')) {
    console.log(`      ✅ Sets Authorization header`);
    
    const authLines = content.split('\n').filter(l => 
      l.includes('Authorization') || l.includes('Bearer')
    );
    
    authLines.slice(0, 3).forEach(line => {
      console.log(`      ${line.trim()}`);
    });
  }
  
  // Check for interceptors
  if (content.includes('interceptors')) {
    console.log(`      ✅ Uses interceptors`);
  }
  
  console.log('');
});

fs.writeFileSync(
  path.join(PROJECT_ROOT, 'agent-16-frontend-debug.json'),
  JSON.stringify({ authFiles, apiFiles }, null, 2)
);

console.log('📄 Report saved: agent-16-frontend-debug.json\n');
