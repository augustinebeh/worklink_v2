#!/usr/bin/env node

/**
 * GeBIZ Intelligence Backend Integration Test
 * Verifies all files are in place and database can be initialized
 */

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  🧪 GEBIZ INTELLIGENCE BACKEND INTEGRATION TEST');
console.log('═══════════════════════════════════════════════════════════════\n');

let allPassed = true;

// Test 1: Check files exist
console.log('Test 1: Checking files exist...');
const requiredFiles = [
  'routes/api/v1/gebiz-intelligence.js',
  'database/gebiz_schema.sql',
  'services/gebiz-scraping/datagovsg-client.js',
  'services/gebiz-scraping/historical-sync.js',
  'scripts/init-gebiz-database.js'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING!`);
    allPassed = false;
  }
});

// Test 2: Check route is mounted
console.log('\nTest 2: Checking routes/api/v1/index.js...');
const indexPath = path.join(__dirname, 'routes/api/v1/index.js');
const indexContent = fs.readFileSync(indexPath, 'utf8');

if (indexContent.includes('gebiz-intelligence')) {
  console.log('  ✅ GeBIZ routes imported');
} else {
  console.log('  ❌ GeBIZ routes NOT imported');
  allPassed = false;
}

if (indexContent.includes("router.use('/gebiz',")) {
  console.log('  ✅ GeBIZ routes mounted at /api/v1/gebiz');
} else {
  console.log('  ❌ GeBIZ routes NOT mounted');
  allPassed = false;
}

// Test 3: Check frontend files
console.log('\nTest 3: Checking frontend files...');
const frontendFiles = [
  'admin/src/pages/GeBizIntelligence.jsx',
  'admin/src/App.jsx',
  'admin/src/components/layout/Sidebar.jsx'
];

frontendFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING!`);
    allPassed = false;
  }
});

// Test 4: Check dependencies
console.log('\nTest 4: Checking package.json dependencies...');
const packageJson = require('./package.json');

if (packageJson.dependencies['better-sqlite3']) {
  console.log('  ✅ better-sqlite3 in dependencies');
} else {
  console.log('  ❌ better-sqlite3 NOT in dependencies');
  allPassed = false;
}

if (packageJson.dependencies['axios'] || packageJson.devDependencies['axios']) {
  console.log('  ✅ axios available');
} else {
  console.log('  ⚠️  axios NOT found (needed for Data.gov.sg API)');
  console.log('     Run: npm install axios');
}

// Test 5: Try to initialize database (if better-sqlite3 is available)
console.log('\nTest 5: Testing database initialization...');
try {
  const Database = require('better-sqlite3');
  const dbPath = path.join(__dirname, 'database/gebiz_test.db');
  
  // Remove test db if exists
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  
  const db = new Database(dbPath);
  db.close();
  fs.unlinkSync(dbPath);
  
  console.log('  ✅ Database module working correctly');
} catch (error) {
  console.log('  ❌ Database initialization failed:', error.message);
  allPassed = false;
}

// Final result
console.log('\n═══════════════════════════════════════════════════════════════');
if (allPassed) {
  console.log('  ✅ ALL TESTS PASSED - BACKEND INTEGRATION COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('Next steps:');
  console.log('  1. Initialize database: node scripts/init-gebiz-database.js');
  console.log('  2. Start server: npm start');
  console.log('  3. Visit: http://localhost:8080/admin/gebiz-intelligence');
  console.log('  4. Click "Sync Data" to import historical tenders\n');
} else {
  console.log('  ❌ SOME TESTS FAILED - CHECK ERRORS ABOVE');
  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(1);
}
