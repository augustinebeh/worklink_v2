/**
 * Script to migrate console.log statements to structured logging
 * This helps replace the 240+ console.log statements with proper structured logging
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files to exclude from migration
const excludeFiles = [
  'node_modules',
  '.git',
  'logs',
  'dist',
  '.vite',
  'scripts/migrate-to-structured-logging.js' // Don't modify this script
];

// File extensions to process
const includeExtensions = ['.js', '.jsx', '.ts', '.tsx'];

/**
 * Recursively find all JavaScript files
 */
function findJavaScriptFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !excludeFiles.some(exclude => fullPath.includes(exclude))) {
      findJavaScriptFiles(fullPath, files);
    } else if (stat.isFile() && includeExtensions.includes(path.extname(item))) {
      // Skip files already using structured logger
      const content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('structured-logger')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Analyze console.log usage in a file
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const consoleUsages = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.includes('console.')) {
      const lineNumber = index + 1;
      let level = 'info';

      if (trimmed.includes('console.error')) level = 'error';
      else if (trimmed.includes('console.warn')) level = 'warn';
      else if (trimmed.includes('console.debug')) level = 'debug';
      else if (trimmed.includes('console.log')) level = 'info';

      consoleUsages.push({
        line: lineNumber,
        content: trimmed,
        level,
        raw: line
      });
    }
  });

  return consoleUsages;
}

/**
 * Generate migration suggestions for console.log statements
 */
function generateMigrationSuggestion(usage, filePath) {
  const fileName = path.basename(filePath, path.extname(filePath));

  // Try to determine the module name from the file path
  let module = 'app';
  if (filePath.includes('/routes/api/')) {
    module = filePath.split('/routes/api/')[1].split('.')[0].replace(/\//g, '-');
  } else if (filePath.includes('/services/')) {
    module = 'services';
  } else if (filePath.includes('/db/')) {
    module = 'database';
  } else if (filePath.includes('/middleware/')) {
    module = 'middleware';
  }

  // Extract message from console statement
  const match = usage.content.match(/console\.\w+\(['"`]([^'"`]+)['"`]/);
  const message = match ? match[1] : 'Log message';

  return {
    original: usage.raw,
    suggested: `    logger.${usage.level}('${message}', { module: '${module}' });`,
    needsImport: true,
    module
  };
}

/**
 * Main analysis function
 */
function analyzeProject() {
  const projectRoot = path.join(__dirname, '..');
  const files = findJavaScriptFiles(projectRoot);

  console.log(`📊 Found ${files.length} JavaScript files to analyze\n`);

  const report = {
    totalFiles: files.length,
    filesWithConsole: 0,
    totalConsoleStatements: 0,
    fileReports: []
  };

  files.forEach(filePath => {
    const usages = analyzeFile(filePath);

    if (usages.length > 0) {
      report.filesWithConsole++;
      report.totalConsoleStatements += usages.length;

      const relativePath = path.relative(projectRoot, filePath);
      const suggestions = usages.map(usage => generateMigrationSuggestion(usage, filePath));

      report.fileReports.push({
        file: relativePath,
        usages: usages.length,
        suggestions
      });

      console.log(`📄 ${relativePath} (${usages.length} console statements)`);
      usages.forEach(usage => {
        console.log(`   Line ${usage.line}: ${usage.content.substring(0, 80)}${usage.content.length > 80 ? '...' : ''}`);
      });
      console.log();
    }
  });

  return report;
}

/**
 * Generate migration instructions
 */
function generateMigrationInstructions(report) {
  console.log('\\n📋 STRUCTURED LOGGING MIGRATION INSTRUCTIONS\\n');
  console.log('=' .repeat(60));

  console.log(`\\n📊 SUMMARY:`);
  console.log(`   Total files analyzed: ${report.totalFiles}`);
  console.log(`   Files with console statements: ${report.filesWithConsole}`);
  console.log(`   Total console statements: ${report.totalConsoleStatements}`);

  console.log(`\\n🔧 MIGRATION STEPS:\\n`);

  // Group by directory
  const byDirectory = {};
  report.fileReports.forEach(fileReport => {
    const dir = path.dirname(fileReport.file);
    if (!byDirectory[dir]) byDirectory[dir] = [];
    byDirectory[dir].push(fileReport);
  });

  Object.keys(byDirectory).sort().forEach(dir => {
    console.log(`\\n📁 Directory: ${dir}`);
    console.log('-'.repeat(40));

    byDirectory[dir].forEach(fileReport => {
      console.log(`\\n📄 ${path.basename(fileReport.file)}:`);
      console.log(`   1. Add import: const { createLogger } = require('../utils/structured-logger');`);
      console.log(`   2. Create logger: const logger = createLogger('${fileReport.suggestions[0]?.module || 'app'}');`);
      console.log(`   3. Replace ${fileReport.usages} console statements:\\n`);

      fileReport.suggestions.slice(0, 3).forEach((suggestion, index) => {
        console.log(`      ${index + 1}. ${suggestion.original.trim()}`);
        console.log(`         → ${suggestion.suggested.trim()}\\n`);
      });

      if (fileReport.suggestions.length > 3) {
        console.log(`      ... and ${fileReport.suggestions.length - 3} more statements\\n`);
      }
    });
  });

  console.log(`\\n💡 PRIORITY ORDER:`);
  console.log(`   1. routes/api/ files (highest impact)`);
  console.log(`   2. services/ files (business logic)`);
  console.log(`   3. db/ files (database operations)`);
  console.log(`   4. middleware/ files (request processing)`);
  console.log(`   5. Other files`);

  console.log(`\\n🏃‍♂️ QUICK WINS:`);
  const quickWins = report.fileReports
    .filter(f => f.usages <= 5)
    .sort((a, b) => b.usages - a.usages);

  quickWins.slice(0, 5).forEach(file => {
    console.log(`   - ${file.file} (${file.usages} statements)`);
  });

  console.log(`\\n⚠️  HIGH IMPACT FILES:`);
  const highImpact = report.fileReports
    .filter(f => f.usages > 10)
    .sort((a, b) => b.usages - a.usages);

  highImpact.slice(0, 5).forEach(file => {
    console.log(`   - ${file.file} (${file.usages} statements)`);
  });
}

// Run the analysis
if (require.main === module) {
  console.log('🚀 Starting structured logging migration analysis...\\n');

  const report = analyzeProject();
  generateMigrationInstructions(report);

  console.log('\\n✅ Analysis complete! Use the instructions above to migrate files systematically.\\n');
}

module.exports = {
  analyzeProject,
  findJavaScriptFiles,
  analyzeFile,
  generateMigrationSuggestion
};