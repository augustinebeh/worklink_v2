#!/usr/bin/env node

/**
 * Test script to verify admin portal runtime functionality
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Admin Portal Runtime Testing Script');
console.log('=====================================\n');

// Check if admin dev server is running
function checkDevServer() {
  try {
    const response = execSync('curl -s -I http://127.0.0.1:3002/admin/', { timeout: 5000 });
    if (response.toString().includes('200 OK') || response.toString().includes('302 Found')) {
      console.log('✅ Admin dev server is running on http://127.0.0.1:3002/admin/');
      return true;
    }
  } catch (error) {
    console.log('❌ Admin dev server is not responding');
    return false;
  }
}

// Check build output for potential issues
function checkBuildOutput() {
  const distPath = path.join(__dirname, 'admin', 'dist');

  if (!fs.existsSync(distPath)) {
    console.log('❌ Build output not found - run `npm run build` first');
    return false;
  }

  const jsFiles = fs.readdirSync(distPath).filter(f => f.endsWith('.js'));
  if (jsFiles.length === 0) {
    console.log('❌ No JavaScript files found in build output');
    return false;
  }

  console.log('✅ Build output exists with JS files:', jsFiles.length);
  return true;
}

// Check for common import/export issues
function checkImportIssues() {
  console.log('\n🔍 Checking for potential import/export issues...');

  const problematicPatterns = [
    'export default function.*{',
    'import.*from.*undefined',
    'import.*from.*\\.\\.$',
    'export.*=.*function'
  ];

  const adminSrcPath = path.join(__dirname, 'admin', 'src');
  const issues = [];

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);

      if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
        scanDirectory(fullPath);
      } else if (file.name.endsWith('.jsx') || file.name.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');

        // Check for missing React import
        if (content.includes('export default function') && !content.includes('import React') && !content.includes('import { ') && content.includes('jsx')) {
          issues.push(`${fullPath}: Missing React import`);
        }

        // Check for potential circular dependencies
        const imports = content.match(/import.*from\s+['"][^'"]+['"]/g) || [];
        const relativePaths = imports.filter(imp => imp.includes('./') || imp.includes('../'));

        if (relativePaths.length > 10) {
          issues.push(`${fullPath}: Many relative imports (${relativePaths.length}) - potential circular dependency`);
        }
      }
    }
  }

  try {
    scanDirectory(adminSrcPath);

    if (issues.length === 0) {
      console.log('✅ No obvious import/export issues found');
    } else {
      console.log('⚠️  Potential issues found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }
  } catch (error) {
    console.log('❌ Error scanning files:', error.message);
  }
}

// Main execution
async function main() {
  const serverRunning = checkDevServer();
  const buildExists = checkBuildOutput();
  checkImportIssues();

  console.log('\n📋 Summary:');
  console.log(`Dev Server: ${serverRunning ? '✅ Running' : '❌ Not running'}`);
  console.log(`Build Output: ${buildExists ? '✅ Exists' : '❌ Missing'}`);

  if (serverRunning) {
    console.log('\n🌐 Test the admin portal manually:');
    console.log('   1. Open: http://127.0.0.1:3002/admin/');
    console.log('   2. Open browser DevTools (F12)');
    console.log('   3. Check Console for "U is not a constructor" error');
    console.log('   4. If error occurs, note which file/line it happens on');
  }

  console.log('\n🔧 If issues persist:');
  console.log('   1. Clear cache: rm -rf admin/node_modules/.cache');
  console.log('   2. Reinstall: cd admin && npm install');
  console.log('   3. Rebuild: cd admin && npm run build');
  console.log('   4. Restart: cd admin && npm start');
}

main().catch(console.error);