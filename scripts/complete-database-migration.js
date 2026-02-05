/**
 * Complete the database import migration
 * Updates remaining files to use new modular database structure
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function findFilesWithOldImports() {
  try {
    const command = `find . -name "*.js" -not -path "./node_modules/*" -not -path "./db/database.js*" | xargs grep -l "db/database"`;
    const result = execSync(command, { encoding: 'utf8' });
    return result.trim().split('\n').filter(file => file && !file.includes('Is a directory'));
  } catch (error) {
    return [];
  }
}

function updateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // More comprehensive replacement patterns
    let updatedContent = content
      // Handle require('../../../../db') - 4 levels up
      .replace(/require\(['"`]\.\.\/\.\.\/\.\.\/\.\.\/db\/database['"`]\)/g, "require('../../../../db')")

      // Handle require('../../../db') - 3 levels up
      .replace(/require\(['"`]\.\.\/\.\.\/\.\.\/db\/database['"`]\)/g, "require('../../../db')")

      // Handle require('../../db') - 2 levels up
      .replace(/require\(['"`]\.\.\/\.\.\/db\/database['"`]\)/g, "require('../../db')")

      // Handle require('../db') - 1 level up
      .replace(/require\(['"`]\.\.\/db\/database['"`]\)/g, "require('../db')")

      // Handle require('./db') - same level
      .replace(/require\(['"`]\.\/db\/database['"`]\)/g, "require('./db')")

      // Handle destructuring imports with additional exports
      .replace(/const\s*{\s*([^}]*db[^}]*resetToSampleData[^}]*)\s*}\s*=\s*require\(['"`]([^'"`]*db)\/database['"`]\)/g,
               (match, destructured, path) => {
                 const pathLevels = path.split('/').length - 1;
                 const dbPath = '../'.repeat(pathLevels) + 'db';
                 // For files that need resetToSampleData, import from the seeder
                 if (destructured.includes('resetToSampleData')) {
                   return `const { ${destructured.replace(/,?\s*resetToSampleData\s*,?/, '').trim()} } = require('${dbPath}');\nconst { resetToSampleData } = require('${dbPath}/seeders/sample');`;
                 }
                 return `const { ${destructured} } = require('${dbPath}')`;
               });

    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
    return false;
  }
}

function completeMigration() {
  console.log('🔄 Completing database import migration...\n');

  const filesToUpdate = findFilesWithOldImports();
  console.log(`Found ${filesToUpdate.length} files with old database imports:\n`);

  let updated = 0;
  let errors = 0;

  filesToUpdate.forEach(file => {
    console.log(`Processing: ${file}`);
    if (updateFile(file)) {
      console.log(`   ✅ Updated`);
      updated++;
    } else {
      console.log(`   ℹ️  No changes needed or error`);
      errors++;
    }
  });

  console.log(`\n📊 Migration Results:`);
  console.log(`   Files updated: ${updated}`);
  console.log(`   Files unchanged/errors: ${errors}`);
  console.log(`   Total processed: ${filesToUpdate.length}`);

  // Verify completion
  const remaining = findFilesWithOldImports();
  console.log(`\n🔍 Verification:`);
  console.log(`   Files still using old imports: ${remaining.length}`);

  if (remaining.length === 0) {
    console.log(`\n✅ Migration complete! All files now use modular database structure.`);
  } else {
    console.log(`\n⚠️  Files still need manual review:`);
    remaining.forEach(file => console.log(`   - ${file}`));
  }
}

if (require.main === module) {
  completeMigration();
}

module.exports = { completeMigration };