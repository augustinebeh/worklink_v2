#!/usr/bin/env node
/**
 * Agent 18: Database Connection Verifier
 * Checks which database file backend is using and verifies data exists
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();

console.log('🔍 Agent 18: Database Connection Verifier');
console.log('='.repeat(80) + '\n');

// Find all SQLite database files
console.log('1️⃣ SEARCHING FOR DATABASE FILES:\n');

function findDatabases(dir) {
  const dbs = [];
  
  function scan(currentDir) {
    try {
      const files = fs.readdirSync(currentDir);
      
      for (const file of files) {
        const fullPath = path.join(currentDir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!['node_modules', '.git', 'admin', 'worker'].includes(file)) {
            scan(fullPath);
          }
        } else if (file.endsWith('.db') || file.endsWith('.sqlite') || file.endsWith('.sqlite3')) {
          const size = stat.size;
          const modified = stat.mtime.toLocaleString();
          dbs.push({ path: fullPath, size, modified, name: file });
        }
      }
    } catch (error) {
      // Skip
    }
  }
  
  scan(dir);
  return dbs;
}

const databases = findDatabases(PROJECT_ROOT);

console.log(`   Found ${databases.length} database files:\n`);

databases.forEach((db, i) => {
  const relativePath = path.relative(PROJECT_ROOT, db.path);
  const sizeKB = (db.size / 1024).toFixed(2);
  console.log(`   ${i + 1}. ${relativePath}`);
  console.log(`      Size: ${sizeKB} KB`);
  console.log(`      Modified: ${db.modified}`);
  console.log('');
});

// Check db.js configuration
console.log('2️⃣ CHECKING DATABASE CONFIGURATION:\n');

const dbConfigPath = path.join(PROJECT_ROOT, 'db.js');
if (fs.existsSync(dbConfigPath)) {
  const dbConfig = fs.readFileSync(dbConfigPath, 'utf-8');
  
  console.log('   📄 Found: db.js\n');
  
  // Find database path
  const pathMatch = dbConfig.match(/['"`]([^'"`]*\.(?:db|sqlite|sqlite3))['"`]/);
  if (pathMatch) {
    console.log(`   🎯 Configured database: ${pathMatch[1]}`);
    
    // Check if it's relative or absolute
    const dbPath = pathMatch[1];
    const isRelative = !path.isAbsolute(dbPath);
    console.log(`   Path type: ${isRelative ? 'Relative' : 'Absolute'}`);
    
    // Resolve to absolute path
    const absolutePath = isRelative ? path.resolve(PROJECT_ROOT, dbPath) : dbPath;
    console.log(`   Resolved to: ${absolutePath}`);
    
    // Check if file exists
    const exists = fs.existsSync(absolutePath);
    console.log(`   File exists: ${exists ? '✅' : '❌'}`);
    
    if (exists) {
      const stat = fs.statSync(absolutePath);
      const sizeKB = (stat.size / 1024).toFixed(2);
      console.log(`   Size: ${sizeKB} KB`);
      console.log(`   Last modified: ${stat.mtime.toLocaleString()}`);
    }
    
    console.log('');
  } else {
    console.log('   ⚠️  Could not find database path in config\n');
  }
  
  // Check for environment variables
  const envVarMatch = dbConfig.match(/process\.env\.(\w+)/g);
  if (envVarMatch) {
    console.log('   Environment variables used:');
    envVarMatch.forEach(envVar => {
      console.log(`      ${envVar}`);
    });
    console.log('');
  }
} else {
  console.log('   ❌ db.js not found!\n');
}

// Check .env for database configuration
console.log('3️⃣ CHECKING .ENV FILE:\n');

const envPath = path.join(PROJECT_ROOT, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  const dbEnvVars = envContent.split('\n').filter(line => 
    line.includes('DATABASE') || line.includes('DB_')
  );
  
  if (dbEnvVars.length > 0) {
    console.log('   Database-related environment variables:\n');
    dbEnvVars.forEach(line => {
      console.log(`      ${line}`);
    });
    console.log('');
  } else {
    console.log('   ℹ️  No database environment variables found\n');
  }
} else {
  console.log('   ⚠️  .env file not found\n');
}

// Test actual database connection
console.log('4️⃣ TESTING DATABASE CONNECTION:\n');

try {
  // Try to require the db module
  const dbModule = require(path.join(PROJECT_ROOT, 'db.js'));
  
  if (dbModule && dbModule.db) {
    console.log('   ✅ Successfully loaded db module\n');
    
    // Try to query candidates table
    try {
      const candidatesCount = dbModule.db.prepare('SELECT COUNT(*) as count FROM candidates').get();
      console.log(`   📊 Candidates in database: ${candidatesCount.count}\n`);
      
      if (candidatesCount.count > 0) {
        console.log('   Sample candidates:\n');
        const candidates = dbModule.db.prepare('SELECT id, name, email, status FROM candidates LIMIT 5').all();
        candidates.forEach(c => {
          console.log(`      ${c.id} | ${c.name} | ${c.email} | ${c.status}`);
        });
        console.log('');
      } else {
        console.log('   ⚠️  No candidates found in database!\n');
      }
      
      // Check jobs table
      const jobsCount = dbModule.db.prepare('SELECT COUNT(*) as count FROM jobs').get();
      console.log(`   📊 Jobs in database: ${jobsCount.count}\n`);
      
    } catch (error) {
      console.error('   ❌ Error querying database:', error.message);
      console.log('');
    }
  } else {
    console.log('   ❌ db module did not export db object\n');
  }
} catch (error) {
  console.error('   ❌ Error loading db module:', error.message);
  console.log('');
}

// Generate diagnostic report
console.log('='.repeat(80));
console.log('DIAGNOSIS');
console.log('='.repeat(80) + '\n');

console.log('🔍 POSSIBLE ISSUES:\n');

if (databases.length === 0) {
  console.log('1. NO DATABASE FILES FOUND');
  console.log('   - Database might not exist');
  console.log('   - Or located in unexpected location\n');
} else if (databases.length > 1) {
  console.log('1. MULTIPLE DATABASE FILES FOUND');
  console.log('   - Backend might be using different db than expected');
  console.log('   - Check which one has the correct data\n');
  
  console.log('   To check each database:');
  databases.forEach((db, i) => {
    const relativePath = path.relative(PROJECT_ROOT, db.path);
    console.log(`   sqlite3 "${relativePath}" "SELECT COUNT(*) FROM candidates;"`);
  });
  console.log('');
}

console.log('🔧 TROUBLESHOOTING STEPS:\n');

console.log('1. Verify backend is using correct database:');
console.log('   - Check db.js configuration');
console.log('   - Check .env for DB_PATH or similar\n');

console.log('2. Check if database has data:');
console.log('   - Run: sqlite3 <db-file> "SELECT * FROM candidates;"');
console.log('   - Should show candidates\n');

console.log('3. Check if backend can access database:');
console.log('   - File permissions correct?');
console.log('   - Path is absolute or correctly relative?\n');

console.log('4. Test API endpoint directly:');
console.log('   curl http://localhost:8080/api/v1/candidates \\');
console.log('     -H "Authorization: Bearer YOUR_TOKEN"\n');

const report = {
  databasesFound: databases.length,
  databases: databases.map(db => ({
    path: path.relative(PROJECT_ROOT, db.path),
    size: db.size,
    modified: db.modified
  })),
  configuredPath: 'See console output'
};

fs.writeFileSync(
  path.join(PROJECT_ROOT, 'agent-18-database-diagnosis.json'),
  JSON.stringify(report, null, 2)
);

console.log('📄 Report saved: agent-18-database-diagnosis.json\n');
