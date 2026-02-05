/**
 * Replace Console.log with Structured Logger
 * Systematically replaces all console.log/error/warn/debug statements
 * with proper structured logging
 */

const fs = require('fs');
const path = require('path');

// Directories to process
const TARGET_DIRS = [
  'routes',
  'services',
  'websocket',
  'middleware',
  'utils',
  'db'
];

// Files to skip
const SKIP_FILES = [
  'node_modules',
  'test',
  'tests',
  '__tests__',
  'coverage',
  '.git',
  'dist',
  'build',
  'replace-console-logs.js', // This script
  'comprehensive-admin-analysis.js',
  'test-server-endpoints.js',
  'test-disabled-routes.js'
];

const stats = {
  filesScanned: 0,
  filesModified: 0,
  consoleLogsReplaced: 0,
  consoleErrorsReplaced: 0,
  consoleWarnsReplaced: 0,
  consoleDebugsReplaced: 0,
  loggerImportsAdded: 0
};

/**
 * Check if file should be processed
 */
function shouldProcessFile(filePath) {
  // Only process .js files
  if (!filePath.endsWith('.js')) return false;
  
  // Skip files in excluded directories
  for (const skip of SKIP_FILES) {
    if (filePath.includes(skip)) return false;
  }
  
  return true;
}

/**
 * Check if file already has logger import
 */
function hasLoggerImport(content) {
  return (
    content.includes('require(\'./utils/structured-logger\')') ||
    content.includes('require("./utils/structured-logger")') ||
    content.includes('require(\'../utils/structured-logger\')') ||
    content.includes('require("../utils/structured-logger")') ||
    content.includes('require(\'../../utils/structured-logger\')') ||
    content.includes('require("../../utils/structured-logger")') ||
    content.includes('from \'./utils/structured-logger\'') ||
    content.includes('from "./utils/structured-logger"')
  );
}

/**
 * Determine correct logger import path based on file location
 */
function getLoggerImportPath(filePath) {
  const depth = filePath.split(path.sep).length - 1;
  const relativePath = '../'.repeat(depth) + 'utils/structured-logger';
  return relativePath;
}

/**
 * Add logger import to file
 */
function addLoggerImport(content, filePath) {
  // Determine module name from file path
  const fileName = path.basename(filePath, '.js');
  const dirName = path.basename(path.dirname(filePath));
  const moduleName = `${dirName}:${fileName}`;
  
  const loggerPath = getLoggerImportPath(filePath);
  const importStatement = `const { createLogger } = require('${loggerPath}');\nconst logger = createLogger('${moduleName}');\n\n`;
  
  // Find the first non-comment, non-require line to insert after
  const lines = content.split('\n');
  let insertIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip comments
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
      insertIndex = i + 1;
      continue;
    }
    
    // Skip other requires
    if (line.startsWith('const') || line.startsWith('require')) {
      insertIndex = i + 1;
      continue;
    }
    
    // Found first non-require line
    break;
  }
  
  // Insert logger import
  lines.splice(insertIndex, 0, importStatement.trim());
  stats.loggerImportsAdded++;
  
  return lines.join('\n');
}

/**
 * Replace console statements with logger
 */
function replaceConsoleStatements(content) {
  let modified = content;
  let replacements = 0;
  
  // Replace console.log with logger.info
  const logRegex = /console\.log\(/g;
  const logMatches = content.match(logRegex);
  if (logMatches) {
    modified = modified.replace(logRegex, 'logger.info(');
    stats.consoleLogsReplaced += logMatches.length;
    replacements += logMatches.length;
  }
  
  // Replace console.error with logger.error
  const errorRegex = /console\.error\(/g;
  const errorMatches = content.match(errorRegex);
  if (errorMatches) {
    modified = modified.replace(errorRegex, 'logger.error(');
    stats.consoleErrorsReplaced += errorMatches.length;
    replacements += errorMatches.length;
  }
  
  // Replace console.warn with logger.warn
  const warnRegex = /console\.warn\(/g;
  const warnMatches = content.match(warnRegex);
  if (warnMatches) {
    modified = modified.replace(warnRegex, 'logger.warn(');
    stats.consoleWarnsReplaced += warnMatches.length;
    replacements += warnMatches.length;
  }
  
  // Replace console.debug with logger.debug
  const debugRegex = /console\.debug\(/g;
  const debugMatches = content.match(debugRegex);
  if (debugMatches) {
    modified = modified.replace(debugRegex, 'logger.debug(');
    stats.consoleDebugsReplaced += debugMatches.length;
    replacements += debugMatches.length;
  }
  
  return { modified, replacements };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  stats.filesScanned++;
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file has console statements
  if (!content.includes('console.log') &&
      !content.includes('console.error') &&
      !content.includes('console.warn') &&
      !content.includes('console.debug')) {
    return; // Nothing to replace
  }
  
  let newContent = content;
  
  // Add logger import if not present
  if (!hasLoggerImport(content)) {
    newContent = addLoggerImport(newContent, filePath);
  }
  
  // Replace console statements
  const { modified, replacements } = replaceConsoleStatements(newContent);
  
  if (replacements > 0) {
    fs.writeFileSync(filePath, modified, 'utf8');
    stats.filesModified++;
    console.log(`  ✅ ${path.basename(filePath)}: ${replacements} replacements`);
  }
}

/**
 * Recursively process directory
 */
function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    
    if (item.isDirectory()) {
      // Skip excluded directories
      if (!SKIP_FILES.includes(item.name)) {
        processDirectory(fullPath);
      }
    } else if (item.isFile() && shouldProcessFile(fullPath)) {
      processFile(fullPath);
    }
  }
}

/**
 * Main execution
 */
console.log('🔄 Starting Console.log Replacement...\n');
console.log('Target directories:', TARGET_DIRS.join(', '));
console.log('');

const startTime = Date.now();

// Process each target directory
for (const dir of TARGET_DIRS) {
  const dirPath = path.join(__dirname, dir);
  
  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️  Skipping ${dir} (not found)`);
    continue;
  }
  
  console.log(`📁 Processing ${dir}/...`);
  processDirectory(dirPath);
}

const duration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('\n' + '='.repeat(60));
console.log('✅ REPLACEMENT COMPLETE');
console.log('='.repeat(60));
console.log(`\nStatistics:`);
console.log(`  Files scanned:       ${stats.filesScanned}`);
console.log(`  Files modified:      ${stats.filesModified}`);
console.log(`  Logger imports added: ${stats.loggerImportsAdded}`);
console.log(`\nReplacements:`);
console.log(`  console.log   → logger.info:  ${stats.consoleLogsReplaced}`);
console.log(`  console.error → logger.error: ${stats.consoleErrorsReplaced}`);
console.log(`  console.warn  → logger.warn:  ${stats.consoleWarnsReplaced}`);
console.log(`  console.debug → logger.debug: ${stats.consoleDebugsReplaced}`);
console.log(`\nTotal replacements: ${
  stats.consoleLogsReplaced +
  stats.consoleErrorsReplaced +
  stats.consoleWarnsReplaced +
  stats.consoleDebugsReplaced
}`);
console.log(`Time taken: ${duration}s`);
console.log('\n⚠️  IMPORTANT: Test your application after these changes!');
console.log('   Run: npm start');
console.log('   Check for any errors or issues\n');

// Save stats to file
fs.writeFileSync(
  path.join(__dirname, 'console-replacement-stats.json'),
  JSON.stringify(stats, null, 2)
);

console.log('📄 Stats saved to: console-replacement-stats.json');
