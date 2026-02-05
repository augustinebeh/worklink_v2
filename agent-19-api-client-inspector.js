#!/usr/bin/env node
/**
 * Agent 19: Frontend API Client Inspector
 * Examines how the frontend makes API calls to candidates endpoint
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Agent 19: Frontend API Client Inspector');
console.log('='.repeat(80) + '\n');

const PROJECT_ROOT = process.cwd();

// Check API client configuration
console.log('1️⃣ EXAMINING API CLIENT CONFIGURATION:\n');

const apiClientPath = path.join(PROJECT_ROOT, 'admin/src/shared/services/api/ApiClient.js');
if (fs.existsSync(apiClientPath)) {
  const content = fs.readFileSync(apiClientPath, 'utf-8');
  
  // Check base URL
  const baseUrlMatch = content.match(/baseURL[:\s]*['"`]([^'"`]+)['"`]/);
  if (baseUrlMatch) {
    console.log(`   Base URL: ${baseUrlMatch[1]}`);
  } else {
    console.log('   ⚠️  No baseURL found in ApiClient');
  }
  
  // Check if Authorization header is added
  const authHeaderMatch = content.match(/Authorization.*Bearer.*token/i);
  if (authHeaderMatch) {
    console.log('   ✅ Authorization header logic found');
  } else {
    console.log('   ❌ No Authorization header logic found');
  }
  
  // Check token storage key
  const tokenKeyMatch = content.match(/localStorage\.getItem\(['"`]([^'"`]+)['"`]\)/g);
  if (tokenKeyMatch) {
    console.log('   Token storage keys used:');
    tokenKeyMatch.forEach(match => {
      const key = match.match(/['"`]([^'"`]+)['"`]/)[1];
      console.log(`      - ${key}`);
    });
  }
  
  console.log('');
} else {
  console.log('   ❌ ApiClient.js not found\n');
}

// Check candidates API calls
console.log('2️⃣ EXAMINING CANDIDATES PAGE API CALLS:\n');

const candidatesPagePath = path.join(PROJECT_ROOT, 'admin/src/pages/Candidates.jsx');
if (fs.existsSync(candidatesPagePath)) {
  const content = fs.readFileSync(candidatesPagePath, 'utf-8');
  
  // Find API call
  const apiCallMatch = content.match(/api\.candidates\.getAll\([^)]*\)/);
  if (apiCallMatch) {
    console.log(`   API call found: ${apiCallMatch[0]}`);
  }
  
  // Check for error handling
  if (content.includes('catch') && content.includes('error')) {
    console.log('   ✅ Error handling present');
  } else {
    console.log('   ⚠️  Limited error handling');
  }
  
  // Check for loading states
  if (content.includes('loading') || content.includes('isLoading')) {
    console.log('   ✅ Loading state management present');
  }
  
  console.log('');
} else {
  console.log('   ❌ Candidates.jsx not found\n');
}

// Check API service methods
console.log('3️⃣ EXAMINING API SERVICE METHODS:\n');

const apiServicesPath = path.join(PROJECT_ROOT, 'admin/src/shared/services/api');
if (fs.existsSync(apiServicesPath)) {
  const files = fs.readdirSync(apiServicesPath);
  const candidateFile = files.find(f => f.toLowerCase().includes('candidate'));
  
  if (candidateFile) {
    const content = fs.readFileSync(path.join(apiServicesPath, candidateFile), 'utf-8');
    
    console.log(`   Found: ${candidateFile}\n`);
    
    // Extract getAll method
    const getAllMatch = content.match(/getAll[:\s]*.*?{[\s\S]*?return[\s\S]*?}/m);
    if (getAllMatch) {
      console.log('   getAll method implementation:');
      console.log('   ' + getAllMatch[0].split('\n').slice(0, 10).join('\n   '));
      console.log('');
    }
  } else {
    console.log('   ⚠️  No candidate service file found\n');
  }
} else {
  console.log('   ❌ API services directory not found\n');
}

console.log('='.repeat(80));
console.log('FINDINGS');
console.log('='.repeat(80) + '\n');

console.log('📋 Key things to verify:\n');
console.log('1. Base URL should be: http://localhost:8080/api/v1');
console.log('2. Token should be read from: admin_token');
console.log('3. Authorization header should be: Bearer <token>');
console.log('4. API call should be: GET /api/v1/candidates');
console.log('5. Error handling should catch 401/403 errors\n');
