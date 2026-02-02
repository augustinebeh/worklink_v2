/**
 * Script to consolidate gamification imports to use shared version
 */

const fs = require('fs');
const path = require('path');

// Files that need to be updated
const updateMappings = [
  // Worker files - update to use shared gamification
  {
    file: 'worker/src/pages/Leaderboard.jsx',
    from: "from '../utils/gamification'",
    to: "from '../../../shared/utils/gamification-esm'"
  },
  {
    file: 'worker/src/pages/Quests.jsx',
    from: "from '../utils/gamification'",
    to: "from '../../../shared/utils/gamification-esm'"
  },
  {
    file: 'worker/src/pages/Profile.jsx',
    from: "from '../utils/gamification'",
    to: "from '../../../shared/utils/gamification-esm'"
  },
  {
    file: 'worker/src/components/layout/Sidebar.jsx',
    from: "from '../../utils/gamification'",
    to: "from '../../../../shared/utils/gamification-esm'"
  },
  {
    file: 'worker/src/components/ui/ProfileAvatar.jsx',
    from: "from '../../utils/gamification'",
    to: "from '../../../../shared/utils/gamification-esm'"
  },

  // Admin files - update to use shared gamification
  {
    file: 'admin/src/pages/Candidates.jsx',
    from: "from '../utils/gamification'",
    to: "from '../../../shared/utils/gamification-esm'"
  },
  {
    file: 'admin/src/pages/Gamification.jsx',
    from: "from '../utils/gamification'",
    to: "from '../../../shared/utils/gamification-esm'"
  }
];

function updateImports() {
  let updatedFiles = 0;
  let errors = [];

  updateMappings.forEach(({ file, from, to }) => {
    const filePath = path.join(__dirname, '..', file);

    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${file}`);
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const updatedContent = content.replace(new RegExp(from, 'g'), to);

      if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`✅ Updated: ${file}`);
        updatedFiles++;
      } else {
        console.log(`ℹ️  No changes needed: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${file}:`, error.message);
      errors.push({ file, error: error.message });
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

// Check for remaining gamification imports
function checkRemainingImports() {
  const { execSync } = require('child_process');

  try {
    const result = execSync(
      'grep -r "from.*gamification" worker/src admin/src --exclude-dir=node_modules 2>/dev/null || true',
      { encoding: 'utf8' }
    );

    if (result.trim()) {
      console.log(`\n🔍 Remaining gamification imports:`);
      console.log(result);
    } else {
      console.log(`\n✅ No remaining local gamification imports found!`);
    }
  } catch (error) {
    console.log(`\n⚠️  Could not check remaining imports: ${error.message}`);
  }
}

// Remove duplicate files
function removeDuplicateFiles() {
  const filesToRemove = [
    'worker/src/utils/gamification.js',
    'admin/src/utils/gamification.js'
  ];

  console.log(`\n🗑️  Removing duplicate gamification files:`);

  filesToRemove.forEach(file => {
    const filePath = path.join(__dirname, '..', file);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`   ✅ Removed: ${file}`);
      } else {
        console.log(`   ⚠️  File not found: ${file}`);
      }
    } catch (error) {
      console.error(`   ❌ Error removing ${file}:`, error.message);
    }
  });
}

// Main function
function consolidateGamification() {
  console.log('🚀 Starting gamification consolidation...\n');

  console.log('📝 Step 1: Update import statements');
  const { updatedFiles, errors } = updateImports();

  console.log('\n📝 Step 2: Check for remaining imports');
  checkRemainingImports();

  console.log('\n📝 Step 3: Remove duplicate files');
  removeDuplicateFiles();

  console.log('\n✅ Gamification consolidation complete!');
  console.log('\n📋 Next steps:');
  console.log('   1. Test the worker app to ensure imports work');
  console.log('   2. Test the admin app to ensure imports work');
  console.log('   3. Verify that all gamification calculations are consistent');
  console.log('   4. Update any remaining references to old files');

  if (errors.length > 0) {
    console.log('\n⚠️  Please fix the errors above before testing');
  }
}

// Run if called directly
if (require.main === module) {
  consolidateGamification();
}

module.exports = {
  updateImports,
  checkRemainingImports,
  removeDuplicateFiles,
  consolidateGamification
};