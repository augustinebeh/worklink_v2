#!/usr/bin/env node
/**
 * Refactoring Verification & Safe Cleanup Tool
 * 
 * This tool:
 * 1. Maps monolithic files to their modular replacements
 * 2. Scans codebase for any remaining imports of old files
 * 3. Verifies API endpoints are using new structure
 * 4. Generates safe cleanup plan
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'backups', 'logs', 'data', 'public/uploads', 'test-screenshots', 'test-videos'];

// Known monolithic files and their modular replacements
const MONOLITHIC_FILES = {
  'websocket.js': {
    originalSize: '~800 lines',
    replacedBy: 'websocket/ directory',
    newStructure: [
      'websocket/index.js',
      'websocket/broadcasting/',
      'websocket/connection/',
      'websocket/features/',
      'websocket/handlers/',
      'websocket/messaging/',
      'websocket/utils/',
      'websocket/config/'
    ],
    status: 'unknown'
  },
  'websocket-handlers.js': {
    originalLocation: 'services/websocket-handlers.js',
    originalSize: 'unknown',
    replacedBy: 'websocket/ directory',
    newStructure: [
      'websocket/handlers/',
      'websocket/features/'
    ],
    status: 'unknown'
  },
  'websocket-new.js': {
    originalSize: 'unknown',
    replacedBy: 'websocket/index.js',
    note: 'Compatibility wrapper, can be removed if not imported',
    status: 'unknown'
  },
  'database.js': {
    originalLocation: 'db/database.js',
    originalSize: '1,962 lines',
    replacedBy: 'db/ modular structure',
    newStructure: [
      'db/index.js',
      'db/database/index.js',
      'db/database/config.js',
      'db/database/migrations.js',
      'db/database/schema/',
      'db/database/seeds/',
      'db/database/utils.js'
    ],
    status: 'wrapper_exists'
  },
  'routes/api/v1/candidates.js': {
    originalSize: '516 lines',
    replacedBy: 'routes/api/v1/candidates/',
    newStructure: [
      'routes/api/v1/candidates/index.js',
      'routes/api/v1/candidates/routes/list.js',
      'routes/api/v1/candidates/routes/profile.js',
      'routes/api/v1/candidates/routes/create.js',
      'routes/api/v1/candidates/helpers/'
    ],
    status: 'unknown'
  },
  'routes/api/v1/chat.js': {
    originalSize: '473 lines',
    replacedBy: 'routes/api/v1/chat/',
    newStructure: [
      'routes/api/v1/chat/index.js',
      'routes/api/v1/chat/routes/messages.js',
      'routes/api/v1/chat/routes/conversations.js',
      'routes/api/v1/chat/helpers/'
    ],
    status: 'unknown'
  },
  'routes/api/v1/gamification.js': {
    originalSize: '1,649 lines',
    replacedBy: 'routes/api/v1/gamification/',
    newStructure: [
      'routes/api/v1/gamification/index.js',
      'routes/api/v1/gamification/routes/',
      'routes/api/v1/gamification/helpers/'
    ],
    status: 'unknown'
  },
  'routes/api/v1/auth.js': {
    originalSize: '686 lines',
    replacedBy: 'routes/api/v1/auth/',
    newStructure: [
      'routes/api/v1/auth/index.js',
      'routes/api/v1/auth/routes/'
    ],
    status: 'unknown'
  },
  'routes/api/v1/ai-automation.js': {
    originalSize: '2,421 lines',
    replacedBy: 'routes/api/v1/ai-automation/',
    newStructure: [
      'routes/api/v1/ai-automation/index.js',
      'routes/api/v1/ai-automation/analytics/',
      'routes/api/v1/ai-automation/assistant/',
      'routes/api/v1/ai-automation/engagement/',
      'routes/api/v1/ai-automation/follow-up/',
      'routes/api/v1/ai-automation/gebiz/',
      'routes/api/v1/ai-automation/outreach/',
      'routes/api/v1/ai-automation/sourcing/',
      'routes/api/v1/ai-automation/tenders/',
      'routes/api/v1/ai-automation/utils/'
    ],
    status: 'unknown'
  },
  'routes/api/v1/smart-response-router.js': {
    originalSize: '527 lines',
    replacedBy: 'routes/api/v1/smart-response-router/',
    newStructure: [
      'routes/api/v1/smart-response-router/index.js',
      'routes/api/v1/smart-response-router/routes/',
      'routes/api/v1/smart-response-router/helpers/'
    ],
    status: 'unknown'
  },
  'utils/smart-slm-router.js': {
    originalSize: 'unknown',
    replacedBy: 'utils/smart-slm-router/',
    newStructure: [
      'utils/smart-slm-router/index.js'
    ],
    status: 'unknown'
  }
};

const results = {
  fileExistence: {},
  importUsage: {},
  apiEndpointVerification: {},
  safeToDelete: [],
  needsManualReview: [],
  stillInUse: [],
  wrappers: []
};

/**
 * Check if monolithic file still exists
 */
