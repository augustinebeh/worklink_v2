/**
 * Admin Portal Page Testing Framework
 * Systematically tests each admin page for functionality
 */

const fs = require('fs');
const path = require('path');

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  summary: {
    totalPages: 0,
    tested: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  },
  pages: []
};

// Pages to test with priorities
const pagesToTest = [
  // Priority 1 - Core Operations
  { name: 'Dashboard', path: 'admin/src/pages/Dashboard.jsx', priority: 1, category: 'Core' },
  { name: 'Candidates', path: 'admin/src/pages/Candidates.jsx', priority: 1, category: 'Core' },
  { name: 'CandidateProfile', path: 'admin/src/pages/CandidateProfile.jsx', priority: 1, category: 'Core' },
  { name: 'Jobs', path: 'admin/src/pages/Jobs.jsx', priority: 1, category: 'Core' },
  { name: 'JobDetail', path: 'admin/src/pages/JobDetail.jsx', priority: 1, category: 'Core' },
  { name: 'Deployments', path: 'admin/src/pages/Deployments.jsx', priority: 1, category: 'Core' },
  { name: 'Chat', path: 'admin/src/pages/Chat.jsx', priority: 1, category: 'Engagement' },
  
  // Priority 2 - Financial & Client Management
  { name: 'Payments', path: 'admin/src/pages/Payments.jsx', priority: 2, category: 'Financial' },
  { name: 'FinancialDashboard', path: 'admin/src/pages/FinancialDashboard.jsx', priority: 2, category: 'Financial' },
  { name: 'Clients', path: 'admin/src/pages/Clients.jsx', priority: 2, category: 'Clients' },
  { name: 'ClientDetail', path: 'admin/src/pages/ClientDetail.jsx', priority: 2, category: 'Clients' },
  { name: 'BPODashboard', path: 'admin/src/pages/BPODashboard.jsx', priority: 2, category: 'Clients' },
  
  // Priority 3 - AI & Automation
  { name: 'AIAutomation', path: 'admin/src/pages/AIAutomation.jsx', priority: 3, category: 'AI' },
  { name: 'ConsultantPerformance', path: 'admin/src/pages/ConsultantPerformance.jsx', priority: 3, category: 'AI' },
  { name: 'InterviewScheduling', path: 'admin/src/pages/InterviewScheduling.jsx', priority: 3, category: 'Engagement' },
  { name: 'EscalationQueue', path: 'admin/src/pages/EscalationQueue.jsx', priority: 3, category: 'Engagement' },
  
  // Priority 4 - Supporting Features
  { name: 'RetentionAnalytics', path: 'admin/src/pages/RetentionAnalytics.jsx', priority: 4, category: 'Analytics' },
  { name: 'Gamification', path: 'admin/src/pages/Gamification.jsx', priority: 4, category: 'Worker Dev' },
  { name: 'Training', path: 'admin/src/pages/Training.jsx', priority: 4, category: 'Worker Dev' },
  { name: 'TenderMonitor', path: 'admin/src/pages/TenderMonitor.jsx', priority: 4, category: 'Tenders' },
  { name: 'AISourcing', path: 'admin/src/pages/AISourcing.jsx', priority: 4, category: 'AI' },
  { name: 'MLDashboard', path: 'admin/src/pages/MLDashboard.jsx', priority: 4, category: 'AI' },
  { name: 'AdOptimization', path: 'admin/src/pages/AdOptimization.jsx', priority: 4, category: 'AI' },
  { name: 'TelegramGroups', path: 'admin/src/pages/TelegramGroups.jsx', priority: 4, category: 'Misc' },
  { name: 'Settings', path: 'admin/src/pages/Settings.jsx', priority: 4, category: 'System' }
];

testResults.summary.totalPages = pagesToTest.length;

/**
 * Test a single page file
 */
