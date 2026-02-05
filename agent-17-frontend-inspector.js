#!/usr/bin/env node
/**
 * Agent 17: Frontend API Call Inspector
 * Finds why candidates and jobs aren't showing in admin portal
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();

console.log('🔍 Agent 17: Frontend API Call Inspector');
console.log('='.repeat(80) + '\n');

const adminSrc = path.join(PROJECT_ROOT, 'admin', 'src');

if (!fs.existsSync(adminSrc)) {
  console.log('❌ Admin source not found\n');
  process.exit(1);
}

// Search for files
function searchInFiles(dir, pattern, filePattern) {
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
        } else if (file.match(filePattern)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (pattern.test(content)) {
            results.push({ file: fullPath, content });
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

console.log('1️⃣ FINDING CANDIDATES PAGE COMPONENT:\n');

// Find candidates page
const candidatePages = searchInFiles(adminSrc, /candidates/i, /\.jsx?$/);

const candidatesPage = candidatePages.find(r => 
  r.file.includes('pages') && r.file.includes('Candidate')
);

if (candidatesPage) {
  const relativePath = path.relative(PROJECT_ROOT, candidatesPage.file);
  console.log(`   📄 Found: ${relativePath}\n`);
  
  const content = candidatesPage.content;
  
  // Check API endpoints being called
  console.log('   🔍 API Endpoints Called:\n');
  
  const apiCalls = content.match(/['"`]\/api\/v1\/candidates[^'"`]*['"`]/g);
  if (apiCalls) {
    const unique = [...new Set(apiCalls)];
    unique.forEach(call => {
      console.log(`      ${call}`);
    });
  } else {
    console.log('      ⚠️  No direct API calls found');
  }
  
  console.log('');
  
  // Check if using a service/hook
  const usesCandidateService = content.includes('candidateService') || 
                                content.includes('useCandidates');
  
  if (usesCandidateService) {
    console.log('   ✅ Uses candidateService or hook\n');
    
    // Find the service file
    const serviceFiles = searchInFiles(adminSrc, /candidate/i, /service\.js$/);
    
    if (serviceFiles.length > 0) {
      const serviceFile = serviceFiles[0];
      const servicePath = path.relative(PROJECT_ROOT, serviceFile.file);
      console.log(`   📄 Service: ${servicePath}\n`);
      
      const serviceContent = serviceFile.content;
      
      // Find list/getAll method
      console.log('   🔍 Service Methods:\n');
      
      const listMatch = serviceContent.match(/(?:getAll|list|fetch).*?\{[\s\S]{0,500}?\/api\/v1\/candidates[^'"`]*['"`]/);
      if (listMatch) {
        console.log('      Found list method:');
        const lines = listMatch[0].split('\n').slice(0, 10);
        lines.forEach(line => console.log(`      ${line.trim()}`));
        console.log('');
      }
      
      // Check what endpoint it calls
      const endpoints = serviceContent.match(/['"`]\/api\/v1\/candidates[^'"`]*['"`]/g);
      if (endpoints) {
        console.log('      Endpoints in service:');
        const unique = [...new Set(endpoints)];
        unique.forEach(ep => console.log(`         ${ep}`));
        console.log('');
      }
    }
  }
  
  // Check for status filter logic
  console.log('   🔍 Status Filter Logic:\n');
  
  const hasStatusFilter = content.includes('status') && 
                          (content.includes('filter') || content.includes('Filter'));
  
  if (hasStatusFilter) {
    console.log('      ✅ Has status filter\n');
    
    // Look for how it passes status
    const statusParamMatch = content.match(/status[=:]\s*([^,\n}]+)/);
    if (statusParamMatch) {
      console.log(`      Status param: ${statusParamMatch[0]}`);
      console.log('');
    }
  }
  
} else {
  console.log('   ⚠️  Candidates page not found\n');
}

console.log('2️⃣ FINDING JOBS PAGE COMPONENT:\n');

// Find jobs page
const jobPages = searchInFiles(adminSrc, /jobs/i, /\.jsx?$/);

const jobsPage = jobPages.find(r => 
  r.file.includes('pages') && r.file.includes('Job')
);

if (jobsPage) {
  const relativePath = path.relative(PROJECT_ROOT, jobsPage.file);
  console.log(`   📄 Found: ${relativePath}\n`);
  
  const content = jobsPage.content;
  
  // Check API endpoints being called
  console.log('   🔍 API Endpoints Called:\n');
  
  const apiCalls = content.match(/['"`]\/api\/v1\/jobs[^'"`]*['"`]/g);
  if (apiCalls) {
    const unique = [...new Set(apiCalls)];
    unique.forEach(call => {
      console.log(`      ${call}`);
    });
  } else {
    console.log('      ⚠️  No direct API calls found');
  }
  
  console.log('');
  
  // Check if using a service
  const usesJobService = content.includes('jobService') || content.includes('useJobs');
  
  if (usesJobService) {
    console.log('   ✅ Uses jobService or hook\n');
    
    // Find the service file
    const serviceFiles = searchInFiles(adminSrc, /job/i, /service\.js$/);
    
    if (serviceFiles.length > 0) {
      const serviceFile = serviceFiles[0];
      const servicePath = path.relative(PROJECT_ROOT, serviceFile.file);
      console.log(`   📄 Service: ${servicePath}\n`);
      
      const serviceContent = serviceFile.content;
      
      // Check what endpoint it calls
      const endpoints = serviceContent.match(/['"`]\/api\/v1\/jobs[^'"`]*['"`]/g);
      if (endpoints) {
        console.log('      Endpoints in service:');
        const unique = [...new Set(endpoints)];
        unique.forEach(ep => console.log(`         ${ep}`));
        console.log('');
      }
      
      // Check for status handling
      console.log('      🔍 Status Parameter Handling:\n');
      
      const statusMatch = serviceContent.match(/status.*?[=:].*?['"`]all['"`]/);
      if (statusMatch) {
        console.log(`         Found "all" handling: ${statusMatch[0]}`);
      }
      
      // Look for query string building
      const queryMatch = serviceContent.match(/\?.*status/);
      if (queryMatch) {
        console.log(`         Query string: ${queryMatch[0]}`);
      }
      
      console.log('');
    }
  }
  
  // Check "All" status filter
  console.log('   🔍 "All Status" Filter Logic:\n');
  
  const allFilterMatch = content.match(/['"`]all['"`]|status\s*===?\s*['"`]all['"`]/);
  if (allFilterMatch) {
    console.log(`      ✅ Has "all" status check`);
    console.log(`         ${allFilterMatch[0]}`);
    console.log('');
  } else {
    console.log('      ⚠️  No "all" status handling found\n');
  }
}

console.log('3️⃣ CHECKING API SERVICE FILES:\n');

// Find API client/service base
const apiClientFiles = searchInFiles(adminSrc, /api/i, /(ApiClient|api\.service|http)\.js$/);

if (apiClientFiles.length > 0) {
  console.log(`   Found ${apiClientFiles.length} API-related files:\n`);
  
  apiClientFiles.slice(0, 3).forEach(file => {
    const relativePath = path.relative(PROJECT_ROOT, file.file);
    console.log(`   📄 ${relativePath}`);
    
    // Check if it adds Authorization header
    if (file.content.includes('Authorization')) {
      console.log(`      ✅ Sets Authorization header`);
    }
    
    // Check if it reads token
    if (file.content.includes('admin_token')) {
      console.log(`      ✅ Reads admin_token from localStorage`);
    }
    
    console.log('');
  });
}

console.log('='.repeat(80));
console.log('DIAGNOSIS');
console.log('='.repeat(80) + '\n');

console.log('🔍 COMMON ISSUES TO CHECK:\n');

console.log('1. CANDIDATES NOT SHOWING:');
console.log('   • Frontend calling /api/v1/candidates? (Requires auth)');
console.log('   • Token being sent in Authorization header?');
console.log('   • Response being handled correctly?\n');

console.log('2. JOBS "ALL STATUS" NOT SHOWING:');
console.log('   • Frontend sending status="all"?');
console.log('   • Or should it send NO status parameter?');
console.log('   • Backend expects: ?status=all or no status param\n');

console.log('🧪 MANUAL TESTS:\n');

console.log('Test candidates endpoint:');
console.log('   Open browser console (F12) and run:');
console.log('   fetch("/api/v1/candidates", {');
console.log('     headers: { "Authorization": "Bearer " + localStorage.getItem("admin_token") }');
console.log('   }).then(r => r.json()).then(console.log)\n');

console.log('Test jobs "all" filter:');
console.log('   fetch("/api/v1/jobs?status=all")');
console.log('     .then(r => r.json()).then(console.log)\n');

console.log('Test jobs no filter:');
console.log('   fetch("/api/v1/jobs")');
console.log('     .then(r => r.json()).then(console.log)\n');

fs.writeFileSync(
  path.join(PROJECT_ROOT, 'agent-17-frontend-diagnosis.txt'),
  'Frontend API diagnosis - see console output'
);

console.log('📄 Report saved: agent-17-frontend-diagnosis.txt\n');
