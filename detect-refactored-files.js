#!/usr/bin/env node
/**
 * Refactored Files Detector
 * Scans the codebase to identify all refactored files
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'backups', 'logs', 'data', 'public/uploads', 'test-screenshots', 'test-videos'];

// Known refactored modules and their indicators
const REFACTORED_INDICATORS = {
  keywords: [
    'modular implementation',
    'replacing the original',
    'refactored from',
    'refactoring complete',
    'monolithic file',
    'new modular structure',
    'separated into modules',
    'split into',
    'migrated from'
  ],
  directories: [
    'routes/api/v1/candidates/routes',
    'routes/api/v1/candidates/helpers',
    'websocket/broadcasting',
    'websocket/connection',
    'websocket/features',
    'websocket/handlers',
    'websocket/messaging',
    'websocket/utils',
    'websocket/config',
    'websocket/ai-processing',
    'db/queries',
    'db/migrations',
    'db/seed',
    'services/smart-response-router',
    'services/intent-classifier',
    'services/data-integration',
    'services/email',
    'services/ai-chat',
    'services/ml',
    'services/ad-ml',
    'services/template-responses',
    'services/telegram-posting',
    'utils/smart-slm-router',
    'utils/internal-slm'
  ],
  filePatterns: [
    /\.v2\./,
    /\.new\./,
    /-refactored\./,
    /-modular\./
  ]
};

const results = {
  refactoredFiles: [],
  modulesFound: new Set(),
  summary: {
    totalFiles: 0,
    refactoredCount: 0,
    byType: {}
  }
};

/**
 * Check if file contains refactoring indicators
 */
function checkFileContent(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const firstLines = content.split('\n').slice(0, 50).join('\n').toLowerCase();
    
    for (const keyword of REFACTORED_INDICATORS.keywords) {
      if (firstLines.includes(keyword.toLowerCase())) {
        return {
          isRefactored: true,
          reason: `Contains keyword: "${keyword}"`,
          snippet: extractSnippet(content, keyword)
        };
      }
    }
    
    // Check for module-level comments
    if (content.includes('@module') || content.includes('* @module')) {
      const moduleMatch = content.match(/@module\s+(\S+)/);
      if (moduleMatch) {
        return {
          isRefactored: true,
          reason: `Module documentation: ${moduleMatch[1]}`,
          moduleName: moduleMatch[1]
        };
      }
    }
    
    return { isRefactored: false };
  } catch (error) {
    return { isRefactored: false };
  }
}

/**
 * Extract snippet around keyword
 */
function extractSnippet(content, keyword) {
  const lines = content.split('\n');
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    if (lines[i].toLowerCase().includes(keyword.toLowerCase())) {
      return lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join('\n');
    }
  }
  return null;
}

/**
 * Check if file is in a refactored directory
 */
function isInRefactoredDirectory(filePath) {
  const relativePath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
  
  for (const dir of REFACTORED_INDICATORS.directories) {
    if (relativePath.includes(dir)) {
      return {
        isRefactored: true,
        reason: `Located in modular directory: ${dir}`,
        module: dir.split('/')[0]
      };
    }
  }
  
  return { isRefactored: false };
}

/**
 * Check if filename matches refactored pattern
 */
function matchesRefactoredPattern(fileName) {
  for (const pattern of REFACTORED_INDICATORS.filePatterns) {
    if (pattern.test(fileName)) {
      return {
        isRefactored: true,
        reason: `Filename pattern: ${pattern}`,
        pattern: pattern.toString()
      };
    }
  }
  
  return { isRefactored: false };
}

/**
 * Scan a single file
 */
