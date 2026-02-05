/**
 * Comprehensive Import Scanner
 * Scans all JS files for broken imports and provides fix recommendations
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = __dirname;
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'backups'];
const DELETED_FILES = [
  'websocket.js',
  'server.js.DELETED',
  'smart-slm-router.js.DELETED'
];

class ImportScanner {
  constructor() {
    this.results = {
      brokenImports: [],
      deletedFileReferences: [],
      relativePathIssues: [],
      totalFilesScanned: 0
    };
  }

  shouldIgnore(filePath) {
    return IGNORE_DIRS.some(dir => filePath.includes(dir));
  }

  extractImports(content, filePath) {
    const imports = [];
    
    // Match require statements
    const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    let match;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push({
        type: 'require',
        path: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    // Match ES6 import statements
    const importRegex = /import\s+(?:{[^}]+}|[^from]+)\s+from\s+['"`]([^'"`]+)['"`]/g;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push({
        type: 'import',
        path: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return imports;
  }

  checkImportExists(importPath, currentFilePath) {
    // Skip node_modules and built-in modules
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return { exists: true, type: 'external' };
    }
    
    const currentDir = path.dirname(currentFilePath);
    let resolvedPath = path.resolve(currentDir, importPath);
    
    // Check if file exists with various extensions
    const extensions = ['', '.js', '.jsx', '.mjs', '.json'];
    
    for (const ext of extensions) {
      const testPath = resolvedPath + ext;
      if (fs.existsSync(testPath)) {
        return { exists: true, type: 'file', resolvedPath: testPath };
      }
    }
    
    // Check if it's a directory with index file
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
      const indexPath = path.join(resolvedPath, 'index.js');
      if (fs.existsSync(indexPath)) {
        return { exists: true, type: 'directory', resolvedPath: indexPath };
      }
    }
    
    return { exists: false, type: 'not_found' };
  }

  scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const imports = this.extractImports(content, filePath);
      
      imports.forEach(imp => {
        // Check for deleted file references
        if (DELETED_FILES.some(deleted => imp.path.includes(deleted.replace('.DELETED', '')))) {
          this.results.deletedFileReferences.push({
            file: filePath,
            line: imp.line,
            import: imp.path,
            type: imp.type
          });
        }
        
        // Check if import exists
        const check = this.checkImportExists(imp.path, filePath);
        if (!check.exists) {
          this.results.brokenImports.push({
            file: filePath,
            line: imp.line,
            import: imp.path,
            type: imp.type
          });
        }
      });
      
      this.results.totalFilesScanned++;
    } catch (error) {
      console.error(`Error scanning ${filePath}:`, error.message);
    }
  }

  scanDirectory(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    entries.forEach(entry => {
      const fullPath = path.join(dirPath, entry.name);
      
      if (this.shouldIgnore(fullPath)) {
        return;
      }
      
      if (entry.isDirectory()) {
        this.scanDirectory(fullPath);
      } else if (entry.name.match(/\.(js|jsx|mjs)$/)) {
        this.scanFile(fullPath);
      }
    });
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 IMPORT SCAN REPORT');
    console.log('='.repeat(80) + '\n');
    
    console.log(`Total files scanned: ${this.results.totalFilesScanned}\n`);
    
    // Broken Imports
    if (this.results.brokenImports.length > 0) {
      console.log('❌ BROKEN IMPORTS:');
      console.log('-'.repeat(80));
      this.results.brokenImports.forEach(issue => {
        const relativePath = path.relative(PROJECT_ROOT, issue.file);
        console.log(`\nFile: ${relativePath}:${issue.line}`);
        console.log(`Import: ${issue.import}`);
        console.log(`Type: ${issue.type}`);
      });
      console.log('\n');
    } else {
      console.log('✅ No broken imports found!\n');
    }
    
    // Deleted File References
    if (this.results.deletedFileReferences.length > 0) {
      console.log('⚠️  DELETED FILE REFERENCES:');
      console.log('-'.repeat(80));
      this.results.deletedFileReferences.forEach(issue => {
        const relativePath = path.relative(PROJECT_ROOT, issue.file);
        console.log(`\nFile: ${relativePath}:${issue.line}`);
        console.log(`Import: ${issue.import}`);
        console.log(`Type: ${issue.type}`);
      });
      console.log('\n');
    } else {
      console.log('✅ No deleted file references found!\n');
    }
    
    // Summary
    console.log('='.repeat(80));
    console.log('SUMMARY:');
    console.log(`  Total Issues: ${this.results.brokenImports.length + this.results.deletedFileReferences.length}`);
    console.log(`  Broken Imports: ${this.results.brokenImports.length}`);
    console.log(`  Deleted File References: ${this.results.deletedFileReferences.length}`);
    console.log('='.repeat(80) + '\n');
    
    // Save detailed report
    const reportPath = path.join(PROJECT_ROOT, 'import-scan-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}\n`);
  }

  async run() {
    console.log('🔍 Scanning project for import issues...\n');
    this.scanDirectory(PROJECT_ROOT);
    this.generateReport();
  }
}

// Run scanner
const scanner = new ImportScanner();
scanner.run();
