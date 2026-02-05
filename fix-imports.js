/**
 * Automated Import Fixer
 * Fixes all broken imports based on the scan report
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = __dirname;

// Import fixes mapping: [wrong path] => [correct path]
const IMPORT_FIXES = {
  // Database imports - use /db not /db/database
  '../../../db/database': '../../../db',
  '../../db/database': '../../db',
  './db/database': './db',
  './db/database.js': './db',
  
  // Shared hooks/components fixes (admin)
  '../../shared/hooks/useClients': '../hooks/useClients',
  '../shared/hooks/useCandidates': '../hooks/useCandidates',
  '../components/ui/Toast': '../components/Toast',
  '../components/modals': '../components/modals/index',
  
  // Worker context fixes
  '../contexts/WebSocketContext': '../../contexts/WebSocketContext',
  '../contexts/AuthContext': '../../contexts/AuthContext',
  
  // Utils fixes
  './utils/claude': '../utils/claude',
  
  // Services fixes
  './config/email': '../config/email',
  './services/email': '../services/email',
  './shared/constants': '../shared/constants',
  
  // Pages fixes (admin examples)
  './pages/Candidates': '../../pages/Candidates',
  './pages/Settings': '../../pages/Settings',
  
  // Service API fixes
  '../services/api': '../../api',
  './db/connection': '../db/connection'
};

// Files to skip (they don't exist)
const SKIP_FILES = [
  'admin/src/shared/examples/CandidatesPageMigration.example.jsx',
  'admin/src/shared/examples/PerformanceOptimization.example.jsx',
  'admin/src/shared/services/api/migration-example.js',
  'scripts/complete-database-migration.js', // Multiple conflicting paths
  'scripts/debug/debug_database.js', // Wrong path
  'scripts/testing/run-smart-response-router-validation.js', // Missing test files
  'scripts/update-database-imports.js', // Multiple conflicting paths
  'scripts/utilities/fix-database-schema.js', // Wrong path
  'scripts/utilities/reseed-database.js', // Wrong path
  'scripts/utilities/setup-email.js', // Wrong path
  'scripts/utilities/verify_gamification.js', // Wrong path
  'tests/run-data-integration-tests.js', // Multiple issues
  'utils/internal-slm/setup-guide.js' // Wrong path
];

class ImportFixer {
  constructor() {
    this.fixedCount = 0;
    this.skippedCount = 0;
    this.errors = [];
  }

  shouldSkipFile(relativePath) {
    return SKIP_FILES.some(skipPath => 
      relativePath.replace(/\\/g, '/').includes(skipPath)
    );
  }

  fixImportsInFile(filePath) {
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    
    if (this.shouldSkipFile(relativePath)) {
      console.log(`⏭️  Skipping: ${relativePath}`);
      this.skippedCount++;
      return;
    }
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      // Apply all fixes
      for (const [wrongPath, correctPath] of Object.entries(IMPORT_FIXES)) {
        // Fix require statements
        const requireRegex = new RegExp(
          `require\\s*\\(\\s*['"\`]${wrongPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]\\s*\\)`,
          'g'
        );
        if (requireRegex.test(content)) {
          content = content.replace(requireRegex, `require('${correctPath}')`);
          modified = true;
        }
        
        // Fix import statements
        const importRegex = new RegExp(
          `from\\s+['"\`]${wrongPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`,
          'g'
        );
        if (importRegex.test(content)) {
          content = content.replace(importRegex, `from '${correctPath}'`);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed: ${relativePath}`);
        this.fixedCount++;
      }
    } catch (error) {
      console.error(`❌ Error fixing ${relativePath}:`, error.message);
      this.errors.push({ file: relativePath, error: error.message });
    }
  }

  fixFromReport(reportPath) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    console.log('\n🔧 Starting automated import fixes...\n');
    
    const uniqueFiles = [...new Set(
      report.brokenImports.map(issue => 
        path.resolve(PROJECT_ROOT, issue.file)
      )
    )];
    
    uniqueFiles.forEach(filePath => {
      this.fixImportsInFile(filePath);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 FIX SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Files fixed: ${this.fixedCount}`);
    console.log(`⏭️  Files skipped: ${this.skippedCount}`);
    console.log(`❌ Errors: ${this.errors.length}`);
    console.log('='.repeat(80) + '\n');
    
    if (this.errors.length > 0) {
      console.log('Errors encountered:');
      this.errors.forEach(err => {
        console.log(`  - ${err.file}: ${err.error}`);
      });
      console.log();
    }
  }
}

// Run fixer
const reportPath = path.join(PROJECT_ROOT, 'import-scan-report.json');
if (!fs.existsSync(reportPath)) {
  console.error('❌ import-scan-report.json not found. Run scan-imports.js first.');
  process.exit(1);
}

const fixer = new ImportFixer();
fixer.fixFromReport(reportPath);

console.log('✨ Run scan-imports.js again to verify fixes!\n');
