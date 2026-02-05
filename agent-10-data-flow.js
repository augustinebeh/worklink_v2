#!/usr/bin/env node
/**
 * Agent 10: End-to-End Data Flow Tracer
 * Traces actual data from database → route handlers → response
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const results = {
  flows: [],
  issues: [],
  summary: {}
};

console.log('🔍 Agent 10: End-to-End Data Flow Tracer');
console.log('='.repeat(80) + '\n');

/**
 * Check database for actual data
 */
function checkDatabase() {
  console.log('1️⃣ DATABASE LAYER\n');
  
  try {
    const { db } = require('./db');
  
  if (!db) {
    console.log('❌ Database connection failed!\n');
    return {};
  }
  const tables = ['candidates', 'jobs', 'deployments', 'payments'];
  const data = {};
  
  tables.forEach(table => {
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      console.log(`   ${table}: ${count.count} records`);
      data[table] = count.count;
    } catch (error) {
      console.log(`   ${table}: Error - ${error.message}`);
      data[table] = -1;
    }
  });
  
  console.log('');
  return data;
  } catch (error) {
    console.log(`   ❌ Error accessing database: ${error.message}\n`);
    return {};
  }
}

/**
 * Trace route handler code
 */
function traceRouteHandler(moduleName, dbCount) {
  console.log(`2️⃣ ROUTE HANDLER: ${moduleName}\n`);
  
  const flow = {
    module: moduleName,
    dbCount: dbCount,
    handlerFound: false,
    handlerType: null,
    databaseQuery: null,
    responseFormat: null,
    issues: []
  };
  
  // Find the route file
  const moduleDir = path.join(PROJECT_ROOT, 'routes', 'api', 'v1', moduleName);
  const moduleFile = moduleDir + '.js';
  
  let handlerPath = null;
  let handlerContent = null;
  
  if (fs.existsSync(moduleDir) && fs.statSync(moduleDir).isDirectory()) {
    // Modular structure
    const listPath = path.join(moduleDir, 'routes', 'list.js');
    const indexPath = path.join(moduleDir, 'index.js');
    
    if (fs.existsSync(listPath)) {
      handlerPath = listPath;
      flow.handlerType = 'modular (list.js)';
    } else if (fs.existsSync(indexPath)) {
      handlerPath = indexPath;
      flow.handlerType = 'modular (index.js)';
    }
  } else if (fs.existsSync(moduleFile)) {
    handlerPath = moduleFile;
    flow.handlerType = 'monolithic';
  }
  
  if (!handlerPath) {
    console.log(`   ❌ No route handler found\n`);
    flow.issues.push('Route handler file not found');
    return flow;
  }
  
  console.log(`   Handler: ${path.relative(PROJECT_ROOT, handlerPath)}`);
  console.log(`   Type: ${flow.handlerType}\n`);
  
  handlerContent = fs.readFileSync(handlerPath, 'utf-8');
  flow.handlerFound = true;
  
  // Check for database queries
  console.log('   Checking for database queries...\n');
  
  const dbPreparePattern = /db\.prepare\s*\(\s*['"`](SELECT[\s\S]*?)['"'`]\s*\)/g;
  const queries = [];
  let match;
  
  while ((match = dbPreparePattern.exec(handlerContent)) !== null) {
    queries.push(match[1]);
  }
  
  if (queries.length > 0) {
    console.log(`   Found ${queries.length} database queries:`);
    queries.forEach((query, i) => {
      const shortQuery = query.substring(0, 60) + (query.length > 60 ? '...' : '');
      console.log(`      ${i + 1}. ${shortQuery}`);
    });
    console.log('');
    flow.databaseQuery = queries[0]; // Take first one
  } else {
    console.log(`   ⚠️  No database queries found!\n`);
    flow.issues.push('No SELECT queries found in handler');
  }
  
  // Check response format
  console.log('   Checking response format...\n');
  
  const successResponsePattern = /res\.json\s*\(\s*\{[\s\S]*?success:\s*true[\s\S]*?data:/;
  const moduleInfoPattern = /res\.json\s*\(\s*\{[\s\S]*?message:[\s\S]*?module[\s\S]*?version:/i;
  
  if (successResponsePattern.test(handlerContent)) {
    console.log(`   ✅ Returns { success: true, data: ... }\n`);
    flow.responseFormat = 'correct';
  } else if (moduleInfoPattern.test(handlerContent)) {
    console.log(`   ❌ Returns module info instead of data!\n`);
    flow.responseFormat = 'module_info';
    flow.issues.push('CRITICAL: Returns module info instead of data');
  } else {
    console.log(`   ⚠️  Unknown response format\n`);
    flow.responseFormat = 'unknown';
    flow.issues.push('Could not determine response format');
  }
  
  // Check for routing conflicts
  const rootRouteCount = (handlerContent.match(/router\.get\s*\(\s*['"]\/['"]/g) || []).length;
  if (rootRouteCount > 1) {
    console.log(`   🔴 WARNING: ${rootRouteCount} GET / routes found\n`);
    flow.issues.push(`Multiple GET / routes (${rootRouteCount}) - possible shadowing`);
  }
  
  return flow;
}

/**
 * Trace complete data flows
 */
function traceDataFlows() {
  console.log('=' + '='.repeat(79));
  console.log('DATA FLOW ANALYSIS');
  console.log('=' + '='.repeat(79) + '\n');
  
  // Get database state
  const dbData = checkDatabase();
  
  // Trace each critical module
  const criticalModules = [
    { name: 'candidates', dbTable: 'candidates' },
    { name: 'jobs', dbTable: 'jobs' },
    { name: 'deployments', dbTable: 'deployments' }
  ];
  
  criticalModules.forEach(module => {
    console.log('-'.repeat(80) + '\n');
    const dbCount = dbData[module.dbTable] || 0;
    const flow = traceRouteHandler(module.name, dbCount);
    results.flows.push(flow);
    
    // Add to issues if there are problems
    if (flow.issues.length > 0) {
      flow.issues.forEach(issue => {
        results.issues.push({
          module: module.name,
          issue: issue
        });
      });
    }
  });
}

/**
 * Generate diagnostic report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('END-TO-END DATA FLOW REPORT');
  console.log('='.repeat(80) + '\n');
  
  console.log('📊 FLOW STATUS:\n');
  
  results.flows.forEach(flow => {
    const status = flow.issues.length === 0 ? '✅' : '❌';
    console.log(`${status} ${flow.module}:`);
    console.log(`   Database: ${flow.dbCount} records`);
    console.log(`   Handler: ${flow.handlerFound ? flow.handlerType : 'Not found'}`);
    console.log(`   Query: ${flow.databaseQuery ? 'Found' : 'Missing'}`);
    console.log(`   Response: ${flow.responseFormat || 'Unknown'}`);
    
    if (flow.issues.length > 0) {
      console.log(`   Issues:`);
      flow.issues.forEach(issue => {
        console.log(`      - ${issue}`);
      });
    }
    console.log('');
  });
  
  // Critical findings
  const criticalIssues = results.issues.filter(i => 
    i.issue.includes('CRITICAL') || i.issue.includes('module info')
  );
  
  if (criticalIssues.length > 0) {
    console.log('🔴 CRITICAL DATA FLOW ISSUES:\n');
    criticalIssues.forEach(issue => {
      console.log(`   ${issue.module}: ${issue.issue}`);
    });
    console.log('');
  }
  
  // Summary
  results.summary = {
    totalFlows: results.flows.length,
    flowsWithIssues: results.flows.filter(f => f.issues.length > 0).length,
    criticalIssues: criticalIssues.length
  };
  
  console.log('📈 SUMMARY:\n');
  console.log(`   Flows analyzed: ${results.summary.totalFlows}`);
  console.log(`   Flows with issues: ${results.summary.flowsWithIssues}`);
  console.log(`   Critical issues: ${results.summary.criticalIssues}`);
  console.log('');
  
  if (results.summary.flowsWithIssues === 0) {
    console.log('🎉 All data flows working correctly!\n');
  } else {
    console.log('⚠️  Some data flows have issues - review above\n');
  }
  
  // Save report
  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'agent-10-data-flow.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log('📄 Report saved: agent-10-data-flow.json\n');
}

// Run analysis
traceDataFlows();
generateReport();
