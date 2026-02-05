/**
 * Cleanup Script for Deleted/Backup Files
 * Safely removes .DELETED and .BEFORE_REFACTOR files
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const PROJECT_ROOT = process.cwd();

const DELETED_FILES = [
  './websocket.js.DELETED_20260204',
  './websocket.js.BEFORE_REFACTOR_20260204_154344',
  './server.js.DELETED_20260204',
  './utils/smart-slm-router.js.DELETED_20260204',
  './routes/api/v1/candidates.js.DELETED_20260204',
  './routes/api/v1/chat.js.DELETED_20260204',
  './routes/api/v1/ai-automation.js.DELETED_20260204',
  './routes/api/v1/smart-response-router.js.DELETED_20260204',
  './routes/api/v1/consultant-performance.js.DELETED_20260204'
];

async function main() {
  console.log('\\n' + '='.repeat(80));
  console.log('🗑️  CLEANUP SCRIPT - Deleted/Backup Files');
  console.log('='.repeat(80));
  console.log('\\nThis script will help you clean up backup files from the refactoring.');
  console.log('\\nFiles to be removed:');
  
  const existingFiles = [];
  const missingFiles = [];
  
  for (const file of DELETED_FILES) {
    const fullPath = path.join(PROJECT_ROOT, file);
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      const sizeKB = (stat.size / 1024).toFixed(2);
      console.log(`  ✓ ${file} (${sizeKB} KB)`);
      existingFiles.push(fullPath);
    } else {
      console.log(`  ✗ ${file} (not found)`);
      missingFiles.push(file);
    }
  }
  
  console.log(`\\nFound ${existingFiles.length} files to remove (${missingFiles.length} already cleaned)`);
  
  if (existingFiles.length === 0) {
    console.log('\\n✅ No files to clean up. All deleted files have already been removed.');
    process.exit(0);
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise(resolve => {
    rl.question('\\n⚠️  Do you want to permanently delete these files? (yes/no): ', resolve);
  });
  
  rl.close();
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('\\n❌ Cleanup cancelled. Files were not deleted.');
    process.exit(0);
  }
  
  console.log('\\n🗑️  Deleting files...');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const filePath of existingFiles) {
    try {
      fs.unlinkSync(filePath);
      console.log(`  ✓ Deleted: ${path.relative(PROJECT_ROOT, filePath)}`);
      successCount++;
    } catch (error) {
      console.log(`  ✗ Failed: ${path.relative(PROJECT_ROOT, filePath)} - ${error.message}`);
      failCount++;
    }
  }
  
  console.log('\\n' + '='.repeat(80));
  console.log(`✅ Cleanup complete!`);
  console.log(`   Successfully deleted: ${successCount} files`);
  if (failCount > 0) {
    console.log(`   Failed to delete: ${failCount} files`);
  }
  console.log('='.repeat(80));
  console.log('\\n💡 Tip: You can now commit these changes to version control.\\n');
}

main().catch(error => {
  console.error('\\n❌ Error during cleanup:', error.message);
  process.exit(1);
});