function scanFile(filePath) {
  results.summary.totalFiles++;
  
  const fileName = path.basename(filePath);
  const relativePath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
  
  // Check all indicators
  const contentCheck = checkFileContent(filePath);
  const directoryCheck = isInRefactoredDirectory(filePath);
  const patternCheck = matchesRefactoredPattern(fileName);
  
  if (contentCheck.isRefactored || directoryCheck.isRefactored || patternCheck.isRefactored) {
    const reasons = [];
    if (contentCheck.isRefactored) reasons.push(contentCheck.reason);
    if (directoryCheck.isRefactored) reasons.push(directoryCheck.reason);
    if (patternCheck.isRefactored) reasons.push(patternCheck.reason);
    
    const module = contentCheck.moduleName || directoryCheck.module || 'unknown';
    results.modulesFound.add(module);
    
    results.refactoredFiles.push({
      path: relativePath,
      fileName,
      module,
      reasons,
      snippet: contentCheck.snippet
    });
    
    results.summary.refactoredCount++;
    
    // Track by type
    const ext = path.extname(fileName);
    results.summary.byType[ext] = (results.summary.byType[ext] || 0) + 1;
  }
}

/**
 * Recursively scan directory
 */
function scanDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
          scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.js', '.jsx', '.mjs', '.ts', '.tsx'].includes(ext)) {
          scanFile(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error.message);
  }
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('REFACTORED FILES ANALYSIS REPORT');
  console.log('='.repeat(80) + '\n');
  
  console.log(`📊 Summary:`);
  console.log(`   Total files scanned: ${results.summary.totalFiles}`);
  console.log(`   Refactored files found: ${results.summary.refactoredCount}`);
  console.log(`   Modules identified: ${results.modulesFound.size}`);
  console.log('');
  
  console.log(`📦 Modules Found:`);
  Array.from(results.modulesFound).sort().forEach(module => {
    const count = results.refactoredFiles.filter(f => f.module === module).length;
    console.log(`   - ${module}: ${count} files`);
  });
  console.log('');
  
  console.log(`📁 By File Type:`);
  Object.entries(results.summary.byType).sort((a, b) => b[1] - a[1]).forEach(([ext, count]) => {
    console.log(`   ${ext}: ${count} files`);
  });
  console.log('');
  
  console.log('='.repeat(80));
  console.log('DETAILED FILE LIST');
  console.log('='.repeat(80) + '\n');
  
  // Group by module
  const byModule = {};
  results.refactoredFiles.forEach(file => {
    if (!byModule[file.module]) {
      byModule[file.module] = [];
    }
    byModule[file.module].push(file);
  });
  
  Object.entries(byModule).sort().forEach(([module, files]) => {
    console.log(`\n📦 ${module.toUpperCase()}`);
    console.log('-'.repeat(80));
    files.sort((a, b) => a.path.localeCompare(b.path)).forEach(file => {
      console.log(`\n📄 ${file.path}`);
      file.reasons.forEach(reason => {
        console.log(`   ✓ ${reason}`);
      });
      if (file.snippet) {
        console.log(`   Preview:`);
        console.log(file.snippet.split('\n').map(line => `      ${line}`).join('\n'));
      }
    });
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('EXPORT OPTIONS');
  console.log('='.repeat(80) + '\n');
  
  // Save to JSON
  const jsonPath = path.join(PROJECT_ROOT, 'refactored-files-analysis.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      ...results.summary,
      modules: Array.from(results.modulesFound).sort()
    },
    files: results.refactoredFiles.map(f => ({
      path: f.path,
      module: f.module,
      reasons: f.reasons
    }))
  }, null, 2));
  
  console.log(`✅ Full report saved to: ${jsonPath}`);
  
  // Create list of refactored file paths
  const listPath = path.join(PROJECT_ROOT, 'refactored-files-list.txt');
  fs.writeFileSync(listPath, results.refactoredFiles.map(f => f.path).sort().join('\n'));
  console.log(`✅ File list saved to: ${listPath}`);
  
  console.log('');
}

// Run the scan
console.log('🔍 Scanning codebase for refactored files...\n');
scanDirectory(PROJECT_ROOT);
generateReport();
