#!/usr/bin/env node
/**
 * Modular Architecture Status Checker
 * Analyzes the current state of route modularization
 */

const fs = require('fs');
const path = require('path');

console.log('🏗️  WorkLink v2 - Modular Architecture Status');
console.log('=============================================\n');

const routesDir = path.join(__dirname, '../routes/api/v1');

// Check for modular directories
console.log('📁 Modular Routes (Directories):');
const entries = fs.readdirSync(routesDir, { withFileTypes: true });
const directories = entries.filter(entry => entry.isDirectory());

directories.forEach(dir => {
  const dirPath = path.join(routesDir, dir.name);
  const indexExists = fs.existsSync(path.join(dirPath, 'index.js'));
  const hasHelpers = fs.existsSync(path.join(dirPath, 'helpers'));
  const hasRoutes = fs.existsSync(path.join(dirPath, 'routes'));

  const status = indexExists ? '✅' : '⏳';
  const structure = [];
  if (indexExists) structure.push('index.js');
  if (hasHelpers) structure.push('helpers/');
  if (hasRoutes) structure.push('routes/');

  console.log(`   ${status} ${dir.name}/ - ${structure.join(', ')}`);
});

// Check for monolithic files
console.log('\n📄 Monolithic Routes (Files):');
const files = entries.filter(entry => entry.isFile() && entry.name.endsWith('.js') && entry.name !== 'index.js');

// Categorize by file size
const largeFiles = [];
const mediumFiles = [];
const smallFiles = [];

files.forEach(file => {
  const filePath = path.join(routesDir, file.name);
  const stats = fs.statSync(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').length;

  const fileInfo = {
    name: file.name,
    size: stats.size,
    lines: lines,
    sizeKB: Math.round(stats.size / 1024)
  };

  if (lines > 800) {
    largeFiles.push(fileInfo);
  } else if (lines > 300) {
    mediumFiles.push(fileInfo);
  } else {
    smallFiles.push(fileInfo);
  }
});

// Sort by lines desc
largeFiles.sort((a, b) => b.lines - a.lines);
mediumFiles.sort((a, b) => b.lines - a.lines);
smallFiles.sort((a, b) => b.lines - a.lines);

console.log('\n🔴 Large Files (>800 lines) - High Priority:');
largeFiles.forEach((file, index) => {
  console.log(`   ${index + 1}. ${file.name} - ${file.lines} lines (${file.sizeKB}KB)`);
});

console.log('\n🟡 Medium Files (300-800 lines) - Medium Priority:');
mediumFiles.forEach((file, index) => {
  console.log(`   ${index + 1}. ${file.name} - ${file.lines} lines (${file.sizeKB}KB)`);
});

console.log('\n🟢 Small Files (<300 lines) - Low Priority:');
smallFiles.forEach((file, index) => {
  console.log(`   ${index + 1}. ${file.name} - ${file.lines} lines (${file.sizeKB}KB)`);
});

// Summary statistics
const totalFiles = files.length;
const totalDirectories = directories.length;
const modularizedRoutes = directories.filter(dir =>
  fs.existsSync(path.join(routesDir, dir.name, 'index.js'))
).length;

console.log('\n📊 Summary:');
console.log(`   Modular Routes: ${modularizedRoutes}/${totalDirectories} directories`);
console.log(`   Monolithic Routes: ${totalFiles} files`);
console.log(`   Refactoring Progress: ${Math.round((modularizedRoutes / (modularizedRoutes + totalFiles)) * 100)}%`);

// Priority recommendations
console.log('\n🎯 Next Refactoring Priorities:');
if (largeFiles.length > 0) {
  largeFiles.slice(0, 3).forEach((file, index) => {
    console.log(`   Priority ${index + 1}: ${file.name} (${file.lines} lines)`);
  });
} else {
  console.log('   🎉 No large files remaining!');
}

console.log('\n✅ Architecture status check complete!');