function checkFileExistence() {
  console.log('📁 Checking existence of monolithic files...\n');
  
  for (const [fileName, info] of Object.entries(MONOLITHIC_FILES)) {
    const possiblePaths = [
      path.join(PROJECT_ROOT, fileName),
      path.join(PROJECT_ROOT, info.originalLocation || fileName),
      path.join(PROJECT_ROOT, 'backups', fileName),
      path.join(PROJECT_ROOT, fileName + '.BACKUP'),
      path.join(PROJECT_ROOT, fileName + '.DELETED')
    ];
    
    let found = false;
    let foundPath = null;
    
    for (const checkPath of possiblePaths) {
      if (fs.existsSync(checkPath)) {
        found = true;
        foundPath = checkPath;
        break;
      }
    }
    
    results.fileExistence[fileName] = {
      exists: found,
      path: foundPath ? path.relative(PROJECT_ROOT, foundPath) : null,
      replacedBy: info.replacedBy,
      newStructureExists: checkNewStructureExists(info.newStructure)
    };
    
    if (found) {
      // Check if it's a wrapper file
      const isWrapper = checkIfWrapper(foundPath);
      if (isWrapper) {
        results.wrappers.push(fileName);
        console.log(`📄 ${fileName}: EXISTS (Wrapper file) at ${results.fileExistence[fileName].path}`);
      } else {
        console.log(`📄 ${fileName}: EXISTS at ${results.fileExistence[fileName].path}`);
      }
    } else {
      console.log(`✅ ${fileName}: Already deleted or moved`);
    }
  }
  console.log('');
}

/**
 * Check if file is a wrapper/compatibility file
 */
function checkIfWrapper(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const first200Lines = content.split('\n').slice(0, 200).join('\n');
    
    const wrapperIndicators = [
      'backward compatibility',
      'compatibility wrapper',
      'delegates to',
      'maintains backward compatibility',
      'require(\'./websocket\')',
      'require(\'./database\')',
      'export.*from.*websocket',
      'export.*from.*database'
    ];
    
    return wrapperIndicators.some(indicator => 
      first200Lines.toLowerCase().includes(indicator.toLowerCase())
    );
  } catch (error) {
    return false;
  }
}

/**
 * Check if new modular structure exists
 */
function checkNewStructureExists(newStructure) {
  if (!Array.isArray(newStructure)) return false;
  
  let existCount = 0;
  for (const structPath of newStructure) {
    const fullPath = path.join(PROJECT_ROOT, structPath);
    if (fs.existsSync(fullPath)) {
      existCount++;
    }
  }
  
  return {
    total: newStructure.length,
    exists: existCount,
    percentage: Math.round((existCount / newStructure.length) * 100)
  };
}

/**
 * Scan codebase for imports of old monolithic files
 */
