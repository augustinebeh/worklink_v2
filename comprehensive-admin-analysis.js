#!/usr/bin/env node

/**
 * Comprehensive Admin Portal Analysis
 * Maps all pages, API calls, routes, and identifies issues
 */

const fs = require('fs');
const path = require('path');

const results = {
  pages: [],
  apiCalls: [],
  backendRoutes: [],
  issues: [],
  duplicates: [],
  missingEndpoints: [],
  disabledFeatures: []
};

// Scan admin pages
function scanAdminPages() {
  const pagesDir = path.join(__dirname, 'admin', 'src', 'pages');
  const pages = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));
  
  console.log(`\n📄 Scanning ${pages.length} admin pages...`);
  
  pages.forEach(page => {
    const pagePath = path.join(pagesDir, page);
    const content = fs.readFileSync(pagePath, 'utf8');
    
    const pageInfo = {
      name: page.replace('.jsx', ''),
      path: pagePath,
      apiCalls: [],
      hooks: [],
      components: [],
      issues: []
    };
    
    // Find API calls
    const apiMatches = content.match(/api\.\w+\.\w+|apiClient\.\w+|fetch\(['"](\/api\/[^'"]+)/g) || [];
    pageInfo.apiCalls = [...new Set(apiMatches)];
    
    // Find hooks
    const hookMatches = content.match(/use\w+/g) || [];
    pageInfo.hooks = [...new Set(hookMatches)];
    
    // Find imported components
    const componentMatches = content.match(/import\s+\{?([^}]+)\}?\s+from/g) || [];
    pageInfo.components = componentMatches.map(m => m.match(/import\s+\{?([^}]+)\}?/)[1].trim());
    
    // Check for TODOs or FIXMEs
    if (content.match(/TODO|FIXME|BUG|HACK/i)) {
      pageInfo.issues.push('Contains TODO/FIXME comments');
    }
    
    // Check for disabled features
    if (content.match(/disabled|commented out|temporarily removed/i)) {
      pageInfo.issues.push('Contains disabled features');
    }
    
    results.pages.push(pageInfo);
  });
  
  console.log(`✅ Found ${results.pages.length} pages`);
  console.log(`✅ Total API calls: ${results.pages.reduce((sum, p) => sum + p.apiCalls.length, 0)}`);
}