function testPageFile(page) {
  const result = {
    name: page.name,
    category: page.category,
    priority: page.priority,
    status: 'unknown',
    issues: [],
    warnings: [],
    apiCalls: [],
    hooks: [],
    imports: [],
    hasModals: false,
    hasForms: false,
    hasButtons: false
  };

  const fullPath = path.join(__dirname, page.path);
  
  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    result.status = 'failed';
    result.issues.push('File not found');
    return result;
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Extract API calls
    const apiCallRegex = /api\.\w+\.\w+\([^)]*\)|apiClient\.\w+\([^)]*\)|fetch\(['"`]\/api\/v1\/[^'"`]+['"`]/g;
    const apiMatches = content.match(apiCallRegex) || [];
    result.apiCalls = [...new Set(apiMatches)];
    
    // Extract hooks
    const hookRegex = /use[A-Z]\w+/g;
    const hookMatches = content.match(hookRegex) || [];
    result.hooks = [...new Set(hookMatches)];
    
    // Extract imports
    const importRegex = /import\s+.*\s+from\s+['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      result.imports.push(match[1]);
    }
    
    // Check for UI elements
    result.hasModals = content.includes('Modal') || content.includes('Dialog');
    result.hasForms = content.includes('<form') || content.includes('onSubmit');
    result.hasButtons = content.includes('<button') || content.includes('Button');
    
    // Check for common issues
    if (content.includes('TODO') || content.includes('FIXME')) {
      result.warnings.push('Contains TODO/FIXME comments');
    }
    
    if (content.includes('console.log')) {
      result.warnings.push('Contains console.log statements');
    }
    
    if (content.includes('any') || content.includes('unknown')) {
      result.warnings.push('May have TypeScript any/unknown types');
    }
    
    // Check for disabled features
    if (content.includes('disabled') || content.includes('commented out')) {
      result.warnings.push('May contain disabled features');
    }
    
    // Check if imports exist
    const brokenImports = [];
    for (const importPath of result.imports) {
      if (importPath.startsWith('.') || importPath.startsWith('/')) {
        // Local import - check if file exists
        const importFullPath = path.resolve(path.dirname(fullPath), importPath);
        const extensions = ['', '.js', '.jsx', '.ts', '.tsx'];
        let found = false;
        
        for (const ext of extensions) {
          if (fs.existsSync(importFullPath + ext)) {
            found = true;
            break;
          }
        }
        
        if (!found && fs.existsSync(path.join(importFullPath, 'index.js'))) {
          found = true;
        }
        
        if (!found) {
          brokenImports.push(importPath);
        }
      }
    }
    
    if (brokenImports.length > 0) {
      result.issues.push(`Potentially broken imports: ${brokenImports.join(', ')}`);
    }
    
    // Determine status
    if (result.issues.length > 0) {
      result.status = 'failed';
      testResults.summary.failed++;
    } else if (result.warnings.length > 0) {
      result.status = 'warning';
      testResults.summary.warnings++;
    } else {
      result.status = 'passed';
      testResults.summary.passed++;
    }
    
    testResults.summary.tested++;
    
  } catch (error) {
    result.status = 'failed';
    result.issues.push(`Error reading file: ${error.message}`);
    testResults.summary.failed++;
  }
  
  return result;
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('🧪 Starting Admin Portal Page Tests...\n');
  console.log(`Total pages to test: ${pagesToTest.length}\n`);
  
  // Group by priority
  const byPriority = {};
  pagesToTest.forEach(page => {
    if (!byPriority[page.priority]) {
      byPriority[page.priority] = [];
    }
    byPriority[page.priority].push(page);
  });
  
  // Test by priority
  Object.keys(byPriority).sort().forEach(priority => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Priority ${priority} Pages (${byPriority[priority].length} pages)`);
    console.log('='.repeat(60));
    
    byPriority[priority].forEach(page => {
      process.stdout.write(`Testing ${page.name}... `);
      const result = testPageFile(page);
      testResults.pages.push(result);
      
      if (result.status === 'passed') {
        console.log('✅ PASSED');
      } else if (result.status === 'warning') {
        console.log('⚠️  WARNING');
      } else {
        console.log('❌ FAILED');
      }
      
      // Show issues immediately
      if (result.issues.length > 0) {
        result.issues.forEach(issue => {
          console.log(`    ❌ ${issue}`);
        });
      }
      
      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          console.log(`    ⚠️  ${warning}`);
        });
      }
    });
  });
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nTotal Pages:   ${testResults.summary.totalPages}`);
  console.log(`Tested:        ${testResults.summary.tested}`);
  console.log(`✅ Passed:     ${testResults.summary.passed}`);
  console.log(`⚠️  Warnings:   ${testResults.summary.warnings}`);
  console.log(`❌ Failed:     ${testResults.summary.failed}`);
  
  const passRate = ((testResults.summary.passed / testResults.summary.tested) * 100).toFixed(1);
  console.log(`\nPass Rate:     ${passRate}%`);
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'admin-page-test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Detailed report saved to: admin-page-test-results.json`);
  
  // Generate markdown summary
  const mdReport = generateMarkdownReport();
  const mdPath = path.join(__dirname, 'ADMIN_PAGE_TEST_REPORT.md');
  fs.writeFileSync(mdPath, mdReport);
  console.log(`📄 Summary report saved to: ADMIN_PAGE_TEST_REPORT.md`);
}

/**
 * Generate markdown report
 */
function generateMarkdownReport() {
  let md = '# Admin Portal Page Test Report\n\n';
  md += `**Generated:** ${testResults.timestamp}\n\n`;
  md += '## Summary\n\n';
  md += `- **Total Pages:** ${testResults.summary.totalPages}\n`;
  md += `- **Tested:** ${testResults.summary.tested}\n`;
  md += `- **✅ Passed:** ${testResults.summary.passed}\n`;
  md += `- **⚠️ Warnings:** ${testResults.summary.warnings}\n`;
  md += `- **❌ Failed:** ${testResults.summary.failed}\n`;
  md += `- **Pass Rate:** ${((testResults.summary.passed / testResults.summary.tested) * 100).toFixed(1)}%\n\n`;
  
  // Failed pages
  const failed = testResults.pages.filter(p => p.status === 'failed');
  if (failed.length > 0) {
    md += '## ❌ Failed Pages\n\n';
    failed.forEach(page => {
      md += `### ${page.name} (${page.category})\n\n`;
      page.issues.forEach(issue => {
        md += `- ❌ ${issue}\n`;
      });
      md += '\n';
    });
  }
  
  // Warning pages
  const warnings = testResults.pages.filter(p => p.status === 'warning');
  if (warnings.length > 0) {
    md += '## ⚠️ Pages with Warnings\n\n';
    warnings.forEach(page => {
      md += `### ${page.name} (${page.category})\n\n`;
      page.warnings.forEach(warning => {
        md += `- ⚠️ ${warning}\n`;
      });
      md += '\n';
    });
  }
  
  // Passed pages
  const passed = testResults.pages.filter(p => p.status === 'passed');
  if (passed.length > 0) {
    md += '## ✅ Passed Pages\n\n';
    passed.forEach(page => {
      md += `- ${page.name} (${page.category})\n`;
    });
    md += '\n';
  }
  
  // API Call Analysis
  md += '## 📊 API Call Analysis\n\n';
  const allApiCalls = new Set();
  testResults.pages.forEach(page => {
    page.apiCalls.forEach(call => allApiCalls.add(call));
  });
  md += `Total unique API calls: ${allApiCalls.size}\n\n`;
  
  return md;
}

// Run tests
runAllTests();
generateReport();

console.log('\n✅ Testing complete!\n');