function scanForImports() {
  console.log('🔍 Scanning codebase for imports of monolithic files...\n');
  
  for (const fileName of Object.keys(MONOLITHIC_FILES)) {
    results.importUsage[fileName] = {
      requireStatements: [],
      importStatements: [],
      totalReferences: 0
    };
  }
  
  scanDirectory(PROJECT_ROOT);
  
  // Report results
  for (const [fileName, usage] of Object.entries(results.importUsage)) {
    const total = usage.requireStatements.length + usage.importStatements.length;
    usage.totalReferences = total;
    
    if (total > 0) {
      console.log(`⚠️  ${fileName}: ${total} import(s) found`);
      results.stillInUse.push(fileName);
      
      usage.requireStatements.forEach(ref => {
        console.log(`   - ${ref.file}:${ref.line}`);
        console.log(`     ${ref.code.trim()}`);
      });
      usage.importStatements.forEach(ref => {
        console.log(`   - ${ref.file}:${ref.line}`);
        console.log(`     ${ref.code.trim()}`);
      });
    } else {
      console.log(`✅ ${fileName}: No imports found`);
      
      // Only safe to delete if file exists and has no imports
      if (results.fileExistence[fileName] && 
          results.fileExistence[fileName].exists && 
          !results.wrappers.includes(fileName)) {
        results.safeToDelete.push(fileName);
      }
    }
  }
  console.log('');
}

/**
 * Scan directory for imports
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
          scanFileForImports(fullPath);
        }
      }
    }
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Scan individual file for imports of monolithic files
 */
function scanFileForImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
    
    lines.forEach((line, index) => {
      // Check each monolithic file
      for (const fileName of Object.keys(MONOLITHIC_FILES)) {
        const baseName = fileName.replace(/\.js$/, '');
        
        // Pattern for require statements
        const requirePatterns = [
          new RegExp(`require\\s*\\(\\s*['"\`].*${baseName}(\\.js)?['"\`]\\s*\\)`, 'i'),
          new RegExp(`require\\s*\\(\\s*['"\`].*${fileName}['"\`]\\s*\\)`, 'i')
        ];
        
        // Pattern for import statements
        const importPatterns = [
          new RegExp(`import\\s+.*from\\s+['"\`].*${baseName}(\\.js)?['"\`]`, 'i'),
          new RegExp(`import\\s+.*from\\s+['"\`].*${fileName}['"\`]`, 'i'),
          new RegExp(`import\\s*\\(\\s*['"\`].*${baseName}(\\.js)?['"\`]\\s*\\)`, 'i')
        ];
        
        // Check require
        for (const pattern of requirePatterns) {
          if (pattern.test(line)) {
            results.importUsage[fileName].requireStatements.push({
              file: relativePath,
              line: index + 1,
              code: line
            });
          }
        }
        
        // Check import
        for (const pattern of importPatterns) {
          if (pattern.test(line)) {
            results.importUsage[fileName].importStatements.push({
              file: relativePath,
              line: index + 1,
              code: line
            });
          }
        }
      }
    });
  } catch (error) {
    // Ignore files we can't read
  }
}

/**
 * Verify API endpoints are using new modular structure
 */
function verifyApiEndpoints() {
  console.log('🔌 Verifying API endpoints are using modular structure...\n');
  
  const apiIndexPath = path.join(PROJECT_ROOT, 'routes/api/v1/index.js');
  
  if (!fs.existsSync(apiIndexPath)) {
    console.log('⚠️  Cannot find routes/api/v1/index.js\n');
    return;
  }
  
  const content = fs.readFileSync(apiIndexPath, 'utf-8');
  
  // Check which routes are mounted
  const routeModules = [
    'candidates',
    'chat', 
    'gamification',
    'auth',
    'ai-automation',
    'smart-response-router',
    'consultant-performance'
  ];
  
  routeModules.forEach(module => {
    const hasRequire = content.includes(`require('./${module}')`);
    const hasUse = content.includes(`router.use('/${module}', require('./${module}'))`);
    
    results.apiEndpointVerification[module] = {
      isRegistered: hasRequire || hasUse,
      usesModularStructure: hasRequire || hasUse
    };
    
    if (hasRequire || hasUse) {
      console.log(`✅ /${module}: Using modular structure`);
    } else {
      console.log(`⚠️  /${module}: Not found in API routes`);
    }
  });
  
  console.log('');
}

/**
 * Generate cleanup report
 */
