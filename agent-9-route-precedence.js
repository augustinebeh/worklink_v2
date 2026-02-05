#!/usr/bin/env node
/**
 * Agent 9: Route Precedence Order Analyzer
 * Checks the order of route registration to find shadowing issues
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const results = {
  modules: [],
  shadowedRoutes: [],
  warnings: []
};

console.log('🔍 Agent 9: Route Precedence Order Analyzer');
console.log('='.repeat(80) + '\n');

const MODULES_TO_CHECK = [
  'candidates',
  'jobs',
  'chat',
  'gamification',
  'auth',
  'deployments',
  'payments',
  'clients',
  'tenders'
];

/**
 * Analyze route registration order in a module
 */
function analyzeModuleRoutes(moduleName) {
  console.log(`📂 Analyzing ${moduleName}...\n`);
  
  const modulePath = path.join(PROJECT_ROOT, 'routes', 'api', 'v1', moduleName);
  const moduleFile = modulePath + '.js';
  
  const moduleData = {
    name: moduleName,
    type: null,
    routes: [],
    issues: []
  };
  
  // Check if modular or monolithic
  if (fs.existsSync(modulePath) && fs.statSync(modulePath).isDirectory()) {
    moduleData.type = 'modular';
    const indexPath = path.join(modulePath, 'index.js');
    
    if (fs.existsSync(indexPath)) {
      analyzeFile(indexPath, moduleData);
    }
  } else if (fs.existsSync(moduleFile)) {
    moduleData.type = 'monolithic';
    analyzeFile(moduleFile, moduleData);
  } else {
    console.log(`   ⚠️  Module not found\n`);
    return null;
  }
  
  return moduleData;
}

/**
 * Analyze a single file for route registration
 */
function analyzeFile(filePath, moduleData) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Track route registrations in order
  const routeRegistrations = [];
  
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    
    // Check for router.use()
    const useMatch = line.match(/router\.use\s*\(\s*['"]([^'"]+)['"]\s*,/);
    if (useMatch) {
      const routePath = useMatch[1];
      routeRegistrations.push({
        line: lineNum,
        type: 'use',
        path: routePath,
        code: line.trim()
      });
    }
    
    // Check for router.get/post/put/delete()
    const methodMatch = line.match(/router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]\s*,/);
    if (methodMatch) {
      const method = methodMatch[1].toUpperCase();
      const routePath = methodMatch[2];
      routeRegistrations.push({
        line: lineNum,
        type: 'method',
        method: method,
        path: routePath,
        code: line.trim()
      });
    }
  });
  
  moduleData.routes = routeRegistrations;
  
  // Analyze for shadowing
  const rootRoutes = routeRegistrations.filter(r => r.path === '/');
  
  if (rootRoutes.length > 1) {
    console.log(`   🔴 MULTIPLE ROOT ROUTES (${rootRoutes.length}):\n`);
    rootRoutes.forEach((route, i) => {
      console.log(`   ${i + 1}. Line ${route.line}: ${route.type === 'use' ? 'router.use' : `router.${route.method.toLowerCase()}`}('/', ...)`);
      if (i > 0) {
        console.log(`      ⚠️  This shadows route #${i} above!`);
      }
    });
    console.log('');
    
    moduleData.issues.push({
      type: 'route_shadowing',
      severity: 'high',
      message: `${rootRoutes.length} root routes registered - last one shadows others`,
      routes: rootRoutes
    });
    
    results.shadowedRoutes.push({
      module: moduleData.name,
      count: rootRoutes.length,
      routes: rootRoutes
    });
  }
  
  // Check for router.use after router.get on same path
  for (let i = 0; i < routeRegistrations.length - 1; i++) {
    const current = routeRegistrations[i];
    const next = routeRegistrations[i + 1];
    
    if (current.type === 'method' && next.type === 'use' && current.path === next.path) {
      console.log(`   ⚠️  ORDERING ISSUE:`);
      console.log(`      Line ${current.line}: router.${current.method.toLowerCase()}('${current.path}')`);
      console.log(`      Line ${next.line}: router.use('${next.path}') - This will never be reached!`);
      console.log('');
      
      moduleData.issues.push({
        type: 'unreachable_route',
        severity: 'medium',
        message: 'router.use after router.method on same path',
        current: current,
        next: next
      });
    }
  }
  
  // Display route order
  console.log(`   Route registration order:`);
  routeRegistrations.forEach((route, i) => {
    const prefix = i === 0 ? '   ├─' : i === routeRegistrations.length - 1 ? '   └─' : '   ├─';
    console.log(`${prefix} ${route.line}: ${route.type === 'use' ? 'use' : route.method} ${route.path}`);
  });
  console.log('');
  
  if (moduleData.issues.length === 0) {
    console.log(`   ✅ No route precedence issues\n`);
  }
}

/**
 * Generate recommendations
 */
function generateRecommendations() {
  console.log('\n💡 ROUTE PRECEDENCE BEST PRACTICES:\n');
  
  const recommendations = [
    'Always register router.use() BEFORE specific router.get/post/etc',
    'Avoid multiple handlers for the same path (especially "/")',
    'If you need multiple handlers, use middleware pattern',
    'More specific routes should be registered before generic ones',
    'Use unique paths for info/docs endpoints (e.g., /info, /docs)',
    'router.use() mounts an entire sub-router - it catches all paths'
  ];
  
  recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec}`);
  });
  console.log('');
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('ROUTE PRECEDENCE ORDER ANALYSIS REPORT');
  console.log('='.repeat(80) + '\n');
  
  console.log('📊 Summary:\n');
  console.log(`   Modules analyzed: ${results.modules.length}`);
  console.log(`   Modules with shadowed routes: ${results.shadowedRoutes.length}`);
  console.log(`   Total issues found: ${results.modules.reduce((sum, m) => sum + m.issues.length, 0)}`);
  console.log('');
  
  if (results.shadowedRoutes.length > 0) {
    console.log('🔴 MODULES WITH ROUTE SHADOWING:\n');
    results.shadowedRoutes.forEach(shadow => {
      console.log(`   ${shadow.module}: ${shadow.count} routes on "/" (last one wins)`);
    });
    console.log('');
  }
  
  // Critical issues
  const criticalModules = results.modules.filter(m => 
    m.issues.some(i => i.severity === 'high')
  );
  
  if (criticalModules.length > 0) {
    console.log('⚠️  CRITICAL ISSUES:\n');
    criticalModules.forEach(module => {
      console.log(`   ${module.name}:`);
      module.issues.filter(i => i.severity === 'high').forEach(issue => {
        console.log(`      - ${issue.message}`);
      });
    });
    console.log('');
  }
  
  // Save report
  const report = {
    summary: {
      modulesAnalyzed: results.modules.length,
      modulesWithIssues: results.modules.filter(m => m.issues.length > 0).length,
      shadowedRoutes: results.shadowedRoutes.length
    },
    modules: results.modules,
    shadowedRoutes: results.shadowedRoutes
  };
  
  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'agent-9-route-precedence.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('📄 Report saved: agent-9-route-precedence.json\n');
}

// Run analysis
console.log('Starting route precedence analysis...\n');

MODULES_TO_CHECK.forEach(moduleName => {
  const moduleData = analyzeModuleRoutes(moduleName);
  if (moduleData) {
    results.modules.push(moduleData);
  }
});

generateRecommendations();
generateReport();
