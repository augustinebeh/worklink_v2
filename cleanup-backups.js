#!/usr/bin/env node
/**
 * Cleanup Backup Files
 * Removes all .BACKUP_* and .DELETED_* files
 */

const fs = require('fs');
const path = require('path');

console.log('\n🧹 CLEANING UP BACKUP FILES...\n');

const routesDir = path.join(__dirname, 'routes', 'api', 'v1');

function findBackupFiles(dir) {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        files.push(...findBackupFiles(fullPath));
      } else if (entry.isFile()) {
        // Check if it's a backup file
        if (entry.name.includes('.BACKUP_') || 
            entry.name.includes('.DELETED_') ||
            entry.name.includes('.REFACTOR_BACKUP_')) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read ${dir}:`, error.message);
  }
  
  return files;
}

const backupFiles = findBackupFiles(routesDir);

if (backupFiles.length === 0) {
  console.log('✅ No backup files found!\n');
  process.exit(0);
}

console.log(`Found ${backupFiles.length} backup files:\n`);

backupFiles.forEach((file, index) => {
  const relativePath = path.relative(__dirname, file);
  console.log(`${index + 1}. ${relativePath}`);
});

console.log('\n🗑️  Deleting backup files...\n');

let deleted = 0;
let failed = 0;

backupFiles.forEach(file => {
  try {
    fs.unlinkSync(file);
    deleted++;
    const relativePath = path.relative(__dirname, file);
    console.log(`✅ Deleted: ${relativePath}`);
  } catch (error) {
    failed++;
    const relativePath = path.relative(__dirname, file);
    console.error(`❌ Failed to delete: ${relativePath}`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`  Deleted: ${deleted}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total: ${backupFiles.length}\n`);

if (deleted === backupFiles.length) {
  console.log('✅ All backup files cleaned up!\n');
} else {
  console.log('⚠️  Some files could not be deleted.\n');
}