function generateCleanupReport() {
  console.log('\n' + '='.repeat(80));
  console.log('CLEANUP SAFETY REPORT');
  console.log('='.repeat(80) + '\n');
  
  console.log('📊 Summary:\n');
  console.log(`   Monolithic files tracked: ${Object.keys(MONOLITHIC_FILES).length}`);
  console.log(`   Files still exist: ${Object.values(results.fileExistence).filter(f => f.exists).length}`);
  console.log(`   Files with imports: ${results.stillInUse.length}`);
  console.log(`   Wrapper files: ${results.wrappers.length}`);
  console.log(`   Safe to delete: ${results.safeToDelete.length}`);
  console.log('');
  
  // Safe to delete
  if (results.safeToDelete.length > 0) {
    console.log('✅ SAFE TO DELETE (No imports found):\n');
    results.safeToDelete.forEach(fileName => {
      const fileInfo = results.fileExistence[fileName];
      console.log(`   📄 ${fileInfo.path}`);
      console.log(`      → Replaced by: ${MONOLITHIC_FILES[fileName].replacedBy}`);
      console.log(`      → New structure: ${fileInfo.newStructureExists.percentage}% complete`);
      console.log('');
    });
  }
  
  // Still in use
  if (results.stillInUse.length > 0) {
    console.log('⚠️  STILL IN USE (Cannot delete yet):\n');
    results.stillInUse.forEach(fileName => {
      const usage = results.importUsage[fileName];
      const fileInfo = results.fileExistence[fileName];
      
      if (fileInfo && fileInfo.exists) {
        console.log(`   📄 ${fileInfo.path}`);
        console.log(`      → ${usage.totalReferences} import(s) found`);
        console.log(`      → Action needed: Update imports to use ${MONOLITHIC_FILES[fileName].replacedBy}`);
        console.log('');
      }
    });
  }
  
  // Wrapper files
  if (results.wrappers.length > 0) {
    console.log('🔄 WRAPPER FILES (Provide backward compatibility):\n');
    results.wrappers.forEach(fileName => {
      const usage = results.importUsage[fileName];
      const fileInfo = results.fileExistence[fileName];
      
      if (fileInfo) {
      console.log(`   📄 ${fileInfo.path}`);
      if (usage.totalReferences > 0) {
        console.log(`      → ${usage.totalReferences} import(s) still using this wrapper`);
        console.log(`      → Keep for now, or update imports first`);
      } else {
        console.log(`      → No imports found, safe to delete`);
      }
      console.log('');
    }
    });
  }
  
  console.log('='.repeat(80));
  console.log('CLEANUP COMMANDS');
  console.log('='.repeat(80) + '\n');
  
  if (results.safeToDelete.length > 0) {
    console.log('# Delete safe files:');
    results.safeToDelete.forEach(fileName => {
      const fileInfo = results.fileExistence[fileName];
      if (fileInfo && fileInfo.path) {
        console.log(`rm "${fileInfo.path}"`);
      }
    });
    console.log('');
  }
  
  if (results.stillInUse.length > 0) {
    console.log('# Files requiring import updates before deletion:');
    results.stillInUse.forEach(fileName => {
      const usage = results.importUsage[fileName];
      console.log(`# ${fileName} - ${usage.totalReferences} imports to update`);
      
      const uniqueFiles = new Set([
        ...usage.requireStatements.map(r => r.file),
        ...usage.importStatements.map(i => i.file)
      ]);
      
      uniqueFiles.forEach(file => {
        console.log(`#   - ${file}`);
      });
    });
    console.log('');
  }
  
  // Save detailed report
  const reportPath = path.join(PROJECT_ROOT, 'refactoring-cleanup-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      totalTracked: Object.keys(MONOLITHIC_FILES).length,
      stillExist: Object.values(results.fileExistence).filter(f => f.exists).length,
      stillInUse: results.stillInUse.length,
      safeToDelete: results.safeToDelete.length,
      wrappers: results.wrappers.length
    },
    fileExistence: results.fileExistence,
    importUsage: results.importUsage,
    apiEndpointVerification: results.apiEndpointVerification,
    safeToDelete: results.safeToDelete,
    stillInUse: results.stillInUse,
    wrappers: results.wrappers
  }, null, 2));
  
  console.log(`📄 Detailed report saved: refactoring-cleanup-report.json`);
  console.log('');
}

// Run analysis
console.log('🚀 Starting refactoring verification and cleanup analysis...\n');
console.log('='.repeat(80) + '\n');

checkFileExistence();
scanForImports();
verifyApiEndpoints();
generateCleanupReport();

console.log('✅ Analysis complete!\n');
