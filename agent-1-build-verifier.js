#!/usr/bin/env node
/**
 * 🤖 AGENT 1: Build Configuration Verifier
 * Ensures npm start properly builds all apps and runs on port 8080
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const results = {
  buildConfig: {},
  portConfig: {},
  startScript: {},
  issues: [],
  fixes: []
};

console.log('🤖 AGENT 1: Build Configuration Verifier');
console.log('='.repeat(80) + '\n');

/**
 * Check root package.json configuration
 */
function checkRootPackageJson() {
  console.log('📦 Checking root package.json...\n');
  
  const pkgPath = path.join(PROJECT_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  
  results.buildConfig.currentStartScript = pkg.scripts.start;
  
  // Verify start script
  const expectedStart = 'npm run build:all && npm run start:server';
  if (pkg.scripts.start === expectedStart) {
    console.log('✅ start script correctly configured');
    console.log(`   "${pkg.scripts.start}"\n`);
  } else {
    console.log('⚠️  start script needs verification');
    console.log(`   Current: "${pkg.scripts.start}"`);
    console.log(`   Expected: "${expectedStart}"\n`);
  }
  
  // Verify start:server uses port 8080
  if (pkg.scripts['start:server'].includes('PORT=8080')) {
    console.log('✅ start:server correctly uses PORT=8080');
    console.log(`   "${pkg.scripts['start:server']}"\n`);
  } else {
    console.log('⚠️  start:server port needs verification');
    console.log(`   "${pkg.scripts['start:server']}"\n`);
    
    results.issues.push({
      type: 'PORT_CONFIG',
      file: 'package.json',
      issue: 'start:server may not be using PORT=8080',
      current: pkg.scripts['start:server']
    });
  }
  
  // Verify build:all script
  if (pkg.scripts['build:all']) {
    console.log('✅ build:all script exists');
    console.log(`   "${pkg.scripts['build:all']}"\n`);
    
    const buildsAdmin = pkg.scripts['build:all'].includes('build:admin');
    const buildsWorker = pkg.scripts['build:all'].includes('build:worker');
    
    if (buildsAdmin && buildsWorker) {
      console.log('✅ build:all builds both admin and worker\n');
    } else {
      console.log('⚠️  build:all may not build all apps');
      if (!buildsAdmin) console.log('   Missing: build:admin');
      if (!buildsWorker) console.log('   Missing: build:worker');
      console.log('');
      
      results.issues.push({
        type: 'BUILD_CONFIG',
        file: 'package.json',
        issue: 'build:all missing admin or worker build',
        buildsAdmin,
        buildsWorker
      });
    }
  } else {
    console.log('❌ build:all script missing!\n');
    results.issues.push({
      type: 'BUILD_CONFIG',
      file: 'package.json',
      issue: 'build:all script does not exist'
    });
  }
  
  results.buildConfig.hasStartScript = !!pkg.scripts.start;
  results.buildConfig.hasBuildAll = !!pkg.scripts['build:all'];
  results.buildConfig.hasStartServer = !!pkg.scripts['start:server'];
}

/**
 * Check server.js port configuration
 */
function checkServerJs() {
  console.log('🖥️  Checking server.js port configuration...\n');
  
  const serverPath = path.join(PROJECT_ROOT, 'server.js');
  
  if (!fs.existsSync(serverPath)) {
    console.log('❌ server.js not found!\n');
    results.issues.push({
      type: 'MISSING_FILE',
      file: 'server.js',
      issue: 'server.js does not exist'
    });
    return;
  }
  
  const serverContent = fs.readFileSync(serverPath, 'utf-8');
  const lines = serverContent.split('\n');
  
  // Find port configuration
  let portLine = null;
  let lineNumber = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('PORT') && (line.includes('process.env') || line.includes('='))) {
      portLine = line.trim();
      lineNumber = i + 1;
      break;
    }
  }
  
  if (portLine) {
    console.log(`✅ Port configuration found at line ${lineNumber}`);
    console.log(`   ${portLine}\n`);
    
    results.portConfig.found = true;
    results.portConfig.line = portLine;
    results.portConfig.lineNumber = lineNumber;
    
    // Check if it defaults to 8080
    if (portLine.includes('8080')) {
      console.log('✅ Default port is 8080\n');
      results.portConfig.defaultsTo8080 = true;
    } else {
      console.log('⚠️  Default port may not be 8080');
      console.log('   Check if PORT environment variable will be set\n');
      results.portConfig.defaultsTo8080 = false;
    }
  } else {
    console.log('⚠️  Could not find PORT configuration in server.js\n');
    results.portConfig.found = false;
  }
}

/**
 * Check admin and worker build configs
 */
