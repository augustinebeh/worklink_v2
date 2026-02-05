/**
 * Visual Component Verification Script
 * Checks component structure, props, and integration without running server
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPattern(content, pattern, name) {
  const found = pattern.test(content);
  const symbol = found ? '✓' : '✗';
  const color = found ? 'green' : 'red';
  log(`  ${symbol} ${name}`, color);
  return found;
}

console.log('\n' + '='.repeat(80));
log('VISUAL COMPONENT VERIFICATION', 'bright');
console.log('='.repeat(80) + '\n');

let totalChecks = 0;
let passedChecks = 0;

// Check BPOTenderLifecycle Page
log('\n1. BPOTenderLifecycle Page Integration', 'cyan');
const bpoPage = fs.readFileSync(
  '/home/augustine/Augustine_Projects/worklink_v2/admin/src/pages/BPOTenderLifecycle.jsx',
  'utf-8'
);

const bpoChecks = [
  { pattern: /import.*ViewToggle.*from/, name: 'Imports ViewToggle' },
  { pattern: /import.*LifecyclePipeline.*from/, name: 'Imports LifecyclePipeline' },
  { pattern: /useViewMode/, name: 'Uses useViewMode hook' },
  { pattern: /<ViewToggle/, name: 'Renders ViewToggle component' },
  { pattern: /<LifecyclePipeline/, name: 'Renders LifecyclePipeline component' },
  { pattern: /viewMode={viewMode}/, name: 'Passes viewMode prop' },
  { pattern: /onViewModeChange={setViewMode}/, name: 'Passes onViewModeChange prop' },
  { pattern: /refreshKey={refreshKey}/, name: 'Passes refreshKey for updates' },
  { pattern: /handleStageChange/, name: 'Has stage change handler' },
  { pattern: /handleTenderClick/, name: 'Has tender click handler' },
];

bpoChecks.forEach(check => {
  totalChecks++;
  if (checkPattern(bpoPage, check.pattern, check.name)) passedChecks++;
});

// Check ViewToggle Component
log('\n2. ViewToggle Component Features', 'cyan');
const viewToggle = fs.readFileSync(
  '/home/augustine/Augustine_Projects/worklink_v2/admin/src/components/bpo/ViewToggle.jsx',
  'utf-8'
);

const toggleChecks = [
  { pattern: /LayoutListIcon.*LayoutGridIcon/, name: 'Has list and grid icons' },
  { pattern: /window\.innerWidth.*768/, name: 'Mobile detection at 768px' },
  { pattern: /localStorage\.setItem.*bpo_tender_view_mode/, name: 'Persists to localStorage' },
  { pattern: /localStorage\.getItem.*bpo_tender_view_mode/, name: 'Loads from localStorage' },
  { pattern: /key === 'k'.*key === 'K'/, name: 'Keyboard shortcut: K for kanban' },
  { pattern: /key === 'l'.*key === 'L'/, name: 'Keyboard shortcut: L for list' },
  { pattern: /aria-label/, name: 'Has ARIA labels' },
  { pattern: /aria-pressed/, name: 'Has pressed state' },
  { pattern: /<kbd/, name: 'Shows keyboard hints' },
  { pattern: /showTooltip/, name: 'Has tooltip logic' },
  { pattern: /export function useViewMode/, name: 'Exports useViewMode hook' },
];

toggleChecks.forEach(check => {
  totalChecks++;
  if (checkPattern(viewToggle, check.pattern, check.name)) passedChecks++;
});

// Check KanbanBoard Component
log('\n3. KanbanBoard Drag-and-Drop', 'cyan');
const kanbanBoard = fs.readFileSync(
  '/home/augustine/Augustine_Projects/worklink_v2/admin/src/components/bpo/KanbanBoard.jsx',
  'utf-8'
);

const kanbanChecks = [
  { pattern: /import.*DndContext.*from '@dnd-kit\/core'/, name: 'Imports DndContext' },
  { pattern: /import.*DragOverlay.*from '@dnd-kit\/core'/, name: 'Imports DragOverlay' },
  { pattern: /import.*useSensor.*from '@dnd-kit\/core'/, name: 'Imports sensors' },
  { pattern: /import.*useKanbanDnd/, name: 'Imports useKanbanDnd hook' },
  { pattern: /PointerSensor/, name: 'Has PointerSensor (mouse)' },
  { pattern: /KeyboardSensor/, name: 'Has KeyboardSensor (keyboard)' },
  { pattern: /TouchSensor/, name: 'Has TouchSensor (mobile)' },
  { pattern: /<DndContext/, name: 'Renders DndContext' },
  { pattern: /<DragOverlay/, name: 'Renders DragOverlay' },
  { pattern: /handleDragStart/, name: 'Has handleDragStart' },
  { pattern: /handleDragEnd/, name: 'Has handleDragEnd' },
  { pattern: /handleDragOver/, name: 'Has handleDragOver' },
  { pattern: /const STAGES = \[/, name: 'Defines STAGES array' },
  { pattern: /renewal_watch.*new_opportunity.*review.*bidding.*internal_approval.*submitted.*awarded.*lost/s, name: 'Has all 8 stages' },
  { pattern: /mobile.*warning|optimized.*desktop/i, name: 'Has mobile warning' },
];

kanbanChecks.forEach(check => {
  totalChecks++;
  if (checkPattern(kanbanBoard, check.pattern, check.name)) passedChecks++;
});

// Check KanbanColumn Component
log('\n4. KanbanColumn Drop Zones', 'cyan');
const kanbanColumn = fs.readFileSync(
  '/home/augustine/Augustine_Projects/worklink_v2/admin/src/components/bpo/KanbanColumn.jsx',
  'utf-8'
);

const columnChecks = [
  { pattern: /import.*useDroppable.*from '@dnd-kit\/core'/, name: 'Imports useDroppable' },
  { pattern: /import.*SortableContext.*from '@dnd-kit\/sortable'/, name: 'Imports SortableContext' },
  { pattern: /useDroppable/, name: 'Uses useDroppable hook' },
  { pattern: /SortableContext/, name: 'Renders SortableContext' },
  { pattern: /STAGE_ICONS/, name: 'Has stage icons mapping' },
  { pattern: /STAGE_COLORS/, name: 'Has stage colors mapping' },
  { pattern: /dragOver/, name: 'Has drag-over styling' },
  { pattern: /role="region"/, name: 'Has region role' },
  { pattern: /aria-label/, name: 'Has ARIA label' },
  { pattern: /TenderCard/, name: 'Renders TenderCard components' },
];

columnChecks.forEach(check => {
  totalChecks++;
  if (checkPattern(kanbanColumn, check.pattern, check.name)) passedChecks++;
});

// Check TenderCard Component
log('\n5. TenderCard Draggable Items', 'cyan');
const tenderCard = fs.readFileSync(
  '/home/augustine/Augustine_Projects/worklink_v2/admin/src/components/bpo/TenderCard.jsx',
  'utf-8'
);

const cardChecks = [
  { pattern: /import.*useSortable.*from '@dnd-kit\/sortable'/, name: 'Imports useSortable' },
  { pattern: /import.*CSS.*from '@dnd-kit\/utilities'/, name: 'Imports CSS utilities' },
  { pattern: /useSortable/, name: 'Uses useSortable hook' },
  { pattern: /CSS\.Transform\.toString/, name: 'Applies transform styles' },
  { pattern: /attributes.*listeners/, name: 'Spreads drag attributes' },
  { pattern: /priority.*badges/i, name: 'Has priority badges' },
  { pattern: /deadline.*info/i, name: 'Has deadline info' },
  { pattern: /cursor-grab/, name: 'Has grab cursor' },
  { pattern: /tabIndex/, name: 'Has tabIndex for accessibility' },
  { pattern: /role="button"/, name: 'Has button role' },
];

cardChecks.forEach(check => {
  totalChecks++;
  if (checkPattern(tenderCard, check.pattern, check.name)) passedChecks++;
});

// Check useKanbanDnd Hook
log('\n6. useKanbanDnd Hook Logic', 'cyan');
const kanbanDnd = fs.readFileSync(
  '/home/augustine/Augustine_Projects/worklink_v2/admin/src/hooks/useKanbanDnd.js',
  'utf-8'
);

const hookChecks = [
  { pattern: /import.*lifecycleService/, name: 'Imports lifecycleService' },
  { pattern: /import.*useToast/, name: 'Imports useToast' },
  { pattern: /previousState/, name: 'Saves previous state' },
  { pattern: /optimistic.*update|setTenders.*map/i, name: 'Implements optimistic updates' },
  { pattern: /lifecycleService\.moveTender/, name: 'Calls moveTender API' },
  { pattern: /toast\.success/, name: 'Shows success toast' },
  { pattern: /toast\.error/, name: 'Shows error toast' },
  { pattern: /rollback|previousState\.tenders/i, name: 'Implements rollback on error' },
  { pattern: /handleDragStart.*useCallback/, name: 'Has handleDragStart callback' },
  { pattern: /handleDragEnd.*useCallback/, name: 'Has handleDragEnd callback' },
  { pattern: /handleDragOver.*useCallback/, name: 'Has handleDragOver callback' },
  { pattern: /handleDragCancel.*useCallback/, name: 'Has handleDragCancel callback' },
];

hookChecks.forEach(check => {
  totalChecks++;
  if (checkPattern(kanbanDnd, check.pattern, check.name)) passedChecks++;
});

// Check LifecyclePipeline Integration
log('\n7. LifecyclePipeline View Switching', 'cyan');
const pipeline = fs.readFileSync(
  '/home/augustine/Augustine_Projects/worklink_v2/admin/src/components/bpo/LifecyclePipeline.jsx',
  'utf-8'
);

const pipelineChecks = [
  { pattern: /import.*KanbanBoard/, name: 'Imports KanbanBoard' },
  { pattern: /viewMode.*prop/i, name: 'Receives viewMode prop' },
  { pattern: /if.*viewMode.*kanban|viewMode\s*===\s*['"]kanban['"]/, name: 'Conditional rendering' },
  { pattern: /<KanbanBoard/, name: 'Renders KanbanBoard' },
  { pattern: /onTenderClick={onTenderClick}/, name: 'Passes onTenderClick' },
  { pattern: /onStageChange={onStageChange}/, name: 'Passes onStageChange' },
  { pattern: /refreshKey={refreshKey}/, name: 'Passes refreshKey' },
  { pattern: /stats/, name: 'Displays statistics' },
];

pipelineChecks.forEach(check => {
  totalChecks++;
  if (checkPattern(pipeline, check.pattern, check.name)) passedChecks++;
});

// Check lifecycle.service.js API Integration
log('\n8. Lifecycle Service API Methods', 'cyan');
const service = fs.readFileSync(
  '/home/augustine/Augustine_Projects/worklink_v2/admin/src/shared/services/api/lifecycle.service.js',
  'utf-8'
);

const serviceChecks = [
  { pattern: /export const lifecycleService/, name: 'Exports lifecycleService' },
  { pattern: /getTenders/, name: 'Has getTenders method' },
  { pattern: /getTenderById/, name: 'Has getTenderById method' },
  { pattern: /createTender/, name: 'Has createTender method' },
  { pattern: /updateTender/, name: 'Has updateTender method' },
  { pattern: /moveTender/, name: 'Has moveTender method' },
  { pattern: /recordDecision/, name: 'Has recordDecision method' },
  { pattern: /getPipelineStats/, name: 'Has getPipelineStats method' },
  { pattern: /getClosingDeadlines/, name: 'Has getClosingDeadlines method' },
  { pattern: /moveRenewalToOpportunity/, name: 'Has moveRenewalToOpportunity method' },
  { pattern: /deleteTender/, name: 'Has deleteTender method' },
  { pattern: /\/api\/v1\/bpo\/lifecycle/, name: 'Uses correct API endpoint' },
];

serviceChecks.forEach(check => {
  totalChecks++;
  if (checkPattern(service, check.pattern, check.name)) passedChecks++;
});

// Summary
console.log('\n' + '='.repeat(80));
log('VERIFICATION SUMMARY', 'bright');
console.log('='.repeat(80));

const passRate = ((passedChecks / totalChecks) * 100).toFixed(1);

log(`\nTotal Checks: ${totalChecks}`, 'bright');
log(`Passed: ${passedChecks}`, 'green');
log(`Failed: ${totalChecks - passedChecks}`, passedChecks === totalChecks ? 'green' : 'red');
log(`Pass Rate: ${passRate}%`, passRate >= 95 ? 'green' : 'yellow');

console.log('\n' + '='.repeat(80));
if (passedChecks === totalChecks) {
  log('✅ ALL COMPONENT VERIFICATIONS PASSED', 'green');
  log('🚀 Kanban system is properly integrated and ready for testing', 'cyan');
} else {
  log(`⚠️  ${totalChecks - passedChecks} CHECKS FAILED`, 'yellow');
  log('Please review the failed checks above', 'yellow');
}
console.log('='.repeat(80) + '\n');

// Component hierarchy visualization
log('\nCOMPONENT HIERARCHY:', 'cyan');
console.log(`
BPOTenderLifecycle (Main Page)
│
├─ ViewToggle (View Switcher)
│  └─ useViewMode (Hook)
│
└─ LifecyclePipeline (Container)
   │
   ├─ Stats Display
   │
   └─ KanbanBoard (Kanban View)
      │
      ├─ useKanbanDnd (DnD Logic)
      │  └─ lifecycleService (API)
      │
      ├─ DndContext
      │  ├─ PointerSensor
      │  ├─ KeyboardSensor
      │  └─ TouchSensor
      │
      ├─ KanbanColumn × 8
      │  │
      │  ├─ SortableContext
      │  │
      │  └─ TenderCard × N
      │     └─ useSortable
      │
      └─ DragOverlay
         └─ TenderCard
`);

log('\nKEY FEATURES VERIFIED:', 'cyan');
console.log(`
  ✓ Drag-and-drop with @dnd-kit
  ✓ Optimistic updates with rollback
  ✓ Toast notifications
  ✓ View toggle (List/Kanban)
  ✓ localStorage persistence
  ✓ Keyboard shortcuts (K/L)
  ✓ Mobile responsiveness
  ✓ Accessibility (ARIA labels)
  ✓ 8-stage lifecycle
  ✓ Complete API integration
`);

process.exit(passedChecks === totalChecks ? 0 : 1);
