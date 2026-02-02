/**
 * Script to update database imports from the old monolithic structure
 * to the new modular structure
 */

const fs = require('fs');
const path = require('path');

// Files that need to be updated
const filesToUpdate = [
  'routes/api/v1/analytics.js',
  'routes/api/v1/chat.js',
  'routes/api/v1/training.js',
  'routes/api/v1/gamification.js',
  'routes/api/v1/tender-monitor.js',
  'websocket.js',
  'routes/api/v1/payments.js',
  'services/retention-notifications.js',
  'routes/api/v1/jobs.js',
  'routes/api/v1/candidates.js',
  'test-retention.js',
  'middleware/auth.js',
  'routes/api/v1/auth.js',
  'routes/api/v1/notifications.js',
  'routes/api/v1/referrals.js',
  'services/ai-chat/index.js',
  'services/messaging/index.js',
  'routes/api/v1/clients.js',
  'db/seed-slm-data.js'
];

function updateDatabaseImports() {
  let updatedFiles = 0;
  let errors = [];

  filesToUpdate.forEach(relativePath => {
    const filePath = path.join(__dirname, '..', relativePath);

    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${relativePath}`);
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');

      // Replace various patterns of database imports
      let updatedContent = content
        .replace(/require\(['"`]\.\.\/\.\.\/\.\.\/db\/database\.js['"`]\)/g, "require('../../../db')")
        .replace(/require\(['"`]\.\.\/\.\.\/db\/database\.js['"`]\)/g, "require('../../db')")
        .replace(/require\(['"`]\.\.\/db\/database\.js['"`]\)/g, "require('../db')")
        .replace(/require\(['"`]\.\/db\/database\.js['"`]\)/g, "require('./db')")
        .replace(/require\(['"`]\.\.\/\.\.\/\.\.\/db\/database['"`]\)/g, "require('../../../db')")
        .replace(/require\(['"`]\.\.\/\.\.\/db\/database['"`]\)/g, "require('../../db')")
        .replace(/require\(['"`]\.\.\/db\/database['"`]\)/g, "require('../db')")
        .replace(/require\(['"`]\.\/db\/database['"`]\)/g, "require('./db')");

      if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`✅ Updated: ${relativePath}`);
        updatedFiles++;
      } else {
        console.log(`ℹ️  No changes needed: ${relativePath}`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${relativePath}:`, error.message);
      errors.push({ file: relativePath, error: error.message });
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Files updated: ${updatedFiles}`);
  console.log(`   Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log(`\n❌ Errors:`);
    errors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
  }

  return { updatedFiles, errors };
}

// Run if called directly
if (require.main === module) {
  console.log('🚀 Updating database imports to use new modular structure...\n');
  updateDatabaseImports();
  console.log('\n✅ Database import update complete!');
}

module.exports = { updateDatabaseImports };