// Scan backend routes
function scanBackendRoutes() {
  const routesDir = path.join(__dirname, 'routes', 'api', 'v1');
  
  console.log(`\n🔌 Scanning backend routes...`);
  
  function scanRouteFile(filePath, routeName) {
    if (!fs.existsSync(filePath)) return;
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Find route definitions
    const routeMatches = content.match(/router\.(get|post|put|patch|delete)\(['"]([^'"]+)/g) || [];
    
    routeMatches.forEach(match => {
      const [, method, route] = match.match(/router\.(\w+)\(['"]([^'"]+)/);
      results.backendRoutes.push({
        route: `/api/v1/${routeName}${route}`,
        method: method.toUpperCase(),
        file: filePath
      });
    });
  }
  
  // Scan main routes
  const routeFiles = fs.readdirSync(routesDir);
  
  routeFiles.forEach(file => {
    const fullPath = path.join(routesDir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isFile() && file.endsWith('.js')) {
      const routeName = file.replace('.js', '');
      scanRouteFile(fullPath, routeName);
    } else if (stat.isDirectory()) {
      const indexPath = path.join(fullPath, 'index.js');
      if (fs.existsSync(indexPath)) {
        scanRouteFile(indexPath, file);
      }
    }
  });
  
  console.log(`✅ Found ${results.backendRoutes.length} backend routes`);
}

// Find disabled routes
function findDisabledRoutes() {
  const indexPath = path.join(__dirname, 'routes', 'api', 'v1', 'index.js');
  const content = fs.readFileSync(indexPath, 'utf8');
  
  console.log(`\n⚠️  Checking for disabled routes...`);
  
  const commentedRoutes = content.match(/\/\/.*router\.use\(['"]([^'"]+)/g) || [];
  
  commentedRoutes.forEach(commented => {
    const route = commented.match(/\/\/.*router\.use\(['"]([^'"]+)/)[1];
    results.disabledFeatures.push({
      type: 'route',
      name: route,
      reason: 'Commented out in routes/api/v1/index.js'
    });
  });
  
  console.log(`⚠️  Found ${results.disabledFeatures.length} disabled routes`);
}

// Compare frontend API calls with backend routes
function findMissingEndpoints() {
  console.log(`\n🔍 Checking for missing endpoints...`);
  
  const allApiCalls = results.pages.flatMap(p => p.apiCalls);
  const backendPaths = results.backendRoutes.map(r => r.route.toLowerCase());
  
  allApiCalls.forEach(call => {
    // Extract endpoint from API call
    let endpoint = call;
    
    if (call.includes('fetch')) {
      const match = call.match(/\/api\/v1\/([^'"]+)/);
      if (match) endpoint = `/api/v1/${match[1]}`;
    } else if (call.startsWith('api.')) {
      // Convert api.candidates.getAll to /api/v1/candidates
      const parts = call.split('.');
      if (parts.length >= 2) {
        endpoint = `/api/v1/${parts[1]}`;
      }
    }
    
    const exists = backendPaths.some(bp => endpoint.toLowerCase().includes(bp) || bp.includes(endpoint.toLowerCase()));
    
    if (!exists && endpoint !== call) {
      results.missingEndpoints.push({
        call,
        expectedEndpoint: endpoint,
        usedIn: results.pages.filter(p => p.apiCalls.includes(call)).map(p => p.name)
      });
    }
  });
  
  console.log(`⚠️  Found ${results.missingEndpoints.length} potentially missing endpoints`);
}

// Generate report
function generateReport() {
  console.log(`\n📊 Generating comprehensive report...`);
  
  const report = {
    summary: {
      totalPages: results.pages.length,
      totalBackendRoutes: results.backendRoutes.length,
      totalApiCalls: results.pages.reduce((sum, p) => sum + p.apiCalls.length, 0),
      disabledFeatures: results.disabledFeatures.length,
      missingEndpoints: results.missingEndpoints.length,
      pagesWithIssues: results.pages.filter(p => p.issues.length > 0).length
    },
    pages: results.pages,
    backendRoutes: results.backendRoutes,
    disabledFeatures: results.disabledFeatures,
    missingEndpoints: results.missingEndpoints,
    recommendations: []
  };
  
  // Add recommendations
  if (results.disabledFeatures.length > 0) {
    report.recommendations.push({
      priority: 'HIGH',
      category: 'Disabled Features',
      action: `Enable or remove ${results.disabledFeatures.length} disabled routes`,
      items: results.disabledFeatures
    });
  }
  
  if (results.missingEndpoints.length > 0) {
    report.recommendations.push({
      priority: 'HIGH',
      category: 'Missing Endpoints',
      action: `Implement or fix ${results.missingEndpoints.length} missing API endpoints`,
      items: results.missingEndpoints.slice(0, 10) // Top 10
    });
  }
  
  // Write report
  fs.writeFileSync(
    path.join(__dirname, 'ADMIN_PORTAL_ANALYSIS.json'),
    JSON.stringify(report, null, 2)
  );
  
  // Write summary
  const summary = `
# Admin Portal Comprehensive Analysis Report
Generated: ${new Date().toISOString()}

## Summary
- **Total Pages:** ${report.summary.totalPages}
- **Backend Routes:** ${report.summary.totalBackendRoutes}
- **API Calls:** ${report.summary.totalApiCalls}
- **Disabled Features:** ${report.summary.disabledFeatures}
- **Missing Endpoints:** ${report.summary.missingEndpoints}
- **Pages with Issues:** ${report.summary.pagesWithIssues}

## Pages Scanned
${results.pages.map(p => `- ${p.name} (${p.apiCalls.length} API calls)`).join('\n')}

## Disabled Features
${results.disabledFeatures.map(f => `- ${f.name}: ${f.reason}`).join('\n')}

## Missing Endpoints (Top 10)
${results.missingEndpoints.slice(0, 10).map(m => `- ${m.expectedEndpoint} (used in: ${m.usedIn.join(', ')})`).join('\n')}

## Recommendations
${report.recommendations.map(r => `\n### ${r.priority}: ${r.category}\n${r.action}`).join('\n')}

---
Full report: ADMIN_PORTAL_ANALYSIS.json
`;
  
  fs.writeFileSync(
    path.join(__dirname, 'ADMIN_PORTAL_ANALYSIS.md'),
    summary
  );
  
  console.log(`\n✅ Report generated!`);
  console.log(`📄 ADMIN_PORTAL_ANALYSIS.json`);
  console.log(`📄 ADMIN_PORTAL_ANALYSIS.md`);
}

// Run analysis
console.log('🚀 Starting Comprehensive Admin Portal Analysis...');
console.log('='.repeat(60));

scanAdminPages();
scanBackendRoutes();
findDisabledRoutes();
findMissingEndpoints();
generateReport();

console.log('\n' + '='.repeat(60));
console.log('✅ Analysis Complete!');
console.log('\nNext steps:');
console.log('1. Review ADMIN_PORTAL_ANALYSIS.md for summary');
console.log('2. Check ADMIN_PORTAL_ANALYSIS.json for detailed data');
console.log('3. Address high-priority issues first');
