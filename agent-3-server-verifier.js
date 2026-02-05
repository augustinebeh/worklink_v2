#!/usr/bin/env node
/**
 * Agent 3: Server Configuration & Port Verifier
 * Ensures server runs on port 8080 and serves all apps correctly
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const results = {
  serverConfig: {},
  portConfig: {},
  staticServing: {},
  issues: [],
  recommendations: []
};

console.log('🔍 Agent 3: Server Configuration Verification');
console.log('='.repeat(80) + '\n');

/**
 * Check server.js configuration
 */
function checkServerJs() {
  console.log('🖥️  Checking server.js...\n');
  
  const serverPath = path.join(PROJECT_ROOT, 'server.js');
  if (!fs.existsSync(serverPath)) {
    console.log('❌ server.js not found!');
    results.issues.push({ file: 'server.js', issue: 'File not found', severity: 'critical' });
    return;
  }
  
  console.log('✅ server.js exists');
  
  const content = fs.readFileSync(serverPath, 'utf-8');
  
  // Check port configuration
  console.log('\n📍 Checking port configuration...\n');
  
  const portPatterns = [
    /PORT\s*=\s*process\.env\.PORT\s*\|\|\s*(\d+)/,
    /const\s+PORT\s*=\s*(\d+)/,
    /let\s+PORT\s*=\s*(\d+)/,
    /\.listen\s*\(\s*(\d+)/
  ];
  
  let foundPort = null;
  portPatterns.forEach(pattern => {
    const match = content.match(pattern);
    if (match) {
      foundPort = match[1] || match[0];
      console.log(`Found port configuration: ${match[0]}`);
    }
  });
  
  // Check if it uses environment variable
  if (content.includes('process.env.PORT')) {
    console.log('✅ Uses process.env.PORT (good for deployment)');
    results.portConfig.usesEnvVar = true;
  } else {
    console.log('⚠️  Hardcoded port (consider using process.env.PORT)');
    results.recommendations.push('Use process.env.PORT for flexibility');
  }
  
  // Check if 8080 is default
  if (content.includes('8080')) {
    console.log('✅ Port 8080 is configured');
    results.portConfig.has8080 = true;
  } else {
    console.log('⚠️  Port 8080 not found in server.js');
    results.issues.push({ file: 'server.js', issue: 'Port 8080 not configured', severity: 'medium' });
  }
  
  // Check static file serving
  console.log('\n📁 Checking static file serving...\n');
  
  const staticPatterns = [
    { path: 'admin/dist', pattern: /express\.static.*admin\/dist/ },
    { path: 'worker/dist', pattern: /express\.static.*worker\/dist/ },
    { path: 'public', pattern: /express\.static.*public/ }
  ];
  
  staticPatterns.forEach(({ path: staticPath, pattern }) => {
    if (pattern.test(content)) {
      console.log(`✅ Serves ${staticPath}`);
      results.staticServing[staticPath] = true;
    } else {
      console.log(`⚠️  Not serving ${staticPath}`);
      results.staticServing[staticPath] = false;
      results.issues.push({ 
        file: 'server.js', 
        issue: `Not serving ${staticPath}`, 
        severity: 'high' 
      });
    }
  });
  
  // Check route mounting
  console.log('\n🛣️  Checking route mounting...\n');
  
  const routes = [
    '/admin',
    '/worker', 
    '/api'
  ];
  
  routes.forEach(route => {
    const pattern = new RegExp(`['"]${route}['"]`);
    if (pattern.test(content)) {
      console.log(`✅ Route ${route} configured`);
    } else {
      console.log(`⚠️  Route ${route} not found`);
    }
  });
  
  // Check if using refactored modules
  console.log('\n🔄 Checking refactored module imports...\n');
  
  const refactoredImports = [
    { name: 'websocket', pattern: /require\(['"]\.\/websocket['"]\)/ },
    { name: 'database', pattern: /require\(['"]\.\/db['"]\)/ }
  ];
  
  refactoredImports.forEach(({ name, pattern }) => {
    if (pattern.test(content)) {
      console.log(`✅ Using refactored ${name} module`);
    } else {
      console.log(`⚠️  Not using refactored ${name} module (check import path)`);
      results.recommendations.push(`Ensure ${name} import uses modular structure`);
    }
  });
}

/**
 * Check .env file
 */
function checkEnvFile() {
  console.log('\n⚙️  Checking .env file...\n');
  
  const envPath = path.join(PROJECT_ROOT, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  .env file not found');
    results.recommendations.push('Create .env file with PORT=8080');
    return;
  }
  
  console.log('✅ .env file exists');
  
  const content = fs.readFileSync(envPath, 'utf-8');
  
  if (content.includes('PORT=8080')) {
    console.log('✅ PORT=8080 set in .env');
  } else if (content.includes('PORT=')) {
    const match = content.match(/PORT=(\d+)/);
    if (match) {
      console.log(`⚠️  PORT set to ${match[1]} (not 8080)`);
      results.issues.push({ 
        file: '.env', 
        issue: `PORT=${match[1]} instead of 8080`, 
        severity: 'medium' 
      });
    }
  } else {
    console.log('⚠️  PORT not set in .env');
    results.recommendations.push('Add PORT=8080 to .env file');
  }
}

/**
 * Check package.json start script
 */
function checkStartScript() {
  console.log('\n📦 Checking package.json start configuration...\n');
  
  const pkgPath = path.join(PROJECT_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  
  const startScript = pkg.scripts.start;
  const startServerScript = pkg.scripts['start:server'];
  
  console.log(`Start script: ${startScript}`);
  if (startServerScript) {
    console.log(`Start server script: ${startServerScript}`);
  }
  
  // Check if start:server has PORT=8080
  if (startServerScript && startServerScript.includes('PORT=8080')) {
    console.log('✅ start:server explicitly sets PORT=8080');
    results.portConfig.setInScript = true;
  } else if (startServerScript) {
    console.log('⚠️  start:server does not set PORT=8080');
    results.recommendations.push('Add PORT=8080 to start:server script');
  }
}

/**
 * Check if dist directories exist
 */
function checkDistDirectories() {
  console.log('\n📁 Checking built assets...\n');
  
  const dirs = [
    { path: 'admin/dist', required: true },
    { path: 'worker/dist', required: true }
  ];
  
  dirs.forEach(({ path: dir, required }) => {
    const fullPath = path.join(PROJECT_ROOT, dir);
    if (fs.existsSync(fullPath)) {
      const files = fs.readdirSync(fullPath);
      console.log(`✅ ${dir} exists (${files.length} files)`);
      
      // Check for index.html
      if (files.includes('index.html')) {
        console.log(`   ✅ Contains index.html`);
      } else {
        console.log(`   ⚠️  Missing index.html`);
        results.issues.push({ 
          file: dir, 
          issue: 'Missing index.html', 
          severity: 'high' 
        });
      }
    } else {
      console.log(`${required ? '❌' : '⚠️'} ${dir} not found`);
      if (required) {
        results.issues.push({ 
          file: dir, 
          issue: 'Build directory missing', 
          severity: 'high' 
        });
      }
    }
  });
}

/**
 * Generate recommendations for server config
 */
function generateServerRecommendations() {
  console.log('\n💡 Server Configuration Recommendations:\n');
  
  const recommendations = [
    'Ensure server.js uses: const PORT = process.env.PORT || 8080',
    'Set PORT=8080 in .env file',
    'Set PORT=8080 in start:server script for production',
    'Build admin and worker before starting: npm run build:all',
    'Serve static files from admin/dist and worker/dist',
    'Use refactored module imports: require("./websocket"), require("./db")'
  ];
  
  recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec}`);
  });
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('SERVER CONFIGURATION VERIFICATION REPORT');
  console.log('='.repeat(80) + '\n');
  
  console.log('📊 Summary:\n');
  console.log(`   Port 8080 configured: ${results.portConfig.has8080 ? '✅' : '❌'}`);
  console.log(`   Uses env variable: ${results.portConfig.usesEnvVar ? '✅' : '❌'}`);
  console.log(`   Static serving configured: ${Object.values(results.staticServing).every(v => v) ? '✅' : '⚠️'}`);
  console.log(`   Issues found: ${results.issues.length}`);
  console.log('');
  
  if (results.issues.length > 0) {
    console.log('⚠️  ISSUES:\n');
    
    const critical = results.issues.filter(i => i.severity === 'critical');
    const high = results.issues.filter(i => i.severity === 'high');
    const medium = results.issues.filter(i => i.severity === 'medium');
    
    [
      { name: 'CRITICAL', issues: critical },
      { name: 'HIGH', issues: high },
      { name: 'MEDIUM', issues: medium }
    ].forEach(({ name, issues }) => {
      if (issues.length > 0) {
        console.log(`${name}:`);
        issues.forEach(issue => {
          console.log(`   - ${issue.file}: ${issue.issue}`);
        });
        console.log('');
      }
    });
  } else {
    console.log('✅ No critical issues found!\n');
  }
  
  if (results.recommendations.length > 0) {
    console.log('💡 RECOMMENDATIONS:\n');
    results.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
    console.log('');
  }
  
  // Save report
  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'agent-3-server-verification.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log('📄 Report saved: agent-3-server-verification.json\n');
}

// Run all checks
checkServerJs();
checkEnvFile();
checkStartScript();
checkDistDirectories();
generateServerRecommendations();
generateReport();
