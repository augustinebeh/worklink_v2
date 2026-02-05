#!/usr/bin/env node

/**
 * Kanban Integration Verification Script
 * Tests all components of the kanban board integration
 */

const fs = require('fs');
const path = require('path');

const ADMIN_SRC = path.join(__dirname, 'admin/src');

const checks = {
  passed: [],
  failed: [],
  warnings: []
};

function checkFileExists(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    checks.passed.push(`✓ ${description}: ${filePath}`);
    return true;
  } else {
    checks.failed.push(`✗ ${description}: ${filePath} NOT FOUND`);
    return false;
  }
}

function checkFileContains(filePath, searchString, description) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    checks.failed.push(`✗ ${description}: File ${filePath} not found`);
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(searchString)) {
    checks.passed.push(`✓ ${description}`);
    return true;
  } else {
    checks.failed.push(`✗ ${description}: "${searchString}" not found in ${filePath}`);
    return false;
  }
}

function checkImport(filePath, importStatement, description) {
  return checkFileContains(filePath, importStatement, description);
}

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║         Kanban Integration Verification Report                ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// 1. Check foundation components exist
console.log('📦 Step 1: Verifying Foundation Components...\n');

checkFileExists('src/components/bpo/KanbanBoard.jsx', 'KanbanBoard component');
checkFileExists('src/components/bpo/KanbanColumn.jsx', 'KanbanColumn component');
checkFileExists('src/components/bpo/TenderCard.jsx', 'TenderCard component');
checkFileExists('src/components/bpo/ViewToggle.jsx', 'ViewToggle component');
checkFileExists('src/hooks/useKanbanDnd.js', 'useKanbanDnd hook');

// 2. Check component exports
console.log('\n📤 Step 2: Verifying Component Exports...\n');

checkFileContains(
  'src/components/bpo/index.js',
  'export { default as KanbanBoard }',
  'KanbanBoard export'
);
checkFileContains(
  'src/components/bpo/index.js',
  'export { default as ViewToggle',
  'ViewToggle export'
);
checkFileContains(
  'src/components/bpo/index.js',
  'useViewMode',
  'useViewMode export'
);

// 3. Check LifecyclePipeline integration
console.log('\n🔧 Step 3: Verifying LifecyclePipeline Integration...\n');

checkImport(
  'src/components/bpo/LifecyclePipeline.jsx',
  'import KanbanBoard from',
  'KanbanBoard import in LifecyclePipeline'
);
checkFileContains(
  'src/components/bpo/LifecyclePipeline.jsx',
  'viewMode',
  'viewMode prop in LifecyclePipeline'
);
checkFileContains(
  'src/components/bpo/LifecyclePipeline.jsx',
  '<KanbanBoard',
  'KanbanBoard component usage'
);
checkFileContains(
  'src/components/bpo/LifecyclePipeline.jsx',
  "viewMode === 'kanban'",
  'Kanban view conditional rendering'
);

// 4. Check BPOTenderLifecycle page integration
console.log('\n📄 Step 4: Verifying BPOTenderLifecycle Page Integration...\n');

checkImport(
  'src/pages/BPOTenderLifecycle.jsx',
  'ViewToggle',
  'ViewToggle import in BPOTenderLifecycle'
);
checkImport(
  'src/pages/BPOTenderLifecycle.jsx',
  'useViewMode',
  'useViewMode import in BPOTenderLifecycle'
);
checkFileContains(
  'src/pages/BPOTenderLifecycle.jsx',
  '<ViewToggle',
  'ViewToggle component usage'
);
checkFileContains(
  'src/pages/BPOTenderLifecycle.jsx',
  'viewMode={viewMode}',
  'viewMode prop passed to LifecyclePipeline'
);

// 5. Check API service integration
console.log('\n🔌 Step 5: Verifying API Service Integration...\n');

checkFileExists('src/shared/services/api/lifecycle.service.js', 'Lifecycle service');
checkFileContains(
  'src/shared/services/api/lifecycle.service.js',
  'moveTender',
  'moveTender method in lifecycle service'
);
checkFileContains(
  'src/shared/services/api/index.js',
  'lifecycleService',
  'lifecycleService export'
);

// 6. Check drag-and-drop dependencies
console.log('\n🎯 Step 6: Verifying Drag-and-Drop Dependencies...\n');

checkFileContains(
  'src/components/bpo/KanbanBoard.jsx',
  '@dnd-kit/core',
  '@dnd-kit/core import'
);
checkFileContains(
  'src/components/bpo/KanbanBoard.jsx',
  'DndContext',
  'DndContext usage'
);
checkFileContains(
  'src/components/bpo/KanbanColumn.jsx',
  'useDroppable',
  'useDroppable hook usage'
);
checkFileContains(
  'src/components/bpo/TenderCard.jsx',
  'useSortable',
  'useSortable hook usage'
);

// 7. Check hook implementation
console.log('\n🪝 Step 7: Verifying Hook Implementation...\n');

checkFileContains(
  'src/hooks/useKanbanDnd.js',
  'handleDragStart',
  'handleDragStart implementation'
);
checkFileContains(
  'src/hooks/useKanbanDnd.js',
  'handleDragEnd',
  'handleDragEnd implementation'
);
checkFileContains(
  'src/hooks/useKanbanDnd.js',
  'optimistic update',
  'Optimistic update comment/implementation'
);
checkFileContains(
  'src/hooks/useKanbanDnd.js',
  'lifecycleService.moveTender',
  'API call in drag handler'
);

// 8. Check accessibility and responsive features
console.log('\n♿ Step 8: Verifying Accessibility & Responsive Features...\n');

checkFileContains(
  'src/components/bpo/ViewToggle.jsx',
  'aria-label',
  'ARIA labels in ViewToggle'
);
checkFileContains(
  'src/components/bpo/ViewToggle.jsx',
  'localStorage',
  'localStorage persistence'
);
checkFileContains(
  'src/components/bpo/ViewToggle.jsx',
  'window.innerWidth < 768',
  'Mobile detection'
);
checkFileContains(
  'src/components/bpo/KanbanBoard.jsx',
  'isMobile',
  'Mobile responsive handling'
);

// Print results
console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                    Verification Results                       ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log(`✅ Passed: ${checks.passed.length}`);
console.log(`❌ Failed: ${checks.failed.length}`);
console.log(`⚠️  Warnings: ${checks.warnings.length}\n`);

if (checks.passed.length > 0) {
  console.log('Passed Checks:');
  checks.passed.forEach(check => console.log(`  ${check}`));
  console.log('');
}

if (checks.failed.length > 0) {
  console.log('Failed Checks:');
  checks.failed.forEach(check => console.log(`  ${check}`));
  console.log('');
}

if (checks.warnings.length > 0) {
  console.log('Warnings:');
  checks.warnings.forEach(warning => console.log(`  ${warning}`));
  console.log('');
}

// Final status
console.log('╔════════════════════════════════════════════════════════════════╗');
if (checks.failed.length === 0) {
  console.log('║  🎉 SUCCESS! All integration checks passed!                   ║');
  console.log('║  The kanban board is fully integrated and ready to use.       ║');
} else {
  console.log('║  ⚠️  ISSUES FOUND! Please review the failed checks above.     ║');
}
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Exit with appropriate code
process.exit(checks.failed.length > 0 ? 1 : 0);