function checkFrontendConfigs() {
  console.log('🎨 Checking frontend build configurations...\n');
  
  // Check admin
  const adminPkgPath = path.join(PROJECT_ROOT, 'admin/package.json');
  if (fs.existsSync(adminPkgPath)) {
    const adminPkg = JSON.parse(fs.readFileSync(adminPkgPath, 'utf-8'));
    console.log('✅ Admin package.json exists');
    console.log(`   Build script: "${adminPkg.scripts.build}"\n`);
    results.buildConfig.adminBuildScript = adminPkg.scripts.build;
  } else {
    console.log('❌ Admin package.json not found\n');
    results.issues.push({
      type: 'MISSING_FILE',
      file: 'admin/package.json',
      issue: 'Admin package.json missing'
    });
  }
  
  // Check worker
  const workerPkgPath = path.join(PROJECT_ROOT, 'worker/package.json');
  if (fs.existsSync(workerPkgPath)) {
    const workerPkg = JSON.parse(fs.readFileSync(workerPkgPath, 'utf-8'));
    console.log('✅ Worker package.json exists');
    console.log(`   Build script: "${workerPkg.scripts.build}"\n`);
    results.buildConfig.workerBuildScript = workerPkg.scripts.build;
  } else {
    console.log('❌ Worker package.json not found\n');
    results.issues.push({
      type: 'MISSING_FILE',
      file: 'worker/package.json',
      issue: 'Worker package.json missing'
    });
  }
}

/**
 * Verify static file serving in server.js
 */
function checkStaticFileServing() {
  console.log('📁 Checking static file serving configuration...\n');
  
  const serverPath = path.join(PROJECT_ROOT, 'server.js');
  const serverContent = fs.readFileSync(serverPath, 'utf-8');
  
  const servesAdmin = serverContent.includes('admin/dist') || 
                      serverContent.includes("express.static('admin/dist')") ||
                      serverContent.includes('express.static(path.join(__dirname, \'admin/dist\'))');
                      
  const servesWorker = serverContent.includes('worker/dist') ||
                       serverContent.includes("express.static('worker/dist')") ||
                       serverContent.includes('express.static(path.join(__dirname, \'worker/dist\'))');
  
  if (servesAdmin) {
    console.log('✅ Server serves admin/dist\n');
    results.buildConfig.servesAdmin = true;
  } else {
    console.log('⚠️  Server may not serve admin/dist');
    console.log('   Check static file configuration in server.js\n');
    results.buildConfig.servesAdmin = false;
  }
  
  if (servesWorker) {
    console.log('✅ Server serves worker/dist\n');
    results.buildConfig.servesWorker = true;
  } else {
    console.log('⚠️  Server may not serve worker/dist');
    console.log('   Check static file configuration in server.js\n');
    results.buildConfig.servesWorker = false;
  }
}

/**
 * Generate recommendations
 */
function generateRecommendations() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 AGENT 1 FINDINGS');
  console.log('='.repeat(80) + '\n');
  
  console.log('Build Configuration:');
  console.log(`  ✓ Has start script: ${results.buildConfig.hasStartScript}`);
  console.log(`  ✓ Has build:all: ${results.buildConfig.hasBuildAll}`);
  console.log(`  ✓ Has start:server: ${results.buildConfig.hasStartServer}`);
  console.log(`  ✓ Serves admin: ${results.buildConfig.servesAdmin}`);
  console.log(`  ✓ Serves worker: ${results.buildConfig.servesWorker}`);
  console.log('');
  
  console.log('Port Configuration:');
  console.log(`  ✓ Port config found: ${results.portConfig.found}`);
  console.log(`  ✓ Defaults to 8080: ${results.portConfig.defaultsTo8080}`);
  console.log('');
  
  if (results.issues.length === 0) {
    console.log('✅ NO ISSUES FOUND - Configuration looks good!\n');
  } else {
    console.log(`⚠️  Found ${results.issues.length} potential issues:\n`);
    results.issues.forEach((issue, idx) => {
      console.log(`${idx + 1}. ${issue.type}: ${issue.issue}`);
      console.log(`   File: ${issue.file}`);
      if (issue.current) console.log(`   Current: ${issue.current}`);
      console.log('');
    });
  }
  
  // Save report
  const reportPath = path.join(PROJECT_ROOT, 'agent-1-build-config-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Report saved: agent-1-build-config-report.json\n`);
}

// Run all checks
try {
  checkRootPackageJson();
  checkServerJs();
  checkFrontendConfigs();
  checkStaticFileServing();
  generateRecommendations();
} catch (error) {
  console.error('❌ Agent 1 encountered an error:', error.message);
  process.exit(1);
}
