/**
 * Fix Consultant Performance Routes
 * Fixes all import paths in consultant-performance route files
 */

const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, 'routes', 'api', 'v1', 'consultant-performance');

const filesToFix = [
  { file: 'dashboard/routes.js', fixes: [
    { from: '../../../../../db/database', to: '../../../../../db' },
    { from: '../../../../utils/capacity-management', to: '../../../../../utils/capacity-management' },
    { from: '../../../../utils/candidate-prequalification', to: '../../../../../utils/candidate-prequalification' },
    { from: '../../../../utils/candidate-retention-engine', to: '../../../../../utils/candidate-retention-engine' },
    { from: '../../../../utils/reliability-scoring-system', to: '../../../../../utils/reliability-scoring-system' }
  ]},
  { file: 'prequalification/routes.js', fixes: [
    { from: '../../../../../db/database', to: '../../../../../db' },
    { from: '../../../../utils/candidate-prequalification', to: '../../../../../utils/candidate-prequalification' }
  ]},
  { file: 'reliability/routes.js', fixes: [
    { from: '../../../../../db/database', to: '../../../../../db' },
    { from: '../../../../utils/reliability-scoring-system', to: '../../../../../utils/reliability-scoring-system' }
  ]},
  { file: 'retention/routes.js', fixes: [
    { from: '../../../../../db/database', to: '../../../../../db' },
    { from: '../../../../utils/candidate-retention-engine', to: '../../../../../utils/candidate-retention-engine' }
  ]},
  { file: 'scheduling/routes.js', fixes: [
    { from: '../../../../../db/database', to: '../../../../../db' },
    { from: '../../../../utils/interview-scheduling-engine', to: '../../../../../utils/interview-scheduling-engine' }
  ]},
  { file: 'slm-bridge/routes.js', fixes: [
    { from: '../../../../../db/database', to: '../../../../../db' },
    { from: '../../../../utils/slm-scheduling-bridge', to: '../../../../../utils/slm-scheduling-bridge' }
  ]},
  { file: 'sourcing/routes.js', fixes: [
    { from: '../../../../../db/database', to: '../../../../../db' },
    { from: '../../../../utils/candidate-sourcing-engine', to: '../../../../../utils/candidate-sourcing-engine' }
  ]}
];

let fixedCount = 0;
let errorCount = 0;

console.log('\n🔧 Fixing consultant-performance routes...\n');

filesToFix.forEach(({ file, fixes }) => {
  const filePath = path.join(basePath, file);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    fixes.forEach(({ from, to }) => {
      const requireRegex = new RegExp(
        `require\\(['"\`]${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]\\)`,
        'g'
      );
      const importRegex = new RegExp(
        `from ['"\`]${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`,
        'g'
      );
      
      if (requireRegex.test(content) || importRegex.test(content)) {
        content = content.replace(requireRegex, `require('${to}')`);
        content = content.replace(importRegex, `from '${to}'`);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${file}`);
      fixedCount++;
    } else {
      console.log(`⏭️  No changes needed: ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${file}:`, error.message);
    errorCount++;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`📊 Summary: ${fixedCount} fixed, ${errorCount} errors`);
console.log('='.repeat(60) + '\n');
